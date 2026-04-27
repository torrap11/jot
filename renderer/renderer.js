'use strict';

const state = {
  notes: [],
  activeId: null,
  /** Note id highlighted for ↑↓ / Delete (may match activeId when a note is open). */
  listFocusId: null,
  selectedIds: new Set(),
  apps: [],
};

const queryInput = document.getElementById('query');
const bulkActionsEl = document.getElementById('bulk-actions');
const selectedCountEl = document.getElementById('selected-count');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const resultsEl = document.getElementById('results');
const editorEl = document.getElementById('editor');
const editorDateEl = document.getElementById('editor-date');
const editorTextEl = document.getElementById('editor-text');
const copyBtn = document.getElementById('copy-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const appSelect = document.getElementById('app-select');
const linkBtn = document.getElementById('link-btn');
const linksEl = document.getElementById('links');

let saveTimer = null;

function focusListRow(noteId) {
  if (noteId == null) return;
  requestAnimationFrame(() => {
    const btn = resultsEl.querySelector(`.result[data-id="${noteId}"]`);
    btn?.focus();
  });
}

function updateBulkActionsUi() {
  const count = state.selectedIds.size;
  selectedCountEl.textContent = `${count} selected`;
  bulkActionsEl.classList.toggle('hidden', count === 0);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadApps() {
  state.apps = await window.mvp.listApps();
}

function labelForAppKey(bundleId) {
  const hit = state.apps.find((a) => a.bundleId === bundleId);
  return hit ? hit.name : bundleId;
}

async function runQuery(text) {
  state.notes = text ? await window.mvp.queryNotes(text) : await window.mvp.recentNotes();
  const validIds = new Set(state.notes.map((n) => n.id));
  state.selectedIds = new Set([...state.selectedIds].filter((id) => validIds.has(id)));
  if (state.listFocusId != null && !state.notes.some((n) => n.id === state.listFocusId)) {
    state.listFocusId = state.notes[0]?.id ?? null;
  }
  renderResults();
  updateBulkActionsUi();
}

function renderResults() {
  if (state.notes.length === 0) {
    resultsEl.innerHTML = '<div class="empty">No notes found.</div>';
    return;
  }
  resultsEl.innerHTML = state.notes
    .map((note) => {
      const preview = note.text.split('\n')[0].slice(0, 120);
      const active = note.id === state.activeId ? ' active' : '';
      const listFocus = note.id === state.listFocusId ? ' list-focus' : '';
      const selected = state.selectedIds.has(note.id) ? ' checked' : '';
      const tab = note.id === state.listFocusId ? '0' : '-1';
      return `<div class="result-row${active}${listFocus}" data-id="${note.id}">
        <label class="result-select" title="Select note">
          <input type="checkbox" class="result-checkbox" data-id="${note.id}"${selected} />
        </label>
        <button type="button" class="result" data-id="${note.id}" tabindex="${tab}">
          <span class="result-text">${escapeHtml(preview)}</span>
          <span class="result-date">${escapeHtml(formatDate(note.created_at))}</span>
        </button>
        <button type="button" class="result-delete" data-id="${note.id}" title="Delete note">×</button>
      </div>`;
    })
    .join('');
}

async function openNote(noteId) {
  const note = await window.mvp.getNote(noteId);
  if (!note) return;
  state.activeId = note.id;
  state.listFocusId = note.id;
  editorEl.classList.remove('hidden');
  editorDateEl.textContent = formatDate(note.created_at);
  editorTextEl.value = note.text;
  renderResults();
  await renderLinks();
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

async function saveActiveNote() {
  if (!state.activeId) return;
  const value = editorTextEl.value.trim();
  if (!value) return;
  await window.mvp.updateNote(state.activeId, value);
  await runQuery(queryInput.value.trim());
}

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

queryInput.addEventListener('input', () => {
  runQuery(queryInput.value.trim());
});

queryInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.mvp.hideSearch();
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

resultsEl.addEventListener('click', (event) => {
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
        queryInput.focus();
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
    saveActiveNote();
  }, 250);
});

editorTextEl.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.mvp.hideSearch();
});

copyBtn.addEventListener('click', async () => {
  await window.mvp.copyText(editorTextEl.value);
});

deleteNoteBtn.addEventListener('click', () => {
  if (!state.activeId) return;
  void removeNoteById(state.activeId);
});

deleteSelectedBtn.addEventListener('click', () => {
  void removeSelectedNotes();
});

async function submitAppLink() {
  const appKey = await window.mvp.resolveAppKey(appSelect.value);
  if (!appKey || !state.activeId) return;
  await window.mvp.addLink(state.activeId, appKey);
  appSelect.value = '';
  await renderLinks();
}

linkBtn.addEventListener('click', () => {
  void submitAppLink();
});

appSelect.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  void submitAppLink();
});

linksEl.addEventListener('click', async (event) => {
  const chip = event.target.closest('.chip');
  if (!chip || !state.activeId) return;
  const appKey = chip.dataset.remove;
  await window.mvp.removeLink(state.activeId, appKey);
  await renderLinks();
});

document.addEventListener('keydown', (event) => {
  if (event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    window.mvp.openCapture();
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
    event.preventDefault();
    window.mvp.hideSearch();
  }
});

window.mvp.onSearchFocus(async (payload) => {
  await runQuery(queryInput.value.trim());
  queryInput.focus();
  queryInput.select();
  if (payload && payload.openNoteId) await openNote(Number(payload.openNoteId));
});

window.mvp.onNotesChanged(() => {
  void runQuery(queryInput.value.trim());
  if (state.activeId != null) void renderLinks();
});

async function init() {
  await loadApps();
  await runQuery('');
}

init().catch((error) => {
  resultsEl.innerHTML = `<div class="empty">Failed to load: ${escapeHtml(error.message || String(error))}</div>`;
});
