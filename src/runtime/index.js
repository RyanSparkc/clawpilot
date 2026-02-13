async function runRuntimeCommand(options) {
  return {
    command: options.command,
    deliveryMode: options.dryRun ? 'dry-run' : 'send',
    channel: options.channel || null,
    message: 'placeholder'
  };
}

module.exports = {
  runRuntimeCommand
};
