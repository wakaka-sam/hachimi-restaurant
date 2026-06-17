import { resolve } from 'node:path';

export function resolveServerConfig(env = process.env, rootDir = process.cwd()) {
  const webStaticRoot = normalizeEnvValue(env.WEB_STATIC_ROOT);

  if (env.NODE_ENV === 'production' && !webStaticRoot) {
    throw new Error(
      'WEB_STATIC_ROOT must point to Cocos Web build output in production; client/web is debug-only.'
    );
  }

  return {
    port: Number(env.PORT || 4173),
    dataFile: env.GAME_DATA_FILE || resolve(rootDir, 'server/data/game-state.json'),
    clientRoot: webStaticRoot ? resolve(rootDir, webStaticRoot) : undefined
  };
}

function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}
