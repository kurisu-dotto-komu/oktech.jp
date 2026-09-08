import type {
  AppEventListener,
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

/** The slice of the `@sveltia/cms` API the hook modules use, so admin.astro can pass `CMS` in. */
export interface CmsEventRegistry {
  registerEventListener(listener: AppEventListener): void;
}

/** The Immutable Map methods the hooks need; the `immutable` types are not installed here. */
export interface CmsEntryMap {
  toJS(): unknown;
  setIn(keyPath: (string | number)[], value: unknown): CmsEntryMap;
}
