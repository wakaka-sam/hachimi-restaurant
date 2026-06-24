# Polish Runtime Cocos Tabs

## Background

The image generation pass produced optimized visual references for the restaurant, upgrade, and tasks tabs. The playable Cocos Web build still uses a runtime-built UI that needs stronger structure and less text-floating-on-background presentation.

## Goal

Apply a first runtime Cocos UI polish pass that moves the existing tabs toward the generated visual references while preserving current gameplay behavior.

## Scope

- Add texture-backed panel surfaces for the top HUD and tab content.
- Improve the restaurant, upgrade, and tasks tab layout using existing Cocos runtime assets.
- Keep the current runtime bootstrap and API/gameplay logic unchanged.
- Extend verification only where needed for the runtime UI structure.

## Acceptance Criteria

- Restaurant, upgrade, and tasks tabs render with visible panel/card backing instead of mostly floating text.
- Top HUD includes icon-backed resource/status blocks.
- Navigation, start business, upgrades, and task claims remain wired.
- Relevant Cocos verification and TypeScript checks pass.

## Related Files

- `client/cocos/assets/scripts/HachimiRestaurantGame.ts`
- `client/cocos/assets/scripts/components/TexturedButtonView.ts`
- `client/cocos/assets/scripts/components/TexturedPanelView.ts`
- `scripts/verify-cocos-controller.mjs`
- `scripts/verify-cocos-components.mjs`

## Risks And Notes

- This is still a runtime-created UI, not a final editor-authored scene.
- Generated images are references only; Chinese text remains Cocos-rendered.

## Completed Work

- Added texture-backed title, HUD, navigation, section, row, upgrade, and task surfaces in the runtime Cocos bootstrap.
- Added HUD icon sprites for coins, stamina, restaurant level, and expected revenue.
- Added decorative animal sprites to the restaurant tab preview area.
- Added active and muted button visual states so the current bottom tab is visibly highlighted without disabling all button visuals.
- Extended `TexturedPanelView` so panels can reuse existing button PNG textures when higher contrast is needed.
- Extended controller verification to instantiate the runtime scene and assert that panel-backed UI, icons, and active tab states are created.

## Verification

- `npm run verify` passed.
- Cocos Creator Web Mobile build completed with `build Task (web-mobile) Finished`:
  `/Applications/Cocos/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator --project /Volumes/bigger/testspace/hachimi-restaurant/client/cocos --build "platform=web-mobile;debug=false;startScene=43983c2f-5ff3-43d0-8b25-45a498b98abd"`
- Browser preview verified at `http://127.0.0.1:4180/?v=runtime-ui-polish` with a 720 x 1280 mobile viewport.
- Browser console error count was 0 after loading, after tab navigation, and after a light click smoke test.

## Key Commits

- `9b37dd227d82a96a333f92a6b784c8f59d8ede40` Polish runtime Cocos tab UI

## Follow-ups

- Replace the runtime bootstrap with an editor-authored Cocos scene once the final UI direction is ready.
- Produce dedicated PNG text/surface variants if final art needs richer typography while keeping the no runtime tint/drawing policy.
