# Align Upgrade Tab To Reference

## Background

The upgrade tab should be solved first against the optimized UI reference. The current runtime view uses some extracted design textures, but live Cocos text and controls still overlap the reference board and make the result drift from the screenshot.

## Goal

Make the Cocos upgrade tab visually follow the upgrade UI reference while keeping upgrade interactions responsive.

## Scope

- Crop upgrade-tab reference elements into reusable source textures.
- Sync those textures into the Cocos texture/resource trees.
- Adjust the runtime Cocos upgrade tab to use the reference visual layer and separate transparent interaction hit areas.
- Verify Cocos source, Web Mobile build, and browser click behavior.

## Acceptance Criteria

- Upgrade tab uses UI elements cropped from the reference screenshot.
- Upgrade tab image, text, and font presentation visually follow the reference without duplicated Cocos overlay text.
- Part upgrade and restaurant upgrade hit areas respond to clicks.
- Bottom tab navigation remains clickable and visible.

## Related Files

- `docs/design/optimized-tabs-2026-06-24/upgrade-tab-720x1280.png`
- `scripts/extract-design-ui-textures.mjs`
- `scripts/sync-cocos-textures.mjs`
- `client/cocos/assets/scripts/HachimiRestaurantGame.ts`
- `client/cocos/assets/scripts/components/TextureCatalog.ts`

## Risks And Notes

- Generated Cocos build output is not source and should not be committed.
- The reference image contains baked text, so this pass prioritizes visual fidelity for the upgrade tab and keeps gameplay behavior through transparent hit areas.

## Completed Work

- Added repeatable crops for the upgrade reference full image, five part icons, green upgrade button, and locked restaurant-upgrade button.
- Synced the new textures into the shared client texture set and Cocos texture/resource directories.
- Added `designUpgradeFull` to the Cocos texture catalog and runtime resource loading.
- Rendered the upgrade tab as the full 720 x 1280 reference image so baked image, text, and font treatment match the UI reference.
- Hid duplicate runtime title/HUD/board/list/navigation overlays while the reference upgrade tab is active.
- Kept Cocos gameplay responsive through runtime design-coordinate hit areas for part upgrade, restaurant upgrade, and tab navigation.
- Added controller checks for the reference-mode visibility contract and updated texture dimension policy for the new assets.
- Added browser preview and click evidence screenshots under `docs/design/optimized-tabs-2026-06-24/runtime-preview/`.

## Verification

- `npm run typecheck:cocos`
- `npm run verify:cocos-components`
- `npm run verify:cocos-controller`
- `npm run verify:textures`
- `npm run verify`
- Cocos Creator Web Mobile build completed with success exit code `36` and `build Task (web-mobile) Finished`.
- Browser smoke at `http://127.0.0.1:4175/?v=upgrade-reference-click-test` with a 720 x 1280 viewport:
  - Upgrade reference screen rendered without page errors.
  - Part upgrade hit area returned `金币不足，还差 80` feedback.
  - Restaurant upgrade hit area returned `五个部件满星后才能升级餐厅` feedback.
  - Bottom restaurant tab navigated back to the restaurant screen.

## Key Commits

- `9b02321` Align upgrade tab to reference art

## Follow-ups

- Later replace the baked full-image pass with separately composited Cocos sprites if economy values or localized text must update visually inside the upgrade board.
