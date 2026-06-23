# Architecture

## Current Implementation

The repository currently contains:

- A Node.js gameplay backend.
- A Cocos Creator 3.8.x project under `client/cocos/`.
- A texture-based DOM Web debug harness under `client/web/` for temporary backend/gameplay verification only.

Cocos Creator 3.8.7 is installed at `/Applications/Cocos/Creator/3.8.7/CocosCreator.app` in the current local environment. The Cocos project has been opened by the editor and Web Mobile build-verified. The current initial scene attaches `HachimiRestaurantGame` to the Canvas; when serialized editor bindings are absent, the controller creates an interim texture-backed runtime Cocos UI so the Web build is playable. A full editor-authored scene should still replace this bootstrap and follow `client/cocos/scene-wiring.json`.

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
client/cocos/               # Production Cocos Creator project and TypeScript components
client/web/                 # Temporary texture-based debug harness, not the production Web client
client/assets/textures/     # PNG textures used by runtime art/UI surfaces
client/cocos/assets/resources/textures/ # Cocos resources-bundle copy for runtime bootstrap texture loading
scripts/generate-textures.mjs # Offline PNG texture generator
scripts/sync-cocos-textures.mjs # Copies PNG textures into the Cocos assets tree
client/cocos/scene-wiring.json # Expected Cocos scene wiring contract
```

`client/cocos/assets/scripts/core/GameRules.ts` mirrors the subset of shared constants and labels needed by the Cocos runtime. `npm run verify:rules` compares that mirror against `shared/game-rules.mjs`; update both files together when gameplay constants change.

`npm run verify:cocos-project` validates the Cocos project metadata: Cocos Creator 3.8.x, portrait 720 x 1280 design resolution, scene-wiring alignment, the per-screen `sceneBlueprint`, and generated-directory ignore rules.

`npm run verify:cocos-api` executes the Cocos API client against a mocked `cc.sys` runtime. It verifies same-origin Web requests, static-server local preview fallback, `https://animalapi.wakaka007.cn` fallback for non-browser targets, player id persistence, `fetch`, `XMLHttpRequest`, and `SESSION_NOT_READY` recovery fields.

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

The Cocos client keeps API access behind `ApiClient`. Empty `apiBaseUrl` means same-origin on Cocos Web builds and `https://animalapi.wakaka007.cn` on non-browser Cocos runtimes; explicit inspector values override this for local preview or staging. If a same-origin Cocos Web static preview returns non-JSON content for `/api/*`, `ApiClient` switches to a browser-storage local preview state. This fallback is only for static visual/input smoke tests and does not mask real backend JSON errors.

## Runtime Art Rule

Runtime art surfaces should use PNG texture assets from `client/assets/textures/`.

Do not introduce runtime canvas/SVG drawing for game art or UI surfaces unless a future task explicitly changes the asset policy.

For Cocos, runtime art should be assigned through `Sprite` + `SpriteFrame` references. Dynamic text may use `Label`. The interim runtime bootstrap loads packaged PNGs from the Cocos `resources` bundle and converts them to `SpriteFrame` objects before rendering. Do not use `Graphics`, custom drawing APIs, `UIOpacity`, runtime color tinting, or Button color/sprite/scale transitions for art states; create separate PNG textures for disabled, locked, empty, active, or highlighted states. Interactive buttons must force `Button.Transition.NONE`; texture-backed buttons switch `button.png` / `button-disabled.png` directly.

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

Build the current Cocos Web Mobile target with:

```bash
/Applications/Cocos/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator --project /Volumes/bigger/testspace/hachimi-restaurant/client/cocos --build "platform=web-mobile;debug=false;startScene=43983c2f-5ff3-43d0-8b25-45a498b98abd"
```

For local Cocos Web verification, serve the build through the backend so same-origin `/api` routes are available:

```bash
WEB_STATIC_ROOT=client/cocos/build/web-mobile PORT=4173 npm start
```

For a static Cocos Web smoke test without the Node backend:

```bash
python -m http.server -b 127.0.0.1 -d client/cocos/build/web-mobile 4180
```

The Web client will use local preview state when `/api/*` returns static non-JSON content.

For production Web deployment, point `WEB_STATIC_ROOT` at the Cocos Web build output instead of `client/web/`.
