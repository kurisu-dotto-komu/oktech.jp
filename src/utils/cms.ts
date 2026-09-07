export const CMS_PATH = "/admin";

/**
 * File name each entry collection stores its entries under, i.e. the tail of the
 * collection `path` template. Sveltia addresses entries by that whole sub path,
 * so the same map drives both the config and the deep links below.
 */
const ENTRY_FILE_NAMES = { events: "event", venues: "venue", articles: "index" } as const;

export type CmsCollection = keyof typeof ENTRY_FILE_NAMES;

/** `path` template for a page-bundle entry collection, e.g. `{{slug}}/venue`. */
export function cmsEntryPath(collection: Exclude<CmsCollection, "events">): string {
  return `{{slug}}/${ENTRY_FILE_NAMES[collection]}`;
}

/**
 * Deep link into the Sveltia editor. Events are flat files (`content/events/<slug>.md`)
 * and have no collection `path`, so their entry id is the slug on its own.
 */
export function cmsEditHref(collection: CmsCollection, slug: string): string {
  const entry = collection === "events" ? slug : `${slug}/${ENTRY_FILE_NAMES[collection]}`;
  return `${CMS_PATH}/#/collections/${collection}/entries/${entry}`;
}

/** Deep link derived from a content path like `articles/<slug>/index.md`. */
export function cmsArticleHref(markdownPath: string): string {
  const slug = markdownPath.replace(/^articles\//, "").replace(/(\/index)?\.md$/, "");
  return cmsEditHref("articles", slug);
}
