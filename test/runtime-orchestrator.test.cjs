const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runRuntimeCommand } = require('../src/runtime');

test('runRuntimeCommand morning dry-run returns structured payload with rolePack metadata', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-runtime-'));
  const stateFile = path.join(tempDir, 'state.json');
  const packageRoot = path.join(__dirname, '..');

  try {
    const payload = await runRuntimeCommand({
      command: 'morning',
      dryRun: true,
      packageRoot,
      rolePack: 'hana',
      tasks: ['A', 'B', 'C'],
      timezone: 'UTC',
      stateFile,
      dateKey: '2026-02-13'
    });

    assert.equal(payload.command, 'morning');
    assert.equal(payload.rolePack.name, 'Hana');
    assert.match(payload.message, /A/);
    assert.equal(payload.deliveryMode, 'dry-run');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
