import { defaultUrlTransform } from "react-markdown";

export function markdownUrlTransform(url: string) {
  const lower = url.toLowerCase();
  if (lower.startsWith("resource://") || lower.startsWith("skill://")) {
    return url;
  }

  return defaultUrlTransform(url);
}
