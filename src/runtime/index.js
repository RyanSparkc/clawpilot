const path = require('node:path');
const fs = require('node:fs');
const { loadRolePack } = require('./role-pack');
const { loadState, saveState } = require('./state-store');
const { handleMorning, handleMidday, handleEvening } = require('./productivity');
const { sendViaGateway } = require('./openclaw-gateway');
const { buildWeeklyReport } = require('./weekly-report');
const { TROUBLESHOOTING_DOC } = require('../preflight');

const DEFAULT_TASKS = [
  'Define top priority',
  'Complete one high-impact deliverable',
  'Share progress update'
];
const SKILL_ID = 'clawpilot-productivity';

function resolveStateFile({ stateFile, openClawHome }) {
  if (stateFile) {
    return path.resolve(stateFile);
  }
  if (openClawHome) {
    return path.join(openClawHome, 'workspace', 'clawpilot-runtime-state.json');
  }
  return path.resolve('.clawpilot-state.json');
}

function readRuntimeConfig(openClawHome) {
  if (!openClawHome) {
    return {};
  }

  const configPath = path.join(openClawHome, 'openclaw.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.skills?.entries?.[SKILL_ID] || {};
  } catch {
    return {};
  }
}

function createRuntimeError(code, reason, fix) {
  const error = new Error(reason);
  error.code = code;
  error.reason = reason;
  error.fix = fix;
  error.docs = TROUBLESHOOTING_DOC;
  return error;
}

async function runRuntimeCommand(options) {
  const packageRoot = options.packageRoot || process.cwd();
  const command = options.command || 'morning';
  const runtimeConfig = readRuntimeConfig(options.openClawHome);
  const configuredRolePack = runtimeConfig.runtime?.defaults?.rolePack || runtimeConfig.rolePack || 'hana';
  const rolePack = loadRolePack(packageRoot, options.rolePack || configuredRolePack);
  const stateFilePath = resolveStateFile(options);
  const state = loadState(stateFilePath);
  const dateKey = options.dateKey || new Date().toISOString().slice(0, 10);
  const resolvedChannel = options.channel ?? runtimeConfig.delivery?.channel ?? null;

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
      {
        const report = buildWeeklyReport(state);
        return {
          message: `${rolePack.name} weekly report\n${report.summary}\nCompletion rate: ${report.completionRate}`
        };
      }
  };

  if (!handlers[command]) {
    throw new Error(`Unsupported runtime command: ${command}`);
  }

  const result = handlers[command]();
  saveState(stateFilePath, state);

  if (!options.dryRun) {
    if (!resolvedChannel) {
      throw createRuntimeError(
        'channel_required',
        'Channel is required when sending without --dry-run.',
        'Use --channel <target> or set delivery.channel in openclaw.json.'
      );
    }
    sendViaGateway({
      channel: resolvedChannel,
      message: result.message,
      media: rolePack.avatarUrl
    });
  }

  return {
    command,
    rolePack,
    message: result.message,
    channel: resolvedChannel,
    stateFile: stateFilePath,
    deliveryMode: options.dryRun ? 'dry-run' : 'send'
  };
}

module.exports = {
  runRuntimeCommand
};
