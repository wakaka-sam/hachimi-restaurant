import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.mjs';
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
});

test('runtime client sources do not use canvas or SVG drawing for art', async () => {
  const files = [
    'client/web/index.html',
    'client/web/main.js',
    'client/web/styles.css'
  ];
  const forbidden = /canvas|<svg|drawImage|getContext|createElement\(['"]canvas|Canvas/i;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, forbidden, `${file} contains a forbidden runtime drawing token`);
  }
});
