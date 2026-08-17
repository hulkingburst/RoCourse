/**
 * Glossary of Luau/Roblox concepts used inside lesson prose. The `p` and `li`
 * MDX overrides scan text for these terms and wrap matches in an interactive
 * `GlossaryTerm` popover. Definitions (title/body) live in the i18n messages
 * under `glossary.defs.<id>`, so every term is translated.
 */

export interface GlossaryDef {
  /** i18n key under `glossary.defs.<id>` (title + body). */
  id: string;
  /** Case-insensitive terms to match in prose. */
  match: string[];
  /** Optional lesson slug for a "learn more" link. */
  lesson?: string;
}

export const GLOSSARY_DEFS: GlossaryDef[] = [
  { id: "part", match: ["part"], lesson: "workspace-parts" },
  { id: "instance", match: ["instance"], lesson: "instances" },
  { id: "instancing", match: ["instancing"], lesson: "instances" },
  { id: "workspace", match: ["workspace"], lesson: "workspace-parts" },
  { id: "script", match: ["script"], lesson: "scripts" },
  { id: "local-script", match: ["local script"], lesson: "scripts" },
  { id: "module-script", match: ["module script"], lesson: "modules" },
  { id: "variable", match: ["variable"], lesson: "variables" },
  { id: "function", match: ["function"], lesson: "functions" },
  { id: "table", match: ["table"], lesson: "tables" },
  { id: "array", match: ["array"], lesson: "tables" },
  { id: "dictionary", match: ["dictionary", "dictionaries"], lesson: "tables" },
  { id: "loop", match: ["loop"], lesson: "loops" },
  { id: "for-loop", match: ["for loop"], lesson: "for-loops" },
  { id: "while-loop", match: ["while loop"], lesson: "loops" },
  { id: "if-statement", match: ["if statement"], lesson: "conditionals" },
  { id: "condition", match: ["condition"], lesson: "conditionals" },
  { id: "operator", match: ["operator"], lesson: "numbers" },
  { id: "event", match: ["event"], lesson: "events" },
  { id: "event-handler", match: ["event handler"], lesson: "events" },
  { id: "tween", match: ["tween"], lesson: "tweens" },
  { id: "cframe", match: ["cframe"], lesson: "vector3-cframe" },
  { id: "vector3", match: ["vector3"], lesson: "vector3-cframe" },
  { id: "property", match: ["property", "properties"], lesson: "studio-interface" },
  { id: "player", match: ["player"], lesson: "players" },
  { id: "leaderstats", match: ["leaderstats"], lesson: "leaderstats" },
  { id: "datastore", match: ["datastore"], lesson: "datastores" },
  { id: "remote-event", match: ["remote event"], lesson: "remotes" },
  { id: "debounce", match: ["debounce"], lesson: "events" },
  { id: "vector", match: ["vector"], lesson: "vector3-cframe" },
  { id: "raycast", match: ["raycast", "raycasting"], lesson: "raycasting" },
  { id: "particle-emitter", match: ["particle emitter"], lesson: "particle-effects" },
  { id: "proximity-prompt", match: ["proximity prompt"], lesson: "proximity-prompt" },
  { id: "pcall", match: ["pcall"], lesson: "pcall" },
  { id: "string-pattern", match: ["string pattern", "pattern matching"], lesson: "string-patterns" },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addVariants(map: Map<string, GlossaryDef>, term: string, def: GlossaryDef): void {
  const key = term.toLowerCase();
  if (!map.has(key)) map.set(key, def);
  // Regular plurals ("parts", "loops") are matched automatically.
  if (!map.has(key + "s")) map.set(key + "s", def);
  if (!map.has(key + "es")) map.set(key + "es", def);
}

/** Maps a lowercased matched variant back to its glossary definition. */
export const GLOSSARY_VARIANT_TO_DEF: ReadonlyMap<string, GlossaryDef> = (() => {
  const map = new Map<string, GlossaryDef>();
  for (const def of GLOSSARY_DEFS) {
    for (const term of def.match) addVariants(map, term, def);
  }
  return map;
})();

/**
 * Combined matcher over every glossary variant, longest first so phrases like
 * "for loops" win over "loop". Boundaries keep "part" out of "departure" and
 * "Instance" from matching inside "Instance.new" code.
 */
export const GLOSSARY_RE = (() => {
  const variants = [...GLOSSARY_VARIANT_TO_DEF.keys()].sort(
    (a, b) => b.length - a.length
  );
  const pattern = variants.map(escapeRegExp).join("|");
  return new RegExp(`(?<![A-Za-z0-9_])(${pattern})(?![A-Za-z0-9_])`, "gi");
})();
