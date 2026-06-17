import { resolve } from 'node:path';
import { createApp } from './app.mjs';
import { GameStore } from './store.mjs';

const rootDir = resolve(import.meta.dirname, '../..');
const port = Number(process.env.PORT || 4173);
const dataFile = process.env.GAME_DATA_FILE || resolve(rootDir, 'server/data/game-state.json');

const store = await new GameStore({ filePath: dataFile }).load();
const app = createApp({ store, rootDir });

app.listen(port, '0.0.0.0', () => {
  console.log(`Hachimi Restaurant listening on http://localhost:${port}`);
});
