/**
 * Minimal glob matcher for dist-relative paths: `*` and `?` stay inside a path
 * segment, `**` crosses segments. No brace or character-class support.
 */
function toRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        const skipSlash = glob[i + 2] === "/";
        source += skipSlash ? "(?:.*/)?" : ".*";
        i += skipSlash ? 2 : 1;
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

export function parseAllowList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((glob) => glob.trim())
    .filter(Boolean);
}

export function createMatcher(globs: string[]): (path: string) => boolean {
  const patterns = globs.map(toRegExp);
  return (path: string) => patterns.some((pattern) => pattern.test(path));
}
