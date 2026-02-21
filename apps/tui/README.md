# native (CLI)

Omniscient command-line interface built with `@clack/prompts` and connected to the API via tRPC.

## Setup

```bash
bun install
```

Create `apps/tui/.env` (optional — defaults to local dev server):

```
SERVER_URL=http://localhost:3000
```

## Run

```bash
bun run dev:native
```

## Available commands

- **health check** — ping the API server
- **who am i** — check current session (requires auth)
- **list skills** — browse public skills from the registry
