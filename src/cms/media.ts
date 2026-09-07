import type { CmsMediaConfig } from "@/cms/types";
import { MAX_IMAGE_WIDTH } from "@/constants";

/** Upload ceiling, well under the GitHub Contents API blob limit. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Matches the quality the site's own image pipeline uses so uploads look identical. */
const WEBP_QUALITY = 85;

/**
 * Bucket key prefix per upload field. Keys are flat and there is no overwrite check,
 * so keeping fields apart is the only thing preventing two `cover.webp` uploads from
 * clobbering each other.
 */
export const R2_PREFIX = {
  eventCover: "events/covers/",
  eventGallery: "events/gallery/",
  venue: "venues/",
  series: "series/",
} as const;

type MediaLibraries = NonNullable<CmsMediaConfig["media_libraries"]>;

/**
 * Where CMS uploads go. Two shapes, selected by env:
 *
 * - `cloudflare_r2` (interim): editors sign requests themselves with a per-editor R2
 *   secret access key entered once in the CMS settings.
 * - `aws_s3` (target): the same SigV4 request, but pointed at the upload Worker, which
 *   verifies the signature against its maintainer whitelist before writing. Only the
 *   `aws_s3` key honours a custom `endpoint`; `cloudflare_r2` overwrites it with the
 *   account's own R2 host, which is why the switch changes the library key.
 */
function uploadLibrary(prefix: string): MediaLibraries {
  const env = import.meta.env;
  const publicUrl = env.PUBLIC_IMAGES_URL;
  if (
    !env.PUBLIC_R2_ACCOUNT_ID ||
    !env.PUBLIC_R2_ACCESS_KEY_ID ||
    !env.PUBLIC_R2_BUCKET ||
    !publicUrl
  ) {
    return {};
  }

  const shared = {
    access_key_id: env.PUBLIC_R2_ACCESS_KEY_ID,
    bucket: env.PUBLIC_R2_BUCKET,
    prefix,
    public_url: publicUrl,
  };
  const endpoint = env.PUBLIC_MEDIA_UPLOAD_ENDPOINT;

  return endpoint
    ? { aws_s3: { ...shared, endpoint, region: "auto", force_path_style: true } }
    : { cloudflare_r2: { ...shared, account_id: env.PUBLIC_R2_ACCOUNT_ID } };
}

/**
 * Per-field override: new uploads go to the media bucket and the repository tab is
 * hidden, while existing repository paths still resolve to a preview. Editing an old
 * entry's image is therefore the incremental migration off Git-stored media.
 *
 * Falls back to the repository library when the bucket is not configured (local dev),
 * so an unconfigured checkout still has a working upload target.
 */
export function r2Field(prefix: string): { media_libraries?: MediaLibraries } {
  const library = uploadLibrary(prefix);
  if (Object.keys(library).length === 0) return {};
  return { media_libraries: { ...library, default: false } };
}

export function buildMediaConfig(): CmsMediaConfig {
  return {
    // Narrow enough to keep the CMS's file index small, wide enough that legacy event
    // covers under /content/media still get thumbnails in the picker.
    media_folder: "/content/media",
    public_folder: "/content/media",
    media_libraries: {
      // `all`, not `default.config`: this is what makes the client-side webp resize
      // apply to bucket uploads too, not just to files committed to the repository.
      all: {
        max_file_size: MAX_UPLOAD_BYTES,
        slugify_filename: true,
        transformations: {
          raster_image: { format: "webp", quality: WEBP_QUALITY, width: MAX_IMAGE_WIDTH },
        },
      },
    },
  };
}
