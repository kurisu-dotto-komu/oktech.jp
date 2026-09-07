import { SEO_DATA, SITE } from "@/constants";
import type { EventEnriched, VenueEnriched } from "@/content";
import { getOGImageWithFallback } from "@/utils/og";
import { urls } from "@/utils/urls";
import { parseEntryPath } from "@/utils/urls/entries";

import { decorateEventSEO } from "./decorateEventSEO";
import { decorateArticleSEO, decoratePageSEO } from "./decorateMarkdownSEO";
import { decorateStaticPageSEO } from "./decorateStaticPageSEO";
import { decorateVenueSEO } from "./decorateVenueSEO";

export type PageType = "static" | "event" | "venue" | "article" | "page" | "unknown";

export interface PageInfo {
  type: PageType;
  id: string;
}

export interface SEOMetadata {
  title: string;
  fullTitle: string;
  description: string;
  canonical: string;
  ogImage?: string;
  type: "website" | "article" | "profile";
  article?: {
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    tags?: string[];
  };
  noindex?: boolean;
  nofollow?: boolean;
  keywords?: string[];
  entity?: {
    type: "event" | "venue";
    data: EventEnriched | VenueEnriched;
    isLegacy?: boolean;
    shouldGenerateOG?: boolean;
  };
}

export function getBaseSEO(pathname: string): SEOMetadata {
  const canonical = urls.toAbsolute(pathname);
  const homeSEO = SEO_DATA["/"];

  const segments = pathname.split("/").filter(Boolean);
  const fallbackTitle =
    segments[segments.length - 1]
      ?.split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "OKTech";

  return {
    title: fallbackTitle,
    fullTitle: SITE.title.default,
    description: homeSEO.description,
    canonical,
    ogImage: getOGImageWithFallback(pathname),
    type: "website",
    keywords: homeSEO.keywords,
  };
}

export function parsePageType(pathname: string): PageInfo {
  if (pathname.endsWith(".xml") || pathname.endsWith(".ics") || pathname.endsWith(".json")) {
    return { type: "unknown", id: pathname };
  }

  const normalizedPathname = urls.normalize(pathname);

  if (SEO_DATA[normalizedPathname]) {
    return { type: "static", id: normalizedPathname };
  }

  const entry = parseEntryPath(normalizedPathname);
  if (entry && entry.type !== "page") return entry;

  // Deeper /events and /venue paths are assets, not pages.
  if (normalizedPathname.startsWith("/events") || normalizedPathname.startsWith("/venue")) {
    return { type: "unknown", id: normalizedPathname };
  }

  return entry ?? { type: "unknown", id: normalizedPathname };
}

export async function getSEO(url: string): Promise<SEOMetadata> {
  const pathname = urls.parse(url)?.pathname ?? url;

  const baseSEO = getBaseSEO(pathname);
  const pageInfo = parsePageType(pathname);

  switch (pageInfo.type) {
    case "static":
      return decorateStaticPageSEO(baseSEO, pathname);
    case "event":
      return decorateEventSEO(baseSEO, pageInfo.id, pathname);
    case "venue":
      return decorateVenueSEO(baseSEO, pageInfo.id, pathname);
    case "article":
      return decorateArticleSEO(baseSEO, pageInfo.id);
    case "page":
      return decoratePageSEO(baseSEO, pageInfo.id);
    default:
      return baseSEO;
  }
}
