const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGatewayArgs } = require('../src/runtime/openclaw-gateway');

test('buildGatewayArgs creates openclaw message send args', () => {
  const args = buildGatewayArgs({
    channel: '@team_channel',
    message: 'Daily summary',
    media: 'https://example.com/avatar.png'
  });

  assert.deepEqual(args, [
    'message',
    'send',
    '--action',
    'send',
    '--channel',
    '@team_channel',
    '--message',
    'Daily summary',
    '--media',
    'https://example.com/avatar.png'
  ]);
});
