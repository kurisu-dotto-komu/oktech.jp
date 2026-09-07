import type { CollectionFile } from "@sveltia/cms";

import { bodyField, keywordsField, textField, titleField } from "@/cms/fields/common";

/** Standalone markdown pages that live directly under /content. */
export function buildSingletons(): CollectionFile[] {
  return [
    {
      name: "code-of-conduct",
      label: "Code of Conduct",
      file: "/content/code-of-conduct.md",
      fields: [
        titleField("Title"),
        textField("description", "Description", false),
        keywordsField(),
        bodyField("Content", true),
      ],
    },
  ];
}
