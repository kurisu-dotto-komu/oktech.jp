import { Component } from "react";

import type { CustomPreviewTemplateProps } from "@sveltia/cms";

import EventInfoRows from "@/cms/previews/EventInfoRows";
import PreviewBody from "@/cms/previews/PreviewBody";
import PreviewLinks from "@/cms/previews/PreviewLinks";
import PreviewShell from "@/cms/previews/PreviewShell";
import { previewImageUrl } from "@/cms/previews/assets";
import {
  type EntryMap,
  readBoolean,
  readNumber,
  readStringList,
  readText,
} from "@/cms/previews/entry";
import { parseDraftDateTime } from "@/cms/previews/parseDraftDateTime";
import { type RelatedEntry, loadRelated } from "@/cms/previews/related";
import EventTags from "@/components/Event/EventTags";

interface State {
  venue?: RelatedEntry;
  series?: RelatedEntry;
}

/**
 * Event preview built from the site's own Tailwind/DaisyUI classes and helpers, so an
 * editor sees the real page rather than a list of field labels.
 *
 * Venue and series are looked up asynchronously, which is why this is a class component
 * holding state: hooks belong to the site's React copy and Sveltia renders with its own.
 */
export default class EventPreview extends Component<CustomPreviewTemplateProps, State> {
  state: State = {};

  componentDidMount() {
    this.loadRelations();
  }

  componentDidUpdate() {
    this.loadRelations();
  }

  private loadRelations() {
    const entry = this.props.entry as EntryMap;
    loadRelated(
      this.props.getCollection,
      "venues",
      readText(entry, "venue"),
      this.state.venue,
    ).then((venue) => venue && this.setState({ venue }));
    loadRelated(this.props.getCollection, "series", readText(entry, "series"), this.state.series)
      .then((series) => series && this.setState({ series }))
      .catch(() => undefined);
  }

  render() {
    const { getAsset, document: previewDocument } = this.props;
    const entry = this.props.entry as EntryMap;
    const { venue, series } = this.state;

    const title = readText(entry, "title");
    const cover = previewImageUrl(readText(entry, "cover") ?? series?.cover, getAsset);
    const isCancelled = readBoolean(entry, "isCancelled");

    return (
      <PreviewShell document={previewDocument}>
        {cover && (
          <figure className="rounded-box aspect-video w-full overflow-hidden">
            <img
              src={cover}
              alt={title ?? "Event cover"}
              className={`h-full w-full object-cover ${isCancelled ? "grayscale" : ""}`}
            />
          </figure>
        )}
        {isCancelled && <div className="badge badge-error badge-lg">Cancelled</div>}
        <h1 className="sub-title !font-medium">{title ?? "Untitled event"}</h1>
        {readText(entry, "description") && (
          <p className="text-base-700 text-lg">{readText(entry, "description")}</p>
        )}
        <EventTags tags={readStringList(entry, "topics")} />
        <EventInfoRows
          dateTime={parseDraftDateTime(readText(entry, "dateTime"))}
          duration={readNumber(entry, "duration")}
          seriesLabel={series?.label}
          venueTitle={venue?.title}
          venueAddress={venue?.address}
          space={readText(entry, "space") ?? venue?.space}
        />
        <PreviewLinks entry={entry} />
        <PreviewBody value={readText(entry, "body")} />
      </PreviewShell>
    );
  }
}
