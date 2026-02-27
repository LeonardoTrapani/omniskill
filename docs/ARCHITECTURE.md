# Web Frontend Architecture

This package follows a feature-first structure.

## Top-level rules

- `app/`: routing, layout composition, and page entrypoints only.
- `features/`: domain modules that own behavior, feature UI, and feature-local helpers.
- `shared/`: cross-feature infrastructure and primitives.

## `features/`

- `features/dashboard`: vault dashboard UI, modal flows, dashboard state.
- `features/skills`: skill detail/edit/resource UI, markdown/graph rendering, skill hooks/lib.
- `features/landing`: marketing/public browsing components and landing-specific server helpers.
- `features/navigation`: navbar, user menu, command palette, navigation shell components.

Use feature-local imports inside each feature when possible. Export only stable surface areas at
feature boundaries.

## `shared/`

- `shared/ui`: design-system primitives (buttons, dialogs, fields, etc).
- `shared/components`: reusable composites not owned by a single feature.
- `shared/providers`: root providers (theme, react-query, toaster).
- `shared/auth`: auth client and server auth helpers.
- `shared/api`: shared tRPC client + query client wiring.
- `shared/lib`: generic framework-agnostic utilities.
- `shared/hooks`: cross-feature hooks (keep feature-specific hooks in their feature).

## Migration policy

- Do not add new files under legacy roots like `components/`, `lib/`, or `utils/`.
- Place new code in `features/*` or `shared/*` based on ownership.
- Keep user-facing behavior and visuals unchanged unless explicitly requested.
