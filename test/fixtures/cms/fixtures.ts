/**
 * Fixture entries for the CMS CRUD round-trip test.
 *
 * Each `frontmatter` object mirrors what Sveltia CMS writes for the matching
 * collection in `src/cms/collections/*`: same field order, and empty optional
 * fields omitted (`output.omit_empty_optional_fields`).
 */
import { CMS_FIXTURE_SLUGS } from "../../helpers/url";

/** Reused from another event so the fixture never adds a binary to the repo. */
const SHARED_COVER =
  "/content/media/events/207109452-presentations-discussions-and-connections/506739.webp";

/** Meetup event id written into the fixture event's `channels` list. */
const FIXTURE_MEETUP_REF = "999999900";

export type CmsFixture = {
  label: string;
  /** Written to `content/<contentPath>`; flat entries are removed on clean, bundles folder and all. */
  contentPath: string;
  /** Served path, also used to derive the built file under `dist/`. */
  pagePath: string;
  distPath: string;
  /** Index page that must list this fixture, when the collection has one. */
  listingPath?: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

const eventFixture: CmsFixture = {
  label: "event",
  contentPath: `events/${CMS_FIXTURE_SLUGS.EVENT}.md`,
  pagePath: `/events/${CMS_FIXTURE_SLUGS.EVENT}`,
  distPath: `dist/events/${CMS_FIXTURE_SLUGS.EVENT}.html`,
  listingPath: "/events",
  title: "CMS Fixture Event",
  frontmatter: {
    title: "CMS Fixture Event",
    description: "Temporary event written by the CMS CRUD round-trip test.",
    dateTime: "2020-01-02 19:00",
    duration: 120,
    cover: SHARED_COVER,
    venue: CMS_FIXTURE_SLUGS.VENUE,
    space: "Fixture Room",
    howToFindUs: "Follow the fixture signs to the round-trip test room.",
    topics: ["Testing"],
    channels: [{ type: "meetup", ref: FIXTURE_MEETUP_REF }],
    attachments: [
      {
        icon: "slides",
        title: "Fixture Slides",
        url: "https://example.com/cms-fixture-event/slides",
      },
    ],
    isCancelled: false,
    devOnly: false,
  },
  body: "This event exists only while the CMS CRUD round-trip test is running.",
};

const venueFixture: CmsFixture = {
  label: "venue",
  contentPath: `venues/${CMS_FIXTURE_SLUGS.VENUE}/venue.md`,
  pagePath: `/venue/${CMS_FIXTURE_SLUGS.VENUE}`,
  distPath: `dist/venue/${CMS_FIXTURE_SLUGS.VENUE}.html`,
  title: "CMS Fixture Venue",
  frontmatter: {
    title: "CMS Fixture Venue",
    city: "osaka",
    address: "1-1-1 Fixture, Kita-ku, Osaka",
    state: "Osaka",
    space: "1F",
    url: "https://example.com/cms-fixture-venue",
    gmaps: "https://maps.app.goo.gl/cms-fixture-venue",
    location: '{"type":"Point","coordinates":[135.4959,34.7025]}',
    description: "Temporary venue written by the CMS CRUD round-trip test.",
    hasPage: true,
    devOnly: false,
  },
  body: "This venue exists only while the CMS CRUD round-trip test is running.",
};

const articleFixture: CmsFixture = {
  label: "article",
  contentPath: `articles/${CMS_FIXTURE_SLUGS.ARTICLE}/index.md`,
  pagePath: `/articles/${CMS_FIXTURE_SLUGS.ARTICLE}`,
  distPath: `dist/articles/${CMS_FIXTURE_SLUGS.ARTICLE}.html`,
  listingPath: "/articles",
  title: "CMS Fixture Article",
  frontmatter: {
    title: "CMS Fixture Article",
    description: "Temporary article written by the CMS CRUD round-trip test.",
    keywords: ["cms", "fixture"],
    author: "CMS Fixture <oktechjp>",
    date: "2020-01-02",
    unlisted: false,
  },
  body: "This article exists only while the CMS CRUD round-trip test is running.",
};

export const CMS_FIXTURES: CmsFixture[] = [eventFixture, venueFixture, articleFixture];
