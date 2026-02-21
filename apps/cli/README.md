# cli

Omniscient command-line interface built with `@clack/prompts` and connected to the API via tRPC.

## Setup

```bash
bun install
```

Create `apps/cli/.env` (optional - defaults to local dev server):

```
SERVER_URL=http://localhost:3000
```

## Run

```bash
bun cli
```

Or with file watching via turbo:

```bash
bun run dev:cli
```

## Available commands

- **health check** - ping the API server
- **who am i** - check current session (requires auth)
- **skills list** - browse skills from the registry
- **skills install <slug>** - direct install by slug (defaults to all agents)
- **skills install** - interactive search + install with private-first ordering
- **skills sync** - install all private skills (defaults to all agents)
