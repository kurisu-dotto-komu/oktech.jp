# Media upload Worker

A Cloudflare Worker that speaks just enough of the S3 API for Sveltia CMS — `ListObjectsV2`,
`PutObject` and `HeadObject` — backed by an R2 binding, and gated on a **credential derived
from the editor's GitHub account** rather than on a key anybody hands out.

Without it, every editor holds an R2 API token in `localStorage` and can write anywhere in
the bucket. With it, the bucket token never leaves Cloudflare, nobody is ever sent a secret,
and a credential stops working on its own after 30 days.

## How it works

Sveltia's `aws_s3` media library signs every request with AWS Signature V4 and lets you
point it at a custom `endpoint`. Set that endpoint to this Worker and it receives:

| Operation | Request                                                             |
| --------- | ------------------------------------------------------------------- |
| List      | `GET <endpoint>/<bucket>?list-type=2&max-keys=1000&prefix=…`        |
| Upload    | `PUT <endpoint>/<bucket>/<key>` with `Content-Type` and `x-amz-acl` |

Both carry `authorization`, `x-amz-date` and `x-amz-content-sha256`. The access key id in
the `Credential=` field is `<github-login>.<YYYYMMDD>`, so the Worker can read the login and
the expiry straight off the request, recompute
`base64(first 30 bytes of HMAC-SHA256(SERVER_SECRET, accessKeyId))` — 40 characters and check the signature against it.
A signature that verifies **is** the proof that the [cms-auth](../cms-auth/README.md) Worker
minted this credential for that login: there is no list of editors and nothing to keep in
sync. `x-amz-acl` is accepted and ignored — R2 has no ACLs, public reads come from the
bucket's custom domain.

After the signature checks out, the request must also pass:

- **not revoked** — the login is not in `DENYLIST`, and, when the optional GitHub App
  secrets are set, still has write access (see below)
- **not expired** — the date in the access key id is in the future
- **key prefix** — the key starts with one of `ALLOWED_PREFIXES`
- **content type** — in `ALLOWED_CONTENT_TYPES`, with a file extension that agrees with it
- **size** — at most `MAX_UPLOAD_BYTES`
- **no clobbering** — an existing key is refused with `409` unless the login is in
  `OVERWRITE_LOGINS`
- **clock skew** — `x-amz-date` within `MAX_CLOCK_SKEW_SECONDS` of now
- **CORS** — browser requests only from `ALLOWED_ORIGINS`, where `*` is a wildcard

## Revoking and rotating

| Situation                    | Do this                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| Someone leaves the project   | remove their repository write access — no new credential can be minted |
| …and it has to stop **now**  | add their login to `DENYLIST` and redeploy                             |
| A secret is suspected leaked | change `SERVER_SECRET` on **both** Workers; everyone re-signs in       |

### Optional live re-check

Set `REPO` plus the `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` secrets and the Worker also
asks GitHub, at most once per login per five minutes, whether that account still has write
access — closing the window between losing repository access and the credential expiring.
The private key must be PKCS#8 (`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem`);
WebCrypto cannot import the PKCS#1 form GitHub hands out.

The check **fails open**: an unreachable GitHub means "cannot tell", not "denied", so an
outage does not lock every editor out of a credential the signature already proved genuine.
Only a definitive "no write access" rejects. `DENYLIST` is the check that never fails open.
Leave the secrets unset and this is skipped entirely.

## Configuration

`wrangler.jsonc` holds the R2 binding (`MEDIA`, whose `bucket_name` you must fill in) and
the `vars` above, all with generic placeholders. Keep your own account's values out of the
repository by copying it to `wrangler.local.jsonc` (gitignored) and deploying with `-c`.

One required secret:

```bash
npx wrangler secret put SERVER_SECRET   # the same value the cms-auth Worker holds
```

## Deploying

```bash
npx wrangler deploy -c wrangler.local.jsonc --domain uploads.<site-host>
```

Then point the CMS at it with `PUBLIC_MEDIA_UPLOAD_ENDPOINT=https://uploads.<site-host>`.

## Tests

```bash
npm test
```

Runs entirely in Node with a fake R2 binding — no deploy, no network. `test/sign.ts` is an
independent transcription of Sveltia's signer; `test/sveltia-parity.test.ts` additionally
lifts the real signer out of the installed `@sveltia/cms` source map and checks the Worker
accepts what it produces.
