export const CMS_PATH = "/admin";

/**
 * File name each entry collection stores its entries under, i.e. the tail of the
 * collection `path` template. Sveltia addresses entries by that whole sub path,
 * so the same map drives both the config and the deep links below.
 */
const ENTRY_FILE_NAMES = { events: "event", venues: "venue", articles: "index" } as const;

export type CmsCollection = keyof typeof ENTRY_FILE_NAMES;

/** `path` template for an entry collection, e.g. `{{slug}}/event`. */
export function cmsEntryPath(collection: CmsCollection): string {
  return `{{slug}}/${ENTRY_FILE_NAMES[collection]}`;
}

/** Deep link into the Sveltia editor for the entry stored under `<slug>/`. */
export function cmsEditHref(collection: CmsCollection, slug: string): string {
  return `${CMS_PATH}/#/collections/${collection}/entries/${slug}/${ENTRY_FILE_NAMES[collection]}`;
}

/** Deep link derived from a content path like `articles/<slug>/index.md`. */
export function cmsArticleHref(markdownPath: string): string {
  const slug = markdownPath.replace(/^articles\//, "").replace(/(\/index)?\.md$/, "");
  return cmsEditHref("articles", slug);
}
