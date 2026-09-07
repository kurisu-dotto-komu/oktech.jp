/**
 * Derived upload credentials, shared by the two Workers so the two halves can never drift.
 *
 * Nobody is handed a key pair. The access key id is public and self-describing —
 * `<github-login>.<YYYYMMDD>` — and the secret is an HMAC of it under a server secret that
 * only the Workers hold. The auth Worker mints one after checking the caller's repository
 * permission; the upload Worker re-derives it from the access key id in the SigV4
 * `Credential=` field and verifies the signature. Revoking someone is removing their repo
 * access (they get no new credential) or adding them to the upload Worker's `DENYLIST`
 * (the one they hold stops working); rotating everyone is changing `SERVER_SECRET`.
 */
const encoder = new TextEncoder();

/** Days a minted credential stays valid. */
export const DEFAULT_TTL_DAYS = 30;

/**
 * Bytes of the HMAC kept as the secret. 30 bytes is 40 base64 characters with no padding,
 * which is exactly the shape Sveltia's `apiKeyPattern` for `aws_s3` accepts
 * (`/^[A-Za-z0-9/+=]{40}$/`) — so the secret can also be pasted by hand into the CMS
 * settings dialog when the automatic bootstrap is unavailable. Base64url would be rejected
 * there, which is why this is plain base64.
 */
const SECRET_BYTES = 30;

/** GitHub logins are alphanumeric with single inner hyphens, so `.` splits them safely. */
export const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/;

const ACCESS_KEY_PATTERN = /^([A-Za-z0-9-]{1,39})\.(\d{8})$/;

export interface DerivedCredential {
  /** `<login>.<YYYYMMDD>`, public: it travels in every `Authorization` header. */
  accessKeyId: string;
  /** 40 base64 characters. Held only by the editor's browser. */
  secretAccessKey: string;
  /** Midnight UTC of the stamped day: the instant the credential stops verifying. */
  expiresAt: Date;
  login: string;
}

/** `2026-10-07T…` -> `20261007`. */
export const toExpiryStamp = (date: Date): string =>
  date.toISOString().slice(0, 10).replaceAll("-", "");

export const addDays = (from: Date, days: number): Date =>
  new Date(from.getTime() + days * 86_400_000);

/**
 * Split an access key id back into its parts. The expiry is midnight UTC at the *start* of
 * the stamped day, so both Workers agree on the instant without carrying a clock in the id.
 */
export function parseAccessKeyId(accessKeyId: string): { login: string; expiresAt: Date } | null {
  const match = ACCESS_KEY_PATTERN.exec(accessKeyId);

  if (!match) {
    return null;
  }

  const [, login, stamp] = match;

  if (!GITHUB_LOGIN_PATTERN.test(login)) {
    return null;
  }

  const expiresAt = new Date(
    `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6)}T00:00:00Z`,
  );

  return Number.isNaN(expiresAt.getTime()) ? null : { login, expiresAt };
}

/** HMAC-SHA256 of the access key id under the server secret, truncated and base64'd. */
export async function deriveSecretAccessKey(
  serverSecret: string,
  accessKeyId: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(serverSecret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(accessKeyId)),
  );

  return btoa(String.fromCharCode(...signature.slice(0, SECRET_BYTES)));
}

/** Mint the credential for one login, valid for `ttlDays` from `now`. */
export async function deriveCredential(
  serverSecret: string,
  login: string,
  { now = new Date(), ttlDays = DEFAULT_TTL_DAYS }: { now?: Date; ttlDays?: number } = {},
): Promise<DerivedCredential> {
  const expiresAt = addDays(now, ttlDays);
  const accessKeyId = `${login}.${toExpiryStamp(expiresAt)}`;

  return {
    accessKeyId,
    secretAccessKey: await deriveSecretAccessKey(serverSecret, accessKeyId),
    // Re-parse so the returned instant is the same one the upload Worker will compute
    expiresAt: (parseAccessKeyId(accessKeyId) as { expiresAt: Date }).expiresAt,
    login,
  };
}
