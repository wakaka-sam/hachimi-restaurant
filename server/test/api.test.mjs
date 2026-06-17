import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.mjs';
import { GameStore } from '../src/store.mjs';
import { TASK_DEFINITIONS, TASK_TYPE_LABELS } from '../../shared/game-rules.mjs';

async function startTestServer(options = {}) {
  const store = await new GameStore().load();
  const app = createApp({ store, rootDir: process.cwd(), ...options });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const { port } = app.address();
  return {
    app,
    store,
    baseUrl: `http://127.0.0.1:${port}`
  };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-player-id': 'api-test-player',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

function makeSessionReady(store, sessionId, elapsedSeconds = 46) {
  const session = store.getSession(sessionId);
  session.startedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString();
  return session;
}

test('API supports business session settlement and part upgrade', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const profile = await request(baseUrl, '/api/player/profile');
  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.player.coins, 0);
  assert.equal(profile.body.profile.player.stamina, 60);
  assert.equal(profile.body.profile.economy.expectedRevenue, 100);

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: { speedMode: '2x' }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.session.speedMode, '2x');
  assert.equal(start.body.profile.player.stamina, 50);
  makeSessionReady(store, start.body.session.sessionId);

  const finish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body: {
      sessionId: start.body.session.sessionId,
      summary: {
        customersServed: 10,
        customersLost: 2,
        averageSatisfaction: 0.75,
        maxCombo: 5,
        durationSeconds: 90,
        clientVersion: 'test'
      }
    }
  });
  assert.equal(finish.status, 200);
  assert.equal(finish.body.profile.player.coins, finish.body.settlement.rewardCoins);
  assert.ok(finish.body.settlement.rewardCoins >= 75);
  assert.deepEqual(finish.body.session.summary.customerTypes, { normal: 12 });

  const upgrade = await request(baseUrl, '/api/upgrade/part', {
    method: 'POST',
    body: { part: 'cashier' }
  });
  assert.equal(upgrade.status, 200);
  assert.equal(upgrade.body.profile.player.parts.cashier, 1);
  assert.equal(upgrade.body.profile.economy.expectedRevenue, 108);
});

test('API supports full part cycle and restaurant upgrade without income regression', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const player = store.getPlayer('api-test-player');
  player.coins = 1_000_000;

  let lastProfile = null;
  for (const part of ['cashier', 'table', 'chair', 'floor', 'wall']) {
    for (let i = 0; i < 5; i += 1) {
      const upgrade = await request(baseUrl, '/api/upgrade/part', {
        method: 'POST',
        body: { part }
      });
      assert.equal(upgrade.status, 200);
      lastProfile = upgrade.body.profile;
    }
  }

  assert.equal(lastProfile.allPartsMaxed, true);
  assert.equal(lastProfile.economy.incomePower, 25);
  const expectedRevenueBefore = lastProfile.economy.expectedRevenue;
  const tuningBefore = lastProfile.tuning;

  const restaurantUpgrade = await request(baseUrl, '/api/upgrade/restaurant', {
    method: 'POST',
    body: {}
  });

  assert.equal(restaurantUpgrade.status, 200);
  assert.equal(restaurantUpgrade.body.profile.player.restaurantLevel, 2);
  assert.deepEqual(restaurantUpgrade.body.profile.player.parts, {
    cashier: 0,
    table: 0,
    chair: 0,
    floor: 0,
    wall: 0
  });
  assert.equal(restaurantUpgrade.body.profile.economy.incomePower, 25);
  assert.equal(restaurantUpgrade.body.profile.economy.expectedRevenue, expectedRevenueBefore);
  assert.deepEqual(restaurantUpgrade.body.profile.tuning, tuningBefore);
});

test('API supports guide task claim and follow-up task claim', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);
  makeSessionReady(store, start.body.session.sessionId);

  const finish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body: {
      sessionId: start.body.session.sessionId,
      summary: {
        customersServed: 10,
        customersLost: 0,
        averageSatisfaction: 0.9,
        maxCombo: 6,
        durationSeconds: 90
      }
    }
  });
  assert.equal(finish.status, 200);

  const firstTask = finish.body.profile.tasks.find((task) => task.id === 'guide_first_session');
  assert.equal(firstTask.completed, true);
  assert.equal(firstTask.claimed, false);

  const firstClaim = await request(baseUrl, '/api/tasks/claim', {
    method: 'POST',
    body: { taskId: 'guide_first_session' }
  });
  assert.equal(firstClaim.status, 200);
  assert.equal(firstClaim.body.claimedTask.id, 'guide_first_session');

  const followUp = firstClaim.body.profile.tasks.find((task) => task.id === 'guide_first_task_claim');
  assert.equal(followUp.completed, true);
  assert.equal(followUp.claimed, false);

  const secondClaim = await request(baseUrl, '/api/tasks/claim', {
    method: 'POST',
    body: { taskId: 'guide_first_task_claim' }
  });
  assert.equal(secondClaim.status, 200);
  assert.equal(secondClaim.body.profile.player.stats.totalTasksClaimed, 2);
});

test('API profile exposes all MVP guide, daily, and growth tasks', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const profile = await request(baseUrl, '/api/player/profile');

  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.tasks.length, TASK_DEFINITIONS.length);
  assert.deepEqual(
    [...new Set(profile.body.profile.tasks.map((task) => task.type))].sort(),
    ['daily', 'growth', 'guide']
  );
  for (const definition of TASK_DEFINITIONS) {
    const task = profile.body.profile.tasks.find((item) => item.id === definition.id);
    assert.ok(
      task,
      `missing task ${definition.id}`
    );
    assert.equal(task.typeLabel, TASK_TYPE_LABELS[definition.type]);
  }
});

test('API daily task claims reset by backend date without changing income power', async (t) => {
  let currentNow = new Date('2026-06-17T08:00:00.000Z');
  const { app, store, baseUrl } = await startTestServer({ nowProvider: () => currentNow });
  t.after(() => app.close());

  const player = store.getPlayer('api-test-player', currentNow);
  player.stamina = 40;
  player.daily = {
    date: '2026-06-17',
    sessions: 3,
    partUpgrades: 0,
    coinsEarned: 0,
    customersServed: 0
  };

  const firstClaim = await request(baseUrl, '/api/tasks/claim', {
    method: 'POST',
    body: { taskId: 'daily_sessions_3' }
  });

  assert.equal(firstClaim.status, 200);
  assert.equal(firstClaim.body.claimedTask.claimKey, '2026-06-17:daily_sessions_3');
  assert.equal(firstClaim.body.profile.economy.incomePower, 0);
  assert.equal(firstClaim.body.profile.player.stats.totalTasksClaimed, 1);

  const duplicateClaim = await request(baseUrl, '/api/tasks/claim', {
    method: 'POST',
    body: { taskId: 'daily_sessions_3' }
  });

  assert.equal(duplicateClaim.status, 400);
  assert.equal(duplicateClaim.body.error.code, 'TASK_ALREADY_CLAIMED');

  currentNow = new Date('2026-06-18T08:00:00.000Z');
  player.daily = {
    date: '2026-06-18',
    sessions: 3,
    partUpgrades: 0,
    coinsEarned: 0,
    customersServed: 0
  };

  const nextDayClaim = await request(baseUrl, '/api/tasks/claim', {
    method: 'POST',
    body: { taskId: 'daily_sessions_3' }
  });

  assert.equal(nextDayClaim.status, 200);
  assert.equal(nextDayClaim.body.claimedTask.claimKey, '2026-06-18:daily_sessions_3');
  assert.equal(nextDayClaim.body.profile.economy.incomePower, 0);
  assert.equal(nextDayClaim.body.profile.player.stats.totalTasksClaimed, 2);
});

test('API profile exposes backend stamina recovery status', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const player = store.getPlayer('api-test-player');
  player.stamina = 50;
  player.staminaUpdatedAt = new Date(Date.now() - 120_000).toISOString();

  const profile = await request(baseUrl, '/api/player/profile');

  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.player.stamina, 50);
  assert.equal(profile.body.profile.staminaRecovery.isFull, false);
  assert.equal(profile.body.profile.staminaRecovery.recoverIntervalSeconds, 300);
  assert.ok(profile.body.profile.staminaRecovery.secondsUntilNext > 0);
  assert.ok(profile.body.profile.staminaRecovery.secondsUntilNext <= 180);
  assert.ok(
    profile.body.profile.staminaRecovery.secondsUntilFull
      > profile.body.profile.staminaRecovery.secondsUntilNext
  );
  assert.ok(profile.body.profile.staminaRecovery.nextRecoveryAt);
  assert.ok(profile.body.profile.staminaRecovery.fullRecoveryAt);
});

test('API prevents double settlement of a business session', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);
  makeSessionReady(store, start.body.session.sessionId);

  const body = {
    sessionId: start.body.session.sessionId,
    summary: {
      customersServed: 8,
      customersLost: 1,
      averageSatisfaction: 0.7,
      maxCombo: 4,
      durationSeconds: 90
    }
  };
  const firstFinish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body
  });
  assert.equal(firstFinish.status, 200);

  const secondFinish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body
  });
  assert.equal(secondFinish.status, 400);
  assert.equal(secondFinish.body.error.code, 'SESSION_ALREADY_FINISHED');
});

test('API rejects settlement before minimum real session time has elapsed', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: { speedMode: '2x' }
  });
  assert.equal(start.status, 200);

  const finish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body: {
      sessionId: start.body.session.sessionId,
      summary: {
        customersServed: 10,
        customersLost: 0,
        averageSatisfaction: 1,
        maxCombo: 8,
        durationSeconds: 90
      }
    }
  });

  assert.equal(finish.status, 400);
  assert.equal(finish.body.error.code, 'SESSION_NOT_READY');
  assert.equal(finish.body.error.minimumRealSeconds, 45);
  assert.ok(finish.body.error.remainingRealSeconds > 0);
});

test('API resumes an active business session instead of charging stamina again', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const firstStart = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: { speedMode: '1x' }
  });
  assert.equal(firstStart.status, 200);
  assert.equal(firstStart.body.profile.player.stamina, 50);
  assert.equal(firstStart.body.session.remainingSeconds, 90);

  const session = store.getSession(firstStart.body.session.sessionId);
  session.startedAt = new Date(Date.now() - 30_000).toISOString();

  const secondStart = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: { speedMode: '2x' }
  });
  assert.equal(secondStart.status, 200);
  assert.equal(secondStart.body.resumed, true);
  assert.equal(secondStart.body.session.sessionId, firstStart.body.session.sessionId);
  assert.equal(secondStart.body.profile.player.stamina, 50);
  assert.equal(secondStart.body.session.speedMode, '1x');
  assert.ok(secondStart.body.session.remainingSeconds <= 61);
  assert.ok(secondStart.body.session.remainingSeconds >= 59);
});

test('API uses speed mode to define the active session recovery window', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: { speedMode: '2x' }
  });

  assert.equal(start.status, 200);
  const startedAt = new Date(start.body.session.startedAt).getTime();
  const expiresAt = new Date(start.body.session.expiresAt).getTime();
  assert.equal(Math.round((expiresAt - startedAt) / 1000), 165);
  assert.equal(start.body.session.remainingSeconds, 90);
  assert.equal(start.body.session.recoveryWindowSeconds, 120);
});

test('API rejects session start when stamina is below 10', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const player = store.getPlayer('api-test-player');
  player.stamina = 9;
  player.staminaUpdatedAt = new Date().toISOString();

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });

  assert.equal(start.status, 400);
  assert.equal(start.body.error.code, 'INSUFFICIENT_STAMINA');
});

test('API settles an expired session with minimum guaranteed reward', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);

  const session = store.getSession(start.body.session.sessionId);
  session.expiresAt = '2000-01-01T00:00:00.000Z';

  const finish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body: {
      sessionId: session.sessionId,
      summary: {
        customersServed: 12,
        customersLost: 0,
        averageSatisfaction: 1,
        maxCombo: 12,
        durationSeconds: 90
      }
    }
  });

  assert.equal(finish.status, 200);
  assert.equal(finish.body.session.status, 'expired');
  assert.equal(finish.body.settlement.rewardCoins, 75);
  assert.equal(finish.body.profile.player.coins, 75);
});

test('API auto-settles expired active sessions when profile is loaded', async (t) => {
  const { app, store, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);

  const session = store.getSession(start.body.session.sessionId);
  session.expiresAt = '2000-01-01T00:00:00.000Z';

  const profile = await request(baseUrl, '/api/player/profile');

  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.player.coins, 75);
  assert.equal(profile.body.profile.player.stats.totalSessions, 1);
  assert.equal(profile.body.profile.activeSession, null);
  assert.equal(store.getSession(session.sessionId).status, 'expired');
  assert.equal(store.getSession(session.sessionId).rewardCoins, 75);
});

test('API rejects trusted client coin rewards and invalid session summaries', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);

  const finish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body: {
      sessionId: start.body.session.sessionId,
      earnedCoins: 999999,
      summary: {
        customersServed: 99,
        customersLost: 0,
        averageSatisfaction: 1,
        maxCombo: 99,
        durationSeconds: 90
      }
    }
  });

  assert.equal(finish.status, 400);
  assert.equal(finish.body.error.code, 'INVALID_SESSION_SUMMARY');
});

test('API rejects session summaries with mismatched customer type totals', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);

  const finish = await request(baseUrl, '/api/session/finish', {
    method: 'POST',
    body: {
      sessionId: start.body.session.sessionId,
      summary: {
        customersServed: 7,
        customersLost: 2,
        averageSatisfaction: 0.7,
        maxCombo: 4,
        durationSeconds: 90,
        customerTypes: { normal: 8 }
      }
    }
  });

  assert.equal(finish.status, 400);
  assert.equal(finish.body.error.code, 'INVALID_SESSION_SUMMARY');
  assert.match(finish.body.error.message, /customer_type_count_mismatch/);
});
