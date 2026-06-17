import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createDefaultPlayer, normalizePlayer } from '../../shared/game-rules.mjs';

export class GameStore {
  constructor({ filePath = null, seed = null } = {}) {
    this.filePath = filePath;
    this.state = seed || {
      players: {},
      sessions: {}
    };
  }

  async load() {
    if (!this.filePath) {
      return this;
    }
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
      this.state.players ||= {};
      this.state.sessions ||= {};
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }
    return this;
  }

  async save() {
    if (!this.filePath) {
      return;
    }
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`);
  }

  getPlayer(playerId, now = new Date()) {
    if (!this.state.players[playerId]) {
      this.state.players[playerId] = createDefaultPlayer(playerId, now);
    }
    return normalizePlayer(this.state.players[playerId], now);
  }

  getSession(sessionId) {
    return this.state.sessions[sessionId] || null;
  }

  getActiveSession(playerId, now = new Date()) {
    const nowMs = new Date(now).getTime();
    return Object.values(this.state.sessions).find((session) => (
      session.playerId === playerId
      && session.status === 'active'
      && new Date(session.expiresAt).getTime() >= nowMs
    )) || null;
  }

  getExpiredActiveSessions(playerId, now = new Date()) {
    const nowMs = new Date(now).getTime();
    return Object.values(this.state.sessions)
      .filter((session) => (
        session.playerId === playerId
        && session.status === 'active'
        && new Date(session.expiresAt).getTime() < nowMs
      ))
      .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime());
  }

  saveSession(session) {
    this.state.sessions[session.sessionId] = session;
    return session;
  }
}
