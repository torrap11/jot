'use strict';

const input = document.getElementById('capture-input');
const organizeHintInput = document.getElementById('capture-organize-hint');
const appInput = document.getElementById('capture-app-input');
const captureFolderSelect = document.getElementById('capture-folder-select');
const attachImageBtn = document.getElementById('attach-image-capture-btn');
const attachFileBtn = document.getElementById('attach-file-capture-btn');
const pendingImagesEl = document.getElementById('capture-pending-images');
const workflowStatusEl = document.getElementById('capture-workflow-status');

const NOTE_FILE_WHITELIST_EXTS = ['pdf', 'md', 'rmd', 'txt'];
let pendingImageDataUrls = [];
let pendingFileAttachments = [];
/** Prevents overlapping saves (double Enter, key repeat, double button click). */
let captureBusy = false;

function setWorkflowStatus(message, isError = false) {
  if (!workflowStatusEl) return;
  if (!message) {
    workflowStatusEl.textContent = '';
    workflowStatusEl.classList.add('capture-workflow-status--hidden');
    workflowStatusEl.classList.remove('is-error');
    return;
  }
  workflowStatusEl.textContent = message;
  workflowStatusEl.classList.remove('capture-workflow-status--hidden');
  workflowStatusEl.classList.toggle('is-error', isError);
}

async function parseWorkflowFromInput(rawInputValue) {
  const trimmed = String(rawInputValue || '').trim();
  if (!trimmed) return null;
  try {
    return await window.mvp.parseRemindWorkflow(trimmed);
  } catch {
    return null;
  }
}

/** True when text looks like a remind-on-app-open workflow (not a plain note). */
function shouldTryWorkflowParse(rawInputValue) {
  const trimmed = String(rawInputValue || '').trim();
  if (!trimmed) return false;
  return (
    /^remind\s+me\b/i.test(trimmed) ||
    /\bwhen\s+i\s+open\b/i.test(trimmed) ||
    /^surface\s+.+\s+when\s+i\s+open\b/i.test(trimmed)
  );
}

/** True when text looks like a time-based reminder (P1). Excludes app-open patterns. */
function looksLikeTimeReminder(rawInputValue) {
  const t = String(rawInputValue || '').trim().toLowerCase();
  if (!t) return false;
  if (!/remind\s+me/.test(t)) return false;
  if (/when\s+i\s+open/.test(t)) return false;
  return (
    /in\s+\d+\s+(?:min|hour|day)/.test(t) ||
    /at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)/.test(t) ||
    /\btomorrow\b/.test(t) ||
    /\btonight\b/.test(t) ||
    /\bthis\s+(?:evening|afternoon)\b/.test(t)
  );
}

/** Run full workflow (parser + AI) vs plain save. Manual app link alone → plain note. */
function shouldRunWorkflow(rawInputValue, manualAppRaw) {
  const trimmed = String(rawInputValue || '').trim();
  if (!trimmed) return false;
  const manualApp = String(manualAppRaw || '').trim();
  if (manualApp && !shouldTryWorkflowParse(trimmed)) return false;
  return shouldTryWorkflowParse(trimmed);
}

function hasPendingAttachments() {
  return pendingImageDataUrls.length > 0 || pendingFileAttachments.length > 0;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadCaptureFolders() {
  if (!captureFolderSelect) return;
  let folders = [];
  try {
    folders = await window.mvp.listFolders();
  } catch {
    folders = [];
  }
  const opts = ['<option value="unfiled">Unfiled</option>'];
  for (const f of folders) {
    opts.push(`<option value="${f.id}">${escapeHtml(f.name)}</option>`);
  }
  captureFolderSelect.innerHTML = opts.join('');
}

function renderPendingImages() {
  if (!pendingImagesEl) return;
  if (pendingImageDataUrls.length === 0) {
    pendingImagesEl.classList.add('hidden');
    pendingImagesEl.innerHTML = '';
    return;
  }
  pendingImagesEl.classList.remove('hidden');
  pendingImagesEl.innerHTML = pendingImageDataUrls
    .map(
      (url, i) =>
        `<div class="capture-pending-thumb">
          <img src="${url}" alt="Pending image ${i + 1}" />
          <button type="button" class="capture-pending-thumb-remove" data-index="${i}" title="Remove">&times;</button>
        </div>`
    )
    .join('');
}

function resetCaptureForm() {
  input.value = '';
  if (organizeHintInput) organizeHintInput.value = '';
  appInput.value = '';
  if (captureFolderSelect) captureFolderSelect.value = 'unfiled';
  if (pendingImagesEl) {
    pendingImagesEl.classList.add('hidden');
    pendingImagesEl.innerHTML = '';
  }
  setWorkflowStatus('');
}

async function applyManualFolder(noteId, folderValue) {
  if (!captureFolderSelect && folderValue === undefined) return;
  const sel =
    folderValue !== undefined ? folderValue : (captureFolderSelect?.value || 'unfiled');
  if (sel === 'unfiled') return;
  await window.mvp.setNoteFolder(noteId, sel);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}

function extFromFileName(fileName) {
  const rawExt = String(fileName || '').toLowerCase().replace(/^.*\./, '');
  if (!rawExt) return null;
  if (!NOTE_FILE_WHITELIST_EXTS.includes(rawExt)) return null;
  return rawExt;
}

function noteTextWithFallback(text) {
  const trimmed = String(text || '').trim();
  if (trimmed) return trimmed;
  return hasPendingAttachments() ? '(attachment)' : '';
}

async function attachPendingArraysToNote(noteId, imageDataUrls, fileAttachments) {
  for (const dataUrl of imageDataUrls) {
    await window.mvp.addNoteImageFromDataUrl(noteId, dataUrl);
  }
  for (const file of fileAttachments) {
    await window.mvp.addNoteFileFromDataUrl(noteId, file.dataUrl, file.fileName, file.fileExt);
  }
}

async function attachPendingToNote(noteId) {
  await attachPendingArraysToNote(noteId, pendingImageDataUrls, pendingFileAttachments);
  pendingImageDataUrls = [];
  pendingFileAttachments = [];
}

async function buildSavePayloadFromDraft() {
  const text = noteTextWithFallback(input.value);
  if (!text) return null;
  const rawInputValue = String(input.value || '');
  let saveText = text;
  let appRaw = String(appInput.value || '');

  let parsed = null;
  if (shouldTryWorkflowParse(rawInputValue)) {
    parsed = await parseWorkflowFromInput(rawInputValue);
  }

  if (parsed && parsed.reminderText && parsed.appQuery) {
    saveText = parsed.reminderText;
    appRaw = parsed.appQuery;
    appInput.value = appRaw;
  }

  const folderValue = captureFolderSelect?.value || 'unfiled';
  const organizeHint = organizeHintInput ? organizeHintInput.value.trim() : '';
  return {
    saveText,
    appRaw,
    folderValue,
    organizeHint,
    images: [...pendingImageDataUrls],
    files: pendingFileAttachments.map((f) => ({
      dataUrl: f.dataUrl,
      fileName: f.fileName,
      fileExt: f.fileExt,
    })),
  };
}

async function runCaptureSavePipeline(payload) {
  const appKey = await window.mvp.resolveAppKey(payload.appRaw);
  const note = await window.mvp.saveCapture(payload.saveText, appKey);
  if (!note?.id) return;
  await attachPendingArraysToNote(note.id, payload.images, payload.files);
  const hint = String(payload.organizeHint || '').trim();
  if (hint) await window.mvp.setOrganizeHint(note.id, hint);
  await applyManualFolder(note.id, payload.folderValue);
}

async function finishCaptureAfterSave() {
  resetCaptureForm();
  pendingImageDataUrls = [];
  pendingFileAttachments = [];
  window.mvp.hideCapture();
}

async function submitPlainNote() {
  const payload = await buildSavePayloadFromDraft();
  if (!payload) {
    window.mvp.hideCapture();
    return;
  }
  captureBusy = true;
  try {
    await runCaptureSavePipeline(payload);
    await finishCaptureAfterSave();
  } finally {
    captureBusy = false;
  }
}

async function submitWorkflow() {
  const text = input.value.trim();
  if (!text) {
    setWorkflowStatus('Type what you want to remember.', true);
    return;
  }
  captureBusy = true;
  setWorkflowStatus('Linking to app…');
  try {
    const result = await window.mvp.runCaptureWorkflow(text);
    if (!result || result.error) {
      setWorkflowStatus(result?.error || 'Could not set up reminder.', true);
      return;
    }
    const noteId = result.note?.id;
    if (noteId) {
      const folderValue = captureFolderSelect?.value || 'unfiled';
      await applyManualFolder(noteId, folderValue);
      if (result.appQuery) appInput.value = result.appQuery;
    }
    await finishCaptureAfterSave();
  } finally {
    captureBusy = false;
  }
}

async function submitTimeReminder(parsed) {
  captureBusy = true;
  setWorkflowStatus(`Scheduling for ${parsed.label}…`);
  try {
    const note = await window.mvp.saveCapture(parsed.reminderText, '');
    if (!note?.id) {
      setWorkflowStatus('Could not save reminder.', true);
      return;
    }
    await window.mvp.setResurfaceAt(note.id, parsed.resurface_at);
    const folderValue = captureFolderSelect?.value || 'unfiled';
    await applyManualFolder(note.id, folderValue);
    setWorkflowStatus(`Scheduled: ${parsed.label}`);
    await new Promise((r) => setTimeout(r, 700));
    await finishCaptureAfterSave();
  } finally {
    captureBusy = false;
  }
}

async function submit() {
  if (captureBusy) return;

  const raw = input.value.trim();
  if (!raw && !hasPendingAttachments()) {
    window.mvp.hideCapture();
    return;
  }

  // App-open workflow takes priority
  if (!hasPendingAttachments() && shouldRunWorkflow(raw, appInput.value)) {
    await submitWorkflow();
    return;
  }

  // Time reminder (P1)
  if (!hasPendingAttachments() && looksLikeTimeReminder(raw)) {
    const parsed = await window.mvp.parseTimeReminder(raw);
    if (parsed) {
      await submitTimeReminder(parsed);
      return;
    }
  }

  await submitPlainNote();
}

async function handleEscape() {
  const hasText = input.value.trim().length > 0;
  const hasPending = hasPendingAttachments();
  if (!hasText && !hasPending) {
    resetCaptureForm();
    window.mvp.hideCapture();
    return;
  }
  if (captureBusy) return;
  const payload = await buildSavePayloadFromDraft();
  if (!payload) {
    resetCaptureForm();
    pendingImageDataUrls = [];
    pendingFileAttachments = [];
    window.mvp.hideCapture();
    return;
  }
  pendingImageDataUrls = [];
  pendingFileAttachments = [];
  resetCaptureForm();
  window.mvp.hideCapture();
  void runCaptureSavePipeline(payload).catch(() => {});
}

document.addEventListener('keydown', async (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  event.preventDefault();
  await handleEscape();
});

input.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    await submit();
  }
});

appInput.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    await submit();
  }
});

window.__jotFlushCapture = async () => {
  const payload = await buildSavePayloadFromDraft();
  if (!payload) return { ok: false };
  await runCaptureSavePipeline(payload);
  return { ok: true };
};

window.mvp.onCaptureLoadDraft((draft) => {
  if (!draft) return;
  input.value = String(draft.text || '');
  if (organizeHintInput) organizeHintInput.value = String(draft.organizeHint || '');
});

window.mvp.onCaptureFocus(() => {
  void loadCaptureFolders();
  input.focus();
  input.select();
});

void loadCaptureFolders();
input.focus();

input.addEventListener('paste', async (event) => {
  const items = [...(event.clipboardData?.items || [])];
  const files = [];
  for (const item of items) {
    if (item.kind !== 'file') continue;
    const f = item.getAsFile();
    if (!f) continue;
    files.push(f);
  }

  const imageFiles = files.filter((f) => String(f.type || '').startsWith('image/'));
  const fileFiles = files.filter((f) => extFromFileName(f.name));

  if (imageFiles.length === 0 && fileFiles.length === 0) {
    const dataUrl = await window.mvp.readClipboardImage().catch(() => null);
    if (dataUrl) {
      event.preventDefault();
      pendingImageDataUrls.push(dataUrl);
      renderPendingImages();
    }
    return;
  }

  event.preventDefault();

  for (const f of imageFiles) {
    const dataUrl = await fileToDataUrl(f);
    pendingImageDataUrls.push(dataUrl);
  }
  for (const f of fileFiles) {
    const fileExt = extFromFileName(f.name);
    if (!fileExt) continue;
    const dataUrl = await fileToDataUrl(f);
    pendingFileAttachments.push({
      dataUrl,
      fileName: f.name || `pasted.${fileExt}`,
      fileExt,
    });
  }
  renderPendingImages();
});

pendingImagesEl?.addEventListener('click', (event) => {
  const btn = event.target.closest('.capture-pending-thumb-remove');
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  if (!Number.isFinite(idx)) return;
  pendingImageDataUrls.splice(idx, 1);
  renderPendingImages();
});

attachImageBtn?.addEventListener('click', async () => {
  if (captureBusy) return;
  const rawInputValue = String(input.value || '');
  let text = input.value.trim() || '(attachment)';
  let appRaw = String(appInput.value || '');
  if (shouldTryWorkflowParse(rawInputValue)) {
    const parsed = await parseWorkflowFromInput(rawInputValue);
    if (parsed && parsed.reminderText && parsed.appQuery) {
      text = parsed.reminderText;
      appRaw = parsed.appQuery;
      appInput.value = appRaw;
    }
  }
  captureBusy = true;
  try {
    const appKey = await window.mvp.resolveAppKey(appRaw);
    const note = await window.mvp.saveCapture(text, appKey);
    if (note?.id) {
      await window.mvp.addNoteImagesFromPicker(note.id);
      await attachPendingToNote(note.id);
      await applyManualFolder(note.id);
    }
  } finally {
    captureBusy = false;
    resetCaptureForm();
    window.mvp.hideCapture();
  }
});

attachFileBtn?.addEventListener('click', async () => {
  if (captureBusy) return;
  captureBusy = true;
  try {
    const rawInputValue = String(input.value || '');
    let text = input.value.trim() || '(attachment)';
    let appRaw = String(appInput.value || '');
    if (shouldTryWorkflowParse(rawInputValue)) {
      const parsed = await parseWorkflowFromInput(rawInputValue);
      if (parsed && parsed.reminderText && parsed.appQuery) {
        text = parsed.reminderText;
        appRaw = parsed.appQuery;
        appInput.value = appRaw;
      }
    }
    const appKey = await window.mvp.resolveAppKey(appRaw);
    const note = await window.mvp.saveCapture(text, appKey);
    if (note && note.id) {
      await window.mvp.addNoteFilesFromPicker(note.id);
      await attachPendingToNote(note.id);
      await applyManualFolder(note.id);
    }
  } finally {
    captureBusy = false;
    resetCaptureForm();
    window.mvp.hideCapture();
  }
});
