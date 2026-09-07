import type {
  Backend,
  CmsConfig,
  Collection,
  EntryCollection,
  Field,
  OutputOptions,
} from "@sveltia/cms";

export type { CmsConfig };

export type CmsBackend = Backend;
export type CmsCollection = Collection;
export type CmsEntryCollection = EntryCollection;
export type CmsField = Field;
export type CmsOutputOptions = OutputOptions;

/** Global media options, kept together so they can be spread into the config. */
export type CmsMediaConfig = Pick<CmsConfig, "media_folder" | "public_folder" | "media_libraries">;
