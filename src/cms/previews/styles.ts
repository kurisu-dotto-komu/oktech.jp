// `?url` makes Vite emit the site's stylesheet as its own hashed asset and hand back the
// built path, so the preview iframe loads exactly the Tailwind + DaisyUI CSS the site does.
import siteStylesheet from "@/styles/global.css?url";

type RegisterPreviewStyle = (style: string, options?: { raw?: boolean }) => void;

/**
 * Astro's Fonts API inlines its `@font-face` rules (and the `--font-lexend` variable) into
 * every page it renders, under a build-specific family name — there is no stable URL to
 * link. Copying those rules out of the admin document is what gets the site's face into the
 * iframe; without it the preview falls back to the generic sans-serif in `fonts.css`.
 */
function inlineFontFaces(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((element) => element.textContent ?? "")
    .filter((css) => css.includes("@font-face"))
    .join("\n");
}

export function registerPreviewStyles(registerPreviewStyle: RegisterPreviewStyle): void {
  registerPreviewStyle(siteStylesheet);

  const fonts = inlineFontFaces();
  if (fonts) registerPreviewStyle(fonts, { raw: true });
}
