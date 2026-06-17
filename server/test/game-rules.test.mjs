import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSTANTS,
  CUSTOMER_TYPES,
  TASK_DEFINITIONS,
  TASK_REWARD_FIELDS,
  TASK_TYPE_LABELS,
  createDefaultPlayer,
  getEconomy,
  getEffectivePartStars,
  getPartEffectDescription,
  getStaminaRecovery,
  getTaskClaimKey,
  getTaskRewardSummary,
  getTaskStatuses,
  getTuning,
  calculatePerformance,
  calculateReward,
  normalizeSessionSummary,
  refreshStamina,
  resolveTaskReward,
  validateSessionSummary
} from '../../shared/game-rules.mjs';

test('incomePower model makes every upgrade worth 8 percent expected revenue growth', () => {
  const player = createDefaultPlayer('rules-test', new Date('2026-06-17T00:00:00.000Z'));
  assert.equal(getEconomy(player).incomePower, 0);
  assert.equal(getEconomy(player).expectedRevenue, 100);
  assert.equal(getEconomy(player).upgradeCost, 100);

  player.parts.cashier = 1;
  assert.equal(getEconomy(player).incomePower, 1);
  assert.equal(getEconomy(player).expectedRevenue, 108);
  assert.equal(getEconomy(player).upgradeCost, 108);

  player.parts.table = 1;
  assert.equal(getEconomy(player).incomePower, 2);
  assert.equal(getEconomy(player).expectedRevenue, 117);
});

test('restaurant upgrade reset does not reduce incomePower', () => {
  const player = createDefaultPlayer('restaurant-reset', new Date('2026-06-17T00:00:00.000Z'));
  for (const part of Object.keys(player.parts)) {
    player.parts[part] = 5;
  }

  assert.equal(getEconomy(player).incomePower, 25);
  const revenueBefore = getEconomy(player).expectedRevenue;

  player.restaurantLevel = 2;
  for (const part of Object.keys(player.parts)) {
    player.parts[part] = 0;
  }

  assert.equal(getEconomy(player).incomePower, 25);
  assert.equal(getEconomy(player).expectedRevenue, revenueBefore);
});

test('restaurant upgrade reset preserves long-term handfeel tuning', () => {
  const player = createDefaultPlayer('handfeel-reset', new Date('2026-06-17T00:00:00.000Z'));
  for (const part of Object.keys(player.parts)) {
    player.parts[part] = 5;
  }

  const effectiveBefore = getEffectivePartStars(player);
  const tuningBefore = getTuning(player);

  player.restaurantLevel = 2;
  for (const part of Object.keys(player.parts)) {
    player.parts[part] = 0;
  }

  assert.deepEqual(getEffectivePartStars(player), effectiveBefore);
  assert.deepEqual(getTuning(player), tuningBefore);

  player.parts.cashier = 1;
  player.parts.chair = 1;
  player.parts.floor = 1;
  player.parts.wall = 1;
  const upgradedTuning = getTuning(player);
  assert.ok(upgradedTuning.cashierWindowSeconds > tuningBefore.cashierWindowSeconds);
  assert.ok(upgradedTuning.patienceSeconds > tuningBefore.patienceSeconds);
  assert.ok(upgradedTuning.moveSpeedMultiplier > tuningBefore.moveSpeedMultiplier);
  assert.ok(upgradedTuning.spawnIntervalSeconds < tuningBefore.spawnIntervalSeconds);
});

test('initial handfeel tuning matches MVP business density targets', () => {
  const player = createDefaultPlayer('density-targets', new Date('2026-06-17T00:00:00.000Z'));
  const tuning = getTuning(player);

  assert.equal(tuning.tableCapacity, 2);
  assert.equal(tuning.initialCustomerCount, 2);
  assert.equal(CONSTANTS.maxTableSlots, 5);
  assert.equal(CONSTANTS.maxWaitingCustomers, 4);
  assert.ok(tuning.spawnIntervalSeconds >= 6);
  assert.ok(tuning.spawnIntervalSeconds <= 8);
  assert.ok(tuning.prepDelaySeconds + tuning.eatingSeconds >= 18);
  assert.ok(tuning.prepDelaySeconds + tuning.eatingSeconds <= 25);
  assert.equal(CONSTANTS.maxCustomersPerSession, 18);
});

test('part effect descriptions expose max-star state', () => {
  const player = createDefaultPlayer('part-effect-text', new Date('2026-06-17T00:00:00.000Z'));

  player.parts.cashier = 4;
  assert.match(getPartEffectDescription('cashier', player), /下一星/);
  assert.match(getPartEffectDescription('cashier', player), /5 星/);

  player.parts.cashier = 5;
  assert.equal(getPartEffectDescription('cashier', player), '收银机已满星，等待整体升级餐厅');
});

test('session summary validation enforces the 18 customer cap', () => {
  const capped = validateSessionSummary({
    customersServed: 14,
    customersLost: 4,
    averageSatisfaction: 0.85,
    maxCombo: 8,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.equal(capped.ok, true);

  const overflow = validateSessionSummary({
    customersServed: 15,
    customersLost: 4,
    averageSatisfaction: 0.85,
    maxCombo: 8,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.equal(overflow.ok, false);
  assert.deepEqual(overflow.errors, ['too_many_customers']);
});

test('session summary validation requires customer type totals to match customers', () => {
  const validImplicit = validateSessionSummary({
    customersServed: 7,
    customersLost: 2,
    averageSatisfaction: 0.7,
    maxCombo: 4,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.equal(validImplicit.ok, true);
  assert.deepEqual(validImplicit.summary.customerTypes, { normal: 9 });

  const validExplicit = validateSessionSummary({
    customersServed: 7,
    customersLost: 2,
    averageSatisfaction: 0.7,
    maxCombo: 4,
    durationSeconds: CONSTANTS.sessionDurationSeconds,
    customerTypes: { normal: 9 }
  });
  assert.equal(validExplicit.ok, true);

  const mismatch = validateSessionSummary({
    customersServed: 7,
    customersLost: 2,
    averageSatisfaction: 0.7,
    maxCombo: 4,
    durationSeconds: CONSTANTS.sessionDurationSeconds,
    customerTypes: { normal: 8 }
  });
  assert.equal(mismatch.ok, false);
  assert.deepEqual(mismatch.errors, ['customer_type_count_mismatch']);
});

test('session summary validation requires the documented 90 second duration', () => {
  const valid = validateSessionSummary({
    customersServed: 10,
    customersLost: 0,
    averageSatisfaction: 0.9,
    maxCombo: 6,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.equal(valid.ok, true);

  const short = validateSessionSummary({
    customersServed: 10,
    customersLost: 0,
    averageSatisfaction: 0.9,
    maxCombo: 6,
    durationSeconds: 45
  });
  assert.equal(short.ok, false);
  assert.deepEqual(short.errors, ['invalid_duration']);

  const long = validateSessionSummary({
    customersServed: 10,
    customersLost: 0,
    averageSatisfaction: 0.9,
    maxCombo: 6,
    durationSeconds: 120
  });
  assert.equal(long.ok, false);
  assert.deepEqual(long.errors, ['invalid_duration']);
});

test('session summary validation rejects invalid numeric bounds', () => {
  const invalid = validateSessionSummary({
    customersServed: -1,
    customersLost: 2.5,
    averageSatisfaction: 1.2,
    maxCombo: -3,
    durationSeconds: CONSTANTS.sessionDurationSeconds,
    customerTypes: { normal: -1 }
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes('invalid_customer_count'));
  assert.ok(invalid.errors.includes('invalid_satisfaction'));
  assert.ok(invalid.errors.includes('invalid_combo'));
  assert.ok(invalid.errors.includes('invalid_customer_type_count'));
});

test('performance reward is clamped between 75 and 130 percent', () => {
  const player = createDefaultPlayer('reward-test', new Date('2026-06-17T00:00:00.000Z'));

  const poor = calculateReward(player, {
    customersServed: 0,
    customersLost: 10,
    averageSatisfaction: 0,
    maxCombo: 0,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.equal(poor.rewardCoins, 75);

  const excellent = calculateReward(player, {
    customersServed: 14,
    customersLost: 0,
    averageSatisfaction: 1,
    maxCombo: 14,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.equal(excellent.rewardCoins, 130);
});

test('completion score uses the normal service target instead of only loss ratio', () => {
  const player = createDefaultPlayer('completion-target-test', new Date('2026-06-17T00:00:00.000Z'));
  const lowActivity = calculateReward(player, {
    customersServed: 1,
    customersLost: 0,
    averageSatisfaction: 1,
    maxCombo: 1,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });

  assert.equal(lowActivity.completionScore, 1 / CONSTANTS.normalCustomersPerSession);
  assert.ok(lowActivity.rewardCoins < lowActivity.upgradeCost);
  assert.ok(lowActivity.performanceFactor < 1);

  const normalActivity = calculatePerformance({
    customersServed: CONSTANTS.normalCustomersPerSession,
    customersLost: 0,
    averageSatisfaction: 0.8,
    maxCombo: 4,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });

  assert.equal(normalActivity.completionScore, 1);
});

test('normal business performance stays close to one upgrade cost', () => {
  const player = createDefaultPlayer('normal-reward-test', new Date('2026-06-17T00:00:00.000Z'));
  const normal = calculateReward(player, {
    customersServed: 10,
    customersLost: 2,
    averageSatisfaction: 0.6,
    maxCombo: 2,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });

  assert.ok(normal.rewardCoins >= normal.upgradeCost);
  assert.ok(normal.rewardCoins <= Math.round(normal.upgradeCost * 1.05));
  assert.ok(Math.abs(normal.performanceFactor - 1.0075) < 0.0001);
});

test('speed mode does not change reward for the same performance summary', () => {
  const player = createDefaultPlayer('speed-reward-test', new Date('2026-06-17T00:00:00.000Z'));
  const baseSummary = {
    customersServed: 12,
    customersLost: 1,
    averageSatisfaction: 0.82,
    maxCombo: 7,
    durationSeconds: CONSTANTS.sessionDurationSeconds,
    customerTypes: { normal: 13 }
  };

  const normalSpeed = calculateReward(player, { ...baseSummary, speedMode: '1x' });
  const doubleSpeed = calculateReward(player, { ...baseSummary, speedMode: '2x' });

  assert.equal(doubleSpeed.rewardCoins, normalSpeed.rewardCoins);
  assert.equal(doubleSpeed.performanceFactor, normalSpeed.performanceFactor);
});

test('session summaries reserve normal customer type counts', () => {
  assert.deepEqual(CUSTOMER_TYPES, ['normal']);

  const fallback = normalizeSessionSummary({
    customersServed: 7,
    customersLost: 2,
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.deepEqual(fallback.customerTypes, { normal: 9 });

  const explicit = normalizeSessionSummary({
    customersServed: 7,
    customersLost: 2,
    customerTypes: { normal: 6, vip: 99 },
    durationSeconds: CONSTANTS.sessionDurationSeconds
  });
  assert.deepEqual(explicit.customerTypes, { normal: 6 });
});

test('task statuses expose guide daily and growth labels', () => {
  const player = createDefaultPlayer('task-label-test', new Date('2026-06-17T00:00:00.000Z'));
  const statuses = getTaskStatuses(player, new Date('2026-06-17T00:00:00.000Z'));

  assert.deepEqual(TASK_TYPE_LABELS, {
    guide: '引导任务',
    daily: '每日任务',
    growth: '成长任务'
  });
  assert.deepEqual(
    [...new Set(statuses.map((task) => task.typeLabel))].sort(),
    ['引导任务', '成长任务', '每日任务'].sort()
  );
});

test('task rewards are limited to coins and stamina', () => {
  const player = createDefaultPlayer('task-reward-fields-test', new Date('2026-06-17T00:00:00.000Z'));
  const incomePowerBefore = getEconomy(player).incomePower;

  assert.deepEqual(TASK_REWARD_FIELDS, ['coins', 'stamina']);

  for (const definition of TASK_DEFINITIONS) {
    assert.deepEqual(
      Object.keys(definition.reward).sort(),
      Object.keys(definition.reward).filter((key) => TASK_REWARD_FIELDS.includes(key)).sort(),
      `${definition.id} contains a non-MVP reward field`
    );

    const reward = resolveTaskReward(definition, player);
    assert.deepEqual(Object.keys(reward), TASK_REWARD_FIELDS);
    assert.ok(Number.isInteger(reward.coins));
    assert.ok(Number.isInteger(reward.stamina));
    assert.ok(reward.coins >= 0);
    assert.ok(reward.stamina >= 0);
  }

  assert.equal(getEconomy(player).incomePower, incomePowerBefore);
});

test('daily task reward budget matches the MVP band', () => {
  const player = createDefaultPlayer('daily-reward-budget-test', new Date('2026-06-17T00:00:00.000Z'));
  const expectedRevenue = getEconomy(player).expectedRevenue;
  const dailySummary = getTaskRewardSummary(player, 'daily');

  assert.equal(dailySummary.type, 'daily');
  assert.equal(dailySummary.taskCount, 4);
  assert.equal(dailySummary.coins, expectedRevenue * 2);
  assert.equal(dailySummary.stamina, 20);
  assert.ok(dailySummary.coins >= expectedRevenue);
  assert.ok(dailySummary.coins <= expectedRevenue * 2);
  assert.ok(dailySummary.stamina >= 10);
  assert.ok(dailySummary.stamina <= 20);
});

test('overall task coin rewards stay within the auxiliary progression band', () => {
  const player = createDefaultPlayer('overall-task-budget-test', new Date('2026-06-17T00:00:00.000Z'));
  const expectedRevenue = getEconomy(player).expectedRevenue;
  const allRewards = getTaskRewardSummary(player);
  const firstGrowthCycleSessions = 20;
  const mainLoopCoinBaseline = expectedRevenue * firstGrowthCycleSessions;

  assert.equal(allRewards.type, 'all');
  assert.equal(allRewards.taskCount, TASK_DEFINITIONS.length);
  assert.ok(allRewards.coins >= mainLoopCoinBaseline * 0.2);
  assert.ok(allRewards.coins <= mainLoopCoinBaseline * 0.3);
});

test('daily task claim keys are scoped by backend date', () => {
  const dailyTask = TASK_DEFINITIONS.find((task) => task.id === 'daily_sessions_3');
  const guideTask = TASK_DEFINITIONS.find((task) => task.id === 'guide_first_session');

  assert.ok(dailyTask);
  assert.ok(guideTask);
  assert.equal(getTaskClaimKey(dailyTask, new Date('2026-06-17T08:00:00.000Z')), '2026-06-17:daily_sessions_3');
  assert.equal(getTaskClaimKey(dailyTask, new Date('2026-06-18T08:00:00.000Z')), '2026-06-18:daily_sessions_3');
  assert.equal(getTaskClaimKey(guideTask, new Date('2026-06-18T08:00:00.000Z')), 'guide_first_session');
});

test('stamina recovers by backend time and caps at 60', () => {
  const player = createDefaultPlayer('stamina-test', new Date('2026-06-17T00:00:00.000Z'));
  player.stamina = 30;
  player.staminaUpdatedAt = '2026-06-17T00:00:00.000Z';

  refreshStamina(player, new Date('2026-06-17T00:25:00.000Z'));
  assert.equal(player.stamina, 35);

  refreshStamina(player, new Date('2026-06-17T06:00:00.000Z'));
  assert.equal(player.stamina, 60);
});

test('stamina recovery status exposes backend countdowns', () => {
  const player = createDefaultPlayer('stamina-recovery-test', new Date('2026-06-17T00:00:00.000Z'));
  player.stamina = 50;
  player.staminaUpdatedAt = '2026-06-17T00:00:00.000Z';

  const recovery = getStaminaRecovery(player, new Date('2026-06-17T00:02:10.000Z'));

  assert.equal(recovery.isFull, false);
  assert.equal(recovery.recoverIntervalSeconds, 300);
  assert.equal(recovery.secondsUntilNext, 170);
  assert.equal(recovery.secondsUntilFull, 2870);
  assert.equal(recovery.nextRecoveryAt, '2026-06-17T00:05:00.000Z');
  assert.equal(recovery.fullRecoveryAt, '2026-06-17T00:50:00.000Z');

  player.stamina = 60;
  const full = getStaminaRecovery(player, new Date('2026-06-17T00:02:10.000Z'));
  assert.equal(full.isFull, true);
  assert.equal(full.nextRecoveryAt, null);
  assert.equal(full.fullRecoveryAt, null);
});
