/**
 * How content refers to a file in the CMS media bucket.
 *
 * An entry stores `cloudflare:/<key>` — an explicit scheme, because the file is **not** at
 * any path on this site. The earlier `/uploads/<key>` read like a real site path and misled
 * people into treating it as one; a scheme cannot be mistaken for anything but a reference.
 * Neither form names a bucket or a hostname: where the key is actually served from is
 * environment configuration, read in three places that all import this file — the CMS writes
 * the reference (`src/cms/`), the build rewrites it to the images host so Astro can fetch and
 * optimise the file (`src/utils/images/`, `src/utils/remarkPlugins.ts`), and the deployed
 * site still answers the legacy path out of R2 (`workers/site/`).
 *
 * Changing the convention is changing this file.
 */

/** Scheme and its single slash: `cloudflare:/events/covers/x.webp`. */
export const UPLOADS_PREFIX = "cloudflare:/";

/** What entries stored before the scheme. Still read, and still served; never written. */
export const LEGACY_UPLOADS_PREFIX = "/uploads/";

/** How a bucket key is written into an entry. */
export const uploadRef = (key: string): string => `${UPLOADS_PREFIX}${key}`;

/** The bucket key behind an upload reference, or `undefined` for anything else. */
export function uploadKey(ref: string): string | undefined {
  const prefix = [UPLOADS_PREFIX, LEGACY_UPLOADS_PREFIX].find((candidate) =>
    ref.startsWith(candidate),
  );
  if (!prefix) return undefined;
  const key = ref.slice(prefix.length);
  // A bare prefix, an absolute path, or one trying to climb out of the bucket, is not a key.
  return key && !key.startsWith("/") && !key.includes("..") ? key : undefined;
}
