/**
 * Every public path a content entry is served at. Building and matching them in one place
 * keeps the routes, the feeds, the sitemap and the SEO layer from drifting apart.
 */
export const eventUrl = (id: string) => `/events/${id}`;
export const venueUrl = (id: string) => `/venue/${id}`;
export const articleUrl = (id: string) => `/articles/${id}`;
export const pageUrl = (id: string) => `/${id}`;

export type EntryPath = { type: "event" | "venue" | "article" | "page"; id: string };

const PATTERNS = [
  { type: "event", pattern: /^\/events\/([^/]+?)$/ },
  { type: "venue", pattern: /^\/venue\/([^/]+?)$/ },
  { type: "article", pattern: /^\/articles\/([^/]+?)$/ },
] as const;

/** Classifies a normalised pathname, e.g. `/events/<id>` or `/articles/<slug>`. */
export function parseEntryPath(pathname: string): EntryPath | undefined {
  for (const { type, pattern } of PATTERNS) {
    const id = pattern.exec(pathname)?.[1];
    if (id) return { type, id };
  }
  const slug = pathname.replace(/^\//, "");
  return slug ? { type: "page", id: slug } : undefined;
}
