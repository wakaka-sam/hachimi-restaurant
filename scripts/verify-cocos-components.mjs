import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import ts from 'typescript';

const sourceRoot = 'client/cocos/assets/scripts';
const tempDir = await mkdtemp(join(tmpdir(), 'hachimi-cocos-components-'));
const scriptFiles = [
  'core/GameRules.ts',
  'core/BusinessSimulation.ts',
  'components/TextureCatalog.ts',
  'components/TableSlotView.ts',
  'components/PartStatusView.ts',
  'components/PartUpgradeView.ts',
  'components/TaskItemView.ts',
  'components/TexturedButtonView.ts',
  'components/TexturedPanelView.ts',
  'components/MobileSafeAreaView.ts'
];

try {
  await writeFile(join(tempDir, 'package.json'), '{"type":"commonjs"}\n');
  await writeCcStub();
  for (const file of scriptFiles) {
    await transpileCocosScript(join(sourceRoot, file));
  }

  const require = createRequire(join(tempDir, 'verify.cjs'));
  const cc = require('cc');
  const { TextureCatalog } = require(join(tempDir, sourceRoot, 'components/TextureCatalog.js'));
  const { TableSlotView } = require(join(tempDir, sourceRoot, 'components/TableSlotView.js'));
  const { PartStatusView } = require(join(tempDir, sourceRoot, 'components/PartStatusView.js'));
  const { PartUpgradeView } = require(join(tempDir, sourceRoot, 'components/PartUpgradeView.js'));
  const { TaskItemView } = require(join(tempDir, sourceRoot, 'components/TaskItemView.js'));
  const { TexturedButtonView } = require(join(tempDir, sourceRoot, 'components/TexturedButtonView.js'));
  const { TexturedPanelView } = require(join(tempDir, sourceRoot, 'components/TexturedPanelView.js'));
  const { MobileSafeAreaView } = require(join(tempDir, sourceRoot, 'components/MobileSafeAreaView.js'));

  const textures = createTextureCatalog(TextureCatalog, cc);
  verifyTextureCatalog(textures);
  verifyTableSlotView(TableSlotView, cc, textures);
  verifyPartStatusView(PartStatusView, cc, textures);
  verifyPartUpgradeView(PartUpgradeView, cc, textures);
  verifyTaskItemView(TaskItemView, cc);
  verifyTexturedButtonView(TexturedButtonView, cc, textures);
  verifyTexturedPanelView(TexturedPanelView, cc, textures);
  verifyMobileSafeAreaView(MobileSafeAreaView, cc);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log('Cocos UI components verified: texture catalog, table slots, upgrades, tasks, buttons, panels, and safe areas.');

async function writeCcStub() {
  await mkdir(join(tempDir, 'node_modules/cc'), { recursive: true });
  await writeFile(join(tempDir, 'node_modules/cc/index.js'), `
class Node {
  constructor() {
    this.active = true;
    this.events = [];
    this.components = new Map();
  }

  on(event, callback, target) {
    this.events.push({ event, callback, target });
  }

  addComponent(ComponentClass) {
    const component = new ComponentClass();
    component.node = this;
    this.components.set(ComponentClass, component);
    return component;
  }

  getComponent(ComponentClass) {
    return this.components.get(ComponentClass) || null;
  }
}

class Component {
  constructor() {
    this.node = new Node();
  }

  getComponent(ComponentClass) {
    return this.node.getComponent(ComponentClass);
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

class SpriteFrame {
  constructor(name = '') {
    this.name = name;
  }
}

class Button extends Component {
  constructor() {
    super();
    this.interactable = true;
    this.transition = Button.Transition.COLOR;
  }
}
Button.EventType = { CLICK: 'click' };
Button.Transition = { NONE: 0, COLOR: 1, SPRITE: 2, SCALE: 3 };

class SafeArea extends Component {
  constructor() {
    super();
    this.symmetric = false;
    this.updated = false;
  }

  updateArea() {
    this.updated = true;
  }
}

class Widget extends Component {
  constructor() {
    super();
    this.alignMode = '';
    this.isAlignTop = false;
    this.isAlignBottom = false;
    this.isAlignLeft = false;
    this.isAlignRight = false;
    this.isAbsoluteTop = false;
    this.isAbsoluteBottom = false;
    this.isAbsoluteLeft = false;
    this.isAbsoluteRight = false;
    this.top = 0;
    this.bottom = 0;
    this.left = 0;
    this.right = 0;
    this.alignmentUpdated = false;
  }

  updateAlignment() {
    this.alignmentUpdated = true;
  }
}
Widget.AlignMode = { ON_WINDOW_RESIZE: 'ON_WINDOW_RESIZE' };

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
exports.SpriteFrame = SpriteFrame;
exports.Button = Button;
exports.SafeArea = SafeArea;
exports.Widget = Widget;
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

function frame(name) {
  return { name };
}

function createTextureCatalog(TextureCatalog, cc) {
  const textures = new TextureCatalog();
  textures.restaurantBackground = frame('restaurant-bg');
  textures.restaurantBackgrounds = [frame('restaurant-1'), frame('restaurant-2'), frame('restaurant-3')];
  textures.panel = frame('panel');
  textures.card = frame('card');
  textures.guideFocus = frame('guide-focus');
  textures.button = frame('button');
  textures.buttonDisabled = frame('button-disabled');
  textures.designStartButton = frame('design-start-button');
  textures.tableEmpty = frame('table-empty');
  textures.tableLocked = frame('table-locked');
  textures.tableReady = frame('table-ready');
  textures.tableFood = frame('table-food');
  textures.tablePay = frame('table-pay');
  textures.cashier = frame('cashier');
  textures.animals = [frame('cat'), frame('dog'), frame('rabbit'), frame('bear')];
  textures.coinIcon = frame('coin');
  textures.staminaIcon = frame('stamina');
  textures.starIcon = frame('star-filled');
  textures.starIconEmpty = frame('star-empty');
  assert.ok(textures instanceof cc.Component);
  return textures;
}

function createProfile(overrides = {}) {
  return {
    player: {
      playerId: 'component-player',
      coins: 80,
      stamina: 60,
      staminaMax: 60,
      staminaUpdatedAt: '2026-06-17T00:00:00.000Z',
      restaurantLevel: 2,
      parts: {
        cashier: 2,
        table: 3,
        chair: 0,
        floor: 1,
        wall: 5
      },
      stats: {},
      daily: {},
      ...(overrides.player || {})
    },
    economy: {
      incomePower: 31,
      expectedRevenue: 1086,
      upgradeCost: 100,
      ...(overrides.economy || {})
    },
    partLabels: {},
    partEffects: {
      cashier: '下一星：收银窗口更宽',
      table: '下一星：增加 1 个同时接待桌位',
      chair: '下一星：顾客耐心 +1.5 秒',
      floor: '下一星：移动与翻台更快',
      wall: '墙面已满星，等待整体升级餐厅',
      ...(overrides.partEffects || {})
    },
    tuning: {},
    allPartsMaxed: false,
    tasks: []
  };
}

function label(cc) {
  return new cc.Label();
}

function sprite(cc) {
  return new cc.Sprite();
}

function button(cc) {
  return new cc.Button();
}

function verifyTextureCatalog(textures) {
  assert.equal(textures.requireTexture('panel').name, 'panel');
  assert.equal(textures.getRestaurantBackground(1).name, 'restaurant-1');
  assert.equal(textures.getRestaurantBackground(3).name, 'restaurant-3');
  assert.equal(textures.getRestaurantBackground(9).name, 'restaurant-3');
  assert.equal(textures.getStarFrame(true).name, 'star-filled');
  assert.equal(textures.getStarFrame(false).name, 'star-empty');
}

function verifyTableSlotView(TableSlotView, cc, textures) {
  const view = new TableSlotView();
  view.tableSprite = sprite(cc);
  view.customerSprite = sprite(cc);
  view.label = label(cc);
  view.button = button(cc);
  let clickedIndex = -1;
  view.bind(2, (index) => {
    clickedIndex = index;
  });
  assert.equal(view.button.node.events[0].event, cc.Button.EventType.CLICK);
  assert.equal(view.button.transition, cc.Button.Transition.NONE);

  view.button.transition = cc.Button.Transition.SCALE;
  view.render(null, 2, textures, true);
  assert.equal(view.tableSprite.spriteFrame.name, 'table-empty');
  assert.equal(view.customerSprite.node.active, false);
  assert.equal(view.label.string, '点我入座');
  assert.equal(view.button.interactable, true);
  assert.equal(view.button.transition, cc.Button.Transition.NONE);

  view.render({
    id: 10,
    customerType: 'normal',
    animalIndex: 5,
    phase: 'readyFood',
    patience: 3.2,
    maxPatience: 16,
    phaseTime: 3.2
  }, 0, textures, true);
  assert.equal(view.tableSprite.spriteFrame.name, 'table-ready');
  assert.equal(view.customerSprite.node.active, true);
  assert.equal(view.customerSprite.spriteFrame.name, 'dog');
  assert.equal(view.label.string, '点我上菜 4s');

  view.render({
    id: 11,
    customerType: 'normal',
    animalIndex: 2,
    phase: 'eating',
    patience: 12,
    maxPatience: 16,
    phaseTime: 8.1
  }, 0, textures, true);
  assert.equal(view.tableSprite.spriteFrame.name, 'table-food');
  assert.equal(view.label.string, '用餐中 9s');

  view.render({
    id: 12,
    customerType: 'normal',
    animalIndex: 3,
    phase: 'readyPay',
    patience: 5.5,
    maxPatience: 8,
    phaseTime: 5.5
  }, 0, textures, true);
  assert.equal(view.tableSprite.spriteFrame.name, 'table-pay');
  assert.equal(view.label.string, '点我收银 6s');

  view.render(null, 0, textures, false);
  assert.equal(view.tableSprite.spriteFrame.name, 'table-locked');
  assert.equal(view.customerSprite.node.active, false);
  assert.equal(view.label.string, '未解锁');
  assert.equal(view.button.interactable, false);

  view.button.node.events[0].callback.call(view.button.node.events[0].target);
  assert.equal(clickedIndex, 2);
}

function verifyPartStatusView(PartStatusView, cc, textures) {
  const view = new PartStatusView();
  view.titleLabel = label(cc);
  view.starSprites = Array.from({ length: 5 }, () => sprite(cc));
  view.bind('table');
  view.render(createProfile(), textures);

  assert.equal(view.titleLabel.string, '餐桌');
  assert.deepEqual(view.starSprites.map((item) => item.spriteFrame?.name), [
    'star-filled',
    'star-filled',
    'star-filled',
    'star-empty',
    'star-empty'
  ]);
  assert.deepEqual(view.starSprites.map((item) => item.node.active), [true, true, true, true, true]);
}

function verifyPartUpgradeView(PartUpgradeView, cc, textures) {
  const view = new PartUpgradeView();
  view.titleLabel = label(cc);
  view.costLabel = label(cc);
  view.effectLabel = label(cc);
  view.starSprites = Array.from({ length: 6 }, () => sprite(cc));
  view.upgradeButton = button(cc);
  view.buttonLabel = label(cc);
  let upgradedPart = '';
  view.bind('cashier', (part) => {
    upgradedPart = part;
  });
  assert.equal(view.upgradeButton.transition, cc.Button.Transition.NONE);

  view.upgradeButton.transition = cc.Button.Transition.COLOR;
  view.render(createProfile(), textures);
  assert.equal(view.titleLabel.string, '收银机');
  assert.equal(view.costLabel.string, '成本 100 还差20');
  assert.equal(view.effectLabel.string, '效率 +8%');
  assert.equal(view.upgradeButton.interactable, false);
  assert.equal(view.upgradeButton.transition, cc.Button.Transition.NONE);
  assert.equal(view.buttonLabel.string, '升级');
  assert.deepEqual(view.starSprites.map((item) => item.spriteFrame?.name), [
    'star-filled',
    'star-filled',
    'star-empty',
    'star-empty',
    'star-empty',
    undefined
  ]);
  assert.deepEqual(view.starSprites.map((item) => item.node.active), [true, true, true, true, true, false]);

  view.render(createProfile({ player: { coins: 120 } }), textures);
  assert.equal(view.upgradeButton.interactable, true);
  view.upgradeButton.node.events[0].callback.call(view.upgradeButton.node.events[0].target);
  assert.equal(upgradedPart, 'cashier');

  const maxed = new PartUpgradeView();
  maxed.titleLabel = label(cc);
  maxed.costLabel = label(cc);
  maxed.effectLabel = label(cc);
  maxed.starSprites = Array.from({ length: 5 }, () => sprite(cc));
  maxed.upgradeButton = button(cc);
  maxed.buttonLabel = label(cc);
  maxed.bind('wall', () => {});
  maxed.upgradeButton.transition = cc.Button.Transition.SCALE;
  maxed.render(createProfile({ player: { coins: 10000 } }), textures);
  assert.equal(maxed.costLabel.string, '已满星');
  assert.equal(maxed.effectLabel.string, '墙面已满星，等待整体升级餐厅');
  assert.equal(maxed.upgradeButton.interactable, false);
  assert.equal(maxed.upgradeButton.transition, cc.Button.Transition.NONE);
  assert.equal(maxed.buttonLabel.string, '满星');
}

function verifyTaskItemView(TaskItemView, cc) {
  const view = new TaskItemView();
  view.titleLabel = label(cc);
  view.typeLabel = label(cc);
  view.descriptionLabel = label(cc);
  view.progressLabel = label(cc);
  view.rewardLabel = label(cc);
  view.buttonLabel = label(cc);
  view.claimButton = button(cc);
  let claimedTaskId = '';
  view.bind((taskId) => {
    claimedTaskId = taskId;
  });
  assert.equal(view.claimButton.transition, cc.Button.Transition.NONE);

  view.claimButton.transition = cc.Button.Transition.SPRITE;
  view.render({
    id: 'daily_sessions_3',
    type: 'daily',
    typeLabel: '每日任务',
    title: '今日营业 3 次',
    description: '完成 3 次营业。',
    progress: 2,
    target: 3,
    completed: false,
    claimed: false,
    reward: { coins: 100, stamina: 10 }
  });
  assert.equal(view.titleLabel.string, '今日营业 3 次');
  assert.equal(view.typeLabel.string, '每日任务');
  assert.equal(view.progressLabel.string, '2/3');
  assert.equal(view.rewardLabel.string, '100\n10');
  assert.equal(view.buttonLabel.string, '前往');
  assert.equal(view.claimButton.interactable, false);
  assert.equal(view.claimButton.transition, cc.Button.Transition.NONE);

  view.render({
    id: 'daily_sessions_3',
    type: 'daily',
    title: '今日营业 3 次',
    description: '完成 3 次营业。',
    progress: 3,
    target: 3,
    completed: true,
    claimed: false,
    reward: { coins: 100, stamina: 10 }
  });
  assert.equal(view.typeLabel.string, '每日任务');
  assert.equal(view.buttonLabel.string, '领取');
  assert.equal(view.claimButton.interactable, true);
  view.claimButton.node.events[0].callback.call(view.claimButton.node.events[0].target);
  assert.equal(claimedTaskId, 'daily_sessions_3');

  view.render({
    id: 'daily_sessions_3',
    type: 'daily',
    title: '今日营业 3 次',
    description: '完成 3 次营业。',
    progress: 3,
    target: 3,
    completed: true,
    claimed: true,
    reward: { coins: 100, stamina: 10 }
  });
  assert.equal(view.buttonLabel.string, '已领取');
  assert.equal(view.claimButton.interactable, false);
}

function verifyTexturedButtonView(TexturedButtonView, cc, textures) {
  const view = new TexturedButtonView();
  view.button = button(cc);
  view.backgroundSprite = sprite(cc);
  view.label = label(cc);
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'button');
  assert.equal(view.button.transition, cc.Button.Transition.NONE);

  view.button.transition = cc.Button.Transition.SCALE;
  view.button.interactable = false;
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'button-disabled');
  assert.equal(view.button.transition, cc.Button.Transition.NONE);

  view.visualState = 'active';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'button');

  view.visualState = 'muted';
  view.button.interactable = true;
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'button-disabled');

  view.setText('开始营业');
  assert.equal(view.label.string, '开始营业');

  view.normalTexture = 'designStartButton';
  view.visualState = 'normal';
  view.button.interactable = true;
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'design-start-button');

  view.normalTexture = 'none';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame, null);
}

function verifyTexturedPanelView(TexturedPanelView, cc, textures) {
  const view = new TexturedPanelView();
  view.backgroundSprite = sprite(cc);
  view.panelTexture = 'panel';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'panel');

  view.panelTexture = 'card';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'card');

  view.panelTexture = 'guideFocus';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'guide-focus');

  view.panelTexture = 'button';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'button');

  view.panelTexture = 'buttonDisabled';
  view.render(textures);
  assert.equal(view.backgroundSprite.spriteFrame.name, 'button-disabled');
}

function verifyMobileSafeAreaView(MobileSafeAreaView, cc) {
  const view = new MobileSafeAreaView();
  view.symmetric = true;
  view.minTouchInset = 24;
  view.applySafeArea();

  const widget = view.node.getComponent(cc.Widget);
  const safeArea = view.node.getComponent(cc.SafeArea);
  assert.equal(widget.alignMode, cc.Widget.AlignMode.ON_WINDOW_RESIZE);
  assert.equal(widget.isAlignTop, true);
  assert.equal(widget.isAlignBottom, true);
  assert.equal(widget.isAlignLeft, true);
  assert.equal(widget.isAlignRight, true);
  assert.equal(widget.top, 24);
  assert.equal(widget.bottom, 24);
  assert.equal(widget.alignmentUpdated, true);
  assert.equal(safeArea.symmetric, true);
  assert.equal(safeArea.updated, true);
}
