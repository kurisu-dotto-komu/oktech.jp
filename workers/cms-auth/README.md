# CMS auth Worker

Two jobs in one Worker:

1. **GitHub OAuth for Sveltia CMS** — `/auth` and `/callback`, handled by
   [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), vendored **unmodified**
   into [`src/upstream/index.js`](./src/upstream/index.js) (MIT, see
   [`LICENSE.txt`](./LICENSE.txt); copied at upstream commit `25f56e1`). Update it by
   copying that one file again — nothing in this repository patches it.
2. **`GET /media-credentials`** — the endpoint that replaces handing editors an upload key.

## Why it is vendored

The endpoint below has to share `SERVER_SECRET` with the upload Worker and the CMS has to
reach both from one origin. Running upstream as a separate deployment would mean a second
hostname, a second OAuth app registration and no way to keep the credential derivation in
one place, so the upstream handler is kept intact and this Worker routes in front of it.

## `GET /media-credentials`

```
Authorization: Bearer <the GitHub token Sveltia already holds>
```

The Worker asks GitHub, with that token, who the caller is (`GET /user`) and what they may
do (the `permissions` object on `GET /repos/{REPO}`). The token belongs to the caller, so it
can only answer about them. If that object grants `push`, `maintain` or `admin` — or the
login is in `ALLOWED_LOGINS` — the response is:

```json
{
  "accessKeyId": "octocat.20261007",
  "secretAccessKey": "<40 base64 characters>",
  "expiresAt": "2026-10-07T00:00:00.000Z",
  "endpoint": "https://uploads.example.com",
  "bucket": "example-media",
  "login": "octocat"
}
```

Anything else is `403`. The permission comes from the repository object rather than
`/collaborators/{login}/permission` because that endpoint requires the full `repo` OAuth
scope and answers `403` for the narrower `public_repo` scope Sveltia asks for — which would
be indistinguishable from having no access. Nothing is stored: the secret is
`base64(HMAC-SHA256(SERVER_SECRET, accessKeyId)[0..30])`, so the upload Worker recomputes it
from the access key id it receives in the SigV4 `Credential=` field. The 30 bytes are
deliberate — 40 base64 characters is the only shape Sveltia's `apiKeyPattern` for `aws_s3`
accepts, so the value can also be pasted by hand into the CMS settings.

Revoking is removing repository access (no new credential can be minted) plus, if it has to
take effect before the current one expires, adding the login to the upload Worker's
`DENYLIST`. Rotating everyone at once is changing `SERVER_SECRET` on both Workers.

## Configuration

`vars` (see [`wrangler.jsonc`](./wrangler.jsonc)): `ALLOWED_DOMAINS`, `REPO`,
`MEDIA_ENDPOINT`, `MEDIA_BUCKET`, optional `ALLOWED_LOGINS` and `CREDENTIAL_TTL_DAYS`.
`ALLOWED_DOMAINS` gates the OAuth popup _and_ the CORS allowlist for `/media-credentials`,
so one list decides which sites this Worker serves.

Secrets:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SERVER_SECRET   # same value as the media-upload Worker
```

## Deploying

```bash
npx wrangler deploy --domain auth.<site-host>
```

## Tests

```bash
npm test
```

Runs in Node with GitHub stubbed — no deploy, no network. The check that matters most is
the round trip: the secret this Worker mints is the secret the upload Worker re-derives.
