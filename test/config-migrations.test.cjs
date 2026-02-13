const test = require('node:test');
const assert = require('node:assert/strict');

const { migrateConfig, CURRENT_CONFIG_SCHEMA_VERSION } = require('../src/config/migrations');

test('migrateConfig upgrades legacy schema and preserves unknown fields', () => {
  const migrated = migrateConfig({
    configSchemaVersion: 1,
    telemetry: { enabled: false },
    customFlag: true
  });

  assert.equal(migrated.configSchemaVersion, CURRENT_CONFIG_SCHEMA_VERSION);
  assert.equal(migrated.telemetry.enabled, false);
  assert.equal(migrated.customFlag, true);
});

test('migrateConfig is idempotent', () => {
  const source = {
    configSchemaVersion: 1,
    skills: {
      entries: {
        'clawpilot-productivity': {
          delivery: {
            mode: 'openclaw-gateway',
            channel: '@test'
          }
        }
      }
    }
  };

  const first = migrateConfig(source);
  const second = migrateConfig(first);

  assert.deepEqual(second, first);
});
