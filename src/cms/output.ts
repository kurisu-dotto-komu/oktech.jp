import type { SlugOptions } from "@sveltia/cms";

import type { CmsOutputOptions } from "@/cms/types";

/** Keeps generated entry slugs inside the site's URL budget (see astro.config.ts redirects). */
const SLUG_MAX_LENGTH = 59;

export function buildOutputOptions(): CmsOutputOptions {
  return {
    omit_empty_optional_fields: true,
  };
}

export function buildSlugOptions(): SlugOptions {
  return {
    maxlength: SLUG_MAX_LENGTH,
    lowercase: true,
    clean_accents: true,
  };
}
