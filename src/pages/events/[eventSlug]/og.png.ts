import type { GetStaticPaths } from "astro";

import OGEvent from "@/components/OGImage/OGEvent";
import { getEvents } from "@/content";
import { readLocation } from "@/utils/maps/location";
import { getVenueMaps } from "@/utils/maps/venueMaps";
import { createOGImageRoute, loadSourceImage } from "@/utils/og";
import { shouldGenerateEventOG } from "@/utils/og/eligibility";

export const GET = createOGImageRoute(async ({ params }) => {
  const eventSlug = params.eventSlug;

  if (!eventSlug) {
    return null; // Will return 404
  }

  const events = await getEvents();
  const event = events.find((e) => e.id === eventSlug);

  if (!event || !shouldGenerateEventOG(event)) {
    return null; // Will return 404
  }

  const { venue, venueSlug } = event;
  const mapRef =
    venue && venueSlug ? getVenueMaps(readLocation(venue), venueSlug).mapImage : undefined;
  const [mapImageBase64, coverImageBase64] = await Promise.all([
    loadSourceImage(mapRef),
    loadSourceImage(event.data.cover),
  ]);

  return {
    component: OGEvent,
    props: {
      event,
      mapImageBase64,
      coverImageBase64,
    },
    cacheKeyData: {
      id: event.id,
      title: event.data.title,
      dateTime: event.data.dateTime,
      topics: event.data.topics,
      venueId: venueSlug,
      venueTitle: venue?.title,
      venueCity: venue?.city,
      hasMapImage: !!mapImageBase64,
      hasCoverImage: !!coverImageBase64,
    },
  };
});

export const getStaticPaths: GetStaticPaths = async () => {
  const events = await getEvents();
  return events.map((event) => ({
    params: { eventSlug: event.id },
  }));
};
