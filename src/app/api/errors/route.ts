/**
 * Errors API Route
 * Returns error log
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorLog } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const errors = getErrorLog(limit);

    return NextResponse.json(errors);
  } catch (error) {
    console.error('Errors API error:', error);
    return NextResponse.json(
      { error: 'Failed to get error log' },
      { status: 500 }
    );
  }
}
