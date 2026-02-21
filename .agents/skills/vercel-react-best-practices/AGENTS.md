# AGENTS.md

React and Next.js performance guidance index for agents. Keep this file compact and load rule details only when relevant.

## Scope

Use this skill when tasks involve:

- eliminating async waterfalls
- reducing bundle size
- optimizing server and client rendering paths
- reducing unnecessary rerenders
- improving JS hot paths in React/Next code

## Priority order

1. `async-*` (waterfalls)
2. `bundle-*` (bundle size)
3. `server-*` (server/RSC performance)
4. `client-*` (client-side fetching/listeners/storage)
5. `rerender-*` (state/effect/memo patterns)
6. `rendering-*` (hydration/paint/layout behavior)
7. `js-*` (loop/lookup micro-optimizations)
8. `advanced-*` (situational patterns)

## Progressive disclosure

- Start with `SKILL.md` for category summaries and quick references.
- Read only matching files in `rules/` for the task at hand.
- Treat `rules/*.md` as the source of truth.
