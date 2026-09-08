# Sveltia CMS

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is a Git-based headless CMS for editing the
markdown in `content/`. It is installed as an npm package (`@sveltia/cms`, pinned to an exact
version) and served from our own `/admin` page — no CDN, no `config.yml`.

- Local: <http://localhost:4321/admin>
- Deployed: `https://<site-host>/admin`

## Where the config lives

[`src/pages/admin.astro`](../src/pages/admin.astro) is a bare HTML shell (plus
`<meta name="robots" content="noindex, nofollow">`) that registers the custom widgets and calls
`CMS.init({ config: buildCmsConfig() })`. The config itself is TypeScript under
[`src/cms/`](../src/cms/), type-checked against the types `@sveltia/cms` ships:

| File               | Contents                                                              |
| ------------------ | --------------------------------------------------------------------- |
| `config.ts`        | `buildCmsConfig()` — assembles everything below                       |
| `backend.ts`       | GitHub backend (repo, branch, OAuth origin)                           |
| `media.ts`         | Global media folder, upload transformations, per-field bucket target  |
| `bootstrap/`       | Exchanges the GitHub token for an upload credential before `CMS.init` |
| `output.ts`        | Slug rules and markdown output options                                |
| `parity.ts`        | Which schema keys are allowed to have no CMS field, and vice versa    |
| `types.ts`         | Local aliases for the `@sveltia/cms` types                            |
| `collections/*.ts` | `events`, `series`, `venues`, `articles`, `pages`                     |
| `fields/*.ts`      | Shared field builders (`titleField`, `coverField`, `channelsField`…)  |
| `widgets/*`        | The `pull_request` link and the `markdown_code` body editor           |
| `previews/*`       | The preview-pane templates, rendered with the site's own components   |
| `github/*`         | Looks an entry's pull request and its deploy preview up on GitHub     |
| `events.ts`        | `postSave` / `postPublish` listeners behind the pull request notice   |
| `notice.ts`        | The dismissible bar at the bottom of `/admin`                         |
| `colorScheme.ts`   | Reads and watches the CMS light/dark choice, shared by both of those  |

Event, venue and article pages carry a **CMS** footer link that opens that entry in the editor.
Venues and articles are folder bundles, so Sveltia addresses them by their whole sub path
(`<slug>/venue`); events are flat files addressed by the slug alone. Both shapes come from
`cmsEntryPath()` / `cmsEditHref()` in [`src/utils/cms.ts`](../src/utils/cms.ts).

## Editing modes

### Local (recommended for development)

1. `npm run dev`
2. Open <http://localhost:4321/admin> and click **Work with Local Repository**.
3. Grant access to the root of this repository when prompted.

Edits are written straight to your working tree and hot-reloaded by the dev server. There is no
`local_backend` proxy — Sveltia uses the browser's File System Access API directly, which means
**a Chromium-based browser is required** (Chrome, Edge, Brave). Firefox and Safari cannot do this.
In Brave you may also need `brave://flags/#file-system-access-api`.

### Remote (commits to GitHub)

**Sign In with GitHub** runs the OAuth handshake through the
[sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) Worker at `https://auth.<site-host>`,
then opens a pull request against the configured branch (`publish_mode: editorial_workflow`). If the
Worker is down or you are not in the OAuth app's allow-list, **Sign In with GitHub Using Token**
accepts a personal access token with `repo` scope as a fallback.

## Environment variables

See [`.env.local.example`](../.env.local.example). `PUBLIC_*` values are inlined into the client
bundle, so none of them is a secret.

| Variable                           | Default                                | Purpose                                                                              |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `PUBLIC_CMS_REPO`                  | `oktechjp/oktech.jp`                   | `owner/repo` the CMS commits to                                                      |
| `PUBLIC_CMS_BRANCH`                | `main`                                 | Branch the CMS commits to                                                            |
| `PUBLIC_CMS_BACKEND`               | _(unset)_                              | `test-repo` runs the editor against a browser-local sandbox (no GitHub) for UI tests |
| `PUBLIC_CMS_AUTH_BASE_URL`         | `https://auth.<STAGING_HOST>` when set | Origin of the auth Worker                                                            |
| `IMAGES_HOST`                      | `images.<STAGING_HOST>` when set       | Media bucket host (build-time)                                                       |
| `PUBLIC_R2_*`, `PUBLIC_IMAGES_URL` | unset                                  | Bucket the CMS uploads to                                                            |
| `PUBLIC_MEDIA_UPLOAD_ENDPOINT`     | unset                                  | Upload Worker origin, if one is used                                                 |
| `PUBLIC_R2_ACCESS_KEY_ID`          | unset                                  | Only for the direct-to-R2 route                                                      |
| `STADIA_MAPS_API_KEY`              | unset                                  | Build-time key for venue map tiles                                                   |

The staging workflow sets `PUBLIC_CMS_REPO`/`PUBLIC_CMS_BRANCH` to the repository and branch it
deploys from, so a fork's `/admin` edits that fork.

## Staging deployment

`STAGING_HOST=<site-host> npm run deploy:staging` builds with `SITE_URL=https://<site-host>` and
deploys the Worker to that custom domain (see [`wrangler.jsonc`](../wrangler.jsonc) and
[`docs/cloudflare.md`](./cloudflare.md)). Pushes to the staging branch deploy automatically and pull
requests get a Worker preview URL commented on the PR, via
[`.github/workflows/cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml). The CMS
turns that preview into a **View Preview** button in the editor.

## Collections

Slugs are lowercased, accent-stripped and truncated to 59 characters. Uploads are converted to WebP
(quality 85, max 1920px wide) and capped at 10 MB, wherever they are stored.

### Events — `content/events/<slug>.md`

One flat markdown file per event; images live under `content/media/events/<slug>/` or in the media
bucket. Flat files are what makes Sveltia's **Duplicate** action available (it is disabled for any
collection with a `path` template), which is how the next occurrence of a series is created.

Slug template `{{fields.dateTime | date('YYMMDD')}}-{{title}}`. Fields: `title`, `description`,
`dateTime`, `duration`, `cover`, `venue`, `series`, `space`, `howToFindUs`, `topics`, `channels`
(labelled **External Links**), `gallery`, `attachments`, `isCancelled`, `devOnly`, body.

To give an event a different slug — a legacy Meetup-style `<meetupId>-<title>`, say — save it once
and then use **⋯ → Edit Slug**, which opens prefilled with the generated slug and accepts anything
that is not empty, slashed or already taken. The action is disabled until the entry has been saved,
so the template above is always what a new event starts with.

- **`dateTime` is Japan Time.** The widget is pinned to `Asia/Tokyo` with `output_utc: false` and
  writes the exact wall-clock string `YYYY-MM-DD HH:mm`, regardless of the editor's own timezone.
  `jstDateTime` in [`src/content/schemas/date.ts`](../src/content/schemas/date.ts) rejects any other
  shape, so never hand-edit this into an ISO timestamp. Sveltia adds a `(+09:00) Tokyo` chip next to
  any input with `input_timezone`; it has no off switch, so [`admin.astro`](../src/pages/admin.astro)
  hides it with one CSS rule — the label and hint already say Japan Time.
- **`description`** is real, authored front matter and is what search engines and social cards show.
  It is not derived from the body.
- **`venue`** is a relation storing the venue's **entry id** (its folder name). An id that matches no
  venue fails the build rather than silently rendering nothing.
- **`series`** is a relation into the Series collection; see below. Both relations set
  `dropdown_threshold: 0` so they always render as a searchable dropdown rather than a radio list,
  however few options there happen to be.
- **`topics`** is a free-form string list, not a curated vocabulary.
- **`gallery`** is a reorderable list of `{ src, caption? }`. Photos are editable here.
- The event list view is grouped by Series and sortable by date or title, with cover thumbnails.

### Series — `content/series/<slug>.md`

A series is the recurrence label shared by several events. Fields: `title`, `label` (cadence text
such as _Recurring every other Saturday_, shown on every occurrence), `cover` (default cover for
occurrences that do not set their own), body.

**There is no `/series/<slug>` page and no recurrence rule.** Every occurrence is an ordinary event
with its own file, its own URL, its own `.ics` and its own listing entry — nothing is generated. To
schedule the next one, open the most recent occurrence, choose **⋯ → Duplicate**, change the date
(the slug follows automatically) and replace the Meetup row under External Links. Duplicate clears the
slug and `aliases` for you but cannot clear an ordinary field, so the old channel reference is
carried over on purpose — it is visible in the PR preview before you publish.

### Venues — `content/venues/<slug>/venue.md`

A folder bundle, so a logo or photo can live beside the entry. Slug template `{{title}}`. Fields:
`title`, `city`, `address`, `state`, `space`, `url`, `gmaps`, `location`, `channels` (labelled
**External Links**), `description`, `hasPage`, `devOnly`, `cover`, body.

- **`location`** is the Sveltia **map** widget: search for the address, then drag the pin. It is
  stored as a GeoJSON point string. Setting it is all that is needed — the light and dark map
  images are rendered at build time (see [Venue maps](#venue-maps)).
- **`hasPage`** controls whether the venue gets its own `/venue/<slug>` page; venues without it are
  still shown on the events that use them.

### Articles — `content/articles/<slug>/index.md`

A folder bundle (`path: "{{slug}}/index"`) so images and PDFs can live beside it. Fields: `title`,
`description`, `keywords`, `author` (`Full Name <github-handle>`), `date` (`YYYY-MM-DD`),
`unlisted`, body.

### Pages — `content/pages/<slug>.md`

Standalone markdown pages served at `/<slug>` (the code of conduct today). Fields: `title`,
`description`, `keywords`, body. It is a normal folder collection, not a singleton, so pages can be
created and renamed with the same redirect protection as everything else.

## External Links

`channels` is an ordered list of `{ type, ref }` on events and venues, shown in the editor as
**External Links** (one row is an **External Link**). It replaces the old `meetupId` and `links`
fields, and **the order you put the rows in is the order the buttons appear in on the site**.

`ref` is the platform-local id (a Meetup event id, a Luma slug) or a full URL for anything else.
The platform list comes from [`src/content/channels.ts`](../src/content/channels.ts), which is the
single source of truth for both the CMS select options and the site's URL building. Adding a
platform is one row there and no schema change; a `type` the registry does not know still validates
and renders as a plain domain-labelled link.

Rows whose platform is marked `rsvp` (Meetup, Luma) are also what the "reserve your spot" call to
action on an upcoming event links to — the first such row wins.

## Images and uploads

An image field value is just a string, resolved by three rules:

- **`cloudflare:/<key>`** is a CMS upload, living in the R2 media bucket.
- **`https://…`** is a remote URL, fetched and optimised by Astro at build time when its host is in
  `image.remotePatterns`.
- Anything else is a path in the repository — `/content/media/events/<slug>/x.webp` for events,
  `./x.webp` for a venue or article bundle. (`content/media/` is the older, in-Git store; it is
  unrelated to the bucket and is not going away yet.)

**No content ever names the media host.** An entry stores `cloudflare:/events/covers/x.webp` and
that reference is the whole contract; where the key is actually served from is environment
configuration, defined once in [`src/uploads.ts`](../src/uploads.ts) and read where it matters: the
build rewrites it to `$PUBLIC_IMAGES_URL/<key>` so Astro can fetch and optimise the file
(`src/utils/images/uploads.ts` for fields, `remarkUploadRefs` in `src/utils/remarkPlugins.ts` for
images and links inside a body). Changing the convention is changing that one file.

**The scheme is deliberate.** The earlier `/uploads/<key>` looked like a path on this site and was
read as one; nothing is stored under `/uploads` in the repository, and only the build knows where
the file really is. A scheme cannot be mistaken for a location. The deployed site still answers
`/uploads/*` out of R2 (`workers/site/`, see [docs/cloudflare.md](./cloudflare.md)) for the
references saved before the change, and absolute `https://<images host>/<key>` URLs keep working as
plain remote URLs — nothing has to be migrated.

**What the CMS shows.** The media library's `public_url` is the images host, so the asset picker's
thumbnails load, and a `preSave` listener ([`src/cms/uploadRefs.ts`](../src/cms/uploadRefs.ts))
rewrites `<public_url>/<key>` to `cloudflare:/<key>` in every field and in the body before the
commit. The cost is the image **field**: reopen an entry and it shows a document icon and the raw
`cloudflare:/…` text, because Sveltia's own asset lookup only understands `https:`, `data:`,
`blob:` and repository paths. The **preview pane renders the real image** — the templates under
`src/cms/previews/` resolve the scheme through `PUBLIC_IMAGES_URL` themselves — which is where an
editor checks their work anyway.

Which upload route the browser takes is one environment variable; both routes — pasting a shared R2
secret, or the pair of Workers that derive a credential per editor — are documented in
**[docs/media-upload.md](./media-upload.md)**. Uploads are prefixed per field (`events/covers/`,
`events/gallery/`, `venues/`, `series/`).

When the upload service is configured (`PUBLIC_MEDIA_UPLOAD_ENDPOINT` **and**
`PUBLIC_CMS_AUTH_BASE_URL`), **there is nothing for an editor to paste.** After sign-in,
[`src/cms/bootstrap/`](../src/cms/bootstrap/) swaps the GitHub token Sveltia already stores for a
30-day upload credential and writes it into Sveltia's own preferences before `CMS.init` runs — which
is why [`admin.astro`](../src/pages/admin.astro) imports `@sveltia/cms` dynamically, after the
bootstrap: the CMS reads those preferences once, as its modules evaluate. The very first sign-in in
a browser reloads the page once, because the derived access key id has to be in the config the CMS
is initialised with.

Image widgets have `choose_url: true`, so an editor without upload access can always paste a public
URL instead. Resolution fails soft: a missing local file logs `[images] <entry-id>: …` and falls
back to the default cover rather than breaking the build.

Two things every editor should know:

- **Name the file after the entry** (`260919-agentic-assembly-cover.webp`, never `cover.webp`).
  Bucket keys are flat.
- **The upload happens immediately, not on publish.** Abandoning a draft leaves a harmless orphan.

## Venue maps

Give a venue a **Location** and its map images appear on the next build. The build stitches raster
tiles from [Stadia Maps](https://stadiamaps.com) with `sharp` — watercolour for light mode, a dark
basemap for dark mode — and caches the result on disk, keyed by style, position, zoom and size, so
rebuilds do not refetch. `STADIA_MAPS_API_KEY` is a **build** secret; it is only ever read
server-side and never reaches the published site.

Venues that already ship a committed `map.jpg` / `map-dark.jpg` keep using it, byte for byte;
stitching is the fallback for everything else. Without the API key those venues simply render
without a map, and the build warns rather than failing. The code is in
[`src/utils/maps/`](../src/utils/maps/).

## Renames and redirects

Every collection with a public page sets `aliases_field: "aliases"`. When an editor changes a title
such that the slug changes, Sveltia appends the entry's previous public path to an `aliases:` list
in its front matter, and [`src/utils/redirects.ts`](../src/utils/redirects.ts) turns that list into
Astro `redirects` at build time. Inbound links keep working and nobody has to remember anything.

**Never add a CMS field called `aliases`.** Sveltia stops recording aliases entirely if one exists.
It is declared in the zod schemas and listed as `derived` in `src/cms/parity.ts` instead.

Redirects are HTML only — a `.ics` URL never gets a redirect stub, because under
`build.format: "file"` that would put a meta-refresh HTML body at a calendar URL.

## Pull requests

Every entry has a **Pull request** field, and every save happens on the editorial-workflow
branch `cms/<collection>/<slug>`. Two things surface the pull request that comes out of that:

- **The field itself** asks GitHub — `GET /repos/<repo>/pulls?state=open&head=<owner>:<branch>` —
  with the token Sveltia already stores, and only renders a link when a pull request actually
  exists. An entry without one says "No open pull request." rather than offering a search link to
  an empty result page, and a new draft makes no request at all. `open_authoring` pushes the branch
  to a contributor's fork, so the lookup falls back to `head=<login>:<branch>`. Answers are cached
  per entry for the editor's session.
- **A bar at the bottom of the page** after a save or a publish, from `postSave` / `postPublish`
  listeners. Sveltia opens the pull request just after the commit, so the lookup is retried over
  about ten seconds; once the `cloudflare preview` commit status turns green the bar gains a **View
  preview** link. It is plain DOM with a handful of scoped rules in `admin.astro` — the site's
  Tailwind build is not loaded on `/admin`.

Neither of these can be put on the **editorial workflow board** cards. Those are Sveltia's own
Svelte components with no extension point: the card markup carries no slug, no collection id and no
pull request reference, only the visible title and a build-specific Svelte scope class. Anything
injected there would have to re-derive the slug from the rendered title and would break on the next
release, so the board keeps Sveltia's own deploy-status badge and preview button and nothing more.

## The preview pane

Sveltia's default preview is a list of field labels and raw values. `registerPreviews()` in
[`src/cms/previews/`](../src/cms/previews/) replaces it for **events**, **venues** and
**articles** with templates built from the site's own Tailwind and DaisyUI classes, so what an
editor sees is the page they are about to publish — same fonts, colours, cover framing, icon rows
and `prose` body.

Three things make that work:

- **The site's stylesheet.** `registerPreviewStyle()` is handed the URL Vite emits for
  `src/styles/global.css?url`, which is the same Tailwind + DaisyUI build the site links. Astro's
  Fonts API has no stable URL — it inlines `@font-face` rules under a build-specific family name —
  so `admin.astro` renders `<Font>` and the preview copies those rules into the iframe as raw CSS.
- **`data-theme` on the iframe.** `PreviewShell` mirrors the CMS's own light/dark choice onto the
  preview document, which is what the DaisyUI themes key off.
- **No hooks, anywhere in the preview tree.** Sveltia renders custom React components with its own
  bundled React, where hooks from the site's copy have no dispatcher and throw. Everything under
  `previews/` is a class component or a plain function component, and the only site components
  reused are the ones that are hook-free all the way down (`EventTags` today). `EventCardInfo` and
  `EventCardImage` look reusable but reach `EventCountdown`, which is stateful, so the preview
  composes those rows itself from the same classes and the same `formatDate` helpers.

The body is rendered with **micromark** (GFM), not `widgetFor("body")`: the body uses our own
`markdown_code` widget, and `CMS.getFieldType("markdown")` returns nothing, so there is no built-in
markdown preview to borrow. micromark is already in the tree behind Astro's markdown pipeline and
escapes raw HTML by default.

Relations are resolved with `getCollection(name, slug)`, which is async — that is why
`EventPreview` is a class component with state rather than a function.

## The body editor

Markdown bodies use a custom `markdown_code` widget
([`src/cms/widgets/markdownEditor.tsx`](../src/cms/widgets/markdownEditor.tsx)): CodeMirror 6 with
markdown syntax highlighting, a monospace face, line wrapping and light/dark following the CMS
theme. It replaces Sveltia's own markdown widget, whose rich-text mode can reshape markdown it did
not write. Bodies here are authored as markdown and nothing else.

## What stays out of the CMS

**Derived fields — never add these to a collection.** They are computed at build time and writing
them into front matter is at best ignored:

- `id` / `slug` — the file or folder name.
- `aliases` — written by Sveltia itself, as described above.
- `readingTime` and article/page `description` — derived from the body by the remark plugins.
- The social card. An event's `og:image` is always its own cover; `/events/<slug>/og.png` exists but
  answers 404 and no card is rendered. A venue uses its cover when it has one and a generated card
  when it does not.
- `mapImage` / `mapDarkImage` — the committed bitmaps or the stitched tiles.
- `seriesLabel` and the "next occurrence" badge — read from the referenced series and the calendar.
- Every `cover*` variant (`coverCompact`, `coverPolaroid`, `coverBig`, `coverPage`,
  `coverProjector`) — produced by the image pipeline.

`npm run check:cms` enforces this in both directions: a CMS field with no schema key fails, and a
schema key with no CMS field fails unless it is listed in `PARITY_TARGETS.derived`.

## Changing the config

1. Edit the relevant file in `src/cms/` — the `@sveltia/cms` types are the source of truth, and
   `npm run typecheck` will reject options that do not exist.
2. Keep the matching schema in `src/content/schemas/` in sync; the CMS validates nothing at build
   time, the zod schema does.
3. Run the checks:

   ```bash
   npm run check:cms     # validates the generated config against Sveltia's JSON schema
   npm run test:cms-crud # writes the files the CMS would commit, builds, asserts, deletes, rebuilds
   npm run checks        # format, typecheck, knip, check:cms
   ```

Field reference: <https://sveltiacms.app/en/docs/fields>. The authoritative schema is bundled at
`node_modules/@sveltia/cms/schema/sveltia-cms.json` — prefer it over blog posts, which are usually
describing Decap/Netlify CMS instead.
