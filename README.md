# clawpilot

OpenClaw productivity copilot installer and skill package.

## What it does

`clawpilot` installs a productivity-focused OpenClaw skill with a simple daily loop:
- Morning planning (top 3 tasks)
- Midday progress check
- Evening review and next-step setup

The installer also:
- Copies `skill/` into `~/.openclaw/skills/clawpilot-productivity`
- Adds or updates `clawpilot-productivity` under `openclaw.json`
- Injects a productivity section into `workspace/SOUL.md` (idempotent)
- Writes a default `workspace/IDENTITY.md`

## Install

```bash
npx clawpilot@latest
```

## Quick Start

```bash
# Install into default ~/.openclaw
npx -y clawpilot@latest install

# Or install with custom schedule
npx -y clawpilot@latest install --morning 08:30 --midday 13:30 --evening 21:00

# Validate CLI
npx -y clawpilot@latest --help
```

Or run locally:

```bash
npm install
npm run test
node bin/cli.js install
```

## CLI options

```bash
clawpilot install [options]
```

Options:
- `--home <path>`: Override OpenClaw home directory
- `--force`: Replace existing skill installation
- `--morning <HH:mm>`: Morning check-in time (default `09:00`)
- `--midday <HH:mm>`: Midday check-in time (default `14:00`)
- `--evening <HH:mm>`: Evening check-in time (default `21:30`)

## OpenClaw paths

By default, the installer writes to:
- `~/.openclaw/skills/clawpilot-productivity/`
- `~/.openclaw/openclaw.json`
- `~/.openclaw/workspace/SOUL.md`
- `~/.openclaw/workspace/IDENTITY.md`

You can override the target path with:

```bash
node bin/cli.js install --home /custom/path
```

## Development

```bash
npm test
```

## Publish

See `docs/PUBLISH_CHECKLIST.md`.
