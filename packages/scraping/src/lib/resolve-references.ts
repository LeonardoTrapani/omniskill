/**
 * Resolve textual cross-references in skill markdown to [[skill:<uuid>]] mentions.
 *
 * Scans for patterns like:
 *  - `skill-name` skill  (backtick slug followed by "skill")
 *  - **REQUIRED SUB-SKILL:** Use namespace:skill-name
 *  - Related Skills section with **slug** or [slug](...)
 *  - "use the `slug` skill" / "works best with the `slug` skill"
 *  - npx skills add owner/repo@skill-name
 *  - https://skills.sh/owner/repo/skill-name
 */

/** Map of slug → uuid, built from all ingested skills */
export type SlugMap = Map<string, string>;

/** Collected reference hit (before replacement) */
interface RefMatch {
  /** The full matched string to replace */
  original: string;
  /** The resolved slug */
  slug: string;
}

// ─── Pattern matchers ────────────────────────────────────────────────────────

/**
 * Pattern 1: backtick slug references like:
 *  - the `design-md` skill
 *  - `copy-editing` skill
 *  - `superpowers:test-driven-development` skill
 */
const BACKTICK_SKILL_RE = /`([a-z0-9-]+(?::[a-z0-9-]+)?)`\s+skill/gi;

/**
 * Pattern 2: REQUIRED SUB-SKILL lines
 *  - **REQUIRED SUB-SKILL:** Use namespace:skill-name
 *  - REQUIRED SUB-SKILL: Use superpowers:finishing-a-development-branch
 */
const REQUIRED_SUBSKILL_RE =
  /\*?\*?REQUIRED SUB-SKILL:?\*?\*?\s*(?:Use\s+)?(?:[a-z0-9-]+:)?([a-z0-9-]+)/gi;

/**
 * Pattern 3: npx skills add owner/repo@skill-name
 */
const NPX_ADD_RE = /npx\s+skills\s+add\s+[a-z0-9_-]+\/[a-z0-9_-]+@([a-z0-9-]+)/gi;

/**
 * Pattern 4: https://skills.sh/owner/repo/skill-name
 */
const SKILLS_SH_URL_RE = /https?:\/\/skills\.sh\/[a-z0-9_-]+\/[a-z0-9_-]+\/([a-z0-9-]+)/gi;

/**
 * Pattern 5: Related Skills section entries like:
 *  - **slug**: description
 *  - [slug](path) — description
 *  - **copy-editing**: For polishing...
 */
const RELATED_SKILL_BOLD_RE = /^-\s+\*\*([a-z0-9-]+)\*\*[:\s]/gim;
const RELATED_SKILL_LINK_RE = /^-\s+\[([a-z0-9-]+)\]\([^)]*\)/gim;

/**
 * Pattern 6: Inline references like:
 *  - "use the **copy-editing** skill"
 *  - "see **programmatic-seo** skill"
 */
const BOLD_SKILL_RE = /\*\*([a-z0-9-]+)\*\*\s+skill/gi;

/**
 * Extract the skill slug, handling optional namespace prefixes like "superpowers:"
 */
function extractSlug(raw: string): string {
  // If it contains a colon (namespace:slug), take the part after the colon
  const colonIdx = raw.lastIndexOf(":");
  return colonIdx >= 0 ? raw.slice(colonIdx + 1) : raw;
}

/**
 * Collect all slug references from the markdown.
 * Does NOT replace — just collects unique slugs found.
 */
function collectRefs(markdown: string): Set<string> {
  const slugs = new Set<string>();

  const patterns: Array<{ re: RegExp; groupIdx: number }> = [
    { re: BACKTICK_SKILL_RE, groupIdx: 1 },
    { re: REQUIRED_SUBSKILL_RE, groupIdx: 1 },
    { re: NPX_ADD_RE, groupIdx: 1 },
    { re: SKILLS_SH_URL_RE, groupIdx: 1 },
    { re: RELATED_SKILL_BOLD_RE, groupIdx: 1 },
    { re: RELATED_SKILL_LINK_RE, groupIdx: 1 },
    { re: BOLD_SKILL_RE, groupIdx: 1 },
  ];

  for (const { re, groupIdx } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(markdown)) !== null) {
      const raw = m[groupIdx]!;
      slugs.add(extractSlug(raw).toLowerCase());
    }
  }

  return slugs;
}

/**
 * Resolve all textual cross-references in the markdown, replacing them with
 * `[[skill:<uuid>]]` format for slugs that exist in the slugMap.
 *
 * Returns the updated markdown string.
 */
export function resolveReferences(markdown: string, slugMap: SlugMap): string {
  // First collect which slugs are actually resolvable
  const foundSlugs = collectRefs(markdown);
  const resolvable = new Map<string, string>();
  for (const slug of foundSlugs) {
    const uuid = slugMap.get(slug);
    if (uuid) resolvable.set(slug, uuid);
  }

  if (resolvable.size === 0) return markdown;

  let result = markdown;

  // Replace backtick references: `slug` skill → [[skill:uuid]]
  result = result.replace(BACKTICK_SKILL_RE, (_match, rawSlug: string) => {
    const slug = extractSlug(rawSlug).toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `[[skill:${uuid}]]` : _match;
  });

  // Replace REQUIRED SUB-SKILL references
  result = result.replace(REQUIRED_SUBSKILL_RE, (match, rawSlug: string) => {
    const slug = extractSlug(rawSlug).toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `**REQUIRED SUB-SKILL:** [[skill:${uuid}]]` : match;
  });

  // Replace npx skills add references
  result = result.replace(NPX_ADD_RE, (match, rawSlug: string) => {
    const slug = extractSlug(rawSlug).toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `[[skill:${uuid}]]` : match;
  });

  // Replace skills.sh URL references
  result = result.replace(SKILLS_SH_URL_RE, (match, rawSlug: string) => {
    const slug = extractSlug(rawSlug).toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `[[skill:${uuid}]]` : match;
  });

  // Replace Related Skills bold references: - **slug**: desc → - [[skill:uuid]]: desc
  result = result.replace(RELATED_SKILL_BOLD_RE, (match, rawSlug: string) => {
    const slug = rawSlug.toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `- [[skill:${uuid}]]` : match;
  });

  // Replace Related Skills link references: - [slug](path) → - [[skill:uuid]]
  result = result.replace(RELATED_SKILL_LINK_RE, (match, rawSlug: string) => {
    const slug = rawSlug.toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `- [[skill:${uuid}]]` : match;
  });

  // Replace bold inline references: **slug** skill → [[skill:uuid]]
  result = result.replace(BOLD_SKILL_RE, (match, rawSlug: string) => {
    const slug = rawSlug.toLowerCase();
    const uuid = resolvable.get(slug);
    return uuid ? `[[skill:${uuid}]]` : match;
  });

  return result;
}

/**
 * Get all referenced slugs from a markdown string (for reporting/debugging).
 */
export function getReferencedSlugs(markdown: string): string[] {
  return [...collectRefs(markdown)];
}
