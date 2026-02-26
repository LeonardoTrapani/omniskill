# Flow: Other CLI Operations

Use this for auth, connectivity, discovery commands, import/clone/delete, sync, config, validation, and backup plan/apply.

## Read first

- [[resource:new:references/commands/other-commands.md]]

## Steps

1. Preflight if API access is needed:
   - `better-skills health`
   - `better-skills whoami` (or `better-skills login`)
2. Run requested command.
3. Return concise result + any next action.

## Safety defaults

- Keep delete confirmation behavior.
- For advisory tasks, propose before mutation unless user explicitly asked to execute.
