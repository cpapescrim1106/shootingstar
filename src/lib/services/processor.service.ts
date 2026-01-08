/**
 * Email Processor Service
 * Orchestrates the email-to-task conversion pipeline
 */

import { GmailService, GmailAuthError, GmailEmail } from './gmail.service';
import { ClaudeCliService, TaskExtraction } from './claude-cli.service';
import { TodoistService } from './todoist.service';
import { normalizeLabels } from '../labels/validator';
import {
  isEmailProcessed,
  isPendingReview,
  addProcessedEmail,
  addPendingReview,
  addErrorLog,
  setLastRunTime,
} from '../db/client';

export interface ProcessingResult {
  processed: number;
  errors: number;
  pendingReviews: number;
  authRequired: boolean;
  authUrl?: string;
}

export class ProcessorService {
  private gmail: GmailService;
  private todoist: TodoistService;

  constructor() {
    this.gmail = new GmailService();
    this.todoist = new TodoistService();
  }

  /**
   * Process all starred emails
   */
  async processStarredEmails(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      errors: 0,
      pendingReviews: 0,
      authRequired: false,
    };

    // Update last run time
    setLastRunTime(new Date().toISOString());

    // Validate Claude CLI environment
    try {
      ClaudeCliService.validateEnvironment();
    } catch (error) {
      addErrorLog({
        error_type: 'ENV_ERROR',
        message: (error as Error).message,
      });
      throw error;
    }

    // Get starred emails from Gmail
    let emails: GmailEmail[];
    try {
      emails = await this.gmail.getStarredEmails();
    } catch (error) {
      if (error instanceof GmailAuthError) {
        result.authRequired = true;
        result.authUrl = error.authUrl;
        return result;
      }
      throw error;
    }

    console.log(`Found ${emails.length} starred emails to process`);

    for (const email of emails) {
      // Skip if already processed or pending review
      if (isEmailProcessed(email.id)) {
        console.log(`Email ${email.id} already processed, skipping`);
        continue;
      }

      if (isPendingReview(email.id)) {
        console.log(`Email ${email.id} already pending review, skipping`);
        continue;
      }

      try {
        await this.processEmail(email);
        result.processed++;
      } catch (error) {
        const err = error as Error;
        console.error(`Error processing email ${email.id}:`, err.message);

        addErrorLog({
          error_type: 'PROCESSING_ERROR',
          message: err.message,
          email_id: email.id,
          stack: err.stack,
        });

        result.errors++;
      }
    }

    return result;
  }

  /**
   * Process a single email
   */
  private async processEmail(email: GmailEmail): Promise<void> {
    const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`;

    // Try to extract task using Claude CLI
    const cliResult = await ClaudeCliService.extractTaskFromEmail(
      email.body,
      email.subject,
      email.sender
    );

    if (!cliResult.success) {
      // Add to pending reviews for human-in-the-loop
      addPendingReview({
        gmail_id: email.id,
        thread_id: email.threadId,
        sender: email.sender,
        subject: email.subject,
        body: email.body,
        gmail_link: gmailLink,
      });

      console.log(
        `Email "${email.subject}" added to pending reviews: ${cliResult.error}`
      );
      return;
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
    const task = await this.todoist.createTask({
      content: cliResult.data!.task,
      description,
      labels: normalizedLabels,
      dueString: cliResult.data!.dueString,
    });

    // Mark email as processed in Gmail
    await this.gmail.labelEmail(email.id, 'Processed');
    await this.gmail.unstarEmail(email.id);

    // Record in database
    addProcessedEmail({
      gmail_id: email.id,
      thread_id: email.threadId,
      sender: email.sender,
      subject: email.subject,
      task_title: cliResult.data!.task,
      todoist_task_id: task.id,
      labels: normalizedLabels,
      processing_mode: 'auto',
    });

    console.log(`Successfully processed: ${email.subject} -> ${task.content}`);
  }

  /**
   * Process a manual task submission (human-in-the-loop)
   */
  async processManualTask(
    pendingReviewId: number,
    taskData: {
      task: string;
      labels: string[];
      notes?: string;
      dueString?: string;
    }
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    // Import here to avoid circular dependency
    const { getPendingReviewById, updatePendingReviewStatus, addProcessedEmail } = await import(
      '../db/client'
    );

    const pending = getPendingReviewById(pendingReviewId);
    if (!pending) {
      return { success: false, error: 'Pending review not found' };
    }

    try {
      // Normalize labels
      const normalizedLabels = normalizeLabels(taskData.labels);

      // Build description
      const description = [
        `From: ${pending.sender}`,
        `Subject: ${pending.subject}`,
        '',
        taskData.notes || '',
        '',
        `Original email: ${pending.gmail_link}`,
      ].join('\n');

      // Create Todoist task
      const task = await this.todoist.createTask({
        content: taskData.task,
        description,
        labels: normalizedLabels,
        dueString: taskData.dueString,
      });

      // Mark email as processed in Gmail
      if (pending.gmail_id) {
        try {
          await this.gmail.labelEmail(pending.gmail_id, 'Processed');
          await this.gmail.unstarEmail(pending.gmail_id);
        } catch (gmailError) {
          console.error('Failed to update Gmail:', gmailError);
          // Continue anyway - task was created
        }
      }

      // Update pending review status
      updatePendingReviewStatus(pendingReviewId, 'completed');

      // Record processed email
      addProcessedEmail({
        gmail_id: pending.gmail_id,
        thread_id: pending.thread_id || undefined,
        sender: pending.sender || undefined,
        subject: pending.subject || undefined,
        task_title: taskData.task,
        todoist_task_id: task.id,
        labels: normalizedLabels,
        processing_mode: 'manual',
      });

      return { success: true, taskId: task.id };
    } catch (error) {
      const err = error as Error;
      addErrorLog({
        error_type: 'MANUAL_PROCESSING_ERROR',
        message: err.message,
        email_id: pending.gmail_id,
        stack: err.stack,
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Skip a pending review
   */
  async skipPendingReview(pendingReviewId: number): Promise<void> {
    const { updatePendingReviewStatus } = await import('../db/client');
    updatePendingReviewStatus(pendingReviewId, 'skipped');
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<{
    gmail: boolean;
    todoist: boolean;
    claude: boolean;
  }> {
    const [gmailOk, todoistOk, claudeOk] = await Promise.all([
      this.gmail.isAuthenticated(),
      this.todoist.testConnection(),
      ClaudeCliService.isAuthenticated().catch(() => false),
    ]);

    return {
      gmail: gmailOk,
      todoist: todoistOk,
      claude: claudeOk,
    };
  }
}
