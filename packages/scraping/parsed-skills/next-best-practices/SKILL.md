---
name: next-best-practices
description: Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling
user-invocable: false
---

# Next.js Best Practices

Apply these rules when writing or reviewing Next.js code.

## File Conventions

See [[resource:91c97669-002f-424f-b4ab-06b64d632649]] for:

- Project structure and special files
- Route segments (dynamic, catch-all, groups)
- Parallel and intercepting routes
- Middleware rename in v16 (middleware → proxy)

## RSC Boundaries

Detect invalid React Server Component patterns.

See [[resource:e5130d9a-d30c-4155-9a8a-537adf8d2d14]] for:

- Async client component detection (invalid)
- Non-serializable props detection
- Server Action exceptions

## Async Patterns

Next.js 15+ async API changes.

See [[resource:04d4f4ab-03ce-47ce-8a59-161c47d1b646]] for:

- Async `params` and `searchParams`
- Async `cookies()` and `headers()`
- Migration codemod

## Runtime Selection

See [[resource:d9d1a87e-1a2c-4c3a-a536-f995fbb84c8c]] for:

- Default to Node.js runtime
- When Edge runtime is appropriate

## Directives

See [directives.md](./directives.md) for:

- `'use client'`, `'use server'` (React)
- `'use cache'` (Next.js)

## Functions

See [[resource:98e4263c-fb2e-467e-9d07-07bdafeaf35a]] for:

- Navigation hooks: `useRouter`, `usePathname`, `useSearchParams`, `useParams`
- Server functions: `cookies`, `headers`, `draftMode`, `after`
- Generate functions: `generateStaticParams`, `generateMetadata`

## Error Handling

See [[resource:d2a22db3-b6b2-4fa5-b2e0-343fd3c50465]] for:

- `error.tsx`, `global-error.tsx`, `not-found.tsx`
- `redirect`, `permanentRedirect`, `notFound`
- `forbidden`, `unauthorized` (auth errors)
- `unstable_rethrow` for catch blocks

## Data Patterns

See [[resource:a849b6ac-4a4e-4d10-8c2c-b4f1dee11c62]] for:

- Server Components vs Server Actions vs Route Handlers
- Avoiding data waterfalls (`Promise.all`, Suspense, preload)
- Client component data fetching

## Route Handlers

See [[resource:08744eb4-19f9-451d-b895-5fc5a5d4743b]] for:

- `route.ts` basics
- GET handler conflicts with `page.tsx`
- Environment behavior (no React DOM)
- When to use vs Server Actions

## Metadata & OG Images

See [[resource:0907bd27-2126-4ffc-909b-2bfda88fffd3]] for:

- Static and dynamic metadata
- `generateMetadata` function
- OG image generation with `next/og`
- File-based metadata conventions

## Image Optimization

See [image.md](./image.md) for:

- Always use `next/image` over `<img>`
- Remote images configuration
- Responsive `sizes` attribute
- Blur placeholders
- Priority loading for LCP

## Font Optimization

See [[resource:f5944037-f586-4c2a-94e6-e3e2bbb20b34]] for:

- `next/font` setup
- Google Fonts, local fonts
- Tailwind CSS integration
- Preloading subsets

## Bundling

See [bundling.md](./bundling.md) for:

- Server-incompatible packages
- CSS imports (not link tags)
- Polyfills (already included)
- ESM/CommonJS issues
- Bundle analysis

## Scripts

See [[resource:b9e54cb7-d718-48ab-a624-93a6eb11acfc]] for:

- `next/script` vs native script tags
- Inline scripts need `id`
- Loading strategies
- Google Analytics with `@next/third-parties`

## Hydration Errors

See [[resource:ca2602e2-64cb-40a2-b8ad-7585168c82a1]] for:

- Common causes (browser APIs, dates, invalid HTML)
- Debugging with error overlay
- Fixes for each cause

## Suspense Boundaries

See [suspense-boundaries.md](./suspense-boundaries.md) for:

- CSR bailout with `useSearchParams` and `usePathname`
- Which hooks require Suspense boundaries

## Parallel & Intercepting Routes

See [parallel-routes.md](./parallel-routes.md) for:

- Modal patterns with `@slot` and `(.)` interceptors
- `default.tsx` for fallbacks
- Closing modals correctly with `router.back()`

## Self-Hosting

See [[resource:cd7dcfa4-5ec0-4dd9-8189-f8ca4c9e7524]] for:

- `output: 'standalone'` for Docker
- Cache handlers for multi-instance ISR
- What works vs needs extra setup

## Debug Tricks

See [[resource:b9332058-9853-45a4-bd98-27886bd9fad9]] for:

- MCP endpoint for AI-assisted debugging
- Rebuild specific routes with `--debug-build-paths`
