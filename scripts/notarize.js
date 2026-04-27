#!/usr/bin/env node
'use strict';

/**
 * Optional notarization step for electron-builder.
 * Runs only when all required Apple credentials are provided.
 */

const path = require('path');

exports.default = async function notarizeApp(context) {
  if (process.platform !== 'darwin') return;

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log('[notarize] Skipping (missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID).');
    return;
  }

  const { notarize } = require('@electron/notarize');
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  await notarize({
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });

  console.log(`[notarize] Submitted ${appName}.app`);
};
