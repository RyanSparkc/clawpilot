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

test('installSkill copies skill files and updates OpenClaw config/workspace', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-home-'));
  const tmpPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-pkg-'));

  try {
    makePackageFixture(tmpPkg);

    const result = await installSkill({
      openClawHome: tmpRoot,
      packageRoot: tmpPkg,
      schedule: {
        morning: '09:00',
        midday: '14:00',
        evening: '21:30'
      }
    });

    const skillDir = path.join(tmpRoot, 'skills', 'clawpilot-productivity');
    const workspaceSoulPath = path.join(tmpRoot, 'workspace', 'SOUL.md');
    const identityPath = path.join(tmpRoot, 'workspace', 'IDENTITY.md');
    const configPath = path.join(tmpRoot, 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    assert.equal(result.skillDir, skillDir);
    assert.equal(fs.existsSync(skillDir), true);
    assert.equal(fs.existsSync(path.join(skillDir, 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(skillDir, 'SOUL.md')), true);
    assert.equal(fs.existsSync(workspaceSoulPath), true);
    assert.equal(fs.existsSync(identityPath), true);
    assert.match(fs.readFileSync(workspaceSoulPath, 'utf8'), /Clawpilot Productivity Loop/);
    assert.match(fs.readFileSync(identityPath, 'utf8'), /Clawpilot/);

    assert.equal(config.skills.entries['clawpilot-productivity'].enabled, true);
    assert.equal(config.skills.entries['clawpilot-productivity'].schedule.morning, '09:00');
    assert.equal(config.skills.entries['clawpilot-productivity'].schedule.midday, '14:00');
    assert.equal(config.skills.entries['clawpilot-productivity'].schedule.evening, '21:30');
    assert.equal(config.skills.load.extraDirs.includes(path.join(tmpRoot, 'skills')), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.rmSync(tmpPkg, { recursive: true, force: true });
  }
});

test('installSkill keeps SOUL injection idempotent when run repeatedly', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-home-'));
  const tmpPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'clawpilot-pkg-'));

  try {
    makePackageFixture(tmpPkg);

    await installSkill({ openClawHome: tmpRoot, packageRoot: tmpPkg });
    await installSkill({ openClawHome: tmpRoot, packageRoot: tmpPkg, force: true });

    const workspaceSoulPath = path.join(tmpRoot, 'workspace', 'SOUL.md');
    const soulText = fs.readFileSync(workspaceSoulPath, 'utf8');
    const occurrences = (soulText.match(/Clawpilot Productivity Loop/g) || []).length;
    assert.equal(occurrences, 1);

    const configPath = path.join(tmpRoot, 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const extraDirs = config.skills.load.extraDirs;
    const skillsDir = path.join(tmpRoot, 'skills');
    const count = extraDirs.filter((dir) => dir === skillsDir).length;
    assert.equal(count, 1);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.rmSync(tmpPkg, { recursive: true, force: true });
  }
});
