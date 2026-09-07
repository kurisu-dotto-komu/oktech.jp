import { handlePreflight, withCors } from "./cors";
import { parseMaintainers } from "./maintainers";
import { checkKey, checkUpload, numberFromEnv } from "./policy";
import { listObjectsXml, parseRoute, textResponse, xmlResponse } from "./s3";
import { sha256Hex } from "./sigv4";
import type { Env, Maintainer } from "./types";
import { verifyRequest } from "./verify";

const DEFAULT_MAX_KEYS = 1000;
const DEFAULT_CLOCK_SKEW_SECONDS = 300;

async function handleList(env: Env, url: URL, bucket: string): Promise<Response> {
  const prefix = url.searchParams.get("prefix") ?? "";
  const maxKeys = Math.min(
    numberFromEnv(url.searchParams.get("max-keys") ?? "", DEFAULT_MAX_KEYS),
    DEFAULT_MAX_KEYS,
  );
  const cursor = url.searchParams.get("continuation-token") ?? undefined;
  const listed = await env.MEDIA.list({ prefix, limit: maxKeys, ...(cursor && { cursor }) });

  return xmlResponse(
    listObjectsXml({
      bucket,
      prefix,
      maxKeys,
      objects: listed.objects,
      ...(listed.truncated && listed.cursor && { nextContinuationToken: listed.cursor }),
    }),
  );
}

async function handlePut(
  env: Env,
  maintainer: Maintainer,
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<Response> {
  const keyCheck = checkKey(key, maintainer, env);

  if (!keyCheck.ok) {
    return textResponse(keyCheck.status, keyCheck.message);
  }

  const uploadCheck = checkUpload(key, contentType, body.byteLength, env);

  if (!uploadCheck.ok) {
    return textResponse(uploadCheck.status, uploadCheck.message);
  }

  if (!maintainer.overwrite && (await env.MEDIA.head(key))) {
    return textResponse(409, `${key} already exists; rename the file or ask for overwrite rights`);
  }

  const stored = await env.MEDIA.put(key, body, { httpMetadata: { contentType } });

  return new Response(null, { status: 200, headers: { ETag: `"${stored.etag}"` } });
}

async function handleHead(env: Env, key: string): Promise<Response> {
  const object = await env.MEDIA.head(key);

  return object
    ? new Response(null, {
        status: 200,
        headers: { ETag: `"${object.etag}"`, "Content-Length": String(object.size) },
      })
    : new Response(null, { status: 404 });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseRoute(url);

  if (!parsed) {
    return textResponse(404, "Not found");
  }

  const { bucket, key } = parsed;

  if (env.BUCKET_NAME && bucket !== env.BUCKET_NAME) {
    return textResponse(404, "Unknown bucket");
  }

  const maxBytes = numberFromEnv(env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024);

  if (Number(request.headers.get("Content-Length") ?? 0) > maxBytes) {
    return textResponse(413, `Upload exceeds ${maxBytes} bytes`);
  }

  const body = request.method === "PUT" ? await request.arrayBuffer() : new ArrayBuffer(0);

  const verified = await verifyRequest({
    method: request.method,
    url,
    headers: request.headers,
    payloadHash: await sha256Hex(body),
    maintainers: parseMaintainers(env.MAINTAINERS),
    maxClockSkewSeconds: numberFromEnv(env.MAX_CLOCK_SKEW_SECONDS, DEFAULT_CLOCK_SKEW_SECONDS),
  });

  if (!verified.ok) {
    return textResponse(verified.status, verified.message);
  }

  if (request.method === "GET" && !key && url.searchParams.get("list-type") === "2") {
    return handleList(env, url, bucket);
  }

  if (request.method === "PUT" && key) {
    return handlePut(
      env,
      verified.maintainer,
      key,
      body,
      request.headers.get("Content-Type") ?? "",
    );
  }

  if (request.method === "HEAD" && key) {
    return handleHead(env, key);
  }

  return textResponse(405, "Unsupported operation");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handlePreflight(request, env);
    }

    return withCors(await route(request, env), request, env);
  },
};
