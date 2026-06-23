# Fix Static Cocos Web Playability

## Background

The Cocos Web build served by a plain static server on port 4180 showed overlapping text, could not reliably progress through gameplay actions, displayed only text placeholders, and showed `Unexpected token '<'` because `/api/*` requests returned static HTML instead of backend JSON.

## Goal

Make the static Cocos Web build playable and visibly texture-backed without a colocated Node API server.

## Scope

- Keep gameplay changes inside `client/cocos/`.
- Preserve the Node backend API path for production and same-origin backend hosting.
- Add a local fallback only when the API endpoint is unavailable or returns non-JSON static content.
- Ensure runtime bootstrap screens do not overlap when profile loading fails.
- Package runtime PNG textures into the Cocos resources bundle for the interim bootstrap.

## Acceptance Criteria

- Static Web build on `http://127.0.0.1:4180/` loads without the JSON parse error.
- Only the current screen is visible.
- Runtime UI uses PNG textures for background, buttons, tables, customers, cashier, and stars.
- Browser clicks can start business, interact with tables, finish settlement, upgrade, and claim rewards.
- `npm run verify` passes.
- Cocos Web Mobile build succeeds.

## Related Files

- `client/cocos/assets/scripts/HachimiRestaurantGame.ts`
- `client/cocos/assets/scripts/services/ApiClient.ts`
- `client/cocos/assets/scripts/services/ApiTransport.ts`
- `client/cocos/assets/scripts/core/GameRules.ts`
- `client/cocos/assets/resources/textures/`
- `scripts/sync-cocos-textures.mjs`
- `scripts/verify-cocos-api-client.mjs`
- `scripts/verify-cocos-controller.mjs`
- `scripts/verify-texture-policy.mjs`

## Risks And Notes

- The fallback does not mask real backend JSON errors such as insufficient coins or invalid session state.
- The fallback state is local to browser storage and intended for preview/static builds only.
- The runtime bootstrap is still interim; a full editor-authored scene should replace it later.

## Completed Work

- Added a `NonJsonResponseError` transport path so static HTML API responses are classified cleanly.
- Added a browser-storage local preview API fallback for static Cocos Web builds.
- Initialized runtime screen visibility immediately after bootstrap creation to prevent overlapping screens.
- Added runtime loading of packaged PNG textures from `assets/resources/textures`.
- Bound textures to runtime background, buttons, tables, customers, cashier, and star displays.
- Added Cocos resources texture copies and updated texture sync/verification scripts.
- Updated Cocos API/controller verification stubs for static fallback and runtime texture loading.
- Updated Cocos README and architecture docs with the static preview path and resources bundle behavior.

## Verification

- `npm run verify` passed.
- Cocos Web Mobile build passed with Cocos Creator 3.8.7.
- Browser verified at `http://127.0.0.1:4180/?v=texture-size-fix` with no console errors.
- Browser verified texture-backed rendering: restaurant background, textured buttons, table states, customer sprites, cashier sprite, and star icons.
- Browser verified gameplay actions: start business, seat customers, serve food, collect payment, finish settlement, upgrade a part, and claim task rewards.

## Key Commits

- 89115a8df8b53220b1cc7f023c762a7f1c06feeb Fix static Cocos Web playability.

## Follow-ups

- Replace the interim runtime bootstrap with a full editor-authored Cocos scene wired to `scene-wiring.json`.
