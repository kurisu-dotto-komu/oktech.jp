import { LuExternalLink, LuGitPullRequest, LuPencil } from "react-icons/lu";

import { cmsRepo } from "@/cms/backend";
import { CMS_PATH } from "@/utils/cms";

interface PreviewBannerProps {
  /** Deep link to edit the current page in the CMS; falls back to the general editor. */
  cmsHref?: string;
}

export const isPreviewBuild = Boolean(import.meta.env.PUBLIC_PREVIEW_PR);

/** Height of the bar; PageLayout offsets the fixed top bar and page by the same amount. */
export const PREVIEW_BAR_HEIGHT = "2rem";

/** Bar shown only on pull-request preview builds (PUBLIC_PREVIEW_PR is set by CI). */
export default function PreviewBanner({ cmsHref }: PreviewBannerProps) {
  const pr = import.meta.env.PUBLIC_PREVIEW_PR;
  if (!pr) return null;

  const branch = import.meta.env.PUBLIC_PREVIEW_BRANCH;
  const prUrl = `https://github.com/${cmsRepo()}/pull/${pr}`;
  const linkClass = "btn btn-xs join-item border-0 bg-rose-900/60 text-white hover:bg-rose-950";

  return (
    <div
      className="fixed top-0 left-0 z-[60] flex h-8 w-full items-center justify-between gap-4 bg-rose-700 px-3 text-xs text-white"
      role="status"
    >
      <span className="truncate">
        <span className="font-semibold tracking-wide uppercase">Preview build</span>
        <span className="ml-2 opacity-80">
          pull request #{pr}
          {branch && ` · ${branch}`} — not the live site
        </span>
      </span>
      <span className="join shrink-0">
        <a href={prUrl} className={linkClass} target="_blank" rel="noopener noreferrer">
          <LuGitPullRequest /> PR #{pr}
        </a>
        <a href={cmsHref ?? CMS_PATH} className={linkClass}>
          <LuPencil /> {cmsHref ? "Edit this page" : "Open CMS"}
        </a>
        <a href={`${prUrl}/files`} className={linkClass} target="_blank" rel="noopener noreferrer">
          <LuExternalLink /> Changes
        </a>
      </span>
    </div>
  );
}
