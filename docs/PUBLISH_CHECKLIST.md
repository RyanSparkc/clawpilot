# Publish Checklist

Use this checklist before publishing a new `clawpilot` version to npm.

1. Verify tests:
   - `npm test`
2. Verify installer behavior locally:
   - `node bin/cli.js install --home <temp-dir>`
3. Verify runtime dry-run behavior:
   - `node bin/cli.js run --command morning --dry-run --timezone UTC --role-pack hana`
   - `node bin/cli.js run --command report --dry-run --timezone UTC`
4. Review package metadata:
   - `name`
   - `version`
   - `bin`
   - `license`
5. Confirm npm auth:
   - `npm whoami`
6. Dry-run package contents:
   - `npm pack --dry-run`
7. Publish:
   - `npm publish --access public`
   - If your account has publish 2FA enabled: `npm publish --access public --otp=<6-digit-code>`
8. Validate release:
   - `npm view clawpilot version`
   - `npx clawpilot@latest --help`
