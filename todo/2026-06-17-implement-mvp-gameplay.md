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
