/**
 * Task Labeling Standard - Validation Functions
 * Adapted from Iris project
 */

import {
  ApprovedLabelId,
  LabelCategory,
  ValidationResult,
  isApprovedLabel,
  getLabelInfo,
  getLabelsByCategory,
} from './types';

/**
 * Common action verbs for GTD tasks.
 */
export const ACTION_VERBS = [
  'review', 'call', 'research', 'write', 'email', 'schedule', 'update',
  'create', 'analyze', 'prepare', 'draft', 'send', 'complete', 'finish',
  'read', 'study', 'practice', 'plan', 'organize', 'clean', 'fix',
  'install', 'configure', 'test', 'deploy', 'refactor', 'design', 'buy',
  'order', 'check', 'follow', 'set', 'book', 'cancel', 'confirm', 'print',
  'scan', 'file', 'submit', 'request', 'ask', 'discuss', 'meet', 'attend',
  'watch', 'listen', 'record', 'upload', 'download', 'backup', 'move',
  'copy', 'delete', 'archive', 'export', 'import', 'merge', 'split',
  'rename', 'tag', 'label', 'sort', 'filter', 'search', 'find', 'locate',
  'measure', 'calculate', 'estimate', 'quote', 'invoice', 'pay', 'collect',
  'deposit', 'transfer', 'wire', 'ship', 'pack', 'unpack', 'assemble',
  'disassemble', 'repair', 'replace', 'return', 'exchange', 'register',
  'sign', 'apply', 'enroll', 'renew',
];

/**
 * Validate that all label IDs in the array are approved labels.
 */
export function validateLabels(labels: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const labelId of labels) {
    if (!isApprovedLabel(labelId)) {
      errors.push(`Invalid label ID: ${labelId} - not in approved list`);
    }
  }

  // Check for duplicates
  const uniqueLabels = new Set(labels);
  if (uniqueLabels.size !== labels.length) {
    warnings.push('Duplicate labels detected');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate that exactly one duration label is present.
 */
export function validateDuration(labels: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const durationLabels = getLabelsByCategory(LabelCategory.Duration);
  const durationIds = new Set(durationLabels.map((l) => l.id));

  const durationCount = labels.filter((id) => durationIds.has(id as ApprovedLabelId)).length;

  if (durationCount === 0) {
    errors.push('Missing duration label - exactly one is required');
  } else if (durationCount > 1) {
    errors.push(`Too many duration labels (${durationCount}) - exactly one is required`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate task format: [Action verb] + [What] + [Detail]
 */
export function validateTaskFormat(task: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmedTask = task.trim();

  if (!trimmedTask) {
    errors.push('Task content is empty');
    return { valid: false, errors, warnings: undefined };
  }

  const words = trimmedTask.split(/\s+/);

  if (words.length < 2) {
    warnings.push('Task is very short - consider adding more detail');
  } else if (words.length < 3) {
    warnings.push('Task may be too short - consider adding more detail');
  }

  // Check if task starts with action verb
  const firstWord = words[0].toLowerCase();
  const startsWithVerb = ACTION_VERBS.some(
    (verb) => firstWord === verb || firstWord.startsWith(verb)
  );

  if (!startsWithVerb) {
    warnings.push(
      `Task should start with action verb (e.g., Review, Call, Research). Found: "${words[0]}"`
    );
  }

  return {
    valid: true, // Warnings don't invalidate - they're advisory
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate and normalize labels - ensures exactly one duration label.
 * Returns normalized array of approved label IDs.
 */
export function normalizeLabels(labelIds: string[]): string[] {
  // Filter to approved only
  let normalized = labelIds.filter(isApprovedLabel);

  // Remove duplicates
  normalized = [...new Set(normalized)];

  // Ensure exactly one duration label
  const durationLabels = normalized.filter(
    (id) => getLabelInfo(id)?.category === LabelCategory.Duration
  );

  if (durationLabels.length === 0) {
    // Default to 15 min
    normalized.push('2170911443');
  } else if (durationLabels.length > 1) {
    // Keep only first duration label
    const firstDuration = durationLabels[0];
    normalized = normalized.filter(
      (id) => getLabelInfo(id)?.category !== LabelCategory.Duration || id === firstDuration
    );
  }

  // If no context labels at all, add Computer as default
  const contextLabels = normalized.filter(
    (id) => getLabelInfo(id)?.category === LabelCategory.Context
  );
  if (contextLabels.length === 0) {
    normalized.push('2170910796'); // Computer
  }

  return normalized;
}

/**
 * Quick check if labels are valid (have required duration).
 */
export function isValidLabelSet(labels: string[]): boolean {
  const labelsResult = validateLabels(labels);
  const durationResult = validateDuration(labels);
  return labelsResult.valid && durationResult.valid;
}

/**
 * Format validation result as human-readable string.
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('Task format is valid');
  } else {
    lines.push('Task format has errors:');
    result.errors.forEach((err) => lines.push(`  - ${err}`));
  }

  if (result.warnings && result.warnings.length > 0) {
    lines.push('Warnings:');
    result.warnings.forEach((warn) => lines.push(`  - ${warn}`));
  }

  return lines.join('\n');
}
