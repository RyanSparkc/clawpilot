const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGatewayArgs,
  classifyGatewayFailure,
  sendViaGateway
} = require('../src/runtime/openclaw-gateway');

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

test('classifyGatewayFailure maps missing CLI to gateway_missing', () => {
  const failure = classifyGatewayFailure({
    status: null,
    stderr: '',
    stdout: '',
    error: { code: 'ENOENT', message: 'spawn openclaw ENOENT' }
  });

  assert.equal(failure.code, 'gateway_missing');
});

test('classifyGatewayFailure maps timeout text to network_timeout', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: 'ETIMEDOUT while connecting',
    stdout: ''
  });

  assert.equal(failure.code, 'network_timeout');
});

test('classifyGatewayFailure maps auth text to auth_invalid', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: '401 unauthorized',
    stdout: ''
  });

  assert.equal(failure.code, 'auth_invalid');
});

test('classifyGatewayFailure maps missing channel text to channel_not_found', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: 'channel not found',
    stdout: ''
  });

  assert.equal(failure.code, 'channel_not_found');
});

test('classifyGatewayFailure maps permission text to permission_denied', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: 'permission denied for send',
    stdout: ''
  });

  assert.equal(failure.code, 'permission_denied');
});

test('classifyGatewayFailure maps gateway unavailable text to gateway_unreachable', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: 'connection refused localhost:18789',
    stdout: ''
  });

  assert.equal(failure.code, 'gateway_unreachable');
});

test('classifyGatewayFailure maps bad request text to invalid_payload', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: '400 bad request missing required field',
    stdout: ''
  });

  assert.equal(failure.code, 'invalid_payload');
});

test('classifyGatewayFailure maps throttling text to rate_limited', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: '429 too many requests',
    stdout: ''
  });

  assert.equal(failure.code, 'rate_limited');
});

test('classifyGatewayFailure falls back to unknown', () => {
  const failure = classifyGatewayFailure({
    status: 1,
    stderr: 'unexpected gateway behavior',
    stdout: ''
  });

  assert.equal(failure.code, 'unknown');
});

test('sendViaGateway throws structured gateway error', () => {
  assert.throws(() => {
    sendViaGateway(
      {
        channel: '@team_channel',
        message: 'Daily summary'
      },
      () => ({ status: 1, stderr: 'invalid token' })
    );
  }, /auth_invalid/);
});
