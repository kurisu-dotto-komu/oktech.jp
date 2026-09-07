import { memoize } from "@/utils/memoize";

import { planWidths, safeGetImage, toSources, transformOptions } from "./transform";
import { FALLBACK_DIMENSIONS } from "./types";
import type { ImageDimensions, ImageSources, ImageVariant, RemoteImageRef } from "./types";

/** Any https URL is a remote image; Astro only optimises hosts listed in `image.remotePatterns`. */
export function parseRemoteRef(value: string): RemoteImageRef | null {
  if (!/^https:\/\//i.test(value)) return null;
  try {
    return { kind: "remote", url: new URL(value).toString() };
  } catch {
    return null;
  }
}

/** Probes the remote file for its dimensions at build time; dev mode skips the network. */
export const getRemoteImageDimensions = memoize(async (url: string): Promise<ImageDimensions> => {
  if (import.meta.env.DEV) return FALLBACK_DIMENSIONS;
  try {
    const { inferRemoteSize } = await import("astro:assets");
    return await inferRemoteSize(url);
  } catch {
    console.warn(`[images] could not read dimensions of "${url}", using fallback`);
    return FALLBACK_DIMENSIONS;
  }
});

const variantCache = new Map<string, Promise<ImageSources>>();

export function resolveRemoteImage(
  ref: RemoteImageRef,
  variantKey: string,
  variant: ImageVariant | undefined,
): Promise<ImageSources> {
  const cacheKey = `${ref.url}:${variantKey}`;
  const cached = variantCache.get(cacheKey);
  if (cached) return cached;
  const pending = getRemoteImageDimensions(ref.url).then(async (source) => {
    const variants = await Promise.all(
      planWidths(source.width, variant).map(async (width) => {
        const options = transformOptions(ref.url, width, variant);
        // Astro refuses remote transforms without both dimensions (CLS guard)
        options.height ??= Math.round((width * source.height) / source.width);
        const optimized = await safeGetImage(options);
        return { url: optimized.src, width };
      }),
    );
    return toSources(variants, source, variant);
  });
  variantCache.set(cacheKey, pending);
  return pending;
}
