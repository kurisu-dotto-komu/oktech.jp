import type { ImageMetadata } from "astro";

import { memoize } from "@/utils/memoize";

import { planWidths, safeGetImage, toSources, transformOptions } from "./transform";
import { FALLBACK_DIMENSIONS, type ImageDimensions, type ImageSources } from "./types";
import type { ImageVariant, LocalImageRef } from "./types";

const imageLoaders: Record<string, () => Promise<{ default: ImageMetadata }>> = {
  ...import.meta.glob<{ default: ImageMetadata }>("/content/events/**/*.{jpg,jpeg,png,webp,svg}"),
  ...import.meta.glob<{ default: ImageMetadata }>("/content/venues/**/*.{jpg,jpeg,png,webp,svg}"),
  ...import.meta.glob<{ default: ImageMetadata }>("/src/assets/*.{jpg,jpeg,png,webp,svg}"),
};

export const normalizeLocalPath = (imagePath: string) =>
  imagePath.startsWith("/") ? imagePath : `/${imagePath}`;

export const hasLocalImage = (imagePath: string) =>
  Boolean(imageLoaders[normalizeLocalPath(imagePath)]);

const loadImageMetadata = memoize(async (normalizedPath: string): Promise<ImageMetadata> => {
  const loader = imageLoaders[normalizedPath];
  if (!loader) {
    console.error(`Image loader not found: ${normalizedPath}`);
    throw new Error(`Unable to load image at path: ${normalizedPath}`);
  }
  return (await loader()).default;
});

async function buildVariantSources(
  image: ImageMetadata,
  variant: ImageVariant | undefined,
): Promise<ImageSources> {
  const variants = await Promise.all(
    planWidths(image.width, variant).map(async (width) => {
      // Native-resolution passthrough: at (or above) the source width, re-encoding a
      // webp only adds bytes, so reuse the original file. Skip for crops (not a pure
      // downscale) and non-webp sources (which may genuinely shrink when converted).
      if (width >= image.width && image.format === "webp" && !variant?.cropAspectRatio) {
        return { url: image.src, width: image.width };
      }
      const optimized = await safeGetImage(transformOptions(image, width, variant));
      return { url: optimized.src, width };
    }),
  );
  return toSources(variants, image, variant);
}

const variantCache = new Map<string, Promise<ImageSources>>();

export function resolveLocalImage(
  ref: LocalImageRef,
  variantKey: string,
  variant: ImageVariant | undefined,
): Promise<ImageSources> {
  const normalizedPath = normalizeLocalPath(ref.path);
  const cacheKey = `${normalizedPath}:${variantKey}`;
  const cached = variantCache.get(cacheKey);
  if (cached) return cached;
  const pending = loadImageMetadata(normalizedPath).then((metadata) =>
    buildVariantSources(metadata, variant),
  );
  variantCache.set(cacheKey, pending);
  return pending;
}

export const getLocalImageDimensions = memoize(
  async (imagePath: string): Promise<ImageDimensions> => {
    try {
      const metadata = await loadImageMetadata(normalizeLocalPath(imagePath));
      return { width: metadata.width, height: metadata.height };
    } catch {
      console.error(`Image loader not found for dimensions: ${imagePath}`);
      return FALLBACK_DIMENSIONS;
    }
  },
);
