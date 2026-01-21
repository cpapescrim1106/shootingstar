'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatusCard } from './components/dashboard/StatusCard';
import { ControlButtons } from './components/dashboard/ControlButtons';
import { ProcessedEmailsTable } from './components/dashboard/ProcessedEmailsTable';
import { ErrorLog } from './components/dashboard/ErrorLog';
import { PendingReviewPanel } from './components/dashboard/PendingReviewPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Status {
  running: boolean;
  lastRun: string | null;
  processedCount24h: number;
  errorCount24h: number;
  pendingReviewCount: number;
  services: {
    claude: 'authenticated' | 'unauthenticated' | 'error';
    gmail: 'authenticated' | 'unauthenticated' | 'error';
    todoist: 'connected' | 'disconnected' | 'error';
  };
}

interface ProcessedEmail {
  id: number;
  gmail_id: string;
  sender: string | null;
  subject: string | null;
  task_title: string | null;
  labels: string[];
  processing_mode: string;
  processed_at: string;
}

interface ErrorEntry {
  id: number;
  error_type: string | null;
  message: string | null;
  email_id: string | null;
  created_at: string;
}

interface PendingReview {
  id: number;
  gmail_id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  gmail_link: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Check for auth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      setAuthMessage('Gmail authenticated successfully!');
      // Clean up URL
      window.history.replaceState({}, '', '/');
    } else if (params.get('error')) {
      setAuthMessage(`Authentication error: ${params.get('error')}`);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, emailsRes, errorsRes, pendingRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/emails'),
        fetch('/api/errors'),
        fetch('/api/pending'),
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (emailsRes.ok) {
        setEmails(await emailsRes.json());
      }
      if (errorsRes.ok) {
        setErrors(await errorsRes.json());
      }
      if (pendingRes.ok) {
        setPending(await pendingRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();

    // Poll every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">ShootingStar</h1>
          <p className="text-muted-foreground">
            Gmail to Todoist automation powered by Claude
          </p>
        </div>

        {/* Auth message */}
        {authMessage && (
          <Alert className="mb-6" variant={authMessage.includes('error') ? 'destructive' : 'default'}>
            <AlertTitle>
              {authMessage.includes('error') ? 'Error' : 'Success'}
            </AlertTitle>
            <AlertDescription>{authMessage}</AlertDescription>
          </Alert>
        )}

        {/* Top section: Status + Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {status && (
            <>
              <StatusCard {...status} />
              <ControlButtons
                gmailAuthenticated={status.services.gmail === 'authenticated'}
                onRefresh={fetchData}
              />
            </>
          )}
        </div>

        {/* Pending Reviews (human-in-the-loop) */}
        {status && (
          <div className="mb-8">
            <PendingReviewPanel
              reviews={pending}
              claudeAuthenticated={status.services.claude === 'authenticated'}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* Tabs for emails and errors */}
        <Tabs defaultValue="emails" className="space-y-4">
          <TabsList>
            <TabsTrigger value="emails">
              Processed Emails
              {emails.length > 0 && (
                <span className="ml-2 bg-muted px-2 py-0.5 rounded text-xs">
                  {emails.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="errors">
              Error Log
              {errors.length > 0 && (
                <span className="ml-2 bg-red-600 px-2 py-0.5 rounded text-xs">
                  {errors.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emails">
            <ProcessedEmailsTable emails={emails} />
          </TabsContent>

          <TabsContent value="errors">
            <ErrorLog errors={errors} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            ShootingStar v1.0 - Star emails in Gmail to create Todoist tasks
          </p>
        </div>
      </div>
    </div>
  );
}
