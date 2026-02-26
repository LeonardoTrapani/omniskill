export function transformOutsideMarkdownCode(
  markdown: string,
  transform: (segment: string) => string,
): string {
  const lines = markdown.split("\n");
  let inFence = false;
  let fenceMarker: "`" | "~" | null = null;

  const transformedLines = lines.map((line) => {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const marker = fenceMatch[1]![0] as "`" | "~";

      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
        return line;
      }

      if (fenceMarker === marker) {
        inFence = false;
        fenceMarker = null;
      }

      return line;
    }

    if (inFence) {
      return line;
    }

    const parts = line.split(/(`[^`]*`)/g);
    return parts
      .map((part) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return part;
        }

        return transform(part);
      })
      .join("");
  });

  return transformedLines.join("\n");
}
