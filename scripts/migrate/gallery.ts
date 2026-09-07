/**
 * `tsx scripts/migrate/gallery.ts` — step (d) of the content migration.
 *
 * Writes each event's photo gallery into its front matter as `gallery: [{ src, caption? }]`,
 * in the filename order the `import.meta.glob` loader produced, and folds the 17 `.webp.yaml`
 * caption sidecars in. No image bytes move.
 *
 * This is what makes the gallery editable: until now the list was a directory listing and the
 * captions were files nothing but a Vite plugin could read, so an editor could not add,
 * caption, reorder or remove a photo at all. Idempotent; deletes the sidecars once read.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

import { EVENT_KEY_ORDER, ROOT, eventFiles, report, rewrite } from "./frontMatter";

const MEDIA_DIR = path.join(ROOT, "content/media/events");
const MEDIA_PUBLIC = "/content/media/events";
const IMAGE = /\.(webp|jpg|jpeg|png|svg)$/i;

type Photo = { src: string; caption?: string };

const sidecars: string[] = [];

function galleryFor(id: string): Photo[] {
  const dir = path.join(MEDIA_DIR, id, "gallery");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => IMAGE.test(name))
    .sort()
    .map((name) => {
      const sidecar = path.join(dir, `${name}.yaml`);
      const src = `${MEDIA_PUBLIC}/${id}/gallery/${name}`;
      if (!fs.existsSync(sidecar)) return { src };
      sidecars.push(sidecar);
      const meta = YAML.parse(fs.readFileSync(sidecar, "utf8")) as { caption?: string };
      return meta?.caption ? { src, caption: meta.caption } : { src };
    });
}

const files = eventFiles();
const changed = files.filter((file) =>
  rewrite(file, EVENT_KEY_ORDER, (data) => {
    const gallery = galleryFor(path.basename(file, ".md"));
    if (gallery.length) data.gallery = gallery;
  }),
).length;

for (const sidecar of sidecars) fs.rmSync(sidecar);
report("gallery", changed, files.length);
console.log(`[gallery] removed ${sidecars.length} caption sidecar(s)`);
