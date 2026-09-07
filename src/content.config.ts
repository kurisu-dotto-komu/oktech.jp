import { glob } from "astro/loaders";
import { defineCollection, reference, z } from "astro:content";

import { eventGalleryImageCollection } from "@/content/gallery";
import { articleSchema } from "@/content/schemas/article";
import { eventSchema } from "@/content/schemas/event";
import { entryRef, folderId } from "@/content/schemas/id";
import { pageSchema } from "@/content/schemas/page";
import { seriesSchema } from "@/content/schemas/series";
import { venueSchema } from "@/content/schemas/venue";

/** The plain string in the schema, upgraded to the reference the site resolves entries with. */
const referenceTo = (collection: "venues" | "series") =>
  z.preprocess(entryRef, reference(collection).optional());

export const collections = {
  events: defineCollection({
    loader: glob({ base: "./content/events", pattern: "*.md" }),
    schema: eventSchema.extend({
      venue: referenceTo("venues"),
      series: referenceTo("series"),
    }),
  }),
  venues: defineCollection({
    loader: glob({ base: "./content/venues", pattern: "*/venue.md", generateId: folderId }),
    schema: venueSchema,
  }),
  series: defineCollection({
    loader: glob({ base: "./content/series", pattern: "*.md" }),
    schema: seriesSchema,
  }),
  articles: defineCollection({
    loader: glob({ base: "./content/articles", pattern: "*/index.md", generateId: folderId }),
    schema: articleSchema,
  }),
  pages: defineCollection({
    loader: glob({ base: "./content/pages", pattern: "*.md" }),
    schema: pageSchema,
  }),
  eventGalleryImage: eventGalleryImageCollection,
};
