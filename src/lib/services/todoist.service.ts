/**
 * Todoist Service
 * Handles task creation and label management via Todoist REST API v2
 */

import { LABEL_REGISTRY, formatLabel } from '../labels/types';

const TODOIST_API_URL = 'https://api.todoist.com/rest/v2';

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  labels: string[];
  url: string;
}

export interface CreateTaskInput {
  content: string;
  description?: string;
  labels?: string[]; // Array of label IDs
  dueString?: string;
  priority?: 1 | 2 | 3 | 4; // 1 = urgent, 4 = normal
}

export class TodoistService {
  private token: string;
  private labelNameCache: Map<string, string> = new Map();

  constructor() {
    const token = process.env.TODOIST_TOKEN;
    if (!token) {
      throw new Error('Missing required environment variable: TODOIST_TOKEN');
    }
    this.token = token;
  }

  /**
   * Make authenticated request to Todoist API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${TODOIST_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Todoist API error: ${response.status} - ${text}`);
    }

    // Handle empty response (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Convert label IDs to label names for Todoist API
   * Todoist REST API v2 uses label names, not IDs
   */
  private async getLabelNames(labelIds: string[]): Promise<string[]> {
    const names: string[] = [];

    for (const id of labelIds) {
      // Check cache first
      if (this.labelNameCache.has(id)) {
        names.push(this.labelNameCache.get(id)!);
        continue;
      }

      // Check our registry
      const labelInfo = LABEL_REGISTRY[id as keyof typeof LABEL_REGISTRY];
      if (labelInfo) {
        // Use the format "Name emoji" for Todoist labels
        const fullName = `${labelInfo.name} ${labelInfo.emoji}`;
        this.labelNameCache.set(id, fullName);
        names.push(fullName);
      }
    }

    return names;
  }

  /**
   * Create a new task in Todoist
   */
  async createTask(input: CreateTaskInput): Promise<TodoistTask> {
    // Convert label IDs to names
    const labelNames = input.labels ? await this.getLabelNames(input.labels) : [];

    const body: Record<string, unknown> = {
      content: input.content,
    };

    if (input.description) {
      body.description = input.description;
    }

    if (labelNames.length > 0) {
      body.labels = labelNames;
    }

    if (input.dueString) {
      body.due_string = input.dueString;
    }

    if (input.priority) {
      body.priority = input.priority;
    }

    const task = await this.request<{
      id: string;
      content: string;
      description: string;
      labels: string[];
      url: string;
    }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: task.id,
      content: task.content,
      description: task.description || '',
      labels: task.labels || [],
      url: task.url,
    };
  }

  /**
   * Get all labels from Todoist account
   */
  async getLabels(): Promise<Array<{ id: string; name: string }>> {
    return this.request<Array<{ id: string; name: string }>>('/labels');
  }

  /**
   * Ensure all required labels exist in Todoist
   * Creates any missing labels
   */
  async ensureLabelsExist(): Promise<void> {
    const existingLabels = await this.getLabels();
    const existingNames = new Set(existingLabels.map((l) => l.name));

    // Check each label in our registry
    for (const [id, info] of Object.entries(LABEL_REGISTRY)) {
      const fullName = `${info.name} ${info.emoji}`;

      if (!existingNames.has(fullName)) {
        // Create the label
        try {
          await this.request('/labels', {
            method: 'POST',
            body: JSON.stringify({ name: fullName }),
          });
          console.log(`Created Todoist label: ${fullName}`);
        } catch (error) {
          console.error(`Failed to create label ${fullName}:`, error);
        }
      }
    }
  }

  /**
   * Test connection to Todoist API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getLabels();
      return true;
    } catch {
      return false;
    }
  }
}
