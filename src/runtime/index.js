const path = require('node:path');
const { loadRolePack } = require('./role-pack');
const { loadState, saveState, ensureDayState } = require('./state-store');
const { handleMorning, handleMidday, handleEvening } = require('./productivity');
const { sendViaGateway } = require('./openclaw-gateway');

const DEFAULT_TASKS = [
  'Define top priority',
  'Complete one high-impact deliverable',
  'Share progress update'
];

function resolveStateFile({ stateFile, openClawHome }) {
  if (stateFile) {
    return path.resolve(stateFile);
  }
  if (openClawHome) {
    return path.join(openClawHome, 'workspace', 'clawpilot-runtime-state.json');
  }
  return path.resolve('.clawpilot-state.json');
}

function buildReport({ dateKey, state, assistantName }) {
  const day = ensureDayState(state, dateKey);
  const doneCount = day.tasks.filter((task) => task.status === 'done').length;
  return {
    message: `${assistantName} report: ${doneCount}/${day.tasks.length} done today. Keep momentum into tomorrow.`
  };
}

async function runRuntimeCommand(options) {
  const packageRoot = options.packageRoot || process.cwd();
  const command = options.command || 'morning';
  const rolePack = loadRolePack(packageRoot, options.rolePack || 'hana');
  const stateFilePath = resolveStateFile(options);
  const state = loadState(stateFilePath);
  const dateKey = options.dateKey || new Date().toISOString().slice(0, 10);

  const handlers = {
    morning: () =>
      handleMorning({
        dateKey,
        state,
        tasks: options.tasks && options.tasks.length > 0 ? options.tasks : DEFAULT_TASKS,
        assistantName: rolePack.name
      }),
    midday: () =>
      handleMidday({
        dateKey,
        state,
        statuses: options.statuses || []
      }),
    evening: () =>
      handleEvening({
        dateKey,
        state
      }),
    report: () =>
      buildReport({
        dateKey,
        state,
        assistantName: rolePack.name
      })
  };

  if (!handlers[command]) {
    throw new Error(`Unsupported runtime command: ${command}`);
  }

  const result = handlers[command]();
  saveState(stateFilePath, state);

  if (!options.dryRun) {
    if (!options.channel) {
      throw new Error('Channel is required when sending without --dry-run.');
    }
    sendViaGateway({
      channel: options.channel,
      message: result.message,
      media: rolePack.avatarUrl
    });
  }

  return {
    command,
    rolePack,
    message: result.message,
    channel: options.channel || null,
    stateFile: stateFilePath,
    deliveryMode: options.dryRun ? 'dry-run' : 'send'
  };
}

module.exports = {
  runRuntimeCommand
};
