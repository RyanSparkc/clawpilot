const test = require('node:test');
const assert = require('node:assert/strict');

const { formatSocialPost } = require('../src/runtime/social-formatters');

test('formatSocialPost outputs telegram style recap', () => {
  const text = formatSocialPost('telegram', {
    wins: ['Closed sprint issue', 'Published v0.2.0'],
    lesson: 'Start deep work earlier'
  });

  assert.match(text, /Closed sprint issue/);
  assert.match(text, /Start deep work earlier/);
});
