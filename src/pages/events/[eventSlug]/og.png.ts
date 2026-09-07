import type { GetStaticPaths } from "astro";

import { getEvents } from "@/content";
import { createOGImageRoute } from "@/utils/og";

/**
 * Events do not get a generated social card: `decorateEventSEO` points `og:image` at the
 * event's own cover instead. The route stays so the URL keeps resolving — it answers 404,
 * which is what it already did for every event before the (now removed) cutoff date.
 *
 * There is deliberately no condition here. A rendered card was previously gated on the
 * event's date, which meant it would switch itself back on as time passed.
 */
export const GET = createOGImageRoute(async () => null);

export const getStaticPaths: GetStaticPaths = async () => {
  const events = await getEvents();
  return events.map((event) => ({
    params: { eventSlug: event.id },
  }));
};
