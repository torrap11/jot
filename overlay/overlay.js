'use strict';

let autoDismissMs = 10000;
let activeAppKey = '';

window.overlay.onShow((payload) => {
  const notes = payload.notes || [];
  activeAppKey = payload.appKey || '';
  if (payload.autoDismissMs) autoDismissMs = payload.autoDismissMs;

  const bar = document.getElementById('progress-bar');
  bar.style.animation = 'none';
  bar.offsetHeight; // reflow
  bar.style.animation = `shrink ${autoDismissMs}ms linear forwards`;

  const container = document.getElementById('notes-container');
  container.innerHTML = '';

  const list = Array.isArray(notes) ? notes : [];
  for (const note of list) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-card-title">${esc((note.text || '').split('\n')[0] || 'Note')}</div>
      <div class="note-card-snippet">${esc((note.text || '').slice(0, 180))}</div>
      <div class="note-card-actions">
        <button class="action-btn open"    data-id="${note.id}">Open</button>
        <button class="action-btn snooze"  data-id="${note.id}">Snooze 30m</button>
        <button class="action-btn complete" data-id="${note.id}">Mark as completed</button>
      </div>
    `;
    container.appendChild(card);
  }
});

window.overlay.onDismiss(() => {
  document.getElementById('notes-container').innerHTML = '';
});

document.getElementById('dismiss-all').addEventListener('click', () => {
  window.overlay.dismissAll();
});

document.getElementById('notes-container').addEventListener('click', (e) => {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.classList.contains('open')) window.overlay.openNote(id);
  if (btn.classList.contains('snooze')) window.overlay.snooze(id, activeAppKey, 30);
  if (btn.classList.contains('complete')) window.overlay.complete(id);
});

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
