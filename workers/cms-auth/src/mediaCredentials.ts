import { DEFAULT_TTL_DAYS, deriveCredential } from "../../shared/credentials";
import { listIncludes, numberFromEnv } from "../../shared/env";
import { fetchViewer } from "./github";
import type { Env, MediaCredentialsBody } from "./types";

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const bearer = (request: Request): string | null =>
  /^Bearer\s+(\S+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1] ?? null;

/**
 * `GET /media-credentials` — exchange a GitHub user token for a time-boxed upload
 * credential.
 *
 * The credential is not stored anywhere: it is a pure function of the login, the expiry
 * date and `SERVER_SECRET`, which is why the upload Worker can verify it with no database
 * and no shared list. Access is decided fresh on every call, so losing write access to the
 * repository ends the ability to mint one; the credential already in a browser then runs
 * out on its own (or is cut off immediately by the upload Worker's `DENYLIST`).
 */
export async function handleMediaCredentials(request: Request, env: Env): Promise<Response> {
  const { SERVER_SECRET: serverSecret, REPO: repo, MEDIA_ENDPOINT: endpoint } = env;

  if (!serverSecret || !repo || !endpoint || !env.MEDIA_BUCKET) {
    return json(503, { error: "Media credentials are not configured on this Worker" });
  }

  const token = bearer(request);

  if (!token) {
    return json(401, { error: "Send the GitHub token as `Authorization: Bearer <token>`" });
  }

  const viewer = await fetchViewer(token, repo);

  if (!viewer) {
    return json(401, { error: "GitHub did not accept that token" });
  }

  const allowed = viewer.canWrite || listIncludes(env.ALLOWED_LOGINS, viewer.login);

  if (!allowed) {
    return json(403, { error: `${viewer.login} does not have write access to ${repo}` });
  }

  const credential = await deriveCredential(serverSecret, viewer.login, {
    ttlDays: numberFromEnv(env.CREDENTIAL_TTL_DAYS, DEFAULT_TTL_DAYS),
  });

  const body: MediaCredentialsBody = {
    accessKeyId: credential.accessKeyId,
    secretAccessKey: credential.secretAccessKey,
    expiresAt: credential.expiresAt.toISOString(),
    endpoint,
    bucket: env.MEDIA_BUCKET,
    login: credential.login,
  };

  return json(200, body);
}
