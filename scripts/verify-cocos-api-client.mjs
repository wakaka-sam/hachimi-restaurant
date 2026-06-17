import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const tempDir = await mkdtemp(join(tmpdir(), 'hachimi-cocos-api-'));

try {
  await writeFile(join(tempDir, 'package.json'), '{"type":"commonjs"}\n');
  await mkdir(join(tempDir, 'node_modules/cc'), { recursive: true });
  await writeFile(join(tempDir, 'node_modules/cc/index.js'), `
const storage = new Map();
exports.sys = {
  isBrowser: true,
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    }
  }
};
`);
  await transpileCocosScript('client/cocos/assets/scripts/services/ApiTransport.ts', 'ApiTransport.js');
  await transpileCocosScript('client/cocos/assets/scripts/services/ApiClient.ts', 'ApiClient.js');

  const require = createRequire(join(tempDir, 'verify.cjs'));
  const cc = require('cc');
  const { ApiClient, ApiRequestError, PRODUCTION_API_BASE_URL } = require(join(tempDir, 'ApiClient.js'));

  await verifyBaseUrlResolution(ApiClient, cc, PRODUCTION_API_BASE_URL);
  await verifyFetchTransport(ApiClient, cc);
  await verifyRequestErrors(ApiClient, ApiRequestError, cc, PRODUCTION_API_BASE_URL);
  await verifyXhrFallback(ApiClient, cc);
} finally {
  delete globalThis.fetch;
  delete globalThis.XMLHttpRequest;
  await rm(tempDir, { recursive: true, force: true });
}

console.log('Cocos API client verified: base URL resolution, player id persistence, fetch transport, XHR fallback, and request errors.');

async function transpileCocosScript(sourcePath, outputName) {
  const source = await readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: sourcePath
  });
  await writeFile(join(tempDir, outputName), output.outputText);
}

async function verifyBaseUrlResolution(ApiClient, cc, PRODUCTION_API_BASE_URL) {
  cc.sys.isBrowser = true;
  assert.equal(ApiClient.resolveBaseUrl(''), '');
  assert.equal(ApiClient.resolveBaseUrl(' https://example.test/api/// '), 'https://example.test/api');

  cc.sys.isBrowser = false;
  assert.equal(ApiClient.resolveBaseUrl(''), PRODUCTION_API_BASE_URL);
}

async function verifyFetchTransport(ApiClient, cc) {
  cc.sys.isBrowser = true;
  cc.sys.localStorage.clear();
  cc.sys.localStorage.setItem('hachimi-player-id', 'player-from-storage');

  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          profile: {
            player: { playerId: 'player-from-storage' },
            economy: {},
            partLabels: {},
            partEffects: {},
            tuning: {},
            allPartsMaxed: false,
            tasks: []
          }
        };
      }
    };
  };

  const client = new ApiClient('');
  const profile = await client.getProfile();

  assert.equal(profile.player.playerId, 'player-from-storage');
  assert.equal(client.getPlayerId(), 'player-from-storage');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/player/profile');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers['x-player-id'], 'player-from-storage');
  assert.equal(requests[0].options.headers['content-type'], 'application/json');
  assert.equal(requests[0].options.body, undefined);
}

async function verifyRequestErrors(ApiClient, ApiRequestError, cc, PRODUCTION_API_BASE_URL) {
  cc.sys.isBrowser = false;
  cc.sys.localStorage.clear();
  const session = {
    sessionId: 'session-not-ready',
    playerId: 'generated-player',
    startedAt: '2026-06-17T00:00:00.000Z',
    expiresAt: '2026-06-17T00:03:30.000Z',
    speedMode: '2x',
    status: 'active'
  };
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: false,
      status: 400,
      async json() {
        return {
          ok: false,
          error: {
            code: 'SESSION_NOT_READY',
            message: 'wait before settlement',
            minimumRealSeconds: 45,
            elapsedRealSeconds: 31,
            remainingRealSeconds: 14
          },
          session
        };
      }
    };
  };

  const client = new ApiClient('');
  await assert.rejects(
    () => client.finishSession('session-not-ready', {
      customersServed: 10,
      customersLost: 0,
      averageSatisfaction: 0.8,
      maxCombo: 5,
      durationSeconds: 90,
      speedMode: '2x',
      clientVersion: 'verify-cocos-api',
      customerTypes: { normal: 10 }
    }),
    (error) => {
      assert.ok(error instanceof ApiRequestError);
      assert.equal(error.code, 'SESSION_NOT_READY');
      assert.equal(error.minimumRealSeconds, 45);
      assert.equal(error.elapsedRealSeconds, 31);
      assert.equal(error.remainingRealSeconds, 14);
      assert.equal(error.session.sessionId, 'session-not-ready');
      return true;
    }
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${PRODUCTION_API_BASE_URL}/api/session/finish`);
  assert.equal(JSON.parse(requests[0].options.body).sessionId, 'session-not-ready');
}

async function verifyXhrFallback(ApiClient, cc) {
  cc.sys.isBrowser = true;
  cc.sys.localStorage.clear();
  cc.sys.localStorage.setItem('hachimi-player-id', 'xhr-player');
  delete globalThis.fetch;

  const requests = [];
  globalThis.XMLHttpRequest = class FakeXMLHttpRequest {
    headers = {};
    status = 200;
    responseText = JSON.stringify({
      ok: true,
      resumed: false,
      session: { sessionId: 'xhr-session', speedMode: '2x', status: 'active' },
      profile: { player: { playerId: 'xhr-player' }, tasks: [] }
    });

    open(method, url, async) {
      this.method = method;
      this.url = url;
      this.async = async;
    }

    setRequestHeader(key, value) {
      this.headers[key] = value;
    }

    send(body) {
      requests.push({
        method: this.method,
        url: this.url,
        async: this.async,
        headers: this.headers,
        body
      });
      this.onload();
    }
  };

  const client = new ApiClient('');
  const response = await client.startSession('2x');

  assert.equal(response.session.sessionId, 'xhr-session');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, '/api/session/start');
  assert.equal(requests[0].headers['x-player-id'], 'xhr-player');
  assert.deepEqual(JSON.parse(requests[0].body), { speedMode: '2x' });
}
