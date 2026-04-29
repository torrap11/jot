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
    card.dataset.id = String(note.id);
    card.title = 'Double-click to open and edit';
    card.innerHTML = `
      <div class="note-card-title">${esc((note.text || '').split('\n')[0] || 'Note')}</div>
      <div class="note-card-snippet">${esc((note.text || '').slice(0, 180))}</div>
      <div class="note-card-actions">
        <button type="button" class="action-btn open" data-id="${note.id}">Open</button>
        <div class="snooze-wrap">
          <input type="number" class="snooze-input" min="1" max="10080" value="30" inputmode="numeric" aria-label="Minutes to snooze" />
          <button type="button" class="action-btn snooze" data-id="${note.id}">Snooze</button>
        </div>
        <button type="button" class="action-btn complete" data-id="${note.id}">Mark as completed</button>
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

function readSnoozeMinutes(btn) {
  const wrap = btn.closest('.snooze-wrap');
  const input = wrap?.querySelector('.snooze-input');
  let minutes = Number(input?.value);
  if (!Number.isFinite(minutes) || minutes < 1) minutes = 30;
  if (minutes > 10080) minutes = 10080;
  return Math.round(minutes);
}

document.getElementById('notes-container').addEventListener('click', (e) => {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.classList.contains('open')) window.overlay.openNote(id);
  if (btn.classList.contains('snooze')) window.overlay.snooze(id, activeAppKey, readSnoozeMinutes(btn));
  if (btn.classList.contains('complete')) window.overlay.complete(id);
});

document.getElementById('notes-container').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('.snooze-input');
  if (!input) return;
  e.preventDefault();
  const wrap = input.closest('.snooze-wrap');
  const snoozeBtn = wrap?.querySelector('.action-btn.snooze');
  if (!snoozeBtn) return;
  const id = Number(snoozeBtn.dataset.id);
  if (!Number.isFinite(id)) return;
  window.overlay.snooze(id, activeAppKey, readSnoozeMinutes(snoozeBtn));
});

document.getElementById('notes-container').addEventListener('dblclick', (e) => {
  if (e.target.closest('.snooze-input') || e.target.closest('.action-btn')) return;
  const card = e.target.closest('.note-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  if (!Number.isFinite(id)) return;
  window.overlay.openNote(id);
});

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
