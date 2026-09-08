import { uploadsPublicUrl } from "@/cms/media";
import { uploadKey } from "@/uploads";

/** Marks both the preview box and the image this module owns, so neither is injected twice. */
const OWNED = "data-cms-thumbnail";

/** The image/file field control: `.preview` box, then the value in `.filename`. */
const CONTROL = ".filled";

function thumbnailUrl(value: string): string | undefined {
  const key = uploadKey(value.trim());
  return key ? `${uploadsPublicUrl()}/${key}` : undefined;
}

/** Adds, updates or removes our image for one field control. Safe to run on any element. */
function sync(control: Element): void {
  const preview = control.querySelector(".preview");
  const filename = control.querySelector(".filename");
  if (!preview || !filename) return;

  const url = thumbnailUrl(filename.textContent ?? "");
  const existing = preview.querySelector<HTMLImageElement>(`img[${OWNED}]`);

  // Not an upload reference (any more): give Sveltia's own placeholder back
  if (!url || !preview.classList.contains("no-thumbnail")) {
    existing?.remove();
    preview.removeAttribute(OWNED);
    return;
  }

  if (existing) {
    if (existing.src !== url) existing.src = url;
    return;
  }

  const image = document.createElement("img");
  image.setAttribute(OWNED, "");
  image.loading = "lazy";
  image.alt = "";
  image.src = url;
  preview.setAttribute(OWNED, "");
  preview.append(image);
}

/**
 * Shows the real image next to a `cloudflare:/<key>` value in an image field.
 *
 * Sveltia resolves a field value to a preview through `getMediaFieldURL()`, which passes a value
 * through only when it starts with `https:`, `data:` or `blob:` and otherwise looks the value up
 * among the repository's own files (`services/assets/info.js`). A bucket reference is neither, so
 * the control falls back to a document icon beside the raw text. There is no hook, no scheme
 * registry and no reverse lookup from `public_url` to extend — the field control is a Svelte
 * component with no extension point, and `CMS.getFieldType('image')` returns nothing, so the
 * control cannot be wrapped or re-registered either.
 *
 * What is left is the DOM. Every image field renders the value into `.filename` and its preview
 * into a sibling `.preview`; when the preview could not be resolved that box carries
 * `no-thumbnail` and holds nothing but an icon. This adds an `<img>` to exactly those boxes and
 * hides the icon with the two rules in `admin.astro` that key off the same attribute. Nothing
 * Svelte owns is removed, so a re-render simply drops our image and the observer puts it back.
 *
 * **This is version-sensitive.** It depends on those three class names, and it fails to the
 * current behaviour — the icon and the raw text — if a Sveltia release renames them. The preview
 * pane, which resolves the scheme properly, is unaffected either way.
 */
export function registerFieldThumbnails(): void {
  const WATCH = { childList: true, subtree: true, characterData: true } as const;
  let scheduled = false;

  // Every keystroke in the editor is a mutation, so the passes are coalesced into one per frame,
  // and the observer is stopped while it runs: our own writes would otherwise schedule another.
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      observer.disconnect();
      document.querySelectorAll(CONTROL).forEach(sync);
      observer.observe(document.body, WATCH);
    });
  };

  const observer = new MutationObserver(schedule);

  observer.observe(document.body, WATCH);
}
