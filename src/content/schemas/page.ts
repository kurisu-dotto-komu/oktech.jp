import { z } from "astro/zod";

import { aliases } from "./common";

/** `content/pages/<slug>.md`, served at `/<slug>`. */
export const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  aliases,
});
