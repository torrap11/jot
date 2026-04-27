'use strict';

/**
 * appWatcher.js — macOS frontmost application detector.
 *
 * Polls every ~1.5 s via AppleScript (System Events) to read the bundle ID
 * and display name of the currently active application.
 *
 * Requires: System Preferences → Privacy → Automation → allow Proactive Recall
 * to control System Events (macOS will prompt on first use).
 *
 * Fires onAppSwitch(bundleId, appName) when the frontmost app changes.
 * No browser URL scraping, no screen capture, no OCR.
 */

const { execFile } = require('child_process');

const POLL_INTERVAL_MS = 1_500;

let intervalId           = null;
let lastSignature        = '';
let permErrLogged        = false;

/** Run an AppleScript snippet, resolve to trimmed stdout or null on error. */
function runOsascript(source) {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', source], { timeout: 2500 }, (err, stdout) => {
      resolve(err ? null : (stdout || '').trim() || null);
    });
  });
}

/**
 * Returns { appName, bundleId } for the current frontmost app, or null on failure.
 */
async function getFrontmostProcess() {
  const script = `
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set appName to name of frontApp
  try
    set bid to bundle identifier of frontApp
  on error
    set bid to ""
  end try
end tell
return appName & "||||" & bid`;

  const out = await runOsascript(script);
  if (!out || !out.includes('||||')) return null;
  const [name, bundleId] = out.split('||||');
  return { appName: name.trim(), bundleId: (bundleId || '').trim() };
}

/**
 * Start polling.
 * @param {{ onAppSwitch: Function, getConfig: Function }} opts
 *   onAppSwitch(bundleId: string, appName: string) — called when frontmost app changes.
 *   getConfig() — returns current config (checks surfacingEnabled).
 */
function startWatcher({ onAppSwitch, getConfig }) {
  if (process.platform !== 'darwin') {
    console.log('[appWatcher] Only supported on macOS — skipping.');
    return;
  }

  intervalId = setInterval(async () => {
    const cfg = getConfig();
    if (!cfg.surfacingEnabled) return;

    let proc;
    try {
      proc = await getFrontmostProcess();
    } catch {
      return;
    }

    if (!proc || !proc.appName) {
      if (!permErrLogged) {
        console.warn('[appWatcher] Cannot read frontmost app — check Automation/Accessibility permission.');
        permErrLogged = true;
      }
      return;
    }

    permErrLogged = false;
    const sig = `${proc.bundleId}|${proc.appName}`;
    if (sig === lastSignature) return;
    lastSignature = sig;

    console.log(`[appWatcher] Frontmost: "${proc.appName}" (${proc.bundleId || 'no bundle id'})`);
    try {
      onAppSwitch(proc.bundleId, proc.appName);
    } catch (error) {
      console.error('[appWatcher] onAppSwitch failed:', error.message || error);
    }
  }, POLL_INTERVAL_MS);
}

function stopWatcher() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

/** Reset the cached signature so the next poll re-fires (e.g. after settings change). */
function resetSignature() { lastSignature = ''; }

module.exports = { startWatcher, stopWatcher, resetSignature };
