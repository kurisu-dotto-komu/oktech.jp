/**
 * `tsx scripts/migrate/series.ts` — step (a) of the content migration.
 *
 * Turns the pre-`series` recurrence shape into a reference: `recurredFrom: <id>` becomes
 * `series: <id>` and the per-occurrence `recurringLabel` is dropped, because the cadence
 * label now lives once on the series entry in `content/series/<id>.md`.
 *
 * Fails loudly if an occurrence points at a series that has no entry, or if it carries a
 * label the series does not, so no rendered text can silently disappear. Idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

import { EVENT_KEY_ORDER, ROOT, eventFiles, report, rewrite } from "./frontMatter";

const SERIES_DIR = path.join(ROOT, "content/series");

function seriesLabels(): Map<string, string | undefined> {
  const labels = new Map<string, string | undefined>();
  for (const file of fs.readdirSync(SERIES_DIR).filter((name) => name.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(SERIES_DIR, file), "utf8");
    const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    const data = (front ? YAML.parse(front[1]!) : {}) as { label?: string };
    labels.set(path.basename(file, ".md"), data.label);
  }
  return labels;
}

const labels = seriesLabels();
const files = eventFiles();
const changed = files.filter((file) =>
  rewrite(file, EVENT_KEY_ORDER, (data) => {
    const from = data.recurredFrom ?? data.series;
    if (from === undefined) return;
    const id = String(from);
    if (!labels.has(id)) throw new Error(`${path.basename(file)}: no content/series/${id}.md`);
    const label = data.recurringLabel;
    if (label !== undefined && label !== labels.get(id)) {
      throw new Error(`${path.basename(file)}: recurringLabel differs from the series label`);
    }
    data.series = id;
    delete data.recurredFrom;
    delete data.recurringLabel;
  }),
).length;

report("series", changed, files.length);
