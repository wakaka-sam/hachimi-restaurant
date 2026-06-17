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
addCheck('backend testable clock', 'server/src/app.mjs', ['nowProvider = () => new Date()', 'const now = nowProvider()']);
addCheck('backend daily task claim reset test', 'server/test/api.test.mjs', ['API daily task claims reset by backend date', 'TASK_ALREADY_CLAIMED', '2026-06-18:daily_sessions_3']);
addCheck('backend active session remaining time', 'server/src/app.mjs', ['serializeBusinessSession', 'remainingSeconds', 'recoveryWindowSeconds']);
addCheck('backend profile stamina recovery status', 'server/src/app.mjs', ['getStaminaRecovery', 'staminaRecovery']);
addCheck('backend blocks early settlement', 'server/src/app.mjs', ['SESSION_NOT_READY', 'getMinimumSettlementRealSeconds', 'minimumRealSeconds']);
addCheck('backend auto-settles expired active sessions', 'server/src/app.mjs', ['settleExpiredSessions', 'getExpiredActiveSessions', 'createExpiredSummary']);
addCheck('server production Cocos Web root guard', 'server/src/config.mjs', ['NODE_ENV', 'production', 'WEB_STATIC_ROOT must point to Cocos Web build output']);
addCheck('server production root guard test', 'server/test/static-client.test.mjs', ['production server config requires a Cocos Web static root', 'WEB_STATIC_ROOT must point to Cocos Web build output']);
addCheck('shared 8 percent economy growth', 'shared/game-rules.mjs', ['incomeGrowth: 1.08', 'expectedRevenue', 'upgradeCost']);
addCheck('shared stamina constants', 'shared/game-rules.mjs', ['staminaMax: 60', 'sessionStaminaCost: 10', 'sessionDurationSeconds: 90']);
addCheck('shared stamina recovery status', 'shared/game-rules.mjs', ['getStaminaRecovery', 'secondsUntilNext', 'secondsUntilFull', 'nextRecoveryAt']);
addCheck('shared business density tuning', 'shared/game-rules.mjs', ['initialCustomerCount: 2', 'maxWaitingCustomers: 4', 'prepDelaySeconds', 'eatingSeconds', 'spawnIntervalSeconds', 'moveSpeedMultiplier']);
addCheck('shared max session customer cap tests', 'server/test/game-rules.test.mjs', ['session summary validation enforces the 18 customer cap', 'too_many_customers']);
addCheck('shared performance clamp', 'shared/game-rules.mjs', ['performanceFactor', '0.75', '1.3']);
addCheck('shared speed-neutral reward tests', 'server/test/game-rules.test.mjs', ['speed mode does not change reward', "speedMode: '1x'", "speedMode: '2x'", 'performanceFactor']);
addCheck('shared non-regressing handfeel tuning', 'shared/game-rules.mjs', ['getEffectivePartStars', 'carriedStars', 'getTuning', 'maxTableSlots']);
addCheck('shared customer type reservation', 'shared/game-rules.mjs', ['CUSTOMER_TYPES', 'normalizeCustomerTypes', 'customerTypes']);
addCheck('shared task type labels', 'shared/game-rules.mjs', ['TASK_TYPE_LABELS', 'typeLabel']);
addCheck('shared task reward fields', 'shared/game-rules.mjs', ['TASK_REWARD_FIELDS', 'resolveRewardAmount', 'getTaskRewardSummary']);
addCheck('shared task reward budget tests', 'server/test/game-rules.test.mjs', ['task rewards are limited to coins and stamina', 'daily task reward budget matches the MVP band', 'getTaskRewardSummary']);
addCheck('shared daily task claim keys', 'server/test/game-rules.test.mjs', ['daily task claim keys are scoped by backend date', '2026-06-17:daily_sessions_3', '2026-06-18:daily_sessions_3']);
addCheck('server configurable Web static root', 'server/src/server.mjs', ['resolveServerConfig', 'clientRoot']);
addCheck('web four core screens', 'client/web/main.js', ["screen === 'main'", "screen === 'business'", "screen === 'upgrade'", "screen === 'tasks'"]);
addCheck('web 2x speed support', 'client/web/main.js', ["state.speedMode === '1x' ? '2x' : '1x'", "speedMode: state.speedMode", 'toggleBusinessSpeed', "game.speedMode === '1x' ? '2x' : '1x'"]);
addCheck('web blocks manual early settlement', 'client/web/main.js', ["disabled: !game.finished"]);
addCheck('web resumed session remaining time', 'client/web/main.js', ['session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds']);
addCheck('web stamina recovery display', 'client/web/main.js', ['formatStaminaLabel', 'staminaRecovery', 'secondsUntilNext']);
addCheck('web click service chain', 'client/web/main.js', ['seatCustomer', "customer.phase = 'eating'", 'collectCustomer']);
addCheck('web table countdown labels', 'client/web/main.js', ['formatSeconds', 'customer.phaseTime', 'customer.patience']);
addCheck('web initial customer wave', 'client/web/main.js', ['tuning.initialCustomerCount', 'spawnCustomer']);
addCheck('web waiting queue cap', 'client/web/main.js', ['CONSTANTS.maxWaitingCustomers', 'game.waiting.length']);
addCheck('web max session customer cap', 'client/web/main.js', ['canSpawnMoreCustomers', 'CONSTANTS.maxCustomersPerSession']);
addCheck('web floor movement tuning', 'client/web/main.js', ['getMovementAdjustedDuration', 'moveSpeedMultiplier']);
addCheck('web locked table slots', 'client/web/main.js', ['table-locked.png', 'CONSTANTS.maxTableSlots', '未解锁']);
addCheck('web normal customer type', 'client/web/main.js', ["customerType: 'normal'", 'customerTypes']);
addCheck('web business feedback', 'client/web/main.js', ['setBusinessFeedback', 'getSatisfactionPercent', '收银成功 满意', '顾客离开，连击中断']);
addCheck('web business feedback texture', 'client/web/styles.css', ['business-feedback', 'background-image: url("/textures/card.png")']);
addCheck('web task claim', 'client/web/main.js', ['/api/tasks/claim', 'claimTask']);
addCheck('web task type grouping', 'client/web/main.js', ['groupTasksByType', 'TASK_TYPE_LABELS', 'task-section']);
addCheck('web first-run guide highlights', 'client/web/main.js', ['getGuideStep', 'startBusiness', 'seatCustomer', 'serveFood', 'collectPay', 'upgradePart', 'claimTask']);
addCheck('web restaurant visual stages', 'client/web/main.js', ['restaurantBackgrounds', 'getRestaurantStageIndex', 'getRestaurantSceneAttrs', 'restaurant-bg-stage-3.png']);
addCheck('web guide textured cue', 'client/web/styles.css', ['guide-cue', 'background-image: url("/textures/card.png")', 'guide-focus']);
addCheck('cocos main controller', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['@ccclass', 'startBusiness', 'finishBusiness', 'upgradePart', 'upgradeRestaurant', 'claimTask']);
addCheck('cocos screen navigation buttons', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['mainNavButton', 'upgradeNavButton', 'taskNavButton', 'resultMainButton', 'resultUpgradeButton', 'renderNavigation']);
addCheck('cocos textured button refresh', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['TexturedButtonView', 'texturedButtons', 'renderTexturedButtons']);
addCheck('cocos first-run guide messages', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['guideLabel', 'getGuideMessage', '开始营业', '完成上菜', '领取引导任务奖励']);
addCheck('cocos in-session speed toggle', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['toggleSpeed', 'simulation.toggleSpeedMode', 'simulation.speedMode']);
addCheck('cocos blocks manual early settlement', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['finishButton.interactable = simulation.finished']);
addCheck('cocos resumed session remaining time', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['response.session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds']);
addCheck('cocos stamina recovery display', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['formatStaminaLabel', 'staminaRecovery', 'secondsUntilNext']);
addCheck('cocos restaurant visual stages', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['restaurantBackgroundSprite', 'renderRestaurantBackground', 'getRestaurantBackground']);
addCheck('cocos business feedback labels', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['satisfactionLabel', 'feedbackLabel', 'satisfactionPercent', 'lastFeedback']);
addCheck('cocos main part status views', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['PartStatusView', 'partStatusViews', 'renderPartStatus']);
addCheck('cocos locked table slots', 'client/cocos/assets/scripts/components/TableSlotView.ts', ['tableLocked', 'unlocked', '未解锁']);
addCheck('cocos table countdown labels', 'client/cocos/assets/scripts/components/TableSlotView.ts', ['formatSeconds', 'customer.phaseTime', 'customer.patience']);
addCheck('cocos business simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['seatCustomer', 'handleTablePressed', 'collectFirstReadyPay', 'getSummary']);
addCheck('cocos initial customer wave', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['initialCustomerCount', 'spawnCustomer', 'spawnIntervalSeconds']);
addCheck('cocos waiting queue cap', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['CONSTANTS.maxWaitingCustomers', 'this.waiting.length']);
addCheck('cocos max session customer cap', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['canSpawnMoreCustomers', 'CONSTANTS.maxCustomersPerSession']);
addCheck('cocos floor movement tuning', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['getMovementAdjustedDuration', 'moveSpeedMultiplier']);
addCheck('cocos normal customer type', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ["customerType: 'normal'", 'customerTypes']);
addCheck('cocos simulation speed mode toggle', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['setSpeedMode', 'toggleSpeedMode', "speedMode === '1x' ? '2x' : '1x'"]);
addCheck('cocos business feedback simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['lastFeedback', 'feedbackTimeLeft', 'averageSatisfaction', '收银成功 满意', '顾客离开，连击中断']);
addCheck('cocos api client endpoints', 'client/cocos/assets/scripts/services/ApiClient.ts', ['/api/player/profile', '/api/session/start', '/api/session/finish', '/api/upgrade/part', '/api/upgrade/restaurant', '/api/tasks/claim']);
addCheck('cocos api host resolution', 'client/cocos/assets/scripts/services/ApiClient.ts', ['PRODUCTION_API_BASE_URL', 'https://animalapi.wakaka007.cn', 'resolveBaseUrl', 'sys.isBrowser']);
addCheck('cocos texture catalog sprite frames', 'client/cocos/assets/scripts/components/TextureCatalog.ts', ['SpriteFrame', 'restaurantBackground', 'restaurantBackgrounds', 'getRestaurantBackground', 'tableEmpty', 'tableLocked', 'cashier', 'animals', 'starIcon']);
addCheck('cocos part status component', 'client/cocos/assets/scripts/components/PartStatusView.ts', ['@ccclass', 'PartStatusView', 'PART_LABELS', 'starSprites', 'starIcon']);
addCheck('cocos task type label component', 'client/cocos/assets/scripts/components/TaskItemView.ts', ['TASK_TYPE_LABELS', 'typeLabel']);
addCheck('cocos textured button component', 'client/cocos/assets/scripts/components/TexturedButtonView.ts', ['@ccclass', 'TexturedButtonView', 'buttonDisabled', 'backgroundSprite']);
addCheck('cocos scene wiring manifest referenced components', 'client/cocos/scene-wiring.json', ['HachimiRestaurantGame', 'TextureCatalog', 'TableSlotView', 'PartStatusView', 'PartUpgradeView', 'TaskItemView', 'TexturedButtonView']);
addCheck('cocos scene wiring manifest navigation buttons', 'client/cocos/scene-wiring.json', ['mainNavButton', 'upgradeNavButton', 'taskNavButton', 'resultMainButton', 'resultUpgradeButton']);
addCheck('cocos scene wiring task type labels', 'client/cocos/scene-wiring.json', ['componentProperties', 'TaskItemView', 'typeLabel']);
addCheck('documented Cocos single-client rule', 'AGENTS.md', ['Web, WeChat Mini Game, and Douyin Mini Game clients must share this Cocos codebase', 'client/web/']);
addCheck('platforms documented Cocos build outputs', 'docs/platforms.md', ['There is one production client codebase', 'Cocos Web build artifact', 'temporary debug harness']);
addCheck('platforms documented implementation source of truth', 'docs/platforms.md', ['Implementation source of truth', 'Product behavior must be implemented in `client/cocos/` first', 'without separate gameplay forks']);
addCheck('deployment documents production Web root guard', 'docs/deployment.md', ['NODE_ENV=production', 'server refuses to start unless `WEB_STATIC_ROOT` is set', 'must never point to `client/web`']);
addCheck('web debug harness forbids production root', 'client/web/README.md', ['must never be used as `WEB_STATIC_ROOT` in production', 'Cocos Web build output']);
addCheck('platforms documented api host resolution', 'docs/platforms.md', ['API Host Resolution', 'same-origin', 'https://animalapi.wakaka007.cn']);
addCheck('product documented locked table slots', 'docs/product.md', ['场景预留 5 个桌位', '未解锁桌位显示锁定贴图']);
addCheck('product documented initial customer wave', 'docs/product.md', ['开场先进入 2 位初始顾客']);
addCheck('product documented waiting queue cap', 'docs/product.md', ['等待队列最多显示 4 位顾客']);
addCheck('product documented table countdown feedback', 'docs/product.md', ['餐桌状态需要显示阶段剩余时间或耐心倒计时']);
addCheck('product documented max session customer cap', 'docs/product.md', ['每局 18 位顾客上限', '后端不可结算']);
addCheck('product documented backend stamina recovery display', 'docs/product.md', ['下一点体力倒计时', '后端返回的恢复状态']);
addCheck('product documented task type separation', 'docs/product.md', ['明确区分引导任务、每日任务、成长任务']);
addCheck('product documented daily task reset', 'docs/product.md', ['每日任务进度按后端日期刷新', '每天最多领取一次']);
addCheck('api documented task reward budget', 'docs/api.md', ['Daily task reward budget', '1 and 2 normal business revenues', '10 and 20 stamina', 'outside the MVP coin/stamina set']);

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
  'table-locked.png',
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

const requiredComponents = ['HachimiRestaurantGame', 'TextureCatalog', 'TableSlotView', 'PartStatusView', 'PartUpgradeView', 'TaskItemView'];
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

if ((sceneWiring.minimumInstances?.PartStatusView || 0) < 5) {
  fail('Cocos scene wiring manifest needs at least 5 PartStatusView rows');
}

if ((sceneWiring.minimumInstances?.TexturedButtonView || 0) < 28) {
  fail('Cocos scene wiring manifest needs at least 28 TexturedButtonView instances');
}

for (const label of ['guideLabel', 'satisfactionLabel', 'feedbackLabel']) {
  if (!sceneWiring.labels?.includes(label)) {
    fail(`Cocos scene wiring manifest missing ${label}`);
  }
}

if (!sceneWiring.sprites?.includes('restaurantBackgroundSprite')) {
  fail('Cocos scene wiring manifest missing restaurantBackgroundSprite');
}

if ((sceneWiring.minimumSpriteArrayLengths?.waitingCustomerSprites || 0) < 4) {
  fail('Cocos scene wiring manifest needs at least 4 waitingCustomerSprites');
}

for (const button of ['startButton', 'mainNavButton', 'upgradeNavButton', 'taskNavButton', 'resultMainButton', 'resultUpgradeButton']) {
  if (!sceneWiring.buttons?.includes(button)) {
    fail(`Cocos scene wiring manifest missing ${button}`);
  }
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
