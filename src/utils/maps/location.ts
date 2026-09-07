export type MapLocation = { lat: number; lng: number };

/** Either the legacy `coordinates: {lat,lng}` pair or a GeoJSON Point string from the CMS map widget. */
export type LocationSource = {
  coordinates?: { lat?: number; lng?: number } | null;
  location?: string | null;
};

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

/** Reads a venue's position from either supported front-matter shape. */
export function readLocation(source: LocationSource | undefined): MapLocation | undefined {
  if (!source) return undefined;
  if (typeof source.location === "string" && source.location.trim()) {
    const point = readGeoJsonPoint(source.location);
    if (point) return point;
  }
  return finite(source.coordinates?.lat, source.coordinates?.lng);
}
