import { buildBackend } from "@/cms/backend";
import { buildArticlesCollection } from "@/cms/collections/articles";
import { buildEventsCollection } from "@/cms/collections/events";
import { buildSingletons } from "@/cms/collections/pages";
import { buildVenuesCollection } from "@/cms/collections/venues";
import { buildMediaConfig } from "@/cms/media";
import { buildOutputOptions, buildSlugOptions } from "@/cms/output";
import type { CmsCollection, CmsConfig } from "@/cms/types";

export function buildCmsConfig(): CmsConfig {
  const collections: CmsCollection[] = [
    buildEventsCollection(),
    buildVenuesCollection(),
    buildArticlesCollection(),
  ];

  return {
    load_config_file: false,
    backend: buildBackend(),
    // Entries move Draft → In review → Ready as pull requests; publishing merges them
    publish_mode: "editorial_workflow",
    ...buildMediaConfig(),
    slug: buildSlugOptions(),
    output: buildOutputOptions(),
    collections,
    singletons: buildSingletons(),
  };
}
