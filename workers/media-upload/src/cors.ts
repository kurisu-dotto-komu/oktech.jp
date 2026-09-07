import { originAllowed } from "../../shared/origins";
import type { Env } from "./types";

const DEFAULT_ALLOWED_HEADERS =
  "authorization, content-type, x-amz-acl, x-amz-content-sha256, x-amz-date";

/** `ALLOWED_ORIGINS` entries are full origins and may use `*` as a wildcard. */
const isAllowedOrigin = (origin: string | null, env: Env): boolean =>
  originAllowed(env.ALLOWED_ORIGINS, origin);

/** Adds the CORS headers to a response built by a route handler. */
export function withCors(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers(response.headers);

  headers.set("Vary", "Origin");

  if (isAllowedOrigin(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin as string);
    headers.set("Access-Control-Expose-Headers", "ETag");
  }

  return new Response(response.body, { status: response.status, headers });
}

/**
 * Answers the browser preflight that Sveltia's signed `PUT` triggers. The origin allowlist
 * is the only gate here; the request itself is still signature-verified.
 */
export function handlePreflight(request: Request, env: Env): Response {
  const origin = request.headers.get("Origin");

  if (!isAllowedOrigin(origin, env)) {
    return new Response("Origin not allowed\n", { status: 403, headers: { Vary: "Origin" } });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin as string,
      "Access-Control-Allow-Methods": "GET, HEAD, PUT, OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") ?? DEFAULT_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "3600",
      Vary: "Origin",
    },
  });
}
