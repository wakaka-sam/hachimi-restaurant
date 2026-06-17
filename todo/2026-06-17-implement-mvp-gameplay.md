# Implement MVP Gameplay

## Background

The product and API documents now define the MVP gameplay for 小动物餐厅. The goal is to implement the documented loop with texture-based art assets, avoiding runtime UI drawing for art.

## Goal

Implement the gameplay systems described in `docs/product.md` and `docs/api.md`.

## Scope

- Shared gameplay formulas and constants.
- Node.js backend API for profile, stamina, business sessions, upgrades, restaurant upgrades, and task rewards.
- Texture-based Web playable prototype for the MVP loop.
- Generated PNG textures for all game art and UI surfaces.
- Tests for the economy and backend API.

## Acceptance Criteria

- Backend implements the documented MVP API endpoints.
- Shared rules implement the `incomePower`, `expectedRevenue`, `upgradeCost`, stamina, and performance formulas.
- Client can play a 90-second business session, finish it, upgrade parts, upgrade restaurant, and claim task rewards.
- Runtime art surfaces use PNG texture assets rather than canvas/SVG drawing.
- Verification commands run successfully.

## Related Files

- `docs/product.md`
- `docs/api.md`
- `shared/game-rules.mjs`
- `server/src/`
- `client/web/`
- `client/assets/textures/`

## Risks And Notes

- Cocos Creator is not installed in this environment. This implementation starts with a texture-based Web prototype and shared gameplay code, while keeping `client/` structured for a later Cocos Creator scene migration.
- This is still an active implementation task until the Cocos client is complete and the full objective has been verified end to end.

## Current Progress

- Implemented shared gameplay rules in `shared/game-rules.mjs`.
- Implemented the Node.js backend MVP API in `server/src/`.
- Implemented a texture-based Web playable prototype in `client/web/`.
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
  - Static Web prototype and PNG texture serving.
  - Runtime client policy forbidding canvas/SVG art drawing.
- Added `npm run verify:textures` to enforce the texture asset policy.
- Added `npm run sync:cocos-textures` and `npm run verify:cocos`.
- Added `npm run verify:gameplay` to check required endpoints, screens, Cocos components, and texture assets.
- Added `npm run typecheck:cocos` using TypeScript and `@cocos/creator-types`.
- Added `client/cocos/scene-wiring.json` to define the expected Cocos scene nodes, components, texture assignments, labels, and buttons.
- Implemented first-run guide highlights in the Web prototype for:
  - Start business.
  - Seat customer.
  - Serve food.
  - Collect payment.
  - Upgrade a part.
  - Claim guide task reward.
- Added matching guide label/message support to the Cocos controller and scene wiring contract.
- Added three restaurant background stage textures so overall restaurant upgrades visibly improve the dining room:
  - Level 1 uses the starter restaurant.
  - Level 2 uses the garden restaurant.
  - Level 3+ uses the deluxe restaurant.
- Wired restaurant stage textures into the Web prototype, Cocos texture catalog, and Cocos scene wiring contract.

## Remaining Work

- Open the Cocos project in Cocos Creator once the editor is available.
- Wire the scene nodes to `HachimiRestaurantGame`, `TextureCatalog`, `TableSlotView`, `PartUpgradeView`, and `TaskItemView`.
- Assign synced PNG files as `SpriteFrame` texture references in the editor.
- Verify the Cocos build targets for Web first, then WeChat Mini Game and Douyin Mini Game.

## Latest Verification

- `npm run verify` passes.
- Current automated coverage: 14 Node tests plus static texture and gameplay coverage checks.
- Static gameplay coverage verifies:
  - Backend MVP endpoints.
  - Shared economy, stamina, and performance formulas.
  - Web core screens and service chain.
  - Web first-run guide highlights.
  - Web and Cocos restaurant visual stage wiring.
  - Cocos controller, simulation, API client, texture catalog, and view components.
  - Cocos guide label wiring.
  - Required PNG texture presence in both Web and Cocos asset trees.
- Cocos TypeScript source compiles under `client/cocos/tsconfig.json`.
