'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusCardProps {
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

export function StatusCard({
  lastRun,
  processedCount24h,
  errorCount24h,
  pendingReviewCount,
  services,
}: StatusCardProps) {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getServiceBadge = (
    status: string,
    type: 'auth' | 'connection'
  ) => {
    if (status === 'authenticated' || status === 'connected') {
      return <Badge className="bg-green-600">OK</Badge>;
    }
    if (status === 'unauthenticated' || status === 'disconnected') {
      return <Badge variant="destructive">Not {type === 'auth' ? 'Authenticated' : 'Connected'}</Badge>;
    }
    return <Badge variant="secondary">Error</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Automation Status</span>
          <Badge className="bg-green-600">Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Last Run:</span>
            <p className="font-medium">{formatTime(lastRun)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Processed (24h):</span>
            <p className="font-medium">{processedCount24h}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Errors (24h):</span>
            <p className="font-medium text-red-500">{errorCount24h}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Pending Reviews:</span>
            <p className="font-medium text-yellow-500">{pendingReviewCount}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Service Health</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span>Claude CLI</span>
              {getServiceBadge(services.claude, 'auth')}
            </div>
            <div className="flex justify-between items-center">
              <span>Gmail</span>
              {getServiceBadge(services.gmail, 'auth')}
            </div>
            <div className="flex justify-between items-center">
              <span>Todoist</span>
              {getServiceBadge(services.todoist, 'connection')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
