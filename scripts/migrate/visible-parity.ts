/**
 * `tsx scripts/migrate/visible-parity.ts <baseline-dir>` — the companion gate for the
 * content migration steps that necessarily change dist.
 *
 * Rewriting front matter changes two things that no reader can see: the serialised
 * `props` of every `<astro-island>` (the raw entry data is passed to the React islands)
 * and the content hash in every `_astro/<name>.<hash>.js` filename (any touched module
 * re-hashes its chunk and every page that references it). `npm run parity:check` reports
 * those as differences; this script normalises both away and compares what is left, so a
 * step can prove it changed no rendered markup.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ASSET_HASH = /\.[A-Za-z0-9_-]{8}\.(js|css|webp|jpg|png|svg|woff2)/g;
const ISLAND_PROPS = /(<astro-island\b[^>]*?\sprops=")[^"]*(")/g;
/** Astro derives an island's `uid` from its props, so it moves with them. */
const ISLAND_UID = /(<astro-island\b[^>]*?\suid=")[^"]*(")/g;
/** The `.ics` DTSTAMP and the footer "Built with <3" tooltip carry the build's wall clock. */
const BUILD_CLOCK = /(^DTSTAMP:.*$)|(data-tip="\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}")/gm;

function normalise(text: string): string {
  return text
    .replace(ISLAND_PROPS, "$1$2")
    .replace(ISLAND_UID, "$1$2")
    .replace(ASSET_HASH, ".HASH.$1")
    .replace(BUILD_CLOCK, "CLOCK");
}

function digest(file: string): string {
  return crypto
    .createHash("sha256")
    .update(normalise(fs.readFileSync(file, "utf8")))
    .digest("hex");
}

function walk(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(html|ics|xml|txt)$/.test(entry.name)) out.push(path.relative(root, full));
    }
  };
  visit(root);
  return out.sort();
}

const baseDir = path.resolve(process.argv[2] ?? "/tmp/base-html");
const distDir = path.resolve("dist");
const before = new Set(walk(baseDir));
const after = walk(distDir);

const added = after.filter((file) => !before.has(file));
const removed = [...before].filter((file) => !after.includes(file));
const changed = after.filter((file) => before.has(file) && digest(path.join(baseDir, file)) !== digest(path.join(distDir, file))); // prettier-ignore

for (const [label, files] of [
  ["Added", added],
  ["Removed", removed],
  ["Changed", changed],
] as const) {
  if (files.length)
    console.log(`\n${label}: ${files.length}\n  ${files.slice(0, 40).join("\n  ")}`);
}

const total = added.length + removed.length + changed.length;
console.log(total ? `\nVisible parity FAILED: ${total} file(s)` : "\nVisible parity OK");
process.exit(total ? 1 : 0);
