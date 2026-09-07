import { deriveSecretAccessKey, parseAccessKeyId } from "../../shared/credentials";
import { buildCanonicalRequest, computeSignature, equalsConstantTime, parseAmzDate } from "./sigv4";
import type { Principal } from "./types";

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
  /** Shared with the auth Worker; the only thing that makes a signature verifiable. */
  serverSecret: string;
  maxClockSkewSeconds: number;
  now?: Date;
}

export type VerifyResult =
  | { ok: true; principal: Principal }
  | { ok: false; status: number; message: string };

/**
 * Recover the credential from the SigV4 `Credential=` field, re-derive its secret and
 * recompute the signature over the incoming request. No list of editors is consulted:
 * holding a signature that verifies *is* the proof that the auth Worker minted this
 * credential, and the expiry baked into the access key id bounds how long that lasts.
 */
export async function verifyRequest({
  method,
  url,
  headers,
  payloadHash,
  serverSecret,
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

  const parsed = parseAccessKeyId(auth.accessKeyId);

  if (!parsed || !serverSecret) {
    return { ok: false, status: 403, message: "Unrecognised access key id" };
  }

  if (parsed.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, status: 403, message: "Credential has expired; sign in again to renew it" };
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

  const expected = await computeSignature({
    secretAccessKey: await deriveSecretAccessKey(serverSecret, auth.accessKeyId),
    dateStamp: auth.dateStamp,
    region: auth.region,
    service: auth.service,
    amzDate,
    canonicalRequest,
  });

  if (!equalsConstantTime(expected, auth.signature)) {
    return { ok: false, status: 403, message: "Signature does not match the credential" };
  }

  return { ok: true, principal: parsed };
}
