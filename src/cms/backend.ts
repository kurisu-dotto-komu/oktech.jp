import type { CmsBackend } from "@/cms/types";

const DEFAULT_REPO = "oktechjp/oktech.jp";
const DEFAULT_BRANCH = "main";

/**
 * GitHub backend. Without PUBLIC_CMS_AUTH_BASE_URL (the sveltia-cms-auth worker origin)
 * browser sign-in is unavailable and only token sign-in or local-repository mode work.
 */
export function buildBackend(): CmsBackend {
  const env = import.meta.env;

  return {
    name: "github",
    repo: env.PUBLIC_CMS_REPO || DEFAULT_REPO,
    branch: env.PUBLIC_CMS_BRANCH || DEFAULT_BRANCH,
    base_url: env.PUBLIC_CMS_AUTH_BASE_URL || undefined,
    // Contributors without write access propose changes from a fork (needs editorial workflow)
    open_authoring: true,
  };
}
