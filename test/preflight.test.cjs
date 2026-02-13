const test = require('node:test');
const assert = require('node:assert/strict');

const { runPreflight, MIN_OPENCLAW_VERSION } = require('../src/preflight');

function createFsStub(overrides = {}) {
  return {
    existsSync: () => false,
    mkdirSync: () => {},
    readFileSync: () => '{}',
    ...overrides
  };
}

test('runPreflight returns gateway_missing when openclaw command is unavailable', () => {
  const summary = runPreflight({
    openClawHome: 'C:/tmp/.openclaw',
    commandRunner: () => ({ status: 1, stderr: 'not found' }),
    fsOps: createFsStub()
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.issues[0].code, 'gateway_missing');
});

test('runPreflight returns config_invalid_json when openclaw config is malformed', () => {
  const summary = runPreflight({
    openClawHome: 'C:/tmp/.openclaw',
    commandRunner: () => ({ status: 0, stdout: 'openclaw 1.0.0' }),
    fsOps: createFsStub({
      existsSync: (filePath) => filePath.endsWith('openclaw.json'),
      readFileSync: () => '{broken'
    })
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.issues[0].code, 'config_invalid_json');
});

test('runPreflight returns ok summary when checks pass', () => {
  const summary = runPreflight({
    openClawHome: 'C:/tmp/.openclaw',
    commandRunner: () => ({ status: 0, stdout: 'openclaw 1.0.0' }),
    fsOps: createFsStub()
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.issues.length, 0);
});

test('runPreflight returns openclaw_version_unsupported when version is below minimum', () => {
  const summary = runPreflight({
    openClawHome: 'C:/tmp/.openclaw',
    commandRunner: () => ({ status: 0, stdout: 'openclaw 0.0.1' }),
    fsOps: createFsStub()
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.issues[0].code, 'openclaw_version_unsupported');
  assert.match(summary.issues[0].reason, new RegExp(MIN_OPENCLAW_VERSION.replace('.', '\\.')));
});

test('runPreflight reports warning when gateway mode has no channel or token source', () => {
  const config = {
    skills: {
      entries: {
        'clawpilot-productivity': {
          delivery: {
            mode: 'openclaw-gateway'
          }
        }
      }
    }
  };

  const summary = runPreflight({
    openClawHome: 'C:/tmp/.openclaw',
    commandRunner: () => ({ status: 0, stdout: 'openclaw 1.0.0' }),
    fsOps: createFsStub({
      existsSync: (filePath) => filePath.endsWith('openclaw.json'),
      readFileSync: () => JSON.stringify(config)
    }),
    env: {}
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.warnings.some((warning) => warning.code === 'delivery_channel_missing'), true);
  assert.equal(summary.warnings.some((warning) => warning.code === 'gateway_token_missing'), true);
});
