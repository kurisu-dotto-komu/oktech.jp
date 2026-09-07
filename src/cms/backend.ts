import type { CmsBackend } from "@/cms/types";

const DEFAULT_REPO = "oktechjp/oktech.jp";
const DEFAULT_BRANCH = "main";

/**
 * GitHub backend. Without PUBLIC_CMS_AUTH_BASE_URL (the workers/cms-auth origin) browser
 * sign-in is unavailable and only token sign-in or local-repository mode work; media
 * uploads through the upload Worker need it too, to mint their credential.
 */
/** `owner/repo` the CMS commits to. */
export const cmsRepo = (): string => import.meta.env.PUBLIC_CMS_REPO || DEFAULT_REPO;

export function buildBackend(): CmsBackend {
  const env = import.meta.env;

  return {
    name: "github",
    repo: cmsRepo(),
    branch: env.PUBLIC_CMS_BRANCH || DEFAULT_BRANCH,
    base_url: env.PUBLIC_CMS_AUTH_BASE_URL || undefined,
    // Public repo: ask contributors for the narrowest GitHub grant (no private repo access)
    auth_scope: "public_repo",
    // Commit status set by .github/workflows/cloudflare-staging.yml on every PR
    preview_context: "cloudflare preview",
    // Contributors without write access propose changes from a fork (needs editorial workflow)
    open_authoring: true,
  };
}
