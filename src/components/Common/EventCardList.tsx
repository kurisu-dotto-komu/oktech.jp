import { useState } from "react";

import { LuChevronDown } from "react-icons/lu";

import type { EventEnriched } from "@/content";

import AnimatedExpander from "./AnimatedExpander";
import EventCard from "./EventCard";

const DEFAULT_VISIBLE_COUNT = 4;

export default function EventCardList({
  events,
  expandable = false,
}: {
  events: EventEnriched[];
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const shouldShowExpand = expandable && events.length > DEFAULT_VISIBLE_COUNT;
  const initialEvents = events.slice(0, DEFAULT_VISIBLE_COUNT);
  const additionalEvents = events.slice(DEFAULT_VISIBLE_COUNT);
  const hiddenCount = additionalEvents.length;

  return (
    <div className="flex flex-col gap-4">
      {initialEvents.map((event, index) => (
        <EventCard
          key={event.id}
          variant="compact"
          event={event}
          index={index}
          count={events.length}
        />
      ))}
      <AnimatedExpander
        items={additionalEvents}
        expanded={expanded}
        renderItem={(event, index) => (
          <EventCard
            variant="compact"
            event={event}
            index={DEFAULT_VISIBLE_COUNT + index}
            count={events.length}
          />
        )}
      />
      {shouldShowExpand && !expanded && (
        <button onClick={() => setExpanded(true)} className="btn btn-ghost gap-2 self-center">
          <LuChevronDown className="h-5 w-5" />
          Show {hiddenCount} more event{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
