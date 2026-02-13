#!/usr/bin/env bash
set -euo pipefail

CHANNEL="${1:-}"
CONFIRM="${2:-}"
TIMEZONE="${3:-UTC}"
SKIP_PREFLIGHT="${4:-}"
HOME_OVERRIDE="${5:-}"

if [[ -z "$CHANNEL" ]]; then
  echo "Usage: $0 <channel> --confirm [timezone]"
  exit 1
fi

if [[ "$CONFIRM" != "--confirm" ]]; then
  echo "Pass --confirm to enable real send."
  exit 1
fi

if [[ "$SKIP_PREFLIGHT" == "--skip-preflight" ]]; then
  export CLAWPILOT_SKIP_PREFLIGHT=1
fi

if [[ -n "$HOME_OVERRIDE" ]]; then
  export OPENCLAW_HOME="$HOME_OVERRIDE"
fi

echo "[clawpilot] Running send demo path to $CHANNEL ..."
node bin/cli.js install --yes --timezone "$TIMEZONE" --channel "$CHANNEL" --on-existing update
node bin/cli.js run --command morning --timezone "$TIMEZONE" --channel "$CHANNEL"
echo "[clawpilot] Send demo completed."
