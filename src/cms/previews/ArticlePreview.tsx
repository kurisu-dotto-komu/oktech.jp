import { Component } from "react";

import type { CustomPreviewTemplateProps } from "@sveltia/cms";

import PreviewBody from "@/cms/previews/PreviewBody";
import PreviewShell from "@/cms/previews/PreviewShell";
import { type EntryMap, readStringList, readText } from "@/cms/previews/entry";
import { parseAuthor } from "@/utils/author";

export default class ArticlePreview extends Component<CustomPreviewTemplateProps> {
  render() {
    const { document: previewDocument } = this.props;
    const entry = this.props.entry as EntryMap;

    const author = readText(entry, "author");
    const byline = author ? parseAuthor(author).name : undefined;
    const keywords = readStringList(entry, "keywords");

    return (
      <PreviewShell document={previewDocument}>
        <h1 className="sub-title !font-medium">{readText(entry, "title") ?? "Untitled article"}</h1>
        <div className="text-base-700 flex flex-wrap items-center gap-3 text-lg">
          {byline && <span>{byline}</span>}
          {readText(entry, "date") && <span>{readText(entry, "date")}</span>}
        </div>
        {readText(entry, "description") && (
          <p className="text-base-700 text-lg">{readText(entry, "description")}</p>
        )}
        {keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {keywords.map((keyword) => (
              <span key={keyword} className="text-base-500 badge badge-outline xl:badge-lg">
                {keyword}
              </span>
            ))}
          </div>
        )}
        <PreviewBody value={readText(entry, "body")} />
      </PreviewShell>
    );
  }
}
