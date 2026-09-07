import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import type { CmsConfig } from "@/cms/types";

export const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");

/**
 * buildCmsConfig() reads `import.meta.env`, which only exists inside Vite, so the
 * module is loaded through a throwaway SSR server rather than imported directly.
 */
export async function loadCmsConfig(entry = "/src/cms/config.ts"): Promise<CmsConfig> {
  const server = await createServer({
    root: REPO_ROOT,
    configFile: false,
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, watch: null },
    resolve: { alias: { "@": path.join(REPO_ROOT, "src") } },
  });

  try {
    const loaded = (await server.ssrLoadModule(entry)) as { buildCmsConfig?: () => CmsConfig };
    if (typeof loaded.buildCmsConfig !== "function") {
      throw new Error(`${entry} does not export buildCmsConfig()`);
    }
    // Round-tripping drops `undefined` values, matching what the CMS actually reads.
    return JSON.parse(JSON.stringify(loaded.buildCmsConfig())) as CmsConfig;
  } finally {
    await server.close();
  }
}
