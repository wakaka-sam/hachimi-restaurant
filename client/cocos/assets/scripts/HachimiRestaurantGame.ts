import { _decorator, Button, Component, Label, Node, Sprite } from 'cc';
import { BusinessSimulation } from './core/BusinessSimulation';
import { CONSTANTS, PARTS, PartKey, ProfileState, SettlementState, SpeedMode } from './core/GameRules';
import { ApiClient } from './services/ApiClient';
import { PartUpgradeView } from './components/PartUpgradeView';
import { TableSlotView } from './components/TableSlotView';
import { TaskItemView } from './components/TaskItemView';
import { TextureCatalog } from './components/TextureCatalog';

const { ccclass, property } = _decorator;

type ScreenKey = 'main' | 'business' | 'upgrade' | 'tasks' | 'result';

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
  businessStatsLabel: Label | null = null;

  @property(Label)
  resultLabel: Label | null = null;

  @property(Button)
  startButton: Button | null = null;

  @property(Button)
  speedButton: Button | null = null;

  @property(Button)
  cashierButton: Button | null = null;

  @property(Button)
  finishButton: Button | null = null;

  @property(Button)
  restaurantUpgradeButton: Button | null = null;

  @property(Sprite)
  cashierSprite: Sprite | null = null;

  @property([TableSlotView])
  tableSlots: TableSlotView[] = [];

  @property([Sprite])
  waitingCustomerSprites: Sprite[] = [];

  @property([PartUpgradeView])
  partViews: PartUpgradeView[] = [];

  @property([TaskItemView])
  taskViews: TaskItemView[] = [];

  private api!: ApiClient;
  private profile: ProfileState | null = null;
  private simulation: BusinessSimulation | null = null;
  private speedMode: SpeedMode = '1x';
  private activeScreen: ScreenKey = 'main';
  private settlement: SettlementState | null = null;
  private finishing = false;
  private activeSessionId = '';

  onLoad(): void {
    this.api = new ApiClient(this.apiBaseUrl);
    this.startButton?.node.on(Button.EventType.CLICK, this.startBusiness, this);
    this.speedButton?.node.on(Button.EventType.CLICK, this.toggleSpeed, this);
    this.cashierButton?.node.on(Button.EventType.CLICK, this.collectFirstReadyPay, this);
    this.finishButton?.node.on(Button.EventType.CLICK, this.finishBusiness, this);
    this.restaurantUpgradeButton?.node.on(Button.EventType.CLICK, this.upgradeRestaurant, this);
    this.tableSlots.forEach((slot, index) => slot.bind(index, this.handleTablePressed.bind(this)));
    this.partViews.forEach((view, index) => view.bind(PARTS[index], this.upgradePart.bind(this)));
    this.taskViews.forEach((view) => view.bind(this.claimTask.bind(this)));
  }

  async start(): Promise<void> {
    await this.loadProfile();
  }

  update(deltaTime: number): void {
    if (this.activeScreen !== 'business' || !this.simulation || this.finishing) {
      return;
    }
    this.simulation.update(deltaTime);
    this.renderBusiness();
    if (this.simulation.finished) {
      void this.finishBusiness();
    }
  }

  showMain(): void {
    this.setScreen('main');
  }

  showUpgrade(): void {
    this.setScreen('upgrade');
  }

  showTasks(): void {
    this.setScreen('tasks');
  }

  private async loadProfile(): Promise<void> {
    try {
      this.profile = await this.api.getProfile();
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
      this.simulation = new BusinessSimulation(response.profile.tuning, response.session.speedMode);
      this.finishing = false;
      this.setScreen('business');
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
    }
  }

  private async finishBusiness(): Promise<void> {
    if (!this.simulation || this.finishing) {
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
      this.activeSessionId = '';
      this.setScreen('result');
      this.renderAll();
    } catch (error) {
      this.setMessage(this.formatError(error));
      await this.loadProfile();
    } finally {
      this.finishing = false;
    }
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
    this.speedMode = this.speedMode === '1x' ? '2x' : '1x';
    this.renderAll();
  }

  private handleTablePressed(tableIndex: number): void {
    this.simulation?.handleTablePressed(tableIndex);
    this.renderBusiness();
  }

  private collectFirstReadyPay(): void {
    this.simulation?.collectFirstReadyPay();
    this.renderBusiness();
  }

  private setScreen(screen: ScreenKey): void {
    this.activeScreen = screen;
    if (this.mainScreen) this.mainScreen.active = screen === 'main';
    if (this.businessScreen) this.businessScreen.active = screen === 'business';
    if (this.upgradeScreen) this.upgradeScreen.active = screen === 'upgrade';
    if (this.taskScreen) this.taskScreen.active = screen === 'tasks';
    if (this.resultScreen) this.resultScreen.active = screen === 'result';
  }

  private renderAll(): void {
    this.renderHeader();
    this.renderBusiness();
    this.renderUpgrade();
    this.renderTasks();
    this.renderResult();
  }

  private renderHeader(): void {
    if (!this.profile) {
      return;
    }
    if (this.coinLabel) this.coinLabel.string = `${this.profile.player.coins}`;
    if (this.staminaLabel) this.staminaLabel.string = `${this.profile.player.stamina}/${this.profile.player.staminaMax}`;
    if (this.levelLabel) this.levelLabel.string = `餐厅 Lv.${this.profile.player.restaurantLevel}`;
    if (this.nextRevenueLabel) this.nextRevenueLabel.string = `下次 ${this.profile.economy.expectedRevenue}`;
    if (this.speedLabel) this.speedLabel.string = this.speedMode;
    if (this.startButton) {
      this.startButton.interactable = Boolean(
        this.profile.activeSession || this.profile.player.stamina >= CONSTANTS.sessionStaminaCost
      );
    }
  }

  private renderBusiness(): void {
    const textures = this.textures;
    const simulation = this.simulation;
    if (!textures || !simulation) {
      return;
    }
    if (this.timerLabel) this.timerLabel.string = `剩余 ${Math.ceil(simulation.timeLeft)}s`;
    if (this.businessStatsLabel) {
      this.businessStatsLabel.string =
        `服务 ${simulation.customersServed} / 离开 ${simulation.customersLost} / 连击 ${simulation.combo}`;
    }
    this.tableSlots.forEach((slot, index) => {
      slot.render(simulation.tables[index]?.customer || null, simulation.waiting.length, textures);
    });
    this.waitingCustomerSprites.forEach((sprite, index) => {
      const customer = simulation.waiting[index];
      sprite.node.active = Boolean(customer);
      if (customer && textures.animals.length > 0) {
        sprite.spriteFrame = textures.animals[customer.animalIndex % textures.animals.length];
      }
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
    this.taskViews.forEach((view, index) => {
      view.node.active = index < this.profile!.tasks.length;
      if (index < this.profile!.tasks.length) {
        view.render(this.profile!.tasks[index]);
      }
    });
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

  private setMessage(message: string): void {
    if (this.messageLabel) {
      this.messageLabel.string = message;
    }
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
