/**
 * Pending Reviews API Route
 * Returns pending reviews (human-in-the-loop queue)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPendingReviews } from '@/lib/db/client';
import { ProcessorService } from '@/lib/services/processor.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const reviews = getPendingReviews(status);

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Pending API error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, taskData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Missing review ID' },
        { status: 400 }
      );
    }

    const processor = new ProcessorService();

    if (action === 'skip') {
      await processor.skipPendingReview(id);
      return NextResponse.json({
        success: true,
        message: 'Review skipped',
      });
    }

    if (action === 'submit' && taskData) {
      const result = await processor.processManualTask(id, taskData);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: result.error || 'Failed to create task',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Task created successfully',
        taskId: result.taskId,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Pending POST API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
