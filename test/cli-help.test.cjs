const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('cli --help prints usage for clawpilot', () => {
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
  const result = spawnSync(process.execPath, [cliPath, '--help'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /clawpilot/i);
  assert.match(result.stdout, /install/i);
});
