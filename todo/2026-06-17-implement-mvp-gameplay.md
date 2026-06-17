# Implement MVP Gameplay

## Background

The product and API documents now define the MVP gameplay for 小动物餐厅. The goal is to implement the documented loop with texture-based art assets, avoiding runtime UI drawing for art.

## Goal

Implement the gameplay systems described in `docs/product.md` and `docs/api.md`.

## Scope

- Shared gameplay formulas and constants.
- Node.js backend API for profile, stamina, business sessions, upgrades, restaurant upgrades, and task rewards.
- Cocos client implementation for the MVP loop, with `client/web/` retained only as a temporary backend/debug harness.
- Generated PNG textures for all game art and UI surfaces.
- Tests for the economy and backend API.

## Acceptance Criteria

- Backend implements the documented MVP API endpoints.
- Shared rules implement the `incomePower`, `expectedRevenue`, `upgradeCost`, stamina, and performance formulas.
- Cocos client can play a 90-second business session, finish it, upgrade parts, upgrade restaurant, and claim task rewards.
- Web, WeChat Mini Game, and Douyin Mini Game must share the same Cocos client codebase; Web is a Cocos build output.
- Runtime art surfaces use PNG texture assets rather than canvas/SVG drawing.
- Verification commands run successfully.

## Related Files

- `docs/product.md`
- `docs/api.md`
- `shared/game-rules.mjs`
- `server/src/`
- `client/cocos/`
- `client/web/` debug harness
- `client/assets/textures/`

## Risks And Notes

- Cocos Creator is not installed in this environment. This implementation keeps production client work under the Cocos source skeleton and uses `client/web/` only as a temporary texture-based debug harness for shared gameplay and backend verification.
- This is still an active implementation task until the Cocos client is complete and the full objective has been verified end to end.

## Current Progress

- Implemented shared gameplay rules in `shared/game-rules.mjs`.
- Implemented the Node.js backend MVP API in `server/src/`.
- Implemented a texture-based Web debug harness in `client/web/` for backend/gameplay verification while Cocos Creator is unavailable.
- Generated PNG texture assets under `client/assets/textures/`.
- Added a Cocos Creator 3.x source skeleton under `client/cocos/`.
- Added Cocos TypeScript components for API access, local business simulation, table slots, part upgrades, task rows, texture catalog wiring, and the main scene controller.
- Synced the PNG textures into `client/cocos/assets/textures/`.
- Added automated tests for:
  - 8% `incomePower` economy growth.
  - Stamina recovery.
  - Session settlement.
  - Invalid settlement rejection.
  - Full 25 part-upgrade cycle.
  - Restaurant upgrade without income regression.
  - Guide task claims.
  - Double settlement prevention.
  - Active session resume without double stamina charge.
  - Insufficient stamina rejection.
  - Expired session minimum settlement.
  - Static Web debug harness and PNG texture serving.
  - Runtime client policy forbidding canvas/SVG art drawing.
- Added `npm run verify:textures` to enforce the texture asset policy.
- Added `npm run sync:cocos-textures` and `npm run verify:cocos`.
- Added `npm run verify:gameplay` to check required endpoints, screens, Cocos components, and texture assets.
- Added `npm run typecheck:cocos` using TypeScript and `@cocos/creator-types`.
- Added `client/cocos/scene-wiring.json` to define the expected Cocos scene nodes, components, texture assignments, labels, and buttons.
- Implemented first-run guide highlights in the Web debug harness for:
  - Start business.
  - Seat customer.
  - Serve food.
  - Collect payment.
  - Upgrade a part.
  - Claim guide task reward.
- Added matching guide label/message support to the Cocos controller and scene wiring contract.
- Recorded that the production Web client must be a Cocos Web build output, sharing the same codebase as WeChat Mini Game and Douyin Mini Game.
- Added `WEB_STATIC_ROOT` support so production deployment can serve Cocos Web build output instead of the debug harness.
- Updated handfeel tuning so an overall restaurant upgrade preserves long-term gameplay feel after part stars reset.
- Added three restaurant background stage textures so overall restaurant upgrades visibly improve the dining room:
  - Level 1 uses the starter restaurant.
  - Level 2 uses the garden restaurant.
  - Level 3+ uses the deluxe restaurant.
- Wired restaurant stage textures into the Web debug harness, Cocos texture catalog, and Cocos scene wiring contract.
- Added live营业反馈 for service quality:
  - Cocos simulation now tracks average satisfaction and short-lived operation feedback.
  - Cocos controller exposes satisfaction and feedback labels for the营业 scene.
  - Web debug harness mirrors the same satisfaction and instant feedback behavior for local verification.
- Implemented the documented常驻 2 倍速入口 during营业:
  - Cocos simulation can switch between 1x and 2x while a session is running.
  - Cocos controller routes the speed button to the active simulation when on the营业 screen.
  - Web debug harness mirrors in-session speed switching for local verification.
- Improved中断恢复:
  - Backend active session responses include elapsed/remaining game seconds and recovery window.
  - 2x sessions use a shorter real-time active window while preserving the 2-minute recovery window.
  - Cocos and Web debug harness resume active sessions from remaining time instead of restarting at 90 seconds.
- Added early-settlement protection:
  - Backend rejects valid-looking settlements before the minimum real time for a 90-second 2x session has elapsed.
  - Cocos and Web debug harness disable manual settlement while the local营业 countdown is still running.
  - API docs now include `SESSION_NOT_READY`.
- Tightened MVP task screen coverage:
  - Cocos scene wiring now requires enough `TaskItemView` rows for all 13 MVP guide/daily/growth tasks.
  - API tests verify every task definition is exposed in the player profile.

## Remaining Work

- Open the Cocos project in Cocos Creator once the editor is available.
- Wire the scene nodes to `HachimiRestaurantGame`, `TextureCatalog`, `TableSlotView`, `PartUpgradeView`, and `TaskItemView`.
- Assign synced PNG files as `SpriteFrame` texture references in the editor.
- Verify the Cocos build targets for Web first, then WeChat Mini Game and Douyin Mini Game.
- Replace the backend-served debug harness with Cocos Web build output for production Web deployment.

## Latest Verification

- `npm run verify` passes.
- Current automated coverage: 19 Node tests plus static texture and gameplay coverage checks.
- Static gameplay coverage verifies:
  - Backend MVP endpoints.
  - Shared economy, stamina, and performance formulas.
  - Shared restaurant-upgrade handfeel retention.
  - Backend active session remaining-time recovery.
  - Backend early-settlement rejection.
  - Backend exposure of all guide, daily, and growth tasks.
  - Web core screens and service chain.
  - Web and Cocos manual early-settlement blocking.
  - Web and Cocos resumed session remaining-time handling.
  - Web and Cocos in-session 1x/2x speed switching.
  - Web first-run guide highlights.
  - Web and Cocos营业满意度/即时反馈 wiring.
  - Web and Cocos restaurant visual stage wiring.
  - Cocos controller, simulation, API client, texture catalog, and view components.
  - Cocos task row count covers all MVP task definitions.
  - Cocos guide label wiring.
  - Required PNG texture presence in both Web and Cocos asset trees.
- Cocos TypeScript source compiles under `client/cocos/tsconfig.json`.
