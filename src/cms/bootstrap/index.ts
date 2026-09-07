import { type MediaCredentials, resolveCredentials } from "@/cms/bootstrap/credentials";
import { S3_SERVICE_ID, readApiKey, readUser, writeApiKey } from "@/cms/bootstrap/storage";
import { MEDIA_ACCESS_KEY_PLACEHOLDER } from "@/cms/media";
import type { CmsConfig } from "@/cms/types";

/** How often the sign-in watcher looks for a token, and for how long. */
const POLL_MS = 1000;
const POLL_LIMIT_MS = 15 * 60 * 1000;

/** Set once per tab so a failed credential fetch can never cause a reload loop. */
const RELOADED_FLAG = "oktech-cms.credentials-reloaded";

/**
 * Stamp the derived access key id onto every `aws_s3` media library in the config.
 *
 * Sveltia takes `access_key_id` from the site config and the secret from the editor's
 * preferences (`services/integrations/media-libraries/cloud/s3/core.js`), so the id — which
 * is per-editor and expires — has to be injected here, before `CMS.init` freezes the config
 * into its store. Every image field carries its own copy of the library, hence the walk.
 */
function stampAccessKeyId(node: unknown, accessKeyId: string): number {
  if (!node || typeof node !== "object") return 0;

  if (Array.isArray(node)) {
    return node.reduce<number>((total, item) => total + stampAccessKeyId(item, accessKeyId), 0);
  }

  const record = node as Record<string, unknown>;
  const library = record[S3_SERVICE_ID];
  let stamped = 0;

  if (library && typeof library === "object") {
    const options = library as Record<string, unknown>;

    if (options.access_key_id === MEDIA_ACCESS_KEY_PLACEHOLDER) {
      options.access_key_id = accessKeyId;
      stamped += 1;
    }
  }

  return Object.values(record).reduce<number>(
    (total, value) => total + stampAccessKeyId(value, accessKeyId),
    stamped,
  );
}

function apply(config: CmsConfig, credential: MediaCredentials): void {
  if (readApiKey(S3_SERVICE_ID) !== credential.secretAccessKey) {
    writeApiKey(S3_SERVICE_ID, credential.secretAccessKey);
  }

  stampAccessKeyId(config, credential.accessKeyId);
}

/**
 * Wait for a first sign-in, then reload.
 *
 * Sveltia has no sign-in event to hook (`SUPPORTED_EVENT_TYPES` is save/publish only), and
 * the config it is already running with has the placeholder id baked in, so the credential
 * cannot be injected in place. Polling the user entry and reloading once is the honest
 * version: the token is cached by then, so the reloaded page signs in without a prompt and
 * this whole path is skipped.
 */
function watchForSignIn(authBaseUrl: string): void {
  if (window.sessionStorage.getItem(RELOADED_FLAG)) return;

  const startedAt = Date.now();

  const timer = window.setInterval(() => {
    const user = readUser();

    if (!user?.token) {
      if (Date.now() - startedAt > POLL_LIMIT_MS) window.clearInterval(timer);
      return;
    }

    window.clearInterval(timer);

    void resolveCredentials(authBaseUrl, user).then((credential) => {
      if (!credential) return;

      window.sessionStorage.setItem(RELOADED_FLAG, "1");
      window.location.reload();
    });
  }, POLL_MS);
}

/**
 * Give the CMS an upload credential derived from the editor's GitHub account, so nobody has
 * to be handed a key. Does nothing unless both the upload Worker and the auth Worker are
 * configured; the CMS is fully usable either way.
 */
export async function bootstrapMediaUploads(config: CmsConfig): Promise<void> {
  const { PUBLIC_MEDIA_UPLOAD_ENDPOINT: endpoint, PUBLIC_CMS_AUTH_BASE_URL: authBaseUrl } =
    import.meta.env;

  if (!endpoint || !authBaseUrl) return;

  const user = readUser();

  if (!user?.token) {
    watchForSignIn(authBaseUrl);
    return;
  }

  const credential = await resolveCredentials(authBaseUrl, user);

  if (credential) apply(config, credential);
}
