import { z } from "astro/zod";

import { aliases } from "./common";
import { isoDate } from "./date";

/** `content/articles/<slug>/index.md`, a page bundle so its images and files stay next to it. */
export const articleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  /** "Full Name <github-handle>", parsed by `@/utils/author`. */
  author: z.string().optional(),
  date: isoDate.optional(),
  unlisted: z.boolean().optional(),
  aliases,
});
