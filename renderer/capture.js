'use strict';

const input = document.getElementById('capture-input');
const appInput = document.getElementById('capture-app-input');
const captureFolderSelect = document.getElementById('capture-folder-select');
const attachImageBtn = document.getElementById('attach-image-capture-btn');
const attachFileBtn = document.getElementById('attach-file-capture-btn');

const NOTE_FILE_WHITELIST_EXTS = ['pdf', 'md', 'rmd', 'txt'];
let pendingImageDataUrls = [];
let pendingFileAttachments = [];
/** Prevents overlapping saves (double Enter, key repeat, double button click). */
let captureBusy = false;

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

function resetCaptureForm() {
  input.value = '';
  appInput.value = '';
  if (captureFolderSelect) captureFolderSelect.value = 'unfiled';
}

async function applyManualFolder(noteId) {
  if (!captureFolderSelect) return;
  const sel = captureFolderSelect.value || 'unfiled';
  if (sel === 'unfiled') return;
  await window.mvp.setNoteFolder(noteId, sel);
}

async function maybeAiFileNote(noteId) {
  if (captureFolderSelect && captureFolderSelect.value && captureFolderSelect.value !== 'unfiled') {
    return;
  }
  await fileNoteWithAi(noteId);
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
  const hasPending = pendingImageDataUrls.length > 0 || pendingFileAttachments.length > 0;
  return hasPending ? '(attachment)' : '';
}

async function attachPendingToNote(noteId) {
  for (const dataUrl of pendingImageDataUrls) {
    await window.mvp.addNoteImageFromDataUrl(noteId, dataUrl);
  }
  for (const file of pendingFileAttachments) {
    await window.mvp.addNoteFileFromDataUrl(noteId, file.dataUrl, file.fileName, file.fileExt);
  }
  pendingImageDataUrls = [];
  pendingFileAttachments = [];
}

/** Ask AI to pick a folder for this note only; ignores other moveNote steps in the response. */
async function fileNoteWithAi(noteId) {
  const id = Number(noteId);
  if (!Number.isFinite(id) || id < 1) return;
  const userMessage = [
    `Organize exactly one note: id ${id}. It may be unfiled or new; use its preview text in the snapshot.`,
    'Choose the best matching folder from snapshot.folders, or add one createFolder then move this note there.',
    'Your plan must include exactly one moveNote for this note id and must not move any other note.',
  ].join(' ');
  let res;
  try {
    res = await window.mvp.organizeChat({ userMessage, history: [] });
  } catch {
    return;
  }
  if (!res || res.error || !Array.isArray(res.plan)) return;
  const filtered = res.plan.filter((step) => {
    if (step && step.op === 'createFolder') return true;
    if (step && step.op === 'moveNote' && Number(step.noteId) === id) return true;
    return false;
  });
  if (!filtered.some((s) => s && s.op === 'moveNote')) return;
  try {
    await window.mvp.applyOrganizePlan(filtered);
  } catch {
    /* note stays saved; filing is best-effort */
  }
}

async function submit() {
  if (captureBusy) return;
  const text = noteTextWithFallback(input.value);
  if (!text) {
    window.mvp.hideCapture();
    return;
  }
  captureBusy = true;
  try {
    const rawInputValue = String(input.value || '');
    let saveText = text;
    let appRaw = String(appInput.value || '');

    // Support "remind me this: ... when i open this <app>" shorthand.
    // This lets you create many app-linked reminder notes quickly.
    let parsed = null;
    if (/^remind\s+me\s+this\s*:/i.test(rawInputValue.trim())) {
      try {
        parsed = await window.mvp.parseRemindWorkflow(rawInputValue);
      } catch {
        parsed = null;
      }
    }

    if (parsed && parsed.reminderText && parsed.appQuery) {
      saveText = parsed.reminderText;
      appRaw = parsed.appQuery;
      appInput.value = appRaw; // keep UI aligned with what we parsed
    }

    const appKey = await window.mvp.resolveAppKey(appRaw);
    const note = await window.mvp.saveCapture(saveText, appKey);
    if (note?.id) {
      await attachPendingToNote(note.id);
      await applyManualFolder(note.id);
      await maybeAiFileNote(note.id);
    }
    resetCaptureForm();
    window.mvp.hideCapture();
  } finally {
    captureBusy = false;
  }
}

async function handleEscape() {
  const hasText = input.value.trim().length > 0;
  const hasPending = pendingImageDataUrls.length > 0 || pendingFileAttachments.length > 0;
  if (hasText || hasPending) {
    await submit();
    return;
  }
  resetCaptureForm();
  window.mvp.hideCapture();
}

input.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    await submit();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    await handleEscape();
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
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    await handleEscape();
  }
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
  if (imageFiles.length === 0 && fileFiles.length === 0) return;

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
});

attachImageBtn?.addEventListener('click', async () => {
  if (captureBusy) return;
  const rawInputValue = String(input.value || '');
  let text = input.value.trim() || '(attachment)';
  let appRaw = String(appInput.value || '');
  if (/^remind\s+me\s+this\s*:/i.test(rawInputValue.trim())) {
    try {
      const parsed = await window.mvp.parseRemindWorkflow(rawInputValue);
      if (parsed && parsed.reminderText && parsed.appQuery) {
        text = parsed.reminderText;
        appRaw = parsed.appQuery;
        appInput.value = appRaw;
      }
    } catch {
      /* ignore parsing errors; fall back to normal capture */
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
      await maybeAiFileNote(note.id);
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
    if (/^remind\s+me\s+this\s*:/i.test(rawInputValue.trim())) {
      try {
        const parsed = await window.mvp.parseRemindWorkflow(rawInputValue);
        if (parsed && parsed.reminderText && parsed.appQuery) {
          text = parsed.reminderText;
          appRaw = parsed.appQuery;
          appInput.value = appRaw;
        }
      } catch {
        /* ignore parsing errors; fall back to normal capture */
      }
    }
    const appKey = await window.mvp.resolveAppKey(appRaw);
    const note = await window.mvp.saveCapture(text, appKey);
    if (note && note.id) {
      await window.mvp.addNoteFilesFromPicker(note.id);
      await attachPendingToNote(note.id);
      await applyManualFolder(note.id);
      await maybeAiFileNote(note.id);
    }
  } finally {
    captureBusy = false;
    resetCaptureForm();
    window.mvp.hideCapture();
  }
});
