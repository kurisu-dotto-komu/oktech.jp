export type MapLocation = { lat: number; lng: number };

/** A venue's position, stored as the GeoJSON Point string the CMS map widget reads and writes. */
export type LocationSource = { location?: string | null };

function finite(lat: unknown, lng: unknown): MapLocation | undefined {
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function readGeoJsonPoint(value: string): MapLocation | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return undefined;
    const coordinates = (parsed as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return undefined;
    return finite(coordinates[1], coordinates[0]);
  } catch {
    return undefined;
  }
}

/** Reads a venue's position from its front matter. */
export function readLocation(source: LocationSource | undefined): MapLocation | undefined {
  const value = source?.location;
  return typeof value === "string" && value.trim() ? readGeoJsonPoint(value) : undefined;
}
