import { Component } from "react";

import type { CustomPreviewTemplateProps } from "@sveltia/cms";
import { LuBuilding2, LuGlobe, LuMapPin } from "react-icons/lu";

import PreviewBody from "@/cms/previews/PreviewBody";
import PreviewLinks from "@/cms/previews/PreviewLinks";
import PreviewShell from "@/cms/previews/PreviewShell";
import { previewImageUrl } from "@/cms/previews/assets";
import { type EntryMap, readText } from "@/cms/previews/entry";

const joinParts = (parts: (string | undefined)[]) => parts.filter(Boolean).join(", ");

export default class VenuePreview extends Component<CustomPreviewTemplateProps> {
  render() {
    const { getAsset, document: previewDocument } = this.props;
    const entry = this.props.entry as EntryMap;

    const title = readText(entry, "title");
    const cover = previewImageUrl(readText(entry, "cover"), getAsset);
    const address = joinParts([
      readText(entry, "address"),
      readText(entry, "city"),
      readText(entry, "state"),
    ]);
    const url = readText(entry, "url");

    return (
      <PreviewShell document={previewDocument}>
        {cover && (
          <figure className="rounded-box aspect-video w-full overflow-hidden">
            <img src={cover} alt={title ?? "Venue"} className="h-full w-full object-cover" />
          </figure>
        )}
        <h1 className="sub-title !font-medium">{title ?? "Untitled venue"}</h1>
        {readText(entry, "description") && (
          <p className="text-base-700 text-lg">{readText(entry, "description")}</p>
        )}
        <div className="text-base-700 flex flex-col gap-2 text-lg">
          {readText(entry, "space") && (
            <div className="flex items-start gap-2">
              <LuBuilding2 className="mt-1 w-4 flex-shrink-0" />
              <span>{readText(entry, "space")}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-2">
              <LuMapPin className="mt-1 w-4 flex-shrink-0" />
              <span>{address}</span>
            </div>
          )}
          {url && (
            <div className="flex items-start gap-2">
              <LuGlobe className="mt-1 w-4 flex-shrink-0" />
              <span className="text-link break-all">{url}</span>
            </div>
          )}
        </div>
        <PreviewLinks entry={entry} />
        <PreviewBody value={readText(entry, "body")} />
      </PreviewShell>
    );
  }
}
