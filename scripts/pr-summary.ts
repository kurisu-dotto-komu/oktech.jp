import matter from "gray-matter";
import { execFileSync } from "node:child_process";

// Writes a markdown summary of the content changes in a pull request, used by
// .github/workflows/cloudflare-staging.yml as the PR description for CMS-created PRs.
// Usage: tsx scripts/pr-summary.ts <base-sha> <head-sha> <preview-url> <cms-url>

const [base, head, previewUrl, cmsUrl] = process.argv.slice(2);
if (!base || !head) {
  console.error("usage: pr-summary <base-sha> <head-sha> [preview-url] [cms-url]");
  process.exit(1);
}

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const show = (sha: string, file: string) => {
  try {
    return git("show", `${sha}:${file}`);
  } catch {
    return null;
  }
};

type Change = { status: string; file: string };
const changes: Change[] = git("diff", "--name-status", base, head, "--", "content/")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, ...rest] = line.split("\t");
    return { status: status[0], file: rest[rest.length - 1] };
  });

const COLLECTIONS: Record<string, { label: string; path: string }> = {
  events: { label: "Event", path: "events" },
  venues: { label: "Venue", path: "venue" },
  articles: { label: "Article", path: "articles" },
};
// Flat entries (content/events/<slug>.md) and page bundles (content/venues/<slug>/venue.md)
const describe = (file: string) => {
  const [, collection = "", slug = ""] =
    file.match(/^content\/([^/]+)\/([^/]+)\//) ??
    file.match(/^content\/([^/]+)\/([^/]+)\.md$/) ??
    [];
  const { label = "Page", path = "" } = COLLECTIONS[collection] ?? {};
  return { label, path, collection, slug };
};

/** Fields rendered in full (heading + text) instead of a truncated table cell. */
const FULL_TEXT_FIELDS = ["title", "description", "howToFindUs", "channels"];

const asBlock = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

const fmt = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text === undefined ? "—" : `\`${text.length > 60 ? `${text.slice(0, 57)}…` : text}\``;
};

type Diff = { rows: string[]; blocks: string[] };

function markdownDiff(status: string, file: string): Diff {
  const before = status === "A" ? null : show(base, file);
  const after = status === "D" ? null : show(head, file);
  const prev = before ? matter(before) : null;
  const next = after ? matter(after) : null;
  const keys = new Set([...Object.keys(prev?.data ?? {}), ...Object.keys(next?.data ?? {})]);
  const rows: string[] = [];
  const blocks: string[] = [];
  const order = (key: string) => {
    const i = FULL_TEXT_FIELDS.indexOf(key);
    return i === -1 ? FULL_TEXT_FIELDS.length : i;
  };
  for (const key of [...keys].sort((x, y) => order(x) - order(y) || x.localeCompare(y))) {
    const a = prev?.data[key];
    const b = next?.data[key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (!FULL_TEXT_FIELDS.includes(key)) {
      rows.push(`| ${key} | ${fmt(a)} | ${fmt(b)} |`);
      continue;
    }
    const heading = `#### ${key}`;
    const fence = typeof b === "string" || typeof a === "string" ? "" : "json";
    const show = (v: unknown) =>
      v === undefined ? "_—_" : `\`\`\`${fence}\n${asBlock(v)}\n\`\`\``;
    blocks.push(
      a === undefined
        ? `${heading}\n\n${show(b)}`
        : `${heading}\n\n**Before**\n\n${show(a)}\n\n**After**\n\n${show(b)}`,
    );
  }
  const bodyBefore = prev?.content.trim() ?? "";
  const bodyAfter = next?.content.trim() ?? "";
  if (bodyBefore !== bodyAfter) {
    blocks.push(bodyAfter ? `#### body\n\n${bodyAfter}` : "#### body\n\n_removed_");
  }
  return { rows, blocks };
}

const VERB: Record<string, string> = { A: "Create", M: "Update", D: "Delete", R: "Rename" };
const sections: string[] = [];
const media: string[] = [];

for (const { status, file } of changes) {
  const { label, path, collection, slug } = describe(file);
  if (!file.endsWith(".md")) {
    media.push(`- ${VERB[status] ?? status} \`${file}\``);
    continue;
  }
  const title = show(status === "D" ? base : head, file);
  const name = title ? (matter(title).data.title ?? slug) : slug;
  const { rows, blocks } = markdownDiff(status, file);
  const entryFile = file.split("/").pop()?.replace(/\.md$/, "") ?? "";
  const entryPath = collection === "events" ? slug : `${slug}/${entryFile}`;
  const links = [
    previewUrl && collection && status !== "D" ? `[Preview](${previewUrl}/${path}/${slug})` : "",
    cmsUrl && collection
      ? `[Edit in CMS](${cmsUrl}/#/collections/${collection}/entries/${entryPath})`
      : "",
  ].filter(Boolean);
  sections.push(
    `### ${VERB[status] ?? status} ${label}: ${name}`,
    links.length ? links.join(" · ") : "",
    ...blocks,
    rows.length ? ["| Field | Before | After |", "| --- | --- | --- |", ...rows].join("\n") : "",
    !rows.length && !blocks.length ? "_No content changes in this file._" : "",
  );
}

if (media.length) sections.push("### Media", ...media);
if (!sections.length) sections.push("_No content changes._");

console.log(["<!-- cms-summary -->", ...sections].filter((s) => s !== "").join("\n\n"));
