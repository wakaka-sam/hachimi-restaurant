# Server

Node.js backend service root.

## Current Commands

Run from repository root:

```bash
npm test
npm start
```

Default local URL:

```text
http://localhost:4173
```

## Data

Local runtime state is stored in `server/data/game-state.json` by default. JSON state files under `server/data/` are ignored by Git.

Use `GAME_DATA_FILE=/path/to/file.json` to choose a different state file.

## Environment

- Node.js: >=20.
- Production API domain target: `animalapi.wakaka007.cn`.
