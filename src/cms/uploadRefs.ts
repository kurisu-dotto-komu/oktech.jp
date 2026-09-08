import type { AppEventListener } from "@sveltia/cms";

import { uploadsPublicUrl } from "@/cms/media";
import type { CmsEntryMap, CmsEventRegistry } from "@/cms/types";
import { uploadRef } from "@/uploads";

type Change = { keyPath: (string | number)[]; value: string };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Everything up to whitespace or a Markdown/HTML delimiter is part of the key. */
function refPattern(base: string): RegExp {
  return new RegExp(`${escapeRegExp(base)}/([^\\s)"'<>]+)`, "g");
}

function rewriteRefs(value: string, pattern: RegExp): string {
  return value.replace(pattern, (match, key: string) =>
    key && !key.includes("..") ? uploadRef(key) : match,
  );
}

/** Walks the entry's values, string by string, recording the ones that need rewriting. */
function collect(node: unknown, keyPath: (string | number)[], pattern: RegExp): Change[] {
  if (typeof node === "string") {
    const value = rewriteRefs(node, pattern);
    return value === node ? [] : [{ keyPath, value }];
  }
  if (Array.isArray(node)) {
    return node.flatMap((item, index) => collect(item, [...keyPath, index], pattern));
  }
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) =>
      collect(value, [...keyPath, key], pattern),
    );
  }
  return [];
}

/**
 * Rewrites bucket URLs to `cloudflare:/<key>` on the way into the repository.
 *
 * Sveltia has no say in what an S3 library writes: it builds `${public_url}/${key}` and
 * stores that string — in a front matter field, or in the body when the image came from the
 * editor's asset picker. `public_url` is the images host so the picker's own thumbnails load
 * (`src/cms/media.ts`), and this hook is what keeps the hostname from reaching an entry.
 *
 * `preSave` is the one hook whose return value is written: Sveltia merges the Immutable Map
 * back into the entry before serialising it (`services/api/events.js`, `UPDATABLE_EVENT_TYPES`),
 * between the upload and the commit. Only the default locale is walked — the site is not
 * localised, and `i18n` is empty.
 */
export function registerUploadRefs(cms: CmsEventRegistry): void {
  cms.registerEventListener({
    name: "preSave",
    handler: ({ entry }) => {
      const map = entry as unknown as CmsEntryMap;
      const { data } = map.toJS() as { data?: unknown };
      const changes = collect(data, [], refPattern(uploadsPublicUrl()));
      if (!changes.length) return;

      return changes.reduce<CmsEntryMap>(
        (updated, { keyPath, value }) => updated.setIn(["data", ...keyPath], value),
        map,
      ) as unknown as ReturnType<AppEventListener["handler"]>;
    },
  });
}
