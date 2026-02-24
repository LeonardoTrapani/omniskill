# omniscient

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Hono, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Husky** - Git hooks for code quality
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Start a local Postgres instance (for example with Homebrew):

```bash
brew services start postgresql@17
```

2. Sync your connected Neon database into local Postgres:

```bash
bash scripts/sync-neon-to-local.sh
```

3. Apply the schema to your local database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Format and lint fix: `bun run check`

## Project Structure

```
omniscient/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Oxlint and Oxfmt

## CLI distribution

- Installer command used on the landing page: `curl -fsSL https://omniscient.sh/install | bash`
- Installer script source lives at `apps/web/public/install`
- Installer default server URL is `https://server.omniscient.sh` (override with `--server-url` or `SERVER_URL`)
- CLI binaries are published by GitHub Actions workflow `.github/workflows/release-cli.yml`
- To publish a new CLI release, push a semver tag (for example: `git tag v0.1.0 && git push origin v0.1.0`)
