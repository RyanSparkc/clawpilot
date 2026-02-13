const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { installSkill } = require('../src/install');

function makePackageFixture(root) {
  const skillDir = path.join(root, 'skill');
  const templateDir = path.join(root, 'templates');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(templateDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# skill file\n', 'utf8');
  fs.writeFileSync(path.join(templateDir, 'soul.productivity.md'), '# productivity soul\n', 'utf8');
  fs.writeFileSync(path.join(templateDir, 'soul-injection.md'), '## Clawpilot Productivity Loop\nDo work.\n', 'utf8');
  fs.writeFileSync(path.join(templateDir, 'identity.md'), '# Identity\nName: Clawpilot\n', 'utf8');
}

test('installSkill supports onExisting=skip without overwriting existing files', async () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-home-'));
  const tmpPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-pkg-'));

  try {
    makePackageFixture(tmpPkg);

    const skillDir = path.join(tmpHome, 'skills', 'clawpilot-productivity');
    fs.mkdirSync(skillDir, { recursive: true });
    const markerPath = path.join(skillDir, 'KEEP.txt');
    fs.writeFileSync(markerPath, 'keep', 'utf8');

    const result = await installSkill({
      openClawHome: tmpHome,
      packageRoot: tmpPkg,
      onExisting: 'skip'
    });

    assert.equal(result.action, 'skip');
    assert.equal(fs.readFileSync(markerPath, 'utf8'), 'keep');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(tmpPkg, { recursive: true, force: true });
  }
});

test('installSkill supports onExisting=update and keeps existing custom fields', async () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-home-'));
  const tmpPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-pkg-'));

  try {
    makePackageFixture(tmpPkg);

    await installSkill({
      openClawHome: tmpHome,
      packageRoot: tmpPkg,
      timezone: 'UTC'
    });

    const configPath = path.join(tmpHome, 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.skills.entries['clawpilot-productivity'].customField = 'keep-me';
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    const result = await installSkill({
      openClawHome: tmpHome,
      packageRoot: tmpPkg,
      onExisting: 'update',
      timezone: 'Asia/Taipei',
      rolePack: 'minji',
      channel: '@channel'
    });

    const updated = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const entry = updated.skills.entries['clawpilot-productivity'];

    assert.equal(result.action, 'update');
    assert.equal(entry.customField, 'keep-me');
    assert.equal(entry.runtime.defaults.timezone, 'Asia/Taipei');
    assert.equal(entry.runtime.defaults.rolePack, 'minji');
    assert.equal(entry.delivery.channel, '@channel');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(tmpPkg, { recursive: true, force: true });
  }
});
