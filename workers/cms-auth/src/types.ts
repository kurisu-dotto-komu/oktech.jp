export interface Env {
  /** Comma-separated hostnames, `*` allowed. Gates both the OAuth flow and CORS. */
  ALLOWED_DOMAINS?: string;
  /** GitHub OAuth app credentials, consumed by the vendored upstream handler. */
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  /** Secret: shared with the media-upload Worker; the root of every derived credential. */
  SERVER_SECRET?: string;
  /** `owner/repo` whose write access decides who may upload. */
  REPO?: string;
  /** Optional: comma-separated logins granted upload access regardless of repo permission. */
  ALLOWED_LOGINS?: string;
  /** Origin of the media-upload Worker, echoed back so the CMS needs one source of truth. */
  MEDIA_ENDPOINT?: string;
  /** Bucket name the upload Worker is addressed with. */
  MEDIA_BUCKET?: string;
  /** Optional: override the 30-day credential lifetime. */
  CREDENTIAL_TTL_DAYS?: string;
}

/** The `/media-credentials` response body. */
export interface MediaCredentialsBody {
  accessKeyId: string;
  secretAccessKey: string;
  expiresAt: string;
  endpoint: string;
  bucket: string;
  login: string;
}
