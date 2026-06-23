# Build Cocos Web

## Background

The short-term release target is a Cocos Web build from the shared Cocos client under `client/cocos/`.

## Goal

Install Cocos Creator 3.8.x locally and produce a Cocos Web build from the shared client project.

## Scope

- Review the existing Cocos project metadata and build/readme notes.
- Install missing Node dependencies if needed for local verification.
- Run the smallest relevant Cocos source verification before attempting an editor build.
- Locate and use the local Cocos Creator CLI if available.

## Acceptance Criteria

- Cocos source-level verification is run and recorded.
- If Cocos Creator is available, produce a Web build from `client/cocos/`.
- If Cocos Creator is not available, record the exact blocker and the next command/environment needed.

## Related Files

- `client/cocos/`
- `client/cocos/README.md`
- `docs/architecture.md`
- `package.json`

## Risks And Notes

- The repository currently documents `client/cocos/` as a source-ready skeleton that had not previously been opened or build-verified with Cocos Creator.
- A real Web build requires a local Cocos Creator 3.8.x installation or equivalent CLI.
- `npm install` initially failed because the lockfile points tarball URLs at `http://mirrors.tencentyun.com/npm/...`, which did not resolve in this environment. Dependencies were installed without rewriting the lockfile by using `npm install --package-lock=false --registry=https://registry.npmjs.org`.
- Cocos Creator generated `.meta`, `settings/`, and `profiles/` files when the source skeleton was opened. These are editor metadata, while `client/cocos/library/`, `client/cocos/temp/`, and `client/cocos/build/` remain generated output.
- The current Cocos Web build uses a minimal 2D `main.scene` to prove the build pipeline. The full MVP gameplay scene still needs editor layout/binding work against `client/cocos/scene-wiring.json`.

## Completed Work

- Installed Cocos Creator 3.8.7 at `/Applications/Cocos/Creator/3.8.7/CocosCreator.app`.
- Installed Cocos Dashboard 2.2.1 at `/Applications/CocosDashboard.app`.
- Opened/imported `client/cocos/` with Cocos Creator 3.8.7, generating Cocos asset metadata and editor package settings.
- Added `client/cocos/assets/scenes/main.scene` as a minimal portrait 720 x 1280 2D initial scene.
- Built the Cocos Web Mobile target successfully into `client/cocos/build/web-mobile/`.
- Started a local static server for the build at `http://127.0.0.1:4180/`.

## Verification

- `npm run verify`
- Cocos Creator CLI Web Mobile build:

```bash
/Applications/Cocos/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator --project /Volumes/bigger/testspace/hachimi-restaurant/client/cocos --build "platform=web-mobile;debug=false;startScene=43983c2f-5ff3-43d0-8b25-45a498b98abd"
```

- Build command exited with Cocos success code `36`.
- Build output checked at `client/cocos/build/web-mobile/`, including `index.html`, `application.js`, `src/settings.json`, and Cocos engine assets.
- Local HTTP checks passed:
  - `curl -I http://127.0.0.1:4180/index.html`
  - `curl -I http://127.0.0.1:4180/src/settings.json`

## Key Commits

- `81d3617` - Record Cocos build verification status.
- `5825f35` - Add Cocos buildable project metadata.

## Follow-ups

- Build the real Cocos gameplay scene in the editor and bind it to the components required by `client/cocos/scene-wiring.json`.
- Replace the minimal initial scene with the full MVP scene before treating the Cocos Web output as the production client.
