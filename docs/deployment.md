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

## Notes

Use this file for deployment, environment variables, health checks, and rollback notes. Do not store secrets here.
