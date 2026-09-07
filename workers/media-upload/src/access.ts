import { listIncludes } from "../../shared/env";
import { fetchPermission } from "./github";
import type { Env } from "./types";

/** Permissions that count as "may edit the site". */
export const WRITE_PERMISSIONS = ["write", "maintain", "admin"];

/** How long a live permission answer is reused. */
const CACHE_MS = 5 * 60 * 1000;

const cache = new Map<string, { allowed: boolean; expiresAt: number }>();

export type AccessResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Everything that can revoke a credential that is otherwise still valid.
 *
 * `DENYLIST` is the immediate kill switch and is always checked. The live GitHub re-check
 * runs only when the App secrets are configured, and it **fails open**: an unreachable or
 * unauthorised GitHub means "cannot tell", not "denied", so a GitHub outage does not lock
 * every editor out of a credential the signature already proves this Worker minted. Only a
 * definitive answer that the login lacks write access rejects the request.
 */
export async function checkAccess(login: string, env: Env): Promise<AccessResult> {
  if (listIncludes(env.DENYLIST, login)) {
    return { ok: false, status: 403, message: "This account's upload access has been revoked" };
  }

  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY || !env.REPO) {
    return { ok: true };
  }

  const key = login.toLowerCase();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > Date.now()) {
    return hit.allowed
      ? { ok: true }
      : { ok: false, status: 403, message: "No write access to the repository" };
  }

  let permission: string | null = null;

  try {
    permission = await fetchPermission(login, env);
  } catch {
    permission = null;
  }

  if (permission === null) {
    return { ok: true };
  }

  const allowed = WRITE_PERMISSIONS.includes(permission);

  cache.set(key, { allowed, expiresAt: Date.now() + CACHE_MS });

  return allowed
    ? { ok: true }
    : { ok: false, status: 403, message: "No write access to the repository" };
}
