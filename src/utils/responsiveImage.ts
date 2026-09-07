import { FALLBACK_COVER } from "@/constants";
import { resolveImage } from "@/utils/images";
import type { ImageSources, ImageVariant } from "@/utils/images";

const IMAGE_VARIANTS = {
  thumbnail: { widths: [96, 144, 216] },
  galleryThumb: { widths: [320, 640, 960] },
  card: { widths: [360, 540, 960] },
  cardCropped: { widths: [480, 960, 1440], cropAspectRatio: 4 / 3 },
  hero: { widths: [480, 960, 1440, 1920] },
} satisfies Record<string, ImageVariant>;
type ImageVariantKey = keyof typeof IMAGE_VARIANTS;
type ImageConfig = { sizes: string; variantKey: ImageVariantKey };

const IMAGE_CONFIGS = {
  sidebarLayoutHero: { sizes: "(max-width: 900px) 100vw, 70vw", variantKey: "hero" },
  eventPolaroid: {
    sizes:
      "(max-width: 480px) min(100vw, 360px), (max-width: 900px) 50vw, (min-width: 901px) 33vw, 33vw",
    variantKey: "card",
  },
  eventBig: {
    sizes:
      "(max-width: 480px) min(100vw, 420px), (max-width: 900px) 60vw, (min-width: 901px) 45vw, 45vw",
    variantKey: "card",
  },
  eventCompact: {
    sizes: "(max-width: 420px) 64px, (max-width: 480px) 96px, (max-width: 700px) 128px, 168px",
    variantKey: "thumbnail",
  },
  galleryThumbnail: {
    sizes: "(max-width: 480px) 100vw, (max-width: 900px) 50vw, (min-width: 901px) 25vw, 25vw",
    variantKey: "galleryThumb",
  },
  galleryLightbox: { sizes: "100vw", variantKey: "hero" },
  blobSlideshow: { sizes: "(max-width: 900px) 100vw, 50vw", variantKey: "cardCropped" },
  venueMap: { sizes: "(min-width: 481px) 33vw, 100vw", variantKey: "card" },
} satisfies Record<string, ImageConfig>;

export type ImageType = keyof typeof IMAGE_CONFIGS;

export type ResponsiveImageData = ImageSources & { sizes: string };

async function resolveSources(imagePath: string, variantKey: ImageVariantKey) {
  const variant = IMAGE_VARIANTS[variantKey];
  try {
    return await resolveImage(imagePath, variantKey, variant);
  } catch {
    console.warn(`[images] unable to resolve "${imagePath}", using fallback cover`);
    return resolveImage(FALLBACK_COVER, variantKey, variant);
  }
}

export async function getResponsiveImage(
  imagePath: string,
  imageType: ImageType = "galleryLightbox",
): Promise<ResponsiveImageData> {
  const { sizes, variantKey } = IMAGE_CONFIGS[imageType];
  return { ...(await resolveSources(imagePath, variantKey)), sizes };
}
