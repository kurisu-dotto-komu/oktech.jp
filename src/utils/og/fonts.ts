import fs from "node:fs/promises";
import path from "node:path";

export interface FontData {
  name: string;
  data: Buffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal" | "italic";
}

const FONT_DIR = "node_modules/@fontsource/lexend/files";
const WEIGHTS = [300, 600, 800] as const;

/**
 * Satori picks exactly one buffer per family and never falls back between glyphs inside it, so
 * the extended subset is a separate family listed after the base one in `OG_FONT_FAMILY`. That
 * is what renders the macrons in venue addresses ("Chūō-ku") instead of tofu boxes.
 */
const FAMILIES = {
  latin: "Lexend",
  "latin-ext": "Lexend Ext",
} as const;

export const OG_FONT_FAMILY = Object.values(FAMILIES).join(", ");

let cachedFonts: FontData[] | null = null;

/** Lexend, read from the installed @fontsource package once per build. */
export async function loadFonts(): Promise<FontData[]> {
  if (cachedFonts) return cachedFonts;

  const dir = path.join(process.cwd(), FONT_DIR);
  cachedFonts = await Promise.all(
    WEIGHTS.flatMap((weight) =>
      Object.entries(FAMILIES).map(async ([subset, name]) => ({
        name,
        data: await fs.readFile(path.join(dir, `lexend-${subset}-${weight}-normal.woff`)),
        weight,
        style: "normal" as const,
      })),
    ),
  );
  return cachedFonts;
}
