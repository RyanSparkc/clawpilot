# Publish Checklist

Use this checklist before publishing a new `clawpilot` version to npm.

1. Verify tests:
   - `npm test`
2. Verify installer behavior locally:
   - `node bin/cli.js install --home <temp-dir>`
3. Review package metadata:
   - `name`
   - `version`
   - `bin`
   - `license`
4. Confirm npm auth:
   - `npm whoami`
5. Dry-run package contents:
   - `npm pack --dry-run`
6. Publish:
   - `npm publish --access public`
7. Validate release:
   - `npm view clawpilot version`
   - `npx clawpilot@latest --help`
