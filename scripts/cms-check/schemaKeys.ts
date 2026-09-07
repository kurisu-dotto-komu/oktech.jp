import { articleSchema } from "@/content/schemas/article";
import { eventSchema } from "@/content/schemas/event";
import { pageSchema } from "@/content/schemas/page";
import { seriesSchema } from "@/content/schemas/series";
import { venueSchema } from "@/content/schemas/venue";

/** The schemas are plain `astro/zod` modules, so the check reads their shape directly. */
const SCHEMAS: Record<string, { shape: Record<string, unknown> }> = {
  articles: articleSchema,
  events: eventSchema,
  pages: pageSchema,
  series: seriesSchema,
  venues: venueSchema,
};

export function readSchemaKeys(collection: string): string[] {
  const schema = SCHEMAS[collection];
  if (!schema) throw new Error(`No content schema registered for collection "${collection}"`);
  return Object.keys(schema.shape);
}
