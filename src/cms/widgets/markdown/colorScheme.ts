export type ColorScheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Sveltia resolves its own light/dark preference onto `<html data-theme>`; when the
 * attribute is missing (or set to something unexpected) the OS preference decides.
 */
export function readColorScheme(): ColorScheme {
  const theme = document.documentElement.dataset.theme;
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Notifies on both Sveltia theme switches and OS-level scheme changes. */
export function observeColorScheme(onChange: (scheme: ColorScheme) => void): () => void {
  const notify = () => onChange(readColorScheme());
  const media = window.matchMedia(DARK_QUERY);
  const observer = new MutationObserver(notify);

  media.addEventListener("change", notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => {
    media.removeEventListener("change", notify);
    observer.disconnect();
  };
}
