export type PartKey = 'cashier' | 'table' | 'chair' | 'floor' | 'wall';
export type SpeedMode = '1x' | '2x';
export type CustomerType = 'normal';
export type TaskType = 'guide' | 'daily' | 'growth';
export type TaskMetric =
  | 'totalSessions'
  | 'totalPartUpgrades'
  | 'totalTasksClaimed'
  | 'totalRestaurantUpgrades'
  | 'dailySessions'
  | 'dailyPartUpgrades'
  | 'dailyCoinsEarned'
  | 'dailyCustomersServed'
  | 'restaurantLevel'
  | 'maxPartStar'
  | 'allPartsMaxed'
  | 'totalCustomersServed';

export interface PartStars {
  cashier: number;
  table: number;
  chair: number;
  floor: number;
  wall: number;
}

export interface PlayerState {
  playerId: string;
  coins: number;
  stamina: number;
  staminaMax: number;
  staminaUpdatedAt: string;
  restaurantLevel: number;
  parts: PartStars;
  stats: Record<string, number>;
  daily: Record<string, number | string>;
}

export interface EconomyState {
  incomePower: number;
  expectedRevenue: number;
  upgradeCost: number;
}

export interface StaminaRecoveryState {
  isFull: boolean;
  recoverIntervalSeconds: number;
  secondsUntilNext: number;
  secondsUntilFull: number;
  nextRecoveryAt: string | null;
  fullRecoveryAt: string | null;
}

export interface ProfileState {
  player: PlayerState;
  staminaRecovery?: StaminaRecoveryState;
  economy: EconomyState;
  partLabels: Record<PartKey, string>;
  partEffects: Record<PartKey, string>;
  tuning: TuningState;
  allPartsMaxed: boolean;
  tasks: TaskState[];
  activeSession?: BusinessSession | null;
}

export interface TaskState {
  id: string;
  type: TaskType;
  typeLabel?: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  reward: {
    coins?: number;
    stamina?: number;
  };
}

export interface TaskDefinition {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  metric: TaskMetric;
  target: number | 'tripleExpected';
  reward: {
    coins?: number | 'expected' | 'halfExpected';
    stamina?: number | 'expected' | 'halfExpected';
  };
}

export interface TuningState {
  tableCapacity: number;
  initialCustomerCount: number;
  patienceSeconds: number;
  spawnIntervalSeconds: number;
  moveSpeedMultiplier: number;
  cashierWindowSeconds: number;
  prepDelaySeconds: number;
  eatingSeconds: number;
}

export interface BusinessSession {
  sessionId: string;
  playerId: string;
  startedAt: string;
  expiresAt: string;
  speedMode: SpeedMode;
  status: 'active' | 'finished' | 'expired';
  elapsedSeconds?: number;
  remainingSeconds?: number;
  recoveryWindowSeconds?: number;
}

export interface SessionSummary {
  customersServed: number;
  customersLost: number;
  averageSatisfaction: number;
  maxCombo: number;
  durationSeconds: number;
  speedMode: SpeedMode;
  clientVersion: string;
  customerTypes: Record<CustomerType, number>;
}

export interface SettlementState {
  incomePower: number;
  expectedRevenue: number;
  upgradeCost: number;
  completionScore: number;
  satisfactionScore: number;
  comboScore: number;
  performanceFactor: number;
  rewardCoins: number;
  minimumReward: number;
  maximumReward: number;
}

export const PARTS: PartKey[] = ['cashier', 'table', 'chair', 'floor', 'wall'];
export const CUSTOMER_TYPES: CustomerType[] = ['normal'];
export const TASK_TYPES: TaskType[] = ['guide', 'daily', 'growth'];
export const TASK_REWARD_FIELDS = ['coins', 'stamina'] as const;

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  guide: '引导任务',
  daily: '每日任务',
  growth: '成长任务'
};

export const TASK_DEFINITIONS: TaskDefinition[] = [
  {
    id: 'guide_first_session',
    type: 'guide',
    title: '完成首次营业',
    description: '完成一局 90 秒营业。',
    metric: 'totalSessions',
    target: 1,
    reward: { coins: 25, stamina: 0 }
  },
  {
    id: 'guide_first_part_upgrade',
    type: 'guide',
    title: '完成首次部件升级',
    description: '自由选择任意餐厅部件升 1 星。',
    metric: 'totalPartUpgrades',
    target: 1,
    reward: { coins: 0, stamina: 5 }
  },
  {
    id: 'guide_first_task_claim',
    type: 'guide',
    title: '首次领取任务奖励',
    description: '领取任意一个任务奖励。',
    metric: 'totalTasksClaimed',
    target: 1,
    reward: { coins: 10, stamina: 0 }
  },
  {
    id: 'guide_first_restaurant_upgrade',
    type: 'guide',
    title: '首次整体升级餐厅',
    description: '五个部件满星后整体升级餐厅。',
    metric: 'totalRestaurantUpgrades',
    target: 1,
    reward: { coins: 'expected', stamina: 10 }
  },
  {
    id: 'daily_sessions_3',
    type: 'daily',
    title: '今日营业 3 次',
    description: '完成 3 次营业。',
    metric: 'dailySessions',
    target: 3,
    reward: { coins: 'expected', stamina: 10 }
  },
  {
    id: 'daily_part_upgrades_3',
    type: 'daily',
    title: '今日升级 3 次',
    description: '升级任意餐厅部件 3 次。',
    metric: 'dailyPartUpgrades',
    target: 3,
    reward: { coins: 'halfExpected', stamina: 0 }
  },
  {
    id: 'daily_coins_earned',
    type: 'daily',
    title: '今日获得金币',
    description: '通过营业获得今日目标金币。',
    metric: 'dailyCoinsEarned',
    target: 'tripleExpected',
    reward: { coins: 0, stamina: 10 }
  },
  {
    id: 'daily_customers_25',
    type: 'daily',
    title: '今日服务 25 位小动物',
    description: '累计服务 25 位小动物顾客。',
    metric: 'dailyCustomersServed',
    target: 25,
    reward: { coins: 'halfExpected', stamina: 0 }
  },
  {
    id: 'growth_restaurant_level_2',
    type: 'growth',
    title: '餐厅达到 2 级',
    description: '完成首次餐厅整体升级。',
    metric: 'restaurantLevel',
    target: 2,
    reward: { coins: 'expected', stamina: 10 }
  },
  {
    id: 'growth_any_part_star_5',
    type: 'growth',
    title: '任意部件达到 5 星',
    description: '将任意餐厅部件升到 5 星。',
    metric: 'maxPartStar',
    target: 5,
    reward: { coins: 'halfExpected', stamina: 0 }
  },
  {
    id: 'growth_all_parts_star_5',
    type: 'growth',
    title: '五个部件全部满星',
    description: '在当前餐厅等级内把五个部件都升到 5 星。',
    metric: 'allPartsMaxed',
    target: 1,
    reward: { coins: 0, stamina: 10 }
  },
  {
    id: 'growth_customers_100',
    type: 'growth',
    title: '累计服务 100 位小动物',
    description: '累计服务 100 位小动物顾客。',
    metric: 'totalCustomersServed',
    target: 100,
    reward: { coins: 'expected', stamina: 0 }
  },
  {
    id: 'growth_sessions_20',
    type: 'growth',
    title: '累计营业 20 次',
    description: '累计完成 20 次营业。',
    metric: 'totalSessions',
    target: 20,
    reward: { coins: 0, stamina: 20 }
  }
];

export const PART_LABELS: Record<PartKey, string> = {
  cashier: '收银机',
  table: '餐桌',
  chair: '餐椅',
  floor: '地板',
  wall: '墙面'
};

export const CONSTANTS = {
  baseRevenue: 100,
  incomeGrowth: 1.08,
  starsPerPart: 5,
  partsPerRestaurant: 5,
  staminaMax: 60,
  sessionStaminaCost: 10,
  sessionDurationSeconds: 90,
  maxSpeedMultiplier: 2,
  maxTableSlots: 5,
  initialCustomerCount: 2,
  maxWaitingCustomers: 4,
  maxCustomersPerSession: 18,
  normalCustomersPerSession: 12
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getIncomePower(profile: ProfileState): number {
  const partStars = PARTS.reduce((sum, part) => sum + profile.player.parts[part], 0);
  return (profile.player.restaurantLevel - 1) * CONSTANTS.partsPerRestaurant * CONSTANTS.starsPerPart + partStars;
}

export function getExpectedRevenue(profile: ProfileState): number {
  return Math.round(CONSTANTS.baseRevenue * Math.pow(CONSTANTS.incomeGrowth, getIncomePower(profile)));
}

export function isPartMaxed(profile: ProfileState, part: PartKey): boolean {
  return profile.player.parts[part] >= CONSTANTS.starsPerPart;
}

export function normalizeSpeedMode(speedMode: string): SpeedMode {
  return speedMode === '2x' ? '2x' : '1x';
}
