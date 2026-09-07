import { z } from "astro/zod";

import { aliases, channels } from "./common";
import { jstDateTime } from "./date";
import { entryRef } from "./id";

const attachment = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string(),
});

const galleryImage = z.object({ src: z.string(), caption: z.string().optional() });

/**
 * `content/events/<id>.md`. `venue` and `series` are plain strings here so the schema stays
 * importable outside an Astro build; `src/content.config.ts` upgrades both to real references.
 *
 * `meetupId` and `links` are the pre-`channels` shape and disappear once the content
 * migration rewrites them.
 */
export const eventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dateTime: jstDateTime,
  duration: z.number().optional(),
  cover: z.string().optional(),
  devOnly: z.boolean().default(false),
  venue: z.preprocess(entryRef, z.string().optional()),
  topics: z.array(z.string()).optional(),
  space: z.string().optional(),
  howToFindUs: z.string().optional(),
  meetupId: z.union([z.number(), z.string()]).optional(),
  links: z.record(z.string()).optional(),
  isCancelled: z.boolean().optional(),
  attachments: z.array(attachment).optional(),
  channels,
  gallery: z.array(galleryImage).optional(),
  series: z.preprocess(entryRef, z.string().optional()),
  aliases,
});
