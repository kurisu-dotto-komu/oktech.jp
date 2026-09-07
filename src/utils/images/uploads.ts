import { uploadKey } from "@/uploads";

import type { RemoteImageRef } from "./types";

/**
 * Resolves a `/uploads/<key>` reference to the media host for the build.
 *
 * `PUBLIC_IMAGES_URL` is derived from `IMAGES_HOST` in `astro.config.ts`, which is also
 * what puts that host in `image.remotePatterns` — so the result is a URL Astro will fetch
 * and optimise. Without the variable there is nothing to point at and the reference falls
 * through to the local branch, which warns and uses the fallback cover.
 */
export function parseUploadRef(value: string): RemoteImageRef | null {
  const key = uploadKey(value);
  if (!key) return null;

  const base = import.meta.env.PUBLIC_IMAGES_URL;
  if (!base) return null;

  return { kind: "remote", url: `${base.replace(/\/$/, "")}/${key}` };
}
