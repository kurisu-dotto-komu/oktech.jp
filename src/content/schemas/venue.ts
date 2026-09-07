import { z } from "astro/zod";

import { aliases, channels } from "./common";
import { coordinates, location } from "./geo";

/**
 * `content/venues/<id>/venue.md`, still a page bundle so its local assets keep resolving.
 *
 * `description` and `readingTime` are derived from the body by the remark plugins and are
 * declared with a default so the derived values keep their place in the entry data.
 * `mapImage` / `mapDarkImage` are resolved from the committed bitmaps or from `location`.
 */
export const venueSchema = z.object({
  title: z.string(),
  city: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  url: z.string().optional(),
  gmaps: z.string().optional(),
  coordinates: coordinates.optional(),
  location: location.optional(),
  meetupId: z.number().optional(),
  hasPage: z.boolean().optional(),
  space: z.string().optional(),
  description: z.string().default(""),
  readingTime: z.string().default(""),
  devOnly: z.boolean().default(false),
  cover: z.string().optional(),
  mapImage: z.string().optional(),
  mapDarkImage: z.string().optional(),
  channels,
  aliases,
});
