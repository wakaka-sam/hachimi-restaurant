# API

This document records the MVP backend API draft for Little Animal Restaurant.

The backend is authoritative for player progress, stamina, coins, upgrades, tasks, and session settlement. The client may submit gameplay summaries, but it must not submit final trusted coin rewards.

## Base Context

- Production API domain: `animalapi.wakaka007.cn`.
- Web MVP identity: anonymous player ID or test token.
- Long-term identity: WeChat Mini Game and Douyin Mini Game platform login.

## Core Player State

Recommended player fields:

```text
playerId
coins
stamina
staminaUpdatedAt
restaurantLevel
parts:
  cashierStar
  tableStar
  chairStar
  floorStar
  wallStar
incomePower
totalSessions
totalCustomersServed
tasks
createdAt
updatedAt
```

`incomePower` can be derived from `restaurantLevel` and part stars, but may also be stored redundantly. If stored, the backend must validate it before settlement.

Formula:

```text
incomePower =
  (restaurantLevel - 1) * 25
  + cashierStar
  + tableStar
  + chairStar
  + floorStar
  + wallStar

expectedRevenue = round(100 * 1.08 ^ incomePower)
upgradeCost = expectedRevenue
```

## Business Session State

Recommended session fields:

```text
sessionId
playerId
startedAt
expiresAt
speedMode: 1x | 2x
status: active | finished | expired
summary:
  customersServed
  customersLost
  averageSatisfaction
  maxCombo
  durationSeconds
rewardCoins
```

Rules:

- Starting a session costs 10 stamina.
- A session lasts 90 seconds of game time.
- 2x speed shortens real time only.
- A session can be settled only once.
- Interrupted sessions may be resumed within a short recovery window, recommended 2 minutes.
- Expired sessions settle at minimum guaranteed reward or by the last accepted summary.

## Endpoints

All MVP endpoints are currently mounted under the `/api` prefix.

### `GET /api/player/profile`

Returns the current player state.

Response includes:

```text
player
stamina recovery status
restaurant level
part stars
current upgrade cost
task status
active session, if any
```

If the player has active sessions past their recovery window, the backend settles them before returning the profile. MVP expired settlement uses the minimum guaranteed reward.

### `POST /api/session/start`

Starts a business session.

Backend behavior:

1. Refresh stamina by backend time.
2. Settle any expired active sessions with the minimum guaranteed reward.
3. Verify `stamina >= 10`.
4. Deduct 10 stamina.
5. Create an active 90-second business session.
6. Return session ID and current gameplay parameters.

### `POST /api/session/finish`

Finishes and settles a business session.

Client submits a gameplay summary:

```text
sessionId
customersServed
customersLost
averageSatisfaction
maxCombo
durationSeconds
speedMode
clientVersion
customerTypes:
  normal
```

Backend behavior:

1. Verify the session belongs to the player.
2. Verify the session is active and not already settled.
3. Validate summary bounds, including a reasonable customer count cap.
4. Reject settlement before enough real time has elapsed for a valid 90-second game-time session. The current minimum is 45 real seconds because 2x speed is always available.
5. Recompute `expectedRevenue`.
6. Compute `performanceFactor`.
7. Compute final `rewardCoins`.
8. Add coins and write the session record.
9. Update task progress.

The backend must not trust a client-submitted final coin value.

Performance formula:

```text
performanceFactor = clamp(
  0.75
  + completionScore * 0.35
  + satisfactionScore * 0.15
  + comboScore * 0.05,
  0.75,
  1.30
)

rewardCoins = round(expectedRevenue * performanceFactor)
```

### `POST /api/upgrade/part`

Upgrades one restaurant part by 1 star.

Request:

```text
part: cashier | table | chair | floor | wall
```

Backend behavior:

1. Verify the part exists.
2. Verify the part is below 5 stars.
3. Recompute current `upgradeCost`.
4. Verify the player has enough coins.
5. Deduct coins.
6. Increase the selected part star by 1.
7. Recompute or validate `incomePower`.
8. Update task progress.

All upgradeable parts at the same `incomePower` use the same upgrade cost.

### `POST /api/upgrade/restaurant`

Upgrades the whole restaurant when all five parts are 5 stars.

Backend behavior:

1. Verify all parts are 5 stars.
2. Increase `restaurantLevel` by 1.
3. Reset all part stars to 0.
4. Preserve long-term gameplay feel through restaurant-level base values.
5. Do not directly grant stamina, coins, or items.
6. Update task progress.

Rewards related to restaurant upgrades are granted by the task system, not by this endpoint directly.

### `POST /api/tasks/claim`

Claims a task reward.

Backend behavior:

1. Verify task exists and belongs to the player.
2. Verify task is complete.
3. Verify reward has not been claimed.
4. Grant reward, such as coins or stamina.
5. Mark task as claimed.

## MVP Task Types

- Guide tasks.
- Daily tasks.
- Growth tasks.

MVP reward types:

- Coins.
- Stamina.

Task rewards are an auxiliary progression layer and should not directly alter `incomePower`.

## Error Conventions

MVP error codes should cover:

```text
UNAUTHORIZED
INSUFFICIENT_STAMINA
INSUFFICIENT_COINS
INVALID_PART
PART_ALREADY_MAXED
RESTAURANT_NOT_READY
SESSION_NOT_FOUND
SESSION_NOT_READY
SESSION_ALREADY_FINISHED
SESSION_EXPIRED
INVALID_SESSION_SUMMARY
TASK_NOT_COMPLETE
TASK_ALREADY_CLAIMED
```

Exact response envelopes are TBD when the Node.js backend is created.
