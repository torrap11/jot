'use strict';

/**
 * Parse shorthand reminder workflows typed into the capture input.
 *
 * Supported shape (case-insensitive):
 *   remind me this: <reminder text> when i open this <app>
 *
 * Returns null if the input doesn't match.
 */
function parseRemindWorkflowText(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  // Non-greedy reminder capture; require "when i open" after the reminder.
  // Allow optional "this" before the app target.
  const re = /^\s*remind\s+me\s+this\s*:\s*([\s\S]+?)\s+when\s+i\s+open\s+(?:this\s+)?(.+?)\s*$/i;
  const m = text.match(re);
  if (!m) return null;

  const reminderText = String(m[1] || '').trim();
  let appQuery = String(m[2] || '').trim();

  if (!reminderText || !appQuery) return null;

  // Trim trailing punctuation users commonly type.
  appQuery = appQuery.replace(/[.,;:!?]+$/g, '').trim();
  if (!appQuery) return null;

  return { reminderText, appQuery };
}

module.exports = { parseRemindWorkflowText };

