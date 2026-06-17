# Cocos Client

This directory is the formal Cocos Creator client project skeleton for 小动物餐厅.

Cocos Creator is not installed in the current environment, so this project is source-ready but not locally build-verified with the Cocos editor yet. The scripts are written as Cocos Creator 3.x TypeScript components and are designed to be attached to a mobile-first scene.

## Asset Policy

All art surfaces must be PNG textures loaded as `SpriteFrame` assets.

Allowed runtime visual components:

- `Sprite` for texture art.
- `Label` for dynamic text and numbers.
- `Button` for touch input over textured sprites.
- `Widget` and `SafeArea` for mobile layout and notched-device adaptation.

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

## API Endpoint

`HachimiRestaurantGame.apiBaseUrl` can be set in the Cocos inspector.

- Leave it empty for a Cocos Web build served by the Node backend; API calls use the same origin.
- Set it to `http://127.0.0.1:4173` when previewing from the Cocos editor against a local backend.
- WeChat Mini Game, Douyin Mini Game, and other non-browser Cocos runtimes default to `https://animalapi.wakaka007.cn` when the inspector value is empty.

## Scene Wiring

Create a portrait scene in Cocos Creator and attach:

- `HachimiRestaurantGame` to the root scene controller node.
- `TextureCatalog` to a child node and assign every PNG as a `SpriteFrame`.
- `TableSlotView` to each table slot node.
- `PartStatusView` to each main-screen part status node.
- `PartUpgradeView` to each upgrade card node.
- `TaskItemView` to each task row node. The current MVP task list has 13 backend tasks, so the scene needs at least 13 task row instances unless a later virtualized list component replaces the fixed rows.
- `TexturedButtonView` to every button that should use `button.png` and `button-disabled.png` as its visual background.
- `MobileSafeAreaView` to the top-level interaction container of each screen: main, business, upgrade, tasks, and result.

`MobileSafeAreaView` adds or refreshes the Cocos `SafeArea` and `Widget` components at runtime. It keeps touch controls inside the safe area for notches and bottom gesture regions while allowing background sprites to continue filling the full portrait canvas.

The scene should provide 5 table slot nodes. `TableSlotView` renders slots above the current `tableCapacity` with the locked table texture and disables touch input until the player's table capacity grows.

The business screen should provide at least 4 `waitingCustomerSprites`. The gameplay rules cap the visible waiting queue at 4 customers so every waiting customer can be represented by a texture sprite.

Wire the navigation buttons to the controller properties instead of relying only on manually configured inspector callbacks:

- `mainNavButton`
- `upgradeNavButton`
- `taskNavButton`
- `resultMainButton`
- `resultUpgradeButton`

The task screen should provide three section header labels bound to `guideTaskHeaderLabel`, `dailyTaskHeaderLabel`, and `growthTaskHeaderLabel`. `HachimiRestaurantGame` renders guide, daily, and growth section counts from the backend task states so the Cocos task screen clearly separates task types in addition to each row's `typeLabel`.

The first scene pass should provide at least 28 `TexturedButtonView` instances: 10 fixed screen/control buttons, 5 part-upgrade buttons, and 13 task claim buttons. If task rows become virtualized later, update `scene-wiring.json` and the verification rule in the same task.

Each `PartUpgradeView` must wire `titleLabel`, `costLabel`, `effectLabel`, `starSprites`, `upgradeButton`, and `buttonLabel`. These fields carry the required upgrade-screen information: current star state, shared upgrade cost, insufficient coin shortage, next-star effect, and max-star state.

Then wire the serialized properties in the inspector.

The expected scene contract is recorded in:

```text
client/cocos/scene-wiring.json
```

`npm run verify:gameplay` checks that this manifest names the required Cocos components, screens, and PNG texture files.
