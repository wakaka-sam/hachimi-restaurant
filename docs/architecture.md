# Architecture

## Current Implementation

The repository currently contains a Node.js gameplay backend and a texture-based Web prototype for the MVP loop.

The final client target remains Cocos Creator / Cocos Engine under `client/`. Cocos Creator is not installed in the current execution environment, so the first implementation slice uses a Web prototype to validate gameplay, backend state, formulas, and texture assets. The shared gameplay rules are written separately so they can be reused or ported by the future Cocos scene.

## Module Layout

```text
shared/game-rules.mjs       # Economy, stamina, task, session, and tuning formulas
server/src/                 # Node.js HTTP backend and static file host
server/test/                # Node test suite for rules and API flow
client/web/                 # Texture-based Web playable prototype
client/assets/textures/     # PNG textures used by runtime art/UI surfaces
scripts/generate-textures.mjs # Offline PNG texture generator
```

## Data Authority

The backend is authoritative for:

- Coins.
- Stamina and stamina recovery time.
- Restaurant level.
- Part stars.
- Business sessions.
- Settlement rewards.
- Task progress and claims.

The client submits a gameplay summary at the end of a business session. The backend recomputes the trusted reward.

## Runtime Art Rule

Runtime art surfaces should use PNG texture assets from `client/assets/textures/`.

Do not introduce runtime canvas/SVG drawing for game art or UI surfaces unless a future task explicitly changes the asset policy.

## Local Run

```bash
npm run generate:textures
npm test
npm start
```

The local Web prototype is served by the backend at:

```text
http://localhost:4173
```
