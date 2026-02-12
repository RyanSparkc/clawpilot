#!/usr/bin/env node

const os = require('node:os');
const path = require('node:path');
const { installSkill, DEFAULT_SCHEDULE } = require('../src/install');

function printHelp() {
  console.log('clawpilot - OpenClaw productivity copilot');
  console.log('');
  console.log('Usage:');
  console.log('  clawpilot install [options]');
  console.log('  clawpilot --help');
  console.log('');
  console.log('Commands:');
  console.log('  install    Install clawpilot-productivity skill into OpenClaw');
  console.log('');
  console.log('Options:');
  console.log('  --home <path>       Override OpenClaw home directory');
  console.log('  --force             Replace existing clawpilot skill installation');
  console.log(`  --morning <HH:mm>   Morning check-in time (default: ${DEFAULT_SCHEDULE.morning})`);
  console.log(`  --midday <HH:mm>    Midday check-in time (default: ${DEFAULT_SCHEDULE.midday})`);
  console.log(`  --evening <HH:mm>   Evening check-in time (default: ${DEFAULT_SCHEDULE.evening})`);
}

function parseOptions(args) {
  const options = {
    force: false,
    schedule: {}
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--home') {
      options.openClawHome = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--morning') {
      options.schedule.morning = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--midday') {
      options.schedule.midday = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--evening') {
      options.schedule.evening = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'install';
  const commandArgs = args.slice(1);

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
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
  const openClawHome = options.openClawHome || process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');

  const result = await installSkill({
    openClawHome,
    packageRoot: projectRoot,
    schedule: options.schedule,
    force: options.force
  });

  console.log(`Installed skill at: ${result.skillDir}`);
  console.log(`Updated config at: ${result.configPath}`);
  console.log(`Updated workspace SOUL at: ${result.workspaceSoulPath}`);
  console.log(`Updated workspace identity at: ${result.identityPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
