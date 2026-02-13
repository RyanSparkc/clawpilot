const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadState,
  saveState,
  ensureDayState
} = require('../src/runtime/state-store');

test('ensureDayState initializes empty day record', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-state-'));
  const tmpFile = path.join(tempDir, 'state.json');

  try {
    const state = loadState(tmpFile);
    const day = ensureDayState(state, '2026-02-13');

    assert.deepEqual(day.tasks, []);
    assert.equal(day.rescueSprintsUsed, 0);

    saveState(tmpFile, state);
    const reloaded = loadState(tmpFile);
    assert.equal(reloaded.days['2026-02-13'].rescueSprintsUsed, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
