# Client

Client workspace for 小动物餐厅.

## Current State

The production client is the Cocos Creator / Cocos Engine project under `client/cocos/`.

Web, WeChat Mini Game, and Douyin Mini Game must be built from the same Cocos project. The Web release is a Cocos Web build artifact, not a separate browser-DOM client.

Cocos Creator is not installed in the current execution environment, so the repository also contains a texture-based DOM debug harness under `client/web/`. That harness exists only to validate backend integration, gameplay rules, mobile layout assumptions, and PNG texture assets until a Cocos Web build can be produced locally.

The repository also includes a Cocos Creator 3.x source skeleton under `client/cocos/`, including TypeScript components for:

- API access.
- Local 90-second business simulation.
- Table slots.
- Part upgrades.
- Task rows.
- Main game coordination.
- Texture catalog wiring.

## Asset Policy

Runtime art and UI surfaces should use PNG textures from `client/assets/textures/`.

Do not implement game art with runtime canvas/SVG drawing.

## Cocos Scene Work

Once Cocos Creator is available, open the formal Cocos project and wire the scene using:

- Gameplay formulas from `shared/game-rules.mjs`.
- API integration behavior from the Cocos `ApiClient`.
- PNG textures from `client/assets/textures/`.
- Mobile layout requirements from `docs/product.md` and `AGENTS.md`.

The Cocos source skeleton already implements these behaviors under `client/cocos/assets/scripts/`; the remaining editor work is to wire scene nodes, assign `SpriteFrame` texture properties, and build Web, WeChat Mini Game, and Douyin Mini Game from the same project.
