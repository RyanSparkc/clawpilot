const { spawnSync } = require('node:child_process');
const { TROUBLESHOOTING_DOC } = require('../preflight');

function buildGatewayArgs({ channel, message, media }) {
  const args = [
    'message',
    'send',
    '--action',
    'send',
    '--channel',
    channel,
    '--message',
    message
  ];

  if (media) {
    args.push('--media', media);
  }

  return args;
}

function classifyGatewayFailure(result = {}) {
  const stderr = result.stderr || '';
  const stdout = result.stdout || '';
  const errorMessage = result.error && result.error.message ? result.error.message : '';
  const errorCode = result.error && result.error.code ? result.error.code : '';
  const text = `${stderr}\n${stdout}\n${errorMessage}`.toLowerCase();

  if (errorCode === 'ENOENT' || /enoent|openclaw.*not found|is not recognized/.test(text)) {
    return {
      code: 'gateway_missing',
      reason: 'OpenClaw CLI is not available.',
      fix: 'Install OpenClaw and verify with: openclaw --version'
    };
  }

  if (/invalid token|unauthorized|forbidden|401|403|auth/.test(text)) {
    return {
      code: 'auth_invalid',
      reason: 'Gateway authentication failed.',
      fix: 'Refresh gateway token and verify channel auth settings.'
    };
  }

  if (/channel.*not found|chat.*not found|unknown channel|404/.test(text)) {
    return {
      code: 'channel_not_found',
      reason: 'Target channel was not found.',
      fix: 'Check --channel value and make sure the destination exists.'
    };
  }

  if (/permission denied|eacces/.test(text)) {
    return {
      code: 'permission_denied',
      reason: 'Permission denied while sending through gateway.',
      fix: 'Grant required permissions to the OpenClaw process and channel.'
    };
  }

  if (/gateway.*unavailable|gateway.*offline|connection refused|econnrefused/.test(text)) {
    return {
      code: 'gateway_unreachable',
      reason: 'OpenClaw gateway is not reachable.',
      fix: 'Start the gateway and verify endpoint connectivity.'
    };
  }

  if (/timed?out|etimedout|enotfound|econnreset|network/.test(text)) {
    return {
      code: 'network_timeout',
      reason: 'Network failure occurred while sending.',
      fix: 'Retry the command and verify network/DNS connectivity.'
    };
  }

  if (/invalid payload|bad request|missing required|400/.test(text)) {
    return {
      code: 'invalid_payload',
      reason: 'Gateway rejected the payload.',
      fix: 'Validate message/channel/media values before sending.'
    };
  }

  if (/rate limit|too many requests|429/.test(text)) {
    return {
      code: 'rate_limited',
      reason: 'Gateway or upstream provider rate-limited the request.',
      fix: 'Retry with backoff and reduce send frequency.'
    };
  }

  return {
    code: 'unknown',
    reason: 'Gateway send failed.',
    fix: 'Check gateway logs and troubleshooting documentation.'
  };
}

class GatewaySendError extends Error {
  constructor({ code, reason, fix, result }) {
    super(`${code}: ${reason}`);
    this.name = 'GatewaySendError';
    this.code = code;
    this.reason = reason;
    this.fix = fix;
    this.docs = TROUBLESHOOTING_DOC;
    this.status = result.status ?? null;
    this.stderr = result.stderr || '';
    this.stdout = result.stdout || '';
  }
}

function sendViaGateway(payload, runner = spawnSync) {
  const args = buildGatewayArgs(payload);
  const result = runner('openclaw', args, { encoding: 'utf8' });

  if (result.error || result.status !== 0) {
    const failure = classifyGatewayFailure(result);
    throw new GatewaySendError({
      ...failure,
      result
    });
  }

  return result.stdout;
}

module.exports = {
  buildGatewayArgs,
  classifyGatewayFailure,
  GatewaySendError,
  sendViaGateway
};
