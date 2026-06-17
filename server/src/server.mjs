import { resolve } from 'node:path';
import { createApp } from './app.mjs';
import { resolveServerConfig } from './config.mjs';
import { GameStore } from './store.mjs';

const rootDir = resolve(import.meta.dirname, '../..');
const { port, dataFile, clientRoot } = resolveServerConfig(process.env, rootDir);

const store = await new GameStore({ filePath: dataFile }).load();
const app = createApp({ store, rootDir, clientRoot });

app.listen(port, '0.0.0.0', () => {
  console.log(`Hachimi Restaurant listening on http://localhost:${port}`);
});
