import type { Root } from "mdast";
import { toString } from "mdast-util-to-string";
import path from "path";
import getReadingTime from "reading-time";
import { visit } from "unist-util-visit";

// Relative rather than `@/`: astro.config.ts imports this module outside the Vite graph
// that resolves the alias.
import { uploadKey } from "../uploads";

/**
 * Remark plugin to add reading time to frontmatter
 */
export function remarkReadingTime() {
  return function (tree: Root, file: any) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);

    // Add reading time to frontmatter
    file.data.astro.frontmatter.readingTime = readingTime.text;
    file.data.astro.frontmatter.readingTimeMinutes = readingTime.minutes;
  };
}

/**
 * Remark plugin to extract description from first paragraph
 */
export function remarkDescription() {
  return function (tree: Root, file: any) {
    // Only set if not already defined in frontmatter
    if (!file.data.astro.frontmatter.description) {
      let description = "";
      let foundFirstParagraph = false;

      // Visit all nodes to find the first paragraph
      visit(tree, "paragraph", (node) => {
        if (!foundFirstParagraph) {
          // Extract text from the first paragraph
          description = toString(node);
          foundFirstParagraph = true;
        }
      });

      // Truncate if too long
      if (description.length > 160) {
        description = description.substring(0, 157) + "...";
      }

      file.data.astro.frontmatter.description = description;
    }
  };
}

/**
 * Remark plugin to rewrite asset paths inside Markdown so relative paths resolve from the markdown file's directory.
 */
export function remarkRelativeAssets() {
  return function (tree: Root, file: any) {
    const filePath = file.history?.[0] as string | undefined;
    if (!filePath) return;
    const normalizedFilePath = filePath.replace(/\\/g, "/");
    const contentIndex = normalizedFilePath.indexOf("/content/");
    if (contentIndex === -1) return;
    const relativePath = normalizedFilePath.slice(contentIndex + "/content/".length);
    const fileDirRelative = path.posix.dirname(relativePath);
    const fileDir = fileDirRelative === "." ? "/" : `/${fileDirRelative.replace(/^\/+/, "")}`;

    visit(tree, (node: any) => {
      if (node.type === "image") {
        return;
      }
      if (node.type === "link" || node.type === "linkReference") {
        rewritePath(node, "url", fileDir);
      }
      if (node.type === "html") {
        node.value = rewriteHtmlSources(node.value, fileDir);
      }
    });
  };
}

/**
 * Rewrites the media-bucket references a CMS body carries — `cloudflare:/<key>`, and the
 * `/uploads/<key>` form written before the scheme — to the images host for this build.
 *
 * Front matter goes through `src/utils/images/`; a body is plain Markdown that nothing else
 * looks at, so an image inserted with the CMS asset picker would otherwise reach the browser
 * with a scheme it cannot fetch. Without `PUBLIC_IMAGES_URL` there is nothing to point at and
 * the reference is left alone rather than turned into a wrong URL.
 */
export function remarkUploadRefs({ imagesUrl }: { imagesUrl?: string } = {}) {
  const base = imagesUrl?.replace(/\/$/, "");

  return function (tree: Root) {
    if (!base) return;

    visit(tree, (node) => {
      if (node.type === "image" || node.type === "link" || node.type === "definition") {
        node.url = resolveUploadRef(node.url, base);
      }
      if (node.type === "html") {
        node.value = node.value.replace(
          /(src|href)\s*=\s*(["'])([^"']+)\2/g,
          (_match, attr: string, quote: string, url: string) =>
            `${attr}=${quote}${resolveUploadRef(url, base)}${quote}`,
        );
      }
    });
  };
}

function resolveUploadRef(url: string, base: string): string {
  const key = uploadKey(url);
  return key ? `${base}/${key}` : url;
}

/** Anchors, absolute paths and anything with a URI scheme (http:, mailto:, tel:) stay as they are. */
const ABSOLUTE_TARGET = /^(#|\/|[a-z][a-z0-9+.-]*:)/i;

function rewritePath(node: any, key: string, fileDir: string) {
  const value: string | undefined = node[key];
  if (!value || typeof value !== "string") return;
  if (ABSOLUTE_TARGET.test(value)) return;
  node[key] = path.posix.normalize(path.posix.join(fileDir, value));
}

function rewriteHtmlSources(value: string, fileDir: string): string {
  return value.replace(/(src|href)\s*=\s*(["'])([^"']+)\2/g, (match, attr, quote, url) => {
    if (ABSOLUTE_TARGET.test(url)) {
      return match;
    }
    const rewritten = path.posix.normalize(path.posix.join(fileDir, url));
    return `${attr}=${quote}${rewritten}${quote}`;
  });
}
