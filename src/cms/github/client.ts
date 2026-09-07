import { readUser } from "@/cms/bootstrap/storage";

const API = "https://api.github.com";

/**
 * The GitHub token Sveltia already holds, or `undefined` when nobody is signed in — which
 * is also the case for the local-repository and test-repo backends, where there is no
 * pull request to look for.
 */
export const githubToken = (): string | undefined => readUser()?.token || undefined;

/** The signed-in login, needed because open authoring pushes branches from a fork. */
export const githubLogin = (): string | undefined => readUser()?.login || undefined;

/**
 * A GET against the GitHub REST API. Every failure — offline, rate limited, 404 on a fork
 * that does not exist — resolves to `undefined`: none of the callers here is important
 * enough to interrupt an editor with.
 */
export async function githubGet<T>(path: string): Promise<T | undefined> {
  const token = githubToken();
  if (!token) return undefined;

  try {
    const response = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    return response.ok ? ((await response.json()) as T) : undefined;
  } catch {
    return undefined;
  }
}
