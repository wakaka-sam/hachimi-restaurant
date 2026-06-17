import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.mjs';
import { resolveServerConfig } from '../src/config.mjs';
import { GameStore } from '../src/store.mjs';

async function startTestServer(options = {}) {
  const store = await new GameStore().load();
  const app = createApp({ store, rootDir: process.cwd(), ...options });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const { port } = app.address();
  return {
    app,
    baseUrl: `http://127.0.0.1:${port}`
  };
}

test('backend serves the texture-based Web debug harness and PNG assets', async (t) => {
  const { app, baseUrl } = await startTestServer();
  t.after(() => app.close());

  const html = await fetch(`${baseUrl}/`);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /小动物餐厅/);

  const js = await fetch(`${baseUrl}/main.js`);
  assert.equal(js.status, 200);
  assert.match(await js.text(), /textures/);

  const css = await fetch(`${baseUrl}/styles.css`);
  assert.equal(css.status, 200);
  assert.match(await css.text(), /restaurant-bg-stage-1\.png/);

  const texture = await fetch(`${baseUrl}/textures/customer-cat.png`);
  assert.equal(texture.status, 200);
  assert.equal(texture.headers.get('content-type'), 'image/png');
  assert.ok((await texture.arrayBuffer()).byteLength > 100);
});

test('backend can serve a configured Cocos Web static root', async (t) => {
  const staticRoot = await mkdtemp(join(tmpdir(), 'hachimi-cocos-web-'));
  await writeFile(join(staticRoot, 'index.html'), '<main>Cocos Web Build</main>');

  const { app, baseUrl } = await startTestServer({ clientRoot: staticRoot });
  t.after(async () => {
    app.close();
    await rm(staticRoot, { recursive: true, force: true });
  });

  const html = await fetch(`${baseUrl}/`);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /Cocos Web Build/);

  const debugHarnessScript = await fetch(`${baseUrl}/main.js`);
  assert.equal(debugHarnessScript.status, 404);
});

test('backend health endpoint reports service and backend time', async (t) => {
  const now = new Date('2026-06-17T12:00:00.000Z');
  const { app, baseUrl } = await startTestServer({ nowProvider: () => now });
  t.after(() => app.close());

  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    ok: true,
    service: 'hachimi-restaurant',
    now: '2026-06-17T12:00:00.000Z'
  });
});

test('production server config requires a Cocos Web static root', () => {
  const rootDir = process.cwd();

  assert.throws(
    () => resolveServerConfig({ NODE_ENV: 'production' }, rootDir),
    /WEB_STATIC_ROOT must point to Cocos Web build output/
  );
  assert.throws(
    () => resolveServerConfig({ NODE_ENV: 'production', WEB_STATIC_ROOT: 'client/web' }, rootDir),
    /WEB_STATIC_ROOT must not point to client\/web/
  );
  assert.throws(
    () => resolveServerConfig({ NODE_ENV: 'production', WEB_STATIC_ROOT: './client/web/build' }, rootDir),
    /WEB_STATIC_ROOT must not point to client\/web/
  );

  const config = resolveServerConfig({
    NODE_ENV: 'production',
    WEB_STATIC_ROOT: 'dist/cocos-web',
    GAME_DATA_FILE: '/tmp/hachimi-state.json',
    PORT: '5000'
  }, rootDir);

  assert.equal(config.port, 5000);
  assert.equal(config.dataFile, '/tmp/hachimi-state.json');
  assert.equal(config.clientRoot, join(rootDir, 'dist/cocos-web'));
});

test('runtime client sources do not use drawing or filter effects for art', async () => {
  const files = [
    'client/web/index.html',
    'client/web/main.js',
    'client/web/styles.css'
  ];
  const forbidden = /canvas|<svg|drawImage|getContext|createElement\(['"]canvas|Canvas|linear-gradient|radial-gradient|conic-gradient|box-shadow|text-shadow|filter\s*:|opacity\s*:/i;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, forbidden, `${file} contains a forbidden runtime drawing token`);
  }

  const css = await readFile('client/web/styles.css', 'utf8');
  for (const [index, line] of css.split('\n').entries()) {
    const match = line.match(/\bbackground(?:-color)?\s*:\s*([^;]+);/i);
    if (!match) {
      continue;
    }
    const value = match[1].trim().toLowerCase();
    assert.ok(
      value === 'transparent' || value === 'none' || value.startsWith('url('),
      `client/web/styles.css:${index + 1} uses non-texture background ${match[1].trim()}`
    );
  }
});
