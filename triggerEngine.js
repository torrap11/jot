'use strict';

/**
 * triggerEngine.js – Trigger metadata and normalization helpers.
 *
 * For the hackathon MVP, triggers are simulated manually via the UI.
 * This module owns the canonical trigger IDs, their display labels,
 * and the normalization logic that maps user-facing names to IDs.
 */

/** Canonical trigger IDs → human-readable labels */
const TRIGGER_LABELS = {
  netflix_open:  'Netflix',
  linkedin_open: 'LinkedIn',
  gmail_open:    'Gmail',
  work_start:    'Work',
  general:       'General',
};

/** Trigger IDs → emoji icons for UI display */
const TRIGGER_ICONS = {
  netflix_open:  '📺',
  linkedin_open: '💼',
  gmail_open:    '📧',
  work_start:    '🖥️',
  general:       '💡',
};

/**
 * Return the human-readable label for a trigger ID.
 * Falls back to the raw trigger string if unknown.
 */
function getTriggerLabel(trigger) {
  return TRIGGER_LABELS[trigger] || trigger;
}

/**
 * Return the emoji icon for a trigger ID.
 */
function getTriggerIcon(trigger) {
  return TRIGGER_ICONS[trigger] || '💡';
}

/**
 * Normalize an arbitrary user input string to a canonical trigger ID.
 * Accepts both internal IDs (netflix_open) and display names (Netflix).
 */
function normalizeTrigger(input) {
  const s = (input || '').toLowerCase().trim();

  // Direct match on ID
  if (TRIGGER_LABELS[s]) return s;

  // Match on display label (case-insensitive)
  for (const [id, label] of Object.entries(TRIGGER_LABELS)) {
    if (label.toLowerCase() === s) return id;
  }

  // Partial match on root word (e.g. "netflix" → "netflix_open")
  for (const id of Object.keys(TRIGGER_LABELS)) {
    const root = id.split('_')[0];
    if (s.includes(root)) return id;
  }

  // Unknown trigger — return as-is for forward compatibility
  return s;
}

/** All defined trigger IDs as an array, for UI iteration. */
const ALL_TRIGGERS = Object.keys(TRIGGER_LABELS);

module.exports = { TRIGGER_LABELS, TRIGGER_ICONS, getTriggerLabel, getTriggerIcon, normalizeTrigger, ALL_TRIGGERS };
