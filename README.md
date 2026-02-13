# clawpilot

OpenClaw productivity copilot skill focused on execution workflows and Telegram delivery via OpenClaw Gateway.

## Core Capabilities

- Installs a productivity skill into OpenClaw.
- Provides runtime commands: `morning`, `midday`, `evening`, `report`.
- Stores daily task state for progress tracking and weekly summaries.
- Supports fictional K-style role packs (`hana`, `minji`).
- Sends messages through OpenClaw Gateway (`openclaw message send`).

## Quick Install

```bash
npx -y clawpilot@latest install
```

## Runtime Usage

```bash
# Installed binary style
clawpilot run --command morning --dry-run --timezone UTC --role-pack hana --task "Plan sprint" --task "Fix blocker" --task "Send update"
clawpilot run --command midday --dry-run --status done --status blocked --status deferred
clawpilot run --command evening --dry-run
clawpilot run --command report --dry-run

# Local source style
node bin/cli.js run --command morning --dry-run --timezone UTC --role-pack hana --task "Plan sprint" --task "Fix blocker" --task "Send update"
```

## Install Options

```bash
clawpilot install [options]
```

Options:
- `--home <path>`: override OpenClaw home directory
- `--force`: replace existing installation
- `--yes`: non-interactive mode
- `--timezone <IANA>`: timezone override
- `--morning <HH:mm>`: morning check-in time
- `--midday <HH:mm>`: midday check-in time
- `--evening <HH:mm>`: evening check-in time

## Run Options

```bash
clawpilot run [options]
```

Options:
- `--command <name>`: `morning|midday|evening|report`
- `--dry-run`: return payload only, do not send
- `--channel <target>`: OpenClaw channel target
- `--role-pack <name>`: `hana|minji`
- `--task <text>`: repeatable task input (morning)
- `--status <value>`: repeatable status input (midday)
- `--state-file <path>`: override runtime state file
- `--timezone <IANA>`: timezone override

## Delivery Model

- Uses OpenClaw Gateway for delivery.
- Default runtime delivery config:
  - `delivery.mode = openclaw-gateway`
  - `delivery.platform = telegram`
- Non-dry-run requires a valid channel and available OpenClaw CLI/gateway.

## Role Pack Policy

- Uses fictional role pack identities only.
- No real-person celebrity identity is used.

## OpenClaw Paths

Installer writes to:
- `~/.openclaw/skills/clawpilot-productivity/`
- `~/.openclaw/openclaw.json`
- `~/.openclaw/workspace/SOUL.md`
- `~/.openclaw/workspace/IDENTITY.md`

```bash
node bin/cli.js install --home /custom/path --yes --timezone UTC --force
```

## Development

```bash
npm test
```
