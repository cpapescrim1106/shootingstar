/**
 * Status API Route
 * Returns automation status and system health
 */

import { NextResponse } from 'next/server';
import {
  isAutomationRunning,
  getLastRunTime,
  getStats,
} from '@/lib/db/client';
import { ClaudeCliService } from '@/lib/services/claude-cli.service';
import { GmailService } from '@/lib/services/gmail.service';
import { TodoistService } from '@/lib/services/todoist.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get basic status
    const running = isAutomationRunning();
    const lastRun = getLastRunTime();
    const stats = getStats();

    // Check service health
    let cliAuthStatus: 'authenticated' | 'unauthenticated' | 'error' = 'error';
    let gmailAuthStatus: 'authenticated' | 'unauthenticated' | 'error' = 'error';
    let todoistStatus: 'connected' | 'disconnected' | 'error' = 'error';

    // Check Claude CLI auth
    try {
      const isClaudeAuthed = await ClaudeCliService.isAuthenticated();
      cliAuthStatus = isClaudeAuthed ? 'authenticated' : 'unauthenticated';
    } catch {
      cliAuthStatus = 'error';
    }

    // Check Gmail auth
    try {
      const gmail = new GmailService();
      const isGmailAuthed = await gmail.isAuthenticated();
      gmailAuthStatus = isGmailAuthed ? 'authenticated' : 'unauthenticated';
    } catch {
      gmailAuthStatus = 'error';
    }

    // Check Todoist connection
    try {
      const todoist = new TodoistService();
      const isTodoistConnected = await todoist.testConnection();
      todoistStatus = isTodoistConnected ? 'connected' : 'disconnected';
    } catch {
      todoistStatus = 'error';
    }

    return NextResponse.json({
      running,
      lastRun,
      ...stats,
      services: {
        claude: cliAuthStatus,
        gmail: gmailAuthStatus,
        todoist: todoistStatus,
      },
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
