module.exports = {
  global: [
    { keys: 'Cmd+E',         action: 'Toggle app window (show/hide)' },
    { keys: 'Cmd+Shift+J',   action: 'Start/stop voice memory capture' },
  ],
  inApp: [
    { keys: 'Cmd+J', action: 'Switch focus between Jot Agent and jots panel' },
    { keys: 'Cmd+N', action: 'New note' },
    { keys: 'Cmd+S', action: 'Save and open folder picker' },
    { keys: 'Cmd+I', action: 'New note from image' },
    { keys: 'Cmd+F', action: 'Toggle folder organize view' },
    { keys: 'Escape', action: 'Go back / close view / close note' },
    { keys: 'Cmd+Z', action: 'Undo delete (restore note)' },
    { keys: 'Arrow Up/Down + Enter', action: 'Navigate and open note in list' },
    { keys: 'Delete / Backspace', action: 'Delete selected note (in list)' },
    { keys: 'Ctrl+Tab / Ctrl+Shift+Tab', action: 'Cycle folder filter' },
  ],
};
