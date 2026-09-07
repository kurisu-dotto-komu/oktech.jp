import { SITE } from "@/constants";
import type { EventEnriched } from "@/content";

import { readLocation } from "./maps/location";
import { urls } from "./urls";
import { eventUrl } from "./urls/entries";

export function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function buildLocation(event: EventEnriched): string {
  if (!event.venue?.title) return "TBD";
  const parts = [event.venue.title];
  if (event.venue.address) parts.push(event.venue.address);
  if (event.venue.city) parts.push(event.venue.city);
  return parts.join(", ");
}

function buildDescription(event: EventEnriched, url: string): string {
  const lines = [`${event.data.title} - ${SITE.longName}`];

  if (event.data.howToFindUs) {
    lines.push("", "How to find us:", event.data.howToFindUs);
  }

  if (event.venue?.gmaps) {
    lines.push("", `Google Maps: ${event.venue.gmaps}`);
  }

  lines.push("", `Event page: ${url}`);

  return lines.join("\\n");
}

export function generateEventICS(event: EventEnriched): string {
  const startDate = new Date(event.data.dateTime);
  const endDate = new Date(event.data.dateTime);
  const durationMinutes = event.data.duration || 120;
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);
  const summary = `${event.data.isCancelled ? "[CANCELLED] " : ""}${event.data.title}`;

  // Don't set cancelled status in ical (it hides in Google Calendar)
  // const status = event.data.isCancelled ? "CANCELLED" : "CONFIRMED";
  const status = "CONFIRMED";

  const url = urls.toAbsolute(eventUrl(event.id));
  const location = buildLocation(event);
  const description = buildDescription(event, url);

  const fields = [
    "BEGIN:VEVENT",
    `UID:${event.id}@OKTECH`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `URL:${url}`,
    `STATUS:${status}`,
  ];

  const geo = readLocation(event.venue);
  if (geo) {
    fields.push(`GEO:${geo.lat};${geo.lng}`);
  }

  fields.push("END:VEVENT");

  return fields.join("\r\n");
}

export function wrapICSCalendar(events: string | string[], calName?: string): string {
  const eventsContent = Array.isArray(events) ? events.join("\r\n") : events;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE.name}//Event Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(calName ? [`X-WR-CALNAME:${calName}`] : []),
    ...(calName ? [`X-WR-CALDESC:Events from ${calName}`] : []),
    eventsContent,
    "END:VCALENDAR",
  ].join("\r\n");
}
