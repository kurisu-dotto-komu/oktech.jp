/**
 * A deliberately independent transcription of the signer Sveltia CMS ships in
 * `@sveltia/cms/dist` (`media-libraries/cloud/s3/core.js`: `generateAwsSignature` and
 * `signedRequest`). It shares no code with `src/`, so the round-trip test below proves the
 * Worker verifies what the CMS actually sends rather than what our own signer produces.
 */
const encoder = new TextEncoder();

const hmac = async (key: string | Uint8Array, data: string): Promise<Uint8Array> => {
  const raw = typeof key === "string" ? encoder.encode(key) : key;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
};

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const sha256 = async (data: string | ArrayBuffer): Promise<string> =>
  hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", typeof data === "string" ? encoder.encode(data) : data),
    ),
  );

export interface SignedShape {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: ArrayBuffer;
}

export interface SignOptions {
  method: string;
  url: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  body?: ArrayBuffer;
  extraHeaders?: Record<string, string>;
  date?: Date;
}

export async function signLikeSveltia({
  method,
  url,
  accessKeyId,
  secretAccessKey,
  region = "auto",
  body = new ArrayBuffer(0),
  extraHeaders = {},
  date = new Date(),
}: SignOptions): Promise<SignedShape> {
  const urlObj = new URL(url);
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256(body.byteLength ? body : "");

  const headers: Record<string, string> = {
    Host: urlObj.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...extraHeaders,
  };

  const canonicalQueryString = [...urlObj.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const canonicalHeaders = Object.entries(headers)
    .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}`)
    .sort()
    .join("\n");

  const signedHeaders = Object.keys(headers)
    .map((key) => key.toLowerCase())
    .sort()
    .join(";");

  const canonicalRequest = [
    method,
    urlObj.pathname,
    canonicalQueryString,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  ].join(" ");

  return { method, url, headers: { ...headers, Authorization: authorization }, body };
}

/** Browsers drop the forbidden `Host` header, so the wire request never carries it. */
export function toRequest(shape: SignedShape, overrides: Record<string, string> = {}): Request {
  const { Host: _host, ...headers } = { ...shape.headers, ...overrides };
  const hasBody = shape.method !== "GET" && shape.method !== "HEAD";

  return new Request(shape.url, {
    method: shape.method,
    headers,
    ...(hasBody && { body: shape.body }),
  });
}
