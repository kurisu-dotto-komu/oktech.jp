import type { CustomFieldControlProps } from "@sveltia/cms";

import { cmsRepo } from "@/cms/backend";

export const PULL_REQUEST_WIDGET = "pull_request";

/** Sveltia names the editorial-workflow branch `cms/<collection>/<slug>`. */
function pullRequestSearchUrl(collection: string, slug: string): string {
  const query = encodeURIComponent(`is:pr head:cms/${collection}/${slug}`);
  return `https://github.com/${cmsRepo()}/pulls?q=${query}`;
}

// Rendered inside Sveltia's own UI, where the site's Tailwind styles are not loaded.
/**
 * Read-only control linking to the entry's pull request on GitHub. Sveltia has no
 * built-in PR link, and the branch name is deterministic, so a search by head branch
 * lands on the right PR without an API call.
 */
export default function PullRequestControl({ entry, forID }: CustomFieldControlProps) {
  const slug = entry?.get("slug") as string | undefined;
  const collection = entry?.get("collection") as string | undefined;
  const isNew = Boolean(entry?.get("newRecord"));

  if (!slug || !collection || isNew) {
    return (
      <p id={forID} style={{ margin: 0, opacity: 0.7 }}>
        A pull request is created when you save this entry.
      </p>
    );
  }

  return (
    <p id={forID} style={{ margin: 0 }}>
      <a href={pullRequestSearchUrl(collection, slug)} target="_blank" rel="noopener noreferrer">
        Open the pull request for this entry on GitHub ↗
      </a>
    </p>
  );
}
