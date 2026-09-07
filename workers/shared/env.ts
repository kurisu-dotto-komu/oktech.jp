/** Reading Worker `vars`, which are always strings and always optional. */

/** `"a, b ,"` -> `["a", "b"]`. */
export const splitList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/** A positive number from a var, or the fallback when it is missing or nonsense. */
export const numberFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Case-insensitive membership, for comparing GitHub logins. */
export const listIncludes = (value: string | undefined, needle: string): boolean =>
  splitList(value).some((entry) => entry.toLowerCase() === needle.toLowerCase());
