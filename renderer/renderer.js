const noteList = document.getElementById('note-list');
const editor = document.getElementById('editor');
const contentEl = document.getElementById('content');
const newBtn = document.getElementById('new-btn');
const backBtn = document.getElementById('back-btn');
const deleteBtn = document.getElementById('delete-btn');

let currentNote = null;
let saveTimeout = null;

async function loadNotes() {
  const notes = await window.api.getNotes();
  noteList.innerHTML = '';

  if (notes.length === 0) {
    noteList.innerHTML = '<div class="empty-state">Press + to create a note</div>';
    return;
  }

  notes.forEach((note) => {
    const div = document.createElement('div');
    div.className = 'note-item';

    const preview = note.content.trim() || 'Empty note';
    const firstLine = preview.split('\n')[0].substring(0, 50);
    const date = new Date(note.updated_at + 'Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    div.innerHTML = `
      <div class="note-preview">${escapeHtml(firstLine)}</div>
      <div class="note-date">${date}</div>
    `;

    div.addEventListener('click', () => openNote(note));
    noteList.appendChild(div);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openNote(note) {
  currentNote = note;
  contentEl.value = note.content;
  noteList.classList.add('hidden');
  editor.classList.remove('hidden');
  contentEl.focus();
}

function showList() {
  autoSave();
  currentNote = null;
  editor.classList.add('hidden');
  noteList.classList.remove('hidden');
  noteList.style.display = '';
  loadNotes();
}

function autoSave() {
  if (currentNote && contentEl.value !== currentNote.content) {
    window.api.updateNote(currentNote.id, contentEl.value);
    currentNote.content = contentEl.value;
  }
}

newBtn.addEventListener('click', async () => {
  const note = await window.api.createNote('');
  openNote(note);
});

backBtn.addEventListener('click', showList);

deleteBtn.addEventListener('click', async () => {
  if (currentNote) {
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

loadNotes();
