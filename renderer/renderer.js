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

// ── Voice & Intent Memory elements ──
const voiceBtn = document.getElementById('voice-btn');
const voiceBar = document.getElementById('voice-bar');
const voiceStateRecording = document.getElementById('voice-state-recording');
const voiceStateProcessing = document.getElementById('voice-state-processing');
const voiceStateReview = document.getElementById('voice-state-review');
const voiceStateSuccess = document.getElementById('voice-state-success');
const voiceStateError = document.getElementById('voice-state-error');
const voiceStopBtn = document.getElementById('voice-stop-btn');
const voiceSaveBtn = document.getElementById('voice-save-btn');
const voiceDismissBtn = document.getElementById('voice-dismiss-btn');
const voiceErrorDismissBtn = document.getElementById('voice-error-dismiss-btn');
const voiceTranscriptText = document.getElementById('voice-transcript-text');
const voiceProcessingLabel = document.getElementById('voice-processing-label');
const voiceErrorText = document.getElementById('voice-error-text');
const triggerNotification = document.getElementById('trigger-notification');
const triggerNotificationIcon = document.getElementById('trigger-notification-icon');
const triggerNotificationLabel = document.getElementById('trigger-notification-label');
const triggerNotificationClose = document.getElementById('trigger-notification-close');
const triggerNotificationMemories = document.getElementById('trigger-notification-memories');
const jotTypeBar = document.getElementById('jot-type-bar');
const jotDetailView = document.getElementById('jot-detail-view');
const jotDetailHeader = document.getElementById('jot-detail-header');
const jotDetailBadge = document.getElementById('jot-detail-badge');
const jotDetailMeta = document.getElementById('jot-detail-meta');
const jotDetailBack = document.getElementById('jot-detail-back');
const jotDetailContent = document.getElementById('jot-detail-content');
const jotDetailActions = document.getElementById('jot-detail-actions');

function isImageNote(note) {
  return note && note.content && note.content.startsWith('data:image/');
}

let currentNote = null;
let saveTimeout = null;
let notes = []; // unified list: notes + intent memories + scheduled reminders (normalized to jot items)
let selectedIndex = 0;
let deletedNotesStack = [];
let agentPanelOpen = true;
let folders = [];
let folderOrganizeOpen = false;
let currentJotDetail = null; // { type: 'trigger'|'scheduled', data } when viewing a non-note jot

// Jot type filter: all | notes | triggers | scheduled
let currentJotTypeFilter = (() => {
  const v = localStorage.getItem('jot-type-filter');
  return (v === 'notes' || v === 'triggers' || v === 'scheduled') ? v : 'all';
})();

// Restore folder filter from previous session
let currentFolderFilter = (() => {
  const v = localStorage.getItem('jot-folder-filter');
  if (v === null || v === 'all') return 'all';
  if (v === 'unfiled') return null;
  return Number(v);
})();

function setFolderFilter(val) {
  currentFolderFilter = val;
  localStorage.setItem('jot-folder-filter', val === null ? 'unfiled' : String(val));
}

function setJotTypeFilter(val) {
  currentJotTypeFilter = val;
  localStorage.setItem('jot-type-filter', val);
  jotTypeBar.querySelectorAll('.jot-type-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.jotType === val);
  });
  if (val === 'notes') {
    folderBar.classList.remove('hidden');
  } else {
    folderBar.classList.add('hidden');
  }
}

/** Normalize raw items to unified jot shape: { jotType, id, content, sortAt, ... } */
function toJotNote(n) {
  return { jotType: 'note', id: n.id, content: n.content, folder_id: n.folder_id, created_at: n.created_at, updated_at: n.updated_at, sortAt: n.updated_at, ...n };
}
function toJotTrigger(m) {
  return { jotType: 'trigger', id: m.id, content: m.content, trigger: m.trigger, category: m.category, created_at: m.created_at, sortAt: m.created_at, ...m };
}
function toJotScheduled(r) {
  return { jotType: 'scheduled', id: r.id, content: r.content, schedule_type: r.schedule_type, scheduled_time: r.scheduled_time, active: r.active, created_at: r.created_at, sortAt: r.created_at, ...r };
}

async function loadJots(selectId = null, selectJotType = null) {
  let rawNotes = [];
  let rawMemories = [];
  let rawReminders = [];

  if (currentJotTypeFilter === 'all' || currentJotTypeFilter === 'notes') {
    rawNotes = (currentJotTypeFilter === 'all')
      ? await window.api.getNotes()
      : (currentFolderFilter === 'all' ? await window.api.getNotes() : await window.api.getNotesByFolder(currentFolderFilter));
  }
  if (currentJotTypeFilter === 'all' || currentJotTypeFilter === 'triggers') {
    rawMemories = await window.api.getIntentMemories();
  }
  if (currentJotTypeFilter === 'all' || currentJotTypeFilter === 'scheduled') {
    rawReminders = await window.api.getScheduledReminders();
  }

  const noteJots = rawNotes.map(toJotNote);
  const triggerJots = rawMemories.map(toJotTrigger);
  const scheduledJots = rawReminders.map(toJotScheduled);
  notes = [...noteJots, ...triggerJots, ...scheduledJots].sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));

  noteList.innerHTML = '';

  if (notes.length === 0) {
    const emptyMsg = currentJotTypeFilter === 'all'
      ? 'Press + to add a jot. Write a note, a time-based reminder, or “when I open X…” and the app will figure it out.'
      : currentJotTypeFilter === 'notes'
          ? 'Press + to create a jot.'
        : currentJotTypeFilter === 'triggers'
          ? 'Use 🎙️ to record, or type “when I open X…” in a new jot.'
          : 'Press + and write something like “at 10 PM remind me to…”';
    noteList.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
    selectedIndex = -1;
    return;
  }

  if (selectId != null && selectJotType != null) {
    const idx = notes.findIndex((j) => j.id === selectId && j.jotType === selectJotType);
    selectedIndex = idx >= 0 ? idx : 0;
  } else {
    selectedIndex = Math.min(selectedIndex, notes.length - 1);
    if (selectedIndex < 0) selectedIndex = 0;
  }

  const TRIGGER_ICONS_MAP = { netflix_open: '📺', linkedin_open: '💼', gmail_open: '📧', work_start: '🖥️', general: '💡' };
  const getTriggerIcon = (t) => TRIGGER_ICONS_MAP[t] || '💡';

  notes.forEach((jot, index) => {
    const div = document.createElement('div');
    div.className = 'note-item' + (index === selectedIndex ? ' selected' : '');
    div.dataset.index = index;
    const date = new Date((jot.updated_at || jot.created_at) + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (jot.jotType === 'note') {
      if (isImageNote(jot)) {
        div.innerHTML = `
          <div class="note-preview note-preview-image"><img src="${jot.content}" alt="Image" /></div>
          <div class="note-date">${date}</div>
        `;
      } else {
        const preview = (jot.content || '').trim() || 'Empty note';
        const firstLine = preview.split('\n')[0].substring(0, 50);
        div.innerHTML = `
          <div class="note-preview">${escapeHtml(firstLine)}</div>
          <div class="note-date">${date}</div>
        `;
      }
      div.addEventListener('click', () => { selectedIndex = index; openNote(jot); });
    } else if (jot.jotType === 'trigger') {
      const icon = getTriggerIcon(jot.trigger);
      div.innerHTML = `
        <div class="note-preview">${escapeHtml((jot.content || '').slice(0, 50))}</div>
        <div class="jot-capability">${icon} ${escapeHtml(jot.trigger)} · ${escapeHtml(jot.category)}</div>
        <div class="note-date">${date}</div>
      `;
      div.addEventListener('click', () => { selectedIndex = index; openJotDetail('trigger', jot); });
    } else {
      const scheduleLabel = formatScheduleLabel(jot.schedule_type, jot.scheduled_time);
      div.innerHTML = `
        <div class="note-preview">${escapeHtml((jot.content || '').slice(0, 50))}</div>
        <div class="jot-capability">⏰ ${escapeHtml(scheduleLabel)}${jot.active ? '' : ' · paused'}</div>
        <div class="note-date">${date}</div>
      `;
      div.addEventListener('click', () => { selectedIndex = index; openJotDetail('scheduled', jot); });
    }
    noteList.appendChild(div);
  });

  const selectedEl = noteList.querySelector('.note-item.selected');
  if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function formatScheduleLabel(scheduleType, scheduledTime) {
  if (scheduleType === 'daily') {
    const [hh, mm] = scheduledTime.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return 'Daily at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const d = new Date(scheduledTime);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function openJotDetail(type, jot) {
  currentJotDetail = { type, data: jot };
  noteList.classList.add('hidden');
  editor.classList.add('hidden');
  jotDetailView.classList.remove('hidden');
  jotDetailContent.textContent = jot.content || '';

  if (type === 'trigger') {
    const TRIGGER_ICONS_MAP = { netflix_open: '📺', linkedin_open: '💼', gmail_open: '📧', work_start: '🖥️', general: '💡' };
    jotDetailBadge.textContent = (TRIGGER_ICONS_MAP[jot.trigger] || '💡') + ' Trigger';
    jotDetailMeta.textContent = `${jot.trigger} · ${jot.category}`;
    jotDetailActions.innerHTML = '<button type="button" id="jot-detail-delete">Delete</button>';
    jotDetailActions.querySelector('#jot-detail-delete').onclick = async () => {
      await window.api.deleteIntentMemory(jot.id);
      currentJotDetail = null;
      jotDetailView.classList.add('hidden');
      noteList.classList.remove('hidden');
      await loadJots();
    };
  } else {
    jotDetailBadge.textContent = '⏰ Scheduled';
    jotDetailMeta.textContent = formatScheduleLabel(jot.schedule_type, jot.scheduled_time) + (jot.active ? '' : ' · Paused');
    jotDetailActions.innerHTML = `
      <button type="button" id="jot-detail-test">▶ Test</button>
      <button type="button" id="jot-detail-toggle">${jot.active ? 'Pause' : 'Resume'}</button>
      <button type="button" id="jot-detail-delete">Delete</button>
    `;
    jotDetailActions.querySelector('#jot-detail-test').onclick = async () => {
      await window.api.fireReminder(jot.id);
    };
    jotDetailActions.querySelector('#jot-detail-toggle').onclick = async () => {
      await window.api.toggleScheduledReminder(jot.id);
      const updated = (await window.api.getScheduledReminders()).find((r) => r.id === jot.id);
      if (updated) openJotDetail('scheduled', toJotScheduled(updated));
    };
    jotDetailActions.querySelector('#jot-detail-delete').onclick = async () => {
      await window.api.deleteScheduledReminder(jot.id);
      currentJotDetail = null;
      jotDetailView.classList.add('hidden');
      noteList.classList.remove('hidden');
      await loadJots();
    };
  }

  jotDetailBack.onclick = () => {
    currentJotDetail = null;
    jotDetailView.classList.add('hidden');
    noteList.classList.remove('hidden');
    loadJots();
  };
}

async function loadNotes(selectNoteId = null) {
  await loadJots(selectNoteId, 'note');
}

function isListVisible() {
  return editor.classList.contains('hidden');
}

noteList.tabIndex = -1;

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
  if (currentNote && !isImageNote(currentNote)) {
    const content = contentEl.value.trim();
    if (content === '') {
      await window.api.deleteNote(currentNote.id);
      noteIdToSelect = null;
    } else {
      // Let the system figure out: note vs scheduled reminder vs trigger
      const reminderParsed = parseReminderNLClient(content);
      if (reminderParsed) {
        const { error } = await window.api.createScheduledReminder({
          content: reminderParsed.content,
          scheduleType: reminderParsed.scheduleType,
          scheduledTime: reminderParsed.scheduledTime,
        });
        if (!error) {
          await window.api.deleteNote(currentNote.id);
          noteIdToSelect = null;
        } else {
          autoSave();
        }
      } else {
        const { intent, error: parseErr } = await window.api.parseIntent(content);
        if (!parseErr && intent && intent.trigger && intent.trigger !== 'general') {
          const { error: saveErr } = await window.api.saveIntentMemory(intent);
          if (!saveErr) {
            await window.api.deleteNote(currentNote.id);
            noteIdToSelect = null;
          } else {
            autoSave();
          }
        } else {
          autoSave();
        }
      }
    }
  } else if (currentNote && isImageNote(currentNote)) {
    // Image note: nothing to parse
  }
  currentNote = null;
  currentJotDetail = null;
  contentEl.classList.remove('hidden');
  imageDisplay.classList.add('hidden');
  imageDisplay.innerHTML = '';
  editor.classList.add('hidden');
  jotDetailView.classList.add('hidden');
  noteList.classList.remove('hidden');
  noteList.style.display = '';
  await loadJots(noteIdToSelect, 'note');
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
      await loadJots();
      return;
    }
  }

  if (e.metaKey && e.key === 'z') {
    e.preventDefault();
    if (deletedNotesStack.length > 0) {
      const note = deletedNotesStack.pop();
      await window.api.restoreNote(note);
      await loadJots();
      selectedIndex = notes.findIndex((n) => n.id === note.id);
      if (selectedIndex < 0) selectedIndex = notes.length - 1;
      updateSelectionHighlight();
    }
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    if (currentNote) {
      await showList();
    } else if (currentJotDetail) {
      currentJotDetail = null;
      jotDetailView.classList.add('hidden');
      noteList.classList.remove('hidden');
      loadJots();
    } else if (folderOrganizeOpen) {
      closeFolderOrganizeView();
    }
    return;
  }

  if (e.metaKey && e.key === 'Tab') {
    e.preventDefault();
    switchPaneFocus();
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
    setFolderFilter(filterList[nextIdx]);
    renderFolderBar();
    if (folderOrganizeOpen) {
      renderFolderOrganizeJots();
    } else if (currentNote) {
      showList();
    } else {
      loadJots();
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
    switchPaneFocus();
  } else if (e.key === 'f') {
    e.preventDefault();
    if (folderOrganizeOpen) closeFolderOrganizeView();
    else openFolderOrganizeView();
  }
});

function showAgentPanel() {
  agentPanelOpen = true;
  agentPanel.classList.remove('hidden');
  window.api.resizeWindow(true);
  agentInput.focus();
}

function focusJotPane() {
  if (currentNote && !isImageNote(currentNote)) {
    contentEl.focus();
    return;
  }
  if (folderOrganizeOpen && folderOrganizeNewInput) {
    folderOrganizeNewInput.focus();
    return;
  }
  noteList.focus();
}

function switchPaneFocus() {
  if (agentPanel.contains(document.activeElement)) {
    focusJotPane();
  } else {
    showAgentPanel();
  }
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
    const helpKeywords = [
      'shortcut', 'shortcuts', 'keybind', 'keybinds', 'keyboard',
      'hotkey', 'hotkeys', 'how do i', 'how to', 'what key', 'what keys',
      'help', 'command', 'keys for', 'key for',
    ];
    const isHelpQuery = helpKeywords.some(kw => text.toLowerCase().includes(kw));

    if (isHelpQuery) {
      const { response, error: helpError } = await window.api.intelligenceQueryHelp(text);
      if (helpError) {
        replyMsg.className = 'agent-message error';
        replyMsg.textContent = helpError;
        return;
      }
      replyMsg.className = 'agent-message assistant';
      replyMsg.textContent = response;
      return;
    }

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
    await loadJots();
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
  if ((e.metaKey && (e.key === 'j' || e.key === 'Tab')) || e.key === 'Escape') return; // allow pane-switch shortcuts to propagate
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
  setFolderFilter(val === 'all' ? 'all' : val === 'unfiled' ? null : Number(val));
  renderFolderBar();
  if (folderOrganizeOpen) {
    await renderFolderOrganizeJots();
  } else {
    await loadJots();
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
      setFolderFilter(val === 'all' ? 'all' : val === 'unfiled' ? null : Number(val));
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
  loadJots();
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
showAgentPanel();
loadFolders();
setJotTypeFilter(currentJotTypeFilter);
loadJots();

// ════════════════════════════════════════════════════════════════════════════
// AUDIO PLAYBACK (TTS)
// ════════════════════════════════════════════════════════════════════════════

let _audioCtx = null;
function getAudioContext() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

/**
 * Play a WAV ArrayBuffer returned by the TTS IPC handler.
 * Silently skips if audioData is null (TTS not configured).
 */
async function playAudioBuffer(audioData) {
  if (!audioData) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const decoded = await ctx.decodeAudioData(audioData.slice(0)); // defensive copy
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start(0);
  } catch (err) {
    console.warn('[tts playback]', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// VOICE CAPTURE & INTENT MEMORY
// ════════════════════════════════════════════════════════════════════════════

let mediaRecorder = null;
let audioChunks = [];
let pendingTranscript = null; // transcript awaiting user confirmation
let voiceActive = false;      // true while recording
let triggerNotifTimeout = null;

// ── Voice bar state machine ──────────────────────────────────────────────

function setVoiceBarState(state) {
  [voiceStateRecording, voiceStateProcessing, voiceStateReview, voiceStateSuccess, voiceStateError]
    .forEach(el => el.classList.remove('active'));

  voiceBar.classList.toggle('hidden', state === 'hidden');
  if (state !== 'hidden') {
    const el = document.getElementById(`voice-state-${state}`);
    if (el) el.classList.add('active');
  }
}

// ── Start / Stop recording ───────────────────────────────────────────────

async function startVoiceRecording() {
  if (voiceActive) return;

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    showVoiceError('Microphone access denied. Grant access in System Preferences → Privacy → Microphone.');
    return;
  }

  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.start(100);

  voiceActive = true;
  voiceBtn.classList.add('recording');
  setVoiceBarState('recording');
}

async function stopVoiceRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  setVoiceBarState('processing');
  voiceProcessingLabel.textContent = 'Transcribing…';
  voiceBtn.classList.remove('recording');
  voiceActive = false;

  await new Promise((resolve) => {
    mediaRecorder.onstop = resolve;
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  });

  const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
  const arrayBuffer = await blob.arrayBuffer();

  // Transcribe via Pulse STT (or Whisper fallback)
  const { transcript, words, provider, error: transcribeError } = await window.api.transcribeAudio(arrayBuffer);
  if (transcribeError) {
    showVoiceError(transcribeError);
    return;
  }
  if (!transcript || !transcript.trim()) {
    showVoiceError('No speech detected. Please speak clearly and try again.');
    return;
  }

  // Show transcript with provider badge
  pendingTranscript = transcript.trim();
  voiceTranscriptText.textContent = `"${pendingTranscript}"`;
  // Show which STT provider was used (subtle indicator)
  const badge = voiceTranscriptText.parentElement.querySelector('.stt-badge');
  if (badge) badge.textContent = provider === 'pulse' ? 'Pulse STT' : 'Whisper';

  setVoiceBarState('review');
}

function showVoiceError(message) {
  voiceErrorText.textContent = message;
  voiceBtn.classList.remove('recording');
  voiceActive = false;
  setVoiceBarState('error');
}

async function saveVoiceMemory() {
  if (!pendingTranscript) return;

  setVoiceBarState('processing');
  voiceProcessingLabel.textContent = 'Extracting intent…';

  const { intent, error: parseError } = await window.api.parseIntent(pendingTranscript);
  if (parseError) {
    showVoiceError(parseError);
    return;
  }

  const { memory, audioData, error: saveError } = await window.api.saveIntentMemory(intent);
  if (saveError) {
    showVoiceError(saveError);
    return;
  }

  pendingTranscript = null;
  setVoiceBarState('success');

  // Speak the confirmation aloud (Lightning TTS) if configured
  playAudioBuffer(audioData);

  await loadJots();

  // Auto-dismiss success after 2.5s
  setTimeout(() => {
    if (!voiceActive) setVoiceBarState('hidden');
  }, 2500);
}

function dismissVoiceBar() {
  pendingTranscript = null;
  voiceActive = false;
  voiceBtn.classList.remove('recording');
  setVoiceBarState('hidden');
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    mediaRecorder.stop();
  }
}

// ── Toggle voice (button or global hotkey) ───────────────────────────────

function toggleVoiceCapture() {
  if (voiceActive) {
    stopVoiceRecording();
  } else if (!voiceBar.classList.contains('hidden')) {
    dismissVoiceBar();
  } else {
    startVoiceRecording();
  }
}

// ── Event wiring ─────────────────────────────────────────────────────────

voiceBtn.addEventListener('click', toggleVoiceCapture);
voiceStopBtn.addEventListener('click', stopVoiceRecording);
voiceSaveBtn.addEventListener('click', saveVoiceMemory);
voiceDismissBtn.addEventListener('click', dismissVoiceBar);
voiceErrorDismissBtn.addEventListener('click', dismissVoiceBar);

window.api.onToggleVoiceCapture(toggleVoiceCapture);

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER SIMULATION & NOTIFICATION
// ════════════════════════════════════════════════════════════════════════════

async function simulateTrigger(triggerId) {
  const result = await window.api.simulateTrigger(triggerId);
  if (result.error) {
    console.error('[Trigger]', result.error);
    return;
  }

  triggerNotificationIcon.textContent  = result.icon;
  triggerNotificationLabel.textContent = result.label;
  triggerNotificationMemories.innerHTML = '';

  if (result.memories.length === 0) {
    const empty = document.createElement('div');
    empty.className  = 'trigger-memory-empty';
    empty.textContent = `No reminders for ${result.label} yet. Record a voice memory first!`;
    triggerNotificationMemories.appendChild(empty);
  } else {
    result.memories.forEach(mem => {
      const item = document.createElement('div');
      item.className = 'trigger-memory-item';
      item.innerHTML = `
        <div class="memory-category">${escapeHtml(mem.category)}</div>
        ${escapeHtml(mem.content)}
      `;
      triggerNotificationMemories.appendChild(item);
    });
  }

  triggerNotification.classList.remove('hidden');

  // Speak the reminder aloud (Lightning TTS) if configured
  playAudioBuffer(result.audioData);

  clearTimeout(triggerNotifTimeout);
  triggerNotifTimeout = setTimeout(closeTriggerNotification, 8000);
}

function closeTriggerNotification() {
  clearTimeout(triggerNotifTimeout);
  triggerNotification.classList.add('hidden');
}

triggerNotificationClose.addEventListener('click', closeTriggerNotification);

document.querySelectorAll('.trigger-btn').forEach(btn => {
  btn.addEventListener('click', () => simulateTrigger(btn.dataset.trigger));
});

// ── Jot type filter bar ───────────────────────────────────────────────────
jotTypeBar.querySelectorAll('.jot-type-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    setJotTypeFilter(btn.dataset.jotType);
    loadJots();
  });
});
setJotTypeFilter(currentJotTypeFilter);

// ════════════════════════════════════════════════════════════════════════════
// CONFIG STATUS — show setup hint if no API keys configured
// ════════════════════════════════════════════════════════════════════════════

async function checkConfigStatus() {
  const status = await window.api.getConfigStatus().catch(() => null);
  if (!status) return;

  const configBar = document.getElementById('config-bar');
  if (!configBar) return;

  if (!status.hasOpenAI && !status.hasSmallest && !status.useOllama) {
    configBar.textContent = '⚙️ No API key found — voice & AI features disabled. See README for setup.';
    configBar.classList.remove('hidden');
  } else if (status.ttsEnabled) {
    // Show TTS enabled badge briefly
    configBar.textContent = `✓ Smallest AI: ${status.sttProvider?.toUpperCase()} + TTS enabled`;
    configBar.classList.remove('hidden');
    setTimeout(() => configBar.classList.add('hidden'), 4000);
  }
}

checkConfigStatus();

// ════════════════════════════════════════════════════════════════════════════
// REMINDER MODAL & NOTIFICATION
// ════════════════════════════════════════════════════════════════════════════

const reminderNotif = document.getElementById('reminder-notification');
const reminderNotifClose = document.getElementById('reminder-notification-close');
const reminderNotifContent = document.getElementById('reminder-notification-content');
let reminderNotifTimeout = null;

// ── NL parsing (client-side regex — mirrors reminderParser.js logic) ──────

function parseTimeString(timeStr) {
  const m = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3] ? m[3].toUpperCase() : null;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function todayOrTomorrowAt(hours, minutes) {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hours, minutes);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}

function extractReminderContent(text, patterns) {
  let out = text;
  for (const pat of patterns) out = out.replace(pat, '').trim();
  out = out.replace(/^(to\s+|that\s+|me\s+that\s+|me\s+to\s+)/i, '').trim();
  return out || text.trim();
}

function parseReminderNLClient(input) {
  if (!input.trim()) return null;

  const inRel = input.match(/\bin\s+(\d+)\s+(minute|minutes|min|hour|hours|hr|hrs)\b/i);
  if (inRel) {
    const amount = parseInt(inRel[1], 10);
    const d = new Date();
    if (inRel[2].toLowerCase().startsWith('h')) d.setHours(d.getHours() + amount);
    else d.setMinutes(d.getMinutes() + amount);
    return {
      content: extractReminderContent(input, [/\bin\s+\d+\s+(minute|minutes|min|hour|hours|hr|hrs)\b/i]),
      scheduleType: 'once',
      scheduledTime: d.toISOString(),
    };
  }

  const daily = input.match(/\b(?:every\s+day|daily)\s+at\s+([\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?)\b/i);
  if (daily) {
    const parsed = parseTimeString(daily[1].trim());
    if (parsed) {
      const hhmm = `${String(parsed.hours).padStart(2,'0')}:${String(parsed.minutes).padStart(2,'0')}`;
      return {
        content: extractReminderContent(input, [
          /\bevery\s+day\s+at\s+[\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?\b/i,
          /\bdaily\s+at\s+[\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?\b/i,
        ]),
        scheduleType: 'daily',
        scheduledTime: hhmm,
      };
    }
  }

  const tomorrow = input.match(/\btomorrow\s+at\s+([\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?)\b/i);
  if (tomorrow) {
    const parsed = parseTimeString(tomorrow[1].trim());
    if (parsed) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(parsed.hours, parsed.minutes, 0, 0);
      return {
        content: extractReminderContent(input, [/\btomorrow\s+at\s+[\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?\b/i]),
        scheduleType: 'once',
        scheduledTime: d.toISOString(),
      };
    }
  }

  const atTime = input.match(/\bat\s+([\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?)\b/i);
  if (atTime) {
    const parsed = parseTimeString(atTime[1].trim());
    if (parsed) {
      const d = todayOrTomorrowAt(parsed.hours, parsed.minutes);
      return {
        content: extractReminderContent(input, [/\bat\s+[\d]{1,2}(?::\d{2})?\s*(?:AM|PM)?\b/i]),
        scheduleType: 'once',
        scheduledTime: d.toISOString(),
      };
    }
  }

  return null; // not parsed
}

// ── Schedule label formatter ──────────────────────────────────────────────

function formatScheduleLabel(scheduleType, scheduledTime) {
  if (scheduleType === 'daily') {
    const [hh, mm] = scheduledTime.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return 'Daily at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const d = new Date(scheduledTime);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Reminder notification ─────────────────────────────────────────────────

function showReminderNotification(content) {
  reminderNotifContent.textContent = content;
  reminderNotif.classList.remove('hidden');
  clearTimeout(reminderNotifTimeout);
  reminderNotifTimeout = setTimeout(closeReminderNotification, 10000);
}

function closeReminderNotification() {
  clearTimeout(reminderNotifTimeout);
  reminderNotif.classList.add('hidden');
}

reminderNotifClose.addEventListener('click', closeReminderNotification);

// ── Push event from scheduler ─────────────────────────────────────────────

window.api.onReminderDue(async ({ content, audioData }) => {
  showReminderNotification(content);
  playAudioBuffer(audioData);
  await loadJots();
});
