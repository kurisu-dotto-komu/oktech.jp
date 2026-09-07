# Media uploads

Images created in the CMS go to the R2 media bucket rather than into Git, and entries store
the public URL (`https://images.<site-host>/<key>`). There are two ways for the browser to
reach the bucket, and the CMS picks between them from one environment variable.

| Mode               | `PUBLIC_MEDIA_UPLOAD_ENDPOINT` | Who can upload                                        |
| ------------------ | ------------------------------ | ----------------------------------------------------- |
| Direct to R2       | unset                          | anyone holding the shared R2 Secret Access Key        |
| Through the Worker | `https://uploads.<site-host>`  | only the maintainers listed in the Worker's whitelist |

Both use the same Sveltia machinery — an S3-compatible library that signs each request with
AWS Signature V4 — so switching is a config change and the editor experience is identical.

## Direct to R2 (interim)

`media_libraries.cloudflare_r2` in the CMS config carries the account id, bucket, access key
id and public URL. Each editor pastes the matching **Secret Access Key** once, in the CMS
settings; Sveltia stores it in their browser's `localStorage`. The token is scoped to
_Object Read & Write_ on the media bucket only, the CMS never issues a delete, and bucket
versioning is on — but the same secret is in everyone's browser, so rotating it means asking
every editor to paste a new one.

## Through the upload Worker (target)

[`workers/media-upload`](../workers/media-upload/README.md) is a Worker that implements
`ListObjectsV2`, `PutObject` and `HeadObject` against an R2 binding. Because the bucket is
reached through the binding, **no R2 token exists in any browser**. The Worker authenticates
by recomputing the SigV4 signature against a whitelist of maintainers, each with their own
generated key pair, and additionally enforces a key-prefix, content-type, size and
no-overwrite policy that R2 itself cannot express.

Sveltia takes the access key id from the site config and the secret from each editor's
settings, so the usual arrangement is one shared `accessKeyId` with a **different
`secretAccessKey` per maintainer**. The Worker tries every whitelist row carrying that id,
which is what makes per-person revocation possible.

### Setting it up

1. Mint one key pair per maintainer:

   ```bash
   cd workers/media-upload && npm run keygen
   ```

   The secret must stay exactly 40 characters — Sveltia validates the shape and silently
   discards anything else.

2. Fill in `bucket_name` and `ALLOWED_ORIGINS` in
   [`workers/media-upload/wrangler.jsonc`](../workers/media-upload/wrangler.jsonc), then
   deploy and set the whitelist:

   ```bash
   cd workers/media-upload
   npx wrangler deploy --domain uploads.<site-host>
   npx wrangler secret put MAINTAINERS   # JSON array, see the Worker README
   ```

3. Point the CMS at it. Locally, in `.env.local`; in CI, as the repository **variable**
   `MEDIA_UPLOAD_ENDPOINT`, which `cloudflare-staging.yml` passes through as
   `PUBLIC_MEDIA_UPLOAD_ENDPOINT`:

   ```
   PUBLIC_MEDIA_UPLOAD_ENDPOINT=https://uploads.<site-host>
   ```

4. Give each maintainer their secret. In `/admin` → settings → media libraries, they paste
   it once. Removing their row from `MAINTAINERS` (and re-running `wrangler secret put`)
   revokes them; nothing else changes.

No R2 bucket CORS rule is needed in this mode: the browser talks to the Worker, which
answers the preflight itself from `ALLOWED_ORIGINS`. Per-PR preview hosts are deliberately
not allowlisted — previews are for reviewing, authoring happens on the stable `/admin`.

## For editors

- **Name the file after the entry** (`260919-agentic-cover.webp`, never `cover.webp`).
  Uploads are refused when the key already exists, so a generic name will eventually fail
  for someone.
- Uploads land under `events/`, `venues/` or `series/` and happen **immediately**, not on
  publish; abandoning a draft leaves a harmless orphan object.
- Images are converted to webp and resized in the browser before they are sent.

## Troubleshooting

| Symptom                              | Cause                                                               |
| ------------------------------------ | ------------------------------------------------------------------- |
| `403 Signature does not match…`      | wrong or revoked secret; re-paste it in the CMS settings            |
| `403 Request date is outside…`       | the editor's clock is more than five minutes off                    |
| `409 … already exists`               | the file name is already taken; rename it after the entry           |
| `415` / `400 … extension`            | not an allowed image type, or the extension disagrees with the type |
| Upload button does nothing           | the editor has not entered their Secret Access Key yet              |
| Browser console shows a CORS failure | the `/admin` origin is missing from the Worker's `ALLOWED_ORIGINS`  |

The Worker's own checks are covered by `npm test` inside `workers/media-upload`, which runs
offline against a fake R2 binding. Live logs: `npx wrangler tail oktech-media-upload`.
