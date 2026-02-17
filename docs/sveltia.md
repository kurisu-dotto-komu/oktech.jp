# Sveltia CMS

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is a Git-based headless CMS used for managing content locally. It is installed as an npm package (`@sveltia/cms`) and served entirely from the local dev server — no CDN required.

## Getting Started

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open [http://localhost:4321/admin](http://localhost:4321/admin) in your browser.

3. Click **"Work with Local Repository"**.

4. When the browser prompts for file system access, select the root directory of this repository.

You can now browse and edit events, venues, and articles directly. Changes are saved to your local `content/` folder and picked up by the dev server via HMR.

> **Note:** The File System Access API requires a Chromium-based browser (Chrome, Edge, Brave). Firefox and Safari are not supported. In Brave you may need to enable the API manually at `brave://flags/#file-system-access-api`.

## Authentication

For **local development**, no authentication is needed — use the "Work with Local Repository" button.

For **remote editing** (committing directly via GitHub), use "Sign In with GitHub" or "Sign In with GitHub Using Token". This requires a GitHub account with write access to `oktechjp/oktech.jp`.

## Configuration

The CMS configuration lives entirely in [`src/pages/admin.astro`](../src/pages/admin.astro) as a JavaScript object passed to `CMS.init()`. There is no separate `config.yml` file.

### Backend

```js
backend: {
  name: "github",
  repo: "oktechjp/oktech.jp",
  branch: "main",
}
```

### Collections

Three collections are configured:

#### Events (`/content/events/{id}/event.md`)

| Field       | Widget   | Notes                         |
| ----------- | -------- | ----------------------------- |
| title       | string   | Required                      |
| dateTime    | datetime | Format: `YYYY-MM-DD HH:mm`    |
| duration    | number   | Minutes, default 120          |
| cover       | image    | Required, stored in entry dir |
| meetupId    | number   | Required                      |
| venue       | number   | Meetup venue ID               |
| group       | number   | Group ID                      |
| topics      | list     | String list                   |
| howToFindUs | string   |                               |
| links       | object   | meetup URL, connpass URL      |
| isCancelled | boolean  | Default false                 |
| devOnly     | boolean  | Hidden in production          |
| body        | markdown | Event description             |

#### Venues (`/content/venues/{id}/venue.md`)

| Field       | Widget   | Notes                        |
| ----------- | -------- | ---------------------------- |
| title       | string   | Required                     |
| meetupId    | number   | Required                     |
| city        | string   |                              |
| country     | string   | Default "Japan"              |
| address     | string   |                              |
| state       | string   | Prefecture                   |
| postalCode  | string   |                              |
| url         | string   | Website URL                  |
| gmaps       | string   | Google Maps URL              |
| coordinates | object   | `lat` (float), `lng` (float) |
| hasPage     | boolean  | Has dedicated page           |
| devOnly     | boolean  | Hidden in production         |
| cover       | image    | Stored in entry dir          |
| body        | markdown | Venue description            |

#### Articles (`/content/articles/*.md`)

| Field       | Widget   | Notes    |
| ----------- | -------- | -------- |
| title       | string   | Required |
| description | text     |          |
| keywords    | list     | Strings  |
| body        | markdown | Required |

### Media Storage

Events and venues use per-entry media folders (images stored alongside the markdown file). Articles use the global `/content` media folder.

## Adding or Modifying Fields

To add or change fields, edit the collections array in `src/pages/admin.astro`. Refer to the [Sveltia CMS field documentation](https://sveltiacms.app/en/docs/fields) for available widget types and options.

After changing the CMS config, also update the corresponding Astro content schema in `src/content/` to keep them in sync.
