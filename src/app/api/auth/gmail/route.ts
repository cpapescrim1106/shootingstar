/**
 * Gmail OAuth Initiation Route
 * Redirects to Google OAuth consent screen
 */

import { NextResponse } from 'next/server';
import { GmailService } from '@/lib/services/gmail.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gmail = new GmailService();
    const authUrl = gmail.getAuthUrl();

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Gmail auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail authentication' },
      { status: 500 }
    );
  }
}
