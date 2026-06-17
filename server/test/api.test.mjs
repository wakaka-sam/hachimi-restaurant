import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.mjs';
import { GameStore } from '../src/store.mjs';

async function startTestServer() {
  const store = await new GameStore().load();
  const app = createApp({ store, rootDir: process.cwd() });
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

test('API supports business session settlement and part upgrade', async (t) => {
  const { app, baseUrl } = await startTestServer();
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
});

test('API supports guide task claim and follow-up task claim', async (t) => {
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

test('API prevents double settlement of a business session', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const start = await request(baseUrl, '/api/session/start', {
    method: 'POST',
    body: {}
  });
  assert.equal(start.status, 200);

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
