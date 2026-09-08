import { expect, test } from "@playwright/test";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";

import { remarkUploadRefs } from "../../src/utils/remarkPlugins";

/**
 * Unit check for the build-time rewrite of media-bucket references in Markdown bodies.
 * It never opens a page, so it runs wherever Playwright does.
 */
const IMAGES_URL = "https://images.example.test";

/** What the CMS asset picker leaves behind in a body, alongside references it must not touch. */
const BODY = [
  "![Cover](cloudflare:/events/covers/networking-night.webp)",
  "",
  "[The deck](cloudflare:/events/gallery/deck.pdf) and an [event](/events/some-event).",
  "",
  '<img src="cloudflare:/venues/hall.webp" alt="Hall">',
  "",
  "![Legacy](/uploads/events/covers/old.webp)",
  "",
  "![Repository](./local.webp) and ![Remote](https://example.com/x.webp)",
].join("\n");

function transform(body: string, imagesUrl?: string) {
  const tree = fromMarkdown(body);
  remarkUploadRefs({ imagesUrl })(tree);

  const urls: string[] = [];
  const html: string[] = [];
  visit(tree, (node) => {
    if (node.type === "image" || node.type === "link") urls.push(node.url);
    if (node.type === "html") html.push(node.value);
  });
  return { urls, html };
}

test.describe("remarkUploadRefs", () => {
  test("resolves bucket references and leaves everything else alone", () => {
    const { urls, html } = transform(BODY, IMAGES_URL);

    expect(urls).toEqual([
      `${IMAGES_URL}/events/covers/networking-night.webp`,
      `${IMAGES_URL}/events/gallery/deck.pdf`,
      "/events/some-event",
      `${IMAGES_URL}/events/covers/old.webp`,
      "./local.webp",
      "https://example.com/x.webp",
    ]);
    expect(html).toEqual([`<img src="${IMAGES_URL}/venues/hall.webp" alt="Hall">`]);
  });

  test("trailing slashes on the images URL do not double up", () => {
    const { urls } = transform("![Cover](cloudflare:/events/covers/x.webp)", `${IMAGES_URL}/`);

    expect(urls).toEqual([`${IMAGES_URL}/events/covers/x.webp`]);
  });

  test("a key climbing out of the bucket is not a reference", () => {
    const { urls } = transform("![Escape](cloudflare:/../secrets.webp)", IMAGES_URL);

    expect(urls).toEqual(["cloudflare:/../secrets.webp"]);
  });

  test("without an images host the reference is left as it stands", () => {
    const { urls } = transform("![Cover](cloudflare:/events/covers/x.webp)", undefined);

    expect(urls).toEqual(["cloudflare:/events/covers/x.webp"]);
  });
});
