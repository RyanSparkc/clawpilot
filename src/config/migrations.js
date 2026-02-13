const SKILL_ID = 'clawpilot-productivity';
const CURRENT_CONFIG_SCHEMA_VERSION = 2;

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function migrateV1ToV2(inputConfig) {
  const config = { ...asObject(inputConfig) };
  const skills = { ...asObject(config.skills) };
  const entries = { ...asObject(skills.entries) };
  const existingEntry = asObject(entries[SKILL_ID]);

  if (Object.keys(existingEntry).length > 0) {
    const runtime = { ...asObject(existingEntry.runtime) };
    const defaults = { ...asObject(runtime.defaults) };
    const schedule = { ...asObject(runtime.schedule) };

    if (existingEntry.timezone && defaults.timezone === undefined) {
      defaults.timezone = existingEntry.timezone;
    }
    if (existingEntry.rolePack && defaults.rolePack === undefined) {
      defaults.rolePack = existingEntry.rolePack;
    }
    if (Object.keys(schedule).length === 0 && existingEntry.schedule) {
      Object.assign(schedule, asObject(existingEntry.schedule));
    }

    runtime.defaults = defaults;
    runtime.schedule = schedule;
    entries[SKILL_ID] = {
      ...existingEntry,
      runtime
    };
    skills.entries = entries;
    config.skills = skills;
  }

  config.configSchemaVersion = 2;
  return config;
}

function migrateConfig(sourceConfig = {}) {
  let config = { ...asObject(sourceConfig) };
  let version = Number.isInteger(config.configSchemaVersion)
    ? config.configSchemaVersion
    : 1;

  while (version < CURRENT_CONFIG_SCHEMA_VERSION) {
    if (version === 1) {
      config = migrateV1ToV2(config);
      version = 2;
      continue;
    }
    break;
  }

  if (!Number.isInteger(config.configSchemaVersion)) {
    config.configSchemaVersion = CURRENT_CONFIG_SCHEMA_VERSION;
  }

  return config;
}

module.exports = {
  CURRENT_CONFIG_SCHEMA_VERSION,
  migrateConfig
};
