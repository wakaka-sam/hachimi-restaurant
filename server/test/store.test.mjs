import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.mjs';

test('GameStore persists players and sessions across reloads', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'hachimi-store-'));
  const dataFile = join(dataDir, 'game-state.json');
  t.after(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  const now = new Date('2026-06-17T00:00:00.000Z');
  const store = await new GameStore({ filePath: dataFile }).load();
  const player = store.getPlayer('persist-player', now);
  player.coins = 321;
  player.stamina = 42;
  store.saveSession({
    sessionId: 'persist-session',
    playerId: 'persist-player',
    startedAt: '2026-06-17T00:00:00.000Z',
    expiresAt: '2026-06-17T00:03:30.000Z',
    speedMode: '1x',
    status: 'active',
    summary: null,
    rewardCoins: 0
  });
  await store.save();

  const rawState = JSON.parse(await readFile(dataFile, 'utf8'));
  assert.equal(rawState.players['persist-player'].coins, 321);
  assert.equal(rawState.sessions['persist-session'].status, 'active');

  const reloaded = await new GameStore({ filePath: dataFile }).load();
  assert.equal(reloaded.getPlayer('persist-player', now).coins, 321);
  assert.equal(reloaded.getPlayer('persist-player', now).stamina, 42);
  assert.equal(reloaded.getSession('persist-session').playerId, 'persist-player');

  const leftovers = (await readdir(dataDir)).filter((file) => file.includes('.tmp-'));
  assert.deepEqual(leftovers, []);
});
