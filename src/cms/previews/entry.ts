/**
 * Reading an entry inside a preview template.
 *
 * Sveltia hands the preview an Immutable Map, but the `immutable` types are not installed
 * here, so `entry` is untyped in practice. Everything below narrows through `unknown`
 * rather than trusting it, which is also what keeps a half-filled draft from throwing.
 */

/** The only Immutable Map method a preview needs. */
export interface EntryMap {
  getIn(keyPath: string[]): unknown;
}

interface ImmutableValue {
  toJS(): unknown;
}

const isImmutable = (value: unknown): value is ImmutableValue =>
  typeof value === "object" && value !== null && typeof Reflect.get(value, "toJS") === "function";

/** Immutable collections come back nested; plain values pass straight through. */
export const toPlain = (value: unknown): unknown => (isImmutable(value) ? value.toJS() : value);

export const readField = (entry: EntryMap, name: string): unknown =>
  toPlain(entry.getIn(["data", name]));

export function readText(entry: EntryMap, name: string): string | undefined {
  const value = readField(entry, name);
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

export function readNumber(entry: EntryMap, name: string): number | undefined {
  const value = readField(entry, name);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export const readBoolean = (entry: EntryMap, name: string): boolean =>
  readField(entry, name) === true;

/** Every list widget value, with the holes a draft leaves in it removed. */
export function readList(entry: EntryMap, name: string): unknown[] {
  const value = readField(entry, name);
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

export function readStringList(entry: EntryMap, name: string): string[] {
  return readList(entry, name).flatMap((item) =>
    typeof item === "string" && item.trim() ? [item.trim()] : [],
  );
}

/** One row of an object-list widget, read defensively field by field. */
export function rowText(row: unknown, name: string): string | undefined {
  if (typeof row !== "object" || row === null) return undefined;
  const value = Reflect.get(row, name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
