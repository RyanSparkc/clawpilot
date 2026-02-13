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

test('runRuntimeCommand report uses weekly summary from saved state', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-runtime-'));
  const stateFile = path.join(tempDir, 'state.json');
  const packageRoot = path.join(__dirname, '..');

  try {
    await runRuntimeCommand({
      command: 'morning',
      dryRun: true,
      packageRoot,
      rolePack: 'hana',
      tasks: ['A', 'B', 'C'],
      timezone: 'UTC',
      stateFile,
      dateKey: '2026-02-13'
    });

    await runRuntimeCommand({
      command: 'midday',
      dryRun: true,
      packageRoot,
      rolePack: 'hana',
      statuses: ['done', 'blocked', 'deferred'],
      timezone: 'UTC',
      stateFile,
      dateKey: '2026-02-13'
    });

    const report = await runRuntimeCommand({
      command: 'report',
      dryRun: true,
      packageRoot,
      rolePack: 'hana',
      timezone: 'UTC',
      stateFile,
      dateKey: '2026-02-13'
    });

    assert.match(report.message, /Blocked: 1/);
    assert.match(report.message, /Completion rate: 33%/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('runRuntimeCommand loads default rolePack/channel from openclaw config entry', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-runtime-'));
  const stateFile = path.join(tempDir, 'state.json');
  const packageRoot = path.join(__dirname, '..');
  const configPath = path.join(tempDir, 'openclaw.json');
  const config = {
    skills: {
      entries: {
        'clawpilot-productivity': {
          runtime: {
            defaults: {
              rolePack: 'minji'
            }
          },
          delivery: {
            channel: '@team'
          }
        }
      }
    }
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    const payload = await runRuntimeCommand({
      command: 'morning',
      dryRun: true,
      packageRoot,
      openClawHome: tempDir,
      stateFile,
      dateKey: '2026-02-13'
    });

    assert.equal(payload.rolePack.name, 'Minji');
    assert.equal(payload.channel, '@team');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('runRuntimeCommand throws channel_required in send mode without explicit/default channel', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-runtime-'));
  const stateFile = path.join(tempDir, 'state.json');
  const packageRoot = path.join(__dirname, '..');

  try {
    await assert.rejects(
      runRuntimeCommand({
        command: 'morning',
        dryRun: false,
        packageRoot,
        stateFile,
        dateKey: '2026-02-13'
      }),
      (error) =>
        error &&
        error.code === 'channel_required' &&
        /--channel/i.test(error.fix || '')
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
