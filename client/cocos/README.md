# Cocos Client

This directory is the formal Cocos Creator client project skeleton for 小动物餐厅.

Cocos Creator is not installed in the current environment, so this project is source-ready but not locally build-verified with the Cocos editor yet. The scripts are written as Cocos Creator 3.x TypeScript components and are designed to be attached to a mobile-first scene.

## Asset Policy

All art surfaces must be PNG textures loaded as `SpriteFrame` assets.

Allowed runtime visual components:

- `Sprite` for texture art.
- `Label` for dynamic text and numbers.
- `Button` for touch input over textured sprites.

Forbidden for art:

- `Graphics`
- canvas drawing
- SVG
- custom runtime shape drawing

## Texture Assets

Textures are synced from:

```text
client/assets/textures/
```

to:

```text
client/cocos/assets/textures/
```

Run from repo root:

```bash
npm run sync:cocos-textures
npm run verify:cocos
```

## Scene Wiring

Create a portrait scene in Cocos Creator and attach:

- `HachimiRestaurantGame` to the root scene controller node.
- `TextureCatalog` to a child node and assign every PNG as a `SpriteFrame`.
- `TableSlotView` to each table slot node.
- `PartStatusView` to each main-screen part status node.
- `PartUpgradeView` to each upgrade card node.
- `TaskItemView` to each task row node. The current MVP task list has 13 backend tasks, so the scene needs at least 13 task row instances unless a later virtualized list component replaces the fixed rows.

The scene should provide 5 table slot nodes. `TableSlotView` renders slots above the current `tableCapacity` with the locked table texture and disables touch input until the player's table capacity grows.

Then wire the serialized properties in the inspector.

The expected scene contract is recorded in:

```text
client/cocos/scene-wiring.json
```

`npm run verify:gameplay` checks that this manifest names the required Cocos components, screens, and PNG texture files.
