const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TROUBLESHOOTING_DOC = 'docs/troubleshooting.md';
const MIN_OPENCLAW_VERSION = '1.0.0';
const SKILL_ID = 'clawpilot-productivity';

function createIssue(code, reason, fix) {
  return {
    code,
    reason,
    fix,
    docs: TROUBLESHOOTING_DOC
  };
}

function createWarning(code, reason, fix) {
  return {
    code,
    reason,
    fix,
    docs: TROUBLESHOOTING_DOC
  };
}

function parseSemver(text) {
  const match = String(text || '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: match[0]
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

function runCommand(commandRunner, command, args) {
  try {
    return commandRunner(command, args, { encoding: 'utf8' });
  } catch (error) {
    return {
      status: 1,
      error
    };
  }
}

function checkOpenClaw({ commandRunner }) {
  const result = runCommand(commandRunner, 'openclaw', ['--version']);
  const output = `${result.stdout || ''} ${result.stderr || ''}`.trim();
  const errorCode = result.error && result.error.code;

  if (result.status === 0) {
    const parsed = parseSemver(output);
    const min = parseSemver(MIN_OPENCLAW_VERSION);
    if (parsed && min && compareSemver(parsed, min) < 0) {
      return {
        ok: false,
        issue: createIssue(
          'openclaw_version_unsupported',
          `OpenClaw version ${parsed.raw} is below required ${MIN_OPENCLAW_VERSION}.`,
          `Upgrade OpenClaw to ${MIN_OPENCLAW_VERSION} or newer.`
        )
      };
    }

    if (!parsed) {
      return {
        ok: true,
        detail: output || 'openclaw version check passed',
        warning: createWarning(
          'openclaw_version_unknown',
          'OpenClaw version output could not be parsed.',
          'Run openclaw --version and verify it reports semantic version (x.y.z).'
        )
      };
    }

    return {
      ok: true,
      detail: output || 'openclaw version check passed'
    };
  }

  if (errorCode === 'ENOENT' || /not found|is not recognized/i.test(output)) {
    return {
      ok: false,
      issue: createIssue(
        'gateway_missing',
        'openclaw CLI not found.',
        'Install OpenClaw CLI and verify with: openclaw --version'
      )
    };
  }

  return {
    ok: false,
    issue: createIssue(
      'gateway_unreachable',
      output || 'openclaw CLI check failed.',
      'Run openclaw --version and fix environment PATH or shell profile.'
    )
  };
}

function checkWritableDirectory({ fsOps, dirPath, code, label }) {
  try {
    fsOps.mkdirSync(dirPath, { recursive: true });
    return { ok: true, detail: `${label} writable` };
  } catch (error) {
    return {
      ok: false,
      issue: createIssue(
        code,
        `${label} is not writable: ${dirPath}`,
        `Grant write access to ${dirPath} or use --home <path> with writable location.`
      )
    };
  }
}

function checkConfig({ fsOps, configPath }) {
  if (!fsOps.existsSync(configPath)) {
    return {
      ok: true,
      detail: 'openclaw.json will be created',
      config: {}
    };
  }

  try {
    const config = JSON.parse(fsOps.readFileSync(configPath, 'utf8'));
    return {
      ok: true,
      detail: 'openclaw.json is valid JSON',
      config
    };
  } catch {
    return {
      ok: false,
      issue: createIssue(
        'config_invalid_json',
        'openclaw.json is not valid JSON.',
        'Fix JSON syntax in openclaw.json before running install.'
      )
    };
  }
}

function checkGatewayReadiness({ config, env }) {
  const entry = config?.skills?.entries?.[SKILL_ID];
  if (!entry) {
    return {
      ok: true,
      detail: 'clawpilot config entry not found yet'
    };
  }

  if (entry.delivery?.mode && entry.delivery.mode !== 'openclaw-gateway') {
    return {
      ok: true,
      detail: `delivery mode is ${entry.delivery.mode}`
    };
  }

  const warnings = [];
  if (!entry.delivery?.channel) {
    warnings.push(
      createWarning(
        'delivery_channel_missing',
        'Gateway delivery channel is not configured.',
        'Set delivery.channel in openclaw.json or pass --channel during install/run.'
      )
    );
  }

  const hasToken = Boolean(
    env?.OPENCLAW_GATEWAY_TOKEN ||
    entry.env?.OPENCLAW_GATEWAY_TOKEN ||
    entry.delivery?.token
  );
  if (!hasToken) {
    warnings.push(
      createWarning(
        'gateway_token_missing',
        'Gateway token source is not configured.',
        'Set OPENCLAW_GATEWAY_TOKEN env var or configure token in OpenClaw settings.'
      )
    );
  }

  return {
    ok: true,
    detail: 'gateway delivery readiness checked',
    warnings
  };
}

function runPreflight({
  openClawHome,
  commandRunner = spawnSync,
  fsOps = fs,
  env = process.env
}) {
  if (!openClawHome) {
    throw new Error('openClawHome is required for preflight checks.');
  }

  const skillsDir = path.join(openClawHome, 'skills');
  const workspaceDir = path.join(openClawHome, 'workspace');
  const configPath = path.join(openClawHome, 'openclaw.json');

  const configCheck = checkConfig({ fsOps, configPath });
  const checks = [
    { name: 'openclaw_cli', ...checkOpenClaw({ commandRunner }) },
    {
      name: 'openclaw_home_writable',
      ...checkWritableDirectory({
        fsOps,
        dirPath: openClawHome,
        code: 'permission_denied',
        label: 'OpenClaw home'
      })
    },
    {
      name: 'skills_dir_writable',
      ...checkWritableDirectory({
        fsOps,
        dirPath: skillsDir,
        code: 'permission_denied',
        label: 'OpenClaw skills directory'
      })
    },
    {
      name: 'workspace_dir_writable',
      ...checkWritableDirectory({
        fsOps,
        dirPath: workspaceDir,
        code: 'permission_denied',
        label: 'OpenClaw workspace directory'
      })
    },
    { name: 'openclaw_config', ...configCheck },
    {
      name: 'gateway_config_readiness',
      ...checkGatewayReadiness({ config: configCheck.config, env })
    }
  ];

  const issues = checks.filter((check) => !check.ok).map((check) => check.issue);
  const warnings = checks
    .flatMap((check) => {
      const entries = [];
      if (check.warning) {
        entries.push(check.warning);
      }
      if (Array.isArray(check.warnings)) {
        entries.push(...check.warnings);
      }
      return entries;
    });

  return {
    ok: issues.length === 0,
    checks,
    issues,
    warnings
  };
}

module.exports = {
  MIN_OPENCLAW_VERSION,
  runPreflight,
  TROUBLESHOOTING_DOC
};
