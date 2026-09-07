// Relative rather than `@/`: this file is bundled by Wrangler, which does not know the
// TypeScript path alias. The prefix has to be the one the CMS writes and the build reads.
import { UPLOADS_PREFIX, uploadKey } from "../../../src/uploads";
import type { Env } from "./types";

/**
 * Serves `/uploads/<key>` from the media bucket.
 *
 * `run_worker_first` in wrangler.jsonc limits this Worker to that one route, so every other
 * request is answered by the static asset layer without ever reaching here; `ASSETS.fetch`
 * is only the fallback for a route that slips through.
 *
 * Upload keys are content-addressed by name and never rewritten in place — an editor
 * uploading a replacement is told to rename the file — so they are safe to cache hard.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const READ_METHODS = new Set(["GET", "HEAD"]);

async function serveUpload(env: Env, request: Request, pathname: string): Promise<Response> {
  if (!READ_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const key = uploadKey(decodeURIComponent(pathname));
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", CACHE_CONTROL);

  return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith(UPLOADS_PREFIX)) return serveUpload(env, request, pathname);

    return env.ASSETS.fetch(request);
  },
};
