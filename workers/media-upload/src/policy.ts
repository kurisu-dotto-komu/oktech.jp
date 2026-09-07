import type { Env, Maintainer } from "./types";

/** File extensions each allowed type may carry, so a key cannot lie about its content. */
const EXTENSIONS: Record<string, string[]> = {
  "image/avif": ["avif"],
  "image/gif": ["gif"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

const MAX_KEY_LENGTH = 256;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export type PolicyResult = { ok: true } | { ok: false; status: number; message: string };

const deny = (status: number, message: string): PolicyResult => ({ ok: false, status, message });

export const splitList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const numberFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Prefixes this maintainer may write to: their own list, narrowed to the global allowlist. */
export function allowedPrefixesFor(maintainer: Maintainer, env: Env): string[] {
  const global = splitList(env.ALLOWED_PREFIXES);

  if (!maintainer.prefixes?.length) {
    return global;
  }

  return maintainer.prefixes.filter((prefix) =>
    global.some((allowed) => prefix.startsWith(allowed)),
  );
}

export function checkKey(key: string, maintainer: Maintainer, env: Env): PolicyResult {
  if (!key || key.length > MAX_KEY_LENGTH) {
    return deny(400, "Object key is empty or too long");
  }

  if (
    key.startsWith("/") ||
    key.includes("//") ||
    key.includes("\\") ||
    key.split("/").includes("..") ||
    CONTROL_CHARACTERS.test(key)
  ) {
    return deny(400, "Object key is not a plain forward-slash path");
  }

  const prefixes = allowedPrefixesFor(maintainer, env);

  if (!prefixes.some((prefix) => key.startsWith(prefix))) {
    return deny(403, `Object key must start with one of: ${prefixes.join(", ") || "(none)"}`);
  }

  return { ok: true };
}

export function checkUpload(
  key: string,
  contentType: string,
  size: number,
  env: Env,
): PolicyResult {
  const type = contentType.split(";")[0].trim().toLowerCase();

  if (!splitList(env.ALLOWED_CONTENT_TYPES).includes(type)) {
    return deny(415, `Content-Type ${type || "(missing)"} is not an allowed image type`);
  }

  const extension = key.split(".").pop()?.toLowerCase() ?? "";

  if (EXTENSIONS[type] && !EXTENSIONS[type].includes(extension)) {
    return deny(400, `Object key extension does not match ${type}`);
  }

  const maxBytes = numberFromEnv(env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024);

  if (size > maxBytes) {
    return deny(413, `Upload exceeds ${maxBytes} bytes`);
  }

  return { ok: true };
}
