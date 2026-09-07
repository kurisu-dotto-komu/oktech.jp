/**
 * Names of the widgets registered in src/pages/admin.astro via `CMS.registerWidget`.
 * Kept free of component imports so `npm run check:cms` can read the list in Node.
 */
export const PULL_REQUEST_WIDGET = "pull_request";
export const MARKDOWN_WIDGET = "markdown_code";

export const CUSTOM_WIDGETS = [PULL_REQUEST_WIDGET, MARKDOWN_WIDGET];
