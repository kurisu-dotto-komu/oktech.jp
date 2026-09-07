import { buildBackend } from "@/cms/backend";
import { buildArticlesCollection } from "@/cms/collections/articles";
import { buildEventsCollection } from "@/cms/collections/events";
import { buildPagesCollection } from "@/cms/collections/pages";
import { buildSeriesCollection } from "@/cms/collections/series";
import { buildVenuesCollection } from "@/cms/collections/venues";
import { buildMediaConfig } from "@/cms/media";
import { buildOutputOptions, buildSlugOptions } from "@/cms/output";
import type { CmsCollection, CmsConfig } from "@/cms/types";
import { SITE } from "@/constants";

export function buildCmsConfig(): CmsConfig {
  const collections: CmsCollection[] = [
    buildEventsCollection(),
    buildSeriesCollection(),
    buildVenuesCollection(),
    buildArticlesCollection(),
    buildPagesCollection(),
  ];

  return {
    load_config_file: false,
    app_title: `${SITE.shortName} CMS`,
    // Square site icon, served by src/pages/favicon.svg.ts
    logo: { src: `${import.meta.env.BASE_URL}favicon.svg`, show_in_header: true },
    backend: buildBackend(),
    // Entries move Draft → In review → Ready as pull requests; publishing merges them
    publish_mode: "editorial_workflow",
    ...buildMediaConfig(),
    slug: buildSlugOptions(),
    output: buildOutputOptions(),
    collections,
  };
}
