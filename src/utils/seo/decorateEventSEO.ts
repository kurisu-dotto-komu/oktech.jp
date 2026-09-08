import { SITE } from "@/constants";
import { getEvent } from "@/content";
import { getOGImageWithFallback } from "@/utils/og";

import type { SEOMetadata } from ".";

export async function decorateEventSEO(
  baseSEO: SEOMetadata,
  eventId: string,
  pathname: string,
): Promise<SEOMetadata> {
  try {
    const event = await getEvent(eventId);
    const topics = event.data.topics ?? [];

    let description = event.data.description;
    if (!description || description.length < 50) {
      description = topics.length
        ? `Topics: ${topics.join(", ")}. Join us for this tech meetup event!`
        : "Join us for this exciting tech meetup event!";
    }

    // An event's social card is always its own cover image — never a generated one.
    // `getEvent` falls back to FALLBACK_COVER, so `coverPage` is only missing if the image
    // pipeline itself failed.
    const ogImage =
      event.data.coverPage?.src ??
      getOGImageWithFallback(pathname, { eventId, title: event.data.title });

    const pageTitle = event.data.title;

    const baseKeywords = ["Event", "Technology", "Meetup"];
    const additionalKeywords = topics.filter((keyword): keyword is string => Boolean(keyword));
    const allKeywords = [...baseKeywords, ...additionalKeywords];
    const keywords = allKeywords.slice(0, 5);

    return {
      ...baseSEO,
      title: pageTitle,
      fullTitle: SITE.title.template.replace("%s", `${pageTitle} - Events`),
      description,
      ogImage,
      type: "article",
      article: {
        publishedTime: event.data.dateTime.toISOString(),
        tags: topics,
      },
      keywords,
      entity: {
        type: "event",
        data: event,
        isLegacy: true,
        shouldGenerateOG: false,
      },
    };
  } catch (error) {
    console.error(`Failed to load event ${eventId}:`, error);
    return baseSEO;
  }
}
