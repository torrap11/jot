'use strict';

const input = document.getElementById('capture-input');
const appInput = document.getElementById('capture-app-input');

async function submit() {
  const text = input.value.trim();
  if (!text) {
    window.mvp.hideCapture();
    return;
  }
  const appKey = await window.mvp.resolveAppKey(appInput.value);
  await window.mvp.saveCapture(text, appKey);
  input.value = '';
  appInput.value = '';
  window.mvp.hideCapture();
}

async function handleEscape() {
  const hasText = input.value.trim().length > 0;
  if (hasText) {
    await submit();
    return;
  }
  input.value = '';
  appInput.value = '';
  window.mvp.hideCapture();
}

input.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
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
  input.focus();
  input.select();
});

input.focus();
