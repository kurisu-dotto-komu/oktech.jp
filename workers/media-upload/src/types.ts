/** One row of the `MAINTAINERS` secret: a whitelisted editor and what they may write. */
export interface Maintainer {
  /** Human label, used only in logs and error messages. */
  name: string;
  /** Public half of the pair; travels in the SigV4 `Credential=` field. */
  accessKeyId: string;
  /** Private half; pasted into the CMS settings by this editor only. */
  secretAccessKey: string;
  /** Key prefixes this editor may write to. Defaults to all of `ALLOWED_PREFIXES`. */
  prefixes?: string[];
  /** Allow replacing an existing object. Off by default so uploads never clobber. */
  overwrite?: boolean;
}

export interface R2ObjectMeta {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
}

export interface R2ListResult {
  objects: R2ObjectMeta[];
  truncated: boolean;
  cursor?: string;
}

export interface R2Bucket {
  head(key: string): Promise<R2ObjectMeta | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<R2ObjectMeta>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<R2ListResult>;
}

export interface Env {
  /** R2 binding holding the media bucket. */
  MEDIA: R2Bucket;
  /** Secret: JSON array of {@link Maintainer}. */
  MAINTAINERS: string;
  /** Comma-separated origins allowed to call this Worker from a browser. */
  ALLOWED_ORIGINS: string;
  /** Comma-separated key prefixes uploads must start with. */
  ALLOWED_PREFIXES: string;
  /** Comma-separated `Content-Type` allowlist. */
  ALLOWED_CONTENT_TYPES: string;
  /** Upload ceiling in bytes. */
  MAX_UPLOAD_BYTES: string;
  /** Rejected if `x-amz-date` is further than this from the Worker clock. */
  MAX_CLOCK_SKEW_SECONDS: string;
  /** Optional: require this bucket name in the request path. Empty accepts any. */
  BUCKET_NAME?: string;
}
