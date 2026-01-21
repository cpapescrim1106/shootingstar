/**
 * Claude CLI Service
 * Uses Claude Code CLI (`claude -p`) instead of Anthropic API
 * Requires prior `claude /login` on the host machine
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { LABEL_REGISTRY, LabelCategory, getLabelsByCategory } from '../labels/types';

const execAsync = promisify(exec);

// JSON Schema for Claude structured output
const TASK_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    task: {
      type: 'string',
      description: 'Task in format: [Action verb] + [What] + [Detail]',
    },
    labels: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of Todoist label IDs from the approved list',
    },
    notes: {
      type: 'string',
      description: 'Additional context or notes for the task',
    },
    dueString: {
      type: 'string',
      description: 'Natural language due date if mentioned (e.g., "Friday", "next week")',
    },
  },
  required: ['task', 'labels'],
};

export interface TaskExtraction {
  task: string;
  labels: string[];
  notes?: string;
  dueString?: string;
}

export interface ClaudeCliResult {
  success: boolean;
  data?: TaskExtraction;
  error?: string;
  fallbackRequired?: boolean;
}

export class ClaudeCliService {
  private static CLI_TIMEOUT = 60000; // 60 seconds

  /**
   * CRITICAL: Fail fast if ANTHROPIC_API_KEY exists
   * This ensures we use CLI, not API
   */
  static validateEnvironment(): void {
    if (process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY detected! This app uses Claude CLI, not the API. ' +
          'Remove ANTHROPIC_API_KEY from environment to continue.'
      );
    }
  }

  /**
   * Check if Claude CLI is authenticated by checking credentials file
   * This is a fast check that doesn't require running a prompt
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      // Check for credentials file in HOME directory
      const homeDir = process.env.HOME || '/home/nextjs';
      const credentialsPath = join(homeDir, '.claude', '.credentials.json');

      if (!existsSync(credentialsPath)) {
        return false;
      }

      // Read and validate credentials file has required OAuth tokens
      const credentialsContent = readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(credentialsContent);

      // Check for valid OAuth tokens (claudeAiOauth with accessToken)
      if (
        credentials.claudeAiOauth &&
        credentials.claudeAiOauth.accessToken &&
        credentials.claudeAiOauth.expiresAt
      ) {
        // Check if token is not expired (with 5 min buffer)
        const expiresAt = credentials.claudeAiOauth.expiresAt;
        const now = Date.now();
        if (expiresAt > now + 5 * 60 * 1000) {
          return true;
        }
        // Token expired but refresh token might work - consider authenticated
        // The actual call will handle refresh
        if (credentials.claudeAiOauth.refreshToken) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if Claude CLI binary is available
   */
  static async isCliInstalled(): Promise<boolean> {
    try {
      await execAsync('which claude', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build the prompt for task extraction
   */
  private static buildPrompt(body: string, subject: string, sender: string): string {
    // Build label reference from registry
    const durationLabels = getLabelsByCategory(LabelCategory.Duration)
      .map((l) => `  - "${l.id}" = ${l.name} ${l.emoji}`)
      .join('\n');

    const contextLabels = getLabelsByCategory(LabelCategory.Context)
      .map((l) => `  - "${l.id}" = ${l.name} ${l.emoji}`)
      .join('\n');

    const themeLabels = getLabelsByCategory(LabelCategory.Theme)
      .map((l) => `  - "${l.id}" = ${l.name} ${l.emoji}`)
      .join('\n');

    // Truncate body to prevent token overflow
    const truncatedBody = body.substring(0, 3000);

    return `You are a GTD (Getting Things Done) task extraction expert.

Extract a single actionable task from this email:

FROM: ${sender}
SUBJECT: ${subject}

BODY:
${truncatedBody}

RULES:
1. Task format: [Action verb] + [What] + [Detail]
   Examples: "Review proposal for Q3 budget", "Call John about project deadline"

2. Use ONLY these label IDs (pick by ID string, not name):

   DURATION (pick exactly ONE):
${durationLabels}

   CONTEXT (pick 1-3 relevant):
${contextLabels}

   THEME (pick 0-1 if applicable):
${themeLabels}

3. The "labels" array must contain label ID strings like "2170911443", NOT names.

4. If a due date is mentioned, extract it as dueString in natural language.

5. Notes should include sender context and key details from the email.

Return valid JSON only.`;
  }

  /**
   * Extract task from email using Claude CLI
   */
  static async extractTaskFromEmail(
    emailBody: string,
    subject: string,
    sender: string
  ): Promise<ClaudeCliResult> {
    // First validate environment
    this.validateEnvironment();

    // Check authentication
    const isAuthed = await this.isAuthenticated();
    if (!isAuthed) {
      return {
        success: false,
        fallbackRequired: true,
        error: 'Claude CLI not authenticated. Run "claude /login" on the host machine.',
      };
    }

    // Build the prompt
    const prompt = this.buildPrompt(emailBody, subject, sender);
    const schemaJson = JSON.stringify(TASK_EXTRACTION_SCHEMA);

    // Escape for shell - use base64 to avoid shell escaping issues
    const promptBase64 = Buffer.from(prompt).toString('base64');
    const schemaBase64 = Buffer.from(schemaJson).toString('base64');

    try {
      // Use a heredoc approach to avoid shell escaping issues
      const command = `echo "${promptBase64}" | base64 -d | claude -p - --output-format json`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: this.CLI_TIMEOUT,
        maxBuffer: 1024 * 1024, // 1MB
      });

      // Try to parse the JSON response
      // Claude CLI with --output-format json returns: {"type":"result","result":"...","..."}
      // The actual response is in the "result" field, possibly wrapped in markdown code blocks
      let parsed: TaskExtraction;
      try {
        // First parse the CLI wrapper JSON
        const cliResponse = JSON.parse(stdout);

        if (cliResponse.is_error || cliResponse.subtype === 'error') {
          throw new Error(cliResponse.result || 'Claude CLI returned an error');
        }

        // Extract the result field which contains Claude's actual response
        const resultText = cliResponse.result || '';

        // Find JSON in the result - it might be wrapped in markdown code blocks
        // Try to match ```json ... ``` first, then fall back to any JSON object
        const codeBlockMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : resultText;

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in Claude response');
        }
      } catch (parseError) {
        console.error('Failed to parse Claude response:', stdout.substring(0, 500));
        return {
          success: false,
          fallbackRequired: true,
          error: `Failed to parse Claude response: ${(parseError as Error).message}`,
        };
      }

      // Validate the response has required fields
      if (!parsed.task || !Array.isArray(parsed.labels)) {
        return {
          success: false,
          fallbackRequired: true,
          error: 'Claude response missing required fields (task, labels)',
        };
      }

      // Validate labels are from approved list
      const validLabels = parsed.labels.filter((id) => id in LABEL_REGISTRY);
      if (validLabels.length === 0) {
        // Try to salvage by adding defaults
        validLabels.push('2170911443'); // 15 min
        validLabels.push('2170910796'); // Computer
      }

      return {
        success: true,
        data: {
          task: parsed.task,
          labels: validLabels,
          notes: parsed.notes,
          dueString: parsed.dueString,
        },
      };
    } catch (error: unknown) {
      const err = error as Error & { killed?: boolean; code?: string };

      if (err.killed) {
        return {
          success: false,
          fallbackRequired: true,
          error: 'Claude CLI timed out',
        };
      }

      return {
        success: false,
        fallbackRequired: true,
        error: err.message || 'Unknown error calling Claude CLI',
      };
    }
  }
}
