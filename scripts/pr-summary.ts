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
const describe = (file: string) => {
  const [, collection = "", slug = ""] = file.match(/^content\/([^/]+)\/([^/]+)\//) ?? [];
  const { label = "Page", path = "" } = COLLECTIONS[collection] ?? {};
  return { label, path, collection, slug };
};

const fmt = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text === undefined ? "—" : `\`${text.length > 60 ? `${text.slice(0, 57)}…` : text}\``;
};

function markdownDiff(status: string, file: string): string[] {
  const before = status === "A" ? null : show(base, file);
  const after = status === "D" ? null : show(head, file);
  const prev = before ? matter(before) : null;
  const next = after ? matter(after) : null;
  const keys = new Set([...Object.keys(prev?.data ?? {}), ...Object.keys(next?.data ?? {})]);
  const rows: string[] = [];
  for (const key of [...keys].sort()) {
    const a = prev?.data[key];
    const b = next?.data[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) rows.push(`| ${key} | ${fmt(a)} | ${fmt(b)} |`);
  }
  if ((prev?.content ?? "") !== (next?.content ?? "")) {
    const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
    rows.push(
      `| _body_ | ${words(prev?.content ?? "")} words | ${words(next?.content ?? "")} words |`,
    );
  }
  return rows;
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
  const rows = markdownDiff(status, file);
  const links = [
    previewUrl && collection && status !== "D" ? `[Preview](${previewUrl}/${path}/${slug})` : "",
    cmsUrl && collection
      ? `[Edit in CMS](${cmsUrl}/#/collections/${collection}/entries/${slug}/${file.split("/").pop()?.replace(/\.md$/, "")})`
      : "",
  ].filter(Boolean);
  sections.push(
    `### ${VERB[status] ?? status} ${label}: ${name}`,
    links.length ? links.join(" · ") : "",
    rows.length
      ? ["| Field | Before | After |", "| --- | --- | --- |", ...rows].join("\n")
      : "_No front matter changes._",
  );
}

if (media.length) sections.push("### Media", ...media);
if (!sections.length) sections.push("_No content changes._");

console.log(["<!-- cms-summary -->", ...sections].filter((s) => s !== "").join("\n\n"));
