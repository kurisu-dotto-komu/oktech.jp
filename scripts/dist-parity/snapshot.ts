import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Extensions whose bytes are hashed; every other file is compared by presence only. */
const HASHED_EXTENSIONS = [".html", ".ics", ".xml", ".txt"];

/**
 * Values that change on every build regardless of content. Without masking them the gate
 * reports all 231 html and 194 ics files as changed even when nothing was edited.
 */
const NONDETERMINISTIC = [
  /\suid="[^"]*"/g, // astro-island hydration id
  /DTSTAMP:\d{8}T\d{6}Z/g, // ICS generation stamp (src/utils/ics.ts)
  /data-tip="\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}/g, // build clock (BuiltWithCommit.tsx)
];

function hashContent(file: string): string {
  const text = NONDETERMINISTIC.reduce(
    (acc, pattern) => acc.replace(pattern, ""),
    fs.readFileSync(file, "utf8"),
  );
  return createHash("sha256").update(text).digest("hex");
}

export const SNAPSHOT_FILE = ".parity/before.json";

export type Snapshot = {
  createdAt: string;
  fileCount: number;
  /** dist-relative path -> sha256 of the file, or null when the extension is not hashed */
  files: Record<string, string | null>;
};

function walk(dir: string, base: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

export function readDist(distDir: string): Snapshot {
  if (!fs.existsSync(distDir)) throw new Error(`No dist directory at ${distDir} — build first`);
  const paths = walk(distDir, distDir, []).sort();
  const files: Record<string, string | null> = {};
  for (const rel of paths) {
    files[rel] = HASHED_EXTENSIONS.includes(path.extname(rel))
      ? hashContent(path.join(distDir, rel))
      : null;
  }
  return { createdAt: new Date().toISOString(), fileCount: paths.length, files };
}

export function writeSnapshot(file: string, snapshot: Snapshot): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
}

export function readSnapshot(file: string): Snapshot {
  if (!fs.existsSync(file)) {
    throw new Error(`No snapshot at ${file} — run "npm run parity:snapshot" on the baseline build`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot;
}

export function summarise(snapshot: Snapshot): string {
  const counts = new Map<string, number>();
  for (const rel of Object.keys(snapshot.files)) {
    const ext = path.extname(rel) || "(none)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([ext, count]) => `${ext} ${count}`)
    .join(", ");
}
