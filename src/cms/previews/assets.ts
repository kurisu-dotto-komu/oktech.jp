import { cmsRepo } from "@/cms/backend";

/** Sveltia's asset lookup; `undefined` for a path it does not know about. */
export type GetAsset = (path: string) => { url: string } | undefined;

const RAW_HOST = "https://raw.githubusercontent.com";

const branch = (): string => import.meta.env.PUBLIC_CMS_BRANCH || "main";

/**
 * Turns an image field value into something the preview iframe can actually load.
 *
 * `https://…` is already a URL. Anything else is a repository path: `getAsset` covers
 * files the CMS has indexed and the blob URL of a file uploaded in this session, and the
 * raw GitHub URL is the fallback for a committed file the index has not reached — which is
 * most legacy `/content/media/…` covers.
 */
export function previewImageUrl(ref: string | undefined, getAsset: GetAsset): string | undefined {
  if (!ref) return undefined;
  const value = ref.trim();
  if (!value) return undefined;
  if (/^(https?:|blob:|data:)/.test(value)) return value;

  const asset = getAsset(value);
  if (asset?.url) return asset.url;

  const path = value.replace(/^\.?\//, "");
  return `${RAW_HOST}/${cmsRepo()}/${branch()}/${path}`;
}
