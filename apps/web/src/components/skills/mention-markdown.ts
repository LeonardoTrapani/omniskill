const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

function getMentionTokenRegex() {
  return new RegExp(`\\\\?\\[\\\\?\\[(skill|resource):(${UUID_RE})\\\\?\\]\\\\?\\]`, "gi");
}

function getCustomLinkRegex() {
  return new RegExp(`\\[([^\\]]+)\\]\\((skill|resource):\\/\\/(${UUID_RE})\\)`, "gi");
}

function getCrossResourceRegex() {
  return new RegExp(
    `\\[([^\\]]+)\\]\\(resource:\\/\\/(${UUID_RE})\\)\\s+in\\s+\\[([^\\]]+)\\]\\(skill:\\/\\/(${UUID_RE})\\)`,
    "gi",
  );
}

function normalizeLabel(label: string) {
  const trimmed = label.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeMarkdownLinkLabel(label: string) {
  return label
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

export function storageMarkdownToEditorMarkdown(options: {
  originalMarkdown: string;
  renderedMarkdown?: string | null;
}) {
  const { originalMarkdown, renderedMarkdown } = options;

  const skillLabelById = new Map<string, string>();
  const resourceLabelById = new Map<string, string>();

  if (renderedMarkdown) {
    const crossResourceRegex = getCrossResourceRegex();
    let crossMatch: RegExpExecArray | null;
    while ((crossMatch = crossResourceRegex.exec(renderedMarkdown)) !== null) {
      const resourceLabel = normalizeLabel(crossMatch[1]!);
      const resourceId = crossMatch[2]!.toLowerCase();
      const skillLabel = normalizeLabel(crossMatch[3]!);
      const skillId = crossMatch[4]!.toLowerCase();

      resourceLabelById.set(resourceId, `${resourceLabel} in ${skillLabel}`);
      skillLabelById.set(skillId, skillLabel);
    }

    const customLinkRegex = getCustomLinkRegex();
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = customLinkRegex.exec(renderedMarkdown)) !== null) {
      const label = normalizeLabel(linkMatch[1]!);
      const type = linkMatch[2]!.toLowerCase();
      const targetId = linkMatch[3]!.toLowerCase();

      if (type === "skill" && !skillLabelById.has(targetId)) {
        skillLabelById.set(targetId, label);
      }

      if (type === "resource" && !resourceLabelById.has(targetId)) {
        resourceLabelById.set(targetId, label);
      }
    }
  }

  const mentionTokenRegex = getMentionTokenRegex();

  return originalMarkdown.replace(mentionTokenRegex, (_match, rawType: string, rawId: string) => {
    const type = rawType.toLowerCase() as "skill" | "resource";
    const targetId = rawId.toLowerCase();

    const label = type === "skill" ? skillLabelById.get(targetId) : resourceLabelById.get(targetId);

    if (!label) {
      return `[[${type}:${targetId}]]`;
    }

    return `[${escapeMarkdownLinkLabel(label)}](${type}://${targetId})`;
  });
}

export function editorMarkdownToStorageMarkdown(editorMarkdown: string) {
  const customLinkRegex = getCustomLinkRegex();
  const mentionTokenRegex = getMentionTokenRegex();

  const linkedMentions = editorMarkdown.replace(
    customLinkRegex,
    (_match, _label: string, rawType: string, rawId: string) => {
      const type = rawType.toLowerCase();
      const targetId = rawId.toLowerCase();
      return `[[${type}:${targetId}]]`;
    },
  );

  return linkedMentions.replace(mentionTokenRegex, (_match, rawType: string, rawId: string) => {
    const type = rawType.toLowerCase();
    const targetId = rawId.toLowerCase();
    return `[[${type}:${targetId}]]`;
  });
}
