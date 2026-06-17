export type PartKey = 'cashier' | 'table' | 'chair' | 'floor' | 'wall';
export type SpeedMode = '1x' | '2x';
export type CustomerType = 'normal';

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
  type: string;
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
  maxCustomersPerSession: 18
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
