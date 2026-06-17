import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSTANTS,
  createDefaultPlayer,
  getEconomy,
  calculateReward,
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

test('stamina recovers by backend time and caps at 60', () => {
  const player = createDefaultPlayer('stamina-test', new Date('2026-06-17T00:00:00.000Z'));
  player.stamina = 30;
  player.staminaUpdatedAt = '2026-06-17T00:00:00.000Z';

  refreshStamina(player, new Date('2026-06-17T00:25:00.000Z'));
  assert.equal(player.stamina, 35);

  refreshStamina(player, new Date('2026-06-17T06:00:00.000Z'));
  assert.equal(player.stamina, 60);
});
