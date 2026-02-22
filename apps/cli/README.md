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

Show CLI version:

```bash
bun cli --version
```

Or with file watching via turbo:

```bash
bun run dev:cli
```

## Available commands

- **health check** - ping the API server
- **login** - open browser and complete device-code login
- **who am i** - check current session (requires login)
- **skills list** - browse skills from the registry
- **skills install <slug>** - direct install by slug (all agents)
- **skills install** - interactive search + install with private-first ordering
- **skills sync** - install all private skills (all agents)
