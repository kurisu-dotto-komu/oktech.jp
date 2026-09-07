# OKTech Website & CMS — Overview

A high-level handover of how the site is built, edited and deployed, and where it is going. Detailed setup lives in the linked docs.

## What it is

- **Site:** a static website built with [Astro](https://astro.build) (TypeScript, React, Tailwind, DaisyUI). Every page is pre-rendered at build time; there is no server.
- **Content:** markdown files with YAML front matter in [`content/`](../content) — events, venues, articles and standalone pages — plus their images. The Git repository is the database.
- **CMS:** [Sveltia CMS](https://github.com/sveltia/sveltia-cms), served by the site itself at `/admin`. It edits the markdown files through the GitHub API; it has no server or database of its own. → [docs/sveltia.md](./sveltia.md)
- **Hosting:** the staging/demo site, the CMS sign-in service and media storage run on Cloudflare (Workers + R2). Production currently deploys to GitHub Pages. → [docs/cloudflare.md](./cloudflare.md)
- **Code rules and conventions:** [AGENTS.md](../AGENTS.md). Developer quick start: [README.md](../README.md).

## How editing works

1. An editor opens `/admin` and signs in with GitHub. Access is governed by GitHub repository permissions — there is no separate CMS user list. A GitHub App scoped to this single repository handles sign-in.
2. Saving an entry opens a **pull request** (Sveltia's _editorial workflow_). Entries move across a board: **Drafts → In Review → Ready → Publish**. Publishing merges the PR.
3. Every PR automatically gets a **preview site** at its own hostname (`pr-<n>-preview.<staging host>`), and the CMS shows a **View Preview** button linking straight to the edited page.
4. People without write access can still propose changes: Sveltia forks the repository for them (_open authoring_) and their edits arrive as PRs for maintainers to review.
5. Merging to the staging branch redeploys the staging site within about two minutes. Each site page has a **CMS** link in the footer that opens that exact entry in the editor.

## How the site is built and deployed

- `astro build` renders every page and optimises every image (responsive `webp` variants). Images can be local files in the repo or remote URLs on the media bucket; both are optimised the same way.
- GitHub Actions ([`cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml)) builds on every push and PR. Dependencies and the image cache are restored from the Actions cache, so a typical build+deploy takes about 1–2 minutes (the first, cold build takes ~6).
- The single knob for the staging hostname is the `STAGING_HOST` repository variable; the auth service (`auth.<host>`) and media bucket (`images.<host>`) hang off it.
- Quality gates: `npm run checks` (formatting, type checks, unused-code check), `npm run check:cms` (CMS config validated against Sveltia's schema and against the content schemas), `npm run test:cms-crud` (creates fixture entries in the exact shape the CMS writes, builds, asserts the pages exist, deletes them, asserts they are gone) and the existing Playwright suite.

## Current state (this branch)

Done on the `sveltia-cms` branch, deployed on staging:

- Sveltia CMS integrated with full create/read/update/delete for events, series, venues, articles and standalone pages, with field parity to the site's content schemas enforced by a check.
- Editorial workflow, open authoring, repo-scoped GitHub App sign-in, per-PR preview sites, footer deep links.
- Cloudflare Workers hosting, R2 media bucket, build caching, env-driven configuration (nothing account-specific in the repo).
- **The restructure ("CMS as the source of truth") is complete.** The content-import pipeline and its scheduled workflows are gone; the site is built from Astro's own content collections rather than five hand-written loaders; every URL the old site served is still served.
- Recurring events are now ordinary events that reference a _series_ entry. Every future occurrence is a real, listed, editable event — editors create the next one with **Duplicate**.
- A generic _channels_ list (Meetup, Luma, LinkedIn, Discord, a website) replaces the old Meetup-specific fields; adding a platform is one registry row and no schema change.
- Photo galleries are editable, orderable and captionable in the CMS.
- Venue maps are produced at build time from a pin the editor drops on a map widget; the existing committed map images are still used where they exist.
- Renaming an entry records the old URL and the build emits a redirect for it, so an editor cannot break an inbound link.
- CMS uploads go to the media bucket through an upload Worker that derives each editor's credential from their GitHub sign-in (write access to the repository required) ([docs/media-upload.md](./media-upload.md)).
- Markdown bodies are edited in a CodeMirror editor with syntax highlighting instead of a rich-text control.
- Because a static build goes stale when an event passes, a daily workflow computes the next event's end time from the content and triggers a rebuild once it has passed.

Not yet done: the ~350 MB of legacy images still live in Git, the media bucket has no backup yet, and there is no image cropping in the CMS.

## Plans

**Next:**

- **Back up the media bucket.** The bucket has no versioning, so an accidental overwrite or deletion (or a leaked upload credential) is unrecoverable today. Add a scheduled copy to a second bucket or another provider (e.g. a nightly `rclone`/S3 sync from a Worker cron or GitHub Actions), keep a few days of history, and document the restore procedure.
- **In-CMS cropping for cover images.** Covers are displayed 16:9 and are currently centre-cropped by the site, which is wrong for some images. Nothing in the current design blocks this: the cover value is a plain URL string, so a custom crop widget can be added without a schema or content change.
- **Move the legacy images out of the repository.** Once every image reference is a bucket URL this is a single commit of string rewrites — but deleting the files is not enough, they stay in Git history and every clone still downloads them. That needs a coordinated history rewrite, so it is planned as its own step (see below).

**Later:**

- a Discord notification whenever content is published;
- a "media kit" view to copy event details/assets for cross-posting to external sites;
- streamlined publishing for trusted admins (auto-merge, branch rules);
- tailoring the CMS itself: site branding (logo, title, colours), only the fields and collections editors actually need, custom widgets where the defaults are awkward (e.g. venue picker), and a preview pane rendered with the site's own components.

## Future considerations

- **Cloudflare Images** instead of build-time optimisation: images would be resized on Cloudflare's edge on demand, removing image processing from the build entirely (builds become seconds, no image cache to manage). It is a paid add-on (a few dollars a month at this volume); the current design keeps the option open because the site already references images by URL.
- **Production on Cloudflare instead of GitHub Pages:** the staging setup (Workers static assets, custom domain, per-PR previews, cached builds) could serve production as-is. Benefits: one hosting platform, faster and better-cached builds, preview deployments for production PRs, and hosting decoupled from GitHub should that ever be needed. The build could also move to Cloudflare's own git-connected builds. Cost is within the free tier at current traffic.
- **Media history rewrite:** once existing images move to R2 the repository shrinks from ~400 MB to a few MB, which makes cloning, CMS sessions and CI faster. Simply deleting the files is not enough — they stay in Git history and every full clone still downloads them. The move needs a history rewrite (e.g. `git filter-repo` to strip the image paths, then a force-push and fresh clones for everyone) or an agreed pruning approach. It rewrites every commit hash, so it is a one-off, coordinated step to be scheduled on its own, deliberately kept out of the restructure.

## Where to look

| Topic                               | Document                                     |
| ----------------------------------- | -------------------------------------------- |
| Editing content, CMS configuration  | [docs/sveltia.md](./sveltia.md)              |
| Hosting, previews, media bucket     | [docs/cloudflare.md](./cloudflare.md)        |
| Image uploads and the upload Worker | [docs/media-upload.md](./media-upload.md)    |
| Developer setup and scripts         | [README.md](../README.md)                    |
| Code conventions                    | [AGENTS.md](../AGENTS.md)                    |
| CI/CD definition                    | [`.github/workflows/`](../.github/workflows) |
| CMS configuration source            | [`src/cms/`](../src/cms)                     |
| Content schemas                     | [`src/content/`](../src/content)             |
