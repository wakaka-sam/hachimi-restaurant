import { relative, resolve } from 'node:path';

export function resolveServerConfig(env = process.env, rootDir = process.cwd()) {
  const webStaticRoot = normalizeEnvValue(env.WEB_STATIC_ROOT);
  const clientRoot = webStaticRoot ? resolve(rootDir, webStaticRoot) : undefined;

  if (env.NODE_ENV === 'production' && !webStaticRoot) {
    throw new Error(
      'WEB_STATIC_ROOT must point to Cocos Web build output in production; client/web is debug-only.'
    );
  }
  if (env.NODE_ENV === 'production' && isDebugWebRoot(clientRoot, rootDir)) {
    throw new Error(
      'WEB_STATIC_ROOT must not point to client/web in production; use Cocos Web build output.'
    );
  }

  return {
    port: Number(env.PORT || 4173),
    dataFile: env.GAME_DATA_FILE || resolve(rootDir, 'server/data/game-state.json'),
    clientRoot
  };
}

function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function isDebugWebRoot(clientRoot, rootDir) {
  if (!clientRoot) {
    return false;
  }
  const debugRoot = resolve(rootDir, 'client/web');
  const pathFromDebugRoot = relative(debugRoot, clientRoot);
  return pathFromDebugRoot === '' || (
    pathFromDebugRoot
    && !pathFromDebugRoot.startsWith('..')
    && !pathFromDebugRoot.startsWith('/')
  );
}
