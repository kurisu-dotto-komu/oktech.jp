/**
 * Fixture driver for the CMS CRUD round-trip test.
 *
 * `write` materialises the entries Sveltia CMS would commit, `clean` removes them,
 * and `run` performs the full create -> build -> assert -> delete -> rebuild -> assert
 * cycle, always cleaning up the working tree even when the assertions fail.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import matter from "gray-matter";
import path from "path";

import { CMS_FIXTURES } from "../test/fixtures/cms/fixtures";

const ROOT = path.resolve(import.meta.dirname, "..");
const BIN = path.join(ROOT, "node_modules", ".bin");
const SPEC = "test/e2e/cms-crud.spec.ts";

const entryFile = (contentPath: string) => path.join(ROOT, "content", contentPath);

/** What `clean` deletes: the bundle folder for page bundles, the file itself for flat entries. */
const fixtureRoot = (contentPath: string) => {
  const segments = contentPath.split("/");
  return entryFile(segments.length > 2 ? segments.slice(0, -1).join("/") : contentPath);
};

function write() {
  for (const fixture of CMS_FIXTURES) {
    const file = entryFile(fixture.contentPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, matter.stringify(`\n${fixture.body}\n`, fixture.frontmatter));
    console.log(`[cms-fixture] wrote ${path.relative(ROOT, file)}`);
  }
}

function clean() {
  for (const fixture of CMS_FIXTURES) {
    const target = fixtureRoot(fixture.contentPath);
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[cms-fixture] removed ${path.relative(ROOT, target)}`);
  }
}

function exec(command: string, args: string[], env: Record<string, string> = {}) {
  execFileSync(path.join(BIN, command), args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

const build = () => exec("astro", ["build"]);
const check = (phase: "present" | "absent") =>
  exec("playwright", ["test", SPEC], { TEST_BUILD: "true", CMS_FIXTURE_PHASE: phase });

function run() {
  try {
    write();
    build();
    check("present");
  } finally {
    clean();
    build();
  }
  check("absent");
}

const commands: Record<string, () => void> = { write, clean, run };
const command = process.argv[2] ?? "";
const handler = commands[command];

if (!handler) {
  console.error(`Usage: tsx scripts/cms-fixture.ts <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}

handler();
