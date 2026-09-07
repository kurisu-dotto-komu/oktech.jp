import { buildCanonicalRequest, computeSignature, equalsConstantTime, parseAmzDate } from "./sigv4";
import type { Maintainer } from "./types";

const AUTHORIZATION_PATTERN =
  /^AWS4-HMAC-SHA256\s+Credential=([^/\s]+)\/(\d{8})\/([^/\s]+)\/([^/\s]+)\/aws4_request,\s*SignedHeaders=([a-z0-9;.\-_]+),\s*Signature=([0-9a-f]{64})$/;

/** Headers Sveltia always signs; anything less is a forged or downgraded request. */
const REQUIRED_SIGNED_HEADERS = ["host", "x-amz-content-sha256", "x-amz-date"];

export interface ParsedAuthorization {
  accessKeyId: string;
  dateStamp: string;
  region: string;
  service: string;
  signedHeaders: string;
  signature: string;
}

export function parseAuthorization(header: string | null): ParsedAuthorization | null {
  const match = header ? AUTHORIZATION_PATTERN.exec(header.trim()) : null;

  if (!match) {
    return null;
  }

  const [, accessKeyId, dateStamp, region, service, signedHeaders, signature] = match;

  return { accessKeyId, dateStamp, region, service, signedHeaders, signature };
}

export interface VerifyInput {
  method: string;
  url: URL;
  headers: Headers;
  /** SHA-256 of the body, already checked against the actual bytes by the caller. */
  payloadHash: string;
  maintainers: Maintainer[];
  maxClockSkewSeconds: number;
  now?: Date;
}

export type VerifyResult =
  | { ok: true; maintainer: Maintainer }
  | { ok: false; status: number; message: string };

/**
 * Recompute the SigV4 signature over the incoming request and match it against the
 * whitelist. Several rows may share an `accessKeyId` (the CMS config holds exactly one,
 * while each editor holds their own secret), so every candidate secret is tried.
 */
export async function verifyRequest({
  method,
  url,
  headers,
  payloadHash,
  maintainers,
  maxClockSkewSeconds,
  now = new Date(),
}: VerifyInput): Promise<VerifyResult> {
  const auth = parseAuthorization(headers.get("authorization"));

  if (!auth) {
    return { ok: false, status: 401, message: "Missing or malformed Authorization header" };
  }

  if (auth.service !== "s3") {
    return { ok: false, status: 403, message: "Unexpected credential scope" };
  }

  const signedHeaders = auth.signedHeaders.split(";");

  if (!REQUIRED_SIGNED_HEADERS.every((name) => signedHeaders.includes(name))) {
    return { ok: false, status: 403, message: "Required headers are not signed" };
  }

  const amzDate = headers.get("x-amz-date") ?? "";
  const requestDate = parseAmzDate(amzDate);

  if (!requestDate || amzDate.slice(0, 8) !== auth.dateStamp) {
    return { ok: false, status: 403, message: "Missing or malformed x-amz-date" };
  }

  if (Math.abs(now.getTime() - requestDate.getTime()) > maxClockSkewSeconds * 1000) {
    return { ok: false, status: 403, message: "Request date is outside the allowed skew" };
  }

  if (headers.get("x-amz-content-sha256") !== payloadHash) {
    return { ok: false, status: 400, message: "Body does not match x-amz-content-sha256" };
  }

  const canonicalRequest = buildCanonicalRequest({
    method,
    url,
    // `Host` is a forbidden header in browsers, so it never arrives; the CMS signs the
    // endpoint host, which is by definition the host this Worker was reached on.
    headers: signedHeaders.map((name) => [
      name,
      name === "host" ? url.host : (headers.get(name) ?? ""),
    ]),
    signedHeaders: auth.signedHeaders,
    payloadHash,
  });

  const candidates = maintainers.filter((row) => row.accessKeyId === auth.accessKeyId);

  for (const maintainer of candidates) {
    const expected = await computeSignature({
      secretAccessKey: maintainer.secretAccessKey,
      dateStamp: auth.dateStamp,
      region: auth.region,
      service: auth.service,
      amzDate,
      canonicalRequest,
    });

    if (equalsConstantTime(expected, auth.signature)) {
      return { ok: true, maintainer };
    }
  }

  return { ok: false, status: 403, message: "Signature does not match any maintainer" };
}
