import type { CmsMediaConfig } from "@/cms/types";
import { MAX_IMAGE_WIDTH } from "@/constants";

/** Upload ceiling, well under the GitHub Contents API blob limit. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Matches the quality used by the import pipeline so CMS uploads look identical. */
const WEBP_QUALITY = 85;

export function buildMediaConfig(): CmsMediaConfig {
  return {
    // Global fallback only: entry collections set their own entry-relative folders.
    media_folder: "/content",
    public_folder: "/content",
    media_libraries: {
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
