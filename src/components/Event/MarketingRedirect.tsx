import { useEffect } from "react";

const OFFSET_MINUTES = 30;

interface MarketingRedirectProps {
  /** Where an inbound campaign visitor is sent, i.e. the event's RSVP channel. */
  href?: string;
  eventDateTime: string;
  isCancelled?: boolean;
}

export default function MarketingRedirect({
  href,
  eventDateTime,
  isCancelled,
}: MarketingRedirectProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    if (!source || !href || isCancelled) return;

    const cutoffTime = new Date(eventDateTime).getTime() - OFFSET_MINUTES * 60 * 1000;
    if (Date.now() < cutoffTime) {
      window.location.replace(href);
    }
  }, [href, eventDateTime, isCancelled]);

  return null;
}
