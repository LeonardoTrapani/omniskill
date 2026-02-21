# AGENTS.md

React composition guidance index for agents. Keep this file compact and pull detailed rules only when needed.

## Scope

Use this skill when tasks involve:

- refactoring boolean-prop-heavy components
- building reusable component APIs
- designing compound components
- separating state implementation from UI composition

## Priority order

1. `architecture-*` (composition over prop flags)
2. `state-*` (provider-lifted, dependency-injected state)
3. `patterns-*` (explicit variants, children composition)
4. `react19-*` (React 19 API-specific guidance)

## Progressive disclosure

- Start with `SKILL.md` for category overview.
- Read only the relevant files in `rules/`.
- Treat `rules/*.md` as the canonical source.
