import type { ImageMetadata, UnresolvedImageTransform } from "astro";

import { MAX_IMAGE_WIDTH } from "@/constants";

import type { ImageSources, ImageVariant } from "./types";

const DEFAULT_WIDTHS = [420, 1198] as const;

/** Runs Astro's image service; falls back to the raw source when it cannot (dev, unknown host). */
export async function safeGetImage(options: UnresolvedImageTransform): Promise<{ src: string }> {
  // In dev, remote sources are served as-is (no fetch through the dev server); local
  // files still go through Astro's dev image endpoint so crops match the build
  if (import.meta.env.DEV && typeof options.src === "string") {
    return { src: options.src };
  }
  try {
    const { getImage } = await import("astro:assets");
    return await getImage(options);
  } catch (error) {
    console.warn(`[images] optimisation failed for ${String(options.src)}: ${String(error)}`);
    return { src: (options.src as string) || "" };
  }
}

/** Target widths for a variant, capped at the source width and MAX_IMAGE_WIDTH. */
export function planWidths(sourceWidth: number, variant: ImageVariant | undefined): number[] {
  const widths = Array.from(
    new Set(
      (variant?.widths ?? DEFAULT_WIDTHS)
        .map((width) => Math.min(width, MAX_IMAGE_WIDTH, sourceWidth))
        .filter((width) => width > 0),
    ),
  ).sort((a, b) => a - b);
  return widths.length > 0 ? widths : [Math.min(sourceWidth, MAX_IMAGE_WIDTH)];
}

export function transformOptions(
  src: UnresolvedImageTransform["src"],
  width: number,
  variant: ImageVariant | undefined,
): UnresolvedImageTransform {
  const options: UnresolvedImageTransform = { src, width, format: "webp", quality: 80 };
  if (variant?.cropAspectRatio) {
    options.height = Math.round(width / variant.cropAspectRatio);
    options.fit = "cover";
  }
  return options;
}

/** Dimensions consumers see: the source's, or the crop's when a variant enforces a ratio. */
export function toSources(
  variants: { url: string; width: number }[],
  source: { width: number; height: number },
  variant: ImageVariant | undefined,
): ImageSources {
  const ratio = variant?.cropAspectRatio;
  return {
    src: variants[variants.length - 1].url,
    srcSet: variants.map((item) => `${item.url} ${item.width}w`).join(", "),
    width: source.width,
    height: ratio ? Math.round(source.width / ratio) : source.height,
  };
}
