---
name: nuxt
description: Nuxt full-stack Vue framework with SSR, auto-imports, and file-based routing. Use when working with Nuxt apps, server routes, useFetch, middleware, or hybrid rendering.
metadata:
  author: Anthony Fu
  version: "2026.1.28"
  source: Generated from https://github.com/nuxt/nuxt, scripts located at https://github.com/antfu/skills
---

Nuxt is a full-stack Vue framework that provides server-side rendering, file-based routing, auto-imports, and a powerful module system. It uses Nitro as its server engine for universal deployment across Node.js, serverless, and edge platforms.

> The skill is based on Nuxt 3.x, generated at 2026-01-28.

## Core

| Topic | Description | Reference |
|-------|-------------|-----------|
| Directory Structure | Project folder structure, conventions, file organization | [core-directory-structure](references/core-directory-structure.md) |
| Configuration | nuxt.config.ts, app.config.ts, runtime config, environment variables | [core-config](references/core-config.md) |
| CLI Commands | Dev server, build, generate, preview, and utility commands | [[resource:abccfa1e-9cb2-4fea-a276-f2925ad8fbbe]] |
| Routing | File-based routing, dynamic routes, navigation, middleware, layouts | [[resource:b82171f7-21bb-46f1-bf7f-b3e9c5ce2742]] |
| Data Fetching | useFetch, useAsyncData, $fetch, caching, refresh | [core-data-fetching](references/core-data-fetching.md) |
| Modules | Creating and using Nuxt modules, Nuxt Kit utilities | [[resource:bdb37ada-80f4-4310-ae9e-aafe713b9635]] |
| Deployment | Platform-agnostic deployment with Nitro, Vercel, Netlify, Cloudflare | [[resource:bed2591d-916c-471f-8372-842669adab07]] |

## Features

| Topic | Description | Reference |
|-------|-------------|-----------|
| Composables Auto-imports | Vue APIs, Nuxt composables, custom composables, utilities | [[resource:d9553b09-6582-422c-8153-99b9b29a6ea7]] |
| Components Auto-imports | Component naming, lazy loading, hydration strategies | [features-components-autoimport](references/features-components-autoimport.md) |
| Built-in Components | NuxtLink, NuxtPage, NuxtLayout, ClientOnly, and more | [features-components](references/features-components.md) |
| State Management | useState composable, SSR-friendly state, Pinia integration | [features-state](references/features-state.md) |
| Server Routes | API routes, server middleware, Nitro server engine | [[resource:fe8bb50f-c564-4a2e-9aca-cd9390fe445e]] |

## Rendering

| Topic | Description | Reference |
|-------|-------------|-----------|
| Rendering Modes | Universal (SSR), client-side (SPA), hybrid rendering, route rules | [rendering-modes](references/rendering-modes.md) |

## Best Practices

| Topic | Description | Reference |
|-------|-------------|-----------|
| Data Fetching Patterns | Efficient fetching, caching, parallel requests, error handling | [best-practices-data-fetching](references/best-practices-data-fetching.md) |
| SSR & Hydration | Avoiding context leaks, hydration mismatches, composable patterns | [[resource:bef12f4a-38d4-4fa6-b6da-afcd6b58a9ba]] |

## Advanced

| Topic | Description | Reference |
|-------|-------------|-----------|
| Layers | Extending applications with reusable layers | [advanced-layers](references/advanced-layers.md) |
| Lifecycle Hooks | Build-time, runtime, and server hooks | [advanced-hooks](references/advanced-hooks.md) |
| Module Authoring | Creating publishable Nuxt modules with Nuxt Kit | [advanced-module-authoring](references/advanced-module-authoring.md) |
