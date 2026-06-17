# Architecture

## Current Implementation

The repository currently contains:

- A Node.js gameplay backend.
- A Cocos Creator 3.x source skeleton under `client/cocos/`.
- A texture-based DOM Web debug harness under `client/web/` for temporary backend/gameplay verification only.

Cocos Creator is not installed in the current execution environment, so the Cocos project has not been editor-opened or build-verified locally. The Cocos scripts are source-ready components and are intended to be wired into a portrait scene in the Cocos editor.

The production client architecture is one Cocos codebase:

- Web release builds are Cocos Web build artifacts.
- WeChat Mini Game builds are Cocos WeChat platform build artifacts.
- Douyin Mini Game builds are Cocos Douyin platform build artifacts.
- `client/web/` is not a separate product client and should not receive product-only gameplay that is absent from Cocos.

## Module Layout

```text
shared/game-rules.mjs       # Economy, stamina, task, session, and tuning formulas
server/src/                 # Node.js HTTP backend and static file host
server/test/                # Node test suite for rules and API flow
client/cocos/               # Production Cocos Creator project skeleton and TypeScript components
client/web/                 # Temporary texture-based debug harness, not the production Web client
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

The Cocos client keeps API access behind `ApiClient`. Empty `apiBaseUrl` means same-origin on Cocos Web builds and `https://animalapi.wakaka007.cn` on non-browser Cocos runtimes; explicit inspector values override this for local preview or staging.

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

The temporary local Web debug harness is served by the backend at:

```text
http://localhost:4173
```

For production Web deployment, point `WEB_STATIC_ROOT` at the Cocos Web build output instead of `client/web/`.
