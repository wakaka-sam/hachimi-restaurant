# Scripts

Stable repeatable helper scripts may live here.

Do not store one-off command history or secrets in this directory.

Current verification helpers:

- `verify-cocos-project.mjs`: checks Cocos project metadata, portrait design resolution, scene-wiring alignment, and generated-directory ignore rules.
- `verify-cocos-shared-rules.mjs`: checks the Cocos gameplay constants mirror against shared backend rules.
- `verify-gameplay-coverage.mjs`: checks documented MVP gameplay coverage across backend, Cocos, Web debug harness, docs, and textures.
- `verify-texture-policy.mjs`: checks PNG texture presence, dimensions, Cocos copies, and runtime no-drawing policy.
