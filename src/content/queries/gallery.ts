import { type ImageDimensions, resolveImageDimensions } from "@/utils/images";
import { type ResponsiveImageData, getResponsiveImage } from "@/utils/responsiveImage";

/** One photo of an event's gallery, with the two renditions the album and lightbox need. */
export type GalleryImage = {
  id: string;
  data: { image: string; caption?: string };
  thumbnail: ResponsiveImageData;
  full: ResponsiveImageData;
  dimensions: ImageDimensions;
};

type Photo = { src: string; caption?: string };

/**
 * Resolves an event's authored `gallery:` list. The order is the editor's: it used to be
 * whatever order the file system handed the images over in, which no one could change.
 */
export async function resolveGallery(gallery: readonly Photo[] = []): Promise<GalleryImage[]> {
  return Promise.all(
    gallery.map(async ({ src, caption }) => {
      const [thumbnail, full, dimensions] = await Promise.all([
        getResponsiveImage(src, "galleryThumbnail"),
        getResponsiveImage(src, "galleryLightbox"),
        resolveImageDimensions(src),
      ]);
      return { id: src, data: { image: src, ...(caption ? { caption } : {}) }, thumbnail, full, dimensions }; // prettier-ignore
    }),
  );
}
