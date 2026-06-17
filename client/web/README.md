# Web Debug Harness

This directory is a temporary browser-DOM harness for backend and gameplay verification.

It is not the production Web client. The production Web release must be built from the shared Cocos project in `client/cocos/`, alongside the WeChat Mini Game and Douyin Mini Game builds.

This directory must never be used as `WEB_STATIC_ROOT` in production. Production `WEB_STATIC_ROOT` should point only to Cocos Web build output.

Rules for agents:

- Do not add product-only gameplay here.
- Any gameplay behavior added here must already exist in Cocos or be added to Cocos in the same task.
- Keep runtime art texture-based and aligned with `client/assets/textures/`.
