const test = require('node:test');
const assert = require('node:assert/strict');

const { buildWeeklyReport } = require('../src/runtime/weekly-report');

test('buildWeeklyReport returns completion ratio and top blockers', () => {
  const report = buildWeeklyReport({
    days: {
      '2026-02-10': {
        tasks: [{ status: 'done' }, { status: 'blocked' }]
      },
      '2026-02-11': {
        tasks: [{ status: 'done' }, { status: 'deferred' }]
      }
    }
  });

  assert.equal(report.completionRate, '50%');
  assert.match(report.summary, /Blocked/);
});
