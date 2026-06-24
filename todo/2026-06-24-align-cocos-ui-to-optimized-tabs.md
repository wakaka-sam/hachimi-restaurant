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
