# Align Cocos UI To Optimized Tab References

## Background

The project now has imagegen reference screenshots under `docs/design/optimized-tabs-2026-06-24/` for the restaurant, upgrade, and tasks tabs. The current Cocos Web UI is functional but still uses a simpler runtime-built layout.

## Goal

Update the production Cocos runtime UI so the Web Mobile build visually follows the three optimized portrait references while preserving the playable game loop.

## Scope

- Rework the runtime Cocos UI layout in `client/cocos/` for the restaurant, upgrade, and tasks tabs.
- Extract reusable UI elements from the three optimized design screenshots into the canonical texture set.
- Sync extracted design textures into the Cocos `assets/textures` and `assets/resources/textures` directories.
- Keep the UI portrait-first at 720 x 1280 design resolution.
- Preserve Cocos-only Web output; do not add a separate DOM production client.
- Keep all visible controls interactive through the existing Cocos gameplay controller.
- Build the Cocos Web Mobile target and verify browser interaction.

## Acceptance Criteria

- The restaurant tab presents the reference-style sign/HUD, restaurant scene, large start action, part-star board, and bottom navigation.
- The upgrade tab presents the reference-style header, large parchment list, part icons/stars/cost/effect/action, disabled restaurant upgrade action, and bottom navigation.
- The tasks tab presents the reference-style task title board, guide/daily/growth tabs, reward rows, claim/go buttons, and bottom navigation.
- Extracted design UI textures exist in the project texture set with fixed dimension contracts.
- The Web build compiles from `client/cocos/` and remains portrait/vertical.
- Static Web preview loads without console errors and supports tab switching and core actions.

## Related Files

- `client/cocos/assets/scripts/HachimiRestaurantGame.ts`
- `client/cocos/assets/scripts/components/TexturedButtonView.ts`
- `client/cocos/assets/scripts/components/TexturedPanelView.ts`
- `client/cocos/assets/scripts/components/TextureCatalog.ts`
- `scripts/extract-design-ui-textures.mjs`
- `scripts/verify-texture-policy.mjs`
- `scripts/verify-cocos-controller.mjs`
- `docs/design/optimized-tabs-2026-06-24/`

## Risks And Notes

- The reference screenshots are concept art, so generated Chinese text and baked mock values are treated as layout and art-direction guidance. Runtime Cocos labels remain authoritative.
- The current project uses a runtime bootstrap instead of an editor-authored full scene; this task keeps that path working and verifiable.

## Completed Work

- Extracted 10 reusable UI textures from the optimized restaurant, upgrade, and tasks screenshot references:
  - title sign, restaurant scene, start button
  - restaurant/upgrade/tasks bottom navigation states
  - upgrade heading and board
  - task heading and board
- Added `scripts/extract-design-ui-textures.mjs` and `npm run extract:design-ui` so the design asset extraction is repeatable.
- Synced extracted textures into `client/cocos/assets/textures/` and `client/cocos/assets/resources/textures/` with Cocos `.meta` files.
- Extended `TextureCatalog` and runtime resource loading for the extracted design assets.
- Updated the Cocos runtime UI to use the extracted title, restaurant scene, start button, upgrade/task boards, and active-tab navigation assets.
- Kept runtime hit areas and existing gameplay actions wired so tab switching, start business, upgrades, and task claims remain functional.
- Added runtime preview screenshots under `docs/design/optimized-tabs-2026-06-24/runtime-preview/`.

## Verification

- `npm run verify`
- Cocos Creator Web Mobile build:

```bash
/Applications/Cocos/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator --project /Volumes/bigger/testspace/hachimi-restaurant/client/cocos --build "platform=web-mobile;debug=false;startScene=43983c2f-5ff3-43d0-8b25-45a498b98abd"
```

- Build completed with Cocos success exit code `36` and `build Task (web-mobile) Finished`.
- Browser smoke test at `http://127.0.0.1:4180/?v=design-assets-final-2`:
  - 720 x 1280 canvas present.
  - Restaurant, upgrade, and tasks tabs captured at 720 x 1280.
  - Start business click kept the game in a valid 720 x 1280 Cocos canvas state.
  - Static preview logs one expected `/api/player/profile` 404 before switching to local preview fallback.
- Backend-hosted smoke test at `http://127.0.0.1:4175/?v=backend-hosted-design-assets`:
  - 720 x 1280 canvas present.
  - Tab switching and start business click worked.
  - No page errors; the only console 404 was `favicon.ico`.

## Key Commits

- `042b84c9f8840f74e3d505b4252e7601144befe2` Align Cocos UI with optimized tab references

## Follow-ups

- Replace the runtime bootstrap with an editor-authored Cocos scene when the project moves from implementation bootstrap to production scene polish.
- Split final dynamic text out of baked imagegen assets if precise localization or changing economy values need to remain visible in every decorative board.
