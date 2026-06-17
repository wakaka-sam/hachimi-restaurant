# Implement MVP Gameplay

## Background

The product and API documents now define the MVP gameplay for 小动物餐厅. The goal is to implement the documented loop with texture-based art assets, avoiding runtime UI drawing for art.

## Goal

Implement the gameplay systems described in `docs/product.md` and `docs/api.md`.

## Scope

- Shared gameplay formulas and constants.
- Node.js backend API for profile, stamina, business sessions, upgrades, restaurant upgrades, and task rewards.
- Cocos client implementation for the MVP loop, with `client/web/` retained only as a temporary backend/debug harness.
- Generated PNG textures for all game art and UI surfaces.
- Tests for the economy and backend API.

## Acceptance Criteria

- Backend implements the documented MVP API endpoints.
- Shared rules implement the `incomePower`, `expectedRevenue`, `upgradeCost`, stamina, and performance formulas.
- Cocos client can play a 90-second business session, finish it, upgrade parts, upgrade restaurant, and claim task rewards.
- Web, WeChat Mini Game, and Douyin Mini Game must share the same Cocos client codebase; Web is a Cocos build output.
- Runtime art surfaces use PNG texture assets rather than canvas/SVG drawing.
- Verification commands run successfully.

## Related Files

- `docs/product.md`
- `docs/api.md`
- `shared/game-rules.mjs`
- `server/src/`
- `client/cocos/`
- `client/web/` debug harness
- `client/assets/textures/`

## Risks And Notes

- Cocos Creator is not installed in this environment. This implementation keeps production client work under the Cocos source skeleton and uses `client/web/` only as a temporary texture-based debug harness for shared gameplay and backend verification.
- This is still an active implementation task until the Cocos client is complete and the full objective has been verified end to end.

## Current Progress

- Implemented shared gameplay rules in `shared/game-rules.mjs`.
- Implemented the Node.js backend MVP API in `server/src/`.
- Implemented a texture-based Web debug harness in `client/web/` for backend/gameplay verification while Cocos Creator is unavailable.
- Generated PNG texture assets under `client/assets/textures/`.
- Added a Cocos Creator 3.x source skeleton under `client/cocos/`.
- Added Cocos TypeScript components for API access, local business simulation, table slots, part upgrades, task rows, texture catalog wiring, and the main scene controller.
- Synced the PNG textures into `client/cocos/assets/textures/`.
- Added automated tests for:
  - 8% `incomePower` economy growth.
  - Stamina recovery.
  - Session settlement.
  - Invalid settlement rejection.
  - Full 25 part-upgrade cycle.
  - Restaurant upgrade without income regression.
  - Guide task claims.
  - Double settlement prevention.
  - Active session resume without double stamina charge.
  - Insufficient stamina rejection.
  - Expired session minimum settlement.
  - Static Web debug harness and PNG texture serving.
  - Runtime client policy forbidding canvas/SVG art drawing.
- Added `npm run verify:textures` to enforce the texture asset policy.
- Added `npm run sync:cocos-textures` and `npm run verify:cocos`.
- Added `npm run verify:gameplay` to check required endpoints, screens, Cocos components, and texture assets.
- Added `npm run typecheck:cocos` using TypeScript and `@cocos/creator-types`.
- Added `client/cocos/scene-wiring.json` to define the expected Cocos scene nodes, components, texture assignments, labels, and buttons.
- Implemented first-run guide highlights in the Web debug harness for:
  - Start business.
  - Seat customer.
  - Serve food.
  - Collect payment.
  - Upgrade a part.
  - Claim guide task reward.
- Added matching guide label/message support to the Cocos controller and scene wiring contract.
- Recorded that the production Web client must be a Cocos Web build output, sharing the same codebase as WeChat Mini Game and Douyin Mini Game.
- Added `WEB_STATIC_ROOT` support so production deployment can serve Cocos Web build output instead of the debug harness.
- Added a production server guard so `NODE_ENV=production` refuses to start unless `WEB_STATIC_ROOT` points to Cocos Web build output.
- Documented that `client/web/` must never be used as production `WEB_STATIC_ROOT`; it remains a local verification harness only.
- Added Cocos API host resolution:
  - Cocos Web builds use same-origin `/api` routes when `apiBaseUrl` is empty.
  - WeChat Mini Game, Douyin Mini Game, and other non-browser Cocos runtimes default to `https://animalapi.wakaka007.cn`.
  - The Cocos inspector can still override `apiBaseUrl` for local preview or staging.
- Updated handfeel tuning so an overall restaurant upgrade preserves long-term gameplay feel after part stars reset.
- Added three restaurant background stage textures so overall restaurant upgrades visibly improve the dining room:
  - Level 1 uses the starter restaurant.
  - Level 2 uses the garden restaurant.
  - Level 3+ uses the deluxe restaurant.
- Wired restaurant stage textures into the Web debug harness, Cocos texture catalog, and Cocos scene wiring contract.
- Added live营业反馈 for service quality:
  - Cocos simulation now tracks average satisfaction and short-lived operation feedback.
  - Cocos controller exposes satisfaction and feedback labels for the营业 scene.
  - Web debug harness mirrors the same satisfaction and instant feedback behavior for local verification.
- Implemented the documented常驻 2 倍速入口 during营业:
  - Cocos simulation can switch between 1x and 2x while a session is running.
  - Cocos controller routes the speed button to the active simulation when on the营业 screen.
  - Web debug harness mirrors in-session speed switching for local verification.
- Added speed-neutral reward verification:
  - Rule tests now prove identical 1x/2x summaries produce the same reward and performance factor.
  - Static coverage tracks the speed-neutral reward regression test.
- Added backend stamina recovery status:
  - Shared rules expose next stamina recovery countdown, full recovery countdown, and recovery timestamps from backend time.
  - Profile responses include `staminaRecovery` so clients do not infer recovery from local-only time.
  - Cocos and Web debug top bars display the backend-provided next stamina recovery countdown.
- Improved中断恢复:
  - Backend active session responses include elapsed/remaining game seconds and recovery window.
  - 2x sessions use a shorter real-time active window while preserving the 2-minute recovery window.
  - Cocos and Web debug harness resume active sessions from remaining time instead of restarting at 90 seconds.
- Added early-settlement protection:
  - Backend rejects valid-looking settlements before the minimum real time for a 90-second 2x session has elapsed.
  - Cocos and Web debug harness disable manual settlement while the local营业 countdown is still running.
  - API docs now include `SESSION_NOT_READY`.
- Tightened MVP task screen coverage:
  - Cocos scene wiring now requires enough `TaskItemView` rows for all 13 MVP guide/daily/growth tasks.
  - API tests verify every task definition is exposed in the player profile.
- Added task type visibility:
  - Shared task statuses now expose `typeLabel` for guide, daily, and growth tasks.
  - Web debug task screen groups tasks by type.
  - Cocos `TaskItemView` can render the task type label for every task row.
- Added Cocos task section headers:
  - `HachimiRestaurantGame` renders guide, daily, and growth task header counts from backend task states.
  - Scene wiring now requires `guideTaskHeaderLabel`, `dailyTaskHeaderLabel`, and `growthTaskHeaderLabel`.
  - The Cocos task screen therefore has explicit type sections in addition to row-level type labels.
- Added daily task reset verification:
  - Backend task tests now prove daily task claim keys are scoped by backend date.
  - API tests prove a daily task cannot be claimed twice on the same backend date, but can be completed and claimed again the next day.
  - Task reward claims remain auxiliary and do not change `incomePower`.
- Added shared task reward budget verification:
  - Task rewards are constrained to the MVP coin/stamina reward fields.
  - Daily task coin rewards stay within 1 to 2 normal business revenues at current `expectedRevenue`.
  - Daily task stamina rewards stay within the documented 10 to 20 stamina band.
- Reserved customer type data for future special guests:
  - MVP customers now carry `customerType: normal` in Cocos and the Web debug harness.
  - Session summaries preserve `customerTypes.normal` for backend records.
  - Shared rules expose the current supported customer type list.
- Closed expired-session settlement:
  - Profile and session start now auto-settle expired active sessions at the minimum guaranteed reward.
  - Expired sessions no longer disappear from the active-session view without awarding their documented minimum settlement.
- Added Cocos main-screen part status wiring:
  - `PartStatusView` renders the five part names and star states on the restaurant main screen.
  - `HachimiRestaurantGame` now binds and refreshes the main-screen part status views separately from the upgrade-card views.
  - Scene wiring and static coverage require five main-screen part status instances.
- Added locked table slot presentation:
  - Shared rules now expose `maxTableSlots = 5`, while `tableCapacity` remains the current unlocked capacity from restaurant/table progression.
  - Added `table-locked.png` and synced it into both Web debug and Cocos texture trees.
  - Cocos `TableSlotView` renders locked slots with a texture and disables input for slots above current capacity.
  - The Web debug harness mirrors the locked-slot display for local gameplay preview.
- Aligned营业节奏 with the MVP density target:
  - Shared tuning now starts each business session with 2 initial customers.
  - Initial prep + eating flow is about 18 seconds, matching the documented 18 to 25 second single-customer flow.
  - Cocos and Web debug simulations both seed the initial customer wave from backend tuning.
  - Added rule tests for initial table capacity, initial customer count, spawn interval, flow length, and max session customer cap.
- Added explicit Cocos screen navigation wiring:
  - `HachimiRestaurantGame` now owns main, upgrade, task, result-to-main, and result-to-upgrade button properties.
  - Navigation buttons are wired in `onLoad` and refresh screen state/guide messages when pressed.
  - Scene wiring and static coverage require the navigation buttons so the four MVP screens remain reachable in the production Cocos client.
- Added visible waiting queue limits:
  - Shared rules now expose `maxWaitingCustomers = 4`.
  - Cocos and Web debug simulations pause natural customer spawning when the visible waiting queue is full.
  - Cocos scene wiring now requires at least 4 `waitingCustomerSprites` so every waiting customer has a texture-backed visual slot.
- Added max-session customer cap enforcement:
  - Cocos and Web debug simulations stop natural customer spawning at 18 customers per business session.
  - Shared rule tests verify 18 customers is accepted and 19 customers is rejected.
  - Product and API docs now state that the client cap protects normal play from producing backend-rejected summaries.
- Added texture-backed Cocos button contract:
  - `TexturedButtonView` applies `button.png` and `button-disabled.png` to button background sprites based on interactable state.
  - `HachimiRestaurantGame` refreshes textured buttons after screen, business, upgrade, and task state changes.
  - Scene wiring now requires enough `TexturedButtonView` instances for fixed controls, part upgrade buttons, and all MVP task claim buttons.
- Added Cocos mobile safe-area contract:
  - `MobileSafeAreaView` applies Cocos `SafeArea` and `Widget` layout to screen interaction roots.
  - Scene wiring now requires one safe-area root for each of the five MVP screens.
  - Platform docs now state that backgrounds may fill the canvas, but interactive controls must stay inside safe-area roots.
- Added upgrade-screen detail coverage:
  - Web and Cocos upgrade views must show current star state, shared cost, insufficient coin shortage, next-star effect, and max-star state.
  - Cocos scene wiring now requires every `PartUpgradeView` to bind the labels, star sprites, and upgrade button that carry those states.
  - Static coverage rejects recommendation copy in the free-upgrade UI.
- Tightened star texture policy:
  - Added `icon-star-empty.png` for empty star states.
  - Web and Cocos now switch between filled and empty star textures instead of runtime grayscale/filter effects.
  - Texture verification now forbids gradient, shadow, filter, and grayscale drawing/effect tokens in runtime sources.
- Wired floor movement tuning into client simulations:
  - Cocos and Web debug simulations now apply `moveSpeedMultiplier` to prep and eating durations.
  - Floor upgrades therefore make movement/turnover feel faster in the interactive business loop, not only in backend tuning output.
  - API docs now list `moveSpeedMultiplier` in `profile.tuning`.
- Added table-state countdown feedback:
  - Cocos and Web debug table labels now show remaining phase time or patience for seated, ready-food, eating, and ready-pay states.
  - Product docs now require table state countdowns so players can judge service and cashier priority.

## Remaining Work

- Open the Cocos project in Cocos Creator once the editor is available.
- Wire the scene nodes to `HachimiRestaurantGame`, `TextureCatalog`, `TableSlotView`, `PartUpgradeView`, and `TaskItemView`.
- Assign synced PNG files as `SpriteFrame` texture references in the editor.
- Verify the Cocos build targets for Web first, then WeChat Mini Game and Douyin Mini Game.
- Replace the backend-served debug harness with Cocos Web build output for production Web deployment.

## Latest Verification

- `npm run verify` passes.
- Current automated coverage: 29 Node tests plus static texture and gameplay coverage checks.
- Static gameplay coverage verifies:
  - Backend MVP endpoints.
  - Shared economy, stamina, and performance formulas.
  - Backend stamina recovery status and client countdown display.
  - Speed-neutral 1x/2x reward calculation.
  - Shared营业密度 tuning.
  - Shared max-session customer cap validation.
  - Shared normal customer type reservation.
  - Shared restaurant-upgrade handfeel retention.
  - Backend active session remaining-time recovery.
  - Backend early-settlement rejection.
  - Backend auto-settlement for expired active sessions.
  - Backend exposure of all guide, daily, and growth tasks.
  - Shared/Web/Cocos task type labels and grouping.
  - Cocos task section header wiring for guide, daily, and growth tasks.
  - Shared task reward field and daily reward budget constraints.
  - Backend-date daily task reset and once-per-day claim protection.
  - Web core screens and service chain.
  - Web and Cocos initial customer wave wiring.
  - Web and Cocos manual early-settlement blocking.
  - Web and Cocos resumed session remaining-time handling.
  - Web and Cocos in-session 1x/2x speed switching.
  - Cocos API host resolution for Web same-origin and non-browser mini-game targets.
  - Web first-run guide highlights.
  - Web and Cocos营业满意度/即时反馈 wiring.
  - Web and Cocos restaurant visual stage wiring.
  - Cocos main-screen five-part star status wiring.
  - Cocos MVP screen navigation wiring.
  - Web and Cocos locked table slot texture wiring.
  - Web and Cocos waiting queue cap wiring.
  - Web and Cocos max-session customer spawning cap.
  - Production Web static root guard that prevents the debug harness from being used in production.
  - Cocos mobile safe-area component and scene wiring contract.
  - Web and Cocos upgrade-screen detail coverage with no recommendation prompt.
  - Filled/empty star states backed by PNG textures instead of runtime grayscale/filter effects.
  - Web and Cocos floor movement/turnover tuning.
  - Web and Cocos table-state countdown labels.
  - Cocos texture-backed button wiring.
  - Cocos controller, simulation, API client, texture catalog, and view components.
  - Cocos task row count covers all MVP task definitions.
  - Cocos guide label wiring.
  - Required PNG texture presence in both Web and Cocos asset trees.
- Cocos TypeScript source compiles under `client/cocos/tsconfig.json`.
