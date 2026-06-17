# Scripts

Stable repeatable helper scripts may live here.

Do not store one-off command history or secrets in this directory.

Current verification helpers:

- `verify-cocos-api-client.mjs`: executes the Cocos API client with a mocked `cc.sys` runtime and checks host resolution, player id persistence, request transport, and recoverable API errors.
- `verify-cocos-components.mjs`: executes texture-backed Cocos UI components with a mocked `cc` runtime and checks tables, upgrades, tasks, buttons, panels, and safe areas.
- `verify-cocos-project.mjs`: checks Cocos project metadata, portrait design resolution, scene-wiring alignment, and generated-directory ignore rules.
- `verify-cocos-simulation.mjs`: executes the pure Cocos business simulation and checks service flow, speed mode, queue limits, customer caps, and snapshot restore.
- `verify-cocos-shared-rules.mjs`: checks the Cocos gameplay constants mirror against shared backend rules.
- `verify-gameplay-coverage.mjs`: checks documented MVP gameplay coverage across backend, Cocos, Web debug harness, docs, and textures.
- `verify-texture-policy.mjs`: checks PNG texture presence, dimensions, Cocos copies, and runtime no-drawing policy.
