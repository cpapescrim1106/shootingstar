'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LABEL_REGISTRY } from '@/lib/labels/types';

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

interface ProcessedEmailsTableProps {
  emails: ProcessedEmail[];
}

export function ProcessedEmailsTable({ emails }: ProcessedEmailsTableProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  };

  const getLabelDisplay = (labelId: string) => {
    const label = LABEL_REGISTRY[labelId as keyof typeof LABEL_REGISTRY];
    if (label) {
      return `${label.name} ${label.emoji}`;
    }
    return labelId;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Processed Emails</CardTitle>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No emails processed yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatTime(email.processed_at)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {email.sender || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {email.subject || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {email.task_title || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {email.labels.slice(0, 3).map((labelId) => (
                          <Badge key={labelId} variant="secondary" className="text-xs">
                            {getLabelDisplay(labelId)}
                          </Badge>
                        ))}
                        {email.labels.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{email.labels.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={email.processing_mode === 'auto' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {email.processing_mode}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
