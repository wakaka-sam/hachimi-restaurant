import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  CONSTANTS,
  PARTS,
  PART_LABELS,
  areAllPartsMaxed,
  calculateReward,
  getEconomy,
  getPartEffectDescription,
  getStaminaRecovery,
  getTaskStatuses,
  getTuning,
  normalizeSessionSummary,
  refreshDaily,
  refreshStamina,
  toIso,
  validateSessionSummary
} from '../../shared/game-rules.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const SESSION_SUMMARY_FIELDS = [
  'customersServed',
  'customersLost',
  'averageSatisfaction',
  'maxCombo',
  'durationSeconds',
  'customerTypes'
];
const MAX_JSON_BODY_BYTES = 64 * 1024;

export function createApp({
  store,
  rootDir = process.cwd(),
  clientRoot: configuredClientRoot = null,
  nowProvider = () => new Date()
}) {
  const clientRoot = configuredClientRoot ? resolve(configuredClientRoot) : resolve(rootDir, 'client/web');
  const textureRoot = resolve(rootDir, 'client/assets/textures');
  const sharedRoot = resolve(rootDir, 'shared');

  return createServer(async (request, response) => {
    try {
      setCommonHeaders(response);

      if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
      }

      const url = new URL(request.url, 'http://localhost');

      if (url.pathname.startsWith('/api/')) {
        await handleApi(request, response, store, url, nowProvider);
        return;
      }

      if (url.pathname.startsWith('/textures/')) {
        await serveStatic(response, textureRoot, url.pathname.replace('/textures/', ''));
        return;
      }

      if (url.pathname.startsWith('/shared/')) {
        await serveStatic(response, sharedRoot, url.pathname.replace('/shared/', ''));
        return;
      }

      const assetPath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      await serveStatic(response, clientRoot, assetPath);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  });
}

function setCommonHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Player-Id');
}

async function serveStatic(response, root, requestedPath) {
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = resolve(root, safePath);

  if (!filePath.startsWith(root)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
    const type = MIME_TYPES[extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendText(response, 404, 'Not found');
      return;
    }
    throw error;
  }
}

async function handleApi(request, response, store, url, nowProvider = () => new Date()) {
  const playerId = getPlayerId(request, url);
  const now = nowProvider();

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'hachimi-restaurant', now: toIso(now) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/player/profile') {
    const player = store.getPlayer(playerId, now);
    refreshStamina(player, now);
    await settleExpiredSessions(store, player, now);
    await store.save();
    sendJson(response, 200, { ok: true, profile: serializeProfile(player, store, now) });
    return;
  }

  if (request.method !== 'POST') {
    sendError(response, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    return;
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      sendError(response, error.status, error.code, error.message);
      return;
    }
    throw error;
  }

  if (url.pathname === '/api/session/start') {
    await startSession(response, store, playerId, body, now);
    return;
  }

  if (url.pathname === '/api/session/finish') {
    await finishSession(response, store, playerId, body, now);
    return;
  }

  if (url.pathname === '/api/upgrade/part') {
    await upgradePart(response, store, playerId, body, now);
    return;
  }

  if (url.pathname === '/api/upgrade/restaurant') {
    await upgradeRestaurant(response, store, playerId, now);
    return;
  }

  if (url.pathname === '/api/tasks/claim') {
    await claimTask(response, store, playerId, body, now);
    return;
  }

  sendError(response, 404, 'NOT_FOUND', 'Endpoint not found.');
}

function getPlayerId(request, url) {
  return request.headers['x-player-id'] || url.searchParams.get('playerId') || 'demo-player';
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    if (size > MAX_JSON_BODY_BYTES) {
      throw new RequestBodyError(413, 'REQUEST_TOO_LARGE', 'JSON request body is too large.');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestBodyError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

class RequestBodyError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'RequestBodyError';
    this.status = status;
    this.code = code;
  }
}

function serializeProfile(player, store, now = new Date()) {
  const economy = getEconomy(player);
  const activeSession = store.getActiveSession(player.playerId, now);
  return {
    player: {
      playerId: player.playerId,
      coins: player.coins,
      stamina: player.stamina,
      staminaMax: CONSTANTS.staminaMax,
      staminaUpdatedAt: player.staminaUpdatedAt,
      restaurantLevel: player.restaurantLevel,
      parts: player.parts,
      stats: player.stats,
      daily: player.daily
    },
    staminaRecovery: getStaminaRecovery(player, now),
    economy,
    partLabels: PART_LABELS,
    partEffects: Object.fromEntries(PARTS.map((part) => [part, getPartEffectDescription(part, player)])),
    tuning: getTuning(player),
    allPartsMaxed: areAllPartsMaxed(player),
    tasks: getTaskStatuses(player, now),
    activeSession: activeSession ? serializeBusinessSession(activeSession, now) : null
  };
}

function serializeBusinessSession(session, now = new Date()) {
  const speedMultiplier = session.speedMode === '2x' ? 2 : 1;
  const elapsedRealSeconds = Math.max(0, (new Date(now).getTime() - new Date(session.startedAt).getTime()) / 1000);
  const elapsedGameSeconds = Math.min(CONSTANTS.sessionDurationSeconds, elapsedRealSeconds * speedMultiplier);
  const remainingSeconds = Math.max(0, CONSTANTS.sessionDurationSeconds - elapsedGameSeconds);
  return {
    ...session,
    elapsedSeconds: Math.round(elapsedGameSeconds),
    remainingSeconds: Math.ceil(remainingSeconds),
    recoveryWindowSeconds: CONSTANTS.sessionRecoveryWindowSeconds
  };
}

function getMinimumSettlementRealSeconds() {
  return Math.ceil(CONSTANTS.sessionDurationSeconds / CONSTANTS.maxSpeedMultiplier);
}

function getSessionElapsedRealSeconds(session, now = new Date()) {
  return Math.max(0, (new Date(now).getTime() - new Date(session.startedAt).getTime()) / 1000);
}

async function startSession(response, store, playerId, body, now) {
  const player = store.getPlayer(playerId, now);
  refreshStamina(player, now);
  const expiredSettlements = await settleExpiredSessions(store, player, now);

  const existing = store.getActiveSession(playerId, now);
  if (existing) {
    sendJson(response, 200, {
      ok: true,
      resumed: true,
      session: serializeBusinessSession(existing, now),
      expiredSettlements,
      profile: serializeProfile(player, store, now)
    });
    return;
  }

  if (player.stamina < CONSTANTS.sessionStaminaCost) {
    sendError(response, 400, 'INSUFFICIENT_STAMINA', 'Not enough stamina to start business.');
    return;
  }

  const speedMode = body.speedMode === '2x' ? '2x' : '1x';
  const speedMultiplier = speedMode === '2x' ? 2 : 1;
  const realSessionSeconds = Math.ceil(CONSTANTS.sessionDurationSeconds / speedMultiplier);
  player.stamina -= CONSTANTS.sessionStaminaCost;
  player.staminaUpdatedAt = toIso(now);
  player.updatedAt = toIso(now);

  const expiresAt = new Date(
    now.getTime() + (realSessionSeconds + CONSTANTS.sessionRecoveryWindowSeconds) * 1000
  );
  const session = {
    sessionId: randomUUID(),
    playerId,
    startedAt: toIso(now),
    expiresAt: toIso(expiresAt),
    speedMode,
    status: 'active',
    summary: null,
    rewardCoins: 0
  };

  store.saveSession(session);
  await store.save();

  sendJson(response, 200, {
    ok: true,
    resumed: false,
    session: serializeBusinessSession(session, now),
    expiredSettlements,
    gameplay: {
      durationSeconds: CONSTANTS.sessionDurationSeconds,
      staminaCost: CONSTANTS.sessionStaminaCost,
      maxCustomersPerSession: CONSTANTS.maxCustomersPerSession
    },
    profile: serializeProfile(player, store, now)
  });
}

async function finishSession(response, store, playerId, body, now) {
  const player = store.getPlayer(playerId, now);
  refreshDaily(player, now);
  const session = store.getSession(body.sessionId);

  if (!session || session.playerId !== playerId) {
    sendError(response, 404, 'SESSION_NOT_FOUND', 'Business session not found.');
    return;
  }
  if (session.status !== 'active') {
    sendError(response, 400, 'SESSION_ALREADY_FINISHED', 'Business session is already finished.');
    return;
  }

  const expired = new Date(session.expiresAt).getTime() < now.getTime();
  const submittedSummary = getSubmittedSessionSummary(body);
  let summary;
  if (expired) {
    if (submittedSummary) {
      const validation = validateSessionSummary({ ...submittedSummary, speedMode: session.speedMode });
      if (!validation.ok) {
        sendError(response, 400, 'INVALID_SESSION_SUMMARY', validation.errors.join(', '));
        return;
      }
      summary = validation.summary;
    } else {
      summary = createExpiredSummary(session, body);
    }
  } else {
    const validation = validateSessionSummary({ ...(submittedSummary || body), speedMode: session.speedMode });
    if (!validation.ok) {
      sendError(response, 400, 'INVALID_SESSION_SUMMARY', validation.errors.join(', '));
      return;
    }
    const elapsedRealSeconds = getSessionElapsedRealSeconds(session, now);
    const minimumRealSeconds = getMinimumSettlementRealSeconds();
    if (elapsedRealSeconds < minimumRealSeconds) {
      sendJson(response, 400, {
        ok: false,
        error: {
          code: 'SESSION_NOT_READY',
          message: 'Business session cannot be settled before enough real time has elapsed.',
          minimumRealSeconds,
          elapsedRealSeconds: Math.floor(elapsedRealSeconds),
          remainingRealSeconds: Math.ceil(minimumRealSeconds - elapsedRealSeconds)
        },
        session: serializeBusinessSession(session, now)
      });
      return;
    }
    summary = validation.summary;
  }

  const settlement = settleSession(player, session, summary, now, expired ? 'expired' : 'finished');

  await store.save();

  sendJson(response, 200, {
    ok: true,
    session: serializeBusinessSession(session, now),
    settlement,
    profile: serializeProfile(player, store, now)
  });
}

function getSubmittedSessionSummary(body = {}) {
  if (body.summary && typeof body.summary === 'object') {
    return body.summary;
  }
  if (SESSION_SUMMARY_FIELDS.some((field) => Object.hasOwn(body, field))) {
    return body;
  }
  return null;
}

async function settleExpiredSessions(store, player, now) {
  refreshDaily(player, now);
  const sessions = store.getExpiredActiveSessions(player.playerId, now);
  if (sessions.length === 0) {
    return [];
  }
  const settlements = sessions.map((session) => ({
    sessionId: session.sessionId,
    settlement: settleSession(player, session, createExpiredSummary(session), now, 'expired')
  }));
  await store.save();
  return settlements;
}

function createExpiredSummary(session, body = {}) {
  return {
    customersServed: 0,
    customersLost: 1,
    averageSatisfaction: 0,
    maxCombo: 0,
    durationSeconds: CONSTANTS.sessionDurationSeconds,
    speedMode: session.speedMode,
    clientVersion: body.clientVersion || 'expired'
  };
}

function settleSession(player, session, summary, now, status) {
  const settlement = calculateReward(player, summary);
  const normalizedSummary = normalizeSessionSummary(summary);
  player.coins += settlement.rewardCoins;
  player.stats.totalSessions += 1;
  player.stats.totalCustomersServed += normalizedSummary.customersServed;
  player.stats.totalCustomersLost += normalizedSummary.customersLost;
  player.stats.totalCoinsEarned += settlement.rewardCoins;
  player.daily.sessions += 1;
  player.daily.customersServed += normalizedSummary.customersServed;
  player.daily.coinsEarned += settlement.rewardCoins;
  player.updatedAt = toIso(now);

  session.status = status;
  session.summary = normalizedSummary;
  session.rewardCoins = settlement.rewardCoins;
  session.settlement = settlement;
  session.finishedAt = toIso(now);
  return settlement;
}

async function upgradePart(response, store, playerId, body, now) {
  const player = store.getPlayer(playerId, now);
  refreshStamina(player, now);
  refreshDaily(player, now);

  const part = body.part;
  if (!PARTS.includes(part)) {
    sendError(response, 400, 'INVALID_PART', 'Unknown restaurant part.');
    return;
  }
  if (player.parts[part] >= CONSTANTS.starsPerPart) {
    sendError(response, 400, 'PART_ALREADY_MAXED', 'Part is already maxed.');
    return;
  }

  const cost = getEconomy(player).upgradeCost;
  if (player.coins < cost) {
    sendError(response, 400, 'INSUFFICIENT_COINS', 'Not enough coins for this upgrade.');
    return;
  }

  player.coins -= cost;
  player.parts[part] += 1;
  player.stats.totalPartUpgrades += 1;
  player.daily.partUpgrades += 1;
  player.updatedAt = toIso(now);
  await store.save();

  sendJson(response, 200, {
    ok: true,
    upgradedPart: part,
    cost,
    profile: serializeProfile(player, store, now)
  });
}

async function upgradeRestaurant(response, store, playerId, now) {
  const player = store.getPlayer(playerId, now);
  refreshStamina(player, now);

  if (!areAllPartsMaxed(player)) {
    sendError(response, 400, 'RESTAURANT_NOT_READY', 'All parts must be 5 stars before restaurant upgrade.');
    return;
  }

  player.restaurantLevel += 1;
  for (const part of PARTS) {
    player.parts[part] = 0;
  }
  player.stats.totalRestaurantUpgrades += 1;
  player.updatedAt = toIso(now);
  await store.save();

  sendJson(response, 200, {
    ok: true,
    profile: serializeProfile(player, store, now)
  });
}

async function claimTask(response, store, playerId, body, now) {
  const player = store.getPlayer(playerId, now);
  refreshStamina(player, now);
  const task = getTaskStatuses(player, now).find((item) => item.id === body.taskId);

  if (!task) {
    sendError(response, 404, 'TASK_NOT_FOUND', 'Task not found.');
    return;
  }
  if (!task.completed) {
    sendError(response, 400, 'TASK_NOT_COMPLETE', 'Task is not complete.');
    return;
  }
  if (task.claimed) {
    sendError(response, 400, 'TASK_ALREADY_CLAIMED', 'Task reward has already been claimed.');
    return;
  }

  player.taskClaims[task.claimKey] = toIso(now);
  player.coins += task.reward.coins || 0;
  player.stamina = Math.min(CONSTANTS.staminaMax, player.stamina + (task.reward.stamina || 0));
  player.stats.totalTasksClaimed += 1;
  player.updatedAt = toIso(now);
  await store.save();

  sendJson(response, 200, {
    ok: true,
    claimedTask: task,
    profile: serializeProfile(player, store, now)
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function sendError(response, status, code, message) {
  sendJson(response, status, {
    ok: false,
    error: { code, message }
  });
}
