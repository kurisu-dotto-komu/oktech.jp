/**
 * `tsx scripts/next-event-end.ts [since]` — prints the ISO timestamp at which the
 * soonest event still running at `since` (default: now) finishes, counting the shared
 * 30 minute buffer, or nothing when there is no such event. Reads `content/` directly,
 * so it needs neither a build nor the network.
 *
 * `.github/workflows/rebuild-when-event-ends.yml` passes the time of the last build:
 * the deployed site lists that event as upcoming, so once the printed time is in the
 * past the site is stale and has to be rebuilt.
 */
import matter from "gray-matter";
import fs from "node:fs";
import path from "node:path";

import { getEventEndTimeWithBuffer } from "@/utils/eventFilters";
import { parseEventDateTime } from "@/utils/recurringDates";

const EVENTS_DIR = path.resolve(process.cwd(), "content/events");

/** Tolerates both the page-bundle layout (`<id>/event.md`) and flat `<id>.md` files. */
function eventFiles(): string[] {
  if (!fs.existsSync(EVENTS_DIR)) return [];
  return fs
    .readdirSync(EVENTS_DIR, { withFileTypes: true })
    .map((entry) =>
      entry.isDirectory()
        ? path.join(EVENTS_DIR, entry.name, "event.md")
        : path.join(EVENTS_DIR, entry.name),
    )
    .filter((file) => file.endsWith(".md") && fs.existsSync(file));
}

function endTime(file: string): Date | undefined {
  const { data } = matter(fs.readFileSync(file, "utf8"));
  // Dev fixtures are stripped from production builds, so they never make a rebuild due.
  if (data.devOnly || typeof data.dateTime !== "string") return undefined;
  const dateTime = parseEventDateTime(data.dateTime, file);
  const duration = typeof data.duration === "number" ? data.duration : undefined;
  return getEventEndTimeWithBuffer({ data: { dateTime, duration } });
}

const [sinceArg] = process.argv.slice(2);
const since = sinceArg ? new Date(sinceArg) : new Date();
if (Number.isNaN(since.getTime())) throw new Error(`Invalid "since" timestamp: ${sinceArg}`);

const next = eventFiles()
  .map(endTime)
  .filter((end): end is Date => end !== undefined && end.getTime() > since.getTime())
  .sort((a, b) => a.getTime() - b.getTime())[0];

process.stdout.write(next ? next.toISOString() : "");
