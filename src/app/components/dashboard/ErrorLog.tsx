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

interface ErrorEntry {
  id: number;
  error_type: string | null;
  message: string | null;
  email_id: string | null;
  created_at: string;
}

interface ErrorLogProps {
  errors: ErrorEntry[];
}

export function ErrorLog({ errors }: ErrorLogProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Error Log
          {errors.length > 0 && (
            <Badge variant="destructive">{errors.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No errors recorded
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatTime(error.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {error.error_type || 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate text-sm text-red-400">
                      {error.message || '-'}
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
