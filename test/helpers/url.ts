/**
 * URL helper for Playwright tests
 * Contains test constants and page paths for testing
 */

// Test event constants - these are development-only events that should be used in tests
export const TEST_EVENTS = {
  PRIMARY: "999999999-example-dev-event",
  SECONDARY: "999999998-example-dev-event-2",
  REAL_EVENT: "308580120-agentic-sentiments", // Real event for slug testing
} as const;

// Regular page paths for testing
export const PAGE_PATHS = {
  HOME: "/",
  ABOUT: "/about",
  EVENTS: "/events",
  EVENTS_LIST_VIEW: "/events/list",
  EVENTS_PHOTO_ALBUM: "/events/album",
  CODE_OF_CONDUCT: "/code-of-conduct",
  SITEMAP: "/sitemap",
  // Dynamic pages with slugs
  EVENT_DETAIL: `/events/${TEST_EVENTS.REAL_EVENT}`,
} as const;

// Special page paths (non-HTML content)
export const SPECIAL_PAGE_PATHS = {
  RSS_FEED: "/rss.xml",
  ICS_CALENDAR: "/oktech-events.ics",
  XML_SITEMAP: "/sitemap.xml",
} as const;
