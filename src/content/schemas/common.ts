import { z } from "astro/zod";

/**
 * Public paths this entry used to be served from. Written by Sveltia's `aliases_field` when
 * an editor renames a slug and turned into redirects at build time, so it is declared here
 * but never offered as a CMS field - a field called `aliases` disables the feature.
 */
export const aliases = z.array(z.string()).optional();

/** Where an entry is published; `type` is a `src/content/channels.ts` id. */
export const channels = z.array(z.object({ type: z.string(), ref: z.string() })).optional();
