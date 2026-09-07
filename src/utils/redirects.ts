import matter from "gray-matter";
import fs from "node:fs";
import path from "node:path";

import { articleUrl, eventUrl, venueUrl } from "./urls/entries";

type Section = {
  dir: string;
  /** File inside each entry folder, or undefined when the collection is flat `*.md`. */
  bundle?: string;
  url: (id: string) => string;
};

const SECTIONS: readonly Section[] = [
  { dir: "content/events", url: eventUrl },
  { dir: "content/venues", bundle: "venue.md", url: venueUrl },
  { dir: "content/articles", bundle: "index.md", url: articleUrl },
];

function entryFiles(root: string, section: Section): { id: string; file: string }[] {
  const dir = path.join(root, section.dir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      if (section.bundle) {
        const file = path.join(dir, entry.name, section.bundle);
        return entry.isDirectory() && fs.existsSync(file) ? [{ id: entry.name, file }] : [];
      }
      if (!entry.isFile() || !entry.name.endsWith(".md")) return [];
      return [{ id: path.basename(entry.name, ".md"), file: path.join(dir, entry.name) }];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The `redirects` table, read straight out of the content's `aliases:` front matter.
 *
 * Sveltia appends an entry's previous public path to `aliases` whenever an editor renames a
 * slug, so a rename can no longer break an inbound link without anyone noticing, and no
 * script ever has to write to `astro.config.ts` again. HTML only: `.ics` has no alias, and
 * under `build.format: "file"` a redirect stub would put a meta-refresh page at a `.ics` URL.
 */
export function buildAliasRedirects(root: string): Record<string, string> {
  const redirects: Record<string, string> = {};
  for (const section of SECTIONS) {
    for (const { id, file } of entryFiles(root, section)) {
      const { aliases } = matter(fs.readFileSync(file, "utf8")).data as { aliases?: unknown };
      if (!Array.isArray(aliases)) continue;
      const target = section.url(id);
      for (const alias of aliases) {
        if (typeof alias !== "string" || !alias.startsWith("/") || alias === target) continue;
        redirects[alias] = target;
      }
    }
  }
  return redirects;
}
