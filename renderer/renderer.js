'use strict';

const state = {
  notes: [],
  activeId: null,
  /** Note id highlighted for ↑↓ / Delete (may match activeId when a note is open). */
  listFocusId: null,
  selectedIds: new Set(),
  apps: [],
  folders: [],
  folderFilter: 'all',
  /** True when the search box is empty and we are rendering the default recent list. */
  isDefaultList: true,
};

const queryInput = document.getElementById('query');
const cleanupNotesBtn = document.getElementById('cleanup-notes-btn');
const cleanupStatusEl = document.getElementById('cleanup-status');
const importDbBtn = document.getElementById('import-db-btn');
const exportDbBtn = document.getElementById('export-db-btn');
const aiKeyAccessStatusEl = document.getElementById('ai-key-access-status');
const aiKeyAccessBtn = document.getElementById('ai-key-access-btn');
const folderDiagramEl = document.getElementById('folder-diagram');
const folderDiagramTreeEl = document.getElementById('folder-diagram-tree');
const newFolderBtn = document.getElementById('new-folder-btn');
const newFolderModal = document.getElementById('new-folder-modal');
const newFolderNameInput = document.getElementById('new-folder-name-input');
const newFolderErrorEl = document.getElementById('new-folder-error');
const newFolderCancelBtn = document.getElementById('new-folder-cancel');
const newFolderCreateBtn = document.getElementById('new-folder-create');
const newFolderModalTitleEl = document.getElementById('new-folder-modal-title');
const newFolderModalHintEl = document.getElementById('new-folder-modal-hint');

const FOLDER_DIALOG_HINT_CREATE =
  'Choose a short name. You can move notes into this folder from the note editor.';
const FOLDER_DIALOG_HINT_EDITOR_CREATE =
  'Name the folder. This note will be moved into it when you create it.';
const EDITOR_NEW_FOLDER_VALUE = '__new_folder__';
const FOLDER_DIALOG_HINT_RENAME =
  'Notes stay in this folder. Only the label in the diagram and editor changes.';
const FOLDER_DIALOG_HINT_GROUP =
  'Both notes will move into this folder. You can rename it anytime from the folder tree.';

/** When non-null, the folder name dialog is renaming this folder id instead of creating. */
let folderNameDialogRenameTargetId = null;
/** When non-null, create dialog groups these note ids into a new folder on submit. */
let folderNameDialogGroupNoteIds = null;
/** When true, plain create moves the open note into the new folder. */
let folderNameDialogAssignActiveNote = false;
/** Note id being dragged in the results list (for drop onto another note). */
let dragNoteId = null;
/** Suppress row click right after a drag so dropping does not open a note. */
let suppressNoteRowClick = false;
const bulkActionsEl = document.getElementById('bulk-actions');
const selectedCountEl = document.getElementById('selected-count');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const resultsEl = document.getElementById('results');
const editorEl = document.getElementById('editor');
const editorDateEl = document.getElementById('editor-date');
const editorTextEl = document.getElementById('editor-text');
const editorOrganizeHintEl = document.getElementById('editor-organize-hint');
const editorOrganizeStatusEl = document.getElementById('editor-organize-status');
const editorOrganizeBtn = document.getElementById('editor-organize-btn');
const closeEditorBtn = document.getElementById('close-editor-btn');
const copyBtn = document.getElementById('copy-note-btn');
const attachImageBtn = document.getElementById('attach-image-btn');
const attachFileBtn = document.getElementById('attach-file-btn');
const editorFolderSelect = document.getElementById('editor-folder-select');
const editorNewFolderBtn = document.getElementById('editor-new-folder-btn');
const appSelect = document.getElementById('app-select');
const linkBtn = document.getElementById('link-btn');
const linksEl = document.getElementById('links');
const noteImagesEl = document.getElementById('note-images');
const noteFilesEl = document.getElementById('note-files');
const imageLightboxEl = document.getElementById('image-lightbox');
const imageLightboxImg = document.getElementById('image-lightbox-img');
const imageLightboxCloseBtn = document.querySelector('.image-lightbox-close');

let imageLightboxKeydownHandler = null;
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyErrorEl = document.getElementById('api-key-error');
const apiKeySaveBtn = document.getElementById('api-key-save');
const apiKeyCancelBtn = document.getElementById('api-key-cancel');
const anthropicKeyLink = document.getElementById('anthropic-key-link');

let saveTimer = null;
const linkHistory = {
  undo: [],
  redo: [],
};
function areSameStringLists(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function resetLinkHistory() {
  linkHistory.undo = [];
  linkHistory.redo = [];
}

function pushLinkHistoryEntry(noteId, before, after) {
  if (!noteId) return;
  if (areSameStringLists(before, after)) return;
  linkHistory.undo.push({ noteId, before: [...before], after: [...after] });
  linkHistory.redo = [];
}

async function applyLinksSnapshot(noteId, targetLinks) {
  if (!noteId) return;
  const currentLinks = await window.mvp.getLinks(noteId);
  const currentSet = new Set(currentLinks);
  const targetSet = new Set(targetLinks);

  for (const appKey of currentSet) {
    if (!targetSet.has(appKey)) await window.mvp.removeLink(noteId, appKey);
  }
  for (const appKey of targetSet) {
    if (!currentSet.has(appKey)) await window.mvp.addLink(noteId, appKey);
  }
}

async function undoLinkChange() {
  if (!state.activeId) return;
  const entry = linkHistory.undo[linkHistory.undo.length - 1];
  if (!entry || entry.noteId !== state.activeId) return;
  linkHistory.undo.pop();
  await applyLinksSnapshot(state.activeId, entry.before);
  linkHistory.redo.push(entry);
  await renderLinks();
}

async function redoLinkChange() {
  if (!state.activeId) return;
  const entry = linkHistory.redo[linkHistory.redo.length - 1];
  if (!entry || entry.noteId !== state.activeId) return;
  linkHistory.redo.pop();
  await applyLinksSnapshot(state.activeId, entry.after);
  linkHistory.undo.push(entry);
  await renderLinks();
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function isUndoShortcut(event) {
  const modifier = event.metaKey || event.ctrlKey;
  return modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z';
}

function isRedoShortcut(event) {
  const modifier = event.metaKey || event.ctrlKey;
  return modifier && !event.altKey && event.shiftKey && event.key.toLowerCase() === 'z';
}

function closeImageLightbox() {
  if (!imageLightboxEl || !imageLightboxImg) return;
  imageLightboxEl.classList.add('hidden');
  imageLightboxImg.removeAttribute('src');
  imageLightboxImg.alt = '';
  if (imageLightboxKeydownHandler) {
    document.removeEventListener('keydown', imageLightboxKeydownHandler);
    imageLightboxKeydownHandler = null;
  }
}

function openImageLightbox(src, alt) {
  if (!imageLightboxEl || !imageLightboxImg || !src) return;
  imageLightboxImg.src = src;
  imageLightboxImg.alt = alt || 'Attachment';
  imageLightboxEl.classList.remove('hidden');
  imageLightboxKeydownHandler = (e) => {
    if (e.key === 'Escape') closeImageLightbox();
  };
  document.addEventListener('keydown', imageLightboxKeydownHandler);
}

async function closeEditor() {
  clearTimeout(saveTimer);
  await flushActiveNote();
  closeImageLightbox();
  state.activeId = null;
  window.__jotActiveNoteId = null;
  resetLinkHistory();
  editorEl.closest('.search-shell')?.classList.remove('editor-open');
  editorEl.classList.add('hidden');
  editorTextEl.value = '';
  if (editorOrganizeHintEl) editorOrganizeHintEl.value = '';
  if (editorOrganizeStatusEl) editorOrganizeStatusEl.textContent = '';
  editorFolderSelect.value = 'unfiled';
  linksEl.innerHTML = '';
  noteImagesEl.innerHTML = '';
  noteFilesEl.innerHTML = '';
  dockInlineEditor();
  renderResults();
  if (state.listFocusId != null) focusListRow(state.listFocusId);
  else queryInput.focus();
}

function focusListRow(noteId) {
  if (noteId == null) return;
  requestAnimationFrame(() => {
    const btn = resultsEl.querySelector(`.result[data-id="${noteId}"]`);
    btn?.focus();
  });
}

/** Keep the note editor directly under the active list row (not at the bottom). */
function dockInlineEditor() {
  if (!editorEl || !resultsEl) return;
  const editorOpen = !editorEl.classList.contains('hidden') && state.activeId != null;
  if (editorOpen) {
    const row = resultsEl.querySelector(`.result-row[data-id="${state.activeId}"]`);
    if (row && row.nextElementSibling !== editorEl) {
      row.insertAdjacentElement('afterend', editorEl);
    }
    return;
  }
  if (editorEl.parentElement !== resultsEl.parentElement || editorEl.previousElementSibling !== resultsEl) {
    resultsEl.insertAdjacentElement('afterend', editorEl);
  }
}

function scrollActiveNoteRowIntoView(noteId) {
  requestAnimationFrame(() => {
    const row = resultsEl.querySelector(`.result-row[data-id="${noteId}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function getFolderNavButtons() {
  if (!folderDiagramTreeEl) return [];
  return [...folderDiagramTreeEl.querySelectorAll('.folder-node[data-folder-filter]')];
}

function focusFolderNavButton(filterValue) {
  const want = String(filterValue ?? 'all');
  requestAnimationFrame(() => {
    const nodes = getFolderNavButtons();
    if (!nodes.length) return;
    const hit = nodes.find((el) => String(el.dataset.folderFilter || 'all') === want) ?? nodes[0];
    hit.focus();
  });
}

async function applyFolderFilterFromNav(newFilter) {
  state.folderFilter = newFilter;
  await runQuery(queryInput.value.trim());
  focusFolderNavButton(state.folderFilter);
}

function updateBulkActionsUi() {
  const count = state.selectedIds.size;
  selectedCountEl.textContent = `${count} selected`;
  const showBulk = unifiedSearchScope === 'notes' && count > 0;
  bulkActionsEl.classList.toggle('hidden', !showBulk);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTimeOnly(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function localDayKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function loadApps() {
  state.apps = await window.mvp.listApps();
}

async function loadFolders() {
  state.folders = await window.mvp.listFolders();
  renderFolderControls();
}

function folderLabel(folderId) {
  if (folderId == null) return 'Unfiled';
  const id = Number(folderId);
  const hit = state.folders.find((f) => Number(f.id) === id);
  return hit ? hit.name : 'Folder';
}

function renderFolderControls() {
  const currentValue = editorFolderSelect?.value || 'unfiled';
  const editorOptions = ['<option value="unfiled">Unfiled</option>'];
  for (const folder of state.folders) {
    const safeName = escapeHtml(folder.name);
    editorOptions.push(`<option value="${folder.id}">${safeName}</option>`);
  }
  editorOptions.push(
    `<option value="${EDITOR_NEW_FOLDER_VALUE}">+ New folder…</option>`
  );
  editorFolderSelect.innerHTML = editorOptions.join('');
  if (currentValue === EDITOR_NEW_FOLDER_VALUE) return;
  const hasOption = [...editorFolderSelect.options].some((o) => o.value === currentValue);
  if (hasOption) editorFolderSelect.value = currentValue;
}

function editorFolderValueForNote(note) {
  return note && note.folder_id != null ? String(note.folder_id) : 'unfiled';
}

function restoreEditorFolderSelectFromActiveNote() {
  if (!state.activeId) {
    editorFolderSelect.value = 'unfiled';
    return;
  }
  const note = state.notes.find((n) => n.id === state.activeId);
  editorFolderSelect.value = editorFolderValueForNote(note);
}

function showNewFolderModalFromEditor() {
  if (!state.activeId) return;
  showNewFolderModal({ assignActiveNote: true });
}

function labelForAppKey(bundleId) {
  const hit = state.apps.find((a) => a.bundleId === bundleId);
  return hit ? hit.name : bundleId;
}

function renderFolderDiagramHtml(diagram) {
  const root = String(diagram?.rootLabel || 'All notes');
  const unfiledCount = Number(diagram?.unfiledCount) || 0;
  const folders = Array.isArray(diagram?.folders) ? diagram.folders : [];
  const folderTotal = folders.reduce((sum, folder) => sum + (Number(folder.noteCount) || 0), 0);
  const totalCount = folderTotal + unfiledCount;
  const items = [];
  const rootActive = state.folderFilter === 'all' ? ' active' : '';
  items.push(`
    <button type="button" class="folder-node${rootActive}" data-folder-filter="all">
      <span class="folder-node-prefix">•</span>
      <span class="folder-node-name">${escapeHtml(root)}</span>
      <span class="folder-node-count">(${totalCount})</span>
    </button>
  `);
  if (folders.length === 0) {
    items.push(`
      <div class="folder-node empty">
        <span class="folder-node-prefix">└─</span>
        <span class="folder-node-name">(no folders yet)</span>
      </div>
    `);
  } else {
    folders.forEach((folder, idx) => {
      const branch = idx === folders.length - 1 ? '└─' : '├─';
      const count = Number(folder.noteCount) || 0;
      const active = String(state.folderFilter) === String(folder.id) ? ' active' : '';
      const deleteTitle = escapeAttr(`Delete folder “${folder.name}”. Notes become Unfiled.`);
      const renameTitle = escapeAttr(`Rename folder “${folder.name}”`);
      items.push(`
        <div class="folder-diagram-row">
          <button type="button" class="folder-node${active}" data-folder-filter="${folder.id}">
            <span class="folder-node-prefix">${branch}</span>
            <span class="folder-node-name">${escapeHtml(folder.name)}</span>
            <span class="folder-node-count">(${count})</span>
          </button>
          <button type="button" class="folder-rename-btn" data-folder-rename="${folder.id}" title="${renameTitle}" aria-label="Rename folder">✎</button>
          <button type="button" class="folder-delete-btn" data-folder-delete="${folder.id}" title="${deleteTitle}" aria-label="Delete folder">×</button>
        </div>
      `);
    });
  }
  const unfiledActive = state.folderFilter === 'unfiled' ? ' active' : '';
  items.push(`
    <button type="button" class="folder-node${unfiledActive}" data-folder-filter="unfiled">
      <span class="folder-node-prefix">•</span>
      <span class="folder-node-name">Unfiled</span>
      <span class="folder-node-count">(${unfiledCount})</span>
    </button>
  `);
  return items.join('');
}

async function refreshFolderDiagram() {
  if (!folderDiagramTreeEl || !folderDiagramEl) return;
  try {
    const diagram = await window.mvp.getFolderDiagram();
    folderDiagramTreeEl.innerHTML = renderFolderDiagramHtml(diagram);
    folderDiagramEl.classList.remove('hidden');
  } catch (error) {
    folderDiagramTreeEl.innerHTML = `Unable to load (${escapeHtml(error.message || String(error))})`;
    folderDiagramEl.classList.remove('hidden');
  }
}

async function deleteFolderFromUi(folderId) {
  const id = Number(folderId);
  if (!Number.isFinite(id) || id < 1) return;
  const folder = state.folders.find((f) => Number(f.id) === id);
  const label = folder ? folder.name : 'this folder';
  if (!confirm(`Delete folder “${label}”? Notes inside will move to Unfiled.`)) return;
  const ok = await window.mvp.deleteFolder(id);
  if (!ok) return;
  if (String(state.folderFilter) === String(id)) {
    state.folderFilter = 'all';
  }
  await loadFolders();
  if (state.activeId) {
    const note = await window.mvp.getNote(state.activeId);
    if (note) {
      editorFolderSelect.value = note.folder_id == null ? 'unfiled' : String(note.folder_id);
    }
  }
  await runQuery(queryInput.value.trim());
}

folderDiagramEl?.addEventListener('click', (event) => {
  const renameBtn = event.target.closest('[data-folder-rename]');
  if (renameBtn) {
    event.preventDefault();
    event.stopPropagation();
    const rawId = renameBtn.getAttribute('data-folder-rename');
    showRenameFolderModal(rawId);
    return;
  }
  const delBtn = event.target.closest('[data-folder-delete]');
  if (delBtn) {
    event.preventDefault();
    event.stopPropagation();
    const rawId = delBtn.getAttribute('data-folder-delete');
    void deleteFolderFromUi(rawId);
    return;
  }
  const btn = event.target.closest('.folder-node[data-folder-filter]');
  if (!btn) return;
  state.folderFilter = btn.dataset.folderFilter || 'all';
  void runQuery(queryInput.value.trim());
});

folderDiagramTreeEl?.addEventListener(
  'keydown',
  (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const btn = event.target?.closest?.('.folder-node[data-folder-filter]');
    if (!btn || !folderDiagramTreeEl.contains(btn)) return;
    const nodes = getFolderNavButtons();
    const i = nodes.indexOf(btn);
    if (i < 0) return;
    const j = event.key === 'ArrowDown' ? i + 1 : i - 1;
    if (j < 0 || j >= nodes.length) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'ArrowUp' && i === 0) queryInput.focus();
      else if (event.key === 'ArrowDown' && i === nodes.length - 1 && state.notes.length > 0) {
        state.listFocusId = state.notes[0].id;
        renderResults();
        focusListRow(state.listFocusId);
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextFilter = nodes[j].dataset.folderFilter || 'all';
    void applyFolderFilterFromNav(nextFilter);
  },
  true
);

function noteSnippetForFolderName(text) {
  const line = String(text || '')
    .split('\n')[0]
    .trim()
    .replace(/\s+/g, ' ');
  if (!line || line === '(attachment)') return '';
  return line.slice(0, 36);
}

function suggestFolderNameFromNotes(noteA, noteB) {
  const a = noteSnippetForFolderName(noteA.text);
  const b = noteSnippetForFolderName(noteB.text);
  if (a && b) return a === b ? a : `${a} & ${b}`.slice(0, 80);
  if (a) return a;
  if (b) return b;
  return 'New folder';
}

function showNewFolderModal(opts = {}) {
  if (!newFolderModal || !newFolderNameInput) return;
  folderNameDialogRenameTargetId = null;
  folderNameDialogGroupNoteIds = null;
  folderNameDialogAssignActiveNote = Boolean(opts.assignActiveNote);
  if (newFolderModalTitleEl) newFolderModalTitleEl.textContent = 'New folder';
  if (newFolderModalHintEl) {
    newFolderModalHintEl.textContent = folderNameDialogAssignActiveNote
      ? FOLDER_DIALOG_HINT_EDITOR_CREATE
      : FOLDER_DIALOG_HINT_CREATE;
  }
  if (newFolderCreateBtn) newFolderCreateBtn.textContent = 'Create';
  newFolderNameInput.placeholder = 'e.g. Work';
  newFolderErrorEl?.classList.add('hidden');
  if (newFolderErrorEl) newFolderErrorEl.textContent = '';
  newFolderNameInput.value = '';
  newFolderModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    newFolderNameInput.focus();
    newFolderNameInput.select();
  });
}

function showGroupNotesFolderModal(sourceId, targetId) {
  if (!newFolderModal || !newFolderNameInput) return;
  const source = state.notes.find((n) => n.id === sourceId);
  const target = state.notes.find((n) => n.id === targetId);
  if (!source || !target) return;
  if (
    source.folder_id != null &&
    source.folder_id === target.folder_id
  ) {
    return;
  }
  folderNameDialogRenameTargetId = null;
  folderNameDialogAssignActiveNote = false;
  folderNameDialogGroupNoteIds = [sourceId, targetId];
  if (newFolderModalTitleEl) newFolderModalTitleEl.textContent = 'Folder from notes';
  if (newFolderModalHintEl) newFolderModalHintEl.textContent = FOLDER_DIALOG_HINT_GROUP;
  if (newFolderCreateBtn) newFolderCreateBtn.textContent = 'Create';
  newFolderNameInput.placeholder = 'e.g. App ideas';
  newFolderErrorEl?.classList.add('hidden');
  if (newFolderErrorEl) newFolderErrorEl.textContent = '';
  newFolderNameInput.value = suggestFolderNameFromNotes(source, target);
  newFolderModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    newFolderNameInput.focus();
    newFolderNameInput.select();
  });
}

function showRenameFolderModal(folderIdRaw) {
  if (!newFolderModal || !newFolderNameInput) return;
  const id = Number(folderIdRaw);
  if (!Number.isFinite(id) || id < 1) return;
  const folder = state.folders.find((f) => Number(f.id) === id);
  if (!folder) return;
  folderNameDialogRenameTargetId = id;
  folderNameDialogGroupNoteIds = null;
  folderNameDialogAssignActiveNote = false;
  if (newFolderModalTitleEl) newFolderModalTitleEl.textContent = 'Rename folder';
  if (newFolderModalHintEl) newFolderModalHintEl.textContent = FOLDER_DIALOG_HINT_RENAME;
  if (newFolderCreateBtn) newFolderCreateBtn.textContent = 'Save';
  newFolderNameInput.placeholder = '';
  newFolderErrorEl?.classList.add('hidden');
  if (newFolderErrorEl) newFolderErrorEl.textContent = '';
  newFolderNameInput.value = folder.name;
  newFolderModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    newFolderNameInput.focus();
    newFolderNameInput.select();
  });
}

function hideNewFolderModal() {
  folderNameDialogRenameTargetId = null;
  folderNameDialogGroupNoteIds = null;
  folderNameDialogAssignActiveNote = false;
  newFolderModal?.classList.add('hidden');
}

async function submitFolderNameDialog() {
  if (!newFolderNameInput) return;
  const trimmed = newFolderNameInput.value.trim();
  if (!trimmed) {
    if (newFolderErrorEl) {
      newFolderErrorEl.textContent = 'Enter a folder name.';
      newFolderErrorEl.classList.remove('hidden');
    }
    return;
  }
  if (newFolderCreateBtn) newFolderCreateBtn.disabled = true;
  const isRename = folderNameDialogRenameTargetId != null;
  const groupNoteIds = folderNameDialogGroupNoteIds;
  try {
    if (isRename) {
      const folder = await window.mvp.renameFolder(folderNameDialogRenameTargetId, trimmed);
      if (!folder) {
        if (newFolderErrorEl) {
          newFolderErrorEl.textContent = 'Could not rename that folder.';
          newFolderErrorEl.classList.remove('hidden');
        }
        return;
      }
    } else if (groupNoteIds) {
      const result = await window.mvp.groupNotesIntoFolder(groupNoteIds, trimmed);
      if (!result || !result.folder) {
        const duplicate = state.folders.some((f) => f.name === trimmed);
        if (newFolderErrorEl) {
          newFolderErrorEl.textContent = duplicate
            ? 'A folder with that name already exists.'
            : 'Could not create that folder.';
          newFolderErrorEl.classList.remove('hidden');
        }
        return;
      }
      state.folderFilter = String(result.folder.id);
    } else {
      const folder = await window.mvp.createFolder(trimmed);
      if (!folder) {
        if (newFolderErrorEl) {
          newFolderErrorEl.textContent = 'Could not create that folder.';
          newFolderErrorEl.classList.remove('hidden');
        }
        return;
      }
      if (folderNameDialogAssignActiveNote && state.activeId) {
        const updated = await window.mvp.setNoteFolder(state.activeId, String(folder.id));
        if (!updated) {
          if (newFolderErrorEl) {
            newFolderErrorEl.textContent = 'Folder created but could not move this note.';
            newFolderErrorEl.classList.remove('hidden');
          }
          await loadFolders();
          return;
        }
      }
    }
    hideNewFolderModal();
    await loadFolders();
    if (state.activeId) {
      const note = await window.mvp.getNote(state.activeId);
      if (note) {
        editorFolderSelect.value = editorFolderValueForNote(note);
      }
    }
    await runQuery(queryInput.value.trim());
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    const duplicate = /unique|constraint|SQLITE_CONSTRAINT/i.test(msg);
    if (newFolderErrorEl) {
      newFolderErrorEl.textContent = duplicate
        ? 'A folder with that name already exists.'
        : isRename
          ? 'Could not rename folder.'
          : 'Could not create folder.';
      newFolderErrorEl.classList.remove('hidden');
    }
  } finally {
    if (newFolderCreateBtn) newFolderCreateBtn.disabled = false;
  }
}

newFolderBtn?.addEventListener('click', () => {
  showNewFolderModal();
});

newFolderCancelBtn?.addEventListener('click', () => {
  hideNewFolderModal();
});

newFolderCreateBtn?.addEventListener('click', () => {
  void submitFolderNameDialog();
});

newFolderNameInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void submitFolderNameDialog();
  }
});

newFolderModal?.addEventListener('click', (event) => {
  if (event.target === newFolderModal) hideNewFolderModal();
});

let unifiedSearchScope = 'all';
let unifiedCaptureTimer = null;

const unifiedStatusEl = document.getElementById('unified-search-status');
const unifiedCaptureEl = document.getElementById('unified-capture-results');

function contentTypeForUnifiedScope(scope) {
  if (scope === 'screen') return 'accessibility';
  if (scope === 'audio') return 'audio';
  return 'all';
}

function shouldShowNotesForScope() {
  return unifiedSearchScope === 'all' || unifiedSearchScope === 'notes';
}

function shouldRunUnifiedCaptureSearch(text) {
  if (unifiedSearchScope === 'notes') return false;
  if (!text && unifiedSearchScope === 'all') return false;
  return true;
}

const UNIFIED_QUERY_PLACEHOLDERS = {
  all: 'Search notes, screen, and audio…',
  notes: 'Search notes…',
  screen: 'Search screen history…',
  audio: 'Search audio transcripts…',
};

function updateUnifiedScopeChrome() {
  const notesScope = unifiedSearchScope === 'notes';
  document.getElementById('folder-diagram')?.classList.toggle('hidden', !notesScope);
  if (queryInput) {
    queryInput.placeholder =
      UNIFIED_QUERY_PLACEHOLDERS[unifiedSearchScope] || UNIFIED_QUERY_PLACEHOLDERS.all;
  }
  updateBulkActionsUi();
}

async function runUnifiedCaptureSearch(text) {
  if (!unifiedCaptureEl || !unifiedStatusEl) return;

  if (!shouldRunUnifiedCaptureSearch(text)) {
    unifiedCaptureEl.innerHTML = '';
    unifiedCaptureEl.classList.add('hidden');
    unifiedStatusEl.classList.add('hidden');
    unifiedStatusEl.textContent = '';
    return;
  }

  const browsing = !text;
  unifiedCaptureEl.classList.remove('hidden');
  unifiedStatusEl.classList.remove('hidden');
  unifiedStatusEl.textContent = browsing
    ? unifiedSearchScope === 'audio'
      ? 'Loading recent audio…'
      : 'Loading recent screen captures…'
    : 'Searching screen & audio…';
  unifiedCaptureEl.innerHTML = '';

  const [searchResult, memResult] = await Promise.all([
    window.mvp.screenpipeSearch({
      q: text,
      start_time: '7d ago',
      content_type: contentTypeForUnifiedScope(unifiedSearchScope),
      limit: browsing ? 15 : 12,
    }),
    text && unifiedSearchScope === 'all'
      ? window.mvp.screenpipeMemories({ q: text, limit: 5 })
      : Promise.resolve({ ok: false }),
  ]);

  const cards = [];

  if (memResult.ok && unifiedSearchScope === 'all') {
    const mems = Array.isArray(memResult.data) ? memResult.data : [];
    mems.forEach((mem) => {
      const card = buildCaptureCard({
        badgeClass: 'memory',
        badgeLabel: 'Memory',
        appName: '',
        timestamp: formatTimestamp(mem.created_at),
        snippet: mem.content || '',
      });
      cards.push(card);
    });
  }

  if (searchResult.ok) {
    const items = searchResult.data || [];
    items.forEach((item) => cards.push(renderCaptureResult(item)));
  } else if (searchResult.error === 'screenpipe client not loaded') {
    unifiedStatusEl.textContent = 'Screen history: engine offline.';
    return;
  }

  if (cards.length === 0) {
    unifiedStatusEl.textContent = browsing
      ? 'No recent captures in the last 7 days — type keywords to search.'
      : 'No screen or audio matches.';
    return;
  }

  unifiedStatusEl.textContent = browsing
    ? `${cards.length} recent ${unifiedSearchScope === 'audio' ? 'audio' : 'screen'} (7d) — type to narrow`
    : `${cards.length} from screen & audio`;
  cards.forEach((card) => unifiedCaptureEl.appendChild(card));
}

function scheduleUnifiedCaptureSearch(text) {
  clearTimeout(unifiedCaptureTimer);
  unifiedCaptureTimer = setTimeout(() => void runUnifiedCaptureSearch(text), 400);
}

async function runQuery(text) {
  state.isDefaultList = !text;
  updateUnifiedScopeChrome();
  const showNotes = shouldShowNotesForScope();
  state.notes = !showNotes
    ? []
    : text
      ? await window.mvp.queryNotes(text, state.folderFilter)
      : await window.mvp.recentNotes(state.folderFilter);
  const validIds = new Set(state.notes.map((n) => n.id));
  state.selectedIds = new Set([...state.selectedIds].filter((id) => validIds.has(id)));
  if (state.listFocusId != null && !state.notes.some((n) => n.id === state.listFocusId)) {
    state.listFocusId = state.notes[0]?.id ?? null;
  }
  renderResults();
  updateBulkActionsUi();
  await refreshFolderDiagram();
  scheduleUnifiedCaptureSearch(text);
}

/**
 * Extract a contextual snippet around the first occurrence of `query` in `text`.
 * Falls back to the first line if no match or no query.
 */
function extractSnippet(text, query) {
  const body = String(text || '');
  if (!query) return body.split('\n')[0].slice(0, 120);
  const lower = body.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return body.split('\n')[0].slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + query.length + 80);
  const snippet = body.slice(start, end);
  return (start > 0 ? '…' : '') + snippet + (end < body.length ? '…' : '');
}

/**
 * Escape HTML and wrap every occurrence of `query` in a `<mark>` tag.
 */
function highlightSnippet(snippetText, query) {
  const safe = escapeHtml(snippetText);
  if (!query) return safe;
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(escapedQuery, 'gi'), (m) => `<mark class="search-hl">${m}</mark>`);
}

function renderResults() {
  if (!shouldShowNotesForScope()) {
    const label = unifiedSearchScope === 'audio' ? 'Audio' : 'Screen';
    resultsEl.innerHTML = `<div class="empty">${label} results appear above. Type in the search box to filter.</div>`;
    return;
  }
  if (state.notes.length === 0) {
    const q = queryInput.value.trim();
    if (q && unifiedSearchScope !== 'notes') {
      resultsEl.innerHTML = '<div class="empty">No notes — see screen/audio above.</div>';
    } else {
      resultsEl.innerHTML = '<div class="empty">No notes found.</div>';
    }
    return;
  }
  const sameLocalDay = state.notes.every(
    (n) => localDayKey(n.created_at) === localDayKey(state.notes[0].created_at)
  );
  // When not searching, if every visible note shares one local day, show time-only in the list.
  const hideDate = state.isDefaultList && sameLocalDay;

  const activeQuery = state.isDefaultList ? '' : queryInput.value.trim();
  const countLabel = state.notes.length === 1 ? '1 note' : `${state.notes.length} notes`;
  const countHtml = activeQuery
    ? `<div class="results-count" aria-live="polite">${countLabel} for <em>${escapeHtml(activeQuery)}</em></div>`
    : '';

  const rows = state.notes
    .map((note) => {
      const snippet = extractSnippet(note.text, activeQuery);
      const snippetHtml = highlightSnippet(snippet, activeQuery);
      const dateText = hideDate ? formatTimeOnly(note.created_at) : formatDate(note.created_at);
      const folderText = folderLabel(note.folder_id);
      const safeTime = escapeHtml(dateText || 'Unknown');
      const safeFolder = escapeHtml(folderText);
      const active = note.id === state.activeId ? ' active' : '';
      const listFocus = note.id === state.listFocusId ? ' list-focus' : '';
      const selected = state.selectedIds.has(note.id) ? ' checked' : '';
      const tab = note.id === state.listFocusId ? '0' : '-1';
      return `<div class="result-row${active}${listFocus}" data-id="${note.id}" draggable="true" title="Drag onto another note to group into a folder">
        <label class="result-select" title="Select note">
          <input type="checkbox" class="result-checkbox" data-id="${note.id}"${selected} />
        </label>
        <button type="button" class="result" data-id="${note.id}" tabindex="${tab}">
          <span class="result-date">
            <span class="meta-value meta-time-value">${safeTime}</span>
            <span class="meta-sep">|</span>
            <span class="meta-value meta-folder-value">${safeFolder}</span>
          </span>
          <span class="result-text">${snippetHtml}</span>
        </button>
        <button type="button" class="result-delete" data-id="${note.id}" title="Delete note">×</button>
      </div>`;
    })
    .join('');

  resultsEl.innerHTML = countHtml + rows;
  dockInlineEditor();
}

async function startComposeNote() {
  const note = await window.mvp.createNote('');
  if (!note?.id) return;
  await runQuery(queryInput.value.trim());
  await openNote(note.id);
}

async function openNote(noteId) {
  const note = await window.mvp.getNote(noteId);
  if (!note) return;
  const switchedNotes = state.activeId !== note.id;
  state.activeId = note.id;
  window.__jotActiveNoteId = note.id;
  state.listFocusId = note.id;
  if (switchedNotes) resetLinkHistory();
  editorEl.classList.remove('hidden');
  editorDateEl.textContent = formatDate(note.created_at);
  editorTextEl.value = note.text || '';
  if (editorOrganizeHintEl) editorOrganizeHintEl.value = note.organize_hint || '';
  if (editorOrganizeStatusEl) editorOrganizeStatusEl.textContent = '';
  editorFolderSelect.value = note.folder_id == null ? 'unfiled' : String(note.folder_id);
  editorEl.closest('.search-shell')?.classList.add('editor-open');
  renderResults();
  await renderLinks();
  await renderNoteImages();
  await renderNoteFiles();
  scrollActiveNoteRowIntoView(note.id);
  requestAnimationFrame(() => editorTextEl.focus());
}

async function renderLinks() {
  if (!state.activeId) {
    linksEl.innerHTML = '';
    return;
  }
  const links = await window.mvp.getLinks(state.activeId);
  if (!links.length) {
    linksEl.innerHTML = '';
    return;
  }
  linksEl.innerHTML = links
    .map(
      (appKey) =>
        `<button type="button" class="chip" data-remove="${escapeHtml(appKey)}">${escapeHtml(labelForAppKey(appKey))} ×</button>`
    )
    .join('');
}

async function renderNoteImages() {
  if (!state.activeId) {
    noteImagesEl.innerHTML = '';
    return;
  }
  const images = await window.mvp.listNoteImages(state.activeId);
  if (!Array.isArray(images) || images.length === 0) {
    noteImagesEl.innerHTML = '';
    return;
  }
  noteImagesEl.innerHTML = images
    .map((image) => {
      const src = image.asset_url || image.data_url || image.file_url || '';
      return `<div class="note-image-card" role="button" tabindex="0" aria-label="View attachment full size">
        <img src="${escapeAttr(src)}" alt="Attachment" />
        <button type="button" class="note-image-remove" data-image-id="${image.id}" title="Remove image">×</button>
      </div>`;
    })
    .join('');
}

async function renderNoteFiles() {
  if (!state.activeId) {
    noteFilesEl.innerHTML = '';
    return;
  }
  const files = await window.mvp.listNoteFiles(state.activeId);
  if (!Array.isArray(files) || files.length === 0) {
    noteFilesEl.innerHTML = '';
    return;
  }

  noteFilesEl.innerHTML = files
    .map(
      (file) => `<div class="note-file-card">
        <div class="note-file-meta">
          <span class="note-file-name" title="${escapeAttr(file.file_name)}">${escapeHtml(file.file_name)}</span>
          <span class="note-file-ext">${escapeHtml(file.file_ext)}</span>
        </div>
        <button type="button" class="note-file-open" data-file-id="${file.id}" title="Open attached file">Open</button>
        <button type="button" class="note-file-remove" data-file-id="${file.id}" title="Remove file">×</button>
      </div>`
    )
    .join('');
}

async function runOrganizeForActiveNote() {
  if (!state.activeId || !editorOrganizeHintEl) return;
  const hint = editorOrganizeHintEl.value.trim();
  if (!hint) {
    if (editorOrganizeStatusEl) {
      editorOrganizeStatusEl.textContent = 'Add organization instructions first.';
    }
    return;
  }
  if (editorOrganizeBtn) editorOrganizeBtn.disabled = true;
  if (editorOrganizeStatusEl) editorOrganizeStatusEl.textContent = 'Organizing…';
  const result = await window.mvp.organizeNoteFromHint({
    noteId: state.activeId,
    noteText: editorTextEl.value,
    organizeHint: hint,
  });
  if (editorOrganizeBtn) editorOrganizeBtn.disabled = false;
  if (result.skipped) {
    if (editorOrganizeStatusEl) {
      editorOrganizeStatusEl.textContent =
        result.reason === 'no_api_key' ? 'Add API key (Engine menu) to organize.' : '';
    }
    return;
  }
  if (result.error) {
    if (editorOrganizeStatusEl) editorOrganizeStatusEl.textContent = result.error;
    return;
  }
  if (editorOrganizeStatusEl) {
    editorOrganizeStatusEl.textContent = result.reply || 'Organized.';
  }
  await loadFolders();
  await runQuery(queryInput.value.trim());
  if (state.activeId) await openNote(state.activeId);
}

async function flushActiveNote() {
  if (!state.activeId) return { ok: false };
  const value = editorTextEl.value.trim();
  const hint = editorOrganizeHintEl ? editorOrganizeHintEl.value.trim() : '';
  if (value) await window.mvp.updateNote(state.activeId, value);
  if (editorOrganizeHintEl) await window.mvp.setOrganizeHint(state.activeId, hint);
  await runQuery(queryInput.value.trim());
  return { ok: true, noteId: state.activeId };
}

window.__jotFlushActiveNote = () => flushActiveNote();

async function removeNoteById(id) {
  if (!Number.isFinite(id)) return;
  if (!confirm('Delete this note? This cannot be undone.')) return;
  const snap = [...state.notes];
  const idx = snap.findIndex((n) => n.id === id);
  const neighbor = idx >= 0 ? (snap[idx + 1] || snap[idx - 1]) : null;
  const ok = await window.mvp.deleteNote(id);
  if (!ok) return;
  if (state.activeId === id) {
    state.activeId = null;
    editorEl.classList.add('hidden');
    editorTextEl.value = '';
    linksEl.innerHTML = '';
  }
  state.selectedIds.delete(id);
  state.listFocusId = null;
  await runQuery(queryInput.value.trim());
  state.listFocusId =
    neighbor && state.notes.some((n) => n.id === neighbor.id) ? neighbor.id : (state.notes[0]?.id ?? null);
  renderResults();
  if (state.listFocusId != null) focusListRow(state.listFocusId);
  else queryInput.focus();
}

async function removeSelectedNotes() {
  const ids = [...state.selectedIds];
  if (ids.length === 0) return;
  if (!confirm(`Delete ${ids.length} selected note${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;

  const deletedCount = await window.mvp.deleteNotes(ids);
  if (!deletedCount) return;

  if (state.activeId != null && ids.includes(state.activeId)) {
    state.activeId = null;
    editorEl.classList.add('hidden');
    editorTextEl.value = '';
    linksEl.innerHTML = '';
  }

  state.selectedIds.clear();
  state.listFocusId = null;
  await runQuery(queryInput.value.trim());
  if (state.notes.length > 0) {
    state.listFocusId = state.notes[0].id;
    renderResults();
    focusListRow(state.listFocusId);
  } else {
    queryInput.focus();
  }
}

let cleanupStatusTimer = null;

function showCleanupStatus(text) {
  if (!cleanupStatusEl) return;
  cleanupStatusEl.textContent = text;
  cleanupStatusEl.classList.remove('cleanup-status--hidden');
  clearTimeout(cleanupStatusTimer);
  cleanupStatusTimer = setTimeout(() => {
    cleanupStatusEl.classList.add('cleanup-status--hidden');
    cleanupStatusEl.textContent = '';
  }, 16000);
}

cleanupNotesBtn?.addEventListener('click', async () => {
  const ok = confirm(
    'Run Clean DB?\n\n• Removes duplicate saves (same text and timestamp).\n• Merges notes whose text only differs by spacing or capital letters.\n• With an Anthropic API key, AI can merge overlapping ideas and reorganize folders (manual only — never automatic).',
  );
  if (!ok) return;
  cleanupNotesBtn.disabled = true;
  showCleanupStatus('Running Clean DB…');
  try {
    const res = await window.mvp.runNotesCleanup({ useAi: true });
    if (res.error) {
      showCleanupStatus(`Clean DB failed: ${res.error}`);
      return;
    }
    showCleanupStatus(res.summary || 'Clean DB finished.');
    if (state.activeId) {
      const note = await window.mvp.getNote(state.activeId);
      if (!note) closeEditor();
    }
    await runQuery(queryInput.value.trim());
  } catch (e) {
    showCleanupStatus(`Clean DB failed: ${e.message || String(e)}`);
  } finally {
    cleanupNotesBtn.disabled = false;
  }
});

queryInput.addEventListener('input', () => {
  runQuery(queryInput.value.trim());
});

importDbBtn?.addEventListener('click', async () => {
  await window.mvp.importDbFromPicker();
});

exportDbBtn?.addEventListener('click', async () => {
  await window.mvp.exportDbFromPicker();
});

queryInput.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === 'Enter' && state.listFocusId != null) {
    event.preventDefault();
    void openNote(state.listFocusId);
    return;
  }

  if (event.key === 'ArrowDown' && state.notes.length > 0) {
    event.preventDefault();
    if (state.listFocusId == null) state.listFocusId = state.notes[0].id;
    else {
      const i = state.notes.findIndex((n) => n.id === state.listFocusId);
      if (i >= 0 && i < state.notes.length - 1) state.listFocusId = state.notes[i + 1].id;
    }
    renderResults();
    focusListRow(state.listFocusId);
    return;
  }

  if (event.key === 'ArrowUp' && state.notes.length > 0) {
    if (state.listFocusId == null) return;
    event.preventDefault();
    const i = state.notes.findIndex((n) => n.id === state.listFocusId);
    if (i <= 0) {
      state.listFocusId = null;
      renderResults();
      const folderNodes = getFolderNavButtons();
      if (folderNodes.length) focusFolderNavButton(state.folderFilter);
    } else {
      state.listFocusId = state.notes[i - 1].id;
      renderResults();
      focusListRow(state.listFocusId);
    }
  }
});

resultsEl.addEventListener('change', (event) => {
  const checkbox = event.target.closest('.result-checkbox');
  if (!checkbox) return;
  const id = Number(checkbox.dataset.id);
  if (checkbox.checked) state.selectedIds.add(id);
  else state.selectedIds.delete(id);
  updateBulkActionsUi();
});

function clearNoteDragUi() {
  dragNoteId = null;
  resultsEl.querySelectorAll('.result-row.dragging, .result-row.drop-target').forEach((el) => {
    el.classList.remove('dragging', 'drop-target');
  });
}

resultsEl.addEventListener('dragstart', (event) => {
  if (event.target.closest('.result-select, .result-delete')) {
    event.preventDefault();
    return;
  }
  const row = event.target.closest('.result-row');
  if (!row) return;
  const id = Number(row.dataset.id);
  if (!Number.isFinite(id)) return;
  dragNoteId = id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(id));
  row.classList.add('dragging');
});

resultsEl.addEventListener('dragend', () => {
  clearNoteDragUi();
  suppressNoteRowClick = true;
  requestAnimationFrame(() => {
    suppressNoteRowClick = false;
  });
});

resultsEl.addEventListener('dragover', (event) => {
  const row = event.target.closest('.result-row');
  if (!row || dragNoteId == null) return;
  const targetId = Number(row.dataset.id);
  if (targetId === dragNoteId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  resultsEl.querySelectorAll('.result-row.drop-target').forEach((el) => {
    if (el !== row) el.classList.remove('drop-target');
  });
  row.classList.add('drop-target');
});

resultsEl.addEventListener('dragleave', (event) => {
  const row = event.target.closest('.result-row');
  if (!row) return;
  const related = event.relatedTarget;
  if (related && row.contains(related)) return;
  row.classList.remove('drop-target');
});

resultsEl.addEventListener('drop', (event) => {
  event.preventDefault();
  const row = event.target.closest('.result-row');
  if (!row || dragNoteId == null) return;
  const targetId = Number(row.dataset.id);
  row.classList.remove('drop-target');
  const sourceId = dragNoteId;
  clearNoteDragUi();
  if (targetId === sourceId) return;
  showGroupNotesFolderModal(sourceId, targetId);
});

resultsEl.addEventListener('click', (event) => {
  if (suppressNoteRowClick) return;
  const del = event.target.closest('.result-delete');
  if (del) {
    event.stopPropagation();
    void removeNoteById(Number(del.dataset.id));
    return;
  }
  const button = event.target.closest('.result');
  if (!button) return;
  openNote(Number(button.dataset.id));
});

resultsEl.addEventListener(
  'keydown',
  (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const row = event.target.closest('.result-row');
    if (!row) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const currentId = Number(row.dataset.id);
      const i = state.notes.findIndex((n) => n.id === currentId);
      if (i < 0) return;
      if (event.key === 'ArrowDown') {
        if (i < state.notes.length - 1) {
          state.listFocusId = state.notes[i + 1].id;
          renderResults();
          focusListRow(state.listFocusId);
        }
      } else if (i > 0) {
        state.listFocusId = state.notes[i - 1].id;
        renderResults();
        focusListRow(state.listFocusId);
      } else {
        state.listFocusId = null;
        renderResults();
        const folderNodes = getFolderNavButtons();
        if (folderNodes.length) focusFolderNavButton(state.folderFilter);
        else queryInput.focus();
      }
      return;
    }

    if (event.key === 'Enter') {
      const openId = Number(row.dataset.id);
      event.preventDefault();
      void openNote(openId);
      return;
    }
  },
  true
);

editorTextEl.addEventListener('input', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushActiveNote();
  }, 250);
});

editorOrganizeHintEl?.addEventListener('input', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushActiveNote();
  }, 250);
});

editorOrganizeBtn?.addEventListener('click', () => {
  void runOrganizeForActiveNote();
});

editorTextEl.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeEditor();
  }
});

closeEditorBtn.addEventListener('click', () => {
  closeEditor();
});

attachImageBtn.addEventListener('click', async () => {
  if (!state.activeId) return;
  await window.mvp.addNoteImagesFromPicker(state.activeId);
  await renderNoteImages();
});

attachFileBtn.addEventListener('click', async () => {
  if (!state.activeId) return;
  await window.mvp.addNoteFilesFromPicker(state.activeId);
  await renderNoteFiles();
});

copyBtn.addEventListener('click', async () => {
  await window.mvp.copyText(editorTextEl.value);
});

deleteSelectedBtn.addEventListener('click', () => {
  void removeSelectedNotes();
});

async function submitAppLink() {
  const appKey = await window.mvp.resolveAppKey(appSelect.value);
  if (!appKey || !state.activeId) return;
  const before = await window.mvp.getLinks(state.activeId);
  await window.mvp.addLink(state.activeId, appKey);
  const after = await window.mvp.getLinks(state.activeId);
  pushLinkHistoryEntry(state.activeId, before, after);
  appSelect.value = '';
  await renderLinks();
  appSelect.focus();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}

const NOTE_FILE_WHITELIST_EXTS = ['pdf', 'md', 'rmd', 'txt'];

function extFromFileName(fileName) {
  const rawExt = String(fileName || '').toLowerCase().replace(/^.*\./, '');
  if (!rawExt) return null;
  if (!NOTE_FILE_WHITELIST_EXTS.includes(rawExt)) return null;
  return rawExt;
}

linkBtn.addEventListener('click', () => {
  void submitAppLink();
});

appSelect.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.stopPropagation();
  void submitAppLink();
});

editorFolderSelect.addEventListener('change', async () => {
  if (!state.activeId) return;
  const nextFolder = editorFolderSelect.value || 'unfiled';
  if (nextFolder === EDITOR_NEW_FOLDER_VALUE) {
    restoreEditorFolderSelectFromActiveNote();
    showNewFolderModalFromEditor();
    return;
  }
  const updated = await window.mvp.setNoteFolder(state.activeId, nextFolder);
  if (!updated) {
    restoreEditorFolderSelectFromActiveNote();
    return;
  }
  await runQuery(queryInput.value.trim());
});

editorNewFolderBtn?.addEventListener('click', () => {
  showNewFolderModalFromEditor();
});

editorTextEl.addEventListener('paste', async (event) => {
  if (!state.activeId) return;
  const items = [...(event.clipboardData?.items || [])];

  const files = [];
  for (const item of items) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (!file) continue;
    files.push(file);
  }

  const imageFiles = files.filter((f) => String(f.type || '').startsWith('image/'));
  const noteFileFiles = files.filter((f) => extFromFileName(f.name));

  if (imageFiles.length === 0 && noteFileFiles.length === 0) return;

  event.preventDefault();

  for (const file of imageFiles) {
    const dataUrl = await fileToDataUrl(file);
    await window.mvp.addNoteImageFromDataUrl(state.activeId, dataUrl);
  }

  for (const file of noteFileFiles) {
    const fileExt = extFromFileName(file.name);
    if (!fileExt) continue;
    const dataUrl = await fileToDataUrl(file);
    await window.mvp.addNoteFileFromDataUrl(state.activeId, dataUrl, file.name || `pasted.${fileExt}`, fileExt);
  }

  await renderNoteImages();
  await renderNoteFiles();
});

linksEl.addEventListener('click', async (event) => {
  const chip = event.target.closest('.chip');
  if (!chip || !state.activeId) return;
  const appKey = chip.dataset.remove;
  const before = await window.mvp.getLinks(state.activeId);
  await window.mvp.removeLink(state.activeId, appKey);
  const after = await window.mvp.getLinks(state.activeId);
  pushLinkHistoryEntry(state.activeId, before, after);
  await renderLinks();
});

noteImagesEl.addEventListener('click', async (event) => {
  const removeBtn = event.target.closest('.note-image-remove');
  if (removeBtn) {
    if (!state.activeId) return;
    const imageId = Number(removeBtn.dataset.imageId);
    if (!Number.isFinite(imageId)) return;
    await window.mvp.removeNoteImage(state.activeId, imageId);
    await renderNoteImages();
    return;
  }

  const card = event.target.closest('.note-image-card');
  if (!card) return;
  const img = card.querySelector('img');
  if (!img || !img.getAttribute('src')) return;
  openImageLightbox(img.currentSrc || img.src, img.alt || 'Attachment');
});

noteImagesEl.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('.note-image-card');
  if (!card || event.target.closest('.note-image-remove')) return;
  event.preventDefault();
  const img = card.querySelector('img');
  if (!img || !img.getAttribute('src')) return;
  openImageLightbox(img.currentSrc || img.src, img.alt || 'Attachment');
});

if (imageLightboxEl && imageLightboxImg) {
  imageLightboxEl.addEventListener('click', (event) => {
    if (event.target === imageLightboxImg) return;
    closeImageLightbox();
  });
}

imageLightboxCloseBtn?.addEventListener('click', () => closeImageLightbox());

noteFilesEl.addEventListener('click', async (event) => {
  if (!state.activeId) return;

  const openBtn = event.target.closest('.note-file-open');
  if (openBtn) {
    const fileId = Number(openBtn.dataset.fileId);
    if (!Number.isFinite(fileId)) return;
    await window.mvp.openNoteFile(state.activeId, fileId);
    return;
  }

  const removeBtn = event.target.closest('.note-file-remove');
  if (removeBtn) {
    const fileId = Number(removeBtn.dataset.fileId);
    if (!Number.isFinite(fileId)) return;
    await window.mvp.removeNoteFile(state.activeId, fileId);
    await renderNoteFiles();
  }
});

async function refreshAiKeyStatus() {
  let line = 'API status unavailable';
  try {
    const status = await window.mvp.getAiKeyStatus();
    const hasKey = status && status.hasKey;
    line = hasKey ? 'Anthropic API key is saved on this Mac.' : 'No Anthropic API key yet — set one to enable AI auto-filing.';
  } catch (_error) {
    // leave line as 'API status unavailable'
  }
  if (aiKeyAccessStatusEl) aiKeyAccessStatusEl.textContent = line;
}

function showApiKeyModal() {
  if (!apiKeyModal || !apiKeyInput) return;
  apiKeyErrorEl?.classList.add('hidden');
  if (apiKeyErrorEl) apiKeyErrorEl.textContent = '';
  apiKeyInput.value = '';
  apiKeyModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    apiKeyInput.focus();
    apiKeyInput.select();
  });
}

function hideApiKeyModal() {
  apiKeyModal?.classList.add('hidden');
}

async function saveApiKeyFromModal() {
  if (!apiKeyInput) return;
  const trimmed = apiKeyInput.value.trim();
  if (!trimmed) {
    if (apiKeyErrorEl) {
      apiKeyErrorEl.textContent = 'Enter your API key.';
      apiKeyErrorEl.classList.remove('hidden');
    }
    return;
  }
  if (apiKeySaveBtn) apiKeySaveBtn.disabled = true;
  try {
    const result = await window.mvp.setAiKey(trimmed);
    if (!result || !result.ok) {
      if (apiKeyErrorEl) {
        apiKeyErrorEl.textContent = (result && result.error) || 'Failed to save API key.';
        apiKeyErrorEl.classList.remove('hidden');
      }
      return;
    }
    await refreshAiKeyStatus();
    hideApiKeyModal();
  } catch (e) {
    if (apiKeyErrorEl) {
      apiKeyErrorEl.textContent = e.message || String(e);
      apiKeyErrorEl.classList.remove('hidden');
    }
  } finally {
    if (apiKeySaveBtn) apiKeySaveBtn.disabled = false;
  }
}

document.addEventListener('keydown', (event) => {
  if (!isTypingTarget(event.target) && isUndoShortcut(event)) {
    event.preventDefault();
    void undoLinkChange();
    return;
  }

  if (!isTypingTarget(event.target) && isRedoShortcut(event)) {
    event.preventDefault();
    void redoLinkChange();
    return;
  }

  // Arrow key navigation through note list (prevent default scrolling).
  if (!isTypingTarget(event.target) && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // Folder tree uses its own capture handler; if focus is on a folder nav button, do not move the note list.
    if (event.target?.closest?.('#folder-diagram-tree .folder-node[data-folder-filter]')) return;
    // Let the dedicated `#results` keyboard handler run when we're already interacting with a row.
    if (event.target?.closest?.('#results')) return;
    if (state.notes.length > 0) {
      event.preventDefault();
      if (event.key === 'ArrowDown') {
        if (state.listFocusId == null) state.listFocusId = state.notes[0].id;
        else {
          const i = state.notes.findIndex((n) => n.id === state.listFocusId);
          if (i >= 0 && i < state.notes.length - 1) state.listFocusId = state.notes[i + 1].id;
        }
        renderResults();
        focusListRow(state.listFocusId);
      } else if (event.key === 'ArrowUp') {
        if (state.listFocusId == null) return;
        const i = state.notes.findIndex((n) => n.id === state.listFocusId);
        if (i <= 0) {
          state.listFocusId = null;
          renderResults();
          const folderNodes = getFolderNavButtons();
          if (folderNodes.length) focusFolderNavButton(state.folderFilter);
          else queryInput.focus();
        } else {
          state.listFocusId = state.notes[i - 1].id;
          renderResults();
          focusListRow(state.listFocusId);
        }
      }
      return;
    }
  }

  if (event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    void startComposeNote();
    return;
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && state.listFocusId != null) {
    if (event.target === editorTextEl || event.target === queryInput) return;
    if (event.target === appSelect) return;
    if (event.target.closest?.('#links')) return;
    if (event.target.closest?.('.editor-actions')) return;
    if (event.target.closest?.('.bulk-actions')) return;
    if (event.target.closest?.('.result-select')) return;
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    event.preventDefault();
    void removeNoteById(state.listFocusId);
    return;
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedIds.size > 1) {
    if (event.target === editorTextEl || event.target === queryInput) return;
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    void removeSelectedNotes();
    return;
  }

  if (event.key === 'Escape') {
    if (newFolderModal && !newFolderModal.classList.contains('hidden')) {
      event.preventDefault();
      hideNewFolderModal();
      return;
    }
    if (apiKeyModal && !apiKeyModal.classList.contains('hidden')) {
      event.preventDefault();
      hideApiKeyModal();
      return;
    }
    if (imageLightboxEl && !imageLightboxEl.classList.contains('hidden')) {
      event.preventDefault();
      closeImageLightbox();
      return;
    }
    if (state.activeId != null && editorEl && !editorEl.classList.contains('hidden')) {
      event.preventDefault();
      closeEditor();
      return;
    }
    event.preventDefault();
    window.mvp.hideSearch();
    return;
  }
});

aiKeyAccessBtn?.addEventListener('click', () => {
  showApiKeyModal();
});

apiKeyCancelBtn?.addEventListener('click', () => {
  hideApiKeyModal();
});

apiKeySaveBtn?.addEventListener('click', () => {
  void saveApiKeyFromModal();
});

apiKeyInput?.addEventListener('keydown', (event) => {
  const isPasteShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'v';
  if (isPasteShortcut) {
    event.preventDefault();
    void (async () => {
      const clip = await window.mvp.readClipboardText();
      if (!clip) return;
      apiKeyInput.value = String(clip);
    })();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    void saveApiKeyFromModal();
  }
});

apiKeyModal?.addEventListener('click', (event) => {
  if (event.target === apiKeyModal) hideApiKeyModal();
});

anthropicKeyLink?.addEventListener('click', (event) => {
  event.preventDefault();
  void window.mvp.openExternalUrl('https://console.anthropic.com/settings/keys');
});

window.mvp.onSearchFocus(async (payload) => {
  await runQuery(queryInput.value.trim());
  if (payload && payload.composeDraft != null) {
    const draftText = String(payload.composeDraft || '').trim();
    const note = draftText ? await window.mvp.createNote(draftText) : await window.mvp.createNote('');
    if (!note?.id) return;
    await runQuery(queryInput.value.trim());
    await openNote(note.id);
    if (editorOrganizeHintEl && payload.organizeHint) {
      editorOrganizeHintEl.value = String(payload.organizeHint);
      await window.mvp.setOrganizeHint(note.id, payload.organizeHint);
    }
    if (payload.appKey) await window.mvp.addLink(note.id, payload.appKey);
    return;
  }
  if (payload && payload.compose) {
    await startComposeNote();
    return;
  }
  if (state.activeId) {
    await openNote(state.activeId);
    return;
  }
  queryInput.focus();
  queryInput.select();
  if (payload && payload.openNoteId) await openNote(Number(payload.openNoteId));
});

window.mvp.onNotesChanged(() => {
  void loadFolders();
  void runQuery(queryInput.value.trim());
  if (state.activeId != null) {
    void renderLinks();
    void renderNoteImages();
  }
});

window.mvp.onOpenAiKeyModal(() => {
  showApiKeyModal();
});

async function init() {
  await loadApps();
  await loadFolders();
  await runQuery('');
  await refreshAiKeyStatus();
}

init().catch((error) => {
  resultsEl.innerHTML = `<div class="empty">Failed to load: ${escapeHtml(error.message || String(error))}</div>`;
});

// ── Phase 3: Tabs + engine status + Rewind + Ask ──────────────────────────

// ── Main tab navigation: Notes | Recordings ──────────────────────────────
const notesPanel = document.getElementById('notes-panel');
const recordingsPanel = document.getElementById('recordings-panel');
const pakrPanel = document.getElementById('pakr-panel');

function switchTab(name) {
  const isNotes = name === 'notes';
  const isRecordings = name === 'recordings';
  const isPakr = name === 'pakr';

  notesPanel.classList.toggle('hidden', !isNotes);
  recordingsPanel.classList.toggle('hidden', !isRecordings);
  if (pakrPanel) pakrPanel.classList.toggle('hidden', !isPakr);

  document.querySelectorAll('.tab[data-tab]').forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  if (isNotes) {
    queryInput.focus();
  } else if (isRecordings) {
    void syncRecordingsOfflineState();
    document.getElementById('rec-query')?.focus();
  } else if (isPakr) {
    document.getElementById('pakr-input')?.focus();
  }
}

document.querySelectorAll('.tab[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ⌘⇧P shortcut from main process
window.mvp.onSwitchTab((tab) => switchTab(tab));

// ── Pakr agent ────────────────────────────────────────────────────────────────

let pakrHistory = [];
let pakrPending = null; // { confirmRequired: true, summary: string, message: string }

const pakrChatEl = document.getElementById('pakr-chat');
const pakrEmptyEl = document.getElementById('pakr-empty');
const pakrInputEl = document.getElementById('pakr-input');
const pakrSendBtn = document.getElementById('pakr-send-btn');
const pakrConfirmRow = document.getElementById('pakr-confirm-row');
const pakrConfirmSummary = document.getElementById('pakr-confirm-summary');
const pakrConfirmBtn = document.getElementById('pakr-confirm-btn');
const pakrCancelBtn = document.getElementById('pakr-cancel-btn');

function appendPakrMsg(role, text, isThinking = false) {
  if (pakrEmptyEl) pakrEmptyEl.style.display = 'none';
  const div = document.createElement('div');
  div.className = isThinking
    ? 'pakr-msg pakr-msg-thinking'
    : role === 'user'
      ? 'pakr-msg pakr-msg-user'
      : 'pakr-msg pakr-msg-assistant';
  div.textContent = text;
  if (pakrChatEl) {
    pakrChatEl.appendChild(div);
    pakrChatEl.scrollTop = pakrChatEl.scrollHeight;
  }
  return div;
}

function setPakrConfirmRow(pending) {
  pakrPending = pending;
  if (!pakrConfirmRow) return;
  if (pending) {
    pakrConfirmRow.classList.remove('hidden');
    if (pakrConfirmSummary) pakrConfirmSummary.textContent = pending.summary || 'Confirm operation?';
  } else {
    pakrConfirmRow.classList.add('hidden');
  }
}

async function sendPakrMessage(message) {
  const text = String(message || '').trim();
  if (!text) return;
  setPakrConfirmRow(null);
  appendPakrMsg('user', text);
  if (pakrInputEl) pakrInputEl.value = '';
  if (pakrSendBtn) pakrSendBtn.disabled = true;
  const thinking = appendPakrMsg('assistant', 'Thinking…', true);
  try {
    const result = await window.mvp.pakraChat({ history: pakrHistory, message: text });
    if (thinking && thinking.parentNode) thinking.remove();
    if (result && result.reply) {
      appendPakrMsg('assistant', result.reply);
    }
    if (result && result.history) pakrHistory = result.history;
    if (result && result.confirmRequired) {
      setPakrConfirmRow({ ...result.confirmRequired, message: text });
    }
  } catch (err) {
    if (thinking && thinking.parentNode) thinking.remove();
    appendPakrMsg('assistant', `Error: ${err.message || String(err)}`);
  } finally {
    if (pakrSendBtn) pakrSendBtn.disabled = false;
    if (pakrInputEl) pakrInputEl.focus();
  }
}

pakrSendBtn?.addEventListener('click', () => {
  void sendPakrMessage(pakrInputEl?.value || '');
});

pakrInputEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void sendPakrMessage(pakrInputEl.value);
  }
});

pakrConfirmBtn?.addEventListener('click', () => {
  if (!pakrPending) return;
  const confirmMessage = `Confirmed. Please proceed with: ${pakrPending.summary}`;
  setPakrConfirmRow(null);
  void sendPakrMessage(confirmMessage);
});

pakrCancelBtn?.addEventListener('click', () => {
  setPakrConfirmRow(null);
  appendPakrMsg('assistant', 'Operation cancelled.');
});

document.querySelectorAll('#unified-type-chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#unified-type-chips .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    unifiedSearchScope = chip.dataset.scope || 'all';
    updateUnifiedScopeChrome();
    void runQuery(queryInput.value.trim());
  });
});

// Engine status badge + recording toggle
const engineToggleBtn = document.getElementById('engine-toggle');
const engineDotEl = document.getElementById('engine-dot');
const engineLabelEl = document.getElementById('engine-label');
let engineToggleBusy = false;

function setEngineStatus(state) {
  const classes = ['recording', 'connected', 'offline', 'paused', 'starting'];
  classes.forEach((c) => engineDotEl.classList.toggle(c, c === state));
  const labels = {
    recording: 'recording',
    connected: 'connected',
    paused: 'paused',
    starting: 'starting…',
    offline: 'offline',
  };
  engineLabelEl.textContent = labels[state] || 'offline';
  if (engineToggleBtn) {
    engineToggleBtn.title =
      state === 'offline'
        ? 'Engine offline — click to retry'
        : state === 'paused'
          ? 'Recording paused — click to resume'
          : 'Recording on — click to pause';
  }
}

async function pollEngineState() {
  try {
    const { state } = await window.mvp.screenpipeEngineState();
    const normalized =
      state === 'recording' || state === 'connected' || state === 'paused' || state === 'starting'
        ? state
        : 'offline';
    setEngineStatus(normalized);
    if (!recordingsPanel.classList.contains('hidden')) {
      const offlineEl = document.getElementById('rec-offline');
      const searchPane = document.getElementById('rec-search-pane');
      const askPane = document.getElementById('rec-ask-pane');
      const modeBar = document.querySelector('.recordings-modes');
      const offline = normalized === 'offline';
      if (offlineEl) offlineEl.classList.toggle('hidden', !offline);
      if (searchPane) searchPane.classList.toggle('hidden', offline || recActiveMode !== 'search');
      if (askPane) askPane.classList.toggle('hidden', offline || recActiveMode !== 'ask');
      if (modeBar) modeBar.classList.toggle('hidden', offline);
    }
  } catch {
    setEngineStatus('offline');
  }
}

engineToggleBtn?.addEventListener('click', () => {
  if (engineToggleBusy) return;
  engineToggleBusy = true;
  engineToggleBtn.disabled = true;
  void window.mvp
    .toggleScreenpipeCapture()
    .then(() => pollEngineState())
    .catch(() => setEngineStatus('offline'))
    .finally(() => {
      engineToggleBusy = false;
      engineToggleBtn.disabled = false;
    });
});

window.mvp.onEngineStateChanged?.(() => {
  void pollEngineState();
});

void pollEngineState();
setInterval(pollEngineState, 12_000);

if (window.mvp.onRecallManualResult) {
  window.mvp.onRecallManualResult((decision) => {
    if (!decision || !decision.available) {
      showCleanupStatus('Manual recall: engine unavailable.');
      return;
    }
    if (decision.action === 'surface' && decision.candidate) return;
    const reason = decision.reason_primary || decision.action || 'silence';
    showCleanupStatus(
      reason === 'no_candidates'
        ? 'Manual recall (⌘⇧R): nothing matched yet — browse with distinct window titles, then try again.'
        : `Manual recall (⌘⇧R): ${reason}.`
    );
  });
}

// ── Recordings panel — Search + Ask over screen history ──────────────────

let recActiveType = 'all';
let recActiveMode = 'search';

function syncRecordingsOfflineState() {
  return window.mvp.screenpipeEngineState().then(({ state }) => {
    const offline = state === 'offline' || !state;
    const offlineEl = document.getElementById('rec-offline');
    const searchPane = document.getElementById('rec-search-pane');
    const askPane = document.getElementById('rec-ask-pane');
    const modeBar = document.querySelector('.recordings-modes');
    if (offlineEl) offlineEl.classList.toggle('hidden', !offline);
    if (searchPane) searchPane.classList.toggle('hidden', offline || recActiveMode !== 'search');
    if (askPane) askPane.classList.toggle('hidden', offline || recActiveMode !== 'ask');
    if (modeBar) modeBar.classList.toggle('hidden', offline);
  }).catch(() => {
    document.getElementById('rec-offline')?.classList.remove('hidden');
    document.getElementById('rec-search-pane')?.classList.add('hidden');
    document.getElementById('rec-ask-pane')?.classList.add('hidden');
  });
}

function switchRecMode(mode) {
  recActiveMode = mode;
  document.querySelectorAll('.rec-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('rec-search-pane').classList.toggle('hidden', mode !== 'search');
  document.getElementById('rec-ask-pane').classList.toggle('hidden', mode !== 'ask');
  if (mode === 'search') document.getElementById('rec-query')?.focus();
  else document.getElementById('rec-ask-query')?.focus();
}

document.querySelectorAll('.rec-mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchRecMode(btn.dataset.mode));
});

document.querySelectorAll('#rec-type-chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#rec-type-chips .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    recActiveType = chip.dataset.type;
  });
});

function formatTimestamp(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(ts).slice(0, 16); }
}

function buildCaptureCard({ badgeClass, badgeLabel, appName, timestamp, snippet }) {
  const card = document.createElement('div');
  card.className = 'capture-card';
  card.setAttribute('role', 'listitem');
  card.innerHTML = `
    <div class="capture-card-header">
      <span class="source-badge ${escapeHtml(badgeClass)}">${escapeHtml(badgeLabel)}</span>
      <span class="capture-card-app">${escapeHtml(appName || '')}</span>
      <span class="capture-card-time">${escapeHtml(timestamp)}</span>
    </div>
    <div class="capture-card-snippet">${escapeHtml((snippet || '').slice(0, 400))}</div>
  `;
  return card;
}

function renderCaptureResult(item) {
  const type = String(item.type || '').toLowerCase();
  const c = item.content || {};
  if (type === 'ocr' || type === 'ui' || type === 'accessibility') {
    return buildCaptureCard({
      badgeClass: 'screen',
      badgeLabel: 'Screen',
      appName: c.app_name || c.app || '',
      timestamp: formatTimestamp(c.timestamp),
      snippet: c.text || c.content || '',
    });
  }
  if (type === 'audio') {
    return buildCaptureCard({
      badgeClass: 'audio',
      badgeLabel: 'Audio',
      appName: c.speaker ? `Speaker: ${c.speaker.name || 'unknown'}` : '',
      timestamp: formatTimestamp(c.timestamp),
      snippet: c.transcription || '',
    });
  }
  return buildCaptureCard({
    badgeClass: 'screen',
    badgeLabel: type || 'Capture',
    appName: c.app_name || '',
    timestamp: formatTimestamp(c.timestamp),
    snippet: c.text || c.transcription || JSON.stringify(c).slice(0, 200),
  });
}

async function runRecordingsSearch() {
  const statusEl = document.getElementById('rec-search-status');
  const resultsEl = document.getElementById('rec-search-results');
  const q = document.getElementById('rec-query').value.trim();
  const startTime = document.getElementById('rec-time-range').value;
  const appName = document.getElementById('rec-app-filter').value.trim();

  statusEl.textContent = 'Searching…';
  resultsEl.innerHTML = '';

  const params = { q, start_time: startTime, content_type: recActiveType, limit: 20 };
  if (appName) params.app_name = appName;

  const result = await window.mvp.screenpipeSearch(params);

  if (!result.ok) {
    const engineOffline =
      result.error === 'screenpipe client not loaded' ||
      result.error?.includes('ECONNREFUSED') ||
      result.error?.includes('timeout');
    statusEl.textContent = engineOffline
      ? 'Recording engine is offline — start it from the status button above.'
      : `Search error: ${result.error}`;
    if (engineOffline) void syncRecordingsOfflineState();
    return;
  }

  const items = result.data || [];
  statusEl.textContent = items.length === 0
    ? (q ? 'No results for that query.' : 'No recordings yet.')
    : `${items.length} result${items.length === 1 ? '' : 's'}`;
  items.forEach((item) => resultsEl.appendChild(renderCaptureResult(item)));
}

document.getElementById('rec-search-btn').addEventListener('click', () => void runRecordingsSearch());
document.getElementById('rec-query').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void runRecordingsSearch();
});

// ── Recordings Ask — NL query over screen memories + OCR captures ─────────

function buildAskResultCard({ badgeLabel, badgeClass, snippet, timestamp, appName, source }) {
  const card = document.createElement('div');
  card.className = 'capture-card';
  card.setAttribute('role', 'listitem');
  const citationParts = [];
  if (appName) citationParts.push(`<span class="rec-citation-app">${escapeHtml(appName)}</span>`);
  if (timestamp) citationParts.push(`<span>${escapeHtml(timestamp)}</span>`);
  if (source) citationParts.push(`<span>${escapeHtml(source)}</span>`);
  const citation = citationParts.length
    ? `<div class="rec-citation">${citationParts.join(' · ')}</div>`
    : '';
  card.innerHTML = `
    <div class="capture-card-header">
      <span class="source-badge ${escapeHtml(badgeClass)}">${escapeHtml(badgeLabel)}</span>
    </div>
    <div class="capture-card-snippet">${escapeHtml((snippet || '').slice(0, 400))}</div>
    ${citation}
  `;
  return card;
}

async function runRecordingsAsk() {
  const statusEl = document.getElementById('rec-ask-status');
  const resultsEl = document.getElementById('rec-ask-results');
  const q = document.getElementById('rec-ask-query').value.trim();

  if (!q) return;

  statusEl.textContent = 'Searching…';
  resultsEl.innerHTML = '';

  const [noteResult, memResult, captureResult] = await Promise.all([
    window.mvp.queryNotes(q, null),
    window.mvp.screenpipeMemories({ q, limit: 8 }),
    window.mvp.screenpipeSearch({ q, start_time: '7d ago', limit: 8 }),
  ]);

  const cards = [];

  const notes = Array.isArray(noteResult) ? noteResult : [];
  notes.slice(0, 4).forEach((note) => {
    cards.push(buildAskResultCard({
      badgeLabel: 'Note',
      badgeClass: 'note',
      snippet: note.text || '',
      timestamp: note.created_at ? formatTimestamp(note.created_at) : '',
      appName: '',
      source: '',
    }));
  });

  if (memResult.ok) {
    (memResult.data || []).slice(0, 4).forEach((mem) => {
      cards.push(buildAskResultCard({
        badgeLabel: 'Memory',
        badgeClass: 'memory',
        snippet: mem.content || '',
        timestamp: mem.created_at ? formatTimestamp(mem.created_at) : '',
        appName: mem.source || '',
        source: '',
      }));
    });
  }

  if (captureResult.ok) {
    (captureResult.data || []).slice(0, 4).forEach((item) => {
      const c = item.content || {};
      const type = String(item.type || '').toLowerCase();
      const isScreen = type === 'ocr' || type === 'ui' || type === 'accessibility';
      cards.push(buildAskResultCard({
        badgeLabel: isScreen ? 'Screen' : (type === 'audio' ? 'Audio' : 'Capture'),
        badgeClass: isScreen ? 'screen' : 'audio',
        snippet: c.text || c.content || c.transcription || '',
        timestamp: c.timestamp ? formatTimestamp(c.timestamp) : '',
        appName: c.app_name || c.app || '',
        source: 'recording',
      }));
    });
  }

  if (cards.length === 0) {
    statusEl.textContent = 'No results found. Try a different question.';
    return;
  }

  const noteCount = notes.slice(0, 4).length;
  const memCount = memResult.ok ? (memResult.data || []).slice(0, 4).length : 0;
  const capCount = captureResult.ok ? (captureResult.data || []).slice(0, 4).length : 0;
  const parts = [];
  if (noteCount) parts.push(`${noteCount} note${noteCount > 1 ? 's' : ''}`);
  if (memCount) parts.push(`${memCount} memor${memCount > 1 ? 'ies' : 'y'}`);
  if (capCount) parts.push(`${capCount} recording${capCount > 1 ? 's' : ''}`);
  statusEl.textContent = `${cards.length} result${cards.length > 1 ? 's' : ''} — ${parts.join(', ')}`;

  cards.forEach((card) => resultsEl.appendChild(card));
}

document.getElementById('rec-ask-btn').addEventListener('click', () => void runRecordingsAsk());
document.getElementById('rec-ask-query').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void runRecordingsAsk();
});
