import { z } from "astro/zod";

/** Legacy pair written by the importer; new venues use the GeoJSON `location` string. */
export const coordinates = z.object({ lat: z.number(), lng: z.number() });

/** GeoJSON Point, as written by the CMS map widget. */
export const location = z.string();
