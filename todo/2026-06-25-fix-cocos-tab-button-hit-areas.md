# Fix Cocos Tab Button Hit Areas

## Background

The local Cocos Web build at `http://127.0.0.1:4175/?v=local-deploy` renders the optimized tab UI, but task and upgrade buttons do not respond. The restaurant and upgrade tabs also let lower content overlap the bottom navigation.

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
- `client/cocos/assets/scripts/components/PartUpgradeView.ts`

## Risks And Notes

- Generated Cocos build output is not source and should not be committed.
- Cocos Creator build may return success exit code `36` in this environment.
