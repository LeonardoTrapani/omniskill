const MIME_BY_EXTENSION: Record<string, string> = {
  md: "text/markdown;charset=utf-8",
  markdown: "text/markdown;charset=utf-8",
  mdx: "text/markdown;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  yaml: "application/yaml;charset=utf-8",
  yml: "application/yaml;charset=utf-8",
  toml: "application/toml;charset=utf-8",
  ini: "text/plain;charset=utf-8",
  sh: "application/x-sh;charset=utf-8",
  bash: "application/x-sh;charset=utf-8",
  zsh: "text/plain;charset=utf-8",
  fish: "text/plain;charset=utf-8",
  js: "text/javascript;charset=utf-8",
  jsx: "text/javascript;charset=utf-8",
  mjs: "text/javascript;charset=utf-8",
  cjs: "text/javascript;charset=utf-8",
  ts: "text/plain;charset=utf-8",
  tsx: "text/plain;charset=utf-8",
  css: "text/css;charset=utf-8",
  scss: "text/css;charset=utf-8",
  less: "text/css;charset=utf-8",
  html: "text/html;charset=utf-8",
  htm: "text/html;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  sql: "application/sql;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  py: "text/x-python;charset=utf-8",
  rb: "text/plain;charset=utf-8",
  go: "text/plain;charset=utf-8",
  rs: "text/plain;charset=utf-8",
  java: "text/plain;charset=utf-8",
  kt: "text/plain;charset=utf-8",
  swift: "text/plain;charset=utf-8",
  php: "text/plain;charset=utf-8",
  c: "text/plain;charset=utf-8",
  h: "text/plain;charset=utf-8",
  cpp: "text/plain;charset=utf-8",
  hpp: "text/plain;charset=utf-8",
  cs: "text/plain;charset=utf-8",
  svg: "image/svg+xml;charset=utf-8",
};

function getExtension(filePath: string) {
  const normalizedPath = filePath.trim().replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").filter(Boolean).at(-1) ?? "";
  const extension = fileName.split(".").at(-1)?.toLowerCase();

  if (!extension || extension === fileName.toLowerCase()) {
    return null;
  }

  return extension;
}

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);

export function canRenderResourceAsMarkdown(path: string, kind: string) {
  if (kind === "asset") {
    return false;
  }

  const extension = getExtension(path);
  if (!extension) {
    return false;
  }

  return MARKDOWN_EXTENSIONS.has(extension);
}

export function getResourceMimeType(path: string) {
  const extension = getExtension(path);
  if (!extension) {
    return "text/plain;charset=utf-8";
  }

  return MIME_BY_EXTENSION[extension] ?? "text/plain;charset=utf-8";
}

export function getResourceDownloadName(path: string, fallback = "resource.txt") {
  const normalizedPath = path.trim().replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").filter(Boolean).at(-1);

  if (!fileName) {
    return fallback;
  }

  return fileName.replace(/[<>:"/\\|?*]/g, "-");
}
