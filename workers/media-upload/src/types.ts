/** Who a verified request belongs to, recovered from the SigV4 access key id. */
export interface Principal {
  /** GitHub login the credential was minted for. */
  login: string;
  /** When the credential stops verifying. */
  expiresAt: Date;
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
  /** Secret: the same value the auth Worker derives credentials from. */
  SERVER_SECRET: string;
  /** Comma-separated origins allowed to call this Worker from a browser; `*` is a wildcard. */
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
  /** Optional: comma-separated logins refused even while their credential is unexpired. */
  DENYLIST?: string;
  /** Optional: comma-separated logins allowed to replace an existing object. */
  OVERWRITE_LOGINS?: string;
  /** Optional `owner/repo` whose collaborators are re-checked live. Needs the App secrets. */
  REPO?: string;
  /** Optional: GitHub App id, for the live permission re-check. */
  GITHUB_APP_ID?: string;
  /** Optional: GitHub App private key, PKCS#8 PEM. Absent disables the live re-check. */
  GITHUB_APP_PRIVATE_KEY?: string;
}
