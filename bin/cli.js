#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { runPreflight, TROUBLESHOOTING_DOC } = require('../src/preflight');
const { installSkill, DEFAULT_SCHEDULE, SKILL_ID } = require('../src/install');

const SCHEDULE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ON_EXISTING_MODES = ['error', 'update', 'skip', 'reinstall'];
const KNOWN_COMMANDS = ['install', 'run', 'init', 'doctor'];
const DEFAULT_INIT_PROMPTS = {
  rolePack: 'hana',
  schedule: { ...DEFAULT_SCHEDULE },
  onExisting: 'update'
};

function printHelp({ advanced = false } = {}) {
  console.log('clawpilot - OpenClaw productivity copilot');
  console.log('');
  console.log('Usage:');
  console.log('  clawpilot install [options]');
  console.log('  clawpilot init [options]');
  console.log('  clawpilot run [options]');
  console.log('  clawpilot doctor [options]');
  console.log('  clawpilot --help [--advanced]');
  console.log('');
  console.log('Commands:');
  console.log('  install    Install clawpilot-productivity skill into OpenClaw');
  console.log('  init       Interactive first-time setup and install');
  console.log('  run        Run productivity runtime command');
  console.log('  doctor     Run environment diagnostics (preflight only)');
  console.log('');
  console.log('Common options:');
  console.log('  --yes               Non-interactive mode (fail if required input is missing)');
  console.log('  --command <name>    Runtime command (morning|midday|evening|report)');
  console.log('  --channel <target>  Channel target (run) and default delivery channel (install)');
  console.log('  --dry-run           Return payload only, do not send');
  console.log('  --preflight         Run environment checks only (no install changes)');
  console.log('  --role-pack <name>  Role pack id (run) and default role pack (install)');
  console.log('  --json-errors       Output machine-readable JSON errors to stderr');
  console.log('  --help, -h          Show help');
  console.log('  --advanced          Show advanced options (with --help)');

  if (!advanced) {
    return;
  }

  console.log('');
  console.log('Advanced options:');
  console.log('  --home <path>       Override OpenClaw home directory');
  console.log('  --force             Replace existing clawpilot skill installation');
  console.log('  --timezone <IANA>   Timezone override (e.g. Asia/Taipei, UTC)');
  console.log(`  --morning <HH:mm>   Morning check-in time (default: ${DEFAULT_SCHEDULE.morning})`);
  console.log(`  --midday <HH:mm>    Midday check-in time (default: ${DEFAULT_SCHEDULE.midday})`);
  console.log(`  --evening <HH:mm>   Evening check-in time (default: ${DEFAULT_SCHEDULE.evening})`);
  console.log('  --task <text>       Task item (repeatable for morning)');
  console.log('  --status <value>    Status item (repeatable for midday)');
  console.log('  --state-file <path> Runtime state file override');
  console.log('  --on-existing <mode> Existing install policy (error|update|skip|reinstall)');
}

function createCliError(code, reason, fix, docs = TROUBLESHOOTING_DOC) {
  const error = new Error(reason);
  error.code = code;
  error.reason = reason;
  error.fix = fix;
  error.docs = docs;
  return error;
}

function normalizeCliError(error) {
  if (error && typeof error === 'object' && error.code && error.reason) {
    return {
      code: error.code,
      reason: error.reason,
      fix: error.fix || 'See troubleshooting guide.',
      docs: error.docs || TROUBLESHOOTING_DOC
    };
  }

  const message = error && error.message ? error.message : String(error || 'Unknown error');

  if (/channel is required/i.test(message)) {
    return {
      code: 'channel_required',
      reason: 'Channel is required for non-dry-run delivery.',
      fix: 'Re-run with --channel <target> or use --dry-run.',
      docs: TROUBLESHOOTING_DOC
    };
  }

  if (/unsupported runtime command/i.test(message)) {
    return {
      code: 'invalid_command',
      reason: message,
      fix: 'Use one of: morning, midday, evening, report.',
      docs: TROUBLESHOOTING_DOC
    };
  }

  return {
    code: 'unknown',
    reason: message,
    fix: 'Inspect the error details and troubleshooting guide.',
    docs: TROUBLESHOOTING_DOC
  };
}

function printCliError(error, useJsonErrors) {
  const normalized = normalizeCliError(error);
  if (useJsonErrors) {
    process.stderr.write(`${JSON.stringify(normalized)}\n`);
    return;
  }

  console.error(`${normalized.code}: ${normalized.reason}`);
  console.error(`Fix: ${normalized.fix}`);
  if (normalized.docs) {
    console.error(`Docs: ${normalized.docs}`);
  }
}

function printPreflightSummary(summary, useJsonErrors) {
  const issues = Array.isArray(summary.issues) ? summary.issues : [];
  const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];
  if (useJsonErrors) {
    process.stdout.write(`${JSON.stringify({ ...summary, issues, warnings })}\n`);
    return;
  }

  console.log('Preflight summary');
  console.log(`- ok: ${summary.ok}`);
  if (issues.length > 0) {
    console.log('- issues:');
    for (const issue of issues) {
      console.log(`  - [${issue.code}] ${issue.reason}`);
      console.log(`    fix: ${issue.fix}`);
    }
  }
  if (warnings.length > 0) {
    console.log('- warnings:');
    for (const warning of warnings) {
      console.log(`  - [${warning.code}] ${warning.reason}`);
      console.log(`    fix: ${warning.fix}`);
    }
  }
}

function isValidOnExistingMode(value) {
  return ON_EXISTING_MODES.includes(value);
}

function normalizeOnExistingChoice(choice) {
  const normalized = (choice || '').trim().toLowerCase();
  if (!normalized) {
    return 'update';
  }
  if (normalized === '1') {
    return 'update';
  }
  if (normalized === '2') {
    return 'skip';
  }
  if (normalized === '3') {
    return 'reinstall';
  }
  return normalized;
}

function readValueArg(args, index, flagName, missingValueFlags) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    missingValueFlags.push(flagName);
    return { value: undefined, nextIndex: index };
  }
  return { value, nextIndex: index + 1 };
}

function parseGlobalArgs(args) {
  const helpRequested = args.includes('--help') || args.includes('-h') || args[0] === 'help';
  const advancedHelp = args.includes('--advanced');
  const filtered = args.filter((arg) => !['--help', '-h', '--advanced'].includes(arg));
  const firstArg = filtered[0];

  if (!firstArg || firstArg.startsWith('--')) {
    return {
      helpRequested,
      advancedHelp,
      command: 'install',
      commandArgs: filtered,
      unknownCommand: false
    };
  }

  if (KNOWN_COMMANDS.includes(firstArg)) {
    return {
      helpRequested,
      advancedHelp,
      command: firstArg,
      commandArgs: filtered.slice(1),
      unknownCommand: false
    };
  }

  if (firstArg === 'help') {
    return {
      helpRequested: true,
      advancedHelp,
      command: 'install',
      commandArgs: filtered.slice(1),
      unknownCommand: false
    };
  }

  return {
    helpRequested,
    advancedHelp,
    command: firstArg,
    commandArgs: filtered.slice(1),
    unknownCommand: true
  };
}

function parseOptions(args) {
  const options = {
    force: false,
    yes: false,
    jsonErrors: false,
    schedule: {},
    missingValueFlags: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--yes') {
      options.yes = true;
      continue;
    }
    if (arg === '--json-errors') {
      options.jsonErrors = true;
      continue;
    }
    if (arg === '--preflight') {
      options.preflightOnly = true;
      continue;
    }
    if (arg === '--home') {
      const { value, nextIndex } = readValueArg(args, index, '--home', options.missingValueFlags);
      options.openClawHome = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--timezone') {
      const { value, nextIndex } = readValueArg(args, index, '--timezone', options.missingValueFlags);
      options.timezone = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--morning') {
      const { value, nextIndex } = readValueArg(args, index, '--morning', options.missingValueFlags);
      options.schedule.morning = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--midday') {
      const { value, nextIndex } = readValueArg(args, index, '--midday', options.missingValueFlags);
      options.schedule.midday = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--evening') {
      const { value, nextIndex } = readValueArg(args, index, '--evening', options.missingValueFlags);
      options.schedule.evening = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--channel') {
      const { value, nextIndex } = readValueArg(args, index, '--channel', options.missingValueFlags);
      options.channel = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--role-pack') {
      const { value, nextIndex } = readValueArg(args, index, '--role-pack', options.missingValueFlags);
      options.rolePack = value;
      index = nextIndex;
      continue;
    }
    if (arg === '--on-existing') {
      const { value, nextIndex } = readValueArg(args, index, '--on-existing', options.missingValueFlags);
      options.onExisting = value;
      index = nextIndex;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parseDoctorOptions(args) {
  const options = {
    jsonErrors: false,
    missingValueFlags: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json-errors') {
      options.jsonErrors = true;
      continue;
    }
    if (arg === '--home') {
      const { value, nextIndex } = readValueArg(args, index, '--home', options.missingValueFlags);
      options.openClawHome = value;
      index = nextIndex;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.missingValueFlags.length > 0) {
    throw new Error(`${options.missingValueFlags[0]} requires a value.`);
  }
  delete options.missingValueFlags;
  return options;
}

function parseRunOptions(args) {
  const options = {
    command: 'morning',
    dryRun: false,
    jsonErrors: false,
    channel: null,
    tasks: [],
    statuses: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--json-errors') {
      options.jsonErrors = true;
      continue;
    }
    if (arg === '--command') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--command requires a value.');
      }
      options.command = next;
      index += 1;
      continue;
    }
    if (arg === '--channel') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--channel requires a value.');
      }
      options.channel = next;
      index += 1;
      continue;
    }
    if (arg === '--task') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--task requires a value.');
      }
      options.tasks.push(next);
      index += 1;
      continue;
    }
    if (arg === '--status') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--status requires a value.');
      }
      options.statuses.push(next);
      index += 1;
      continue;
    }
    if (arg === '--role-pack') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--role-pack requires a value.');
      }
      options.rolePack = next;
      index += 1;
      continue;
    }
    if (arg === '--state-file') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--state-file requires a value.');
      }
      options.stateFile = next;
      index += 1;
      continue;
    }
    if (arg === '--timezone') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--timezone requires a value.');
      }
      options.timezone = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function validateSchedule(schedule) {
  for (const [key, value] of Object.entries(schedule)) {
    if (!SCHEDULE_PATTERN.test(value)) {
      throw new Error(`Invalid ${key} time "${value}". Use HH:mm (24-hour format).`);
    }
  }
}

async function resolveMissingValues(options) {
  const missing = [...new Set(options.missingValueFlags)];
  if (missing.length === 0) {
    return;
  }

  if (options.yes) {
    throw new Error(`${missing[0]} requires a value when --yes is set.`);
  }

  if (!process.stdin.isTTY) {
    throw new Error(`${missing[0]} requires a value. Re-run with ${missing[0]} <value> or use interactive terminal.`);
  }

  for (const flag of missing) {
    if (flag === '--home') {
      options.openClawHome = await prompt('OpenClaw home path: ');
      continue;
    }
    if (flag === '--timezone') {
      options.timezone = await prompt('Timezone (e.g. UTC, Asia/Taipei): ');
      continue;
    }
    if (flag === '--morning') {
      options.schedule.morning = await prompt('Morning check-in time (HH:mm): ');
      continue;
    }
    if (flag === '--midday') {
      options.schedule.midday = await prompt('Midday check-in time (HH:mm): ');
      continue;
    }
    if (flag === '--evening') {
      options.schedule.evening = await prompt('Evening check-in time (HH:mm): ');
      continue;
    }
    if (flag === '--channel') {
      options.channel = await prompt('Default delivery channel (optional, press Enter to skip): ');
      continue;
    }
    if (flag === '--role-pack') {
      options.rolePack = await prompt('Default role pack (hana|minji, Enter for hana): ');
      continue;
    }
    if (flag === '--on-existing') {
      options.onExisting = await prompt('Existing install policy (error|update|skip|reinstall): ');
      continue;
    }
    throw new Error(`${flag} requires a value.`);
  }
}

async function resolveOnExistingMode({
  options,
  openClawHome,
  promptFn = prompt,
  fsOps = fs,
  pathOps = path,
  isInteractive = process.stdin.isTTY
}) {
  if (options.onExisting) {
    return options.onExisting;
  }

  const skillDir = pathOps.join(openClawHome, 'skills', SKILL_ID);
  if (!fsOps.existsSync(skillDir)) {
    options.onExisting = 'error';
    return options.onExisting;
  }

  if (options.yes || !isInteractive) {
    options.onExisting = 'error';
    return options.onExisting;
  }

  const answer = await promptFn(
    `Existing installation found at ${skillDir}. Choose mode [1:update, 2:skip, 3:reinstall] (default: update): `
  );
  const mode = normalizeOnExistingChoice(answer);
  if (!['update', 'skip', 'reinstall'].includes(mode)) {
    throw createCliError(
      'invalid_on_existing_mode',
      `Invalid existing install mode "${answer}".`,
      'Choose update, skip, reinstall (or 1/2/3).'
    );
  }

  options.onExisting = mode;
  return options.onExisting;
}

async function resolveInitPrompts(options, { promptFn = prompt, isInteractive = process.stdin.isTTY } = {}) {
  if (options.yes || !isInteractive) {
    if (!options.rolePack) {
      options.rolePack = DEFAULT_INIT_PROMPTS.rolePack;
    }
    if (!options.onExisting) {
      options.onExisting = DEFAULT_INIT_PROMPTS.onExisting;
    }
    return;
  }

  if (!options.channel) {
    const channelAnswer = await promptFn('Default delivery channel (optional, press Enter to skip): ');
    if (channelAnswer) {
      options.channel = channelAnswer;
    }
  }

  if (!options.rolePack) {
    const rolePackAnswer = await promptFn(`Default role pack (hana|minji, default: ${DEFAULT_INIT_PROMPTS.rolePack}): `);
    options.rolePack = rolePackAnswer || DEFAULT_INIT_PROMPTS.rolePack;
  }

  for (const key of ['morning', 'midday', 'evening']) {
    if (options.schedule[key]) {
      continue;
    }
    const defaultValue = DEFAULT_INIT_PROMPTS.schedule[key];
    const answer = await promptFn(
      `${key.charAt(0).toUpperCase()}${key.slice(1)} check-in time (HH:mm, default: ${defaultValue}): `
    );
    options.schedule[key] = answer || defaultValue;
  }

  if (!options.onExisting) {
    const onExistingAnswer = await promptFn(
      `Existing install policy (update|skip|reinstall, default: ${DEFAULT_INIT_PROMPTS.onExisting}): `
    );
    options.onExisting = normalizeOnExistingChoice(onExistingAnswer || DEFAULT_INIT_PROMPTS.onExisting);
  }
}

function resolveTimezone(options) {
  return options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function resolveOpenClawHome(homeOverride) {
  return homeOverride || process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');
}

function resolvePreflightSummary(openClawHome) {
  if (process.env.CLAWPILOT_TEST_FORCE_PREFLIGHT_FAIL === '1') {
    return {
      ok: false,
      checks: [],
      issues: [
        {
          code: 'gateway_missing',
          reason: 'openclaw CLI not found.',
          fix: 'Install OpenClaw CLI and verify with: openclaw --version',
          docs: TROUBLESHOOTING_DOC
        }
      ]
    };
  }
  if (process.env.CLAWPILOT_SKIP_PREFLIGHT === '1') {
    return { ok: true, checks: [], issues: [], warnings: [] };
  }
  return runPreflight({ openClawHome });
}

function printPreflightWarnings(summary, useJsonErrors) {
  if (useJsonErrors || !Array.isArray(summary.warnings) || summary.warnings.length === 0) {
    return;
  }
  for (const warning of summary.warnings) {
    console.error(`warning ${warning.code}: ${warning.reason}`);
    console.error(`fix: ${warning.fix}`);
  }
}

async function runInstallCommand(commandArgs, { initMode = false } = {}) {
  const projectRoot = path.resolve(__dirname, '..');
  const options = parseOptions(commandArgs);
  await resolveMissingValues(options);

  if (initMode) {
    await resolveInitPrompts(options);
  }

  validateSchedule(options.schedule);

  let timezone = resolveTimezone(options);
  if (!timezone) {
    if (options.yes) {
      throw new Error('Timezone could not be detected. Provide --timezone <IANA name>.');
    }
    timezone = await prompt('Timezone (e.g. UTC, Asia/Taipei): ');
  }
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone "${timezone}". Use a valid IANA timezone like UTC or Asia/Taipei.`);
  }

  const openClawHome = resolveOpenClawHome(options.openClawHome);
  if (options.onExisting) {
    options.onExisting = normalizeOnExistingChoice(options.onExisting);
  }
  if (!options.onExisting) {
    if (initMode) {
      options.onExisting = DEFAULT_INIT_PROMPTS.onExisting;
    } else {
      await resolveOnExistingMode({ options, openClawHome });
    }
  }

  if (options.onExisting && !isValidOnExistingMode(options.onExisting)) {
    throw createCliError(
      'invalid_on_existing_mode',
      `Invalid --on-existing value "${options.onExisting}".`,
      'Use one of: error, update, skip, reinstall.'
    );
  }

  const preflightSummary = resolvePreflightSummary(openClawHome);
  if (options.preflightOnly) {
    printPreflightSummary(preflightSummary, options.jsonErrors);
    if (!preflightSummary.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (!preflightSummary.ok) {
    const issue = preflightSummary.issues[0];
    throw createCliError(issue.code, issue.reason, issue.fix, issue.docs);
  }
  printPreflightWarnings(preflightSummary, options.jsonErrors);

  const result = await installSkill({
    openClawHome,
    packageRoot: projectRoot,
    schedule: options.schedule,
    force: options.force,
    timezone,
    channel: options.channel,
    rolePack: options.rolePack,
    onExisting: options.onExisting
  });

  if (result.action === 'skip') {
    console.log(`Skipped installation; existing skill kept at: ${result.skillDir}`);
    console.log(`Config remains at: ${result.configPath}`);
    return;
  }

  const installVerb = result.action === 'update' ? 'Updated' : 'Installed';
  console.log(`${installVerb} skill at: ${result.skillDir}`);
  console.log(`Updated config at: ${result.configPath}`);
  console.log(`Updated workspace SOUL at: ${result.workspaceSoulPath}`);
  console.log(`Updated workspace identity at: ${result.identityPath}`);
  if (initMode) {
    console.log('Init complete. Next: clawpilot run --command morning --dry-run');
    return;
  }
  console.log('Next: run openclaw and start your morning Top-3 planning check-in.');
}

async function runDoctorCommand(commandArgs) {
  const options = parseDoctorOptions(commandArgs);
  const openClawHome = resolveOpenClawHome(options.openClawHome);
  const summary = resolvePreflightSummary(openClawHome);
  printPreflightSummary(summary, options.jsonErrors);
  if (!summary.ok) {
    process.exitCode = 1;
  }
}

async function runRuntimeCommand(commandArgs) {
  const runtime = require('../src/runtime');
  const projectRoot = path.resolve(__dirname, '..');
  const runOptions = parseRunOptions(commandArgs);
  const openClawHome = resolveOpenClawHome();
  const payload = await runtime.runRuntimeCommand({
    ...runOptions,
    openClawHome,
    packageRoot: projectRoot
  });
  console.log(JSON.stringify(payload));
}

async function main() {
  const invocation = parseGlobalArgs(process.argv.slice(2));
  if (invocation.helpRequested) {
    printHelp({ advanced: invocation.advancedHelp });
    return;
  }

  if (invocation.unknownCommand) {
    console.error(`Unknown command: ${invocation.command}`);
    console.error('Run "clawpilot --help" for usage.');
    process.exitCode = 1;
    return;
  }

  if (invocation.command === 'run') {
    await runRuntimeCommand(invocation.commandArgs);
    return;
  }
  if (invocation.command === 'doctor') {
    await runDoctorCommand(invocation.commandArgs);
    return;
  }
  if (invocation.command === 'init') {
    await runInstallCommand(invocation.commandArgs, { initMode: true });
    return;
  }
  await runInstallCommand(invocation.commandArgs, { initMode: false });
}

if (require.main === module) {
  main().catch((error) => {
    const useJsonErrors = process.argv.includes('--json-errors');
    printCliError(error, useJsonErrors);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_INIT_PROMPTS,
  createCliError,
  normalizeCliError,
  parseDoctorOptions,
  parseGlobalArgs,
  parseOptions,
  parseRunOptions,
  printCliError,
  printHelp,
  resolveInitPrompts,
  resolveOnExistingMode,
  printPreflightSummary
};
