---
name: pnpm
description: Node.js package manager with strict dependency resolution. Use when running pnpm specific commands, configuring workspaces, or managing dependencies with catalogs, patches, or overrides.
metadata:
  author: Anthony Fu
  version: "2026.1.28"
  source: Generated from https://github.com/pnpm/pnpm, scripts located at https://github.com/antfu/skills
---

pnpm is a fast, disk space efficient package manager. It uses a content-addressable store to deduplicate packages across all projects on a machine, saving significant disk space. pnpm enforces strict dependency resolution by default, preventing phantom dependencies. Configuration should preferably be placed in `pnpm-workspace.yaml` for pnpm-specific settings.

**Important:** When working with pnpm projects, agents should check for `pnpm-workspace.yaml` and `.npmrc` files to understand workspace structure and configuration. Always use `--frozen-lockfile` in CI environments.

> The skill is based on pnpm 10.x, generated at 2026-01-28.

## Core

| Topic | Description | Reference |
|-------|-------------|-----------|
| CLI Commands | Install, add, remove, update, run, exec, dlx, and workspace commands | [[resource:c90f345b-a3b2-47be-a565-81ab24032aac]] |
| Configuration | pnpm-workspace.yaml, .npmrc settings, and package.json fields | [[resource:08ea503c-1280-4d46-8e4b-531e767e732b]] |
| Workspaces | Monorepo support with filtering, workspace protocol, and shared lockfile | [core-workspaces](references/core-workspaces.md) |
| Store | Content-addressable storage, hard links, and disk efficiency | [core-store](references/core-store.md) |

## Features

| Topic | Description | Reference |
|-------|-------------|-----------|
| Catalogs | Centralized dependency version management for workspaces | [[resource:07bed1ab-2832-4b4c-883e-bbf52550cf9e]] |
| Overrides | Force specific versions of dependencies including transitive | [features-overrides](references/features-overrides.md) |
| Patches | Modify third-party packages with custom fixes | [features-patches](references/features-patches.md) |
| Aliases | Install packages under custom names using npm: protocol | [features-aliases](references/features-aliases.md) |
| Hooks | Customize resolution with .pnpmfile.cjs hooks | [features-hooks](references/features-hooks.md) |
| Peer Dependencies | Auto-install, strict mode, and dependency rules | [features-peer-deps](references/features-peer-deps.md) |

## Best Practices

| Topic | Description | Reference |
|-------|-------------|-----------|
| CI/CD Setup | GitHub Actions, GitLab CI, Docker, and caching strategies | [[resource:fc8a2eca-e528-4719-a8e5-f10eab3f9b3a]] |
| Migration | Migrating from npm/Yarn, handling phantom deps, monorepo migration | [[resource:a2a3f348-5a56-4255-a8e1-292e0a486a4e]] |
| Performance | Install optimizations, store caching, workspace parallelization | [[resource:9a818d74-72e6-470b-a489-30f070b35a4a]] |
