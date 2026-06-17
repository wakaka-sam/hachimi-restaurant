export const PARTS = ['cashier', 'table', 'chair', 'floor', 'wall'];

export const PART_LABELS = {
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
  staminaRecoverMs: 5 * 60 * 1000,
  sessionStaminaCost: 10,
  sessionDurationSeconds: 90,
  sessionRecoveryWindowSeconds: 120,
  maxCustomersPerSession: 18
};

export const DEFAULT_PARTS = Object.freeze({
  cashier: 0,
  table: 0,
  chair: 0,
  floor: 0,
  wall: 0
});

export const TASK_DEFINITIONS = Object.freeze([
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
]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

export function getDateKey(now = new Date()) {
  return toIso(now).slice(0, 10);
}

export function createDefaultPlayer(playerId = 'demo-player', now = new Date()) {
  const iso = toIso(now);
  return {
    playerId,
    coins: 0,
    stamina: CONSTANTS.staminaMax,
    staminaUpdatedAt: iso,
    restaurantLevel: 1,
    parts: { ...DEFAULT_PARTS },
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

export function normalizePlayer(player, now = new Date()) {
  const normalized = player || createDefaultPlayer('demo-player', now);
  normalized.parts = { ...DEFAULT_PARTS, ...(normalized.parts || {}) };
  normalized.stats = {
    totalSessions: 0,
    totalCustomersServed: 0,
    totalCustomersLost: 0,
    totalPartUpgrades: 0,
    totalRestaurantUpgrades: 0,
    totalCoinsEarned: 0,
    totalTasksClaimed: 0,
    ...(normalized.stats || {})
  };
  normalized.daily = normalized.daily || {
    date: getDateKey(now),
    sessions: 0,
    partUpgrades: 0,
    coinsEarned: 0,
    customersServed: 0
  };
  normalized.taskClaims = normalized.taskClaims || {};
  normalized.restaurantLevel = Math.max(1, Number(normalized.restaurantLevel || 1));
  normalized.coins = Math.max(0, Math.floor(Number(normalized.coins || 0)));
  normalized.stamina = clamp(
    Math.floor(Number(normalized.stamina ?? CONSTANTS.staminaMax)),
    0,
    CONSTANTS.staminaMax
  );
  normalized.staminaUpdatedAt = normalized.staminaUpdatedAt || toIso(now);
  return normalized;
}

export function refreshDaily(player, now = new Date()) {
  const date = getDateKey(now);
  if (!player.daily || player.daily.date !== date) {
    player.daily = {
      date,
      sessions: 0,
      partUpgrades: 0,
      coinsEarned: 0,
      customersServed: 0
    };
  }
  return player.daily;
}

export function refreshStamina(player, now = new Date()) {
  normalizePlayer(player, now);
  refreshDaily(player, now);

  if (player.stamina >= CONSTANTS.staminaMax) {
    player.stamina = CONSTANTS.staminaMax;
    player.staminaUpdatedAt = toIso(now);
    return player;
  }

  const nowMs = new Date(now).getTime();
  const updatedMs = new Date(player.staminaUpdatedAt).getTime();
  const elapsed = Math.max(0, nowMs - updatedMs);
  const gained = Math.floor(elapsed / CONSTANTS.staminaRecoverMs);

  if (gained <= 0) {
    return player;
  }

  player.stamina = Math.min(CONSTANTS.staminaMax, player.stamina + gained);
  if (player.stamina >= CONSTANTS.staminaMax) {
    player.staminaUpdatedAt = toIso(now);
  } else {
    player.staminaUpdatedAt = toIso(updatedMs + gained * CONSTANTS.staminaRecoverMs);
  }
  player.updatedAt = toIso(now);
  return player;
}

export function getIncomePower(player) {
  normalizePlayer(player);
  const partStars = PARTS.reduce((sum, part) => sum + player.parts[part], 0);
  return (player.restaurantLevel - 1) * CONSTANTS.partsPerRestaurant * CONSTANTS.starsPerPart + partStars;
}

export function getEconomy(player) {
  const incomePower = getIncomePower(player);
  const expectedRevenue = Math.round(CONSTANTS.baseRevenue * Math.pow(CONSTANTS.incomeGrowth, incomePower));
  return {
    incomePower,
    expectedRevenue,
    upgradeCost: expectedRevenue
  };
}

export function areAllPartsMaxed(player) {
  normalizePlayer(player);
  return PARTS.every((part) => player.parts[part] >= CONSTANTS.starsPerPart);
}

export function getMaxPartStar(player) {
  normalizePlayer(player);
  return Math.max(...PARTS.map((part) => player.parts[part]));
}

export function getTuning(player) {
  normalizePlayer(player);
  const levelBase = Math.max(0, player.restaurantLevel - 1);
  return {
    tableCapacity: Math.min(5, 2 + Math.floor(levelBase / 2) + (player.parts.table >= 3 ? 1 : 0)),
    patienceSeconds: 12 + levelBase * 1 + player.parts.chair * 1.5,
    spawnIntervalSeconds: Math.max(3.8, 7.2 - levelBase * 0.15 - player.parts.wall * 0.35),
    moveSpeedMultiplier: 1 + levelBase * 0.04 + player.parts.floor * 0.05,
    cashierWindowSeconds: 8 + levelBase * 0.4 + player.parts.cashier * 0.8,
    prepDelaySeconds: Math.max(1.1, 2.2 - levelBase * 0.04 - player.parts.floor * 0.1),
    eatingSeconds: Math.max(4.2, 6.4 - levelBase * 0.05 - player.parts.floor * 0.18)
  };
}

export function getPartEffectDescription(part, player) {
  normalizePlayer(player);
  const nextStar = Math.min(CONSTANTS.starsPerPart, player.parts[part] + 1);
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

export function normalizeSessionSummary(summary = {}) {
  return {
    customersServed: Math.max(0, Math.floor(Number(summary.customersServed || 0))),
    customersLost: Math.max(0, Math.floor(Number(summary.customersLost || 0))),
    averageSatisfaction: clamp(Number(summary.averageSatisfaction ?? 0), 0, 1),
    maxCombo: Math.max(0, Math.floor(Number(summary.maxCombo || 0))),
    durationSeconds: clamp(Number(summary.durationSeconds || 0), 0, CONSTANTS.sessionDurationSeconds),
    speedMode: summary.speedMode === '2x' ? '2x' : '1x',
    clientVersion: String(summary.clientVersion || 'unknown')
  };
}

export function validateSessionSummary(summary = {}) {
  const normalized = normalizeSessionSummary(summary);
  const totalCustomers = normalized.customersServed + normalized.customersLost;
  const errors = [];

  if (totalCustomers > CONSTANTS.maxCustomersPerSession) {
    errors.push('too_many_customers');
  }
  if (normalized.maxCombo > normalized.customersServed) {
    errors.push('combo_exceeds_served');
  }
  if (normalized.durationSeconds < 1 && totalCustomers > 0) {
    errors.push('invalid_duration');
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: normalized
  };
}

export function calculatePerformance(summary = {}) {
  const normalized = normalizeSessionSummary(summary);
  const total = normalized.customersServed + normalized.customersLost;
  const completionScore = total > 0 ? normalized.customersServed / total : 0;
  const satisfactionScore = normalized.averageSatisfaction;
  const comboScore = clamp(normalized.maxCombo / 8, 0, 1);
  const performanceFactor = clamp(
    0.75 + completionScore * 0.35 + satisfactionScore * 0.15 + comboScore * 0.05,
    0.75,
    1.3
  );

  return {
    completionScore,
    satisfactionScore,
    comboScore,
    performanceFactor
  };
}

export function calculateReward(player, summary = {}) {
  const economy = getEconomy(player);
  const performance = calculatePerformance(summary);
  const rewardCoins = Math.round(economy.expectedRevenue * performance.performanceFactor);
  const minimumReward = Math.round(economy.expectedRevenue * 0.75);
  const maximumReward = Math.round(economy.expectedRevenue * 1.3);

  return {
    ...economy,
    ...performance,
    rewardCoins: clamp(rewardCoins, minimumReward, maximumReward),
    minimumReward,
    maximumReward
  };
}

export function getMetricValue(player, metric, now = new Date()) {
  normalizePlayer(player, now);
  refreshDaily(player, now);
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
      return player.daily.sessions;
    case 'dailyPartUpgrades':
      return player.daily.partUpgrades;
    case 'dailyCoinsEarned':
      return player.daily.coinsEarned;
    case 'dailyCustomersServed':
      return player.daily.customersServed;
    case 'restaurantLevel':
      return player.restaurantLevel;
    case 'maxPartStar':
      return getMaxPartStar(player);
    case 'allPartsMaxed':
      return areAllPartsMaxed(player) ? 1 : 0;
    case 'totalCustomersServed':
      return player.stats.totalCustomersServed;
    default:
      return 0;
  }
}

export function resolveTaskTarget(task, player) {
  if (task.target === 'tripleExpected') {
    return Math.max(300, getEconomy(player).expectedRevenue * 3);
  }
  return task.target;
}

export function resolveTaskReward(task, player) {
  const expected = getEconomy(player).expectedRevenue;
  const reward = { coins: 0, stamina: 0 };
  for (const [key, value] of Object.entries(task.reward || {})) {
    if (value === 'expected') {
      reward[key] = expected;
    } else if (value === 'halfExpected') {
      reward[key] = Math.round(expected * 0.5);
    } else {
      reward[key] = value;
    }
  }
  return reward;
}

export function getTaskClaimKey(task, now = new Date()) {
  return task.type === 'daily' ? `${getDateKey(now)}:${task.id}` : task.id;
}

export function getTaskStatuses(player, now = new Date()) {
  normalizePlayer(player, now);
  refreshDaily(player, now);

  return TASK_DEFINITIONS.map((task) => {
    const target = resolveTaskTarget(task, player);
    const progress = Math.min(target, getMetricValue(player, task.metric, now));
    const claimKey = getTaskClaimKey(task, now);
    return {
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      progress,
      target,
      completed: progress >= target,
      claimed: Boolean(player.taskClaims[claimKey]),
      claimKey,
      reward: resolveTaskReward(task, player)
    };
  });
}
