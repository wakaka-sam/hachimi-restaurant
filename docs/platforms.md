# Platforms

## Targets

- Short-term: Web, built from the Cocos project.
- Long-term: WeChat Mini Game and Douyin Mini Game, built from the same Cocos project.

## Client Source Rule

There is one production client codebase: `client/cocos/`.

- Web must be a Cocos Web build artifact.
- WeChat Mini Game must be a Cocos WeChat Mini Game build artifact.
- Douyin Mini Game must be a Cocos Douyin Mini Game build artifact.
- Browser DOM code under `client/web/` is only a temporary debug harness and must not become a separate production client.

Platform-specific behavior should be isolated behind adapters in the Cocos codebase when it appears, rather than branching gameplay logic per platform.

Implementation source of truth:

- Product behavior must be implemented in `client/cocos/` first.
- The temporary `client/web/` harness may mirror Cocos behavior only for local backend/gameplay verification.
- Production Web deployment must serve Cocos Web build output through `WEB_STATIC_ROOT`.
- WeChat Mini Game and Douyin Mini Game packages must be built from the same Cocos project without separate gameplay forks.

## API Host Resolution

The Cocos API client uses one endpoint resolution rule across targets:

- If `HachimiRestaurantGame.apiBaseUrl` is set in the Cocos inspector, use that value.
- If it is empty in a Cocos Web build, use same-origin `/api` routes. This supports serving the Cocos Web build from the Node backend with `WEB_STATIC_ROOT`.
- If it is empty in non-browser Cocos runtimes such as WeChat Mini Game or Douyin Mini Game, use `https://animalapi.wakaka007.cn`.

## Network Adapter

The Cocos API client must keep network transport behind `client/cocos/assets/scripts/services/ApiTransport.ts`.

- Use `fetch` when the runtime provides it.
- Fall back to `XMLHttpRequest` when `fetch` is unavailable.
- Keep player identity headers and future platform auth headers inside the API service layer, not in gameplay controllers.

## Mobile Layout

The shared Cocos scene is portrait-first at 720 x 1280 design resolution. Screen interaction roots must use `MobileSafeAreaView`, which applies Cocos `SafeArea` and `Widget` layout so controls stay clear of notches and bottom gesture regions on Web preview, WeChat Mini Game, and Douyin Mini Game targets.

Background sprites may fill the full canvas, but buttons, task rows, labels, table controls, and navigation must live inside the safe-area interaction root for each screen.

## Notes

Use this file for platform constraints, compatibility notes, SDK/tooling versions, and mobile UI considerations.
