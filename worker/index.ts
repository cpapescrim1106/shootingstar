/**
 * ShootingStar Background Worker
 * Polls Gmail every 2 minutes for starred emails and processes them
 */

import cron from 'node-cron';
import path from 'path';
import { initializeDatabase } from '../src/lib/db/schema';
import { ClaudeCliService } from '../src/lib/services/claude-cli.service';
import { GmailService, GmailAuthError } from '../src/lib/services/gmail.service';
import { TodoistService } from '../src/lib/services/todoist.service';
import { normalizeLabels } from '../src/lib/labels/validator';

// Initialize database
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'shootingstar.db');
const db = initializeDatabase(dbPath);

// Helper functions for database operations
function getAutomationState(key: string): string | null {
  const row = db.prepare('SELECT value FROM automation_state WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function setAutomationState(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO automation_state (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
}

function isEmailProcessed(gmailId: string): boolean {
  const row = db.prepare('SELECT id FROM processed_emails WHERE gmail_id = ?').get(gmailId);
  return !!row;
}

function isPendingReview(gmailId: string): boolean {
  const row = db.prepare('SELECT id FROM pending_reviews WHERE gmail_id = ? AND status = "pending"').get(gmailId);
  return !!row;
}

function addProcessedEmail(data: {
  gmail_id: string;
  thread_id?: string;
  sender?: string;
  subject?: string;
  task_title?: string;
  todoist_task_id?: string;
  labels?: string[];
}): void {
  db.prepare(`
    INSERT INTO processed_emails
    (gmail_id, thread_id, sender, subject, task_title, todoist_task_id, labels, processing_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'auto')
  `).run(
    data.gmail_id,
    data.thread_id ?? null,
    data.sender ?? null,
    data.subject ?? null,
    data.task_title ?? null,
    data.todoist_task_id ?? null,
    data.labels ? JSON.stringify(data.labels) : null
  );
}

function addPendingReview(data: {
  gmail_id: string;
  thread_id?: string;
  sender?: string;
  subject?: string;
  body?: string;
  gmail_link?: string;
}): void {
  db.prepare(`
    INSERT OR IGNORE INTO pending_reviews
    (gmail_id, thread_id, sender, subject, body, gmail_link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.gmail_id,
    data.thread_id ?? null,
    data.sender ?? null,
    data.subject ?? null,
    data.body ?? null,
    data.gmail_link ?? null
  );
}

function addErrorLog(data: { error_type?: string; message: string; email_id?: string; stack?: string }): void {
  db.prepare(`
    INSERT INTO error_log (error_type, message, email_id, stack)
    VALUES (?, ?, ?, ?)
  `).run(data.error_type ?? 'UNKNOWN', data.message, data.email_id ?? null, data.stack ?? null);
}

// Logging helper
function log(level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, message, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, message, ...args);
  } else {
    console.log(prefix, message, ...args);
  }
}

/**
 * Main processing function
 */
async function processStarredEmails(): Promise<void> {
  const startTime = Date.now();
  log('info', 'Starting email processing cycle');

  // Update last run time
  setAutomationState('last_run', new Date().toISOString());

  try {
    // Check if automation is running
    const running = getAutomationState('running');
    if (running !== 'true') {
      log('info', 'Automation is stopped, skipping cycle');
      return;
    }

    // Initialize services
    const gmail = new GmailService();
    const todoist = new TodoistService();

    // Get starred emails
    let emails;
    try {
      emails = await gmail.getStarredEmails();
    } catch (error) {
      if (error instanceof GmailAuthError) {
        log('warn', 'Gmail not authenticated. Please authenticate via the dashboard.');
        return;
      }
      throw error;
    }

    log('info', `Found ${emails.length} starred emails`);

    for (const email of emails) {
      // Skip if already processed or pending review
      if (isEmailProcessed(email.id)) {
        log('info', `Email ${email.id} already processed, skipping`);
        continue;
      }

      if (isPendingReview(email.id)) {
        log('info', `Email ${email.id} already pending review, skipping`);
        continue;
      }

      try {
        const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`;

        // Try to extract task using Claude CLI
        const cliResult = await ClaudeCliService.extractTaskFromEmail(
          email.body,
          email.subject,
          email.sender
        );

        if (!cliResult.success || cliResult.fallbackRequired) {
          // Add to pending reviews for human-in-the-loop
          addPendingReview({
            gmail_id: email.id,
            thread_id: email.threadId,
            sender: email.sender,
            subject: email.subject,
            body: email.body,
            gmail_link: gmailLink,
          });

          log('warn', `Email "${email.subject}" added to pending reviews: ${cliResult.error}`);
          continue;
        }

        // Normalize and validate labels
        const normalizedLabels = normalizeLabels(cliResult.data!.labels);

        // Build task description
        const description = [
          `From: ${email.sender}`,
          `Subject: ${email.subject}`,
          '',
          cliResult.data!.notes || '',
          '',
          `Original email: ${gmailLink}`,
        ].join('\n');

        // Create Todoist task
        const task = await todoist.createTask({
          content: cliResult.data!.task,
          description,
          labels: normalizedLabels,
          dueString: cliResult.data!.dueString,
        });

        // Mark email as processed in Gmail
        await gmail.labelEmail(email.id, 'Processed');
        await gmail.unstarEmail(email.id);

        // Record in database
        addProcessedEmail({
          gmail_id: email.id,
          thread_id: email.threadId,
          sender: email.sender,
          subject: email.subject,
          task_title: cliResult.data!.task,
          todoist_task_id: task.id,
          labels: normalizedLabels,
        });

        log('info', `Successfully processed: ${email.subject} -> ${task.content}`);
      } catch (error) {
        const err = error as Error;
        log('error', `Error processing email ${email.id}:`, err.message);

        addErrorLog({
          error_type: 'PROCESSING_ERROR',
          message: err.message,
          email_id: email.id,
          stack: err.stack,
        });
      }
    }
  } catch (error) {
    const err = error as Error;
    log('error', 'Error in processing cycle:', err.message);

    addErrorLog({
      error_type: 'CYCLE_ERROR',
      message: err.message,
      stack: err.stack,
    });
  }

  const duration = Date.now() - startTime;
  log('info', `Processing cycle completed in ${duration}ms`);
}

/**
 * Check for manual trigger via database flag
 */
function checkForTrigger(): boolean {
  const trigger = getAutomationState('trigger_run');
  if (trigger) {
    // Clear the trigger
    db.prepare('DELETE FROM automation_state WHERE key = ?').run('trigger_run');
    return true;
  }
  return false;
}

// ============= Main =============

// Validate environment on startup
log('info', 'ShootingStar Worker starting...');

try {
  ClaudeCliService.validateEnvironment();
  log('info', 'Environment validation passed');
} catch (error) {
  log('error', 'Environment validation failed:', (error as Error).message);
  process.exit(1);
}

// Check Claude CLI auth on startup
ClaudeCliService.isAuthenticated()
  .then((isAuthed) => {
    if (isAuthed) {
      log('info', 'Claude CLI is authenticated');
    } else {
      log('warn', 'Claude CLI is NOT authenticated. Run "claude /login" to enable auto-processing.');
    }
  })
  .catch((err) => {
    log('error', 'Failed to check Claude CLI auth:', err.message);
  });

// Schedule every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  log('info', 'Cron triggered');
  await processStarredEmails();
});

// Also check for manual triggers every 10 seconds
setInterval(async () => {
  if (checkForTrigger()) {
    log('info', 'Manual trigger detected');
    await processStarredEmails();
  }
}, 10000);

// Run once on startup (after a short delay to let services initialize)
setTimeout(async () => {
  log('info', 'Running initial processing cycle');
  await processStarredEmails();
}, 5000);

log('info', 'ShootingStar Worker started, polling every 2 minutes');

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down...');
  db.close();
  process.exit(0);
});
