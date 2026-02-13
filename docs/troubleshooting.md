# Troubleshooting

Common runtime/install failures and how to fix them quickly.

## Error Codes

- `gateway_missing`: OpenClaw CLI is unavailable.  
  Fix: install OpenClaw and verify with `openclaw --version`.
- `openclaw_version_unsupported`: OpenClaw version is below minimum required version.  
  Fix: upgrade OpenClaw to the minimum version reported by preflight.
- `openclaw_version_unknown`: OpenClaw version string could not be parsed.  
  Fix: verify `openclaw --version` outputs semantic version (`x.y.z`).
- `gateway_unreachable`: Gateway process is offline or refused connection.  
  Fix: start gateway and verify connectivity.
- `auth_invalid`: Token or gateway auth is invalid.  
  Fix: refresh auth token and retry.
- `channel_not_found`: Target channel/chat is not found.  
  Fix: verify `--channel` or `delivery.channel`.
- `permission_denied`: OS/app permission blocked send.  
  Fix: grant permissions and retry.
- `network_timeout`: DNS/network timeout while sending.  
  Fix: retry and verify network path.
- `invalid_payload`: Message payload rejected (400).  
  Fix: validate channel/message/media fields.
- `rate_limited`: Gateway/provider is throttling requests.  
  Fix: add backoff and reduce send frequency.
- `channel_required`: Non-dry-run command has no channel value.  
  Fix: pass `--channel <target>` or set `delivery.channel`.
- `delivery_channel_missing`: Config check warning for missing default channel in gateway mode.  
  Fix: set `delivery.channel` in `openclaw.json` or pass `--channel`.
- `gateway_token_missing`: Config check warning for missing gateway token source.  
  Fix: set `OPENCLAW_GATEWAY_TOKEN` env var or OpenClaw token config.

## Useful Commands

- JSON error output for automation:
  - `node bin/cli.js run --command morning --json-errors`
- Preflight summary before install:
  - `node bin/cli.js install --preflight`
  - `node bin/cli.js install --preflight --json-errors`
- Safe validation without sending:
  - `node bin/cli.js run --command morning --dry-run --timezone UTC`
- Re-run install with existing policy:
  - `node bin/cli.js install --on-existing update --yes --timezone UTC`
