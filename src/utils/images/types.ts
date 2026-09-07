export type ImageVariant = {
  widths: readonly number[];
  cropAspectRatio?: number;
};

export type LocalImageRef = { kind: "local"; path: string };
/** An image hosted outside the repo (e.g. the media bucket); optimised by Astro at build time. */
export type RemoteImageRef = { kind: "remote"; url: string };
export type ImageRef = LocalImageRef | RemoteImageRef;

export type ImageSources = { src: string; srcSet: string; width?: number; height?: number };

export type ImageDimensions = { width: number; height: number };

export const FALLBACK_DIMENSIONS: ImageDimensions = { width: 800, height: 600 };
