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

`client/cocos/assets/scripts/core/GameRules.ts` mirrors the subset of shared constants and labels needed by the Cocos runtime. `npm run verify:rules` compares that mirror against `shared/game-rules.mjs`; update both files together when gameplay constants change.

`npm run verify:cocos-project` validates the Cocos project metadata before the editor is available: Cocos Creator 3.8.x, portrait 720 x 1280 design resolution, scene-wiring alignment, the per-screen `sceneBlueprint`, and generated-directory ignore rules.

`npm run verify:cocos-api` executes the Cocos API client against a mocked `cc.sys` runtime. It verifies same-origin Web requests, `https://animalapi.wakaka007.cn` fallback for non-browser targets, player id persistence, `fetch`, `XMLHttpRequest`, and `SESSION_NOT_READY` recovery fields.

`npm run verify:cocos-simulation` transpiles the pure Cocos gameplay rule/simulation files and executes the business loop outside the editor. It verifies the click service chain, 2x game-time scaling, waiting queue cap, 18-customer session cap, and local snapshot restore.

`npm run verify:cocos-components` executes the texture-backed Cocos UI components outside the editor. It verifies table-state textures and labels, filled/empty star frames, upgrade-card cost and max states, task row claim states, textured button/panel frame switching, and mobile safe-area layout setup.

`npm run verify:cocos-controller` executes the Cocos main scene controller outside the editor with a mocked backend API. It verifies profile rendering, screen navigation, business start, 2x speed switching, settlement success, `SESSION_NOT_READY` recovery, part/restaurant upgrades, task claims, and completed-session snapshot submission on startup.

The Cocos first-run guide routes each guide step to a texture-backed focus surface. `HachimiRestaurantGame` drives the ordered `guideFocusNodes` and `guideFocusPanels` arrays, and `client/cocos/scene-wiring.json` records the expected focus keys so Web, WeChat Mini Game, and Douyin Mini Game builds keep the same tutorial flow.

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

For Cocos, runtime art should be assigned through `Sprite` + `SpriteFrame` references. Dynamic text may use `Label`. Do not use `Graphics`, custom drawing APIs, `UIOpacity`, or runtime color tinting for art states; create separate PNG textures for disabled, locked, empty, active, or highlighted states.

Guide highlights count as runtime art states. They should be implemented through `TexturedPanelView` surfaces and assigned `SpriteFrame` textures, not by runtime drawing or visual effects.

`npm run verify:textures` also enforces the fixed dimension contract for every runtime PNG. This prevents gameplay-critical art from being replaced by undersized placeholders that would pass a file-existence check but break Cocos/Web layout.

## Local Run

```bash
npm run generate:textures
npm run sync:cocos-textures
npm run verify:cocos-project
npm run verify:cocos-api
npm run verify:cocos-simulation
npm run verify:cocos-components
npm run verify:cocos-controller
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
