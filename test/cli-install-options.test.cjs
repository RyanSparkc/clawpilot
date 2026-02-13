const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runCli(args, env = {}) {
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

test('cli install fails in --yes mode when --timezone value is missing', () => {
  const result = runCli(['install', '--yes', '--timezone']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--timezone requires a value/i);
});

test('cli install writes requested timezone when provided', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-cli-home-'));

  try {
    const result = runCli([
      'install',
      '--yes',
      '--home',
      tmpHome,
      '--timezone',
      'UTC',
      '--morning',
      '08:30',
      '--midday',
      '13:30',
      '--evening',
      '21:00'
    ]);

    assert.equal(result.status, 0);
    const configPath = path.join(tmpHome, 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(config.skills.entries['clawpilot-productivity'].timezone, 'UTC');
    assert.equal(config.skills.entries['clawpilot-productivity'].schedule.morning, '08:30');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});
