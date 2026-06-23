# Make Cocos Web Playable

## Background

The Cocos Web Mobile build loaded successfully, but `assets/scenes/main.scene` only contained an empty Canvas and Camera. The browser showed a black canvas with no playable UI.

## Goal

Make the Cocos Web build launch into a playable Hachimi Restaurant flow in the browser.

## Scope

- Keep gameplay in `client/cocos/`.
- Reuse the existing Cocos `HachimiRestaurantGame` controller and component logic.
- Add runtime scene bootstrap only for the current minimal scene state.
- Serve browser verification through the Node backend with `WEB_STATIC_ROOT` pointing at the Cocos Web build so same-origin `/api` calls work.

## Completed Work

- Attached `HachimiRestaurantGame` to `client/cocos/assets/scenes/main.scene`.
- Added an interim Cocos runtime UI bootstrap in `HachimiRestaurantGame` for scenes without serialized editor bindings.
- Added Cocos `input`-based runtime hit areas for the bootstrap UI so canvas gameplay can be clicked in Web builds.
- Added responsive root fitting for the 720 x 1280 runtime UI.
- Kept star texture contract calls while tolerating missing runtime bootstrap sprite bindings.
- Updated controller verification stubs for the runtime bootstrap imports.
- Updated Cocos architecture/client documentation to describe the playable bootstrap and remaining editor-authored scene work.

## Verification

- `npm run verify` passed.
- Cocos Web Mobile build passed with Cocos Creator 3.8.7.
- Browser verified through `WEB_STATIC_ROOT=client/cocos/build/web-mobile PORT=4173 npm start` at `http://127.0.0.1:4173/`.
- Browser flow verified: load Cocos scene, start business, switch to 2x, seat customers, serve food, collect payment, finish settlement, upgrade a part, and claim task rewards.
- Mobile-size browser viewport tooling timed out during screenshot capture, but the final browser view rendered the portrait runtime UI without console errors.

## Key Commits

- de275d6c2c45ae5d31011b4beef362b19371e2b9 Make Cocos Web build playable.

## Follow-ups

- Replace the interim runtime bootstrap with a full editor-authored, texture-backed Cocos scene wired to `scene-wiring.json`.
