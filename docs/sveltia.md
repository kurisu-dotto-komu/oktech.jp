# Sveltia CMS

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is a Git-based headless CMS for editing the
markdown in `content/`. It is installed as an npm package (`@sveltia/cms`, pinned to an exact
version) and served from our own `/admin` page — no CDN, no `config.yml`.

- Local: <http://localhost:4321/admin>
- Staging: <https://oktech.doo.boo/admin>

## Where the config lives

[`src/pages/admin.astro`](../src/pages/admin.astro) is a bare HTML shell (plus
`<meta name="robots" content="noindex, nofollow">`) that calls `CMS.init({ config: buildCmsConfig() })`.
The config itself is TypeScript under [`src/cms/`](../src/cms/), type-checked against the types
`@sveltia/cms` ships:

| File               | Contents                                              |
| ------------------ | ----------------------------------------------------- |
| `config.ts`        | `buildCmsConfig()` — assembles everything below       |
| `backend.ts`       | GitHub backend (repo, branch, OAuth origin)           |
| `media.ts`         | Global media folders + upload transformations         |
| `output.ts`        | Slug rules and markdown output options                |
| `types.ts`         | Local aliases for the `@sveltia/cms` types            |
| `collections/*.ts` | `events`, `venues`, `articles`, and the singletons    |
| `fields/common.ts` | Shared field builders (`titleField`, `coverField`, …) |

Event, venue and article pages carry a **CMS** footer link that opens that entry in the editor.
Sveltia addresses an entry by its whole sub path (`<slug>/event`, not `<slug>`), so both those links
and each collection's `path` template come from `cmsEntryPath()` / `cmsEditHref()` in
[`src/utils/cms.ts`](../src/utils/cms.ts). Occurrences of a recurring event fall back to plain
`/admin`, because their parent is not editable in the CMS.

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
[sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) Worker at
<https://auth.oktech.doo.boo>, then commits directly to the configured branch. If the Worker is
down or you are not in the OAuth app's allow-list, **Sign In with GitHub Using Token** accepts a
personal access token with `repo` scope as a fallback.

## Environment variables

All are optional `PUBLIC_*` values (inlined into the client bundle, so never secrets). See
[`.env.local.example`](../.env.local.example).

| Variable                   | Default                                | Purpose                         |
| -------------------------- | -------------------------------------- | ------------------------------- |
| `PUBLIC_CMS_REPO`          | `oktechjp/oktech.jp`                   | `owner/repo` the CMS commits to |
| `PUBLIC_CMS_BRANCH`        | `main`                                 | Branch the CMS commits to       |
| `PUBLIC_CMS_AUTH_BASE_URL` | `https://auth.<STAGING_HOST>` when set | Origin of the auth Worker       |
| `IMAGES_HOST`              | `images.<STAGING_HOST>` when set       | Media bucket host (build-time)  |

The staging workflow sets `PUBLIC_CMS_REPO`/`PUBLIC_CMS_BRANCH` to the repository and branch it
deploys from, so a fork's `/admin` edits that fork.

## Staging deployment

`STAGING_HOST=<host> npm run deploy:staging` builds with `SITE_URL=https://<host>` and deploys the
Worker to that custom domain (see [`wrangler.jsonc`](../wrangler.jsonc) and
[`docs/cloudflare.md`](./cloudflare.md)). Pushes to `sveltia-cms` deploy automatically and pull
requests get a Worker preview URL commented on the PR, via
[`.github/workflows/cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml).

## Collections

Entry collections store media next to the entry (`media_folder: ""`, `public_folder: "."`), so an
uploaded cover is committed into the entry folder and referenced as `./cover.webp`. Uploads are
converted to WebP (quality 85, max 1920px wide) and capped at 10 MB. Slugs are lowercased,
accent-stripped and truncated to 59 characters.

### Events — `content/events/<slug>/event.md`

Slug template `{{fields.dateTime | date('YYMMDD')}}-{{title}}`. Fields: `title`, `description`, `dateTime`,
`duration`, `cover`, `group`, `venue`, `space`, `howToFindUs`, `meetupId`, `topics`, `links`,
`attachments`, `recurringLabel`, `recurredFrom` (read-only), `isCancelled`, `devOnly`, body.

- **`dateTime` is Japan Standard Time.** The widget is pinned to `Asia/Tokyo` with
  `output_utc: false` and writes the exact wall-clock string `YYYY-MM-DD HH:mm`, regardless of the
  editor's own timezone. `parseEventDateTime()` in [`src/utils/recurringDates.ts`](../src/utils/recurringDates.ts)
  rejects any other shape, so never hand-edit this into an ISO timestamp.
- **`group`** is a select over `EVENT_GROUPS` in [`src/content/eventTaxonomy.ts`](../src/content/eventTaxonomy.ts)
  (OWDDM `15632202`, KWDDM `36450361`). Add new groups there and the CMS picks them up; the zod
  schema only checks that `group` is a number.
- **`topics`** is a free-form string list, not a curated vocabulary.
- **`meetupId`** is a string field because Meetup now issues alphanumeric ids as well as numeric ones.
- **`venue`** is a relation into the venues collection, storing the venue's `meetupId`.

### Venues — `content/venues/<slug>/venue.md`

Slug template `{{fields.meetupId}}-{{fields.title | slugify}}`. Fields: `title`, `meetupId`, `city`, `country`,
`address`, `state`, `space`, `url`, `gmaps`, `coordinates` (`lat`/`lng` floats), `description`,
`hasPage`, `devOnly`, `cover`, body.

Setting `coordinates` does **not** generate a map: `map.jpg` / `map-dark.jpg` are produced by the
import script and committed to the repository, so a venue created in the CMS has no map until those
are added.

### Articles — `content/articles/<slug>/index.md`

Each article is a folder bundle (`path: "{{slug}}/index"`) so images can live beside it. Fields:
`title`, `description`, `keywords`, `author` (`Full Name <github-handle>`), `date` (`YYYY-MM-DD`),
`unlisted`, body.

### Singletons

`content/code-of-conduct.md` is exposed as a singleton (`src/cms/collections/pages.ts`) — editable,
but it cannot be created or deleted from the CMS.

## Recurring events

A recurring series is a single "parent" entry whose frontmatter carries a `repeat` map keyed by
`YYMMDD`, with optional per-occurrence overrides:

```yaml
repeat:
  "260919":
    meetupId: ngkqztyjcmbzb
```

The events loader expands each key into a virtual event (`<yymmdd>-<parent-slug>`) that inherits the
parent's fields and gets `recurredFrom` set. To give one occurrence real content, create a normal
event folder with that exact slug and a `recurredFrom` pointing at the parent — the materialised
entry then wins over the virtual one.

**Repeat parents are excluded from the CMS.** Sveltia flattens frontmatter, so it cannot round-trip
the nested `repeat` map without destroying it. The events collection therefore carries
`filter: { field: "slug", pattern: "^\\d" }`, and parents (`agentic-assembly`,
`dev-recurring-monday`) are the only event folders whose name does not start with a digit. Edit them
in Git. **A new recurring parent must be given a non-numeric folder name**, or it will show up in
the CMS and be corrupted on save.

## Images

`cover` accepts two forms, in events and venues alike:

| Form                    | Resolution                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| `./cover.webp`          | Local file in the entry folder, processed by Astro                      |
| `https://<host>/x.webp` | Remote file (the media bucket), fetched and processed by Astro at build |

Image widgets have `choose_url: true`, so an editor can either upload a file or paste an image URL.
Remote images are only optimised when their host is listed in `image.remotePatterns`
([`astro.config.ts`](../astro.config.ts), driven by `IMAGES_HOST`); other hosts are served as-is.
The provider abstraction lives in [`src/utils/images/`](../src/utils/images/).

Resolution fails soft: a missing local file logs `[images] <entry-id>: …` and falls back to the
default cover rather than breaking the build; a remote file whose size cannot be read falls back to
placeholder dimensions.

## What stays out of the CMS

- **Event galleries** (`content/events/<slug>/gallery/`) and their `.yaml` captions.
- **Venue maps** (`map.jpg`, `map-dark.jpg`) — committed alongside the venue, not editable here.
- **Recurring parents**, as described above.
- **Derived fields — never add these to a collection.** They are computed by the loaders in
  `src/content/` and writing them into frontmatter will be silently ignored or will conflict:
  `id`/`slug` (the folder name), `readingTime`, `bodySlug`, `isNextRecurringOccurrence`,
  `calendarOnly`, `mapImage`/`mapDarkImage`, and every `cover*` variant (`coverCompact`,
  `coverPolaroid`, `coverBig`, `coverPage`, `coverProjector`). `recurredFrom` is exposed read-only
  for context only.

## Changing the config

1. Edit the relevant file in `src/cms/` — the `@sveltia/cms` types are the source of truth, and
   `npm run typecheck` will reject options that do not exist.
2. Keep the matching schema in `src/content/` in sync; the CMS validates nothing at build time, the
   zod schema does.
3. Run the checks:

   ```bash
   npm run check:cms     # validates the generated config against Sveltia's JSON schema
   npm run test:cms-crud # writes the files the CMS would commit, builds, asserts, deletes, rebuilds
   npm run checks        # format, typecheck, knip, check:cms
   ```

Field reference: <https://sveltiacms.app/en/docs/fields>. The authoritative schema is bundled at
`node_modules/@sveltia/cms/schema/sveltia-cms.json` — prefer it over blog posts, which are usually
describing Decap/Netlify CMS instead.
