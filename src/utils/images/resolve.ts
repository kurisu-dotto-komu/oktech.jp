import path from "path";

import { getLocalImageDimensions, hasLocalImage, resolveLocalImage } from "./local";
import { getRemoteImageDimensions, parseRemoteRef, resolveRemoteImage } from "./remote";
import type { ImageDimensions, ImageRef, ImageSources, ImageVariant } from "./types";

/** Anything that is not an https URL is treated as a local path. */
export function parseImageRef(value: string): ImageRef {
  return parseRemoteRef(value) ?? { kind: "local", path: value };
}

/** Resolves an image reference to displayable sources. */
export function resolveImage(
  value: string,
  variantKey: string,
  variant?: ImageVariant,
): Promise<ImageSources> {
  const ref = parseImageRef(value);
  if (ref.kind === "remote") return resolveRemoteImage(ref, variantKey, variant);
  return resolveLocalImage(ref, variantKey, variant);
}

export function resolveImageDimensions(value: string): Promise<ImageDimensions> {
  const ref = parseImageRef(value);
  if (ref.kind === "remote") return getRemoteImageDimensions(ref.url);
  return getLocalImageDimensions(ref.path);
}

/**
 * Resolves a frontmatter image against its entry directory. Repo-root-absolute
 * paths (`/content/media/…`) are used as-is, other local paths are joined onto
 * the directory, and remote URLs are kept verbatim. Returns null (after a
 * warning naming the entry) when a local image cannot be found.
 */
export function resolveEntryImage(
  entryId: string,
  directory: string,
  image: string,
): string | null {
  if (parseImageRef(image).kind === "remote") return image;
  const resolved = image.startsWith("/") ? image : path.join(directory, image);
  if (hasLocalImage(resolved)) return resolved;
  console.warn(`[images] ${entryId}: image not found at "${resolved}", using fallback`);
  return null;
}
