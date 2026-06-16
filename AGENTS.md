# AGENTS.md

## Purpose

This file is the operating charter for agents working in this repository. It is not the full product specification. Keep durable project rules here, and keep product details, interface contracts, deployment notes, and task history in the dedicated files listed below.

Agents should read this file before making changes.

## Project Snapshot

- Project: Hachimi Restaurant.
- Product type: cross-platform casual game.
- Client: Cocos Creator / Cocos Engine under `client/`.
- Server: Node.js backend under `server/`.
- Short-term release target: Web.
- Long-term release targets: WeChat Mini Game and Douyin Mini Game.
- Backend production environment: gz server.
- Backend production API domain: `animalapi.wakaka007.cn`.
- Main development branch: `main`.

## Repository Layout

```text
hachimi-restaurant/
  AGENTS.md
  README.md
  client/          # Cocos client project
  server/          # Node.js backend service
  todo/            # Planned and in-progress task records
  done/            # Completed task records
  docs/            # Product, architecture, API, deployment, and platform notes
  scripts/         # Stable repeatable helper scripts only
```

Directory responsibilities:

- `client/`: Cocos project source. Do not treat generated build or editor cache directories as source.
- `server/`: Node.js backend application source, tests, configuration templates, and backend package metadata.
- `todo/`: one Markdown file per planned or in-progress task.
- `done/`: completed task records moved or copied from `todo/`, with implementation and verification notes added.
- `docs/`: durable documentation that outlives a single task.
- `scripts/`: repeatable helper scripts. Do not put one-off shell history here.

## Agent Workflow

1. Read `AGENTS.md` and inspect the current repository state.
2. For any non-trivial task, create or update a task record in `todo/` before implementation.
3. Keep the task record current if scope, risk, or acceptance criteria change.
4. Make small, understandable changes directly on `main`.
5. Run the smallest relevant verification available.
6. Move or summarize the task record into `done/` when finished.
7. Commit and push progress to `origin/main` whenever the work has a clear stopping point.
8. In the final response, report what changed, verification results, commit hash, and whether it was pushed.

Tiny edits such as typo fixes, small comments, or README wording changes may skip a `todo/` file, but the commit message must still be clear.

## Todo And Done Records

Use one Markdown file per task.

Recommended filename format:

```text
YYYY-MM-DD-short-task-title.md
```

Example:

```text
2026-06-16-create-cocos-project.md
```

Recommended `todo/` template:

```md
# Task Title

## Background
## Goal
## Scope
## Acceptance Criteria
## Related Files
## Risks And Notes
```

When the task is complete, move the record to `done/` or create a corresponding completed record. Add:

```md
## Completed Work
## Verification
## Key Commits
## Follow-ups
```

Task records should explain why a change exists, not just what files changed.

## Client Guidelines

- `client/` is the Cocos client project root.
- Preserve Cocos project structure and editor metadata.
- Do not manually edit generated Cocos directories such as `client/library/`, `client/temp/`, `client/local/`, or `client/build/` unless the task explicitly concerns generated output.
- Build Web, WeChat Mini Game, and Douyin Mini Game targets through Cocos tooling once the project is created.
- Do not hard-bind core game logic to browser-only APIs such as direct DOM access, direct `window` usage, or Web-only storage APIs.
- Put platform-specific behavior behind an adapter layer, for example under `client/assets/scripts/platform/`, once the Cocos project exists.
- Keep API access behind a shared client-side network wrapper. Do not scatter hard-coded URLs throughout gameplay code.
- The default backend API host is `animalapi.wakaka007.cn`, subject to environment configuration.

## Mobile UI Guidelines

- Design UI mobile-first, with touch interaction as the default.
- Prioritize portrait phone layouts unless a task explicitly says otherwise.
- Account for safe areas, notches, and bottom gesture regions.
- Do not design only for desktop Web dimensions.
- When changing UI, verify with a mobile Web viewport at minimum and record the checked dimensions or target platforms in the task record.
- Prefer Cocos layout tools such as Widget, layout components, Canvas scaling, and project-level design resolution over hard-coded absolute positioning.
- Keep buttons, drag targets, and menus large enough for finger input.

## Server Guidelines

- `server/` contains the Node.js backend application only.
- Deployment knowledge belongs in `docs/deployment.md`.
- Stable automation belongs in `scripts/`.
- Keep secrets out of the repository. Use `.env.example` for required environment variable names and safe placeholder values.
- When backend API behavior changes, update `docs/api.md` and mention client impact in the task record.
- When production behavior may change, document the expected effect on `animalapi.wakaka007.cn`.

## Documentation Rules

Keep these documents current as the project grows:

- `docs/product.md`: game goals, core gameplay, player experience, and product decisions.
- `docs/architecture.md`: client/server structure, module boundaries, data flow, and key technical decisions.
- `docs/api.md`: backend API routes, request and response contracts, error conventions, and authentication notes.
- `docs/deployment.md`: gz server deployment, production domain, environment variables, health checks, and rollback notes.
- `docs/platforms.md`: Web, WeChat Mini Game, and Douyin Mini Game constraints and compatibility notes.

Update documentation in the same task that changes the documented behavior.

## Verification

Every completed task must record verification.

If verification commands are not available yet, state that directly in the `done/` record and explain what should be added later.

Current placeholders:

- Client verification: TBD after the Cocos project is created.
- Server verification: TBD after the Node.js project is created.
- Documentation-only verification: review the rendered Markdown or inspect the changed Markdown files.

Do not claim a change is safe without saying what was checked.

## Git Policy

- Work directly on `main`.
- Do not create long-lived feature branches unless explicitly requested.
- Use small, understandable commits.
- Prefer commit messages in concise English, for example `Add agent operating charter`.
- WIP commits are allowed on `main` during agile development, but the task record must clearly state current status, remaining work, and known risk.
- Push to `origin/main` at clear stopping points.
- Never rewrite shared history unless the user explicitly asks for it.

## Security And Production Safety

Never commit:

- Server passwords.
- SSH private keys.
- API tokens.
- Database credentials.
- Real `.env` files.
- Cloud provider secrets.

Before production deployment, server configuration changes, data deletion, or irreversible migration:

1. State the expected impact.
2. State the rollback or recovery plan.
3. Ask for confirmation when the action can affect production data or availability.

## Version Policy

- Record the Cocos Creator / Cocos Engine version once selected.
- Record the Node.js major version once selected.
- Record SDK or platform plugin versions that affect Web, WeChat Mini Game, or Douyin Mini Game builds.
- Do not casually upgrade Cocos, Node.js, build tooling, or platform SDKs.
- Treat version upgrades as separate tasks with their own `todo/` and `done/` records.

Current version status:

- Cocos version: TBD.
- Node.js version: TBD.
- WeChat Mini Game SDK/tooling: TBD.
- Douyin Mini Game SDK/tooling: TBD.
