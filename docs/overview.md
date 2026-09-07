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
3. Every PR automatically gets a **preview site** at its own hostname (`pr-<n>.preview.<staging host>`), and the CMS shows a **View Preview** button linking straight to the edited page.
4. People without write access can still propose changes: Sveltia forks the repository for them (_open authoring_) and their edits arrive as PRs for maintainers to review.
5. Merging to the staging branch redeploys the staging site within about two minutes. Each site page has a **CMS** link in the footer that opens that exact entry in the editor.

## How the site is built and deployed

- `astro build` renders every page and optimises every image (responsive `webp` variants). Images can be local files in the repo or remote URLs on the media bucket; both are optimised the same way.
- GitHub Actions ([`cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml)) builds on every push and PR. Dependencies and the image cache are restored from the Actions cache, so a typical build+deploy takes about 1–2 minutes (the first, cold build takes ~6).
- The single knob for the staging hostname is the `STAGING_HOST` repository variable; the auth service (`auth.<host>`) and media bucket (`images.<host>`) hang off it.
- Quality gates: `npm run checks` (formatting, type checks, unused-code check), `npm run check:cms` (CMS config validated against Sveltia's schema and against the content schemas), `npm run test:cms-crud` (creates fixture entries in the exact shape the CMS writes, builds, asserts the pages exist, deletes them, asserts they are gone) and the existing Playwright suite.

## Current state (this branch)

Done on the `sveltia-cms` branch, deployed on staging:

- Sveltia CMS integrated with full create/read/update/delete for events, venues, articles and the code-of-conduct page, with field parity to the site's content schemas.
- Editorial workflow, open authoring, repo-scoped GitHub App sign-in, per-PR preview sites, footer deep links.
- Cloudflare Workers hosting, R2 media bucket, build caching, env-driven configuration (nothing account-specific in the repo).
- Data clean-up: duplicate venue entries merged, articles normalised to one folder shape, build made resilient to a bad image reference (falls back and warns instead of failing).

Not yet done (see plans): the legacy content-import pipeline is still present, new CMS uploads still land in the repository rather than the media bucket, venue map images are still only produced by the import script, gallery photos are not editable in the CMS.

## Plans

**Next: the restructure ("CMS as the source of truth").** A design pass is producing a plan for:

- removing the content import scripts and scheduled workflows entirely — content is only what editors put in the CMS;
- replacing auto-generated recurring events with ordinary events carrying a _series_ label (editors duplicate an event in the CMS);
- a generic _channels_ model (Meetup today, Luma or others later) without schema changes;
- existing URLs preserved (redirects where needed), a friendlier id/URL scheme for new content;
- CMS uploads going straight to the media bucket, with a plan to migrate the existing images out of the repository later;
- venue maps generated without the import script;
- a simpler, more obvious codebase for future contributors (Astro built-ins over bespoke loaders, small files, one way to do each thing).

**Later:**

- a Discord notification whenever content is published;
- a "media kit" view to copy event details/assets for cross-posting to external sites;
- CMS preview panes rendered with the site's own components;
- streamlined publishing for trusted admins (auto-merge, branch rules).

## Future considerations

- **Cloudflare Images** instead of build-time optimisation: images would be resized on Cloudflare's edge on demand, removing image processing from the build entirely (builds become seconds, no image cache to manage). It is a paid add-on (a few dollars a month at this volume); the current design keeps the option open because the site already references images by URL.
- **Production on Cloudflare instead of GitHub Pages:** the staging setup (Workers static assets, custom domain, per-PR previews, cached builds) could serve production as-is. Benefits: one hosting platform, faster and better-cached builds, preview deployments for production PRs, and hosting decoupled from GitHub should that ever be needed. The build could also move to Cloudflare's own git-connected builds. Cost is within the free tier at current traffic.
- **Media in the bucket, not the repo:** once existing images move to R2 the repository shrinks from ~400 MB to a few MB, which makes cloning, CMS sessions and CI faster.

## Where to look

| Topic                              | Document                                     |
| ---------------------------------- | -------------------------------------------- |
| Editing content, CMS configuration | [docs/sveltia.md](./sveltia.md)              |
| Hosting, previews, media bucket    | [docs/cloudflare.md](./cloudflare.md)        |
| Developer setup and scripts        | [README.md](../README.md)                    |
| Code conventions                   | [AGENTS.md](../AGENTS.md)                    |
| CI/CD definition                   | [`.github/workflows/`](../.github/workflows) |
| CMS configuration source           | [`src/cms/`](../src/cms)                     |
| Content schemas                    | [`src/content/`](../src/content)             |
