import clsx from "clsx";

import type { EventEnriched } from "@/content";

interface EventTitleProps {
  event: EventEnriched;
  className?: string;
  eyebrowClassName?: string;
}

/**
 * An occurrence's title with its series as a small eyebrow above it. Single-string
 * contexts (page title, feeds, alt text) use `event.data.title`, which already joins
 * the two with a dash.
 */
export default function EventTitle({ event, className, eyebrowClassName }: EventTitleProps) {
  const { seriesTitle, sessionTitle, title } = event.data;
  if (!seriesTitle) return <>{title}</>;
  return (
    <>
      <span
        className={clsx(
          "text-base-content/60 block text-[0.55em] font-medium tracking-wide uppercase",
          eyebrowClassName,
        )}
      >
        {seriesTitle}
      </span>
      <span className={className}>{sessionTitle}</span>
    </>
  );
}
