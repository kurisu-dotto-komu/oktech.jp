# Media uploads

Images created in the CMS go to the R2 media bucket rather than into Git, and entries store
a host-free reference: **`/uploads/<key>`**, never `https://images.<site-host>/<key>`. The
prefix is the media library's `public_url`, defined once in
[`src/uploads.ts`](../src/uploads.ts); the build rewrites it to `$PUBLIC_IMAGES_URL/<key>` to
fetch and optimise the file, and the deployed site serves `/uploads/*` from R2 through the
site Worker (see [docs/cloudflare.md](./cloudflare.md)). Absolute URLs written before the
prefix existed still resolve, so nothing has to be migrated.

There are two ways for the browser to reach the bucket, and the CMS picks between them from
one environment variable.

| Mode               | `PUBLIC_MEDIA_UPLOAD_ENDPOINT` | Who can upload                                 |
| ------------------ | ------------------------------ | ---------------------------------------------- |
| Direct to R2       | unset                          | anyone holding the shared R2 Secret Access Key |
| Through the Worker | `https://uploads.<site-host>`  | anyone with write access to the content repo   |

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

Two Workers, sharing one secret that never leaves Cloudflare:

- [`workers/cms-auth`](../workers/cms-auth/README.md) — the GitHub OAuth proxy the CMS
  already signs in through, plus `GET /media-credentials`
- [`workers/media-upload`](../workers/media-upload/README.md) — `ListObjectsV2`,
  `PutObject` and `HeadObject` against an R2 binding

**Nobody is handed a key.** After signing in, `/admin` swaps the GitHub token Sveltia
already holds for an upload credential: the auth Worker checks with GitHub that the caller
can push to the content repository, and returns

```
accessKeyId     <github-login>.<YYYYMMDD>
secretAccessKey base64(first 30 bytes of HMAC-SHA256(SERVER_SECRET, accessKeyId))
```

The access key id is public and travels in every `Authorization` header, so the upload
Worker reads the login and the expiry off the request and recomputes the secret to verify
the signature. There is no list of editors on either side and nothing to keep in sync — the
signature verifying _is_ the proof that the credential was minted for that login, and the
expiry bounds how long that lasts. Because the bucket is reached through an R2 binding,
**no R2 token exists in any browser**, and the Worker additionally enforces a key-prefix,
content-type, size and no-overwrite policy that R2 itself cannot express.

The 40-character secret is not arbitrary: Sveltia's `apiKeyPattern` for `aws_s3` is
`/^[A-Za-z0-9/+=]{40}$/`, so the derived value is also something an editor could paste by
hand if the automatic exchange ever fails.

### Revoking and rotating

| Situation                    | Do this                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| Someone leaves the project   | remove their repository write access; they can mint no new credential |
| …and it has to stop **now**  | add their login to the upload Worker's `DENYLIST` var and redeploy    |
| A secret is suspected leaked | change `SERVER_SECRET` on **both** Workers; everyone re-signs in      |

Credentials last 30 days and the CMS renews them silently two days before they lapse, so the
worst case for a forgotten revocation is 30 days — or nothing at all, if the optional live
re-check (`GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` on the upload Worker) is configured.

### Setting it up

1. Generate the shared secret once and keep it out of the repository:

   ```bash
   openssl rand -base64 32
   ```

2. Copy each Worker's `wrangler.jsonc` to `wrangler.local.jsonc` (gitignored) and fill in
   your bucket, hostnames and `REPO`, then deploy both and give them the secret:

   ```bash
   cd workers/cms-auth
   npx wrangler deploy -c wrangler.local.jsonc --domain auth.<site-host>
   npx wrangler secret put SERVER_SECRET
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET

   cd ../media-upload
   npx wrangler deploy -c wrangler.local.jsonc --domain uploads.<site-host>
   npx wrangler secret put SERVER_SECRET   # the same value
   ```

3. Point the CMS at both. Locally, in `.env.local`; in CI, as the repository **variables**
   `MEDIA_UPLOAD_ENDPOINT` and the auth base URL, which `cloudflare-staging.yml` passes
   through:

   ```
   PUBLIC_MEDIA_UPLOAD_ENDPOINT=https://uploads.<site-host>
   PUBLIC_CMS_AUTH_BASE_URL=https://auth.<site-host>
   ```

   Both are required: without the auth Worker there is nothing to mint a credential.

No R2 bucket CORS rule is needed in this mode: the browser talks to the Worker, which
answers the preflight itself from `ALLOWED_ORIGINS`. That list takes `*` as a wildcard, so
`https://*.<site-host>` covers the per-PR preview hosts too.

## For editors

- **Nothing to paste.** Sign in to `/admin` with GitHub and uploads work. The first sign-in
  on a new browser reloads the page once, which is the CMS picking up the credential.
- **Name the file after the entry** (`260919-agentic-cover.webp`, never `cover.webp`).
  Uploads are refused when the key already exists, so a generic name will eventually fail
  for someone.
- Uploads land under `events/`, `venues/` or `series/` and happen **immediately**, not on
  publish; abandoning a draft leaves a harmless orphan object.
- The reference saved in the entry is `/uploads/<key>`. The image field shows that path
  rather than a thumbnail when the entry is reopened — Sveltia only previews repository
  paths and absolute URLs — but the site renders it correctly.
- Images are converted to webp and resized in the browser before they are sent.

## Troubleshooting

| Symptom                                | Cause                                                               |
| -------------------------------------- | ------------------------------------------------------------------- |
| `403 Signature does not match…`        | the credential predates a `SERVER_SECRET` rotation; sign out and in |
| `403 Credential has expired…`          | more than 30 days since the last sign-in; reload `/admin`           |
| `403 … upload access has been revoked` | the login is on the Worker's `DENYLIST`                             |
| `403 Request date is outside…`         | the editor's clock is more than five minutes off                    |
| `409 … already exists`                 | the file name is already taken; rename it after the entry           |
| `415` / `400 … extension`              | not an allowed image type, or the extension disagrees with the type |
| Upload button does nothing             | no credential: check the console for `[cms] no upload credential`   |
| Browser console shows a CORS failure   | the `/admin` origin is missing from the Worker's `ALLOWED_ORIGINS`  |

Each Worker's own checks are covered by `npm test` inside its directory, which runs offline
against a fake R2 binding and a stubbed GitHub. Live logs:
`npx wrangler tail <worker-name>`.
