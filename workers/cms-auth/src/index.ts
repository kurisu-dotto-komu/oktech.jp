import { handlePreflight, withCors } from "./cors";
import { handleMediaCredentials } from "./mediaCredentials";
import type { Env } from "./types";
// Vendored verbatim from https://github.com/sveltia/sveltia-cms-auth (MIT, see LICENSE.txt);
// it owns `/auth` and `/callback`, and this file adds `/media-credentials` in front of it.
import upstream from "./upstream/index.js";

const MEDIA_CREDENTIALS_PATH = "/media-credentials";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname !== MEDIA_CREDENTIALS_PATH) {
      return upstream.fetch(request, env as Record<string, string>);
    }

    if (request.method === "OPTIONS") {
      return handlePreflight(request, env);
    }

    if (request.method !== "GET") {
      return withCors(new Response(null, { status: 405 }), request, env);
    }

    return withCors(await handleMediaCredentials(request, env), request, env);
  },
};
