import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSTANTS,
  CUSTOMER_TYPES,
  createDefaultPlayer,
  getEconomy,
  getEffectivePartStars,
  getTuning,
  calculateReward,
  normalizeSessionSummary,
  refreshStamina
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

test('stamina recovers by backend time and caps at 60', () => {
  const player = createDefaultPlayer('stamina-test', new Date('2026-06-17T00:00:00.000Z'));
  player.stamina = 30;
  player.staminaUpdatedAt = '2026-06-17T00:00:00.000Z';

  refreshStamina(player, new Date('2026-06-17T00:25:00.000Z'));
  assert.equal(player.stamina, 35);

  refreshStamina(player, new Date('2026-06-17T06:00:00.000Z'));
  assert.equal(player.stamina, 60);
});
