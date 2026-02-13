#!/usr/bin/env node

const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { installSkill, DEFAULT_SCHEDULE } = require('../src/install');

const SCHEDULE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function printHelp() {
  console.log('clawpilot - OpenClaw productivity copilot');
  console.log('');
  console.log('Usage:');
  console.log('  clawpilot install [options]');
  console.log('  clawpilot run [options]');
  console.log('  clawpilot --help');
  console.log('');
  console.log('Commands:');
  console.log('  install    Install clawpilot-productivity skill into OpenClaw');
  console.log('  run        Run productivity runtime command');
  console.log('');
  console.log('Options:');
  console.log('  --home <path>       Override OpenClaw home directory');
  console.log('  --force             Replace existing clawpilot skill installation');
  console.log('  --yes               Non-interactive mode (fail if required input is missing)');
  console.log('  --timezone <IANA>   Timezone override (e.g. Asia/Taipei, UTC)');
  console.log(`  --morning <HH:mm>   Morning check-in time (default: ${DEFAULT_SCHEDULE.morning})`);
  console.log(`  --midday <HH:mm>    Midday check-in time (default: ${DEFAULT_SCHEDULE.midday})`);
  console.log(`  --evening <HH:mm>   Evening check-in time (default: ${DEFAULT_SCHEDULE.evening})`);
  console.log('  --command <name>    Runtime command (morning|midday|evening|report)');
  console.log('  --channel <target>  OpenClaw channel target (e.g. @channel)');
  console.log('  --dry-run           Return payload only, do not send');
  console.log('  --role-pack <name>  Role pack id (e.g. hana, minji)');
  console.log('  --task <text>       Task item (repeatable for morning)');
  console.log('  --status <value>    Status item (repeatable for midday)');
  console.log('  --state-file <path> Runtime state file override');
}

function readValueArg(args, index, flagName, missingValueFlags) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    missingValueFlags.push(flagName);
    return { value: undefined, nextIndex: index };
  }
  return { value, nextIndex: index + 1 };
}

function parseOptions(args) {
  const options = {
    force: false,
    yes: false,
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
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parseRunOptions(args) {
  const options = {
    command: 'morning',
    dryRun: false,
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
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'install';
  const commandArgs = args.slice(1);

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }

  if (command === 'run') {
    const runtime = require('../src/runtime');
    const projectRoot = path.resolve(__dirname, '..');
    const runOptions = parseRunOptions(commandArgs);
    const openClawHome = process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');
    const payload = await runtime.runRuntimeCommand({
      ...runOptions,
      openClawHome,
      packageRoot: projectRoot
    });
    console.log(JSON.stringify(payload));
    return;
  }

  if (command !== 'install') {
    console.error(`Unknown command: ${command}`);
    console.error('Run "clawpilot --help" for usage.');
    process.exitCode = 1;
    return;
  }

  const projectRoot = path.resolve(__dirname, '..');
  const options = parseOptions(commandArgs);
  await resolveMissingValues(options);
  validateSchedule(options.schedule);

  let timezone = options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (!timezone) {
    if (options.yes) {
      throw new Error('Timezone could not be detected. Provide --timezone <IANA name>.');
    }
    timezone = await prompt('Timezone (e.g. UTC, Asia/Taipei): ');
  }
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone "${timezone}". Use a valid IANA timezone like UTC or Asia/Taipei.`);
  }

  const openClawHome = options.openClawHome || process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');

  const result = await installSkill({
    openClawHome,
    packageRoot: projectRoot,
    schedule: options.schedule,
    force: options.force,
    timezone
  });

  console.log(`Installed skill at: ${result.skillDir}`);
  console.log(`Updated config at: ${result.configPath}`);
  console.log(`Updated workspace SOUL at: ${result.workspaceSoulPath}`);
  console.log(`Updated workspace identity at: ${result.identityPath}`);
  console.log('Next: run openclaw and start your morning Top-3 planning check-in.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
