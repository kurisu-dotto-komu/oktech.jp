import { LuExternalLink, LuGitPullRequest, LuPencil } from "react-icons/lu";

import { cmsRepo } from "@/cms/backend";
import { CMS_PATH } from "@/utils/cms";

interface PreviewBannerProps {
  /** Deep link to edit the current page in the CMS; falls back to the general editor. */
  cmsHref?: string;
}

/** Overlay shown only on pull-request preview builds (PUBLIC_PREVIEW_PR is set by CI). */
export default function PreviewBanner({ cmsHref }: PreviewBannerProps) {
  const pr = import.meta.env.PUBLIC_PREVIEW_PR;
  if (!pr) return null;

  const branch = import.meta.env.PUBLIC_PREVIEW_BRANCH;
  const prUrl = `https://github.com/${cmsRepo()}/pull/${pr}`;
  const linkClass = "btn btn-sm border-white/40 bg-red-700 text-white hover:bg-red-800";

  return (
    <>
      <div
        className="pointer-events-none fixed top-0 left-0 z-[60] w-full bg-red-600 py-0.5 text-center text-xs font-semibold tracking-wide text-white uppercase"
        role="status"
      >
        Preview build — pull request #{pr}
        {branch && <span className="ml-2 font-normal normal-case opacity-80">({branch})</span>}
      </div>
      <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2 rounded-lg bg-red-600 p-3 text-white shadow-lg">
        <span className="text-xs font-semibold tracking-wide uppercase">
          This is a preview, not the live site
        </span>
        <div className="flex flex-wrap gap-2">
          <a href={prUrl} className={linkClass} target="_blank" rel="noopener noreferrer">
            <LuGitPullRequest /> Open PR #{pr}
          </a>
          <a href={cmsHref ?? CMS_PATH} className={linkClass}>
            <LuPencil /> {cmsHref ? "Edit this page" : "Open CMS"}
          </a>
          <a
            href={`${prUrl}/files`}
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LuExternalLink /> Changes
          </a>
        </div>
      </div>
    </>
  );
}
