/**
 * `npm run parity:snapshot` / `npm run parity:check` — the migration gate.
 *
 * snapshot: records every path in dist plus the sha256 of every .html/.ics/.xml/.txt.
 * check:    diffs the current dist against that snapshot (it never builds) and fails on
 *           any added, removed or changed file that no --allow glob matches.
 */
import path from "node:path";

import { createMatcher, parseAllowList } from "./dist-parity/glob";
import {
  SNAPSHOT_FILE,
  type Snapshot,
  readDist,
  readSnapshot,
  summarise,
  writeSnapshot,
} from "./dist-parity/snapshot";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const SNAPSHOT_PATH = path.resolve(process.cwd(), SNAPSHOT_FILE);
const MAX_LISTED = 40;

type Diff = { added: string[]; removed: string[]; changed: string[] };

function diff(before: Snapshot, after: Snapshot): Diff {
  const added = Object.keys(after.files).filter((file) => !(file in before.files));
  const removed = Object.keys(before.files).filter((file) => !(file in after.files));
  const changed = Object.keys(after.files).filter(
    (file) => file in before.files && before.files[file] !== after.files[file],
  );
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

function report(label: string, files: string[], allowed: (file: string) => boolean): number {
  const offenders = files.filter((file) => !allowed(file));
  if (files.length === 0) return 0;
  const waived = files.length - offenders.length;
  console.log(`\n${label}: ${files.length}${waived ? ` (${waived} allowed)` : ""}`);
  for (const file of offenders.slice(0, MAX_LISTED)) console.log(`  ${file}`);
  if (offenders.length > MAX_LISTED) console.log(`  … and ${offenders.length - MAX_LISTED} more`);
  return offenders.length;
}

function readAllowGlobs(argv: string[]): string[] {
  const globs: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== "--allow") continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error("--allow needs a comma-separated glob");
    globs.push(...parseAllowList(value));
    i += 1;
  }
  return globs;
}

function snapshot(): void {
  const current = readDist(DIST_DIR);
  writeSnapshot(SNAPSHOT_PATH, current);
  console.log(`Wrote ${SNAPSHOT_FILE}: ${current.fileCount} files`);
  console.log(`  ${summarise(current)}`);
}

function check(argv: string[]): void {
  const allowGlobs = readAllowGlobs(argv);
  const allowed = createMatcher(allowGlobs);
  const before = readSnapshot(SNAPSHOT_PATH);
  const after = readDist(DIST_DIR);
  const { added, removed, changed } = diff(before, after);

  console.log(`Baseline ${before.fileCount} files (${before.createdAt})`);
  console.log(`Current  ${after.fileCount} files`);
  if (allowGlobs.length) console.log(`Allowed  ${allowGlobs.join(", ")}`);

  const offenders =
    report("Added", added, allowed) +
    report("Removed", removed, allowed) +
    report("Changed", changed, allowed);

  if (offenders > 0) {
    console.error(`\nParity FAILED: ${offenders} unexpected difference(s) in dist.`);
    process.exit(1);
  }
  const waived = added.length + removed.length + changed.length;
  console.log(
    `\nParity OK${waived ? ` (${waived} difference(s), all allowed)` : " — dist is byte-identical."}`,
  );
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "snapshot") snapshot();
  else if (command === "check") check(rest);
  else {
    console.log("Usage: tsx scripts/dist-parity.ts snapshot");
    console.log("       tsx scripts/dist-parity.ts check [--allow <glob>[,<glob>]]");
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
