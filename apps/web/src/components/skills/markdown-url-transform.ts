import { defaultUrlTransform } from "react-markdown";

export function markdownUrlTransform(url: string) {
  return defaultUrlTransform(url);
}
