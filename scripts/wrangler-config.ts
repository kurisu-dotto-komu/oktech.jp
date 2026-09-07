import { readFileSync, writeFileSync } from "node:fs";

/**
 * Writes the Wrangler config the site is actually deployed with.
 *
 * Wrangler has no environment-variable interpolation, and an R2 binding naming a bucket that
 * does not exist fails the deploy — so the bucket name is injected here, and the `/uploads`
 * Worker is dropped entirely when there is no bucket to bind. That keeps a checkout with no
 * Cloudflare configuration deployable as the assets-only Worker it was before.
 */
const SOURCE = "wrangler.jsonc";
export const GENERATED = "wrangler.generated.jsonc";

interface WranglerConfig {
  main?: string;
  assets?: { run_worker_first?: string[]; binding?: string };
  r2_buckets?: { binding: string; bucket_name: string }[];
}

/**
 * Wrangler configs are JSONC. Comments in this one only ever occupy a whole line, so
 * dropping those lines and the trailing commas leaves JSON — no parser dependency needed.
 */
function readJsonc(file: string): unknown {
  const json = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(json);
}

function build(): WranglerConfig {
  const config = readJsonc(SOURCE) as WranglerConfig;
  const bucket = process.env.MEDIA_BUCKET || process.env.PUBLIC_R2_BUCKET;

  if (bucket) {
    config.r2_buckets = (config.r2_buckets ?? []).map((binding) => ({
      ...binding,
      bucket_name: bucket,
    }));
    return config;
  }

  console.warn(`[wrangler] no MEDIA_BUCKET or PUBLIC_R2_BUCKET; ${GENERATED} omits /uploads`);
  delete config.main;
  delete config.r2_buckets;
  if (config.assets) {
    delete config.assets.run_worker_first;
    delete config.assets.binding;
  }
  return config;
}

writeFileSync(GENERATED, `${JSON.stringify(build(), null, 2)}\n`);
console.log(`[wrangler] wrote ${GENERATED}`);
