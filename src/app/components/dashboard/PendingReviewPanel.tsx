'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LABEL_REGISTRY,
  LabelCategory,
  getLabelsByCategory,
} from '@/lib/labels/types';

interface PendingReview {
  id: number;
  gmail_id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  gmail_link: string | null;
  created_at: string;
}

interface PendingReviewPanelProps {
  reviews: PendingReview[];
  claudeAuthenticated: boolean;
  onRefresh: () => void;
}

interface TaskInput {
  task: string;
  durationLabel: string;
  contextLabels: string[];
  notes: string;
}

export function PendingReviewPanel({
  reviews,
  claudeAuthenticated,
  onRefresh,
}: PendingReviewPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [taskInput, setTaskInput] = useState<TaskInput>({
    task: '',
    durationLabel: '2170911443', // Default: 15 min
    contextLabels: [],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const durationLabels = getLabelsByCategory(LabelCategory.Duration);
  const contextLabels = getLabelsByCategory(LabelCategory.Context);

  const handleSubmit = async (reviewId: number) => {
    if (!taskInput.task.trim()) {
      setMessage('Task content is required');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const labels = [taskInput.durationLabel, ...taskInput.contextLabels];

      const response = await fetch('/api/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reviewId,
          action: 'submit',
          taskData: {
            task: taskInput.task,
            labels,
            notes: taskInput.notes,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExpandedId(null);
        setTaskInput({
          task: '',
          durationLabel: '2170911443',
          contextLabels: [],
          notes: '',
        });
        onRefresh();
      } else {
        setMessage(data.message || 'Failed to create task');
      }
    } catch (error) {
      setMessage('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async (reviewId: number) => {
    try {
      await fetch('/api/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, action: 'skip' }),
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to skip review:', error);
    }
  };

  const toggleContextLabel = (labelId: string) => {
    setTaskInput((prev) => ({
      ...prev,
      contextLabels: prev.contextLabels.includes(labelId)
        ? prev.contextLabels.filter((id) => id !== labelId)
        : [...prev.contextLabels, labelId],
    }));
  };

  if (reviews.length === 0 && claudeAuthenticated) {
    return null;
  }

  return (
    <Card className="border-yellow-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Manual Review Required
          {!claudeAuthenticated && (
            <Badge variant="destructive">CLI Not Authenticated</Badge>
          )}
        </CardTitle>
        {!claudeAuthenticated && (
          <p className="text-sm text-muted-foreground">
            Run <code className="bg-muted px-1 rounded">claude /login</code> on
            the server to enable automatic processing.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground">No emails pending review</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium truncate">{review.subject}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      From: {review.sender}
                    </p>
                  </div>
                  {review.gmail_link && (
                    <a
                      href={review.gmail_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm ml-2"
                    >
                      Open in Gmail
                    </a>
                  )}
                </div>

                {expandedId === review.id ? (
                  <div className="mt-4 space-y-4">
                    {/* Email body preview */}
                    <div className="bg-muted p-3 rounded max-h-40 overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {review.body?.substring(0, 1000) || 'No content'}
                        {(review.body?.length || 0) > 1000 && '...'}
                      </pre>
                    </div>

                    {/* Task input form */}
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Task: [Action verb] + [What] + [Detail]"
                        value={taskInput.task}
                        onChange={(e) =>
                          setTaskInput((prev) => ({
                            ...prev,
                            task: e.target.value,
                          }))
                        }
                        rows={2}
                      />

                      {/* Duration selector */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Duration (required)
                        </label>
                        <Select
                          value={taskInput.durationLabel}
                          onValueChange={(value) =>
                            setTaskInput((prev) => ({
                              ...prev,
                              durationLabel: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {durationLabels.map((label) => (
                              <SelectItem key={label.id} value={label.id}>
                                {label.name} {label.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Context labels */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Context Labels
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {contextLabels.map((label) => (
                            <Badge
                              key={label.id}
                              variant={
                                taskInput.contextLabels.includes(label.id)
                                  ? 'default'
                                  : 'outline'
                              }
                              className="cursor-pointer"
                              onClick={() => toggleContextLabel(label.id)}
                            >
                              {label.name} {label.emoji}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Textarea
                        placeholder="Notes (optional)"
                        value={taskInput.notes}
                        onChange={(e) =>
                          setTaskInput((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        rows={2}
                      />

                      {message && (
                        <p className="text-sm text-red-500">{message}</p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSubmit(review.id)}
                          disabled={!taskInput.task.trim() || submitting}
                        >
                          {submitting ? 'Creating...' : 'Create Task'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleSkip(review.id)}
                        >
                          Skip
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setExpandedId(null)}
                        >
                          Collapse
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(review.id)}
                  >
                    Review & Create Task
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
