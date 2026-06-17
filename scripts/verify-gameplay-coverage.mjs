import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const checks = [];
let failed = false;

function addCheck(name, file, patterns) {
  checks.push({
    name,
    file,
    patterns: patterns.map((pattern) => (pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern))))
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fail(message) {
  console.error(`Gameplay coverage violation: ${message}`);
  failed = true;
}

addCheck('backend profile endpoint', 'server/src/app.mjs', ['/api/player/profile']);
addCheck('backend session start endpoint', 'server/src/app.mjs', ['/api/session/start']);
addCheck('backend session finish endpoint', 'server/src/app.mjs', ['/api/session/finish']);
addCheck('backend part upgrade endpoint', 'server/src/app.mjs', ['/api/upgrade/part']);
addCheck('backend restaurant upgrade endpoint', 'server/src/app.mjs', ['/api/upgrade/restaurant']);
addCheck('backend task claim endpoint', 'server/src/app.mjs', ['/api/tasks/claim']);
addCheck('shared 8 percent economy growth', 'shared/game-rules.mjs', ['incomeGrowth: 1.08', 'expectedRevenue', 'upgradeCost']);
addCheck('shared stamina constants', 'shared/game-rules.mjs', ['staminaMax: 60', 'sessionStaminaCost: 10', 'sessionDurationSeconds: 90']);
addCheck('shared performance clamp', 'shared/game-rules.mjs', ['performanceFactor', '0.75', '1.3']);
addCheck('web four core screens', 'client/web/main.js', ["screen === 'main'", "screen === 'business'", "screen === 'upgrade'", "screen === 'tasks'"]);
addCheck('web 2x speed support', 'client/web/main.js', ["state.speedMode === '1x' ? '2x' : '1x'", "speedMode: state.speedMode"]);
addCheck('web click service chain', 'client/web/main.js', ['seatCustomer', "customer.phase = 'eating'", 'collectCustomer']);
addCheck('web task claim', 'client/web/main.js', ['/api/tasks/claim', 'claimTask']);
addCheck('cocos main controller', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['@ccclass', 'startBusiness', 'finishBusiness', 'upgradePart', 'upgradeRestaurant', 'claimTask']);
addCheck('cocos business simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['seatCustomer', 'handleTablePressed', 'collectFirstReadyPay', 'getSummary']);
addCheck('cocos api client endpoints', 'client/cocos/assets/scripts/services/ApiClient.ts', ['/api/player/profile', '/api/session/start', '/api/session/finish', '/api/upgrade/part', '/api/upgrade/restaurant', '/api/tasks/claim']);
addCheck('cocos texture catalog sprite frames', 'client/cocos/assets/scripts/components/TextureCatalog.ts', ['SpriteFrame', 'restaurantBackground', 'tableEmpty', 'cashier', 'animals', 'starIcon']);

for (const check of checks) {
  let source = '';
  try {
    source = await readFile(check.file, 'utf8');
  } catch (error) {
    fail(`${check.name}: cannot read ${check.file}: ${error.message}`);
    continue;
  }
  for (const pattern of check.patterns) {
    if (!pattern.test(source)) {
      fail(`${check.name}: ${check.file} missing ${pattern}`);
    }
  }
}

const textureFiles = (await readdir('client/assets/textures')).filter((file) => file.endsWith('.png')).sort();
const cocosTextures = (await readdir('client/cocos/assets/textures')).filter((file) => file.endsWith('.png')).sort();
const requiredTextures = [
  'restaurant-bg.png',
  'panel.png',
  'card.png',
  'button.png',
  'button-disabled.png',
  'table-empty.png',
  'table-ready.png',
  'table-food.png',
  'table-pay.png',
  'cashier.png',
  'customer-cat.png',
  'customer-dog.png',
  'customer-rabbit.png',
  'customer-bear.png',
  'icon-coin.png',
  'icon-stamina.png',
  'icon-star.png'
];

for (const texture of requiredTextures) {
  if (!textureFiles.includes(texture)) {
    fail(`missing Web texture ${texture}`);
  }
  if (!cocosTextures.includes(texture)) {
    fail(`missing Cocos texture ${texture}`);
  }
}

const cocosScriptFiles = await listFiles('client/cocos/assets/scripts');
if (cocosScriptFiles.length < 8) {
  fail(`expected at least 8 Cocos script files, found ${cocosScriptFiles.length}`);
}

if (failed) {
  process.exit(1);
}

console.log(`Gameplay coverage verified: ${checks.length} checks, ${requiredTextures.length} required textures, ${cocosScriptFiles.length} Cocos scripts.`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}
