import fs from "node:fs/promises";
import path from "node:path";

/** Satori only understands raster data URLs, so anything else is re-encoded to JPEG. */
const CONVERT_TO_JPEG = new Set([".webp", ".avif", ".tif", ".tiff", ".gif"]);
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const MAX_DIMENSION = 1024;

const isRemote = (ref: string) => /^https?:\/\//i.test(ref);

function extensionOf(ref: string): string {
  const pathname = isRemote(ref) ? new URL(ref).pathname : ref;
  return path.extname(pathname).toLowerCase();
}

async function readBytes(ref: string): Promise<Buffer> {
  if (isRemote(ref)) {
    const response = await fetch(ref);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${ref}`);
    return Buffer.from(await response.arrayBuffer());
  }
  // Image references are repo-root-absolute ("/content/media/…", "/src/assets/…").
  return fs.readFile(path.join(process.cwd(), ref.replace(/^\/+/, "")));
}

/**
 * Loads an OG source image from its original reference — a repo path, a media-bucket URL or a
 * build-time stitched venue map — and returns it as a data URL Satori can embed.
 */
export async function loadSourceImage(ref: string | undefined | null): Promise<string | null> {
  if (!ref) return null;
  try {
    const bytes = await readBytes(ref);
    const extension = extensionOf(ref);
    if (CONVERT_TO_JPEG.has(extension)) {
      const sharp = (await import("sharp")).default;
      const converted = await sharp(bytes)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      return `data:image/jpeg;base64,${converted.toString("base64")}`;
    }
    return `data:${MIME_TYPES[extension] ?? "image/jpeg"};base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.warn(`[og] could not load source image "${ref}":`, error);
    return null;
  }
}
