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

## Notes

Use this file for platform constraints, compatibility notes, SDK/tooling versions, and mobile UI considerations.
