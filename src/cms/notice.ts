/**
 * A small dismissible bar at the bottom of `/admin`.
 *
 * Plain DOM on purpose: this is outside Sveltia's component tree, and the site's Tailwind
 * build is not loaded on the admin page, so the styling is the scoped rule set in
 * `src/pages/admin.astro` that `NOTICE_CLASS` selects.
 */
export const NOTICE_CLASS = "cms-notice";

export interface NoticeLink {
  label: string;
  href: string;
}

const remove = (id: string) => document.getElementById(id)?.remove();

/**
 * Shows (or replaces) the notice with the given id. Reusing an id is what lets a later
 * update — a preview URL arriving after the pull request link — replace the bar in place
 * rather than stacking a second one.
 */
export function showNotice(id: string, message: string, links: NoticeLink[] = []): void {
  remove(id);

  const notice = document.createElement("div");
  notice.id = id;
  notice.className = NOTICE_CLASS;
  notice.setAttribute("role", "status");

  const text = document.createElement("span");
  text.textContent = message;
  notice.append(text);

  links.forEach(({ label, href }) => {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    notice.append(link);
  });

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", () => remove(id));
  notice.append(dismiss);

  document.body.append(notice);
}
