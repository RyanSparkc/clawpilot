const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_INIT_PROMPTS,
  parseDoctorOptions,
  parseGlobalArgs,
  parseOptions,
  resolveInitPrompts
} = require('../bin/cli');

test('parseGlobalArgs keeps command context and recognizes advanced help', () => {
  const parsed = parseGlobalArgs(['run', '--help', '--advanced']);

  assert.equal(parsed.helpRequested, true);
  assert.equal(parsed.advancedHelp, true);
  assert.equal(parsed.command, 'run');
  assert.deepEqual(parsed.commandArgs, []);
});

test('parseDoctorOptions parses supported flags', () => {
  const options = parseDoctorOptions([
    '--home',
    'C:/tmp/openclaw',
    '--json-errors'
  ]);

  assert.equal(options.openClawHome, 'C:/tmp/openclaw');
  assert.equal(options.jsonErrors, true);
});

test('parseDoctorOptions rejects unknown flags', () => {
  assert.throws(
    () => parseDoctorOptions(['--timezone', 'UTC']),
    /unknown option/i
  );
});

test('resolveInitPrompts uses non-interactive defaults without prompting', async () => {
  const options = parseOptions(['--yes']);
  let promptCalls = 0;

  await resolveInitPrompts(options, {
    isInteractive: true,
    promptFn: async () => {
      promptCalls += 1;
      return '';
    }
  });

  assert.equal(promptCalls, 0);
  assert.equal(options.onExisting, 'update');
});

test('resolveInitPrompts fills missing values from prompts', async () => {
  const options = parseOptions([]);
  const answers = [
    '@team',
    '',
    '',
    '13:30',
    '',
    ''
  ];

  await resolveInitPrompts(options, {
    isInteractive: true,
    promptFn: async () => answers.shift()
  });

  assert.equal(options.channel, '@team');
  assert.equal(options.rolePack, 'hana');
  assert.equal(options.schedule.morning, DEFAULT_INIT_PROMPTS.schedule.morning);
  assert.equal(options.schedule.midday, '13:30');
  assert.equal(options.schedule.evening, DEFAULT_INIT_PROMPTS.schedule.evening);
  assert.equal(options.onExisting, 'update');
});
