/// <reference types="vite/client" />

/** Client-visible environment variables. All are optional; consumers fall back to defaults. */
interface ImportMetaEnv {
  /** Git repository backing the CMS, as `owner/repo`. */
  readonly PUBLIC_CMS_REPO?: string;
  /** Git branch the CMS commits to. */
  readonly PUBLIC_CMS_BRANCH?: string;
  /** Origin of the sveltia-cms-auth OAuth worker. */
  readonly PUBLIC_CMS_AUTH_BASE_URL?: string;
  /** Commit metadata injected by CI for the build footer. */
  readonly PUBLIC_SOURCE_COMMIT_HASH?: string;
  readonly PUBLIC_SOURCE_COMMIT_URL?: string;
}

declare module "*.svg?react" {
  import type { FunctionComponent, SVGProps } from "react";
  const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
