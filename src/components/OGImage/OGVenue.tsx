import { twj } from "tw-to-css";

import OGLayout, { titleCase } from "./OGLayout";

interface VenueData {
  id: string;
  data: {
    title: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    cover?: {
      src: string;
    };
  };
}

interface OGVenueProps {
  venue: VenueData;
}

export default function OGVenue({ venue }: OGVenueProps) {
  const { title, address, city, country } = venue.data;
  const location = [city, country]
    .filter((part): part is string => Boolean(part))
    .map(titleCase)
    .join(", ");

  return (
    <OGLayout title={title} subtitle={location || undefined}>
      {address ? <span style={{ ...twj("text-[22px]"), opacity: 0.7 }}>{address}</span> : null}
    </OGLayout>
  );
}
