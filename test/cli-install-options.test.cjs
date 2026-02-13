const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseOptions, resolveOnExistingMode } = require('../bin/cli');

test('parseOptions tracks missing value flags in --yes mode', () => {
  const options = parseOptions(['--yes', '--timezone']);

  assert.equal(options.yes, true);
  assert.deepEqual(options.missingValueFlags, ['--timezone']);
});

test('parseOptions captures install runtime defaults and on-existing mode', () => {
  const options = parseOptions([
    '--yes',
    '--timezone',
    'UTC',
    '--channel',
    '@team',
    '--role-pack',
    'minji',
    '--on-existing',
    'update',
    '--preflight',
    '--json-errors'
  ]);

  assert.equal(options.timezone, 'UTC');
  assert.equal(options.channel, '@team');
  assert.equal(options.rolePack, 'minji');
  assert.equal(options.onExisting, 'update');
  assert.equal(options.preflightOnly, true);
  assert.equal(options.jsonErrors, true);
});

test('resolveOnExistingMode prompts when skill already exists and defaults to update', async () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-existing-mode-'));
  const skillDir = path.join(tmpHome, 'skills', 'clawpilot-productivity');
  fs.mkdirSync(skillDir, { recursive: true });

  try {
    const options = parseOptions([]);
    let promptCalled = 0;
    const mode = await resolveOnExistingMode({
      options,
      openClawHome: tmpHome,
      promptFn: async () => {
        promptCalled += 1;
        return '';
      },
      isInteractive: true
    });

    assert.equal(mode, 'update');
    assert.equal(options.onExisting, 'update');
    assert.equal(promptCalled, 1);
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('resolveOnExistingMode keeps error mode in --yes when skill already exists', async () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-existing-mode-'));
  const skillDir = path.join(tmpHome, 'skills', 'clawpilot-productivity');
  fs.mkdirSync(skillDir, { recursive: true });

  try {
    const options = parseOptions(['--yes']);
    const mode = await resolveOnExistingMode({
      options,
      openClawHome: tmpHome,
      promptFn: async () => {
        throw new Error('prompt should not run in --yes mode');
      }
    });

    assert.equal(mode, 'error');
    assert.equal(options.onExisting, 'error');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('resolveOnExistingMode rejects invalid interactive choice', async () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-existing-mode-'));
  const skillDir = path.join(tmpHome, 'skills', 'clawpilot-productivity');
  fs.mkdirSync(skillDir, { recursive: true });

  try {
    const options = parseOptions([]);
    await assert.rejects(
      resolveOnExistingMode({
        options,
        openClawHome: tmpHome,
        promptFn: async () => 'bad-mode',
        isInteractive: true
      }),
      (error) => error && error.code === 'invalid_on_existing_mode'
    );
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});
