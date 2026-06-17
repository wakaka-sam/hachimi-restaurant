# Deployment

## Current Context

- Backend production environment: gz server.
- Backend production API domain: `animalapi.wakaka007.cn`.
- Production Web static files should come from the Cocos Web build output.
- The local `client/web/` directory is a temporary debug harness and should not be deployed as the production Web game.

## Web Static Root

The Node.js server can serve static game files from `WEB_STATIC_ROOT`.

Expected production shape:

```bash
WEB_STATIC_ROOT=/path/to/cocos-web-build
```

For local backend/debug work, leaving `WEB_STATIC_ROOT` unset serves `client/web/`.

In `NODE_ENV=production`, the server refuses to start unless `WEB_STATIC_ROOT` is set. It also rejects `WEB_STATIC_ROOT=client/web` or any path under `client/web`. This prevents the temporary debug harness from being deployed as the production Web game.

`WEB_STATIC_ROOT` must never point to `client/web` in production. It should point only to the Cocos Web build output generated from the shared `client/cocos/` project.

## Environment Variables

Use `.env.example` as the safe variable list for agents and deployment scripts. Do not commit real `.env` files.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Production yes | Set to `production` on gz server. |
| `PORT` | No | Defaults to `4173`. |
| `GAME_DATA_FILE` | Production yes | File-backed player/session state path. Put the real path outside Git-managed source. |
| `WEB_STATIC_ROOT` | Production yes | Must point to Cocos Web build output, never `client/web`. |

## Health Check

The backend exposes:

```text
GET /api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "hachimi-restaurant",
  "now": "2026-06-17T12:00:00.000Z"
}
```

Use `https://animalapi.wakaka007.cn/api/health` as the production smoke check after deploy, then verify the Cocos Web build can load and call `/api/player/profile`.

## Rollback Notes

- Keep the previous Cocos Web build output directory available until the new build is verified.
- Keep the previous `GAME_DATA_FILE` backup before replacing server code or changing persistence paths.
- Roll back by restoring the previous server revision and pointing `WEB_STATIC_ROOT` back to the previous Cocos Web build output.

## Notes

Use this file for deployment, environment variables, health checks, and rollback notes. Do not store secrets here.
