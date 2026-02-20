const noteList = document.getElementById('note-list');
const editor = document.getElementById('editor');
const contentEl = document.getElementById('content');
const imageDisplay = document.getElementById('image-display');
const newBtn = document.getElementById('new-btn');
const imageBtn = document.getElementById('image-btn');
const backBtn = document.getElementById('back-btn');
const deleteBtn = document.getElementById('delete-btn');
const agentPanel = document.getElementById('agent-panel');
const agentMessages = document.getElementById('agent-messages');
const agentInput = document.getElementById('agent-input');
const agentSendBtn = document.getElementById('agent-send-btn');
const folderBar = document.getElementById('folder-bar');
const newFolderBtn = document.getElementById('new-folder-btn');
const newFolderInput = document.getElementById('new-folder-input');
const folderMove = document.getElementById('folder-move');
const folderBtn = document.getElementById('folder-btn');
const folderOrganizeView = document.getElementById('folder-organize-view');
const folderOrganizeFilter = document.getElementById('folder-organize-filter');
const folderOrganizeContent = document.getElementById('folder-organize-content');
const folderOrganizeNewInput = document.getElementById('folder-organize-new-input');
const folderOrganizeDescInput = document.getElementById('folder-organize-desc-input');
const folderOrganizeNewBtn = document.getElementById('folder-organize-new-btn');

function isImageNote(note) {
  return note && note.content && note.content.startsWith('data:image/');
}

let currentNote = null;
let saveTimeout = null;
let notes = [];
let selectedIndex = 0;
let deletedNotesStack = [];
let agentPanelOpen = false;
let folders = [];
let currentFolderFilter = 'all'; // 'all' | null (unfiled) | number (folder id)
let folderOrganizeOpen = false;

async function loadNotes(selectNoteId = null) {
  notes = currentFolderFilter === 'all'
    ? await window.api.getNotes()
    : await window.api.getNotesByFolder(currentFolderFilter);
  noteList.innerHTML = '';

  if (notes.length === 0) {
    noteList.innerHTML = '<div class="empty-state">Press + to create a note</div>';
    selectedIndex = -1;
    return;
  }

  if (selectNoteId !== null) {
    const idx = notes.findIndex((n) => n.id === selectNoteId);
    selectedIndex = idx >= 0 ? idx : 0;
  } else {
    selectedIndex = Math.min(selectedIndex, notes.length - 1);
    if (selectedIndex < 0) selectedIndex = 0;
  }

  notes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note-item' + (index === selectedIndex ? ' selected' : '');
    div.dataset.index = index;

    const date = new Date(note.updated_at + 'Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isImageNote(note)) {
      div.innerHTML = `
        <div class="note-preview note-preview-image">
          <img src="${note.content}" alt="Image" />
        </div>
        <div class="note-date">${date}</div>
      `;
    } else {
      const preview = note.content.trim() || 'Empty note';
      const firstLine = preview.split('\n')[0].substring(0, 50);
      div.innerHTML = `
        <div class="note-preview">${escapeHtml(firstLine)}</div>
        <div class="note-date">${date}</div>
      `;
    }

    div.addEventListener('click', () => {
      selectedIndex = index;
      openNote(note);
    });
    noteList.appendChild(div);
  });

  const selectedEl = noteList.querySelector('.note-item.selected');
  if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function isListVisible() {
  return editor.classList.contains('hidden');
}

function updateSelectionHighlight() {
  const items = noteList.querySelectorAll('.note-item');
  items.forEach((div, i) => {
    div.classList.toggle('selected', i === selectedIndex);
  });
  const selected = items[selectedIndex];
  if (selected) selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openNote(note) {
  currentNote = note;
  if (isImageNote(note)) {
    contentEl.classList.add('hidden');
    contentEl.value = '';
    imageDisplay.classList.remove('hidden');
    imageDisplay.innerHTML = `<img src="${note.content}" alt="Image" />`;
  } else {
    contentEl.classList.remove('hidden');
    contentEl.value = note.content;
    imageDisplay.classList.add('hidden');
    imageDisplay.innerHTML = '';
  }
  noteList.classList.add('hidden');
  editor.classList.remove('hidden');
  if (!isImageNote(note)) {
    requestAnimationFrame(() => contentEl.focus());
  }
  updateFolderMoveSelector();
}

async function showList() {
  let noteIdToSelect = currentNote?.id ?? null;
  if (currentNote) {
    if (isImageNote(currentNote)) {
      // Image notes have no editable content, nothing to save
    } else if (contentEl.value.trim() === '') {
      await window.api.deleteNote(currentNote.id);
      noteIdToSelect = null; // Don't try to select deleted note
    } else {
      autoSave();
    }
  }
  currentNote = null;
  contentEl.classList.remove('hidden');
  imageDisplay.classList.add('hidden');
  imageDisplay.innerHTML = '';
  editor.classList.add('hidden');
  noteList.classList.remove('hidden');
  noteList.style.display = '';
  await loadNotes(noteIdToSelect);
}

function autoSave() {
  if (currentNote && !isImageNote(currentNote) && contentEl.value !== currentNote.content) {
    window.api.updateNote(currentNote.id, contentEl.value);
    currentNote.content = contentEl.value;
  }
}

newBtn.addEventListener('click', async () => {
  const note = await window.api.createNote('');
  openNote(note);
});

imageBtn.addEventListener('click', async () => {
  if (currentNote && currentNote.content.trim() === '') {
    await window.api.deleteNote(currentNote.id);
  }
  const note = await window.api.createNoteFromImage();
  if (note) openNote(note);
});

backBtn.addEventListener('click', showList);

deleteBtn.addEventListener('click', async () => {
  if (currentNote) {
    deletedNotesStack.push({ ...currentNote });
    await window.api.deleteNote(currentNote.id);
    currentNote = null;
    showList();
  }
});

contentEl.addEventListener('input', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(autoSave, 500);
});

window.addEventListener('blur', autoSave);

document.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      if (currentNote && isImageNote(currentNote)) {
        await window.api.updateNote(currentNote.id, dataUrl);
        currentNote.content = dataUrl;
        imageDisplay.innerHTML = `<img src="${dataUrl}" alt="Image" />`;
      } else {
        if (currentNote && currentNote.content.trim() === '') {
          await window.api.deleteNote(currentNote.id);
        } else {
          autoSave();
        }
        const note = await window.api.createNote(dataUrl);
        openNote(note);
      }
      return;
    }
  }
});

document.addEventListener('keydown', async (e) => {
  const inList = isListVisible();

  if (inList && notes.length > 0) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      updateSelectionHighlight();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(notes.length - 1, selectedIndex + 1);
      updateSelectionHighlight();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      openNote(notes[selectedIndex]);
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const note = notes[selectedIndex];
      deletedNotesStack.push({ ...note });
      await window.api.deleteNote(note.id);
      notes = notes.filter((n) => n.id !== note.id);
      selectedIndex = Math.min(selectedIndex, notes.length - 1);
      if (notes.length === 0) selectedIndex = -1;
      await loadNotes();
      return;
    }
  }

  if (e.metaKey && e.key === 'z') {
    e.preventDefault();
    if (deletedNotesStack.length > 0) {
      const note = deletedNotesStack.pop();
      await window.api.restoreNote(note);
      await loadNotes();
      selectedIndex = notes.findIndex((n) => n.id === note.id);
      if (selectedIndex < 0) selectedIndex = notes.length - 1;
      updateSelectionHighlight();
    }
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    if (agentPanelOpen) {
      toggleAgentPanel();
    } else if (folderOrganizeOpen) {
      closeFolderOrganizeView();
    } else if (currentNote) {
      await showList();
    }
    return;
  }

  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    const filterList = ['all', null, ...folders.map((f) => f.id)];
    const idx = filterList.findIndex(
      (f) =>
        (f === 'all' && currentFolderFilter === 'all') ||
        (f === null && currentFolderFilter === null) ||
        (typeof f === 'number' && currentFolderFilter === f)
    );
    if (idx < 0) return;
    const nextIdx = e.shiftKey
      ? (idx - 1 + filterList.length) % filterList.length
      : (idx + 1) % filterList.length;
    currentFolderFilter = filterList[nextIdx];
    renderFolderBar();
    if (folderOrganizeOpen) {
      renderFolderOrganizeJots();
    } else if (currentNote) {
      showList();
    } else {
      loadNotes();
    }
    return;
  }

  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    autoSave();
    if (currentNote) {
      folderMove.classList.remove('hidden');
      folderMove.focus();
      if (typeof folderMove.showPicker === 'function') {
        try {
          folderMove.showPicker();
        } catch (_) {
          folderMove.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        }
      } else {
        folderMove.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      }
    }
    return;
  }

  if (!e.metaKey) return;

  if (e.key === 'n') {
    e.preventDefault();
    const note = await window.api.createNote('');
    openNote(note);
  } else if (e.key === 'i') {
    e.preventDefault();
    const note = await window.api.createNoteFromImage();
    if (note) openNote(note);
  } else if (e.key === 'j') {
    e.preventDefault();
    toggleAgentPanel();
  } else if (e.key === 'f') {
    e.preventDefault();
    if (folderOrganizeOpen) closeFolderOrganizeView();
    else openFolderOrganizeView();
  }
});

function toggleAgentPanel() {
  agentPanelOpen = !agentPanelOpen;
  agentPanel.classList.toggle('hidden', !agentPanelOpen);
  window.api.resizeWindow(agentPanelOpen);
  if (agentPanelOpen) agentInput.focus();
}

function saveAgentChat() {
  sessionStorage.setItem('easy-jot-agent-chat', agentMessages.innerHTML);
}

function restoreAgentChat() {
  const saved = sessionStorage.getItem('easy-jot-agent-chat');
  if (saved) agentMessages.innerHTML = saved;
}

async function sendAgentMessage() {
  const text = agentInput.value.trim();
  if (!text) return;

  // Disable input during request to prevent double-submit
  agentInput.disabled = true;
  agentSendBtn.disabled = true;

  // Remove empty state
  const emptyState = agentMessages.querySelector('.agent-empty-state');
  if (emptyState) emptyState.remove();

  // Append user bubble and clear input immediately
  const userMsg = document.createElement('div');
  userMsg.className = 'agent-message user';
  userMsg.textContent = text;
  agentMessages.appendChild(userMsg);
  agentInput.value = '';
  agentMessages.scrollTop = agentMessages.scrollHeight;

  // Show loading indicator — will be mutated into result/error bubble
  const replyMsg = document.createElement('div');
  replyMsg.className = 'agent-message loading';
  replyMsg.textContent = 'Thinking…';
  agentMessages.appendChild(replyMsg);
  agentMessages.scrollTop = agentMessages.scrollHeight;

  try {
    // Notes context: use current filter state; fall back to all notes if list is empty
    const notesContext = notes.length > 0 ? notes : await window.api.getNotes();

    // Step 1: LLM → structured action array
    const { actions, error: llmError } = await window.api.intelligenceQueryStructured(text, notesContext);

    if (llmError) {
      replyMsg.className = 'agent-message error';
      replyMsg.textContent = llmError;
      return;
    }

    // Step 2: execute actions
    const execResult = await window.api.intelligenceExecute(actions);

    // Debug: log to console
    console.log('[Easy Jot Agent] Actions:', actions);
    console.log('[Easy Jot Agent] Result:', execResult);

    // Step 3: refresh UI
    await loadNotes();
    await loadFolders();

    // Step 4: show summary + actions debug
    replyMsg.className = 'agent-message assistant';
    replyMsg.innerHTML = '';
    const summaryEl = document.createElement('div');
    summaryEl.className = 'agent-summary';
    summaryEl.textContent = buildActionSummary(actions, execResult);
    replyMsg.appendChild(summaryEl);
    const debugEl = document.createElement('div');
    debugEl.className = 'agent-actions-debug';
    debugEl.textContent = formatActionsDebug(actions);
    replyMsg.appendChild(debugEl);

  } catch (err) {
    replyMsg.className = 'agent-message error';
    replyMsg.textContent = err.message || 'Something went wrong.';
  } finally {
    agentInput.disabled = false;
    agentSendBtn.disabled = false;
    agentMessages.scrollTop = agentMessages.scrollHeight;
    agentInput.focus();
    saveAgentChat();
  }
}

function buildActionSummary(actions, execResult) {
  if (!execResult.success && execResult.results.length === 0) {
    return `Error: ${execResult.errors.map(e => e.error).join('; ')}`;
  }

  let noteCount = 0, folderCount = 0, movedCount = 0, searchCount = 0, searchRan = false, organizeGroups = 0;

  for (const r of execResult.results) {
    switch (r.type) {
      case 'create_note':          noteCount++; break;
      case 'create_folder':        folderCount++; break;
      case 'move_note_to_folder':  movedCount++; break;
      case 'search':               searchRan = true; searchCount += r.result?.count ?? 0; break;
      case 'organize_into_folders':
        organizeGroups += Array.isArray(r.result) ? r.result.length : 1;
        movedCount += (r.result || []).reduce((s, g) => s + (g.movedNoteIds?.length || 0), 0);
        break;
    }
  }

  const parts = [];
  if (noteCount)       parts.push(`Created ${noteCount} note${noteCount > 1 ? 's' : ''}`);
  if (folderCount)     parts.push(`Created ${folderCount} folder${folderCount > 1 ? 's' : ''}`);
  if (organizeGroups)  parts.push(`Organized into ${organizeGroups} folder${organizeGroups > 1 ? 's' : ''}`);
  else if (movedCount) parts.push(`Moved ${movedCount} note${movedCount > 1 ? 's' : ''}`);
  if (searchRan)       parts.push(`Found ${searchCount} matching note${searchCount !== 1 ? 's' : ''}`);
  if (execResult.errors.length > 0) {
    parts.push(`${execResult.errors.length} action${execResult.errors.length > 1 ? 's' : ''} failed`);
  }

  if (parts.length > 0) return `Done: ${parts.join(', ')}.`;
  // Fallback: list action types when no counts apply
  const types = execResult.results.map(r => r.type).filter(Boolean);
  return types.length > 0 ? `Done: ran ${types.join(', ')}.` : 'Done.';
}

function formatActionsDebug(actions) {
  if (!actions || actions.length === 0) return '';
  return 'Actions: ' + actions.map(a => {
    const p = a.payload;
    switch (a.type) {
      case 'search':               return `search("${(p?.query || '').slice(0, 30)}")`;
      case 'create_note':          return `create_note(${(p?.content || '').slice(0, 40)}…)`;
      case 'create_folder':        return `create_folder("${p?.name || ''}")`;
      case 'move_note_to_folder':  return `move_note(${p?.noteId} → ${p?.folderId})`;
      case 'organize_into_folders': return `organize(${Array.isArray(p) ? p.length : 0} folders)`;
      default:                     return a.type;
    }
  }).join(', ');
}

agentSendBtn.addEventListener('click', sendAgentMessage);

agentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    sendAgentMessage();
  }
});

// Stop key events in the agent panel from bubbling to the jot editor (fixes Enter inserting into note)
agentPanel.addEventListener('keydown', (e) => {
  if (!e.target.closest('#agent-panel')) return;
  if ((e.metaKey && e.key === 'j') || e.key === 'Escape') return; // allow Cmd+J and Escape to propagate
  e.stopPropagation();
});

// ── Folder functions ──

function renderFolderBar() {
  folderBar.querySelectorAll('.folder-pill-dynamic').forEach(el => el.remove());

  if (folders.length === 0 && !folderOrganizeOpen) {
    folderBar.classList.add('hidden');
    return;
  }
  if (folderOrganizeOpen) {
    folderBar.classList.add('hidden');
  } else {
    folderBar.classList.remove('hidden');
  }

  folders.forEach(folder => {
    const btn = document.createElement('button');
    btn.className = 'folder-pill folder-pill-dynamic';
    btn.dataset.folder = folder.id;
    btn.textContent = folder.name;
    folderBar.insertBefore(btn, newFolderBtn);
  });

  folderBar.querySelectorAll('.folder-pill').forEach(btn => {
    const val = btn.dataset.folder;
    const isActive =
      (val === 'all'     && currentFolderFilter === 'all') ||
      (val === 'unfiled' && currentFolderFilter === null)  ||
      (Number(val)       === currentFolderFilter);
    btn.classList.toggle('active', isActive);
  });
}

async function loadFolders() {
  folders = await window.api.getFolders();
  renderFolderBar();
  updateFolderMoveSelector();
}

function updateFolderMoveSelector() {
  if (folders.length === 0) {
    folderMove.classList.add('hidden');
    return;
  }
  folderMove.classList.remove('hidden');
  folderMove.innerHTML = '<option value="">Unfiled</option>';
  folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    folderMove.appendChild(opt);
  });
  folderMove.value = currentNote?.folder_id ?? '';
}

folderMove.addEventListener('change', async () => {
  if (!currentNote) return;
  const folderId = folderMove.value === '' ? null : Number(folderMove.value);
  await window.api.updateNoteFolder(currentNote.id, folderId);
  currentNote.folder_id = folderId;
});

folderBar.addEventListener('click', async (e) => {
  const pill = e.target.closest('.folder-pill:not(.folder-pill-add)');
  if (!pill) return;
  const val = pill.dataset.folder;
  currentFolderFilter = val === 'all' ? 'all' : val === 'unfiled' ? null : Number(val);
  renderFolderBar();
  if (folderOrganizeOpen) {
    await renderFolderOrganizeJots();
  } else {
    await loadNotes();
  }
});

newFolderBtn.addEventListener('click', () => {
  newFolderBtn.classList.add('hidden');
  newFolderInput.classList.remove('hidden');
  newFolderInput.value = '';
  newFolderInput.focus();
});

async function confirmNewFolder() {
  const name = newFolderInput.value.trim();
  newFolderInput.classList.add('hidden');
  newFolderBtn.classList.remove('hidden');
  if (!name) return;
  await window.api.createFolder(name);
  await loadFolders();
}

newFolderInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  { e.preventDefault(); confirmNewFolder(); }
  if (e.key === 'Escape') { e.preventDefault(); newFolderInput.classList.add('hidden'); newFolderBtn.classList.remove('hidden'); }
});
newFolderInput.addEventListener('blur', confirmNewFolder);

// ── Folder organize view ──

function renderFolderOrganizeFilter() {
  folderOrganizeFilter.innerHTML = '';
  const filters = [
    { val: 'all', label: 'All' },
    { val: 'unfiled', label: 'Unfiled' },
    ...folders.map(f => ({ val: String(f.id), label: f.name })),
  ];
  filters.forEach(({ val, label }) => {
    const btn = document.createElement('button');
    btn.className = 'folder-pill folder-organize-filter-pill';
    btn.dataset.folder = val;
    btn.textContent = label;
    const isActive =
      (val === 'all'     && currentFolderFilter === 'all') ||
      (val === 'unfiled' && currentFolderFilter === null)  ||
      (Number(val)       === currentFolderFilter);
    btn.classList.toggle('active', isActive);
    btn.addEventListener('click', async () => {
      currentFolderFilter = val === 'all' ? 'all' : val === 'unfiled' ? null : Number(val);
      renderFolderOrganizeFilter();
      await renderFolderOrganizeJots();
    });
    folderOrganizeFilter.appendChild(btn);
  });
}

async function openFolderOrganizeView() {
  folderOrganizeOpen = true;
  noteList.classList.add('hidden');
  noteList.style.display = 'none';
  folderBar.classList.add('hidden');
  editor.classList.add('hidden');
  folderOrganizeView.classList.remove('hidden');
  await loadFolders();
  renderFolderOrganizeFilter();
  await renderFolderOrganizeJots();
}

function closeFolderOrganizeView() {
  folderOrganizeOpen = false;
  folderOrganizeView.classList.add('hidden');
  noteList.classList.remove('hidden');
  noteList.style.display = '';
  if (folders.length > 0) folderBar.classList.remove('hidden');
  else folderBar.classList.add('hidden');
  loadNotes();
}

async function renderFolderOrganizeJots() {
  const folderNotes = currentFolderFilter === 'all'
    ? await window.api.getNotes()
    : await window.api.getNotesByFolder(currentFolderFilter);

  folderOrganizeContent.innerHTML = '';
  selectedIndex = Math.min(selectedIndex, Math.max(0, folderNotes.length - 1));

  if (folderNotes.length === 0) {
    folderOrganizeContent.innerHTML = '<div class="empty-state">No jots in this folder</div>';
    return;
  }

  folderNotes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note-item' + (index === selectedIndex ? ' selected' : '');
    div.dataset.index = index;

    const date = new Date(note.updated_at + 'Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isImageNote(note)) {
      div.innerHTML = `
        <div class="note-preview note-preview-image">
          <img src="${note.content}" alt="Image" />
        </div>
        <div class="note-date">${date}</div>
      `;
    } else {
      const preview = note.content.trim() || 'Empty note';
      const firstLine = preview.split('\n')[0].substring(0, 50);
      div.innerHTML = `
        <div class="note-preview">${escapeHtml(firstLine)}</div>
        <div class="note-date">${date}</div>
      `;
    }

    div.addEventListener('click', () => {
      selectedIndex = index;
      openNote(note);
    });
    folderOrganizeContent.appendChild(div);
  });
}

folderBtn.addEventListener('click', () => {
  if (folderOrganizeOpen) {
    closeFolderOrganizeView();
  } else {
    openFolderOrganizeView();
  }
});

folderOrganizeNewBtn.addEventListener('click', async () => {
  const name = folderOrganizeNewInput.value.trim();
  if (!name) return;
  const description = folderOrganizeDescInput.value.trim();
  folderOrganizeNewInput.value = '';
  folderOrganizeDescInput.value = '';
  await window.api.createFolder(name, description);
  await loadFolders();
  if (folderOrganizeOpen) renderFolderOrganizeFilter();
  else renderFolderBar();
  await renderFolderOrganizeJots();
});

folderOrganizeNewInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    folderOrganizeNewBtn.click();
  }
});

folderOrganizeDescInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    folderOrganizeNewBtn.click();
  }
});

restoreAgentChat();
loadFolders();
loadNotes();
