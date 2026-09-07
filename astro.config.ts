// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import remarkBreaks from "remark-breaks";
import { visualizer } from "rollup-plugin-visualizer";
import svgr from "vite-plugin-svgr";

import venueMaps from "./src/utils/maps/integration";
import { buildAliasRedirects } from "./src/utils/redirects";
import { rehypeTableWrapper, rehypeTaskListCheckbox } from "./src/utils/rehypePlugins";
import relativeStaticAssets from "./src/utils/relativeStaticAssets";
import {
  remarkDescription,
  remarkReadingTime,
  remarkRelativeAssets,
} from "./src/utils/remarkPlugins";

// Get base path from environment variable, default to "" (root)
// BASE_PATH is used to prefix the site URL with a base path, for example /chris-wireframe/
const base = process.env.BASE_PATH || "";

// Output bundle analysis to stats.html
const analyzeBundle = process.env.ANALYZE_BUNDLE === "true";

// if we're in a Vercel preview deployment, use that URL, otherwise use SITE_URL, otherwise use localhost.
const siteUrl = process.env.SITE_URL || `http://localhost:${process.env.DEV_PORT || "4321"}`;
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = !!vercelUrl ? `https://${vercelUrl}` : siteUrl;

// Staging: STAGING_HOST is the single knob for the deploy hostname; the CMS auth worker
// and the media bucket hang off it unless overridden explicitly.
const stagingHost = process.env.STAGING_HOST;
const imagesHost = process.env.IMAGES_HOST || (stagingHost ? `images.${stagingHost}` : "");
if (imagesHost && !process.env.PUBLIC_IMAGES_URL) {
  process.env.PUBLIC_IMAGES_URL = `https://${imagesHost}`;
}
if (stagingHost && !process.env.PUBLIC_CMS_AUTH_BASE_URL) {
  process.env.PUBLIC_CMS_AUTH_BASE_URL = `https://auth.${stagingHost}`;
}

console.log(`URL: ${site}${base}${imagesHost ? ` (remote images: ${imagesHost})` : ""}`);

// https://astro.build/config
export default defineConfig({
  server: { allowedHosts: true },
  site,
  base,
  trailingSlash: "never",
  devToolbar: {
    enabled: false,
  },
  vite: {
    preview: { allowedHosts: true },
    plugins: [
      svgr(),
      tailwindcss(),
      ...(analyzeBundle
        ? [
            visualizer({
              filename: "./dist/stats.html",
              open: true,
              gzipSize: true,
              brotliSize: true,
              template: "treemap",
            }),
          ]
        : []),
    ],
    ssr: {
      external: [
        "@resvg/resvg-js",
        "@resvg/resvg-js-linux-x64-musl",
        "@resvg/resvg-js-linux-x64-gnu",
        "@resvg/resvg-js-darwin-x64",
        "@resvg/resvg-js-darwin-arm64",
        "@resvg/resvg-js-win32-x64-msvc",
      ],
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  integrations: [react(), relativeStaticAssets(), venueMaps()],
  redirects: {
    discord: "https://discord.com/invite/k8xj8d75f6",
    // Every path an entry used to be served at, from its `aliases:` front matter.
    ...buildAliasRedirects(process.cwd()),
  },
  markdown: {
    remarkPlugins: [remarkBreaks, remarkReadingTime, remarkDescription, remarkRelativeAssets],
    rehypePlugins: [rehypeTableWrapper, rehypeTaskListCheckbox],
  },
  experimental: {
    clientPrerender: true,
    contentIntellisense: true,
    fonts: [
      {
        name: "Lexend",
        cssVariable: "--font-lexend",
        provider: fontProviders.google(),
        weights: [300, 600, 800],
        styles: ["normal"],
        subsets: ["latin"],
        fallbacks: ["sans-serif"],
      },
    ],
  },
  // astro prefetch config only applies to astro links, mostly it's handled in Link.tsx
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "viewport",
  },
  image: {
    // Remote images (the media bucket) are fetched and optimised at build time
    remotePatterns: imagesHost ? [{ protocol: "https", hostname: imagesHost }] : [],
    // layout: "constrained",
    // objectFit: "contain",
    // objectPosition: "center",
    // breakpoints: [640, 750, 828, 1080, 1280],
    responsiveStyles: true,
  },
  build: {
    format: "file", // fixes trailing slash redirects.
  },
});
