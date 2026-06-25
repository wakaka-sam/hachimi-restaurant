# Fix Cocos Tab Button Hit Areas

## Background

The local Cocos Web build at `http://127.0.0.1:4175/?v=local-deploy` rendered the optimized tab UI, but task and upgrade buttons did not respond consistently. The restaurant and upgrade tabs also let lower content sit too close to the bottom navigation.

## Goal

Restore button interaction on the tasks and upgrade tabs and keep tab content clear of the bottom navigation.

## Scope

- Inspect the runtime-built Cocos UI under `client/cocos/`.
- Fix task and upgrade button hit areas or event routing.
- Adjust restaurant and upgrade tab layout so content does not cover the bottom tabs.
- Rebuild and verify the Cocos Web output locally.

## Acceptance Criteria

- Task claim/navigation buttons respond when enabled.
- Part upgrade and restaurant upgrade buttons respond when enabled.
- Restaurant and upgrade tab content does not visually cover the bottom navigation.
- Local Cocos Web build loads without console errors after the fix.

## Related Files

- `client/cocos/assets/scripts/HachimiRestaurantGame.ts`
- `client/cocos/assets/scripts/components/TaskItemView.ts`
- `scripts/verify-cocos-components.mjs`
- `scripts/verify-cocos-controller.mjs`

## Risks And Notes

- Generated Cocos build output is not source and was not committed.
- Cocos Creator build returns success exit code `36` in this environment.

## Completed Work

- Moved runtime task and upgrade design boards behind interactive rows so they no longer cover row buttons.
- Pulled main, upgrade, and task content upward to leave space above the bottom navigation.
- Changed task buttons so unfinished tasks are actionable as `前往`, while completed tasks still claim rewards and claimed tasks stay disabled.
- Kept unavailable upgrade buttons touchable in runtime so they show Chinese feedback such as insufficient coins or restaurant-not-ready instead of appearing dead.
- Added controller and component checks for runtime board ordering, bottom spacing, task action buttons, and task navigation behavior.

## Verification

- `npm run typecheck:cocos`
- `npm run verify:cocos-components`
- `npm run verify:cocos-controller`
- `npm run verify`
- Cocos Creator Web Mobile build completed with success exit code `36` and `build Task (web-mobile) Finished`.
- Browser smoke on `http://127.0.0.1:4175/?v=interaction-fix-2`:
  - Cocos canvas rendered without console errors.
  - Upgrade tab button click returned `金币不足，还差 80` feedback while keeping the bottom tab visible.
  - Task `前往` click navigated to the upgrade tab and showed `前往完成：首次整体升级餐厅`.

## Key Commits

- `c638d1c` Fix Cocos tab button hit areas

## Follow-ups

- The runtime UI still overlays live rows on top of the extracted board artwork, which is playable but visually dense. A later art pass should separate decorative board texture from list-row mock content.
