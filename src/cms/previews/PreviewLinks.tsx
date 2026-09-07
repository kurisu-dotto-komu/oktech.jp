import { type EntryMap, readList, rowText } from "@/cms/previews/entry";
import { channelUrl, findChannel } from "@/content/channels";

/**
 * The `channels` list, shown the way the site labels it. `channelUrl` is the same registry
 * the real buttons are built from, so an editor can see straight away whether the reference
 * they typed resolves to the URL they meant.
 */
export default function PreviewLinks({ entry }: { entry: EntryMap }) {
  const rows = readList(entry, "channels").flatMap((row) => {
    const type = rowText(row, "type");
    const ref = rowText(row, "ref");
    return type && ref ? [{ type, ref }] : [];
  });

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rows.map(({ type, ref }) => (
        <span key={`${type}-${ref}`} className="btn btn-outline btn-sm">
          {findChannel(type)?.label ?? type}
          <span className="text-base-500 max-w-60 truncate">{channelUrl({ type, ref })}</span>
        </span>
      ))}
    </div>
  );
}
