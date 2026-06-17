# Client

Cocos Creator / Cocos Engine client project root.

## Current State

Cocos Creator is not installed in the current execution environment, so the first playable implementation is a texture-based Web prototype under `client/web/`.

The Web prototype exists to validate gameplay, backend integration, mobile-first layout, and PNG texture assets before the formal Cocos scene is created.

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

## Future Cocos Migration

Once Cocos Creator is available, create the formal Cocos project here and port/reuse:

- Gameplay formulas from `shared/game-rules.mjs`.
- API integration behavior from `client/web/main.js`.
- PNG textures from `client/assets/textures/`.
- Mobile layout requirements from `docs/product.md` and `AGENTS.md`.

The Cocos source skeleton already mirrors these behaviors under `client/cocos/assets/scripts/`; the remaining editor work is to wire scene nodes, assign `SpriteFrame` texture properties, and build target platforms.
