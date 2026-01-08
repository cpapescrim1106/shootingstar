/**
 * Control API Route
 * Start/Stop/Run Once automation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  setAutomationRunning,
  isAutomationRunning,
  setAutomationState,
} from '@/lib/db/client';
import { ProcessorService } from '@/lib/services/processor.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start': {
        if (isAutomationRunning()) {
          return NextResponse.json({
            success: false,
            message: 'Automation is already running',
          });
        }
        setAutomationRunning(true);
        return NextResponse.json({
          success: true,
          message: 'Automation started',
        });
      }

      case 'stop': {
        if (!isAutomationRunning()) {
          return NextResponse.json({
            success: false,
            message: 'Automation is not running',
          });
        }
        setAutomationRunning(false);
        return NextResponse.json({
          success: true,
          message: 'Automation stopped',
        });
      }

      case 'run_once': {
        try {
          const processor = new ProcessorService();
          const result = await processor.processStarredEmails();

          if (result.authRequired) {
            return NextResponse.json({
              success: false,
              message: 'Gmail authentication required',
              authRequired: true,
              authUrl: '/api/auth/gmail',
            });
          }

          return NextResponse.json({
            success: true,
            message: `Processed ${result.processed} emails, ${result.errors} errors, ${result.pendingReviews} pending reviews`,
            result,
          });
        } catch (error) {
          const err = error as Error;
          return NextResponse.json({
            success: false,
            message: err.message,
          });
        }
      }

      case 'trigger': {
        // Signal the worker to run immediately (via database flag)
        setAutomationState('trigger_run', Date.now().toString());
        return NextResponse.json({
          success: true,
          message: 'Processing triggered',
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Control API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
