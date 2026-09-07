/**
 * `tsx scripts/migrate/aliases.ts` — step (e) of the content migration.
 *
 * Moves the 30 literal `/events/...` redirects out of `astro.config.ts` and into the
 * `aliases:` front matter of the entries they point at, which is where Sveltia writes them
 * from now on. Reads the pairs out of `astro.config.ts` itself, so it cannot drift from
 * what is actually configured; the config keeps only the `discord` literal and a spread of
 * `buildAliasRedirects()`, which this script does not edit. Idempotent.
 */
import fs from "node:fs";
import path from "node:path";

import { EVENT_KEY_ORDER, ROOT, eventFiles, report, rewrite } from "./frontMatter";

const PAIR = /"(\/events\/[^"]+)":\s*\n?\s*"(\/events\/[^"]+)"/g;

const config = fs.readFileSync(path.join(ROOT, "astro.config.ts"), "utf8");
const byTarget = new Map<string, string[]>();
for (const [, alias, target] of config.matchAll(PAIR)) {
  const id = target!.replace("/events/", "");
  byTarget.set(id, [...(byTarget.get(id) ?? []), alias!]);
}
console.log(`[aliases] ${[...byTarget.values()].flat().length} literal redirect(s) in the config`);

const files = eventFiles();
const missing: string[] = [];
const changed = files.filter((file) =>
  rewrite(file, EVENT_KEY_ORDER, (data) => {
    const incoming = byTarget.get(path.basename(file, ".md"));
    if (!incoming) return;
    const existing = Array.isArray(data.aliases) ? (data.aliases as string[]) : [];
    data.aliases = [...existing, ...incoming.filter((alias) => !existing.includes(alias))];
  }),
).length;

for (const id of byTarget.keys()) {
  if (!files.some((file) => path.basename(file, ".md") === id)) missing.push(id);
}
report("aliases", changed, files.length);
if (missing.length) {
  console.error(`[aliases] ${missing.length} redirect target(s) have no event: ${missing}`);
  process.exitCode = 1;
}
