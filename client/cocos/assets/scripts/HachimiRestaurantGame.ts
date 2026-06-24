import {
  _decorator,
  Button,
  Component,
  EventMouse,
  EventTouch,
  ImageAsset,
  input,
  Input,
  Label,
  Node,
  resources,
  Sprite,
  SpriteFrame,
  sys,
  Texture2D,
  UITransform,
  Vec2,
  Vec3
} from 'cc';
import { BusinessSimulation, BusinessSimulationSnapshot, LocalBusinessSummary } from './core/BusinessSimulation';
import {
  CONSTANTS,
  PARTS,
  PartKey,
  ProfileState,
  SettlementState,
  SpeedMode,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TaskType
} from './core/GameRules';
import { ApiClient, ApiRequestError } from './services/ApiClient';
import { PartStatusView } from './components/PartStatusView';
import { PartUpgradeView } from './components/PartUpgradeView';
import { TableSlotView } from './components/TableSlotView';
import { TaskItemView } from './components/TaskItemView';
import { TexturedButtonView } from './components/TexturedButtonView';
import { TexturedPanelView } from './components/TexturedPanelView';
import { TextureCatalog } from './components/TextureCatalog';
import { MobileSafeAreaView } from './components/MobileSafeAreaView';

const { ccclass, property } = _decorator;

type ScreenKey = 'main' | 'business' | 'upgrade' | 'tasks' | 'result';
const GUIDE_FOCUS_KEYS = [
  'startBusiness',
  'upgradeNav',
  'taskNav',
  'seatCustomer',
  'serveFood',
  'collectPay',
  'upgradePart',
  'claimTask'
] as const;

type GuideFocusKey = 'none' | (typeof GUIDE_FOCUS_KEYS)[number];
type GuideStep = {
  key: GuideFocusKey;
  message: string;
};
type RuntimeHitArea = {
  screens: ScreenKey[];
  x: number;
  y: number;
  width: number;
  height: number;
  action: () => void;
};

const LOCAL_SESSION_SNAPSHOT_KEY = 'hachimi-active-session-snapshot';
const RUNTIME_DESIGN_WIDTH = 720;
const RUNTIME_DESIGN_HEIGHT = 1280;
const RUNTIME_NAV_SCREENS: ScreenKey[] = ['main', 'upgrade', 'tasks'];
const RUNTIME_TEXTURES = {
  restaurantBackgrounds: [
    'textures/restaurant-bg-stage-1',
    'textures/restaurant-bg-stage-2',
    'textures/restaurant-bg-stage-3'
  ],
  panel: 'textures/panel',
  card: 'textures/card',
  guideFocus: 'textures/guide-focus',
  button: 'textures/button',
  buttonDisabled: 'textures/button-disabled',
  tableEmpty: 'textures/table-empty',
  tableLocked: 'textures/table-locked',
  tableReady: 'textures/table-ready',
  tableFood: 'textures/table-food',
  tablePay: 'textures/table-pay',
  cashier: 'textures/cashier',
  animals: [
    'textures/customer-cat',
    'textures/customer-dog',
    'textures/customer-rabbit',
    'textures/customer-bear'
  ],
  coinIcon: 'textures/icon-coin',
  staminaIcon: 'textures/icon-stamina',
  starIcon: 'textures/icon-star',
  starIconEmpty: 'textures/icon-star-empty'
} as const;

@ccclass('HachimiRestaurantGame')
export class HachimiRestaurantGame extends Component {
  @property
  apiBaseUrl = '';

  @property(TextureCatalog)
  textures: TextureCatalog | null = null;

  @property(Node)
  mainScreen: Node | null = null;

  @property(Node)
  businessScreen: Node | null = null;

  @property(Node)
  upgradeScreen: Node | null = null;

  @property(Node)
  taskScreen: Node | null = null;

  @property(Node)
  resultScreen: Node | null = null;

  @property(Label)
  coinLabel: Label | null = null;

  @property(Label)
  staminaLabel: Label | null = null;

  @property(Label)
  levelLabel: Label | null = null;

  @property(Label)
  nextRevenueLabel: Label | null = null;

  @property(Label)
  messageLabel: Label | null = null;

  @property(Label)
  timerLabel: Label | null = null;

  @property(Label)
  speedLabel: Label | null = null;

  @property(Label)
  startButtonLabel: Label | null = null;

  @property(Label)
  businessStatsLabel: Label | null = null;

  @property(Label)
  satisfactionLabel: Label | null = null;

  @property(Label)
  feedbackLabel: Label | null = null;

  @property(Label)
  resultLabel: Label | null = null;

  @property(Label)
  guideLabel: Label | null = null;

  @property(Label)
  guideTaskHeaderLabel: Label | null = null;

  @property(Label)
  dailyTaskHeaderLabel: Label | null = null;

  @property(Label)
  growthTaskHeaderLabel: Label | null = null;

  @property(Button)
  startButton: Button | null = null;

  @property(Button)
  mainNavButton: Button | null = null;

  @property(Button)
  upgradeNavButton: Button | null = null;

  @property(Button)
  taskNavButton: Button | null = null;

  @property(Button)
  resultMainButton: Button | null = null;

  @property(Button)
  resultUpgradeButton: Button | null = null;

  @property(Button)
  speedButton: Button | null = null;

  @property(Button)
  cashierButton: Button | null = null;

  @property(Button)
  finishButton: Button | null = null;

  @property(Button)
  restaurantUpgradeButton: Button | null = null;

  @property(Sprite)
  restaurantBackgroundSprite: Sprite | null = null;

  @property(Sprite)
  cashierSprite: Sprite | null = null;

  @property([TableSlotView])
  tableSlots: TableSlotView[] = [];

  @property([Sprite])
  waitingCustomerSprites: Sprite[] = [];

  @property([Label])
  waitingCustomerLabels: Label[] = [];

  @property([PartStatusView])
  partStatusViews: PartStatusView[] = [];

  @property([PartUpgradeView])
  partViews: PartUpgradeView[] = [];

  @property([TaskItemView])
  taskViews: TaskItemView[] = [];

  @property([TexturedButtonView])
  texturedButtons: TexturedButtonView[] = [];

  @property([TexturedPanelView])
  texturedPanels: TexturedPanelView[] = [];

  @property([Node])
  guideFocusNodes: Node[] = [];

  @property([TexturedPanelView])
  guideFocusPanels: TexturedPanelView[] = [];

  private api!: ApiClient;
  private profile: ProfileState | null = null;
  private simulation: BusinessSimulation | null = null;
  private speedMode: SpeedMode = '1x';
  private activeScreen: ScreenKey = 'main';
  private settlement: SettlementState | null = null;
  private finishing = false;
  private activeSessionId = '';
  private nextSettlementRetryAtMs = 0;
  private runtimeRoot: Node | null = null;
  private runtimeNavBar: Node | null = null;
  private runtimeHitAreas: RuntimeHitArea[] = [];
  private runtimeInputBound = false;
  private runtimeTexturesLoaded = false;
  private coinIconSprite: Sprite | null = null;
  private staminaIconSprite: Sprite | null = null;
  private levelIconSprite: Sprite | null = null;
  private revenueIconSprite: Sprite | null = null;
  private mainDecorSprites: Sprite[] = [];
  private mainNavButtonView: TexturedButtonView | null = null;
  private upgradeNavButtonView: TexturedButtonView | null = null;
  private taskNavButtonView: TexturedButtonView | null = null;

  onLoad(): void {
    this.ensureRuntimeScene();
    this.api = new ApiClient(this.apiBaseUrl);
    this.configureButtonTransitions();
    this.startButton?.node.on(Button.EventType.CLICK, this.startBusiness, this);
    this.mainNavButton?.node.on(Button.EventType.CLICK, this.showMain, this);
    this.upgradeNavButton?.node.on(Button.EventType.CLICK, this.showUpgrade, this);
    this.taskNavButton?.node.on(Button.EventType.CLICK, this.showTasks, this);
    this.resultMainButton?.node.on(Button.EventType.CLICK, this.showMain, this);
    this.resultUpgradeButton?.node.on(Button.EventType.CLICK, this.showUpgrade, this);
    this.speedButton?.node.on(Button.EventType.CLICK, this.toggleSpeed, this);
    this.cashierButton?.node.on(Button.EventType.CLICK, this.collectFirstReadyPay, this);
    this.finishButton?.node.on(Button.EventType.CLICK, this.finishBusiness, this);
    this.restaurantUpgradeButton?.node.on(Button.EventType.CLICK, this.upgradeRestaurant, this);
    this.tableSlots.forEach((slot, index) => slot.bind(index, this.handleTablePressed.bind(this)));
    this.partStatusViews.forEach((view, index) => view.bind(PARTS[index]));
    this.partViews.forEach((view, index) => view.bind(PARTS[index], this.upgradePart.bind(this)));
    this.taskViews.forEach((view) => view.bind(this.claimTask.bind(this)));
  }

  private ensureRuntimeScene(): void {
    if (this.mainScreen || this.businessScreen || this.upgradeScreen || this.taskScreen || this.resultScreen) {
      return;
    }

    this.textures = this.getComponent(TextureCatalog) || this.node.addComponent(TextureCatalog);

    const root = this.createNode('RuntimeGameRoot', this.node, 0, 0, RUNTIME_DESIGN_WIDTH, RUNTIME_DESIGN_HEIGHT);
    this.runtimeRoot = root;
    this.applyRuntimeRootFit();
    const background = this.createNode('RuntimeRestaurantBackground', root, 0, 0, RUNTIME_DESIGN_WIDTH, RUNTIME_DESIGN_HEIGHT);
    this.restaurantBackgroundSprite = this.createSprite(background);
    this.createTexturedPanel(root, 'RuntimeTitlePanel', 0, 570, 540, 66, 'button');
    this.createLabel(root, 'TitleLabel', '八酱小动物餐厅', 0, 570, 640, 48, 36);

    this.createTexturedPanel(root, 'CoinHudPanel', -175, 512, 318, 58, 'button');
    this.createTexturedPanel(root, 'StaminaHudPanel', 175, 512, 318, 58, 'button');
    this.createTexturedPanel(root, 'LevelHudPanel', -175, 448, 318, 58, 'button');
    this.createTexturedPanel(root, 'RevenueHudPanel', 175, 448, 318, 58, 'button');
    this.coinIconSprite = this.createSprite(this.createNode('CoinHudIcon', root, -305, 512, 38, 38));
    this.staminaIconSprite = this.createSprite(this.createNode('StaminaHudIcon', root, 45, 512, 38, 38));
    this.levelIconSprite = this.createSprite(this.createNode('LevelHudIcon', root, -305, 448, 38, 38));
    this.revenueIconSprite = this.createSprite(this.createNode('RevenueHudIcon', root, 45, 448, 38, 38));
    this.coinLabel = this.createLabel(root, 'CoinLabel', '金币 --', -155, 512, 250, 32, 21);
    this.staminaLabel = this.createLabel(root, 'StaminaLabel', '体力 --', 195, 512, 250, 32, 18);
    this.levelLabel = this.createLabel(root, 'LevelLabel', '餐厅 Lv.--', -155, 448, 250, 32, 21);
    this.nextRevenueLabel = this.createLabel(root, 'NextRevenueLabel', '下次收入 --', 195, 448, 250, 32, 21);
    this.messageLabel = this.createLabel(root, 'MessageLabel', '', 0, -560, 660, 48, 20);
    this.guideLabel = this.createLabel(root, 'GuideLabel', '', 0, -500, 660, 44, 22);

    this.runtimeNavBar = this.createNode('RuntimeNavBar', root, 0, -430, 660, 72);
    this.createTexturedPanel(this.runtimeNavBar, 'RuntimeNavPanel', 0, 0, 680, 84, 'panel');
    const mainNav = this.createButton(this.runtimeNavBar, 'MainNavButton', '餐厅', -220, 0, 180, 64, 24);
    const upgradeNav = this.createButton(this.runtimeNavBar, 'UpgradeNavButton', '升级', 0, 0, 180, 64, 24);
    const taskNav = this.createButton(this.runtimeNavBar, 'TaskNavButton', '任务', 220, 0, 180, 64, 24);
    this.mainNavButton = mainNav.button;
    this.upgradeNavButton = upgradeNav.button;
    this.taskNavButton = taskNav.button;
    this.mainNavButtonView = mainNav.view;
    this.upgradeNavButtonView = upgradeNav.view;
    this.taskNavButtonView = taskNav.view;

    this.mainScreen = this.createScreen(root, 'MainScreen');
    this.businessScreen = this.createScreen(root, 'BusinessScreen');
    this.upgradeScreen = this.createScreen(root, 'UpgradeScreen');
    this.taskScreen = this.createScreen(root, 'TaskScreen');
    this.resultScreen = this.createScreen(root, 'ResultScreen');

    this.buildRuntimeMainScreen();
    this.buildRuntimeBusinessScreen();
    this.buildRuntimeUpgradeScreen();
    this.buildRuntimeTaskScreen();
    this.buildRuntimeResultScreen();
    this.configureRuntimeHitAreas();
    this.bindRuntimeInput();
    this.setScreen('main');
  }

  onDestroy(): void {
    if (!this.runtimeInputBound) {
      return;
    }
    input.off(Input.EventType.MOUSE_UP, this.handleRuntimeMouseUp, this);
    input.off(Input.EventType.TOUCH_END, this.handleRuntimeTouchEnd, this);
    this.runtimeInputBound = false;
  }

  private buildRuntimeMainScreen(): void {
    if (!this.mainScreen) {
      return;
    }

    this.createTexturedPanel(this.mainScreen, 'MainSubtitlePanel', 0, 325, 640, 50, 'buttonDisabled');
    this.createLabel(this.mainScreen, 'MainSubtitleLabel', '安排入座、上菜、收银，经营第一天。', 0, 325, 640, 40, 24);
    this.createTexturedPanel(this.mainScreen, 'MainPreviewPanel', 0, 178, 640, 250, 'panel');
    this.mainDecorSprites = [
      this.createSprite(this.createNode('MainDecorCustomerLeft', this.mainScreen, -210, 175, 88, 88)),
      this.createSprite(this.createNode('MainDecorCustomerCenter', this.mainScreen, 0, 135, 96, 96)),
      this.createSprite(this.createNode('MainDecorCustomerRight', this.mainScreen, 210, 175, 88, 88))
    ];
    const start = this.createButton(this.mainScreen, 'StartButton', '开始营业', 0, 230, 260, 74, 28);
    this.startButton = start.button;
    this.startButtonLabel = start.label;

    this.createTexturedPanel(this.mainScreen, 'PartStatusPanel', 0, -20, 650, 335, 'panel');
    this.partStatusViews = PARTS.map((part, index) => {
      const row = this.createNode(`PartStatus_${part}`, this.mainScreen!, 0, 125 - index * 54, 600, 46);
      this.createTexturedPanel(row, `PartStatusCard_${part}`, 0, 0, 600, 46, 'button');
      const view = row.addComponent(PartStatusView);
      view.titleLabel = this.createLabel(row, `PartStatusLabel_${part}`, PARTS[index], -190, 0, 180, 30, 22);
      view.starSprites = Array.from({ length: CONSTANTS.starsPerPart }, (_, starIndex) => (
        this.createSprite(this.createNode(`PartStatusStar_${part}_${starIndex}`, row, -45 + starIndex * 38, 0, 30, 30))
      ));
      return view;
    });
  }

  private buildRuntimeBusinessScreen(): void {
    if (!this.businessScreen) {
      return;
    }

    this.timerLabel = this.createLabel(this.businessScreen, 'TimerLabel', '剩余 --', 0, 345, 240, 36, 26);
    this.speedLabel = this.createLabel(this.businessScreen, 'SpeedLabel', '1x', 250, 345, 100, 34, 22);
    this.businessStatsLabel = this.createLabel(this.businessScreen, 'BusinessStatsLabel', '服务 0 / 离开 0 / 连击 0', 0, 300, 620, 34, 22);
    this.satisfactionLabel = this.createLabel(this.businessScreen, 'SatisfactionLabel', '满意 --', 0, 262, 360, 32, 22);
    this.feedbackLabel = this.createLabel(this.businessScreen, 'FeedbackLabel', '', 0, 222, 560, 32, 22);

    this.waitingCustomerLabels = Array.from({ length: 4 }, (_, index) => (
      this.createLabel(this.businessScreen!, `WaitingLabel_${index}`, '', -240 + index * 160, 175, 130, 28, 20)
    ));
    this.waitingCustomerSprites = Array.from({ length: 4 }, (_, index) => {
      const node = this.createNode(`WaitingCustomer_${index}`, this.businessScreen!, -240 + index * 160, 208, 72, 72);
      return this.createSprite(node);
    });

    const positions = [
      [-170, 65],
      [170, 65],
      [-170, -90],
      [170, -90],
      [0, -245]
    ];
    this.tableSlots = positions.map(([x, y], index) => {
      const node = this.createNode(`TableSlot_${index}`, this.businessScreen!, x, y, 250, 112);
      const view = node.addComponent(TableSlotView);
      view.tableSprite = this.createSprite(node);
      view.customerSprite = this.createSprite(this.createNode(`TableCustomer_${index}`, node, 0, 18, 78, 78));
      view.button = node.addComponent(Button);
      view.label = this.createLabel(node, `TableSlotLabel_${index}`, '空桌', 0, 0, 230, 64, 22);
      return view;
    });

    const speed = this.createButton(this.businessScreen, 'SpeedButton', '切速', -220, -385, 150, 62, 22);
    const cashier = this.createButton(this.businessScreen, 'CashierButton', '收银机', 0, -385, 170, 62, 22);
    const finish = this.createButton(this.businessScreen, 'FinishButton', '结束结算', 220, -385, 180, 62, 22);
    this.speedButton = speed.button;
    this.cashierButton = cashier.button;
    this.finishButton = finish.button;
    this.cashierSprite = this.createSprite(this.createNode('CashierSprite', this.businessScreen, 0, -315, 96, 78));
  }

  private buildRuntimeUpgradeScreen(): void {
    if (!this.upgradeScreen) {
      return;
    }

    this.createTexturedPanel(this.upgradeScreen, 'UpgradeTitlePanel', 0, 350, 660, 70, 'button');
    this.createLabel(this.upgradeScreen, 'UpgradeTitleLabel', '升级餐厅部件', 0, 350, 640, 42, 30);
    this.createTexturedPanel(this.upgradeScreen, 'UpgradeListPanel', 0, 25, 680, 650, 'panel');
    this.partViews = PARTS.map((part, index) => {
      const row = this.createNode(`PartUpgrade_${part}`, this.upgradeScreen!, 0, 250 - index * 105, 650, 92);
      this.createTexturedPanel(row, `PartUpgradeCard_${part}`, 0, 0, 650, 92, 'button');
      const view = row.addComponent(PartUpgradeView);
      view.titleLabel = this.createLabel(row, `PartUpgradeTitle_${part}`, part, -225, 20, 180, 28, 22);
      view.costLabel = this.createLabel(row, `PartUpgradeCost_${part}`, '成本 --', -45, 20, 210, 28, 19);
      view.effectLabel = this.createLabel(row, `PartUpgradeEffect_${part}`, '', -45, -18, 360, 28, 18);
      view.starSprites = Array.from({ length: CONSTANTS.starsPerPart }, (_, starIndex) => (
        this.createSprite(this.createNode(`PartUpgradeStar_${part}_${starIndex}`, row, 90 + starIndex * 26, 21, 22, 22))
      ));
      const button = this.createButton(row, `PartUpgradeButton_${part}`, '升级', 250, 0, 115, 54, 20);
      view.upgradeButton = button.button;
      view.buttonLabel = button.label;
      return view;
    });

    const restaurant = this.createButton(this.upgradeScreen, 'RestaurantUpgradeButton', '升级餐厅', 0, -360, 230, 64, 24);
    this.restaurantUpgradeButton = restaurant.button;
  }

  private buildRuntimeTaskScreen(): void {
    if (!this.taskScreen) {
      return;
    }

    this.createTexturedPanel(this.taskScreen, 'TaskTitlePanel', 0, 365, 660, 70, 'button');
    this.createLabel(this.taskScreen, 'TaskTitleLabel', '任务', 0, 365, 640, 42, 30);
    this.createTexturedPanel(this.taskScreen, 'TaskBoardPanel', 0, -35, 690, 745, 'panel');
    this.createTexturedPanel(this.taskScreen, 'GuideTaskHeaderPanel', -205, 322, 190, 42, 'button');
    this.createTexturedPanel(this.taskScreen, 'DailyTaskHeaderPanel', 0, 322, 190, 42, 'button');
    this.createTexturedPanel(this.taskScreen, 'GrowthTaskHeaderPanel', 205, 322, 190, 42, 'button');
    this.guideTaskHeaderLabel = this.createLabel(this.taskScreen, 'GuideTaskHeaderLabel', '', -205, 322, 190, 28, 20);
    this.dailyTaskHeaderLabel = this.createLabel(this.taskScreen, 'DailyTaskHeaderLabel', '', 0, 322, 190, 28, 20);
    this.growthTaskHeaderLabel = this.createLabel(this.taskScreen, 'GrowthTaskHeaderLabel', '', 205, 322, 190, 28, 20);

    this.taskViews = Array.from({ length: 13 }, (_, index) => {
      const row = this.createNode(`TaskRow_${index}`, this.taskScreen!, 0, 270 - index * 52, 660, 48);
      this.createTexturedPanel(row, `TaskRowCard_${index}`, 0, 0, 660, 48, 'button');
      const view = row.addComponent(TaskItemView);
      view.typeLabel = this.createLabel(row, `TaskType_${index}`, '', -285, 10, 80, 20, 16);
      view.titleLabel = this.createLabel(row, `TaskTitle_${index}`, '', -135, 10, 230, 20, 17);
      view.descriptionLabel = this.createLabel(row, `TaskDesc_${index}`, '', -80, -12, 330, 20, 15);
      view.progressLabel = this.createLabel(row, `TaskProgress_${index}`, '', 120, 10, 80, 20, 16);
      view.rewardLabel = this.createLabel(row, `TaskReward_${index}`, '', 145, -12, 130, 20, 15);
      const button = this.createButton(row, `TaskClaim_${index}`, '领取', 285, 0, 82, 40, 16);
      view.claimButton = button.button;
      view.buttonLabel = button.label;
      return view;
    });
  }

  private buildRuntimeResultScreen(): void {
    if (!this.resultScreen) {
      return;
    }

    this.createLabel(this.resultScreen, 'ResultTitleLabel', '营业结算', 0, 240, 640, 48, 34);
    this.resultLabel = this.createLabel(this.resultScreen, 'ResultLabel', '暂无结算', 0, 85, 560, 150, 28);
    const main = this.createButton(this.resultScreen, 'ResultMainButton', '继续营业', -145, -130, 210, 68, 24);
    const upgrade = this.createButton(this.resultScreen, 'ResultUpgradeButton', '去升级', 145, -130, 210, 68, 24);
    this.resultMainButton = main.button;
    this.resultUpgradeButton = upgrade.button;
  }

  private configureRuntimeHitAreas(): void {
    const navAreas: RuntimeHitArea[] = [
      { screens: RUNTIME_NAV_SCREENS, x: -220, y: -430, width: 180, height: 64, action: () => this.showMain() },
      { screens: RUNTIME_NAV_SCREENS, x: 0, y: -430, width: 180, height: 64, action: () => this.showUpgrade() },
      { screens: RUNTIME_NAV_SCREENS, x: 220, y: -430, width: 180, height: 64, action: () => this.showTasks() }
    ];
    const tableAreas: RuntimeHitArea[] = [
      [-170, 65],
      [170, 65],
      [-170, -90],
      [170, -90],
      [0, -245]
    ].map(([x, y], index) => ({
      screens: ['business'],
      x,
      y,
      width: 250,
      height: 112,
      action: () => this.handleTablePressed(index)
    }));
    const partAreas: RuntimeHitArea[] = PARTS.map((part, index) => ({
      screens: ['upgrade'],
      x: 250,
      y: 250 - index * 105,
      width: 115,
      height: 54,
      action: () => {
        void this.upgradePart(part);
      }
    }));
    const taskAreas: RuntimeHitArea[] = Array.from({ length: 13 }, (_, index) => ({
      screens: ['tasks'],
      x: 285,
      y: 270 - index * 52,
      width: 82,
      height: 40,
      action: () => {
        const task = this.profile?.tasks[index];
        if (task) {
          void this.claimTask(task.id);
        }
      }
    }));

    this.runtimeHitAreas = [
      ...navAreas,
      { screens: ['main'], x: 0, y: 230, width: 260, height: 74, action: () => { void this.startBusiness(); } },
      ...tableAreas,
      { screens: ['business'], x: -220, y: -385, width: 150, height: 62, action: () => this.toggleSpeed() },
      { screens: ['business'], x: 0, y: -385, width: 170, height: 62, action: () => this.collectFirstReadyPay() },
      { screens: ['business'], x: 220, y: -385, width: 180, height: 62, action: () => { void this.finishBusiness(); } },
      ...partAreas,
      { screens: ['upgrade'], x: 0, y: -360, width: 230, height: 64, action: () => { void this.upgradeRestaurant(); } },
      ...taskAreas,
      { screens: ['result'], x: -145, y: -130, width: 210, height: 68, action: () => this.showMain() },
      { screens: ['result'], x: 145, y: -130, width: 210, height: 68, action: () => this.showUpgrade() }
    ];
  }

  private bindRuntimeInput(): void {
    if (this.runtimeInputBound) {
      return;
    }
    input.on(Input.EventType.MOUSE_UP, this.handleRuntimeMouseUp, this);
    input.on(Input.EventType.TOUCH_END, this.handleRuntimeTouchEnd, this);
    this.runtimeInputBound = true;
  }

  private handleRuntimeMouseUp(event: EventMouse): void {
    this.handleRuntimeInput(event.getUILocation());
  }

  private handleRuntimeTouchEnd(event: EventTouch): void {
    this.handleRuntimeInput(event.getUILocation());
  }

  private handleRuntimeInput(location: Vec2): void {
    if (!this.runtimeRoot || this.runtimeHitAreas.length < 1) {
      return;
    }
    const point = this.toRuntimeDesignPoint(location);
    const hitArea = [...this.runtimeHitAreas]
      .reverse()
      .find((area) => (
        area.screens.includes(this.activeScreen)
        && Math.abs(point.x - area.x) <= area.width / 2
        && Math.abs(point.y - area.y) <= area.height / 2
      ));
    if (hitArea) {
      hitArea.action();
    }
  }

  private toRuntimeDesignPoint(location: Vec2): Vec2 {
    const size = this.node.getComponent(UITransform)?.contentSize;
    const scale = this.runtimeRoot?.scale.x || 1;
    const width = size?.width || RUNTIME_DESIGN_WIDTH;
    const height = size?.height || RUNTIME_DESIGN_HEIGHT;
    return new Vec2(
      (location.x - width / 2) / scale,
      (location.y - height / 2) / scale
    );
  }

  private createScreen(parent: Node, name: string): Node {
    const screen = this.createNode(name, parent, 0, 0, RUNTIME_DESIGN_WIDTH, RUNTIME_DESIGN_HEIGHT);
    const safeArea = screen.addComponent(MobileSafeAreaView);
    safeArea.minTouchInset = 16;
    return screen;
  }

  private applyRuntimeRootFit(): void {
    if (!this.runtimeRoot) {
      return;
    }
    const size = this.node.getComponent(UITransform)?.contentSize;
    if (!size || size.width <= 0 || size.height <= 0) {
      return;
    }
    const runtimeScale = Math.min(size.width / RUNTIME_DESIGN_WIDTH, size.height / RUNTIME_DESIGN_HEIGHT);
    this.runtimeRoot.scale = new Vec3(runtimeScale, runtimeScale, 1);
  }

  private createNode(name: string, parent: Node, x: number, y: number, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    node.parent = parent;
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
  }

  private createSprite(node: Node): Sprite {
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    return sprite;
  }

  private createLabel(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number
  ): Label {
    const node = this.createNode(name, parent, x, y, width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    return label;
  }

  private createTexturedPanel(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    panelTexture: 'panel' | 'card' | 'guideFocus' | 'button' | 'buttonDisabled' = 'panel'
  ): TexturedPanelView {
    const node = this.createNode(name, parent, x, y, width, height);
    const backgroundSprite = this.createSprite(node);
    const panel = node.addComponent(TexturedPanelView);
    panel.backgroundSprite = backgroundSprite;
    panel.panelTexture = panelTexture;
    this.texturedPanels.push(panel);
    return panel;
  }

  private createButton(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number
  ): { button: Button; label: Label; view: TexturedButtonView } {
    const node = this.createNode(name, parent, x, y, width, height);
    const backgroundSprite = this.createSprite(node);
    const button = node.addComponent(Button);
    button.transition = Button.Transition.NONE;
    const label = this.createLabel(node, `${name}Label`, text, 0, 0, width, height, fontSize);
    const texturedButton = node.addComponent(TexturedButtonView);
    texturedButton.button = button;
    texturedButton.backgroundSprite = backgroundSprite;
    texturedButton.label = label;
    this.texturedButtons.push(texturedButton);
    return { button, label, view: texturedButton };
  }

  private async loadRuntimeTextures(): Promise<void> {
    if (!this.textures || this.runtimeTexturesLoaded) {
      return;
    }

    try {
      const [
        restaurantBackgrounds,
        animals,
        panel,
        card,
        guideFocus,
        button,
        buttonDisabled,
        tableEmpty,
        tableLocked,
        tableReady,
        tableFood,
        tablePay,
        cashier,
        coinIcon,
        staminaIcon,
        starIcon,
        starIconEmpty
      ] = await Promise.all([
        this.loadRuntimeSpriteFrames([...RUNTIME_TEXTURES.restaurantBackgrounds]),
        this.loadRuntimeSpriteFrames([...RUNTIME_TEXTURES.animals]),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.panel),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.card),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.guideFocus),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.button),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.buttonDisabled),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.tableEmpty),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.tableLocked),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.tableReady),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.tableFood),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.tablePay),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.cashier),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.coinIcon),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.staminaIcon),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.starIcon),
        this.loadRuntimeSpriteFrame(RUNTIME_TEXTURES.starIconEmpty)
      ]);

      this.textures.restaurantBackground = restaurantBackgrounds[0] || null;
      this.textures.restaurantBackgrounds = restaurantBackgrounds;
      this.textures.animals = animals;
      this.textures.panel = panel;
      this.textures.card = card;
      this.textures.guideFocus = guideFocus;
      this.textures.button = button;
      this.textures.buttonDisabled = buttonDisabled;
      this.textures.tableEmpty = tableEmpty;
      this.textures.tableLocked = tableLocked;
      this.textures.tableReady = tableReady;
      this.textures.tableFood = tableFood;
      this.textures.tablePay = tablePay;
      this.textures.cashier = cashier;
      this.textures.coinIcon = coinIcon;
      this.textures.staminaIcon = staminaIcon;
      this.textures.starIcon = starIcon;
      this.textures.starIconEmpty = starIconEmpty;
      this.runtimeTexturesLoaded = true;
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private loadRuntimeSpriteFrames(paths: string[]): Promise<SpriteFrame[]> {
    return Promise.all(paths.map((path) => this.loadRuntimeSpriteFrame(path)));
  }

  private loadRuntimeSpriteFrame(path: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => {
      resources.load(path, ImageAsset, (error, imageAsset) => {
        if (error || !imageAsset) {
          reject(error || new Error(`Missing runtime texture: ${path}`));
          return;
        }
        const texture = new Texture2D();
        texture.image = imageAsset;
        const spriteFrame = new SpriteFrame();
        spriteFrame.name = path.split('/').pop() || path;
        spriteFrame.texture = texture;
        resolve(spriteFrame);
      });
    });
  }

  async start(): Promise<void> {
    this.applyRuntimeRootFit();
    await this.loadRuntimeTextures();
    await this.loadProfile();
  }

  update(deltaTime: number): void {
    this.applyRuntimeRootFit();
    if (this.activeScreen !== 'business' || !this.simulation || this.finishing) {
      return;
    }
    this.simulation.update(deltaTime);
    this.saveSessionSnapshot();
    this.renderBusiness();
    this.renderGuide();
    this.renderTexturedButtons();
    if (this.simulation.finished && this.getSettlementRetryWaitSeconds() <= 0) {
      void this.finishBusiness();
    }
  }

  showMain(): void {
    this.setScreen('main');
    this.renderAll();
  }

  showUpgrade(): void {
    this.setScreen('upgrade');
    this.renderAll();
  }

  showTasks(): void {
    this.setScreen('tasks');
    this.renderAll();
  }

  private async loadProfile(): Promise<void> {
    try {
      await this.finishStoredCompletedSession();
      this.profile = await this.api.getProfile();
      if (!this.profile.activeSession) {
        this.clearSessionSnapshot();
      }
      this.setMessage('');
      this.setScreen('main');
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private async startBusiness(): Promise<void> {
    if (!this.profile) {
      return;
    }
    try {
      const response = await this.api.startSession(this.speedMode);
      if (response.profile) {
        this.profile = response.profile;
      }
      if (!response.session || !response.profile) {
        throw new Error('Missing session from backend.');
      }
      this.activeSessionId = response.session.sessionId;
      this.nextSettlementRetryAtMs = 0;
      const snapshot = this.loadSessionSnapshot(response.session.sessionId);
      this.simulation = snapshot
        ? BusinessSimulation.fromSnapshot(response.profile.tuning, snapshot)
        : new BusinessSimulation(
          response.profile.tuning,
          response.session.speedMode,
          response.session.remainingSeconds ?? CONSTANTS.sessionDurationSeconds
        );
      this.speedMode = this.simulation.speedMode;
      this.finishing = false;
      this.setScreen('business');
      this.saveSessionSnapshot(response.session.startedAt, response.session.expiresAt);
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private async finishBusiness(): Promise<void> {
    if (!this.simulation || this.finishing) {
      return;
    }
    if (!this.simulation.finished) {
      return;
    }
    const retryWaitSeconds = this.getSettlementRetryWaitSeconds();
    if (retryWaitSeconds > 0) {
      this.setMessage(`结算准备中，还需等待 ${retryWaitSeconds}s`);
      this.renderAll();
      return;
    }
    this.finishing = true;
    try {
      const response = await this.api.finishSession(this.activeSessionId, this.simulation.getSummary());
      if (response.profile) {
        this.profile = response.profile;
      }
      this.settlement = response.settlement || null;
      this.simulation = null;
      this.clearSessionSnapshot(this.activeSessionId);
      this.activeSessionId = '';
      this.nextSettlementRetryAtMs = 0;
      this.setScreen('result');
      this.renderAll();
    } catch (error) {
      if (this.handleSessionNotReady(error)) {
        return;
      }
      this.setMessage(this.formatError(error));
      await this.loadProfile();
    } finally {
      this.finishing = false;
    }
  }

  private handleSessionNotReady(error: unknown): boolean {
    if (!(error instanceof ApiRequestError) || error.code !== 'SESSION_NOT_READY') {
      return false;
    }
    const remainingSeconds = Math.max(1, Math.ceil(error.remainingRealSeconds ?? 1));
    this.finishing = false;
    this.nextSettlementRetryAtMs = Date.now() + remainingSeconds * 1000;
    if (this.simulation) {
      this.simulation.finished = true;
      this.saveSessionSnapshot();
    }
    this.setMessage(`结算准备中，还需等待 ${remainingSeconds}s`);
    this.setScreen('business');
    this.renderAll();
    return true;
  }

  private async upgradePart(part: PartKey): Promise<void> {
    try {
      this.profile = await this.api.upgradePart(part);
      this.setMessage('部件已升级');
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private async upgradeRestaurant(): Promise<void> {
    try {
      this.profile = await this.api.upgradeRestaurant();
      this.setMessage('餐厅已整体升级');
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private async claimTask(taskId: string): Promise<void> {
    try {
      this.profile = await this.api.claimTask(taskId);
      this.setMessage('任务奖励已领取');
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private toggleSpeed(): void {
    if (this.simulation && this.activeScreen === 'business') {
      this.simulation.toggleSpeedMode();
      this.speedMode = this.simulation.speedMode;
      this.saveSessionSnapshot();
    } else {
      this.speedMode = this.speedMode === '1x' ? '2x' : '1x';
    }
    this.renderAll();
  }

  private handleTablePressed(tableIndex: number): void {
    this.simulation?.handleTablePressed(tableIndex);
    this.saveSessionSnapshot();
    this.renderBusiness();
    this.renderGuide();
  }

  private collectFirstReadyPay(): void {
    this.simulation?.collectFirstReadyPay();
    this.saveSessionSnapshot();
    this.renderBusiness();
    this.renderGuide();
  }

  private setScreen(screen: ScreenKey): void {
    this.activeScreen = screen;
    if (this.mainScreen) this.mainScreen.active = screen === 'main';
    if (this.businessScreen) this.businessScreen.active = screen === 'business';
    if (this.upgradeScreen) this.upgradeScreen.active = screen === 'upgrade';
    if (this.taskScreen) this.taskScreen.active = screen === 'tasks';
    if (this.resultScreen) this.resultScreen.active = screen === 'result';
    if (this.runtimeNavBar) this.runtimeNavBar.active = screen === 'main' || screen === 'upgrade' || screen === 'tasks';
  }

  private renderAll(): void {
    this.renderRestaurantBackground();
    this.renderRuntimeDecor();
    this.renderHeader();
    this.renderNavigation();
    this.renderGuide();
    this.renderPartStatus();
    this.renderBusiness();
    this.renderUpgrade();
    this.renderTasks();
    this.renderResult();
    this.renderTexturedPanels();
    this.renderTexturedButtons();
  }

  private renderHeader(): void {
    if (!this.profile) {
      return;
    }
    if (this.coinLabel) this.coinLabel.string = `金币 ${this.profile.player.coins}`;
    if (this.staminaLabel) this.staminaLabel.string = `体力 ${this.formatStaminaLabel()}`;
    if (this.levelLabel) this.levelLabel.string = `餐厅 Lv.${this.profile.player.restaurantLevel}`;
    if (this.nextRevenueLabel) this.nextRevenueLabel.string = `下次收入 ${this.profile.economy.expectedRevenue}`;
    if (this.speedLabel) this.speedLabel.string = this.speedMode;
    if (this.startButtonLabel) {
      this.startButtonLabel.string = this.profile.activeSession ? '继续营业' : '开始营业';
    }
    if (this.startButton) {
      this.startButton.interactable = Boolean(
        this.profile.activeSession || this.profile.player.stamina >= CONSTANTS.sessionStaminaCost
      );
    }
  }

  private renderNavigation(): void {
    const lockedDuringBusiness = this.activeScreen === 'business';
    this.renderNavButton(this.mainNavButton, this.mainNavButtonView, 'main', lockedDuringBusiness);
    this.renderNavButton(this.upgradeNavButton, this.upgradeNavButtonView, 'upgrade', lockedDuringBusiness);
    this.renderNavButton(this.taskNavButton, this.taskNavButtonView, 'tasks', lockedDuringBusiness);
  }

  private renderNavButton(
    button: Button | null,
    view: TexturedButtonView | null,
    screen: ScreenKey,
    lockedDuringBusiness: boolean
  ): void {
    const active = this.activeScreen === screen;
    if (button) {
      button.interactable = !lockedDuringBusiness && !active;
    }
    if (view) {
      view.visualState = active ? 'active' : 'muted';
    }
  }

  private renderRestaurantBackground(): void {
    if (!this.profile || !this.textures || !this.restaurantBackgroundSprite) {
      return;
    }
    this.restaurantBackgroundSprite.spriteFrame = this.textures.getRestaurantBackground(this.profile.player.restaurantLevel);
  }

  private renderRuntimeDecor(): void {
    if (!this.textures) {
      return;
    }
    if (this.coinIconSprite) this.coinIconSprite.spriteFrame = this.textures.coinIcon;
    if (this.staminaIconSprite) this.staminaIconSprite.spriteFrame = this.textures.staminaIcon;
    if (this.levelIconSprite) this.levelIconSprite.spriteFrame = this.textures.starIcon;
    if (this.revenueIconSprite) this.revenueIconSprite.spriteFrame = this.textures.coinIcon;
    this.mainDecorSprites.forEach((sprite, index) => {
      const frame = this.textures?.animals[index % this.textures.animals.length] || null;
      if (frame) {
        sprite.spriteFrame = frame;
      }
    });
  }

  private renderPartStatus(): void {
    if (!this.profile || !this.textures) {
      return;
    }
    this.partStatusViews.forEach((view) => view.render(this.profile!, this.textures!));
  }

  private renderBusiness(): void {
    const textures = this.textures;
    const simulation = this.simulation;
    if (!textures || !simulation) {
      return;
    }
    if (this.timerLabel) this.timerLabel.string = `剩余 ${Math.ceil(simulation.timeLeft)}s`;
    if (this.speedLabel) this.speedLabel.string = simulation.speedMode;
    if (this.finishButton) {
      this.finishButton.interactable =
        simulation.finished && !this.finishing && this.getSettlementRetryWaitSeconds() <= 0;
    }
    if (this.businessStatsLabel) {
      this.businessStatsLabel.string =
        `服务 ${simulation.customersServed} / 离开 ${simulation.customersLost} / 连击 ${simulation.combo}`;
    }
    if (this.satisfactionLabel) {
      this.satisfactionLabel.string = simulation.customersServed > 0
        ? `满意 ${simulation.satisfactionPercent}%`
        : '满意 --';
    }
    if (this.feedbackLabel) {
      this.feedbackLabel.string = simulation.lastFeedback;
      this.feedbackLabel.node.active = simulation.lastFeedback.length > 0;
    }
    this.tableSlots.forEach((slot, index) => {
      const unlocked = index < simulation.tables.length;
      slot.render(unlocked ? simulation.tables[index]?.customer || null : null, simulation.waiting.length, textures, unlocked);
    });
    this.waitingCustomerSprites.forEach((sprite, index) => {
      const customer = simulation.waiting[index];
      sprite.node.active = Boolean(customer);
      if (customer && textures.animals.length > 0) {
        sprite.spriteFrame = textures.animals[customer.animalIndex % textures.animals.length];
      }
    });
    this.waitingCustomerLabels.forEach((label, index) => {
      const customer = simulation.waiting[index];
      label.node.active = Boolean(customer);
      label.string = customer ? `${Math.max(0, Math.ceil(customer.patience))}s` : '';
    });
    if (this.cashierSprite) {
      this.cashierSprite.spriteFrame = textures.cashier;
    }
  }

  private renderUpgrade(): void {
    if (!this.profile || !this.textures) {
      return;
    }
    this.partViews.forEach((view) => view.render(this.profile!, this.textures!));
    if (this.restaurantUpgradeButton) {
      this.restaurantUpgradeButton.interactable = this.profile.allPartsMaxed;
    }
  }

  private renderTasks(): void {
    if (!this.profile) {
      return;
    }
    const taskHeaderLabels: Record<TaskType, Label | null> = {
      guide: this.guideTaskHeaderLabel,
      daily: this.dailyTaskHeaderLabel,
      growth: this.growthTaskHeaderLabel
    };
    TASK_TYPES.forEach((type) => this.renderTaskSectionHeader(taskHeaderLabels[type], type));
    this.taskViews.forEach((view, index) => {
      view.node.active = index < this.profile!.tasks.length;
      if (index < this.profile!.tasks.length) {
        view.render(this.profile!.tasks[index]);
      }
    });
  }

  private renderTaskSectionHeader(label: Label | null, type: TaskType): void {
    if (!label || !this.profile) {
      return;
    }
    const tasks = this.profile.tasks.filter((task) => task.type === type);
    const completed = tasks.filter((task) => task.completed).length;
    const claimable = tasks.filter((task) => task.completed && !task.claimed).length;
    label.node.active = tasks.length > 0;
    label.string = `${TASK_TYPE_LABELS[type]} ${completed}/${tasks.length}`
      + (claimable > 0 ? ` · 可领 ${claimable}` : '');
  }

  private renderResult(): void {
    if (!this.resultLabel) {
      return;
    }
    if (!this.settlement) {
      this.resultLabel.string = '暂无结算';
      return;
    }
    this.resultLabel.string =
      `获得金币 ${this.settlement.rewardCoins}\n`
      + `表现倍率 ${this.settlement.performanceFactor.toFixed(2)}x\n`
      + `期望收入 ${this.settlement.expectedRevenue}`;
  }

  private renderTexturedButtons(): void {
    this.configureButtonTransitions();
    if (!this.textures) {
      return;
    }
    this.texturedButtons.forEach((view) => view.render(this.textures!));
  }

  private configureButtonTransitions(): void {
    [
      this.startButton,
      this.mainNavButton,
      this.upgradeNavButton,
      this.taskNavButton,
      this.resultMainButton,
      this.resultUpgradeButton,
      this.speedButton,
      this.cashierButton,
      this.finishButton,
      this.restaurantUpgradeButton
    ].forEach((button) => {
      if (button) {
        button.transition = Button.Transition.NONE;
      }
    });
  }

  private renderTexturedPanels(): void {
    if (!this.textures) {
      return;
    }
    this.texturedPanels.forEach((view) => view.render(this.textures!));
  }

  private setMessage(message: string): void {
    if (this.messageLabel) {
      this.messageLabel.string = message;
    }
  }

  private renderGuide(): void {
    const guideStep = this.getGuideStep();
    if (this.guideLabel) {
      this.guideLabel.string = guideStep.message;
      this.guideLabel.node.active = guideStep.message.length > 0;
    }
    this.renderGuideFocus(guideStep.key);
  }

  private renderGuideFocus(focusKey: GuideFocusKey): void {
    this.guideFocusNodes.forEach((node, index) => {
      if (node) {
        node.active = GUIDE_FOCUS_KEYS[index] === focusKey;
      }
    });
    this.guideFocusPanels.forEach((panel, index) => {
      if (!panel) {
        return;
      }
      const active = GUIDE_FOCUS_KEYS[index] === focusKey;
      panel.node.active = active;
      if (active && this.textures) {
        panel.render(this.textures);
      }
    });
  }

  private getGuideMessage(): string {
    return this.getGuideStep().message;
  }

  private getGuideStep(): GuideStep {
    if (!this.profile) {
      return { key: 'none', message: '' };
    }
    const stats = this.profile.player.stats || {};

    if (stats.totalSessions === 0 && this.activeScreen === 'main') {
      return { key: 'startBusiness', message: '先开始营业，服务小动物赚第一笔金币。' };
    }

    if (stats.totalSessions === 0 && this.activeScreen === 'business' && this.simulation) {
      if (this.simulation.waiting.length > 0 && this.simulation.tables.some((table) => !table.customer)) {
        return { key: 'seatCustomer', message: '点击空餐桌，让等待的小动物入座。' };
      }
      if (this.simulation.tables.some((table) => table.customer?.phase === 'readyFood')) {
        return { key: 'serveFood', message: '顾客准备好了，点击餐桌完成上菜。' };
      }
      if (this.simulation.tables.some((table) => table.customer?.phase === 'readyPay')) {
        return { key: 'collectPay', message: '顾客用餐结束，点击餐桌或收银机收钱。' };
      }
      return { key: 'none', message: '等待小动物进店，留意餐桌状态。' };
    }

    if (stats.totalSessions > 0 && stats.totalPartUpgrades === 0) {
      return this.activeScreen === 'upgrade'
        ? { key: 'upgradePart', message: '自由选择任意部件升级，下一次期望收入 +8%。' }
        : { key: 'upgradeNav', message: '营业结束后去升级任意一个餐厅部件。' };
    }

    if (stats.totalPartUpgrades > 0 && stats.totalTasksClaimed === 0) {
      const claimable = this.profile.tasks?.some((task) => task.completed && !task.claimed);
      if (!claimable) {
        return { key: 'none', message: '' };
      }
      return this.activeScreen === 'tasks'
        ? { key: 'claimTask', message: '领取引导任务奖励，补充金币或体力。' }
        : { key: 'taskNav', message: '已有任务完成，去任务页领取奖励。' };
    }

    return { key: 'none', message: '' };
  }

  private async finishStoredCompletedSession(): Promise<void> {
    const snapshot = this.readStoredSessionSnapshot();
    if (!snapshot || !this.isStoredSessionCompleted(snapshot)) {
      return;
    }
    try {
      await this.api.finishSession(snapshot.sessionId, this.getSummaryFromSnapshot(snapshot));
      this.clearSessionSnapshot(snapshot.sessionId);
    } catch {
      // Profile loading below remains the source of truth for already-settled or invalid sessions.
    }
  }

  private saveSessionSnapshot(startedAt = '', expiresAt = ''): void {
    if (!this.simulation || !this.activeSessionId) {
      return;
    }
    const existing = this.loadSessionSnapshot(this.activeSessionId);
    const snapshot = this.simulation.getSnapshot(
      this.activeSessionId,
      startedAt || existing?.startedAt || '',
      expiresAt || existing?.expiresAt || ''
    );
    sys.localStorage.setItem(LOCAL_SESSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  private loadSessionSnapshot(sessionId: string): BusinessSimulationSnapshot | null {
    const snapshot = this.readStoredSessionSnapshot();
    return snapshot?.sessionId === sessionId ? snapshot : null;
  }

  private readStoredSessionSnapshot(): BusinessSimulationSnapshot | null {
    const raw = sys.localStorage.getItem(LOCAL_SESSION_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }
    try {
      const snapshot = JSON.parse(raw) as BusinessSimulationSnapshot;
      return snapshot && typeof snapshot.sessionId === 'string' ? snapshot : null;
    } catch {
      return null;
    }
  }

  private clearSessionSnapshot(sessionId = ''): void {
    const snapshot = this.readStoredSessionSnapshot();
    if (!sessionId || !snapshot || snapshot.sessionId === sessionId) {
      sys.localStorage.removeItem(LOCAL_SESSION_SNAPSHOT_KEY);
    }
  }

  private isStoredSessionCompleted(snapshot: BusinessSimulationSnapshot): boolean {
    return snapshot.finished || snapshot.timeLeft <= 0;
  }

  private getSummaryFromSnapshot(snapshot: BusinessSimulationSnapshot): LocalBusinessSummary {
    const customersServed = Math.max(0, Math.floor(snapshot.customersServed));
    const customersLost = Math.max(0, Math.floor(snapshot.customersLost));
    return {
      customersServed,
      customersLost,
      averageSatisfaction: customersServed > 0
        ? Math.max(0, Math.min(1, snapshot.satisfactionSum / customersServed))
        : 0,
      maxCombo: Math.max(0, Math.floor(snapshot.maxCombo)),
      durationSeconds: CONSTANTS.sessionDurationSeconds,
      speedMode: snapshot.speedMode,
      clientVersion: 'cocos-source-0.1.0',
      customerTypes: {
        normal: customersServed + customersLost
      }
    };
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private formatStaminaLabel(): string {
    if (!this.profile) {
      return '';
    }
    const base = `${this.profile.player.stamina}/${this.profile.player.staminaMax}`;
    const recovery = this.profile.staminaRecovery;
    if (!recovery || recovery.isFull) {
      return base;
    }
    return `${base} · +1 ${this.formatShortDuration(recovery.secondsUntilNext)} · 回满 ${this.formatShortDuration(recovery.secondsUntilFull)}`;
  }

  private formatShortDuration(seconds: number): string {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    if (safeSeconds >= 60) {
      return `${Math.ceil(safeSeconds / 60)}m`;
    }
    return `${safeSeconds}s`;
  }

  private getSettlementRetryWaitSeconds(): number {
    if (this.nextSettlementRetryAtMs <= 0) {
      return 0;
    }
    return Math.max(0, Math.ceil((this.nextSettlementRetryAtMs - Date.now()) / 1000));
  }
}
