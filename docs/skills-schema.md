# Skills Schema

This document explains how better-skills stores skills as a graph in Postgres with Drizzle.

## Goal

Model skills so they can be:

- Private and user-owned
- Stored with full `SKILL.md` content and parsed metadata
- Split into subfiles (`references`, `scripts`, `assets`, etc.)
- Linked in a many-to-many graph, including resource-level links

## Tables

### `skill`

Core node for a skill.

- `id`: UUID PK
- `owner_user_id`: FK to `user.id`
- `slug`, `name`, `description`
- `skill_markdown`: full raw `SKILL.md` content
- `frontmatter`: parsed YAML frontmatter as JSONB
- `metadata`: app/system metadata as JSONB
- `is_default`: boolean flag for seeded default skills (read-only)
- `source_url`, `source_identifier`
- timestamps (`created_at`, `updated_at`)

Ownership rules:

- Every skill must have an owner (`owner_user_id`)
- Unique slug per owner

### `skill_resource`

Subfiles that belong to a skill.

- `id`: UUID PK
- `skill_id`: FK to `skill.id`
- `path`: relative path inside the skill (example: `references/api.md`)
- `kind`: enum `reference | script | asset | other`
- `content`: raw file content
- `metadata`: JSONB
- timestamps

Rules:

- Unique path per skill (`skill_id + path`)

### `skill_link`

Directed graph edge between polymorphic nodes.

- Source is exactly one of:
  - `source_skill_id`
  - `source_resource_id`
- Target is exactly one of:
  - `target_skill_id`
  - `target_resource_id`
- `kind`: edge label (`related`, `depends_on`, etc.)
- `note`, `metadata`
- `created_by_user_id`, `created_at`

Supported link shapes:

- Skill -> Skill
- Skill -> Resource
- Resource -> Skill
- Resource -> Resource

Important behavior:

- Duplicate edges are allowed by design (multiple links between same nodes)
- Deleting a skill or resource cascades and removes affected edges

## Semantics: `frontmatter` vs `metadata`

- `frontmatter`: user/author-defined structured data parsed from `SKILL.md` YAML
- `metadata`: application-owned enrichment (indexes, ingestion diagnostics, ranking flags, hashes, etc.)

## Mapping from Agent Skill Convention

- `SKILL.md` -> `skill.skill_markdown` + `skill.frontmatter`
- Files under `references/`, `scripts/`, `assets/` -> `skill_resource`
- Cross references between skills/resources -> `skill_link`
