# clawpilot

![npm version](https://img.shields.io/npm/v/clawpilot?label=npm)
![node](https://img.shields.io/badge/node-%3E%3D18-3c873a)
![license](https://img.shields.io/badge/license-MIT-blue)

Execution-first productivity copilot for OpenClaw: fast install, deterministic workflows, and actionable runtime diagnostics.

## Why Clawpilot

- Fast first success: `npx` entrypoint with no global install step.
- Two-layer CLI help: concise defaults + `--help --advanced` for full flags.
- Reliability-first installer: preflight checks + explicit existing-install behavior.
- Runtime observability: structured errors with fix hints for automation and humans.
- Brand-safe persona strategy: fictional role pack identities only (`hana`, `minji`).

## Quick Copy (First Success)

`clawpilot` is published on npm, so `npx` can run it directly.

```bash
# 1) Check environment only (no writes)
npx -y clawpilot@latest doctor

# 2) First-time setup + install
npx -y clawpilot@latest init --yes --timezone UTC --channel @your_channel

# 3) First success (dry-run, no send)
npx -y clawpilot@latest run --command morning --dry-run --timezone UTC
```

## What You Get In 5 Minutes

- Install a productivity skill into OpenClaw.
- Run `morning`, `midday`, `evening`, `report` command loops.
- Store daily state and generate weekly report summaries.
- Deliver via OpenClaw Gateway when channel is configured.

## FAQ

**Q: How do I verify the environment without changing files?**  
Use preflight mode:
`npx -y clawpilot@latest install --preflight`

**Q: Why do I get `channel_required` when running `run`?**  
Non-dry-run delivery requires a channel target. Use `--channel <target>` or set `delivery.channel` in `~/.openclaw/openclaw.json`.

**Q: I already installed before. How should I update safely?**  
Use existing-install update mode:
`npx -y clawpilot@latest install --yes --on-existing update`

**Q: Why does `--help` show fewer options now?**  
`--help` is optimized for common flows. Use `--help --advanced` for full install/runtime flags.

**Q: Why only fictional role packs like `hana` and `minji`?**  
Project policy is fictional role packs only for safer branding and compliance.

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
- `--channel <target>`: default delivery channel written to config
- `--role-pack <name>`: default role pack (`hana|minji`)
- `--on-existing <mode>`: `error|update|skip|reinstall`
- `--preflight`: run environment checks only (no install changes)
- `--json-errors`: emit machine-readable JSON to stdout/stderr
- `--morning <HH:mm>`: morning check-in time
- `--midday <HH:mm>`: midday check-in time
- `--evening <HH:mm>`: evening check-in time

## Init Command

```bash
clawpilot init [options]
```

Recommended for first-time setup. It prompts for common defaults in interactive mode, and can run non-interactive with `--yes`.

## Doctor Command

```bash
clawpilot doctor [options]
```

Options:
- `--home <path>`: override OpenClaw home directory
- `--json-errors`: emit machine-readable preflight summary

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
- `--json-errors`: emit machine-readable error JSON to stderr

## Delivery Model

- Uses OpenClaw Gateway for delivery (`openclaw message send`).
- Default runtime delivery config:
  - `delivery.mode = openclaw-gateway`
  - `delivery.platform = telegram`
- Non-dry-run requires valid channel and available OpenClaw CLI/gateway.

## Role Pack Policy

- Uses fictional role pack identities only (fictional role pack strategy).
- No real-person celebrity identity is used.

## Demo Paths

```bash
# Safe path (no real send)
pwsh ./scripts/demo-safe.ps1 -SkipPreflight -OpenClawHome C:\temp\clawpilot-demo

# Send path (requires explicit confirmation)
pwsh ./scripts/demo-send.ps1 -Channel @your_channel -Confirm -SkipPreflight -OpenClawHome C:\temp\clawpilot-demo
```

## Preflight

```bash
# Check environment only (no writes)
node bin/cli.js install --preflight

# JSON summary for automation
node bin/cli.js install --preflight --json-errors
```

## Troubleshooting

- Quick diagnostics doc: `docs/troubleshooting.md`
- Automation-friendly runtime errors:

```bash
node bin/cli.js run --command morning --json-errors
```

Example output:

```json
{"code":"channel_required","reason":"Channel is required when sending without --dry-run.","fix":"Use --channel <target> or set delivery.channel in openclaw.json.","docs":"docs/troubleshooting.md"}
```

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
