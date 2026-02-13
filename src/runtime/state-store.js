const fs = require('node:fs');
const path = require('node:path');

function loadState(filePath) {
  if (!fs.existsSync(filePath)) {
    return { days: {} };
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function ensureDayState(state, dateKey) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = {
      tasks: [],
      rescueSprintsUsed: 0,
      notes: {}
    };
  }

  return state.days[dateKey];
}

module.exports = {
  loadState,
  saveState,
  ensureDayState
};
