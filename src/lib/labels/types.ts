/**
 * Task Labeling Standard - Type Definitions
 * Copied from Iris project
 *
 * This file defines all approved Todoist labels and their types.
 * Uses Todoist label IDs for direct API integration.
 */

// Duration label IDs (exactly one required per task)
export type DurationLabelId =
  | '2170911418' // 5 min
  | '2170911443' // 15 min
  | '2170911462' // 30 min
  | '2170911483'; // 1 hr

// Context label IDs (location, tools, people, energy level)
export type ContextLabelId =
  | '2170910796' // Computer
  | '2171144986' // Calls
  | '2171144969' // Errands
  | '2170910787' // Mobile
  | '2170867398' // Home
  | '2175329080' // Amazon
  | '2174409639' // ChatGPT
  | '2170910997' // SHD
  | '2174556945' // Workshop
  | '2170911275' // Low energy
  | '2170867369' // Fun Depot
  | '2170911059' // FLUP
  | '2171145727' // Accountant
  | '2171145711' // Brittany
  | '2175489111' // Youtube
  | '2179977775' // Amy
  | '2168964591'; // Next Action

// Theme label IDs (values-based)
export type ThemeLabelId =
  | '2170793536' // Challenge
  | '2170793538' // Care
  | '2170793551' // Wealth
  | '2170793566' // Joy
  | '2170793532'; // Lead

// Horizon label IDs (GTD levels)
export type HorizonLabelId =
  | '2174349262' // Vision [3-5y]
  | '2174349277' // Goals [1-2y]
  | '2174556383'; // Milestones

// Performance label IDs (aspiration level)
export type PerformanceLabelId =
  | '2174846814' // Above Average
  | '2174846815'; // World Class

// All approved label IDs
export type ApprovedLabelId =
  | DurationLabelId
  | ContextLabelId
  | ThemeLabelId
  | HorizonLabelId
  | PerformanceLabelId;

// Label category enum
export enum LabelCategory {
  Duration = 'duration',
  Context = 'context',
  Theme = 'theme',
  Horizon = 'horizon',
  Performance = 'performance',
}

// Label metadata
export interface LabelInfo {
  id: ApprovedLabelId;
  name: string;
  emoji: string;
  category: LabelCategory;
  description?: string;
}

// Task format interface
export interface TaskFormat {
  task: string; // [Action verb] + [What] + [Detail]
  labels: string[];
  notes?: string;
  dueString?: string;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Complete registry of all approved Todoist labels.
 *
 * Total: 31 labels
 * - Duration: 4
 * - Context: 17
 * - Theme: 5
 * - Horizon: 3
 * - Performance: 2
 */
export const LABEL_REGISTRY: Record<ApprovedLabelId, LabelInfo> = {
  // Duration Labels (4)
  '2170911418': {
    id: '2170911418',
    name: '5 min',
    emoji: '⏱',
    category: LabelCategory.Duration,
    description: 'Quick task, under 5 minutes',
  },
  '2170911443': {
    id: '2170911443',
    name: '15 min',
    emoji: '⌚',
    category: LabelCategory.Duration,
    description: 'Short task, 10-15 minutes',
  },
  '2170911462': {
    id: '2170911462',
    name: '30 min',
    emoji: '⏰',
    category: LabelCategory.Duration,
    description: 'Medium task, 20-30 minutes',
  },
  '2170911483': {
    id: '2170911483',
    name: '1 hr',
    emoji: '⏳',
    category: LabelCategory.Duration,
    description: 'Long task, 45-60 minutes',
  },

  // Context Labels - Tools (17 total)
  '2170910796': {
    id: '2170910796',
    name: 'Computer',
    emoji: '💻',
    category: LabelCategory.Context,
    description: 'Requires computer/laptop',
  },
  '2171144986': {
    id: '2171144986',
    name: 'Calls',
    emoji: '📞',
    category: LabelCategory.Context,
    description: 'Phone call required',
  },
  '2171144969': {
    id: '2171144969',
    name: 'Errands',
    emoji: '🏃',
    category: LabelCategory.Context,
    description: 'Out and about tasks',
  },
  '2170910787': {
    id: '2170910787',
    name: 'Mobile',
    emoji: '📱',
    category: LabelCategory.Context,
    description: 'Can do from phone',
  },
  '2170867398': {
    id: '2170867398',
    name: 'Home',
    emoji: '🏡',
    category: LabelCategory.Context,
    description: 'At home tasks',
  },
  '2175329080': {
    id: '2175329080',
    name: 'Amazon',
    emoji: '📦',
    category: LabelCategory.Context,
    description: 'Amazon purchase/order',
  },
  '2174409639': {
    id: '2174409639',
    name: 'ChatGPT',
    emoji: '🤖',
    category: LabelCategory.Context,
    description: 'AI assistance needed',
  },
  '2170910997': {
    id: '2170910997',
    name: 'SHD',
    emoji: '🏦',
    category: LabelCategory.Context,
    description: 'SHD related',
  },
  '2174556945': {
    id: '2174556945',
    name: 'Workshop',
    emoji: '🪚',
    category: LabelCategory.Context,
    description: 'Workshop/garage tasks',
  },
  '2170911275': {
    id: '2170911275',
    name: 'Low energy',
    emoji: '😴',
    category: LabelCategory.Context,
    description: 'Can do when tired',
  },
  '2170867369': {
    id: '2170867369',
    name: 'Fun Depot',
    emoji: '🛠',
    category: LabelCategory.Context,
    description: 'Fun Depot location',
  },
  '2170911059': {
    id: '2170911059',
    name: 'FLUP',
    emoji: '📅',
    category: LabelCategory.Context,
    description: 'Follow-up required',
  },
  '2171145727': {
    id: '2171145727',
    name: 'Accountant',
    emoji: '🔢',
    category: LabelCategory.Context,
    description: 'Accountant related',
  },
  '2171145711': {
    id: '2171145711',
    name: 'Brittany',
    emoji: '👰',
    category: LabelCategory.Context,
    description: 'Brittany related',
  },
  '2175489111': {
    id: '2175489111',
    name: 'Youtube',
    emoji: '▶️',
    category: LabelCategory.Context,
    description: 'Youtube video task',
  },
  '2179977775': {
    id: '2179977775',
    name: 'Amy',
    emoji: '🐅',
    category: LabelCategory.Context,
    description: 'Amy related',
  },
  '2168964591': {
    id: '2168964591',
    name: 'Next Action',
    emoji: '✅',
    category: LabelCategory.Context,
    description: 'GTD next action',
  },

  // Theme Labels (5)
  '2170793536': {
    id: '2170793536',
    name: 'Challenge',
    emoji: '🏋️',
    category: LabelCategory.Theme,
    description: 'Personal growth/challenge',
  },
  '2170793538': {
    id: '2170793538',
    name: 'Care',
    emoji: '🧘‍♂️',
    category: LabelCategory.Theme,
    description: 'Self-care/health',
  },
  '2170793551': {
    id: '2170793551',
    name: 'Wealth',
    emoji: '💰',
    category: LabelCategory.Theme,
    description: 'Financial/wealth building',
  },
  '2170793566': {
    id: '2170793566',
    name: 'Joy',
    emoji: '🥳',
    category: LabelCategory.Theme,
    description: 'Fun/enjoyment',
  },
  '2170793532': {
    id: '2170793532',
    name: 'Lead',
    emoji: '🤝',
    category: LabelCategory.Theme,
    description: 'Leadership/influence',
  },

  // Horizon Labels (3)
  '2174349262': {
    id: '2174349262',
    name: 'Vision [3-5y]',
    emoji: '🚀',
    category: LabelCategory.Horizon,
    description: '3-5 year vision aligned',
  },
  '2174349277': {
    id: '2174349277',
    name: 'Goals [1-2y]',
    emoji: '🎯',
    category: LabelCategory.Horizon,
    description: '1-2 year goal aligned',
  },
  '2174556383': {
    id: '2174556383',
    name: 'Milestones',
    emoji: '🗿',
    category: LabelCategory.Horizon,
    description: 'Key milestone task',
  },

  // Performance Labels (2)
  '2174846814': {
    id: '2174846814',
    name: 'Above Average',
    emoji: '💪🏼',
    category: LabelCategory.Performance,
    description: 'Above average effort',
  },
  '2174846815': {
    id: '2174846815',
    name: 'World Class',
    emoji: '🌎',
    category: LabelCategory.Performance,
    description: 'World class effort',
  },
};

/**
 * Get all labels in a specific category
 */
export function getLabelsByCategory(category: LabelCategory): LabelInfo[] {
  return Object.values(LABEL_REGISTRY).filter(
    (label) => label.category === category
  );
}

/**
 * Format a label for display (name + emoji)
 */
export function formatLabel(labelId: ApprovedLabelId): string {
  const info = LABEL_REGISTRY[labelId];
  return `${info.name} ${info.emoji}`;
}

/**
 * Get label info by ID (returns undefined if not found)
 */
export function getLabelInfo(labelId: string): LabelInfo | undefined {
  return LABEL_REGISTRY[labelId as ApprovedLabelId];
}

/**
 * Check if a label ID is approved
 */
export function isApprovedLabel(labelId: string): labelId is ApprovedLabelId {
  return labelId in LABEL_REGISTRY;
}

/**
 * Get all duration label IDs
 */
export function getDurationLabelIds(): DurationLabelId[] {
  return getLabelsByCategory(LabelCategory.Duration).map(
    (l) => l.id as DurationLabelId
  );
}

/**
 * Get all label IDs as an array
 */
export function getAllLabelIds(): ApprovedLabelId[] {
  return Object.keys(LABEL_REGISTRY) as ApprovedLabelId[];
}
