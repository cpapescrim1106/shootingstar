/**
 * Database Client
 * Provides singleton access to SQLite database
 */

import Database from 'better-sqlite3';
import path from 'path';
import { initializeDatabase, ProcessedEmail, ErrorLogEntry, PendingReview } from './schema';

let db: Database.Database | null = null;

/**
 * Get database instance (creates if not exists)
 */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'shootingstar.db');
    db = initializeDatabase(dbPath);
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============= Automation State =============

export function getAutomationState(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM automation_state WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setAutomationState(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO automation_state (key, value, updated_at) VALUES (?, ?, datetime('now'))`
    )
    .run(key, value);
}

export function isAutomationRunning(): boolean {
  return getAutomationState('running') === 'true';
}

export function setAutomationRunning(running: boolean): void {
  setAutomationState('running', running ? 'true' : 'false');
}

export function getLastRunTime(): string | null {
  return getAutomationState('last_run');
}

export function setLastRunTime(time: string): void {
  setAutomationState('last_run', time);
}

// ============= Processed Emails =============

export function getProcessedEmails(limit: number = 20): ProcessedEmail[] {
  return getDb()
    .prepare(
      'SELECT * FROM processed_emails ORDER BY processed_at DESC LIMIT ?'
    )
    .all(limit) as ProcessedEmail[];
}

export function isEmailProcessed(gmailId: string): boolean {
  const row = getDb()
    .prepare('SELECT id FROM processed_emails WHERE gmail_id = ?')
    .get(gmailId);
  return !!row;
}

export function addProcessedEmail(data: {
  gmail_id: string;
  thread_id?: string;
  sender?: string;
  subject?: string;
  task_title?: string;
  todoist_task_id?: string;
  labels?: string[];
  processing_mode?: 'auto' | 'manual';
}): void {
  getDb()
    .prepare(
      `INSERT INTO processed_emails
       (gmail_id, thread_id, sender, subject, task_title, todoist_task_id, labels, processing_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.gmail_id,
      data.thread_id ?? null,
      data.sender ?? null,
      data.subject ?? null,
      data.task_title ?? null,
      data.todoist_task_id ?? null,
      data.labels ? JSON.stringify(data.labels) : null,
      data.processing_mode ?? 'auto'
    );
}

// ============= Error Log =============

export function getErrorLog(limit: number = 20): ErrorLogEntry[] {
  return getDb()
    .prepare('SELECT * FROM error_log ORDER BY created_at DESC LIMIT ?')
    .all(limit) as ErrorLogEntry[];
}

export function addErrorLog(data: {
  error_type?: string;
  message: string;
  email_id?: string;
  stack?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO error_log (error_type, message, email_id, stack)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      data.error_type ?? 'UNKNOWN',
      data.message,
      data.email_id ?? null,
      data.stack ?? null
    );
}

// ============= Pending Reviews =============

export function getPendingReviews(status: string = 'pending'): PendingReview[] {
  return getDb()
    .prepare('SELECT * FROM pending_reviews WHERE status = ? ORDER BY created_at DESC')
    .all(status) as PendingReview[];
}

export function getPendingReviewById(id: number): PendingReview | null {
  const row = getDb()
    .prepare('SELECT * FROM pending_reviews WHERE id = ?')
    .get(id) as PendingReview | undefined;
  return row ?? null;
}

export function addPendingReview(data: {
  gmail_id: string;
  thread_id?: string;
  sender?: string;
  subject?: string;
  body?: string;
  gmail_link?: string;
}): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO pending_reviews
       (gmail_id, thread_id, sender, subject, body, gmail_link)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.gmail_id,
      data.thread_id ?? null,
      data.sender ?? null,
      data.subject ?? null,
      data.body ?? null,
      data.gmail_link ?? null
    );
}

export function updatePendingReviewStatus(id: number, status: 'completed' | 'skipped'): void {
  getDb()
    .prepare(
      `UPDATE pending_reviews
       SET status = ?, completed_at = datetime('now')
       WHERE id = ?`
    )
    .run(status, id);
}

export function isPendingReview(gmailId: string): boolean {
  const row = getDb()
    .prepare('SELECT id FROM pending_reviews WHERE gmail_id = ? AND status = "pending"')
    .get(gmailId);
  return !!row;
}

// ============= OAuth Tokens =============

export function getOAuthToken(provider: string): { access_token: string; refresh_token: string; expiry: string } | null {
  const row = getDb()
    .prepare('SELECT access_token, refresh_token, expiry FROM oauth_tokens WHERE provider = ?')
    .get(provider) as { access_token: string; refresh_token: string; expiry: string } | undefined;
  return row ?? null;
}

export function setOAuthToken(
  provider: string,
  accessToken: string,
  refreshToken: string,
  expiry: string
): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO oauth_tokens
       (provider, access_token, refresh_token, expiry, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .run(provider, accessToken, refreshToken, expiry);
}

export function deleteOAuthToken(provider: string): void {
  getDb()
    .prepare('DELETE FROM oauth_tokens WHERE provider = ?')
    .run(provider);
}

// ============= Stats =============

export function getStats(): {
  processedCount24h: number;
  errorCount24h: number;
  pendingReviewCount: number;
} {
  const processedCount = getDb()
    .prepare(
      `SELECT COUNT(*) as count FROM processed_emails
       WHERE processed_at > datetime('now', '-1 day')`
    )
    .get() as { count: number };

  const errorCount = getDb()
    .prepare(
      `SELECT COUNT(*) as count FROM error_log
       WHERE created_at > datetime('now', '-1 day')`
    )
    .get() as { count: number };

  const pendingCount = getDb()
    .prepare(
      `SELECT COUNT(*) as count FROM pending_reviews
       WHERE status = 'pending'`
    )
    .get() as { count: number };

  return {
    processedCount24h: processedCount.count,
    errorCount24h: errorCount.count,
    pendingReviewCount: pendingCount.count,
  };
}
