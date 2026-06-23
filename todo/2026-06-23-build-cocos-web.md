# Build Cocos Web

## Background

The short-term release target is a Cocos Web build from the shared Cocos client under `client/cocos/`.

## Goal

Inspect the current project state and compile the Cocos client as far as the local environment allows.

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

## Current Status

- Cocos source-level verification passed with `npm run verify:cocos`.
- Cocos TypeScript source passed with `npm run typecheck:cocos`.
- Local Cocos Creator discovery did not find a usable `CocosCreator` binary in `/Applications`, `/Users/bytedance/Applications`, Spotlight, or common workspace volume paths checked during this task.
- A real Cocos Web build is blocked until Cocos Creator 3.8.x is installed or a path to an existing Creator CLI is provided.

## Next Build Command

Once Cocos Creator 3.8.x is available, run the Web build with the local Creator CLI from the repo root, adjusting the binary path if needed:

```bash
/Applications/CocosCreator/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator --project /Volumes/bigger/testspace/hachimi-restaurant/client/cocos --build "platform=web-mobile;debug=false"
```

If the installed Creator version uses a different bundle layout, first verify the available CLI flags with:

```bash
<CocosCreator binary> --help
```
