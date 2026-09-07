import clsx from "clsx";
import { type IconType } from "react-icons";
import { FaDiscord, FaLinkedin, FaMeetup } from "react-icons/fa6";
import { LuExternalLink, LuSparkles } from "react-icons/lu";

import type { EventEnriched } from "@/content";
import { channelUrl, findChannel } from "@/content/channels";

interface EventSocialButtonsProps {
  event: EventEnriched;
}

interface ButtonConfig {
  href: string;
  text: string;
  icon: IconType;
}

/**
 * Platforms this site has branding for. A channel type that is absent here still renders,
 * as a generic link labelled with its domain - which is what keeps the channel registry
 * open-ended: adding a platform never requires an icon.
 */
const CHANNEL_ICONS = new Map<string, IconType>([
  ["meetup", FaMeetup],
  ["linkedIn", FaLinkedin],
  ["luma", LuSparkles],
  ["discord", FaDiscord],
]);

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www. prefix if present
    const hostname = urlObj.hostname.replace(/^www\./, "");
    // Return just the domain without subdomains for common cases
    return hostname;
  } catch {
    // If URL parsing fails, return a generic text
    return "Link";
  }
}

export default function EventSocialButtons({ event }: EventSocialButtonsProps) {
  const buttons: ButtonConfig[] = (event.data.channels ?? []).map((channel) => {
    const href = channelUrl(channel);
    const icon = CHANNEL_ICONS.get(channel.type);
    return {
      href,
      text: icon ? (findChannel(channel.type)?.label ?? channel.type) : extractDomain(href),
      icon: icon ?? LuExternalLink,
    };
  });

  return (
    <>
      {buttons.map((button, index) => (
        <a
          key={`${button.text}-${index}`}
          href={button.href}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx("btn btn-lg btn-outline gap-4 whitespace-nowrap")}
        >
          <button.icon />
          {button.text}
        </a>
      ))}
    </>
  );
}
