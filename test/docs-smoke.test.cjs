const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('README documents run command and gateway workflow', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');

  assert.match(readme, /clawpilot run/i);
  assert.match(readme, /openclaw message send/i);
  assert.match(readme, /fictional role pack/i);
  assert.match(readme, /docs\/troubleshooting\.md/i);
  assert.match(readme, /--json-errors/i);
  assert.match(readme, /--preflight/i);
});
