import { defaultUrlTransform } from "react-markdown";

export function markdownUrlTransform(url: string) {
  if (url.toLowerCase().startsWith("resource://")) {
    return url;
  }

  return defaultUrlTransform(url);
}
