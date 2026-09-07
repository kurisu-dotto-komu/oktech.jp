/// <reference types="vite/client" />

/** Client-visible environment variables. All are optional; consumers fall back to defaults. */
interface ImportMetaEnv {
  /** Git repository backing the CMS, as `owner/repo`. */
  readonly PUBLIC_CMS_REPO?: string;
  /** Git branch the CMS commits to. */
  readonly PUBLIC_CMS_BRANCH?: string;
  /** Origin of the sveltia-cms-auth OAuth worker. */
  readonly PUBLIC_CMS_AUTH_BASE_URL?: string;
  /** Cloudflare R2 media library for CMS uploads (all four required to enable it). */
  readonly PUBLIC_R2_ACCOUNT_ID?: string;
  readonly PUBLIC_R2_ACCESS_KEY_ID?: string;
  readonly PUBLIC_R2_BUCKET?: string;
  /** Public base URL of the media bucket, e.g. https://images.<STAGING_HOST>. */
  readonly PUBLIC_IMAGES_URL?: string;
  /**
   * Origin of the upload Worker. When set, CMS uploads are signed against this endpoint
   * (which enforces the maintainer whitelist) instead of R2's own S3 endpoint.
   */
  readonly PUBLIC_MEDIA_UPLOAD_ENDPOINT?: string;
  /** Set by CI on pull-request preview builds; shows the preview overlay. */
  readonly PUBLIC_PREVIEW_PR?: string;
  readonly PUBLIC_PREVIEW_BRANCH?: string;
  /** Commit metadata injected by CI for the build footer. */
  readonly PUBLIC_SOURCE_COMMIT_HASH?: string;
  readonly PUBLIC_SOURCE_COMMIT_URL?: string;
}

declare module "*.svg?react" {
  import type { FunctionComponent, SVGProps } from "react";
  const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
