#!/usr/bin/env bash
set -euo pipefail

TIMEZONE="${1:-UTC}"
SKIP_PREFLIGHT="${2:-}"
HOME_OVERRIDE="${3:-}"

if [[ -n "$HOME_OVERRIDE" ]]; then
  export OPENCLAW_HOME="$HOME_OVERRIDE"
fi

if [[ "$SKIP_PREFLIGHT" == "--skip-preflight" ]]; then
  export CLAWPILOT_SKIP_PREFLIGHT=1
fi

echo "[clawpilot] Running safe demo path (dry-run only)..."
node bin/cli.js install --yes --timezone "$TIMEZONE" --on-existing update
node bin/cli.js run --command morning --dry-run --timezone "$TIMEZONE"
echo "[clawpilot] Safe demo completed."
