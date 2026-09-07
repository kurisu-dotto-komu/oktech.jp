/**
 * `npm run check:cms` - validates the generated Sveltia CMS config against the
 * schema bundled with @sveltia/cms and asserts that its field names still match
 * the zod content schemas. Set CMS_CONFIG_ENTRY to point at another module
 * exporting buildCmsConfig() (used to prove the check fails on a broken copy).
 */
import fs from "node:fs";
import path from "node:path";

import { PARITY_TARGETS, checkParity } from "@/cms/parity";
import type { CmsConfig } from "@/cms/types";

import { type JsonSchema, createValidator } from "./cms-check/jsonSchema";
import { REPO_ROOT, loadCmsConfig } from "./cms-check/loadConfig";
import { checkWidgets, getBuiltInWidgets } from "./cms-check/widgets";
import { readZodObjectKeys } from "./cms-check/zodShape";

const SCHEMA_PATH = "node_modules/@sveltia/cms/schema/sveltia-cms.json";

function readSchema(): JsonSchema {
  const file = path.join(REPO_ROOT, SCHEMA_PATH);
  if (!fs.existsSync(file)) throw new Error(`Sveltia schema not found at ${SCHEMA_PATH}`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as JsonSchema;
}

function collectionFieldNames(config: CmsConfig, collection: string): string[] {
  const match = (config.collections ?? []).find(
    (entry) => "name" in entry && entry.name === collection,
  );
  if (!match || !("fields" in match) || !match.fields) {
    throw new Error(`Collection "${collection}" has no fields in the generated CMS config`);
  }
  return match.fields.map((field) => field.name);
}

function checkFieldParity(config: CmsConfig): string[] {
  return PARITY_TARGETS.flatMap((target) =>
    checkParity(
      target,
      collectionFieldNames(config, target.collection),
      readZodObjectKeys(path.join(REPO_ROOT, target.schemaModule), target.schemaFunction),
    ),
  );
}

function report(label: string, errors: string[]): number {
  if (errors.length === 0) {
    console.log(`  ok  ${label}`);
    return 0;
  }
  console.error(`  FAIL  ${label}`);
  for (const error of errors) console.error(`        ${error}`);
  return errors.length;
}

async function main(): Promise<void> {
  const schema = readSchema();
  const config = await loadCmsConfig(process.env.CMS_CONFIG_ENTRY);

  console.log("Checking the Sveltia CMS config");
  const failures =
    report("schema", createValidator(schema)(config)) +
    report("widgets", checkWidgets(config, getBuiltInWidgets(schema))) +
    report("field parity", checkFieldParity(config));

  if (failures > 0) {
    console.error(`\n${failures} problem(s) found in the CMS config.`);
    process.exitCode = 1;
    return;
  }
  console.log("\nCMS config is valid.");
}

await main();
