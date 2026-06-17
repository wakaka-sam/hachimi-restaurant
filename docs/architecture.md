# Architecture

## Current Implementation

The repository currently contains:

- A Node.js gameplay backend.
- A texture-based Web prototype for the MVP loop.
- A Cocos Creator 3.x source skeleton under `client/cocos/`.

Cocos Creator is not installed in the current execution environment, so the Cocos project has not been editor-opened or build-verified locally. The Cocos scripts are source-ready components that mirror the Web prototype and are intended to be wired into a portrait scene in the Cocos editor.

## Module Layout

```text
shared/game-rules.mjs       # Economy, stamina, task, session, and tuning formulas
server/src/                 # Node.js HTTP backend and static file host
server/test/                # Node test suite for rules and API flow
client/web/                 # Texture-based Web playable prototype
client/cocos/               # Cocos Creator project skeleton and TypeScript components
client/assets/textures/     # PNG textures used by runtime art/UI surfaces
scripts/generate-textures.mjs # Offline PNG texture generator
scripts/sync-cocos-textures.mjs # Copies PNG textures into the Cocos assets tree
client/cocos/scene-wiring.json # Expected Cocos scene wiring contract
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

For Cocos, runtime art should be assigned through `Sprite` + `SpriteFrame` references. Dynamic text may use `Label`. Do not use `Graphics` or custom drawing APIs for art.

## Local Run

```bash
npm run generate:textures
npm run sync:cocos-textures
npm run typecheck:cocos
npm run verify
npm test
npm start
```

The local Web prototype is served by the backend at:

```text
http://localhost:4173
```
