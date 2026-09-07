import type { Maintainer } from "./types";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isNonEmptyString);

function toMaintainer(row: unknown): Maintainer | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }

  const { name, accessKeyId, secretAccessKey, prefixes, overwrite } = row as Record<
    string,
    unknown
  >;

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(accessKeyId) ||
    !isNonEmptyString(secretAccessKey)
  ) {
    return null;
  }

  return {
    name,
    accessKeyId,
    secretAccessKey,
    ...(isStringArray(prefixes) && { prefixes }),
    ...(overwrite === true && { overwrite: true }),
  };
}

/**
 * Parse the `MAINTAINERS` secret. Malformed rows are dropped rather than throwing, so one
 * bad entry cannot lock every editor out; an empty result means nobody is whitelisted and
 * every request is rejected.
 */
export function parseMaintainers(raw: string | undefined): Maintainer[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.map(toMaintainer).filter((row): row is Maintainer => row !== null)
      : [];
  } catch {
    return [];
  }
}
