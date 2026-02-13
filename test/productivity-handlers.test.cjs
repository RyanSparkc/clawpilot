const test = require('node:test');
const assert = require('node:assert/strict');

const {
  handleMorning,
  handleMidday,
  handleEvening
} = require('../src/runtime/productivity');

test('morning/midday/evening handlers update state and return message text', () => {
  const state = { days: {} };

  const morning = handleMorning({
    dateKey: '2026-02-13',
    state,
    tasks: ['Plan sprint', 'Fix bug', 'Write update'],
    assistantName: 'Hana'
  });
  assert.match(morning.message, /Plan sprint/);

  const midday = handleMidday({
    dateKey: '2026-02-13',
    state,
    statuses: ['done', 'blocked', 'deferred']
  });
  assert.match(midday.message, /blocked/);

  const evening = handleEvening({
    dateKey: '2026-02-13',
    state
  });
  assert.match(evening.message, /tomorrow/i);
});
