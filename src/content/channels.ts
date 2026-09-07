import { MEETUP_EVENT_URL } from "@/constants";

/**
 * Registry of the platforms an event or venue can be published on. It is the single
 * source of truth for the `channels[]` field: the CMS builds its select options from
 * this list, and the site resolves `ref` into a URL through it.
 *
 * The schema keeps `type` a plain string rather than an enum, so adding a platform is
 * one row here and unknown types still validate and render as a generic link.
 */
export type Channel = {
  /** Value stored in `channels[].type`. */
  id: string;
  /** Editor-facing and site-facing name. */
  label: string;
  /** Builds the public URL from `ref`, which is either a full URL or a platform-local id. */
  url: (ref: string) => string;
  /** True when the platform is where people sign up, so the site can use it as the CTA. */
  rsvp?: boolean;
};

/** One row of an entry's `channels:` list. */
export type ChannelRef = { type: string; ref: string };

/** A ref that is already absolute is used verbatim; anything else is a platform-local id. */
const isAbsolute = (ref: string): boolean => /^https?:\/\//.test(ref);

export const CHANNELS: readonly Channel[] = [
  {
    id: "meetup",
    label: "Meetup.com",
    rsvp: true,
    url: (ref) => (isAbsolute(ref) ? ref : `${MEETUP_EVENT_URL}/${ref}`),
  },
  {
    id: "luma",
    label: "Luma",
    rsvp: true,
    url: (ref) => (isAbsolute(ref) ? ref : `https://lu.ma/${ref}`),
  },
  { id: "linkedIn", label: "LinkedIn", url: (ref) => ref },
  { id: "discord", label: "Discord", url: (ref) => ref },
  { id: "website", label: "Website", url: (ref) => ref },
];

const byId = new Map(CHANNELS.map((channel) => [channel.id, channel]));

/** The registry row for a channel, or undefined for a type nothing here knows about. */
export const findChannel = (type: string): Channel | undefined => byId.get(type);

/** Public URL of a channel row. An unregistered type can only carry a full URL. */
export const channelUrl = ({ type, ref }: ChannelRef): string => findChannel(type)?.url(ref) ?? ref;

/** The channel people sign up through, i.e. the first one whose platform takes RSVPs. */
export const rsvpChannel = (channels: readonly ChannelRef[] = []): ChannelRef | undefined =>
  channels.find((channel) => findChannel(channel.type)?.rsvp);
