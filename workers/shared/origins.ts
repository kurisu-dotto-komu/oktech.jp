import { splitList } from "./env";

/**
 * Wildcard matching for the allowlists both Workers keep in `vars`. A `*` stands for one or
 * more characters and nothing else is special, which is the same rule the upstream
 * `sveltia-cms-auth` applies to `ALLOWED_DOMAINS` — so one hostname is judged identically
 * wherever it appears.
 */
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matches = (list: string | undefined, subject: string): boolean =>
  splitList(list).some((entry) =>
    new RegExp(`^${escapeRegExp(entry).replaceAll("\\*", ".+")}$`).test(subject),
  );

/** `ALLOWED_DOMAINS` holds bare hostnames, e.g. `*.example.com`. */
export function hostnameAllowed(list: string | undefined, origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  try {
    return matches(list, new URL(origin).hostname);
  } catch {
    return false;
  }
}

/** `ALLOWED_ORIGINS` holds full origins, e.g. `https://*.example.com`. */
export const originAllowed = (list: string | undefined, origin: string | null): boolean =>
  !!origin && matches(list, origin);
