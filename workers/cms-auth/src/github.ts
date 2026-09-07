/**
 * Asking GitHub who the caller is and whether they may write to the repository, using the
 * caller's own token. No app credential, no installation and no server-side list of editors
 * is involved — the token belongs to the user, so it can only answer about them.
 */
const API = "https://api.github.com";

const request = (path: string, token: string): Promise<Response> =>
  fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "oktech-cms-auth",
    },
  });

/** GitHub logins are alphanumeric with single inner hyphens. */
const LOGIN_PATTERN = /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/;

/** The `permissions` object `GET /repos/{repo}` returns for the authenticated user. */
interface RepositoryPermissions {
  admin?: boolean;
  maintain?: boolean;
  push?: boolean;
}

export interface Viewer {
  login: string;
  /** Whether this account may push to the repository — i.e. may edit the site. */
  canWrite: boolean;
}

/** The authenticated login, or `null` when the token is invalid or the login is malformed. */
export async function fetchLogin(token: string): Promise<string | null> {
  const response = await request("/user", token);

  if (!response.ok) {
    return null;
  }

  const { login } = (await response.json()) as { login?: string };

  return typeof login === "string" && LOGIN_PATTERN.test(login) ? login : null;
}

/**
 * Whether the caller may push to `repo`.
 *
 * This reads the `permissions` object on the repository itself rather than
 * `/collaborators/{login}/permission`: that endpoint wants the full `repo` OAuth scope and
 * answers `403` for the narrower `public_repo` scope Sveltia requests, which would look
 * exactly like "no access". `GET /repos/{repo}` needs only read access and reports the
 * authenticated user's own permissions, so it gives the right answer for every editor.
 */
export async function fetchViewer(token: string, repo: string): Promise<Viewer | null> {
  const login = await fetchLogin(token);

  if (!login) {
    return null;
  }

  const response = await request(`/repos/${repo}`, token);

  if (!response.ok) {
    return { login, canWrite: false };
  }

  const { permissions } = (await response.json()) as { permissions?: RepositoryPermissions };

  return { login, canWrite: !!(permissions?.push || permissions?.maintain || permissions?.admin) };
}
