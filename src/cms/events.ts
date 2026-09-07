import type { AppEventListener } from "@sveltia/cms";

import { PREVIEW_CONTEXT } from "@/cms/backend";
import {
  type PullRequestInfo,
  findPullRequest,
  forgetPullRequest,
  previewUrl,
} from "@/cms/github/pullRequests";
import { showNotice } from "@/cms/notice";

/** Sveltia opens the pull request just after the commit, so the first look is usually early. */
const RETRY_DELAYS_MS = [1000, 2000, 3000, 4000];
const NOTICE_ID = "cms-pull-request-notice";

/** The slice of the `@sveltia/cms` API this module uses, so admin.astro can pass `CMS` in. */
export interface EventRegistry {
  registerEventListener(listener: AppEventListener): void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPullRequest(
  collection: string,
  slug: string,
): Promise<PullRequestInfo | undefined> {
  for (const wait of RETRY_DELAYS_MS) {
    await delay(wait);
    forgetPullRequest(collection, slug);
    const pull = await findPullRequest(collection, slug);
    if (pull) return pull;
  }
  return undefined;
}

async function announce(collection: string, slug: string, verb: string): Promise<void> {
  const pull = await waitForPullRequest(collection, slug);
  if (!pull) return;

  const message = `Pull request #${pull.number} ${verb}.`;
  showNotice(NOTICE_ID, message, [{ label: "Open on GitHub", href: pull.url }]);

  const preview = await previewUrl(pull.headSha, PREVIEW_CONTEXT);
  if (!preview) return;

  showNotice(NOTICE_ID, message, [
    { label: "Open on GitHub", href: pull.url },
    { label: "View preview", href: preview },
  ]);
}

/**
 * Tells the editor where the change went. Sveltia reports "Entry saved" and nothing else,
 * so the pull request it opened — and the deploy preview built from it — are otherwise only
 * findable by going to GitHub.
 */
export function registerCmsEvents(cms: EventRegistry): void {
  const listen = (name: "postSave" | "postPublish", verb: string) => {
    cms.registerEventListener({
      name,
      handler: ({ entry }) => {
        const collection = entry?.get("collection") as string | undefined;
        const slug = entry?.get("slug") as string | undefined;
        if (collection && slug) void announce(collection, slug, verb);
      },
    });
  };

  listen("postSave", "updated");
  listen("postPublish", "published");
}
