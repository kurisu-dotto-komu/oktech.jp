import type { CmsMediaConfig } from "@/cms/types";
import { MAX_IMAGE_WIDTH } from "@/constants";

/** Upload ceiling, well under the GitHub Contents API blob limit. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Matches the quality used by the import pipeline so CMS uploads look identical. */
const WEBP_QUALITY = 85;

/**
 * Sveltia's built-in Cloudflare R2 library: editors upload straight into the media
 * bucket and entries store the public URL. Enabled when the PUBLIC_R2_* variables are
 * set; the secret access key is entered per user in the CMS settings, never in config.
 */
function r2Library(): CmsMediaConfig["media_libraries"] {
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
  return {
    cloudflare_r2: {
      account_id: env.PUBLIC_R2_ACCOUNT_ID,
      access_key_id: env.PUBLIC_R2_ACCESS_KEY_ID,
      bucket: env.PUBLIC_R2_BUCKET,
      public_url: publicUrl,
    },
  };
}

export function buildMediaConfig(): CmsMediaConfig {
  return {
    // Global fallback only: entry collections set their own entry-relative folders.
    media_folder: "/content",
    public_folder: "/content",
    media_libraries: {
      ...r2Library(),
      default: {
        config: {
          max_file_size: MAX_UPLOAD_BYTES,
          transformations: {
            raster_image: {
              format: "webp",
              quality: WEBP_QUALITY,
              width: MAX_IMAGE_WIDTH,
            },
          },
        },
      },
    },
  };
}
