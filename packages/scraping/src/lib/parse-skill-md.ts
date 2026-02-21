import matter from "gray-matter";

export interface ParsedSkill {
  /** YAML frontmatter as key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Skill name from frontmatter */
  name: string;
  /** Skill description from frontmatter */
  description: string;
  /** Markdown body without the frontmatter block */
  markdown: string;
}

/**
 * Parse a SKILL.md file content into structured frontmatter + markdown body.
 * Uses gray-matter to extract YAML frontmatter delimited by `---`.
 */
export function parseSkillMd(raw: string): ParsedSkill {
  const { data, content } = matter(raw);

  const name = typeof data.name === "string" ? data.name : "";
  const description = typeof data.description === "string" ? data.description : "";

  return {
    frontmatter: data as Record<string, unknown>,
    name,
    description,
    markdown: content.trim(),
  };
}
