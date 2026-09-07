import type { ProcessedVenue } from "@/content";
import { readLocation } from "@/utils/maps/location";

import LocationMapImage from "./LocationMapImage";

interface Props {
  venue: ProcessedVenue;
  marker?: boolean | string;
  link?: boolean;
  className?: string;
}

export default function LocationMap({ venue, marker, link = false, className }: Props) {
  // Generate map URL - use gmaps if available, otherwise create from address
  const getMapUrl = () => {
    // Show link if either showMarker is true or marker prop is provided
    if (marker === undefined) return null;

    if (venue.gmaps) {
      return venue.gmaps;
    }
    const location = readLocation(venue);
    if (location) {
      return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    }

    if (venue.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`;
    }
    return null;
  };

  const mapUrl = getMapUrl();

  if (mapUrl && link) {
    return (
      <>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
          <LocationMapImage
            mapImage={venue.mapImage}
            mapDarkImage={venue.mapDarkImage}
            marker={marker}
            className={className}
          />
        </a>
      </>
    );
  }

  return (
    <>
      <LocationMapImage
        mapImage={venue.mapImage}
        mapDarkImage={venue.mapDarkImage}
        marker={marker}
        className={className}
      />
    </>
  );
}
