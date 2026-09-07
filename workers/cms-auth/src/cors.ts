import { hostnameAllowed } from "../../shared/origins";
import type { Env } from "./types";

/**
 * `/media-credentials` is called with `fetch()` from `/admin`, so it needs CORS. The
 * allowlist is the same `ALLOWED_DOMAINS` the OAuth flow already gates on, matched by
 * hostname — one variable decides which sites this Worker serves at all.
 */
const isAllowed = (request: Request, env: Env): boolean =>
  hostnameAllowed(env.ALLOWED_DOMAINS, request.headers.get("Origin"));

export function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);

  headers.set("Vary", "Origin");

  if (isAllowed(request, env)) {
    headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") as string);
  }

  return new Response(response.body, { status: response.status, headers });
}

export function handlePreflight(request: Request, env: Env): Response {
  if (!isAllowed(request, env)) {
    return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("Origin") as string,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") ?? "authorization",
      "Access-Control-Max-Age": "3600",
      Vary: "Origin",
    },
  });
}
