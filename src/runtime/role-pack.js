const fs = require('node:fs');
const path = require('node:path');

function loadRolePack(packageRoot, name = 'hana') {
  const rolePackPath = path.join(packageRoot, 'templates', 'role-packs', `${name}.json`);
  return JSON.parse(fs.readFileSync(rolePackPath, 'utf8'));
}

module.exports = {
  loadRolePack
};
