/** Page bundle collections: the entry id is the folder name, never `<folder>/<file>`. */
export const folderId = ({ entry }: { entry: string }) => entry.split("/")[0]!;

/**
 * Normalises a reference value to the plain string an entry id is. YAML parses bare digits
 * as numbers and Sveltia's relation widget writes them locale formatted ("24,213,835").
 */
export const entryRef = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value).replace(/,/g, "");
