const fs = require('node:fs');
const path = require('node:path');

const SKILL_ID = 'clawpilot-productivity';
const MARKER_START = '<!-- clawpilot:productivity:start -->';
const MARKER_END = '<!-- clawpilot:productivity:end -->';
const DEFAULT_SCHEDULE = {
  morning: '09:00',
  midday: '14:00',
  evening: '21:30'
};

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
      continue;
    }
    result[key] = value;
  }
  return result;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function upsertInstalledSkill(config) {
  if (!Array.isArray(config.installedSkills)) {
    config.installedSkills = [];
  }
  if (!config.installedSkills.includes(SKILL_ID)) {
    config.installedSkills.push(SKILL_ID);
  }
}

function normalizeSchedule(schedule) {
  return {
    ...DEFAULT_SCHEDULE,
    ...(schedule || {})
  };
}

function upsertWorkspaceSoul(soulPath, injectionText) {
  const normalizedInjection = `${MARKER_START}\n${injectionText.trim()}\n${MARKER_END}`;
  const existing = fs.existsSync(soulPath)
    ? fs.readFileSync(soulPath, 'utf8')
    : '# Agent Soul\n';
  const markerRegex = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
  const cleaned = existing.replace(markerRegex, '').trimEnd();
  const nextContent = `${cleaned}\n\n${normalizedInjection}\n`;
  fs.writeFileSync(soulPath, nextContent, 'utf8');
}

function ensureSkillManifest(skillDir) {
  const manifestPath = path.join(skillDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return;
  }

  const manifest = {
    id: SKILL_ID,
    name: 'Clawpilot Productivity',
    version: '0.1.0',
    entry: 'SOUL.md'
  };
  writeJson(manifestPath, manifest);
}

async function installSkill({
  openClawHome,
  packageRoot,
  schedule,
  force = false,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}) {
  const skillsDir = path.join(openClawHome, 'skills');
  const skillDir = path.join(openClawHome, 'skills', SKILL_ID);
  const workspaceDir = path.join(openClawHome, 'workspace');
  const configPath = path.join(openClawHome, 'openclaw.json');
  const soulPath = path.join(skillDir, 'SOUL.md');
  const workspaceSoulPath = path.join(workspaceDir, 'SOUL.md');
  const identityPath = path.join(workspaceDir, 'IDENTITY.md');

  const skillSourceDir = path.join(packageRoot, 'skill');
  const templateDir = path.join(packageRoot, 'templates');
  const baseSoulTemplate = fs.readFileSync(path.join(templateDir, 'soul.productivity.md'), 'utf8');
  const injectionTemplate = fs.readFileSync(path.join(templateDir, 'soul-injection.md'), 'utf8');
  const identityTemplate = fs.readFileSync(path.join(templateDir, 'identity.md'), 'utf8');

  fs.mkdirSync(openClawHome, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  if (fs.existsSync(skillDir)) {
    if (!force) {
      throw new Error(`Skill already installed: ${skillDir}. Re-run with force to replace.`);
    }
    fs.rmSync(skillDir, { recursive: true, force: true });
  }

  if (fs.existsSync(skillSourceDir)) {
    copyDir(skillSourceDir, skillDir);
  } else {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  fs.writeFileSync(soulPath, baseSoulTemplate, 'utf8');
  ensureSkillManifest(skillDir);
  upsertWorkspaceSoul(workspaceSoulPath, injectionTemplate);
  fs.writeFileSync(identityPath, identityTemplate, 'utf8');

  let config = readJson(configPath);
  const existingEntry = (((config.skills || {}).entries || {})[SKILL_ID]) || {};
  const mergedEntry = deepMerge(existingEntry, {
    enabled: true,
    mode: 'productivity',
    timezone,
    schedule: normalizeSchedule(schedule),
    rolePack: existingEntry.rolePack || 'hana',
    delivery: {
      mode: 'openclaw-gateway',
      platform: 'telegram',
      channel: existingEntry?.delivery?.channel ?? null
    }
  });

  config = deepMerge(config, {
    skills: {
      entries: {
        [SKILL_ID]: mergedEntry
      },
      load: {
        extraDirs: Array.isArray(config.skills?.load?.extraDirs)
          ? config.skills.load.extraDirs
          : []
      }
    }
  });

  if (!config.skills.load.extraDirs.includes(skillsDir)) {
    config.skills.load.extraDirs.push(skillsDir);
  }

  upsertInstalledSkill(config);
  writeJson(configPath, config);

  return {
    skillDir,
    configPath,
    workspaceSoulPath,
    identityPath
  };
}

module.exports = {
  installSkill,
  SKILL_ID,
  DEFAULT_SCHEDULE
};
