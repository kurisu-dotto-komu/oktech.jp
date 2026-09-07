import { z } from "astro/zod";

/**
 * `content/series/<id>.md`. A series has no page of its own; occurrences reference it for
 * their cadence label and their default cover, and the listings group by it.
 */
export const seriesSchema = z.object({
  title: z.string(),
  label: z.string().optional(),
  cover: z.string().optional(),
});
