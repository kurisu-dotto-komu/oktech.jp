import type { ReactNode } from "react";

import { LuBuilding2, LuCalendar, LuClock, LuRefreshCw } from "react-icons/lu";

import { formatDate, formatDuration, formatTime, getEndTime } from "@/utils/formatDate";

interface InfoRowProps {
  Icon: React.ElementType;
  children: ReactNode;
}

/** Same shape as the site's `EventCardInfo` rows, minus the parts that need a countdown. */
function InfoRow({ Icon, children }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex w-4 flex-shrink-0 items-start">
        <Icon />
      </div>
      <div className="flex-shrink">{children}</div>
    </div>
  );
}

export interface EventInfoRowsProps {
  dateTime?: Date;
  duration?: number;
  seriesLabel?: string;
  venueTitle?: string;
  venueAddress?: string;
  space?: string;
}

export default function EventInfoRows({
  dateTime,
  duration,
  seriesLabel,
  venueTitle,
  venueAddress,
  space,
}: EventInfoRowsProps) {
  const end = dateTime ? getEndTime(dateTime, duration) : null;
  const length = formatDuration(duration);

  return (
    <div className="text-base-700 flex flex-col gap-2 text-lg">
      {dateTime && <InfoRow Icon={LuCalendar}>{formatDate(dateTime, "long")}</InfoRow>}
      {dateTime && (
        <InfoRow Icon={LuClock}>
          {formatTime(dateTime)}
          {end && length && ` to ${formatTime(end)} (${length})`}
        </InfoRow>
      )}
      {seriesLabel && <InfoRow Icon={LuRefreshCw}>{seriesLabel}</InfoRow>}
      {(venueTitle || space) && (
        <InfoRow Icon={LuBuilding2}>
          <div className="flex flex-col gap-1">
            <div>
              {space && <span>{space} · </span>}
              <span>{venueTitle ?? "Venue not set"}</span>
            </div>
            {venueAddress && <div>{venueAddress}</div>}
          </div>
        </InfoRow>
      )}
    </div>
  );
}
