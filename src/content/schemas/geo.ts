import { z } from "astro/zod";

/** GeoJSON Point, as written by the CMS map widget. */
export const location = z.string();
