import type { R2ObjectMeta } from "./types";

const escapeXml = (value: string): string =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] as string,
  );

/** Sveltia addresses this Worker as an S3 endpoint: `/{bucket}` to list, `/{bucket}/{key}` else. */
export function parseRoute(url: URL): { bucket: string; key: string } | null {
  const [bucket, ...rest] = url.pathname.slice(1).split("/");

  if (!bucket) {
    return null;
  }

  try {
    return { bucket, key: decodeURIComponent(rest.join("/")) };
  } catch {
    return null;
  }
}

export interface ListXmlInput {
  bucket: string;
  prefix: string;
  maxKeys: number;
  objects: R2ObjectMeta[];
  nextContinuationToken?: string;
}

/**
 * ListObjectsV2 XML. Sveltia parses this with `DOMParser` and reads `Contents`, `Key`,
 * `LastModified`, `Size`, `IsTruncated` and `NextContinuationToken` — nothing else.
 */
export function listObjectsXml({
  bucket,
  prefix,
  maxKeys,
  objects,
  nextContinuationToken,
}: ListXmlInput): string {
  const contents = objects
    .map((object) =>
      [
        "<Contents>",
        `<Key>${escapeXml(object.key)}</Key>`,
        `<LastModified>${object.uploaded.toISOString()}</LastModified>`,
        `<ETag>${escapeXml(object.etag)}</ETag>`,
        `<Size>${object.size}</Size>`,
        "<StorageClass>STANDARD</StorageClass>",
        "</Contents>",
      ].join(""),
    )
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">',
    `<Name>${escapeXml(bucket)}</Name>`,
    `<Prefix>${escapeXml(prefix)}</Prefix>`,
    `<MaxKeys>${maxKeys}</MaxKeys>`,
    `<KeyCount>${objects.length}</KeyCount>`,
    `<IsTruncated>${nextContinuationToken ? "true" : "false"}</IsTruncated>`,
    nextContinuationToken
      ? `<NextContinuationToken>${escapeXml(nextContinuationToken)}</NextContinuationToken>`
      : "",
    contents,
    "</ListBucketResult>",
  ].join("");
}

export const xmlResponse = (body: string): Response =>
  new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });

export const textResponse = (status: number, message: string): Response =>
  new Response(`${message}\n`, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
