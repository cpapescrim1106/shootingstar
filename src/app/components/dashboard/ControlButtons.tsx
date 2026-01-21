'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ControlButtonsProps {
  gmailAuthenticated: boolean;
  onRefresh: () => void;
}

export function ControlButtons({
  gmailAuthenticated,
  onRefresh,
}: ControlButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRunOnce = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_once' }),
      });

      const data = await response.json();
      setMessage(data.message);

      // Refresh status after action
      onRefresh();
    } catch (error) {
      setMessage('An error occurred');
    } finally {
      setLoading(false);
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
            onClick={handleRunOnce}
            disabled={loading || !gmailAuthenticated}
            variant="outline"
          >
            {loading ? 'Processing...' : 'Run Once'}
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
