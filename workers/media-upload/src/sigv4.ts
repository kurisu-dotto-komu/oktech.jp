/**
 * AWS Signature Version 4, byte-compatible with the signer Sveltia CMS ships in
 * `media-libraries/cloud/s3/core.js`. Sveltia deviates from AWS in two places we must
 * copy exactly: the canonical query string uses `encodeURIComponent` rather than
 * RFC 3986 escaping, and the canonical headers are sorted as whole `name:value`
 * strings rather than by name.
 */
const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hmac = async (key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> => {
  const raw = typeof key === "string" ? encoder.encode(key) : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
};

export const sha256Hex = async (data: ArrayBuffer | string): Promise<string> =>
  toHex(
    await crypto.subtle.digest("SHA-256", typeof data === "string" ? encoder.encode(data) : data),
  );

export interface CanonicalRequestInput {
  method: string;
  url: URL;
  /** Signed headers as `[lowercased name, value]`, in any order. */
  headers: [string, string][];
  signedHeaders: string;
  payloadHash: string;
}

export function buildCanonicalRequest({
  method,
  url,
  headers,
  signedHeaders,
  payloadHash,
}: CanonicalRequestInput): string {
  const canonicalQueryString = [...url.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const canonicalHeaders = headers
    .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}`)
    .sort()
    .join("\n");

  return [
    method,
    url.pathname,
    canonicalQueryString,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
}

export interface SignatureInput {
  secretAccessKey: string;
  dateStamp: string;
  region: string;
  service: string;
  amzDate: string;
  canonicalRequest: string;
}

export async function computeSignature({
  secretAccessKey,
  dateStamp,
  region,
  service,
  amzDate,
  canonicalRequest,
}: SignatureInput): Promise<string> {
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");

  return toHex(await hmac(kSigning, stringToSign));
}

/** Length-independent, content-constant-time hex comparison. */
export function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

/** `2026-09-07T13:40:25.123Z` -> `20260907T134025Z`, the format Sveltia sends. */
export const toAmzDate = (date: Date): string => date.toISOString().replace(/[:-]|\.\d{3}/g, "");

/** Inverse of {@link toAmzDate}; returns `null` when the stamp is malformed. */
export function parseAmzDate(amzDate: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(amzDate);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
