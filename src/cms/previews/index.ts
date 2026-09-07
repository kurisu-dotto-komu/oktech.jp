import type { CustomPreviewTemplate } from "@sveltia/cms";

import ArticlePreview from "@/cms/previews/ArticlePreview";
import EventPreview from "@/cms/previews/EventPreview";
import VenuePreview from "@/cms/previews/VenuePreview";
import { registerPreviewStyles } from "@/cms/previews/styles";

/** The slice of the `@sveltia/cms` API the previews use, so admin.astro can pass `CMS` in. */
export interface PreviewRegistry {
  registerPreviewTemplate(name: string, component: CustomPreviewTemplate): void;
  registerPreviewStyle(style: string, options?: { raw?: boolean }): void;
}

const TEMPLATES: Record<string, CustomPreviewTemplate> = {
  events: EventPreview,
  venues: VenuePreview,
  articles: ArticlePreview,
};

/**
 * Swaps Sveltia's field-by-field preview for one rendered with the site's own components
 * and stylesheet. Must run before `CMS.init`.
 */
export function registerPreviews(cms: PreviewRegistry): void {
  registerPreviewStyles((style, options) => cms.registerPreviewStyle(style, options));
  Object.entries(TEMPLATES).forEach(([collection, template]) => {
    cms.registerPreviewTemplate(collection, template);
  });
}
