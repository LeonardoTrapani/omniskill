---
name: unocss
description: UnoCSS instant atomic CSS engine, superset of Tailwind CSS. Use when configuring UnoCSS, writing utility rules, shortcuts, or working with presets like Wind, Icons, Attributify.
metadata:
  author: Anthony Fu
  version: "2026.1.28"
  source: Generated from https://github.com/unocss/unocss, scripts located at https://github.com/antfu/skills
---

UnoCSS is an instant atomic CSS engine designed to be flexible and extensible. The core is un-opinionated - all CSS utilities are provided via presets. It's a superset of Tailwind CSS, so you can reuse your Tailwind knowledge for basic syntax usage.

**Important:** Before writing UnoCSS code, agents should check for `uno.config.*` or `unocss.config.*` files in the project root to understand what presets, rules, and shortcuts are available. If the project setup is unclear, avoid using attributify mode and other advanced features - stick to basic `class` usage.

> The skill is based on UnoCSS 66.x, generated at 2026-01-28.

## Core

| Topic | Description | Reference |
|-------|-------------|-----------|
| Configuration | Config file setup and all configuration options | [core-config](references/core-config.md) |
| Rules | Static and dynamic rules for generating CSS utilities | [[resource:b8ff2dc0-e956-47a9-b801-eb7129193936]] |
| Shortcuts | Combine multiple rules into single shorthands | [core-shortcuts](references/core-shortcuts.md) |
| Theme | Theming system for colors, breakpoints, and design tokens | [[resource:fb91e8db-7dbf-474e-bcce-ca7d6d16cfe1]] |
| Variants | Apply variations like hover:, dark:, responsive to rules | [[resource:d4beafab-df16-49e2-ad30-d42dc3225a26]] |
| Extracting | How UnoCSS extracts utilities from source code | [core-extracting](references/core-extracting.md) |
| Safelist & Blocklist | Force include or exclude specific utilities | [core-safelist](references/core-safelist.md) |
| Layers & Preflights | CSS layer ordering and raw CSS injection | [core-layers](references/core-layers.md) |

## Presets

### Main Presets

| Topic | Description | Reference |
|-------|-------------|-----------|
| Preset Wind3 | Tailwind CSS v3 / Windi CSS compatible preset (most common) | [preset-wind3](references/preset-wind3.md) |
| Preset Wind4 | Tailwind CSS v4 compatible preset with modern CSS features | [[resource:90ddc015-3e5b-4686-921b-03deedfb6f29]] |
| Preset Mini | Minimal preset with essential utilities for custom builds | [preset-mini](references/preset-mini.md) |

### Feature Presets

| Topic | Description | Reference |
|-------|-------------|-----------|
| Preset Icons | Pure CSS icons using Iconify with any icon set | [[resource:f6f6d7ce-c9ac-423e-b5a4-d44fcb8709e3]] |
| Preset Attributify | Group utilities in HTML attributes instead of class | [[resource:b500ad3a-fa22-4f50-a6b4-0a6527d22267]] |
| Preset Typography | Prose classes for typographic defaults | [[resource:d27b9173-d5ea-49cf-8945-0636c58e5e5d]] |
| Preset Web Fonts | Easy Google Fonts and other web fonts integration | [preset-web-fonts](references/preset-web-fonts.md) |
| Preset Tagify | Use utilities as HTML tag names | [preset-tagify](references/preset-tagify.md) |
| Preset Rem to Px | Convert rem units to px for utilities | [[resource:b23a35d2-1ad0-476a-bc97-3d2acfa223fc]] |

## Transformers

| Topic | Description | Reference |
|-------|-------------|-----------|
| Variant Group | Shorthand for grouping utilities with common prefixes | [transformer-variant-group](references/transformer-variant-group.md) |
| Directives | CSS directives: @apply, @screen, theme(), icon() | [[resource:c1738274-f704-42f9-b94b-4524f3a6032d]] |
| Compile Class | Compile multiple classes into one hashed class | [[resource:f59a28d7-e42a-4d65-9683-3970826620cf]] |
| Attributify JSX | Support valueless attributify in JSX/TSX | [[resource:fa0e06cb-daf6-40e0-b6e5-c23b31f6f41f]] |

## Integrations

| Topic | Description | Reference |
|-------|-------------|-----------|
| Vite Integration | Setting up UnoCSS with Vite and framework-specific tips | [integrations-vite](references/integrations-vite.md) |
| Nuxt Integration | UnoCSS module for Nuxt applications | [integrations-nuxt](references/integrations-nuxt.md) |
