import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { TASK_DEFINITIONS } from '../shared/game-rules.mjs';

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
addCheck('backend active session remaining time', 'server/src/app.mjs', ['serializeBusinessSession', 'remainingSeconds', 'recoveryWindowSeconds']);
addCheck('backend blocks early settlement', 'server/src/app.mjs', ['SESSION_NOT_READY', 'getMinimumSettlementRealSeconds', 'minimumRealSeconds']);
addCheck('shared 8 percent economy growth', 'shared/game-rules.mjs', ['incomeGrowth: 1.08', 'expectedRevenue', 'upgradeCost']);
addCheck('shared stamina constants', 'shared/game-rules.mjs', ['staminaMax: 60', 'sessionStaminaCost: 10', 'sessionDurationSeconds: 90']);
addCheck('shared performance clamp', 'shared/game-rules.mjs', ['performanceFactor', '0.75', '1.3']);
addCheck('shared non-regressing handfeel tuning', 'shared/game-rules.mjs', ['getEffectivePartStars', 'carriedStars', 'getTuning']);
addCheck('shared customer type reservation', 'shared/game-rules.mjs', ['CUSTOMER_TYPES', 'normalizeCustomerTypes', 'customerTypes']);
addCheck('server configurable Web static root', 'server/src/server.mjs', ['WEB_STATIC_ROOT', 'clientRoot']);
addCheck('web four core screens', 'client/web/main.js', ["screen === 'main'", "screen === 'business'", "screen === 'upgrade'", "screen === 'tasks'"]);
addCheck('web 2x speed support', 'client/web/main.js', ["state.speedMode === '1x' ? '2x' : '1x'", "speedMode: state.speedMode", 'toggleBusinessSpeed', "game.speedMode === '1x' ? '2x' : '1x'"]);
addCheck('web blocks manual early settlement', 'client/web/main.js', ["disabled: !game.finished"]);
addCheck('web resumed session remaining time', 'client/web/main.js', ['session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds']);
addCheck('web click service chain', 'client/web/main.js', ['seatCustomer', "customer.phase = 'eating'", 'collectCustomer']);
addCheck('web normal customer type', 'client/web/main.js', ["customerType: 'normal'", 'customerTypes']);
addCheck('web business feedback', 'client/web/main.js', ['setBusinessFeedback', 'getSatisfactionPercent', '收银成功 满意', '顾客离开，连击中断']);
addCheck('web business feedback texture', 'client/web/styles.css', ['business-feedback', 'background-image: url("/textures/card.png")']);
addCheck('web task claim', 'client/web/main.js', ['/api/tasks/claim', 'claimTask']);
addCheck('web first-run guide highlights', 'client/web/main.js', ['getGuideStep', 'startBusiness', 'seatCustomer', 'serveFood', 'collectPay', 'upgradePart', 'claimTask']);
addCheck('web restaurant visual stages', 'client/web/main.js', ['restaurantBackgrounds', 'getRestaurantStageIndex', 'getRestaurantSceneAttrs', 'restaurant-bg-stage-3.png']);
addCheck('web guide textured cue', 'client/web/styles.css', ['guide-cue', 'background-image: url("/textures/card.png")', 'guide-focus']);
addCheck('cocos main controller', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['@ccclass', 'startBusiness', 'finishBusiness', 'upgradePart', 'upgradeRestaurant', 'claimTask']);
addCheck('cocos first-run guide messages', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['guideLabel', 'getGuideMessage', '开始营业', '完成上菜', '领取引导任务奖励']);
addCheck('cocos in-session speed toggle', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['toggleSpeed', 'simulation.toggleSpeedMode', 'simulation.speedMode']);
addCheck('cocos blocks manual early settlement', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['finishButton.interactable = simulation.finished']);
addCheck('cocos resumed session remaining time', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['response.session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds']);
addCheck('cocos restaurant visual stages', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['restaurantBackgroundSprite', 'renderRestaurantBackground', 'getRestaurantBackground']);
addCheck('cocos business feedback labels', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['satisfactionLabel', 'feedbackLabel', 'satisfactionPercent', 'lastFeedback']);
addCheck('cocos business simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['seatCustomer', 'handleTablePressed', 'collectFirstReadyPay', 'getSummary']);
addCheck('cocos normal customer type', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ["customerType: 'normal'", 'customerTypes']);
addCheck('cocos simulation speed mode toggle', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['setSpeedMode', 'toggleSpeedMode', "speedMode === '1x' ? '2x' : '1x'"]);
addCheck('cocos business feedback simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['lastFeedback', 'feedbackTimeLeft', 'averageSatisfaction', '收银成功 满意', '顾客离开，连击中断']);
addCheck('cocos api client endpoints', 'client/cocos/assets/scripts/services/ApiClient.ts', ['/api/player/profile', '/api/session/start', '/api/session/finish', '/api/upgrade/part', '/api/upgrade/restaurant', '/api/tasks/claim']);
addCheck('cocos texture catalog sprite frames', 'client/cocos/assets/scripts/components/TextureCatalog.ts', ['SpriteFrame', 'restaurantBackground', 'restaurantBackgrounds', 'getRestaurantBackground', 'tableEmpty', 'cashier', 'animals', 'starIcon']);
addCheck('cocos scene wiring manifest referenced components', 'client/cocos/scene-wiring.json', ['HachimiRestaurantGame', 'TextureCatalog', 'TableSlotView', 'PartUpgradeView', 'TaskItemView']);
addCheck('documented Cocos single-client rule', 'AGENTS.md', ['Web, WeChat Mini Game, and Douyin Mini Game clients must share this Cocos codebase', 'client/web/']);
addCheck('platforms documented Cocos build outputs', 'docs/platforms.md', ['There is one production client codebase', 'Cocos Web build artifact', 'temporary debug harness']);

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
const sceneWiring = JSON.parse(await readFile('client/cocos/scene-wiring.json', 'utf8'));
const requiredTextures = [
  'restaurant-bg.png',
  'restaurant-bg-stage-1.png',
  'restaurant-bg-stage-2.png',
  'restaurant-bg-stage-3.png',
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

for (const texture of requiredTextures) {
  if (!sceneWiring.textureFiles?.includes(texture)) {
    fail(`Cocos scene wiring manifest does not include texture ${texture}`);
  }
}

const requiredComponents = ['HachimiRestaurantGame', 'TextureCatalog', 'TableSlotView', 'PartUpgradeView', 'TaskItemView'];
for (const component of requiredComponents) {
  if (!sceneWiring.requiredComponents?.includes(component)) {
    fail(`Cocos scene wiring manifest missing component ${component}`);
  }
}

for (const screen of ['mainScreen', 'businessScreen', 'upgradeScreen', 'taskScreen', 'resultScreen']) {
  if (!sceneWiring.screens?.includes(screen)) {
    fail(`Cocos scene wiring manifest missing screen ${screen}`);
  }
}

if ((sceneWiring.minimumInstances?.TaskItemView || 0) < TASK_DEFINITIONS.length) {
  fail(`Cocos scene wiring manifest needs at least ${TASK_DEFINITIONS.length} TaskItemView rows`);
}

for (const label of ['guideLabel', 'satisfactionLabel', 'feedbackLabel']) {
  if (!sceneWiring.labels?.includes(label)) {
    fail(`Cocos scene wiring manifest missing ${label}`);
  }
}

if (!sceneWiring.sprites?.includes('restaurantBackgroundSprite')) {
  fail('Cocos scene wiring manifest missing restaurantBackgroundSprite');
}

const cocosScriptFiles = await listFiles('client/cocos/assets/scripts');
if (cocosScriptFiles.length < 8) {
  fail(`expected at least 8 Cocos script files, found ${cocosScriptFiles.length}`);
}

if (failed) {
  process.exit(1);
}

console.log(`Gameplay coverage verified: ${checks.length} checks, ${requiredTextures.length} required textures, ${TASK_DEFINITIONS.length} task rows, ${cocosScriptFiles.length} Cocos scripts.`);

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
