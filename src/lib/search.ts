import Fuse from "fuse.js";
import type { SearchEntry } from "@/lib/types";

/**
 * Fuzzy search over the lesson index. Built per-interaction on the client;
 * entries are shipped once from the server.
 */
export function createSearchFuse(entries: SearchEntry[]) {
  return new Fuse(entries, {
    keys: [
      { name: "title", weight: 0.45 },
      { name: "description", weight: 0.2 },
      { name: "tags", weight: 0.15 },
      { name: "keywords", weight: 0.1 },
      { name: "headings", weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: true,
    shouldSort: true,
  });
}
