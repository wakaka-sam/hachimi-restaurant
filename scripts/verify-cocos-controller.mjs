import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import ts from 'typescript';

const sourceRoot = 'client/cocos/assets/scripts';
const tempDir = await mkdtemp(join(tmpdir(), 'hachimi-cocos-controller-'));
const scriptFiles = [
  'HachimiRestaurantGame.ts',
  'core/GameRules.ts',
  'core/BusinessSimulation.ts',
  'services/ApiClient.ts',
  'services/ApiTransport.ts',
  'components/TextureCatalog.ts',
  'components/TableSlotView.ts',
  'components/PartStatusView.ts',
  'components/PartUpgradeView.ts',
  'components/TaskItemView.ts',
  'components/TexturedButtonView.ts',
  'components/TexturedPanelView.ts'
];

try {
  await writeFile(join(tempDir, 'package.json'), '{"type":"commonjs"}\n');
  await writeCcStub();
  for (const file of scriptFiles) {
    await transpileCocosScript(join(sourceRoot, file));
  }

  const require = createRequire(join(tempDir, 'verify.cjs'));
  const cc = require('cc');
  const { HachimiRestaurantGame } = require(join(tempDir, sourceRoot, 'HachimiRestaurantGame.js'));
  const { ApiRequestError } = require(join(tempDir, sourceRoot, 'services/ApiClient.js'));

  await verifyMainBusinessFlow(HachimiRestaurantGame, ApiRequestError, cc);
  await verifyStoredCompletedSessionRecovery(HachimiRestaurantGame, cc);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log('Cocos main controller verified: profile, business flow, settlement recovery, upgrades, tasks, and snapshot resume.');

async function writeCcStub() {
  await mkdir(join(tempDir, 'node_modules/cc'), { recursive: true });
  await writeFile(join(tempDir, 'node_modules/cc/index.js'), `
const storage = new Map();

class Node {
  constructor() {
    this.active = true;
    this.events = [];
  }

  on(event, callback, target) {
    this.events.push({ event, callback, target });
  }
}

class Component {
  constructor() {
    this.node = new Node();
  }
}

class Label extends Component {
  constructor() {
    super();
    this.string = '';
  }
}

class Sprite extends Component {
  constructor() {
    super();
    this.spriteFrame = null;
  }
}

class Button extends Component {
  constructor() {
    super();
    this.interactable = true;
  }
}
Button.EventType = { CLICK: 'click' };

function ccclass() {
  return (target) => target;
}

function property(...args) {
  if (args.length >= 2) {
    return;
  }
  return () => {};
}

exports._decorator = { ccclass, property };
exports.Node = Node;
exports.Component = Component;
exports.Label = Label;
exports.Sprite = Sprite;
exports.Button = Button;
exports.sys = {
  isBrowser: true,
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    }
  }
};
`);
}

async function transpileCocosScript(sourcePath) {
  const source = await readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      experimentalDecorators: true
    },
    fileName: sourcePath
  });
  const outputPath = join(tempDir, relative('.', sourcePath)).replace(/\.ts$/, '.js');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output.outputText);
}

async function verifyMainBusinessFlow(HachimiRestaurantGame, ApiRequestError, cc) {
  cc.sys.localStorage.clear();
  const api = createFakeApi(ApiRequestError);
  const game = createController(HachimiRestaurantGame, cc);
  game.onLoad();
  game.api = api;

  assert.equal(game.startButton.node.events[0].event, cc.Button.EventType.CLICK);
  assert.equal(game.tableSlots[0].boundIndex, 0);
  assert.equal(game.partViews[0].boundPart, 'cashier');

  await game.start();
  assert.equal(api.calls[0].method, 'getProfile');
  assert.equal(game.mainScreen.active, true);
  assert.equal(game.businessScreen.active, false);
  assert.equal(game.coinLabel.string, '80');
  assert.equal(game.staminaLabel.string, '50/60 · +1 59s · 回满 5m');
  assert.equal(game.levelLabel.string, '餐厅 Lv.1');
  assert.equal(game.nextRevenueLabel.string, '下次 100');
  assert.equal(game.startButtonLabel.string, '开始营业');
  assert.equal(game.startButton.interactable, true);
  assert.match(game.guideLabel.string, /先开始营业/);
  assert.equal(game.restaurantBackgroundSprite.spriteFrame.name, 'restaurant-1');

  await game.startBusiness();
  assert.equal(api.calls.at(-1).method, 'startSession');
  assert.equal(game.businessScreen.active, true);
  assert.equal(game.mainScreen.active, false);
  assert.equal(game.activeSessionId, 'session-1');
  assert.equal(game.speedLabel.string, '1x');
  assert.equal(game.timerLabel.string, '剩余 90s');
  assert.equal(game.finishButton.interactable, false);
  assert.equal(game.cashierSprite.spriteFrame.name, 'cashier');
  assert.equal(game.tableSlots[0].renders.at(-1).unlocked, true);
  assert.equal(game.tableSlots[4].renders.at(-1).unlocked, false);
  assert.equal(game.waitingCustomerSprites[0].node.active, true);
  assert.match(game.guideLabel.string, /点击空餐桌/);
  assert.ok(cc.sys.localStorage.getItem('hachimi-active-session-snapshot'));

  game.handleTablePressed(0);
  assert.equal(game.tableSlots[0].renders.at(-1).customer.phase, 'seated');
  assert.match(game.guideLabel.string, /点击空餐桌|等待小动物/);

  game.toggleSpeed();
  assert.equal(game.speedLabel.string, '2x');
  assert.equal(JSON.parse(cc.sys.localStorage.getItem('hachimi-active-session-snapshot')).speedMode, '2x');

  game.simulation.finished = true;
  await game.finishBusiness();
  assert.equal(api.calls.at(-1).method, 'finishSession');
  assert.equal(game.resultScreen.active, true);
  assert.equal(game.businessScreen.active, false);
  assert.match(game.resultLabel.string, /获得金币 120/);
  assert.equal(cc.sys.localStorage.getItem('hachimi-active-session-snapshot'), null);

  await game.upgradePart('cashier');
  assert.equal(api.calls.at(-1).method, 'upgradePart');
  assert.equal(game.messageLabel.string, '部件已升级');
  assert.equal(game.partViews[0].renders.length > 0, true);

  await game.claimTask('guide_first_session');
  assert.equal(api.calls.at(-1).method, 'claimTask');
  assert.equal(game.messageLabel.string, '任务奖励已领取');

  await game.upgradeRestaurant();
  assert.equal(api.calls.at(-1).method, 'upgradeRestaurant');
  assert.equal(game.messageLabel.string, '餐厅已整体升级');

  await verifySessionNotReady(HachimiRestaurantGame, ApiRequestError, cc);
}

async function verifySessionNotReady(HachimiRestaurantGame, ApiRequestError, cc) {
  cc.sys.localStorage.clear();
  const api = createFakeApi(ApiRequestError, { finishMode: 'notReady' });
  const game = createController(HachimiRestaurantGame, cc);
  game.onLoad();
  game.api = api;
  await game.start();
  await game.startBusiness();
  game.simulation.finished = true;

  await game.finishBusiness();

  assert.equal(game.businessScreen.active, true);
  assert.equal(game.resultScreen.active, false);
  assert.match(game.messageLabel.string, /结算准备中，还需等待 14s/);
  assert.equal(game.simulation.finished, true);
  assert.ok(cc.sys.localStorage.getItem('hachimi-active-session-snapshot'));
}

async function verifyStoredCompletedSessionRecovery(HachimiRestaurantGame, cc) {
  cc.sys.localStorage.clear();
  const storedSummary = {
    sessionId: 'stored-session',
    startedAt: '2026-06-17T00:00:00.000Z',
    expiresAt: '2026-06-17T00:03:30.000Z',
    savedAt: '2026-06-17T00:01:30.000Z',
    speedMode: '2x',
    timeLeft: 0,
    spawnCooldown: 0,
    waiting: [],
    tables: [],
    customersServed: 12,
    customersLost: 1,
    satisfactionSum: 10.8,
    combo: 5,
    maxCombo: 7,
    nextCustomerId: 14,
    finished: true
  };
  cc.sys.localStorage.setItem('hachimi-active-session-snapshot', JSON.stringify(storedSummary));

  const api = createFakeApi(null);
  const game = createController(HachimiRestaurantGame, cc);
  game.onLoad();
  game.api = api;
  await game.start();

  const finishCall = api.calls.find((call) => call.method === 'finishSession');
  assert.equal(finishCall.sessionId, 'stored-session');
  assert.equal(finishCall.summary.customersServed, 12);
  assert.equal(finishCall.summary.customersLost, 1);
  assert.equal(finishCall.summary.customerTypes.normal, 13);
  assert.equal(cc.sys.localStorage.getItem('hachimi-active-session-snapshot'), null);
}

function createController(HachimiRestaurantGame, cc) {
  const game = new HachimiRestaurantGame();
  game.textures = createTextures();
  game.mainScreen = new cc.Node();
  game.businessScreen = new cc.Node();
  game.upgradeScreen = new cc.Node();
  game.taskScreen = new cc.Node();
  game.resultScreen = new cc.Node();

  for (const key of [
    'coinLabel',
    'staminaLabel',
    'levelLabel',
    'nextRevenueLabel',
    'messageLabel',
    'timerLabel',
    'speedLabel',
    'startButtonLabel',
    'businessStatsLabel',
    'satisfactionLabel',
    'feedbackLabel',
    'resultLabel',
    'guideLabel',
    'guideTaskHeaderLabel',
    'dailyTaskHeaderLabel',
    'growthTaskHeaderLabel'
  ]) {
    game[key] = new cc.Label();
  }

  for (const key of [
    'startButton',
    'mainNavButton',
    'upgradeNavButton',
    'taskNavButton',
    'resultMainButton',
    'resultUpgradeButton',
    'speedButton',
    'cashierButton',
    'finishButton',
    'restaurantUpgradeButton'
  ]) {
    game[key] = new cc.Button();
  }

  game.restaurantBackgroundSprite = new cc.Sprite();
  game.cashierSprite = new cc.Sprite();
  game.tableSlots = Array.from({ length: 5 }, () => createViewSpy());
  game.waitingCustomerSprites = Array.from({ length: 4 }, () => new cc.Sprite());
  game.waitingCustomerLabels = Array.from({ length: 4 }, () => new cc.Label());
  game.partStatusViews = Array.from({ length: 5 }, () => createViewSpy());
  game.partViews = Array.from({ length: 5 }, () => createViewSpy());
  game.taskViews = Array.from({ length: 3 }, () => createViewSpy());
  game.texturedButtons = Array.from({ length: 2 }, () => createViewSpy());
  game.texturedPanels = Array.from({ length: 2 }, () => createViewSpy());
  return game;
}

function createViewSpy() {
  return {
    node: { active: true },
    renders: [],
    boundIndex: null,
    boundPart: null,
    bind(...args) {
      if (typeof args[0] === 'number') {
        this.boundIndex = args[0];
      } else if (typeof args[0] === 'string') {
        this.boundPart = args[0];
      }
      this.bindArgs = args;
    },
    render(...args) {
      this.renders.push({
        customer: args[0],
        waitingCount: args[1],
        textures: args[2],
        unlocked: args[3],
        raw: args
      });
    }
  };
}

function frame(name) {
  return { name };
}

function createTextures() {
  return {
    animals: [frame('cat'), frame('dog'), frame('rabbit'), frame('bear')],
    cashier: frame('cashier'),
    button: frame('button'),
    buttonDisabled: frame('button-disabled'),
    getRestaurantBackground(level) {
      return frame(`restaurant-${Math.min(3, Math.max(1, level))}`);
    },
    getStarFrame(filled) {
      return frame(filled ? 'star-filled' : 'star-empty');
    },
    requireTexture(name) {
      return frame(name);
    }
  };
}

function createFakeApi(ApiRequestError, options = {}) {
  const calls = [];
  const api = {
    calls,
    async getProfile() {
      calls.push({ method: 'getProfile' });
      return createProfile();
    },
    async startSession(speedMode) {
      calls.push({ method: 'startSession', speedMode });
      return {
        profile: createProfile({
          player: { stamina: 40 },
          activeSession: {
            sessionId: 'session-1',
            playerId: 'controller-player',
            startedAt: '2026-06-17T00:00:00.000Z',
            expiresAt: '2026-06-17T00:03:30.000Z',
            speedMode,
            status: 'active',
            remainingSeconds: 90
          }
        }),
        session: {
          sessionId: 'session-1',
          playerId: 'controller-player',
          startedAt: '2026-06-17T00:00:00.000Z',
          expiresAt: '2026-06-17T00:03:30.000Z',
          speedMode,
          status: 'active',
          remainingSeconds: 90
        }
      };
    },
    async finishSession(sessionId, summary) {
      calls.push({ method: 'finishSession', sessionId, summary });
      if (options.finishMode === 'notReady') {
        throw new ApiRequestError({
          ok: false,
          error: {
            code: 'SESSION_NOT_READY',
            message: 'wait',
            remainingRealSeconds: 14
          },
          session: {
            sessionId,
            playerId: 'controller-player',
            startedAt: '2026-06-17T00:00:00.000Z',
            expiresAt: '2026-06-17T00:03:30.000Z',
            speedMode: summary.speedMode,
            status: 'active'
          }
        });
      }
      return {
        profile: createProfile({ player: { coins: 200, stamina: 40, stats: { totalSessions: 1 } } }),
        settlement: {
          incomePower: 0,
          expectedRevenue: 100,
          upgradeCost: 100,
          completionScore: 1,
          satisfactionScore: 0.9,
          comboScore: 0.5,
          performanceFactor: 1.2,
          rewardCoins: 120,
          minimumReward: 75,
          maximumReward: 130
        }
      };
    },
    async upgradePart(part) {
      calls.push({ method: 'upgradePart', part });
      return createProfile({ player: { coins: 100, stats: { totalSessions: 1, totalPartUpgrades: 1 } } });
    },
    async upgradeRestaurant() {
      calls.push({ method: 'upgradeRestaurant' });
      return createProfile({ player: { restaurantLevel: 2, stats: { totalRestaurantUpgrades: 1 } } });
    },
    async claimTask(taskId) {
      calls.push({ method: 'claimTask', taskId });
      return createProfile({ player: { stats: { totalTasksClaimed: 1 } } });
    }
  };
  return api;
}

function createProfile(overrides = {}) {
  const playerOverrides = overrides.player || {};
  const { player: _player, ...profileOverrides } = overrides;
  const stats = {
    totalSessions: 0,
    totalPartUpgrades: 0,
    totalTasksClaimed: 0,
    totalRestaurantUpgrades: 0,
    ...(playerOverrides.stats || {})
  };
  const profile = {
    player: {
      playerId: 'controller-player',
      coins: 80,
      stamina: 50,
      staminaMax: 60,
      staminaUpdatedAt: '2026-06-17T00:00:00.000Z',
      restaurantLevel: 1,
      parts: {
        cashier: 0,
        table: 0,
        chair: 0,
        floor: 0,
        wall: 0
      },
      stats,
      daily: {},
      ...playerOverrides,
      stats
    },
    staminaRecovery: {
      isFull: false,
      recoverIntervalSeconds: 300,
      secondsUntilNext: 59,
      secondsUntilFull: 299,
      nextRecoveryAt: '2026-06-17T00:00:59.000Z',
      fullRecoveryAt: '2026-06-17T00:04:59.000Z'
    },
    economy: {
      incomePower: 0,
      expectedRevenue: 100,
      upgradeCost: 100
    },
    partLabels: {},
    partEffects: {
      cashier: '下一星：收银窗口更宽',
      table: '下一星：增加 1 个同时接待桌位',
      chair: '下一星：顾客耐心 +1.5 秒',
      floor: '下一星：移动与翻台更快',
      wall: '下一星：顾客进入间隔缩短'
    },
    tuning: {
      tableCapacity: 2,
      initialCustomerCount: 2,
      patienceSeconds: 16,
      spawnIntervalSeconds: 7.2,
      moveSpeedMultiplier: 1,
      cashierWindowSeconds: 8,
      prepDelaySeconds: 5.5,
      eatingSeconds: 12.5
    },
    allPartsMaxed: false,
    tasks: [
      {
        id: 'guide_first_session',
        type: 'guide',
        typeLabel: '引导任务',
        title: '完成首次营业',
        description: '完成一局 90 秒营业。',
        progress: 0,
        target: 1,
        completed: true,
        claimed: false,
        reward: { coins: 25, stamina: 0 }
      },
      {
        id: 'daily_sessions_3',
        type: 'daily',
        typeLabel: '每日任务',
        title: '今日营业 3 次',
        description: '完成 3 次营业。',
        progress: 1,
        target: 3,
        completed: false,
        claimed: false,
        reward: { coins: 100, stamina: 10 }
      },
      {
        id: 'growth_sessions_20',
        type: 'growth',
        typeLabel: '成长任务',
        title: '累计营业 20 次',
        description: '累计完成 20 次营业。',
        progress: 1,
        target: 20,
        completed: false,
        claimed: false,
        reward: { coins: 0, stamina: 20 }
      }
    ],
    activeSession: null,
    ...profileOverrides
  };
  return profile;
}
