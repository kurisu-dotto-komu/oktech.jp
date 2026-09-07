import { z } from "astro/zod";

const JST_DATE_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/;

/** Reads the authored `YYYY-MM-DD HH:mm` wall clock time as JST. */
export function parseEventDateTime(value: string, source?: string): Date {
  const where = source ? ` in ${source}` : "";
  const match = JST_DATE_TIME.exec(value);
  if (!match) {
    throw new Error(`Invalid date/time format${where}: ${value} (expected "YYYY-MM-DD HH:mm")`);
  }
  const dateTime = new Date(`${match[1]}T${match[2]}:00+09:00`);
  if (Number.isNaN(dateTime.getTime())) throw new Error(`Invalid date/time${where}: ${value}`);
  return dateTime;
}

/** Front matter `dateTime`, stored as a JST wall clock string and read as an instant. */
export const jstDateTime = z.string().transform((value, ctx) => {
  try {
    return parseEventDateTime(value);
  } catch (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
    return z.NEVER;
  }
});

/** Article dates are written unquoted, so YAML hands them over as `Date` about as often as not. */
export const isoDate = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value).slice(0, 10))
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Date must be formatted as YYYY-MM-DD");
