/**
 * Gmail OAuth Callback Route
 * Handles the OAuth callback from Google
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailService } from '@/lib/services/gmail.service';

export const dynamic = 'force-dynamic';

// Get base URL from environment (Coolify sets COOLIFY_URL)
function getBaseUrl(): string {
  return process.env.COOLIFY_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = getBaseUrl();

  // Handle OAuth errors
  if (error) {
    console.error('Gmail OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', baseUrl)
    );
  }

  try {
    const gmail = new GmailService();
    await gmail.exchangeCode(code);

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL('/?auth=success', baseUrl)
    );
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('auth_failed')}`, baseUrl)
    );
  }
}
