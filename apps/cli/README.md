# cli

Omniscient command-line interface built with `@clack/prompts` and connected to the API via tRPC.

## Setup

```bash
bun install
```

Create `apps/cli/.env` (optional — defaults to local dev server):

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

- **health check** — ping the API server
- **who am i** — check current session (requires auth)
- **list skills** — browse public skills from the registry
