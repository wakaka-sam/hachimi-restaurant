import { sys } from 'cc';
import {
  BusinessSession,
  clamp,
  CONSTANTS,
  PART_LABELS,
  PARTS,
  PartKey,
  PlayerState,
  ProfileState,
  SettlementState,
  SpeedMode,
  TASK_DEFINITIONS,
  TASK_REWARD_FIELDS,
  TASK_TYPE_LABELS,
  TaskDefinition,
  TaskMetric,
  TaskState,
  TuningState
} from '../core/GameRules';
import { LocalBusinessSummary } from '../core/BusinessSimulation';
import { NonJsonResponseError, requestJson } from './ApiTransport';

export const PRODUCTION_API_BASE_URL = 'https://animalapi.wakaka007.cn';

export interface ApiResponse<T> {
  ok: boolean;
  error?: {
    code: string;
    message: string;
    minimumRealSeconds?: number;
    elapsedRealSeconds?: number;
    remainingRealSeconds?: number;
  };
  profile?: ProfileState;
  session?: BusinessSession;
  settlement?: SettlementState;
  claimedTask?: unknown;
  resumed?: boolean;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly minimumRealSeconds: number | null;
  readonly elapsedRealSeconds: number | null;
  readonly remainingRealSeconds: number | null;
  readonly session: BusinessSession | null;

  constructor(payload: ApiResponse<unknown>) {
    super(payload.error?.message || payload.error?.code || 'Request failed.');
    this.name = 'ApiRequestError';
    this.code = payload.error?.code || 'REQUEST_FAILED';
    this.minimumRealSeconds = numberOrNull(payload.error?.minimumRealSeconds);
    this.elapsedRealSeconds = numberOrNull(payload.error?.elapsedRealSeconds);
    this.remainingRealSeconds = numberOrNull(payload.error?.remainingRealSeconds);
    this.session = payload.session || null;
  }
}

export class ApiClient {
  private playerId = '';
  private readonly resolvedBaseUrl: string;
  private localPreviewApi: LocalPreviewApi | null = null;
  private usingLocalPreviewApi = false;

  constructor(baseUrl = '') {
    this.resolvedBaseUrl = ApiClient.resolveBaseUrl(baseUrl);
  }

  static resolveBaseUrl(baseUrl = ''): string {
    const trimmed = baseUrl.trim();
    if (trimmed) {
      return trimmed.replace(/\/+$/, '');
    }
    return sys.isBrowser ? '' : PRODUCTION_API_BASE_URL;
  }

  getPlayerId(): string {
    if (!this.playerId) {
      const saved = sys.localStorage.getItem('hachimi-player-id');
      this.playerId = saved || `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
      sys.localStorage.setItem('hachimi-player-id', this.playerId);
    }
    return this.playerId;
  }

  async getProfile(): Promise<ProfileState> {
    return this.withLocalPreviewFallback(
      async () => {
        const payload = await this.request<ApiResponse<ProfileState>>('/api/player/profile');
        return this.requireProfile(payload);
      },
      (localApi) => localApi.getProfile()
    );
  }

  async startSession(speedMode: SpeedMode): Promise<ApiResponse<BusinessSession>> {
    return this.withLocalPreviewFallback(
      () => this.request('/api/session/start', {
        method: 'POST',
        body: { speedMode }
      }),
      (localApi) => localApi.startSession(speedMode)
    );
  }

  async finishSession(sessionId: string, summary: LocalBusinessSummary): Promise<ApiResponse<SettlementState>> {
    return this.withLocalPreviewFallback(
      () => this.request('/api/session/finish', {
        method: 'POST',
        body: { sessionId, summary }
      }),
      (localApi) => localApi.finishSession(sessionId, summary)
    );
  }

  async upgradePart(part: PartKey): Promise<ProfileState> {
    return this.withLocalPreviewFallback(
      async () => {
        const payload = await this.request<ApiResponse<ProfileState>>('/api/upgrade/part', {
          method: 'POST',
          body: { part }
        });
        return this.requireProfile(payload);
      },
      (localApi) => localApi.upgradePart(part)
    );
  }

  async upgradeRestaurant(): Promise<ProfileState> {
    return this.withLocalPreviewFallback(
      async () => {
        const payload = await this.request<ApiResponse<ProfileState>>('/api/upgrade/restaurant', {
          method: 'POST',
          body: {}
        });
        return this.requireProfile(payload);
      },
      (localApi) => localApi.upgradeRestaurant()
    );
  }

  async claimTask(taskId: string): Promise<ProfileState> {
    return this.withLocalPreviewFallback(
      async () => {
        const payload = await this.request<ApiResponse<ProfileState>>('/api/tasks/claim', {
          method: 'POST',
          body: { taskId }
        });
        return this.requireProfile(payload);
      },
      (localApi) => localApi.claimTask(taskId)
    );
  }

  private requireProfile(payload: ApiResponse<ProfileState>): ProfileState {
    if (!payload.profile) {
      throw new Error('Missing profile from backend response.');
    }
    return payload.profile;
  }

  private async request<T extends ApiResponse<unknown>>(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const response = await requestJson<T>(`${this.resolvedBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        'x-player-id': this.getPlayerId()
      },
      body: options.body
    });
    const payload = response.payload;
    if (!response.ok || !payload.ok) {
      throw new ApiRequestError(payload);
    }
    return payload as T;
  }

  private async withLocalPreviewFallback<T>(
    remoteOperation: () => Promise<T>,
    localOperation: (localApi: LocalPreviewApi) => T | Promise<T>
  ): Promise<T> {
    if (this.usingLocalPreviewApi) {
      return localOperation(this.getLocalPreviewApi());
    }
    try {
      return await remoteOperation();
    } catch (error) {
      if (!this.shouldUseLocalPreviewApi(error)) {
        throw error;
      }
      this.usingLocalPreviewApi = true;
      return localOperation(this.getLocalPreviewApi());
    }
  }

  private shouldUseLocalPreviewApi(error: unknown): boolean {
    return this.resolvedBaseUrl === '' && error instanceof NonJsonResponseError;
  }

  private getLocalPreviewApi(): LocalPreviewApi {
    if (!this.localPreviewApi) {
      this.localPreviewApi = new LocalPreviewApi(this.getPlayerId());
    }
    return this.localPreviewApi;
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

type LocalPreviewPlayer = PlayerState & {
  taskClaims: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

type LocalPreviewState = {
  player: LocalPreviewPlayer;
  activeSession: BusinessSession | null;
};

type LocalTaskState = TaskState & {
  claimKey: string;
};

const LOCAL_PREVIEW_STATE_PREFIX = 'hachimi-local-preview-state';
const LOCAL_STAMINA_RECOVER_MS = 5 * 60 * 1000;

class LocalPreviewApi {
  private readonly storageKey: string;

  constructor(private readonly playerId: string) {
    this.storageKey = `${LOCAL_PREVIEW_STATE_PREFIX}:${playerId}`;
  }

  getProfile(): ProfileState {
    const state = this.loadState();
    this.refreshStamina(state.player);
    this.saveState(state);
    return this.serializeProfile(state);
  }

  startSession(speedMode: SpeedMode): ApiResponse<BusinessSession> {
    const state = this.loadState();
    const now = new Date();
    this.refreshStamina(state.player, now);

    if (state.activeSession?.status === 'active') {
      return {
        ok: true,
        resumed: true,
        session: state.activeSession,
        profile: this.serializeProfile(state, now)
      };
    }

    if (state.player.stamina < CONSTANTS.sessionStaminaCost) {
      this.throwLocalError('INSUFFICIENT_STAMINA', 'Not enough stamina to start business.');
    }

    state.player.stamina -= CONSTANTS.sessionStaminaCost;
    state.player.staminaUpdatedAt = toIso(now);
    state.player.updatedAt = toIso(now);

    const speedMultiplier = speedMode === '2x' ? 2 : 1;
    const realSessionSeconds = Math.ceil(CONSTANTS.sessionDurationSeconds / speedMultiplier);
    const session: BusinessSession = {
      sessionId: `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      playerId: this.playerId,
      startedAt: toIso(now),
      expiresAt: toIso(new Date(now.getTime() + realSessionSeconds * 1000)),
      speedMode,
      status: 'active',
      elapsedSeconds: 0,
      remainingSeconds: CONSTANTS.sessionDurationSeconds,
      recoveryWindowSeconds: 0
    };
    state.activeSession = session;
    this.saveState(state);

    return {
      ok: true,
      resumed: false,
      session,
      profile: this.serializeProfile(state, now)
    };
  }

  finishSession(sessionId: string, summary: LocalBusinessSummary): ApiResponse<SettlementState> {
    const state = this.loadState();
    const now = new Date();
    this.refreshDaily(state.player, now);

    const session = state.activeSession;
    if (!session || session.sessionId !== sessionId) {
      this.throwLocalError('SESSION_NOT_FOUND', 'Business session not found.');
    }

    const settlement = this.calculateSettlement(state.player, summary);
    state.player.coins += settlement.rewardCoins;
    state.player.stats.totalSessions += 1;
    state.player.stats.totalCustomersServed += Math.max(0, Math.floor(summary.customersServed));
    state.player.stats.totalCustomersLost += Math.max(0, Math.floor(summary.customersLost));
    state.player.stats.totalCoinsEarned += settlement.rewardCoins;
    state.player.daily.sessions = Number(state.player.daily.sessions || 0) + 1;
    state.player.daily.customersServed =
      Number(state.player.daily.customersServed || 0) + Math.max(0, Math.floor(summary.customersServed));
    state.player.daily.coinsEarned = Number(state.player.daily.coinsEarned || 0) + settlement.rewardCoins;
    state.player.updatedAt = toIso(now);

    const finishedSession: BusinessSession = {
      ...session,
      status: 'finished',
      elapsedSeconds: CONSTANTS.sessionDurationSeconds,
      remainingSeconds: 0
    };
    state.activeSession = null;
    this.saveState(state);

    return {
      ok: true,
      session: finishedSession,
      settlement,
      profile: this.serializeProfile(state, now)
    };
  }

  upgradePart(part: PartKey): ProfileState {
    const state = this.loadState();
    const now = new Date();
    this.refreshStamina(state.player, now);
    this.refreshDaily(state.player, now);

    if (!PARTS.includes(part)) {
      this.throwLocalError('INVALID_PART', 'Unknown restaurant part.');
    }
    if (state.player.parts[part] >= CONSTANTS.starsPerPart) {
      this.throwLocalError('PART_ALREADY_MAXED', 'Part is already maxed.');
    }

    const cost = this.getEconomy(state.player).upgradeCost;
    if (state.player.coins < cost) {
      this.throwLocalError('INSUFFICIENT_COINS', 'Not enough coins for this upgrade.');
    }

    state.player.coins -= cost;
    state.player.parts[part] += 1;
    state.player.stats.totalPartUpgrades += 1;
    state.player.daily.partUpgrades = Number(state.player.daily.partUpgrades || 0) + 1;
    state.player.updatedAt = toIso(now);
    this.saveState(state);
    return this.serializeProfile(state, now);
  }

  upgradeRestaurant(): ProfileState {
    const state = this.loadState();
    const now = new Date();
    this.refreshStamina(state.player, now);

    if (!this.areAllPartsMaxed(state.player)) {
      this.throwLocalError('RESTAURANT_NOT_READY', 'All parts must be 5 stars before restaurant upgrade.');
    }

    state.player.restaurantLevel += 1;
    PARTS.forEach((part) => {
      state.player.parts[part] = 0;
    });
    state.player.stats.totalRestaurantUpgrades += 1;
    state.player.updatedAt = toIso(now);
    this.saveState(state);
    return this.serializeProfile(state, now);
  }

  claimTask(taskId: string): ProfileState {
    const state = this.loadState();
    const now = new Date();
    this.refreshStamina(state.player, now);
    const task = this.getTaskStatuses(state.player, now).find((item) => item.id === taskId);

    if (!task) {
      this.throwLocalError('TASK_NOT_FOUND', 'Task not found.');
    }
    if (!task.completed) {
      this.throwLocalError('TASK_NOT_COMPLETE', 'Task is not complete.');
    }
    if (task.claimed) {
      this.throwLocalError('TASK_ALREADY_CLAIMED', 'Task reward has already been claimed.');
    }

    state.player.taskClaims[task.claimKey] = toIso(now);
    state.player.coins += task.reward.coins || 0;
    state.player.stamina = Math.min(CONSTANTS.staminaMax, state.player.stamina + (task.reward.stamina || 0));
    state.player.stats.totalTasksClaimed += 1;
    state.player.updatedAt = toIso(now);
    this.saveState(state);
    return this.serializeProfile(state, now);
  }

  private serializeProfile(state: LocalPreviewState, now = new Date()): ProfileState {
    const player = state.player;
    return {
      player: {
        playerId: player.playerId,
        coins: player.coins,
        stamina: player.stamina,
        staminaMax: CONSTANTS.staminaMax,
        staminaUpdatedAt: player.staminaUpdatedAt,
        restaurantLevel: player.restaurantLevel,
        parts: { ...player.parts },
        stats: { ...player.stats },
        daily: { ...player.daily }
      },
      staminaRecovery: this.getStaminaRecovery(player, now),
      economy: this.getEconomy(player),
      partLabels: PART_LABELS,
      partEffects: (
        Object.fromEntries(PARTS.map((part) => [part, this.getPartEffectDescription(part, player)]))
      ) as Record<PartKey, string>,
      tuning: this.getTuning(player),
      allPartsMaxed: this.areAllPartsMaxed(player),
      tasks: this.getTaskStatuses(player, now),
      activeSession: state.activeSession
    };
  }

  private loadState(): LocalPreviewState {
    const raw = sys.localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<LocalPreviewState>;
        return {
          player: this.normalizePlayer(parsed.player),
          activeSession: parsed.activeSession?.status === 'active' ? parsed.activeSession : null
        };
      } catch {
        sys.localStorage.removeItem(this.storageKey);
      }
    }
    return {
      player: this.createDefaultPlayer(),
      activeSession: null
    };
  }

  private saveState(state: LocalPreviewState): void {
    sys.localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private createDefaultPlayer(now = new Date()): LocalPreviewPlayer {
    const iso = toIso(now);
    return {
      playerId: this.playerId,
      coins: 0,
      stamina: CONSTANTS.staminaMax,
      staminaMax: CONSTANTS.staminaMax,
      staminaUpdatedAt: iso,
      restaurantLevel: 1,
      parts: {
        cashier: 0,
        table: 0,
        chair: 0,
        floor: 0,
        wall: 0
      },
      stats: {
        totalSessions: 0,
        totalCustomersServed: 0,
        totalCustomersLost: 0,
        totalPartUpgrades: 0,
        totalRestaurantUpgrades: 0,
        totalCoinsEarned: 0,
        totalTasksClaimed: 0
      },
      daily: {
        date: getDateKey(now),
        sessions: 0,
        partUpgrades: 0,
        coinsEarned: 0,
        customersServed: 0
      },
      taskClaims: {},
      createdAt: iso,
      updatedAt: iso
    };
  }

  private normalizePlayer(player: Partial<LocalPreviewPlayer> | undefined): LocalPreviewPlayer {
    const defaults = this.createDefaultPlayer();
    const normalized: LocalPreviewPlayer = {
      ...defaults,
      ...(player || {}),
      parts: {
        ...defaults.parts,
        ...(player?.parts || {})
      },
      stats: {
        ...defaults.stats,
        ...(player?.stats || {})
      },
      daily: {
        ...defaults.daily,
        ...(player?.daily || {})
      },
      taskClaims: {
        ...(player?.taskClaims || {})
      }
    };
    normalized.coins = Math.max(0, Math.floor(Number(normalized.coins || 0)));
    normalized.stamina = clamp(
      Math.floor(Number(normalized.stamina ?? CONSTANTS.staminaMax)),
      0,
      CONSTANTS.staminaMax
    );
    normalized.restaurantLevel = Math.max(1, Math.floor(Number(normalized.restaurantLevel || 1)));
    normalized.staminaUpdatedAt = normalized.staminaUpdatedAt || toIso();
    this.refreshDaily(normalized);
    return normalized;
  }

  private refreshDaily(player: LocalPreviewPlayer, now = new Date()): void {
    const date = getDateKey(now);
    if (player.daily.date === date) {
      return;
    }
    player.daily = {
      date,
      sessions: 0,
      partUpgrades: 0,
      coinsEarned: 0,
      customersServed: 0
    };
  }

  private refreshStamina(player: LocalPreviewPlayer, now = new Date()): void {
    this.refreshDaily(player, now);
    if (player.stamina >= CONSTANTS.staminaMax) {
      player.stamina = CONSTANTS.staminaMax;
      player.staminaUpdatedAt = toIso(now);
      return;
    }

    const nowMs = now.getTime();
    const updatedMs = new Date(player.staminaUpdatedAt).getTime();
    const elapsed = Math.max(0, nowMs - updatedMs);
    const gained = Math.floor(elapsed / LOCAL_STAMINA_RECOVER_MS);
    if (gained <= 0) {
      return;
    }

    player.stamina = Math.min(CONSTANTS.staminaMax, player.stamina + gained);
    player.staminaUpdatedAt = player.stamina >= CONSTANTS.staminaMax
      ? toIso(now)
      : toIso(new Date(updatedMs + gained * LOCAL_STAMINA_RECOVER_MS));
  }

  private getStaminaRecovery(player: LocalPreviewPlayer, now = new Date()) {
    if (player.stamina >= CONSTANTS.staminaMax) {
      return {
        isFull: true,
        recoverIntervalSeconds: Math.round(LOCAL_STAMINA_RECOVER_MS / 1000),
        secondsUntilNext: 0,
        secondsUntilFull: 0,
        nextRecoveryAt: null,
        fullRecoveryAt: null
      };
    }

    const recoverIntervalSeconds = Math.round(LOCAL_STAMINA_RECOVER_MS / 1000);
    const nowMs = now.getTime();
    const updatedMs = new Date(player.staminaUpdatedAt).getTime();
    const elapsedMs = Math.max(0, nowMs - updatedMs);
    const remainderMs = elapsedMs % LOCAL_STAMINA_RECOVER_MS;
    const secondsUntilNext = Math.ceil((LOCAL_STAMINA_RECOVER_MS - remainderMs) / 1000);
    const missingStamina = Math.max(0, CONSTANTS.staminaMax - player.stamina);
    const secondsUntilFull = secondsUntilNext + Math.max(0, missingStamina - 1) * recoverIntervalSeconds;

    return {
      isFull: false,
      recoverIntervalSeconds,
      secondsUntilNext,
      secondsUntilFull,
      nextRecoveryAt: toIso(new Date(nowMs + secondsUntilNext * 1000)),
      fullRecoveryAt: toIso(new Date(nowMs + secondsUntilFull * 1000))
    };
  }

  private getEconomy(player: LocalPreviewPlayer) {
    const incomePower = this.getIncomePower(player);
    const expectedRevenue = Math.round(CONSTANTS.baseRevenue * Math.pow(CONSTANTS.incomeGrowth, incomePower));
    return {
      incomePower,
      expectedRevenue,
      upgradeCost: expectedRevenue
    };
  }

  private getIncomePower(player: LocalPreviewPlayer): number {
    const partStars = PARTS.reduce((sum, part) => sum + player.parts[part], 0);
    return (player.restaurantLevel - 1) * CONSTANTS.partsPerRestaurant * CONSTANTS.starsPerPart + partStars;
  }

  private areAllPartsMaxed(player: LocalPreviewPlayer): boolean {
    return PARTS.every((part) => player.parts[part] >= CONSTANTS.starsPerPart);
  }

  private getTuning(player: LocalPreviewPlayer): TuningState {
    const effectiveStars = this.getEffectivePartStars(player);
    return {
      tableCapacity: Math.min(CONSTANTS.maxTableSlots, 2 + Math.floor(effectiveStars.table / 3)),
      initialCustomerCount: CONSTANTS.initialCustomerCount,
      patienceSeconds: 16 + effectiveStars.chair * 1.5,
      spawnIntervalSeconds: Math.max(3.8, 7.2 - effectiveStars.wall * 0.35),
      moveSpeedMultiplier: 1 + effectiveStars.floor * 0.05,
      cashierWindowSeconds: 8 + effectiveStars.cashier * 0.8,
      prepDelaySeconds: Math.max(2.4, 5.5 - effectiveStars.floor * 0.16),
      eatingSeconds: Math.max(8, 12.5 - effectiveStars.floor * 0.18)
    };
  }

  private getEffectivePartStars(player: LocalPreviewPlayer): Record<PartKey, number> {
    const carriedStars = (player.restaurantLevel - 1) * CONSTANTS.starsPerPart;
    return (
      Object.fromEntries(PARTS.map((part) => [part, carriedStars + player.parts[part]]))
    ) as Record<PartKey, number>;
  }

  private getPartEffectDescription(part: PartKey, player: LocalPreviewPlayer): string {
    const currentStar = player.parts[part];
    if (currentStar >= CONSTANTS.starsPerPart) {
      return `${PART_LABELS[part]}已满星，等待整体升级餐厅`;
    }
    const nextStar = Math.min(CONSTANTS.starsPerPart, currentStar + 1);
    switch (part) {
      case 'cashier':
        return `下一星：收银窗口更宽，收银等待 +0.8 秒（${nextStar} 星）`;
      case 'table':
        return nextStar === 3
          ? '下一星：增加 1 个同时接待桌位'
          : `下一星：餐桌表现升级（${nextStar} 星）`;
      case 'chair':
        return `下一星：顾客耐心 +1.5 秒（${nextStar} 星）`;
      case 'floor':
        return `下一星：移动与翻台更快（${nextStar} 星）`;
      case 'wall':
        return `下一星：顾客进入间隔缩短（${nextStar} 星）`;
      default:
        return '下一星：经营手感提升';
    }
  }

  private calculateSettlement(player: LocalPreviewPlayer, summary: LocalBusinessSummary): SettlementState {
    const economy = this.getEconomy(player);
    const customersServed = Math.max(0, Math.floor(summary.customersServed));
    const completionScore = clamp(customersServed / CONSTANTS.normalCustomersPerSession, 0, 1);
    const satisfactionScore = clamp(Number(summary.averageSatisfaction || 0), 0, 1);
    const comboScore = clamp(Math.max(0, Math.floor(summary.maxCombo)) / 8, 0, 1);
    const performanceFactor = clamp(
      0.70 + completionScore * 0.15 + satisfactionScore * 0.20 + comboScore * 0.25,
      0.75,
      1.3
    );
    const minimumReward = Math.round(economy.expectedRevenue * 0.75);
    const maximumReward = Math.round(economy.expectedRevenue * 1.3);
    const rewardCoins = clamp(
      Math.round(economy.expectedRevenue * performanceFactor),
      minimumReward,
      maximumReward
    );

    return {
      ...economy,
      completionScore,
      satisfactionScore,
      comboScore,
      performanceFactor,
      rewardCoins,
      minimumReward,
      maximumReward
    };
  }

  private getTaskStatuses(player: LocalPreviewPlayer, now = new Date()): LocalTaskState[] {
    return TASK_DEFINITIONS.map((definition) => {
      const target = this.resolveTaskTarget(definition, player);
      const progress = Math.min(target, this.getMetricValue(player, definition.metric, now));
      const claimKey = this.getTaskClaimKey(definition, now);
      return {
        id: definition.id,
        type: definition.type,
        typeLabel: TASK_TYPE_LABELS[definition.type],
        title: definition.title,
        description: definition.description,
        progress,
        target,
        completed: progress >= target,
        claimed: Boolean(player.taskClaims[claimKey]),
        claimKey,
        reward: this.resolveTaskReward(definition, player)
      };
    });
  }

  private getMetricValue(player: LocalPreviewPlayer, metric: TaskMetric, now = new Date()): number {
    this.refreshDaily(player, now);
    switch (metric) {
      case 'totalSessions':
        return player.stats.totalSessions;
      case 'totalPartUpgrades':
        return player.stats.totalPartUpgrades;
      case 'totalTasksClaimed':
        return player.stats.totalTasksClaimed;
      case 'totalRestaurantUpgrades':
        return player.stats.totalRestaurantUpgrades;
      case 'dailySessions':
        return Number(player.daily.sessions || 0);
      case 'dailyPartUpgrades':
        return Number(player.daily.partUpgrades || 0);
      case 'dailyCoinsEarned':
        return Number(player.daily.coinsEarned || 0);
      case 'dailyCustomersServed':
        return Number(player.daily.customersServed || 0);
      case 'restaurantLevel':
        return player.restaurantLevel;
      case 'maxPartStar':
        return Math.max(...PARTS.map((part) => player.parts[part]));
      case 'allPartsMaxed':
        return this.areAllPartsMaxed(player) ? 1 : 0;
      case 'totalCustomersServed':
        return player.stats.totalCustomersServed;
      default:
        return 0;
    }
  }

  private resolveTaskTarget(definition: TaskDefinition, player: LocalPreviewPlayer): number {
    if (definition.target === 'tripleExpected') {
      return Math.max(300, this.getEconomy(player).expectedRevenue * 3);
    }
    return definition.target;
  }

  private resolveTaskReward(definition: TaskDefinition, player: LocalPreviewPlayer): TaskState['reward'] {
    const expected = this.getEconomy(player).expectedRevenue;
    const reward: TaskState['reward'] = {};
    TASK_REWARD_FIELDS.forEach((field) => {
      reward[field] = this.resolveRewardAmount(definition.reward[field], expected);
    });
    return reward;
  }

  private resolveRewardAmount(value: number | 'expected' | 'halfExpected' | undefined, expected: number): number {
    if (value === 'expected') {
      return expected;
    }
    if (value === 'halfExpected') {
      return Math.round(expected * 0.5);
    }
    return Math.max(0, Math.round(Number(value || 0)));
  }

  private getTaskClaimKey(definition: TaskDefinition, now = new Date()): string {
    return definition.type === 'daily' ? `${getDateKey(now)}:${definition.id}` : definition.id;
  }

  private throwLocalError(code: string, message: string): never {
    throw new ApiRequestError({
      ok: false,
      error: {
        code,
        message
      }
    });
  }
}

function toIso(now: Date | number | string = new Date()): string {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function getDateKey(now = new Date()): string {
  return toIso(now).slice(0, 10);
}
