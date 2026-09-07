import worker from "../src/index";
import type { Env, R2Bucket, R2ListResult, R2ObjectMeta } from "../src/types";
import { signLikeSveltia, toRequest } from "./sign";
import type { SignedShape } from "./sign";

export const ORIGIN = "https://cms.example.test";
export const ENDPOINT = "https://upload.example.test";
export const BUCKET = "example-media";
export const ACCESS_KEY_ID = "oktech-cms";
/** 40 base64 characters, the shape Sveltia's `apiKeyPattern` for `aws_s3` demands. */
export const SECRET = "p2ChKSlnzCAtH8SmfvcbUcjimBwihfQgJVP/YmLJ";
export const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;

/** In-memory stand-in for the R2 binding. */
export class FakeBucket implements R2Bucket {
  readonly objects = new Map<string, { meta: R2ObjectMeta; contentType?: string }>();

  async head(key: string): Promise<R2ObjectMeta | null> {
    return this.objects.get(key)?.meta ?? null;
  }

  async put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<R2ObjectMeta> {
    const meta: R2ObjectMeta = {
      key,
      size: value.byteLength,
      etag: `etag-${this.objects.size + 1}`,
      uploaded: new Date("2026-09-07T00:00:00.000Z"),
    };

    this.objects.set(key, {
      meta,
      ...(options?.httpMetadata?.contentType && { contentType: options.httpMetadata.contentType }),
    });

    return meta;
  }

  async list(options?: { prefix?: string; limit?: number }): Promise<R2ListResult> {
    const objects = [...this.objects.values()]
      .map((entry) => entry.meta)
      .filter((meta) => meta.key.startsWith(options?.prefix ?? ""))
      .slice(0, options?.limit ?? 1000);

    return { objects, truncated: false };
  }
}

export function makeEnv(overrides: Partial<Env> = {}): Env & { MEDIA: FakeBucket } {
  return {
    MEDIA: new FakeBucket(),
    MAINTAINERS: JSON.stringify([
      {
        name: "editor",
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET,
        prefixes: ["events/"],
      },
    ]),
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:4321`,
    ALLOWED_PREFIXES: "events/,venues/,series/",
    ALLOWED_CONTENT_TYPES: "image/webp,image/jpeg,image/png,image/avif,image/gif",
    MAX_UPLOAD_BYTES: "10485760",
    MAX_CLOCK_SKEW_SECONDS: "300",
    BUCKET_NAME: BUCKET,
    ...overrides,
  } as Env & { MEDIA: FakeBucket };
}

/** A PutObject shaped exactly like the one `uploadToS3` sends, `x-amz-acl` included. */
export const signedPut = (
  key: string,
  options: Partial<Parameters<typeof signLikeSveltia>[0]> = {},
) =>
  signLikeSveltia({
    method: "PUT",
    url: `${ENDPOINT}/${BUCKET}/${key}`,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET,
    body: PNG,
    extraHeaders: { "Content-Type": "image/png", "x-amz-acl": "public-read" },
    ...options,
  });

export const send = (shape: SignedShape, env: Env, overrides: Record<string, string> = {}) =>
  worker.fetch(toRequest(shape, { Origin: ORIGIN, ...overrides }), env);

let failures = 0;
let checks = 0;

export function check(label: string, condition: boolean, detail = ""): void {
  checks += 1;

  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

export function report(): never {
  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures === 0 ? 0 : 1);
}
