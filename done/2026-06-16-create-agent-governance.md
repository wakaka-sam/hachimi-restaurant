# Create Agent Governance

## Background

This repository will be primarily maintained by agents. It needs durable rules so future agents can understand project context, repository structure, task tracking, verification, and Git workflow without relying on chat history.

## Goal

Create the initial `AGENTS.md` framework and supporting repository directories for a Cocos client, Node.js backend, task records, and documentation.

## Scope

- Define repository-level agent operating rules.
- Create placeholder directories and README files for `client/`, `server/`, `todo/`, `done/`, and `docs/`.
- Record the confirmed project assumptions:
  - Cocos frontend.
  - Node.js backend.
  - Web short-term release target.
  - WeChat Mini Game and Douyin Mini Game long-term targets.
  - gz server backend deployment.
  - `animalapi.wakaka007.cn` backend API domain.
  - direct development on `main`.

## Acceptance Criteria

- `AGENTS.md` exists at repository root.
- `todo/` and `done/` conventions are documented.
- Cross-platform and mobile UI constraints are documented.
- Backend deployment boundary and security rules are documented.
- Documentation entry points are present.

## Completed Work

- Added `AGENTS.md`.
- Added placeholder README files under `client/`, `server/`, `todo/`, and `done/`.
- Added documentation entry points under `docs/`.

## Verification

- Documentation-only change.
- Verified by inspecting changed Markdown files and Git status.

## Key Commits

- This record is included in the commit that adds the initial agent operating charter.

## Follow-ups

- Create the actual Cocos project under `client/`.
- Create the actual Node.js backend under `server/`.
- Fill in concrete Cocos, Node.js, build, test, and deployment commands.
