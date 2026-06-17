# Summarize Gameplay Design

## Background

The gameplay for Little Animal Restaurant was defined through a grill-me design discussion. The repository needs a durable product document so future agents can implement the game without relying on chat history.

## Goal

Write the confirmed gameplay loop, economy model, stamina rules, upgrade rules, task system, MVP scope, and backend authority decisions into repository documentation.

## Scope

- Update `docs/product.md`.
- Update `docs/api.md` with the MVP API and data model implied by the gameplay.
- Move this task record to `done/` when complete.

## Acceptance Criteria

- Product document describes the MVP gameplay loop and formulas.
- API document describes the backend endpoints and core data fields needed by the gameplay.
- Remaining simple decisions are closed conservatively and documented.

## Related Files

- `docs/product.md`
- `docs/api.md`

## Risks And Notes

- Cocos and Node projects do not exist yet, so verification is documentation-only.

## Completed Work

- Replaced the placeholder product document with the MVP gameplay design for 小动物餐厅.
- Documented the 90-second interactive business session, stamina loop, free 2x speed, click-first service chain, and customer timeout rules.
- Documented the unified `incomePower` economy model where any part upgrade increases expected revenue by 8%.
- Documented free part upgrade choice, equal upgrade costs at the same growth state, restaurant-level resets without gameplay feel regression, and lightweight tasks.
- Documented MVP screens, backend authority, session interruption behavior, MVP exclusions, and art/experience direction.
- Added the MVP backend API and core data model draft to `docs/api.md`.

## Verification

- Ran `git diff --check`.
- Reviewed `docs/product.md`.
- Reviewed `docs/api.md`.

## Key Commits

- This record is included in the commit that summarizes the MVP gameplay design.

## Follow-ups

- Create detailed task reward tables.
- Create concrete balancing tables after the first playable prototype.
- Implement the Node.js backend API draft.
- Create the Cocos client project and prototype the 90-second business session.
