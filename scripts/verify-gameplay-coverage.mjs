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
addCheck('backend health endpoint test', 'server/test/static-client.test.mjs', ['backend health endpoint reports service and backend time', '/api/health', 'hachimi-restaurant']);
addCheck('backend request body error tests', 'server/test/api.test.mjs', ['API rejects invalid and oversized JSON bodies', 'INVALID_JSON', 'REQUEST_TOO_LARGE']);
addCheck('backend testable clock', 'server/src/app.mjs', ['nowProvider = () => new Date()', 'const now = nowProvider()']);
addCheck('backend daily task claim reset test', 'server/test/api.test.mjs', ['API daily task claims reset by backend date', 'TASK_ALREADY_CLAIMED', '2026-06-18:daily_sessions_3']);
addCheck('backend active session remaining time', 'server/src/app.mjs', ['serializeBusinessSession', 'remainingSeconds', 'recoveryWindowSeconds']);
addCheck('backend profile stamina recovery status', 'server/src/app.mjs', ['getStaminaRecovery', 'staminaRecovery']);
addCheck('backend file-backed persistence test', 'server/test/store.test.mjs', ['persists players and sessions across reloads', 'persist-player', 'persist-session', '.tmp-']);
addCheck('backend blocks early settlement', 'server/src/app.mjs', ['SESSION_NOT_READY', 'getMinimumSettlementRealSeconds', 'minimumRealSeconds']);
addCheck('backend auto-settles expired active sessions', 'server/src/app.mjs', ['settleExpiredSessions', 'getExpiredActiveSessions', 'createExpiredSummary']);
addCheck('backend accepts valid expired completed summaries', 'server/test/api.test.mjs', ['expired completed session summary', 'rewardCoins, 130', 'customersServed, 12']);
addCheck('backend keeps expired metadata as fallback settlement', 'server/test/api.test.mjs', ['expired client metadata', 'resumed-client', 'rewardCoins, 75']);
addCheck('backend rejects mismatched customer type totals', 'server/test/api.test.mjs', ['mismatched customer type totals', 'customer_type_count_mismatch']);
addCheck('backend rejects non-90-second summaries', 'server/test/api.test.mjs', ['non-90-second duration', 'invalid_duration']);
addCheck('backend rejects invalid summary numeric bounds', 'server/test/api.test.mjs', ['invalid numeric bounds', 'invalid_satisfaction']);
addCheck('server production Cocos Web root guard', 'server/src/config.mjs', ['NODE_ENV', 'production', 'WEB_STATIC_ROOT must point to Cocos Web build output']);
addCheck('server production root guard test', 'server/test/static-client.test.mjs', ['production server config requires a Cocos Web static root', 'WEB_STATIC_ROOT must point to Cocos Web build output', "WEB_STATIC_ROOT: 'client/web'", "WEB_STATIC_ROOT: './client/web/build'"]);
addCheck('shared 8 percent economy growth', 'shared/game-rules.mjs', ['incomeGrowth: 1.08', 'expectedRevenue', 'upgradeCost']);
addCheck('cocos shared rules verifier', 'scripts/verify-cocos-shared-rules.mjs', ['createSourceFile', 'CLIENT_CONSTANT_KEYS', 'PART_LABELS', 'TASK_TYPE_LABELS']);
addCheck('cocos shared rules verification command', 'package.json', ['verify:rules', 'verify:textures && npm run verify:rules']);
addCheck('architecture documents Cocos rule mirror', 'docs/architecture.md', ['verify:rules', 'client/cocos/assets/scripts/core/GameRules.ts', 'shared/game-rules.mjs']);
addCheck('shared stamina constants', 'shared/game-rules.mjs', ['staminaMax: 60', 'sessionStaminaCost: 10', 'sessionDurationSeconds: 90']);
addCheck('shared stamina recovery status', 'shared/game-rules.mjs', ['getStaminaRecovery', 'secondsUntilNext', 'secondsUntilFull', 'nextRecoveryAt']);
addCheck('shared business density tuning', 'shared/game-rules.mjs', ['initialCustomerCount: 2', 'maxWaitingCustomers: 4', 'normalCustomersPerSession: 12', 'prepDelaySeconds', 'eatingSeconds', 'spawnIntervalSeconds', 'moveSpeedMultiplier']);
addCheck('shared max session customer cap tests', 'server/test/game-rules.test.mjs', ['session summary validation enforces the 18 customer cap', 'too_many_customers']);
addCheck('shared customer type total validation tests', 'server/test/game-rules.test.mjs', ['customer type totals to match customers', 'customer_type_count_mismatch']);
addCheck('shared 90-second duration validation tests', 'server/test/game-rules.test.mjs', ['documented 90 second duration', 'invalid_duration']);
addCheck('shared summary numeric bounds validation tests', 'server/test/game-rules.test.mjs', ['invalid numeric bounds', 'invalid_customer_count', 'invalid_satisfaction', 'invalid_combo', 'invalid_customer_type_count']);
addCheck('shared performance clamp', 'shared/game-rules.mjs', ['performanceFactor', '0.70', '0.75', '1.3']);
addCheck('shared completion score normal target tests', 'server/test/game-rules.test.mjs', ['normal service target', 'normalCustomersPerSession', 'performanceFactor < 1']);
addCheck('shared normal performance upgrade cost test', 'server/test/game-rules.test.mjs', ['normal business performance stays close to one upgrade cost', 'upgradeCost * 1.05', '1.0075']);
addCheck('shared speed-neutral reward tests', 'server/test/game-rules.test.mjs', ['speed mode does not change reward', "speedMode: '1x'", "speedMode: '2x'", 'performanceFactor']);
addCheck('shared non-regressing handfeel tuning', 'shared/game-rules.mjs', ['getEffectivePartStars', 'carriedStars', 'getTuning', 'maxTableSlots']);
addCheck('shared customer type reservation', 'shared/game-rules.mjs', ['CUSTOMER_TYPES', 'normalizeCustomerTypes', 'customerTypes']);
addCheck('shared task type labels', 'shared/game-rules.mjs', ['TASK_TYPE_LABELS', 'typeLabel']);
addCheck('shared task reward fields', 'shared/game-rules.mjs', ['TASK_REWARD_FIELDS', 'resolveRewardAmount', 'getTaskRewardSummary']);
addCheck('shared task reward budget tests', 'server/test/game-rules.test.mjs', ['task rewards are limited to coins and stamina', 'daily task reward budget matches the MVP band', 'overall task coin rewards stay within the auxiliary progression band', 'getTaskRewardSummary']);
addCheck('shared daily task claim keys', 'server/test/game-rules.test.mjs', ['daily task claim keys are scoped by backend date', '2026-06-17:daily_sessions_3', '2026-06-18:daily_sessions_3']);
addCheck('server configurable Web static root', 'server/src/server.mjs', ['resolveServerConfig', 'clientRoot']);
addCheck('web four core screens', 'client/web/main.js', ["screen === 'main'", "screen === 'business'", "screen === 'upgrade'", "screen === 'tasks'"]);
addCheck('web 2x speed support', 'client/web/main.js', ["state.speedMode === '1x' ? '2x' : '1x'", "speedMode: state.speedMode", 'toggleBusinessSpeed', "game.speedMode === '1x' ? '2x' : '1x'"]);
addCheck('web blocks manual early settlement', 'client/web/main.js', ["disabled: !game.finished"]);
addCheck('web preserves completed session on not-ready settlement', 'client/web/main.js', ['ApiRequestError', 'SESSION_NOT_READY', 'remainingRealSeconds', '结算准备中', 'handleSessionNotReady']);
addCheck('web throttles not-ready settlement retry', 'client/web/main.js', ['settlementRetryAtMs', 'getSettlementRetryWaitSeconds', 'window.setTimeout', 'Date.now() + remainingSeconds * 1000']);
addCheck('web resumed session remaining time', 'client/web/main.js', ['session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds']);
addCheck('web local session snapshot recovery', 'client/web/main.js', ['LOCAL_SESSION_SNAPSHOT_KEY', 'finishStoredCompletedSession', 'saveGameSnapshot', 'loadGameSnapshot', 'getSummaryFromSnapshot']);
addCheck('web stamina recovery display', 'client/web/main.js', ['formatStaminaLabel', 'staminaRecovery', 'secondsUntilNext', 'secondsUntilFull']);
addCheck('web click service chain', 'client/web/main.js', ['seatCustomer', "customer.phase = 'eating'", 'collectCustomer']);
addCheck('web table countdown labels', 'client/web/main.js', ['formatSeconds', 'customer.phaseTime', 'customer.patience']);
addCheck('web initial customer wave', 'client/web/main.js', ['tuning.initialCustomerCount', 'spawnCustomer']);
addCheck('web waiting queue cap', 'client/web/main.js', ['CONSTANTS.maxWaitingCustomers', 'game.waiting.length']);
addCheck('web max session customer cap', 'client/web/main.js', ['canSpawnMoreCustomers', 'CONSTANTS.maxCustomersPerSession']);
addCheck('web floor movement tuning', 'client/web/main.js', ['getMovementAdjustedDuration', 'moveSpeedMultiplier']);
addCheck('web locked table slots', 'client/web/main.js', ['table-locked.png', 'CONSTANTS.maxTableSlots', '未解锁']);
addCheck('web normal customer type', 'client/web/main.js', ["customerType: 'normal'", 'customerTypes']);
addCheck('web business feedback', 'client/web/main.js', ['setBusinessFeedback', 'getSatisfactionPercent', '服务成功', '收银成功 连击', '顾客离开，连击中断']);
addCheck('web business feedback texture', 'client/web/styles.css', ['business-feedback', 'background-image: url("/textures/card.png")']);
addCheck('web task claim', 'client/web/main.js', ['/api/tasks/claim', 'claimTask']);
addCheck('web task type grouping', 'client/web/main.js', ['groupTasksByType', 'TASK_TYPE_LABELS', 'task-section']);
addCheck('web first-run guide highlights', 'client/web/main.js', ['getGuideStep', 'startBusiness', 'seatCustomer', 'serveFood', 'collectPay', 'upgradePart', 'claimTask']);
addCheck('web restaurant visual stages', 'client/web/main.js', ['restaurantBackgrounds', 'getRestaurantStageIndex', 'getRestaurantSceneAttrs', 'restaurant-bg-stage-3.png']);
addCheck('web upgrade screen required details', 'client/web/main.js', ['renderPartCard', 'renderStars(star)', '成本：', '还差', 'getPartEffectDescription', "'满星'"]);
addCheck('web star state textures', 'client/web/main.js', ['starEmpty', 'icon-star-empty.png', 'index < count ? textures.star : textures.starEmpty']);
addCheck('web guide textured cue', 'client/web/styles.css', ['guide-cue', 'background-image: url("/textures/card.png")', 'guide-focus']);
addCheck('cocos main controller', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['@ccclass', 'startBusiness', 'finishBusiness', 'upgradePart', 'upgradeRestaurant', 'claimTask']);
addCheck('cocos screen navigation buttons', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['mainNavButton', 'upgradeNavButton', 'taskNavButton', 'resultMainButton', 'resultUpgradeButton', 'renderNavigation']);
addCheck('cocos resumable session start button label', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['startButtonLabel', 'activeSession', '继续营业', '开始营业']);
addCheck('cocos textured button refresh', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['TexturedButtonView', 'texturedButtons', 'renderTexturedButtons']);
addCheck('cocos textured panel refresh', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['TexturedPanelView', 'texturedPanels', 'renderTexturedPanels']);
addCheck('cocos first-run guide messages', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['guideLabel', 'getGuideMessage', '开始营业', '完成上菜', '领取引导任务奖励']);
addCheck('cocos in-session speed toggle', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['toggleSpeed', 'simulation.toggleSpeedMode', 'simulation.speedMode']);
addCheck('cocos blocks manual early settlement', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['finishButton.interactable', 'simulation.finished', '!this.finishing']);
addCheck('cocos preserves completed session on not-ready settlement', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['ApiRequestError', 'SESSION_NOT_READY', 'remainingRealSeconds', '结算准备中', 'handleSessionNotReady']);
addCheck('cocos throttles not-ready settlement retry', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['nextSettlementRetryAtMs', 'getSettlementRetryWaitSeconds', 'Date.now() + remainingSeconds * 1000']);
addCheck('cocos resumed session remaining time', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['response.session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds']);
addCheck('cocos local session snapshot recovery', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['LOCAL_SESSION_SNAPSHOT_KEY', 'finishStoredCompletedSession', 'saveSessionSnapshot', 'loadSessionSnapshot', 'getSummaryFromSnapshot']);
addCheck('cocos stamina recovery display', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['formatStaminaLabel', 'staminaRecovery', 'secondsUntilNext', 'secondsUntilFull']);
addCheck('cocos restaurant visual stages', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['restaurantBackgroundSprite', 'renderRestaurantBackground', 'getRestaurantBackground']);
addCheck('cocos business feedback labels', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['satisfactionLabel', 'feedbackLabel', 'satisfactionPercent', 'lastFeedback']);
addCheck('cocos main part status views', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['PartStatusView', 'partStatusViews', 'renderPartStatus']);
addCheck('cocos locked table slots', 'client/cocos/assets/scripts/components/TableSlotView.ts', ['tableLocked', 'unlocked', '未解锁']);
addCheck('cocos table countdown labels', 'client/cocos/assets/scripts/components/TableSlotView.ts', ['formatSeconds', 'customer.phaseTime', 'customer.patience']);
addCheck('cocos business simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['seatCustomer', 'handleTablePressed', 'collectFirstReadyPay', 'getSummary']);
addCheck('cocos business simulation snapshot', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['BusinessSimulationSnapshot', 'fromSnapshot', 'getSnapshot', 'cloneCustomer']);
addCheck('cocos initial customer wave', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['initialCustomerCount', 'spawnCustomer', 'spawnIntervalSeconds']);
addCheck('cocos waiting queue cap', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['CONSTANTS.maxWaitingCustomers', 'this.waiting.length']);
addCheck('cocos waiting queue countdown labels', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['waitingCustomerLabels', 'customer.patience', 'Math.ceil(customer.patience)']);
addCheck('cocos max session customer cap', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['canSpawnMoreCustomers', 'CONSTANTS.maxCustomersPerSession']);
addCheck('cocos floor movement tuning', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['getMovementAdjustedDuration', 'moveSpeedMultiplier']);
addCheck('cocos normal customer type', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ["customerType: 'normal'", 'customerTypes']);
addCheck('cocos simulation speed mode toggle', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['setSpeedMode', 'toggleSpeedMode', "speedMode === '1x' ? '2x' : '1x'"]);
addCheck('cocos business feedback simulation', 'client/cocos/assets/scripts/core/BusinessSimulation.ts', ['lastFeedback', 'feedbackTimeLeft', 'averageSatisfaction', '服务成功', '收银成功 连击', '顾客离开，连击中断']);
addCheck('cocos api client endpoints', 'client/cocos/assets/scripts/services/ApiClient.ts', ['/api/player/profile', '/api/session/start', '/api/session/finish', '/api/upgrade/part', '/api/upgrade/restaurant', '/api/tasks/claim']);
addCheck('cocos api host resolution', 'client/cocos/assets/scripts/services/ApiClient.ts', ['PRODUCTION_API_BASE_URL', 'https://animalapi.wakaka007.cn', 'resolveBaseUrl', 'sys.isBrowser']);
addCheck('cocos api transport wrapper', 'client/cocos/assets/scripts/services/ApiClient.ts', ['requestJson', 'x-player-id']);
addCheck('cocos api transport fallback', 'client/cocos/assets/scripts/services/ApiTransport.ts', ['globalThis.fetch', 'XMLHttpRequest', 'requestJsonWithXhr']);
addCheck('cocos texture catalog sprite frames', 'client/cocos/assets/scripts/components/TextureCatalog.ts', ['SpriteFrame', 'restaurantBackground', 'restaurantBackgrounds', 'getRestaurantBackground', 'tableEmpty', 'tableLocked', 'cashier', 'animals', 'starIcon', 'starIconEmpty', 'getStarFrame']);
addCheck('cocos part status component', 'client/cocos/assets/scripts/components/PartStatusView.ts', ['@ccclass', 'PartStatusView', 'PART_LABELS', 'starSprites', 'getStarFrame']);
addCheck('cocos part upgrade required details', 'client/cocos/assets/scripts/components/PartUpgradeView.ts', ['@ccclass', 'PartUpgradeView', 'costLabel', 'effectLabel', 'buttonLabel', '还差', '已满星', '满星', 'profile.partEffects', 'getStarFrame']);
addCheck('cocos task type label component', 'client/cocos/assets/scripts/components/TaskItemView.ts', ['TASK_TYPE_LABELS', 'typeLabel']);
addCheck('cocos task section headers', 'client/cocos/assets/scripts/HachimiRestaurantGame.ts', ['guideTaskHeaderLabel', 'dailyTaskHeaderLabel', 'growthTaskHeaderLabel', 'renderTaskSectionHeader', 'TASK_TYPES', 'TASK_TYPE_LABELS', '可领']);
addCheck('cocos textured button component', 'client/cocos/assets/scripts/components/TexturedButtonView.ts', ['@ccclass', 'TexturedButtonView', 'buttonDisabled', 'backgroundSprite']);
addCheck('cocos textured panel component', 'client/cocos/assets/scripts/components/TexturedPanelView.ts', ['@ccclass', 'TexturedPanelView', 'backgroundSprite', 'panelTexture', 'requireTexture']);
addCheck('cocos mobile safe area component', 'client/cocos/assets/scripts/components/MobileSafeAreaView.ts', ['@ccclass', 'MobileSafeAreaView', 'SafeArea', 'Widget', 'ON_WINDOW_RESIZE', 'minTouchInset', 'safeArea.updateArea()', 'Math.max(widget.top']);
addCheck('cocos scene wiring manifest referenced components', 'client/cocos/scene-wiring.json', ['HachimiRestaurantGame', 'TextureCatalog', 'TableSlotView', 'PartStatusView', 'PartUpgradeView', 'TaskItemView', 'TexturedButtonView', 'TexturedPanelView']);
addCheck('cocos scene wiring safe area contract', 'client/cocos/scene-wiring.json', ['MobileSafeAreaView', 'mainSafeArea', 'businessSafeArea', 'SafeArea', 'Widget', 'minTouchInset']);
addCheck('cocos scene wiring manifest navigation buttons', 'client/cocos/scene-wiring.json', ['mainNavButton', 'upgradeNavButton', 'taskNavButton', 'resultMainButton', 'resultUpgradeButton']);
addCheck('cocos scene wiring resumable start label', 'client/cocos/scene-wiring.json', ['startButtonLabel']);
addCheck('cocos scene wiring part upgrade fields', 'client/cocos/scene-wiring.json', ['PartUpgradeView', 'costLabel', 'effectLabel', 'starSprites', 'buttonLabel']);
addCheck('cocos scene wiring textured panels', 'client/cocos/scene-wiring.json', ['TexturedPanelView', 'texturedPanels', 'texturedPanelRoles', 'panelTexture']);
addCheck('cocos scene wiring task section headers', 'client/cocos/scene-wiring.json', ['taskSections', 'guideTaskHeaderLabel', 'dailyTaskHeaderLabel', 'growthTaskHeaderLabel']);
addCheck('cocos scene wiring task type labels', 'client/cocos/scene-wiring.json', ['componentProperties', 'TaskItemView', 'typeLabel']);
addCheck('cocos scene wiring waiting queue countdown labels', 'client/cocos/scene-wiring.json', ['waitingCustomerLabels', 'minimumLabelArrayLengths']);
addCheck('cocos scene wiring source property validation', 'scripts/verify-gameplay-coverage.mjs', ['componentSourceFiles', 'assertSourceContainsProperties', 'sceneWiring.textureCatalog']);
addCheck('documented Cocos single-client rule', 'AGENTS.md', ['Web, WeChat Mini Game, and Douyin Mini Game clients must share this Cocos codebase', 'client/web/']);
addCheck('platforms documented Cocos build outputs', 'docs/platforms.md', ['There is one production client codebase', 'Cocos Web build artifact', 'temporary debug harness']);
addCheck('platforms documented implementation source of truth', 'docs/platforms.md', ['Implementation source of truth', 'Product behavior must be implemented in `client/cocos/` first', 'without separate gameplay forks']);
addCheck('deployment documents production Web root guard', 'docs/deployment.md', ['NODE_ENV=production', 'server refuses to start unless `WEB_STATIC_ROOT` is set', 'rejects `WEB_STATIC_ROOT=client/web`', 'must never point to `client/web`']);
addCheck('deployment documents env and health checks', 'docs/deployment.md', ['Environment Variables', 'Health Check', 'GET /api/health', 'Rollback Notes', 'https://animalapi.wakaka007.cn/api/health']);
addCheck('safe env example lists production variables', '.env.example', ['NODE_ENV=development', 'PORT=4173', 'GAME_DATA_FILE=server/data/game-state.json', 'WEB_STATIC_ROOT=']);
addCheck('web debug harness forbids production root', 'client/web/README.md', ['must never be used as `WEB_STATIC_ROOT` in production', 'Cocos Web build output']);
addCheck('platforms documented api host resolution', 'docs/platforms.md', ['API Host Resolution', 'same-origin', 'https://animalapi.wakaka007.cn']);
addCheck('platforms documented network adapter', 'docs/platforms.md', ['Network Adapter', 'fetch', 'XMLHttpRequest']);
addCheck('platforms documented mobile safe area', 'docs/platforms.md', ['Mobile Layout', 'MobileSafeAreaView', 'notches and bottom gesture regions']);
addCheck('product documented locked table slots', 'docs/product.md', ['场景预留 5 个桌位', '未解锁桌位显示锁定贴图']);
addCheck('product documented initial customer wave', 'docs/product.md', ['开场先进入 2 位初始顾客']);
addCheck('product documented waiting queue cap', 'docs/product.md', ['等待队列最多显示 4 位顾客']);
addCheck('product documented table countdown feedback', 'docs/product.md', ['餐桌状态需要显示阶段剩余时间或耐心倒计时']);
addCheck('product documented max session customer cap', 'docs/product.md', ['每局 18 位顾客上限', '后端不可结算']);
addCheck('product documented backend stamina recovery display', 'docs/product.md', ['下一点体力倒计时', '满体力时间', '后端返回的恢复状态']);
addCheck('product documented local session snapshot recovery', 'docs/product.md', ['本局临时摘要快照', '下次启动先提交该完成摘要', '避免被自动过期清理降级']);
addCheck('product documented task type separation', 'docs/product.md', ['明确区分引导任务、每日任务、成长任务']);
addCheck('product documented daily task reset', 'docs/product.md', ['每日任务进度按后端日期刷新', '每天最多领取一次']);
addCheck('product documented business feedback scope', 'docs/product.md', ['服务成功', '顾客离开', '连击', '收银成功']);
addCheck('api documented task reward budget', 'docs/api.md', ['Daily task reward budget', '1 and 2 normal business revenues', '10 and 20 stamina', 'outside the MVP coin/stamina set']);
addCheck('api documented overall task coin budget', 'docs/api.md', ['Overall task coin reward budget', '20% and 30%', 'first 20-session growth-cycle']);
addCheck('api documented response envelope', 'docs/api.md', ['Response Envelope', 'ok: true', 'ok: false', 'POST /api/session/finish', 'SESSION_NOT_READY']);
addCheck('api documented request body errors', 'docs/api.md', ['POST endpoints require valid JSON request bodies', 'INVALID_JSON', 'REQUEST_TOO_LARGE']);
addCheck('api documented not-ready settlement recovery', 'docs/api.md', ['remainingRealSeconds', 'preserve the completed local summary snapshot', 'retry settlement after the wait']);
addCheck('api documented customer type totals', 'docs/api.md', ['customer type totals', 'customersServed + customersLost', 'normal']);
addCheck('api documented summary duration validation', 'docs/api.md', ['durationSeconds', '90 seconds of game time', 'anti-early-settlement']);
addCheck('api documented summary numeric bounds', 'docs/api.md', ['non-negative integers', 'averageSatisfaction', 'maxCombo']);
addCheck('api documented expired submitted summary settlement', 'docs/api.md', ['manually finishes an already expired active session', 'valid completed summary', 'minimum guaranteed fallback summary']);
addCheck('api documented completion target', 'docs/api.md', ['completionScore = clamp(customersServed / 12', 'normal service target']);
addCheck('api documented normal reward center', 'docs/api.md', ['normal 10-customer', 'about one `upgradeCost`']);
addCheck('product documented upgrade screen details', 'docs/product.md', ['当前星级', '升级成本', '下一星效果', '金币不足时差多少金币', '满星状态']);
addCheck('texture policy forbids runtime visual effects', 'scripts/verify-texture-policy.mjs', ['linear-gradient', 'filter\\s*:', 'grayscale', 'opacity\\s*:', 'UIOpacity', '.color\\s*=', 'validateCssTextureBackgrounds']);

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
const componentSourceFiles = {
  HachimiRestaurantGame: 'client/cocos/assets/scripts/HachimiRestaurantGame.ts',
  TextureCatalog: 'client/cocos/assets/scripts/components/TextureCatalog.ts',
  TableSlotView: 'client/cocos/assets/scripts/components/TableSlotView.ts',
  PartStatusView: 'client/cocos/assets/scripts/components/PartStatusView.ts',
  PartUpgradeView: 'client/cocos/assets/scripts/components/PartUpgradeView.ts',
  TaskItemView: 'client/cocos/assets/scripts/components/TaskItemView.ts',
  TexturedButtonView: 'client/cocos/assets/scripts/components/TexturedButtonView.ts',
  TexturedPanelView: 'client/cocos/assets/scripts/components/TexturedPanelView.ts',
  MobileSafeAreaView: 'client/cocos/assets/scripts/components/MobileSafeAreaView.ts'
};
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
  'icon-star.png',
  'icon-star-empty.png'
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

const requiredComponents = [
  'HachimiRestaurantGame',
  'TextureCatalog',
  'TableSlotView',
  'PartStatusView',
  'PartUpgradeView',
  'TaskItemView',
  'TexturedButtonView',
  'TexturedPanelView',
  'MobileSafeAreaView'
];
for (const component of requiredComponents) {
  if (!sceneWiring.requiredComponents?.includes(component)) {
    fail(`Cocos scene wiring manifest missing component ${component}`);
  }
  if (!componentSourceFiles[component]) {
    fail(`Cocos scene wiring source validation missing source file mapping for ${component}`);
  }
}

await assertSourceContainsProperties('HachimiRestaurantGame', [
  'textures',
  ...(sceneWiring.screens || []),
  ...(sceneWiring.labels || []),
  ...(sceneWiring.sprites || []),
  ...(sceneWiring.buttons || []),
  'tableSlots',
  'partStatusViews',
  'partViews',
  'taskViews',
  'texturedButtons',
  'texturedPanels'
]);
await assertSourceContainsProperties('TextureCatalog', sceneWiring.textureCatalog || []);
for (const [component, properties] of Object.entries(sceneWiring.componentProperties || {})) {
  await assertSourceContainsProperties(component, properties);
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

if ((sceneWiring.minimumInstances?.PartUpgradeView || 0) < 5) {
  fail('Cocos scene wiring manifest needs at least 5 PartUpgradeView rows');
}

if ((sceneWiring.minimumInstances?.TexturedButtonView || 0) < 28) {
  fail('Cocos scene wiring manifest needs at least 28 TexturedButtonView instances');
}

if ((sceneWiring.minimumInstances?.TexturedPanelView || 0) < 27) {
  fail('Cocos scene wiring manifest needs at least 27 TexturedPanelView instances');
}

if ((sceneWiring.minimumInstances?.MobileSafeAreaView || 0) < 5) {
  fail('Cocos scene wiring manifest needs at least 5 MobileSafeAreaView instances');
}

if ((sceneWiring.safeArea?.requiredNodes || []).length < 5) {
  fail('Cocos scene wiring manifest needs safe-area interaction roots for all five screens');
}

for (const component of ['SafeArea', 'Widget']) {
  if (!sceneWiring.safeArea?.cocosComponents?.includes(component)) {
    fail(`Cocos scene wiring safe-area contract missing ${component}`);
  }
}

for (const label of ['guideLabel', 'satisfactionLabel', 'feedbackLabel']) {
  if (!sceneWiring.labels?.includes(label)) {
    fail(`Cocos scene wiring manifest missing ${label}`);
  }
}

if (!sceneWiring.labels?.includes('startButtonLabel')) {
  fail('Cocos scene wiring manifest missing startButtonLabel');
}

for (const label of ['guideTaskHeaderLabel', 'dailyTaskHeaderLabel', 'growthTaskHeaderLabel']) {
  if (!sceneWiring.labels?.includes(label)) {
    fail(`Cocos scene wiring manifest missing task section label ${label}`);
  }
  if (!sceneWiring.taskSections?.headerLabels?.includes(label)) {
    fail(`Cocos scene wiring taskSections missing ${label}`);
  }
  if (!sceneWiring.componentProperties?.HachimiRestaurantGame?.includes(label)) {
    fail(`Cocos scene wiring HachimiRestaurantGame missing ${label}`);
  }
}

for (const type of ['guide', 'daily', 'growth']) {
  if (!sceneWiring.taskSections?.types?.includes(type)) {
    fail(`Cocos scene wiring taskSections missing task type ${type}`);
  }
}

if (!sceneWiring.sprites?.includes('restaurantBackgroundSprite')) {
  fail('Cocos scene wiring manifest missing restaurantBackgroundSprite');
}

if ((sceneWiring.minimumSpriteArrayLengths?.waitingCustomerSprites || 0) < 4) {
  fail('Cocos scene wiring manifest needs at least 4 waitingCustomerSprites');
}

if ((sceneWiring.minimumLabelArrayLengths?.waitingCustomerLabels || 0) < 4) {
  fail('Cocos scene wiring manifest needs at least 4 waitingCustomerLabels');
}

if (!sceneWiring.componentProperties?.HachimiRestaurantGame?.includes('waitingCustomerLabels')) {
  fail('Cocos scene wiring HachimiRestaurantGame missing waitingCustomerLabels');
}

if (!sceneWiring.componentProperties?.HachimiRestaurantGame?.includes('startButtonLabel')) {
  fail('Cocos scene wiring HachimiRestaurantGame missing startButtonLabel');
}

for (const button of ['startButton', 'mainNavButton', 'upgradeNavButton', 'taskNavButton', 'resultMainButton', 'resultUpgradeButton']) {
  if (!sceneWiring.buttons?.includes(button)) {
    fail(`Cocos scene wiring manifest missing ${button}`);
  }
}

for (const property of ['titleLabel', 'costLabel', 'effectLabel', 'starSprites', 'upgradeButton', 'buttonLabel']) {
  if (!sceneWiring.componentProperties?.PartUpgradeView?.includes(property)) {
    fail(`Cocos scene wiring PartUpgradeView missing ${property}`);
  }
}

for (const property of ['backgroundSprite', 'panelTexture']) {
  if (!sceneWiring.componentProperties?.TexturedPanelView?.includes(property)) {
    fail(`Cocos scene wiring TexturedPanelView missing ${property}`);
  }
}

if (!sceneWiring.componentProperties?.HachimiRestaurantGame?.includes('texturedPanels')) {
  fail('Cocos scene wiring HachimiRestaurantGame missing texturedPanels');
}

const texturedPanelRoleCount = Object.values(sceneWiring.texturedPanelRoles || {})
  .reduce((sum, value) => sum + Number(value || 0), 0);
if (texturedPanelRoleCount < 27) {
  fail('Cocos scene wiring texturedPanelRoles must cover at least 27 panel/card surfaces');
}

for (const file of ['client/web/main.js', 'client/cocos/assets/scripts/components/PartUpgradeView.ts']) {
  const source = await readFile(file, 'utf8');
  if (/推荐/.test(source)) {
    fail(`${file} must not show recommendation copy on the free-upgrade screen`);
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

async function assertSourceContainsProperties(component, properties) {
  const file = componentSourceFiles[component];
  if (!file) {
    fail(`No Cocos source file mapping for ${component}`);
    return;
  }

  let source = '';
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    fail(`Cannot read ${component} source file ${file}: ${error.message}`);
    return;
  }

  for (const property of properties) {
    const declarationPattern = new RegExp(`(?:^|\\n)\\s*(?:public\\s+|protected\\s+|private\\s+|readonly\\s+)?${escapeRegExp(property)}\\s*(?::|=)`);
    if (!declarationPattern.test(source)) {
      fail(`Cocos scene wiring ${component}.${property} is not declared in ${file}`);
    }
  }
}
