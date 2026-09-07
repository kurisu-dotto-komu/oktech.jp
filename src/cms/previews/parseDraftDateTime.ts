const WALL_CLOCK = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/;

/**
 * Reads the `YYYY-MM-DD HH:mm` Japan-time string the datetime widget writes.
 *
 * Deliberately not `parseEventDateTime` from the content schemas: that one throws on any
 * other shape, and a preview always runs against a half-typed draft. It also keeps
 * `astro/zod` out of the admin bundle.
 */
export function parseDraftDateTime(value: string | undefined): Date | undefined {
  const match = value ? WALL_CLOCK.exec(value.trim()) : null;
  if (!match) return undefined;
  const parsed = new Date(`${match[1]}T${match[2]}:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
