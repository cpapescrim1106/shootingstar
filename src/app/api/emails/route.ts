/**
 * Emails API Route
 * Returns processed emails list
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProcessedEmails } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const emails = getProcessedEmails(limit);

    // Parse JSON labels for each email
    const formatted = emails.map((email) => ({
      ...email,
      labels: email.labels ? JSON.parse(email.labels) : [],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Emails API error:', error);
    return NextResponse.json(
      { error: 'Failed to get processed emails' },
      { status: 500 }
    );
  }
}
