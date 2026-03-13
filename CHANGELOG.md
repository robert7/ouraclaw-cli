# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added a standalone `oura-cli-p` CLI with JSON-first commands for setup, auth, fetch, config, baseline management, and
  morning/evening summaries.
- Added hardened OAuth helpers with `state`, PKCE, explicit `127.0.0.1` callback binding, and timeout cleanup.
- Added local state management at `$HOME/.oura-cli-p/oura-cli-p.json`, including migration from the old OpenClaw plugin
  config path and private file-permission enforcement.
- Added baseline and threshold decision logic for `summary morning-optimized`.
- Added Vitest coverage for state migration, OAuth behavior, Oura fetch requests, baseline computation, thresholds, and
  summary flows.
- Added packaged OpenClaw skill tooling under `skills/` plus a ClawHub upload helper.

### Changed

- Converted the project from an OpenClaw plugin package into a standalone CLI package that ships an optional skill.
- Rewrote `skills/oura/SKILL.md` to invoke `oura-cli-p` directly instead of relying on an `oura_data` plugin tool.
- Replaced plugin-centric README/docs with standalone CLI architecture and command guides.

### Removed

- Removed OpenClaw plugin registration, tool wiring, and cron-management runtime files from the shipped architecture.
