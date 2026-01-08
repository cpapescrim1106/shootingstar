/**
 * SQLite Database Schema
 * Used for persisting state across restarts
 */

import Database from 'better-sqlite3';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  db.exec(`
    -- Automation state (running, last_run, etc.)
    CREATE TABLE IF NOT EXISTS automation_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Processed emails
    CREATE TABLE IF NOT EXISTS processed_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gmail_id TEXT UNIQUE NOT NULL,
      thread_id TEXT,
      sender TEXT,
      subject TEXT,
      task_title TEXT,
      todoist_task_id TEXT,
      labels TEXT, -- JSON array of label IDs
      processing_mode TEXT DEFAULT 'auto', -- 'auto' or 'manual'
      processed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Error log
    CREATE TABLE IF NOT EXISTS error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_type TEXT,
      message TEXT,
      email_id TEXT,
      stack TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Pending reviews (human-in-the-loop)
    CREATE TABLE IF NOT EXISTS pending_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gmail_id TEXT UNIQUE NOT NULL,
      thread_id TEXT,
      sender TEXT,
      subject TEXT,
      body TEXT,
      gmail_link TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'skipped'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    -- OAuth tokens
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      expiry TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_processed_at ON processed_emails(processed_at);
    CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_reviews(status);
    CREATE INDEX IF NOT EXISTS idx_errors_created ON error_log(created_at);
  `);

  // Initialize default automation state if not exists
  const existing = db.prepare('SELECT value FROM automation_state WHERE key = ?').get('running');
  if (!existing) {
    db.prepare('INSERT INTO automation_state (key, value) VALUES (?, ?)').run('running', 'false');
  }

  return db;
}

// Type definitions for database rows
export interface AutomationState {
  key: string;
  value: string;
  updated_at: string;
}

export interface ProcessedEmail {
  id: number;
  gmail_id: string;
  thread_id: string | null;
  sender: string | null;
  subject: string | null;
  task_title: string | null;
  todoist_task_id: string | null;
  labels: string | null; // JSON string
  processing_mode: string;
  processed_at: string;
}

export interface ErrorLogEntry {
  id: number;
  error_type: string | null;
  message: string | null;
  email_id: string | null;
  stack: string | null;
  created_at: string;
}

export interface PendingReview {
  id: number;
  gmail_id: string;
  thread_id: string | null;
  sender: string | null;
  subject: string | null;
  body: string | null;
  gmail_link: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface OAuthToken {
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry: string | null;
  updated_at: string;
}
