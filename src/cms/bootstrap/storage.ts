/**
 * Sveltia's own `localStorage` entries. Both keys and both shapes are read out of the
 * bundled source (`@sveltia/cms/dist/sveltia-cms.mjs.map`), not guessed:
 * `services/user/auth.svelte.js` and `services/user/prefs.svelte.js` write them through
 * `@sveltia/utils/storage`, which is a plain `JSON.stringify` wrapper over `localStorage`.
 */
export const SVELTIA_USER_KEY = "sveltia-cms.user";
export const SVELTIA_PREFS_KEY = "sveltia-cms.prefs";

/** The media library Sveltia signs upload-Worker requests with. */
export const S3_SERVICE_ID = "aws_s3";

/** Written by `fetchUserProfile`; only the fields we need are declared. */
export interface SveltiaUser {
  backendName?: string;
  login?: string;
  token?: string;
}

/** `prefs.apiKeys[serviceId]` is where a cloud-storage secret access key lives. */
interface SveltiaPrefs {
  apiKeys?: Record<string, string>;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A browser with storage disabled cannot run the CMS at all; nothing useful to do here.
  }
}

export const readUser = (): SveltiaUser | null => read<SveltiaUser>(SVELTIA_USER_KEY);

export const readApiKey = (serviceId: string): string | undefined =>
  read<SveltiaPrefs>(SVELTIA_PREFS_KEY)?.apiKeys?.[serviceId];

/**
 * Merge one secret into the stored preferences, leaving every other preference alone.
 *
 * This has to happen *before* `@sveltia/cms` is imported: its preferences module reads this
 * key once, on module evaluation, into reactive state that is then written back. A later
 * write here would be invisible to the running CMS and eventually overwritten by it.
 */
export function writeApiKey(serviceId: string, apiKey: string): void {
  const prefs = read<SveltiaPrefs>(SVELTIA_PREFS_KEY) ?? {};

  write(SVELTIA_PREFS_KEY, { ...prefs, apiKeys: { ...prefs.apiKeys, [serviceId]: apiKey } });
}
