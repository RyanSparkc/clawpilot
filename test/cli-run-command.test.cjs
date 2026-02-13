const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('run command returns morning payload in dry-run mode', () => {
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      'run',
      '--command',
      'morning',
      '--dry-run',
      '--timezone',
      'UTC'
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.command, 'morning');
  assert.equal(payload.deliveryMode, 'dry-run');
});
