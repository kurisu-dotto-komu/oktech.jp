import { execSync } from "node:child_process";

// Builds and deploys the staging site to Cloudflare Workers.
// STAGING_HOST is the single place the hostname is configured (repo variable in CI).
const host = process.env.STAGING_HOST;

if (!host) {
  console.error("STAGING_HOST is not set (e.g. STAGING_HOST=staging.example.com)");
  process.exit(1);
}

const run = (cmd: string, env: NodeJS.ProcessEnv = {}) =>
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });

run("astro build", { SITE_URL: `https://${host}` });
run(`wrangler deploy --domain ${host}`);
