# Generate Optimized Tab Screenshots

## Background

The current Cocos Web build is playable but still uses a runtime-built UI. The project needs visual references for a more polished mobile-first tab layout.

## Goal

Generate optimized screenshot concepts for each bottom navigation tab in the current game: restaurant, upgrade, and tasks.

## Scope

- Generate one polished portrait mobile screenshot concept for each tab.
- Save generated references into project documentation.
- Keep the output as visual reference assets only; do not change Cocos runtime code in this task.

## Acceptance Criteria

- Three tab screenshots exist in the repository with clear filenames.
- The screenshots are based on the current Cocos UI structure and gameplay vocabulary.
- Verification records the generated image paths and dimensions.

## Related Files

- `client/cocos/assets/scripts/HachimiRestaurantGame.ts`
- `docs/design/optimized-tabs-2026-06-24/`

## Risks And Notes

- Image generation may not render Chinese text perfectly. These images are intended as art direction and UI composition references, not final production screenshots.

## Completed Work

- Generated optimized screenshot concepts for the restaurant, upgrade, and tasks tabs using the built-in image generation tool.
- Copied original generated PNGs into `docs/design/optimized-tabs-2026-06-24/`.
- Created 720 x 1280 versions aligned to the Cocos project design resolution.
- Added a design README describing usage and caveats.

## Verification

- Checked generated PNG dimensions with `sips -g pixelWidth -g pixelHeight`.
- Verified each tab has both an original generated PNG and a 720 x 1280 reference PNG:
  - `restaurant-tab-original.png`: 941 x 1672
  - `restaurant-tab-720x1280.png`: 720 x 1280
  - `upgrade-tab-original.png`: 941 x 1672
  - `upgrade-tab-720x1280.png`: 720 x 1280
  - `tasks-tab-original.png`: 941 x 1672
  - `tasks-tab-720x1280.png`: 720 x 1280

No runtime code changed, so no Cocos build or gameplay test was required for this task.

## Key Commits

- TBD

## Follow-ups

- Use these references to replace or refine the runtime-built UI with a polished Cocos scene layout.
- Recreate final UI labels in Cocos instead of relying on text baked into generated images.
