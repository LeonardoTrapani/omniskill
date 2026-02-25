# Guidelines: Mention and Linking

Use this for mention semantics and graph-link expectations.

## Mention forms

Final persisted mentions:

- \[[skill:<uuid>]]
- \[[resource:<uuid>]]

Local authoring draft mentions (CLI resolves):

- \[[skill:new:path/to/file]]
- \[[resource:new:path/to/file]]

## Draft mention rules

- Draft mentions are for local resource paths under `references/`, `scripts/`, or `assets/`.
- If path does not exist locally, validation should fail before mutation.
- Resolved form becomes \[[resource:<uuid>]] after create/update finalization.

## Parsing nuance

- Mention examples inside inline code or fenced code blocks are documentation, not active mentions.
- A leading backslash escapes a mention token (example: \[[skill:new:path/to/file]]).
- Escaped mention tokens are ignored for parsing/replacement; rendered markdown drops that backslash.
- Use code blocks freely for examples.

## Update behavior

- Local folder is desired state for resources.
- Removed local file -> removed remote resource.
- Renamed file path -> delete old + create new.
