import { cmsRepo } from "@/cms/backend";
import { githubGet, githubLogin, githubToken } from "@/cms/github/client";

/** Sveltia names the editorial-workflow branch `cms/<collection>/<slug>`. */
export const workflowBranch = (collection: string, slug: string) => `cms/${collection}/${slug}`;

export interface PullRequestInfo {
  number: number;
  url: string;
  headSha: string;
}

interface ApiPullRequest {
  number: number;
  html_url: string;
  head: { sha: string };
}

interface ApiStatus {
  statuses?: { context: string; state: string; target_url: string | null }[];
}

/** One in-flight or settled lookup per entry, so a re-render is not a new request. */
const cache = new Map<string, Promise<PullRequestInfo | undefined>>();

async function search(branch: string, owner: string): Promise<PullRequestInfo | undefined> {
  const query = `state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`;
  const found = await githubGet<ApiPullRequest[]>(`/repos/${cmsRepo()}/pulls?${query}`);
  const pull = found?.[0];
  return pull ? { number: pull.number, url: pull.html_url, headSha: pull.head.sha } : undefined;
}

async function lookup(collection: string, slug: string): Promise<PullRequestInfo | undefined> {
  const branch = workflowBranch(collection, slug);
  const owner = cmsRepo().split("/")[0]!;

  const direct = await search(branch, owner);
  if (direct) return direct;

  // `open_authoring` pushes the branch to the contributor's own fork instead.
  const login = githubLogin();
  return login && login !== owner ? search(branch, login) : undefined;
}

/**
 * The open pull request for an entry, or `undefined` when there is none — which is the
 * normal state for an entry nobody is editing. Never throws.
 */
export function findPullRequest(
  collection: string,
  slug: string,
): Promise<PullRequestInfo | undefined> {
  if (!githubToken()) return Promise.resolve(undefined);

  const key = `${collection}/${slug}`;
  const pending = cache.get(key) ?? lookup(collection, slug);
  cache.set(key, pending);
  return pending;
}

/** Drops the cached answer so the next lookup sees a pull request that has just been opened. */
export const forgetPullRequest = (collection: string, slug: string): void => {
  cache.delete(`${collection}/${slug}`);
};

/**
 * The deploy preview URL, read from the commit status the staging workflow sets. It only
 * exists once that workflow has finished, which is why the caller polls.
 */
export async function previewUrl(headSha: string, context: string): Promise<string | undefined> {
  const status = await githubGet<ApiStatus>(`/repos/${cmsRepo()}/commits/${headSha}/status`);
  const match = status?.statuses?.find(
    (entry) => entry.context === context && entry.state === "success",
  );
  return match?.target_url ?? undefined;
}
