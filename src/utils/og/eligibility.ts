import { OG_GENERATION_START } from "@/constants";

const cutoff = new Date(OG_GENERATION_START);

/**
 * Events before the cutoff keep their cover image as the social card; from the cutoff on, the
 * card is rendered by `/events/<slug>/og.png`.
 */
export function shouldGenerateEventOG(event: { data: { dateTime: Date } }): boolean {
  return new Date(event.data.dateTime).getTime() >= cutoff.getTime();
}
