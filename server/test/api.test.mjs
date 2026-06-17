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
