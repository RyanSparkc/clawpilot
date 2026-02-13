const { spawnSync } = require('node:child_process');

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

function sendViaGateway(payload, runner = spawnSync) {
  const args = buildGatewayArgs(payload);
  const result = runner('openclaw', args, { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'openclaw send failed');
  }

  return result.stdout;
}

module.exports = {
  buildGatewayArgs,
  sendViaGateway
};
