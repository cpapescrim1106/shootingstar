'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ControlButtonsProps {
  running: boolean;
  gmailAuthenticated: boolean;
  onRefresh: () => void;
}

export function ControlButtons({
  running,
  gmailAuthenticated,
  onRefresh,
}: ControlButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    setMessage(null);

    try {
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      setMessage(data.message);

      if (data.authRequired && data.authUrl) {
        // Redirect to Gmail auth
        window.location.href = data.authUrl;
        return;
      }

      // Refresh status after action
      onRefresh();
    } catch (error) {
      setMessage('An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleAction('start')}
            disabled={running || loading !== null}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading === 'start' ? 'Starting...' : 'Start'}
          </Button>

          <Button
            onClick={() => handleAction('stop')}
            disabled={!running || loading !== null}
            variant="destructive"
          >
            {loading === 'stop' ? 'Stopping...' : 'Stop'}
          </Button>

          <Button
            onClick={() => handleAction('run_once')}
            disabled={loading !== null}
            variant="outline"
          >
            {loading === 'run_once' ? 'Processing...' : 'Run Once'}
          </Button>
        </div>

        {!gmailAuthenticated && (
          <div className="pt-2">
            <Button
              onClick={() => (window.location.href = '/api/auth/gmail')}
              variant="secondary"
              className="w-full"
            >
              Authenticate Gmail
            </Button>
          </div>
        )}

        {message && (
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
