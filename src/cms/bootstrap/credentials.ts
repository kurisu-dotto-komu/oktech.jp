import type { SveltiaUser } from "@/cms/bootstrap/storage";

/** Where the credential this browser holds is kept between visits. */
const CACHE_KEY = "oktech-cms.media-credentials";

/** Renew this long before the credential actually expires, so it never lapses mid-edit. */
const RENEW_MARGIN_MS = 2 * 24 * 60 * 60 * 1000;

/** Shape of the `GET /media-credentials` response from the cms-auth Worker. */
export interface MediaCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  expiresAt: string;
  login: string;
}

const isFresh = (credential: MediaCredentials, login: string | undefined): boolean =>
  credential.login === login &&
  Date.parse(credential.expiresAt) - RENEW_MARGIN_MS > Date.now() &&
  !!credential.accessKeyId &&
  !!credential.secretAccessKey;

function readCache(login: string | undefined): MediaCredentials | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as MediaCredentials) : null;

    return parsed && isFresh(parsed, login) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Swap the GitHub token Sveltia already holds for an upload credential.
 *
 * Nothing is pasted and nothing is shared: the Worker checks the caller's write access to
 * the repository and derives a credential that expires on its own. A failure is not fatal —
 * the CMS still runs, uploads just answer `403` until the next attempt succeeds.
 */
export async function fetchCredentials(
  authBaseUrl: string,
  token: string,
): Promise<MediaCredentials | null> {
  try {
    const response = await fetch(`${authBaseUrl.replace(/\/$/, "")}/media-credentials`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.warn("[cms] no upload credential:", response.status, await response.text());
      return null;
    }

    const credential = (await response.json()) as MediaCredentials;

    window.localStorage.setItem(CACHE_KEY, JSON.stringify(credential));

    return credential;
  } catch (error) {
    console.warn("[cms] could not reach the credential endpoint:", error);
    return null;
  }
}

/** The cached credential when it is still good for this login, otherwise a fresh one. */
export async function resolveCredentials(
  authBaseUrl: string,
  user: SveltiaUser,
): Promise<MediaCredentials | null> {
  return readCache(user.login) ?? (user.token ? fetchCredentials(authBaseUrl, user.token) : null);
}
