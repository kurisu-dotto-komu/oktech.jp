/**
 * Where CMS uploads live, as far as content is concerned.
 *
 * An entry stores `/uploads/<key>` and nothing else — no bucket, no hostname. Which host
 * actually serves that key is environment configuration in three places, all of which read
 * the constants here: the CMS writes the prefix (`src/cms/media.ts`), the build rewrites it
 * to the images host so Astro can fetch and optimise the file (`src/utils/images/`), and the
 * deployed site serves it straight from R2 (`workers/site/`).
 *
 * Changing the prefix is changing this file.
 */

/** Leading segment of an upload reference, including both slashes. */
export const UPLOADS_PREFIX = "/uploads/";

/**
 * What Sveltia stores as the media library's `public_url`. No trailing slash: Sveltia
 * builds an asset URL as `${public_url}/${key}` and a trailing slash would double it.
 */
export const UPLOADS_PUBLIC_URL = UPLOADS_PREFIX.replace(/\/$/, "");

/** The bucket key behind an upload reference, or `undefined` for anything else. */
export function uploadKey(ref: string): string | undefined {
  if (!ref.startsWith(UPLOADS_PREFIX)) return undefined;
  const key = ref.slice(UPLOADS_PREFIX.length);
  // A bare prefix, or one trying to climb out of the bucket, is not a key.
  return key && !key.includes("..") ? key : undefined;
}
