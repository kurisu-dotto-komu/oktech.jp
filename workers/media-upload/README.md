# Media upload Worker

A Cloudflare Worker that speaks just enough of the S3 API for Sveltia CMS — `ListObjectsV2`,
`PutObject` and `HeadObject` — backed by an R2 binding, and gated on a **maintainer
whitelist** instead of a shared bucket credential.

Without it, every editor holds an R2 API token in `localStorage` and can write anywhere in
the bucket. With it, the bucket token never leaves Cloudflare: each maintainer gets a
generated key pair that only this Worker knows about, and revoking someone is a one-line
edit to a Worker secret.

## How it works

Sveltia's `aws_s3` media library signs every request with AWS Signature V4 and lets you
point it at a custom `endpoint`. Set that endpoint to this Worker and it receives:

| Operation | Request                                                             |
| --------- | ------------------------------------------------------------------- |
| List      | `GET <endpoint>/<bucket>?list-type=2&max-keys=1000&prefix=…`        |
| Upload    | `PUT <endpoint>/<bucket>/<key>` with `Content-Type` and `x-amz-acl` |

Both carry `authorization`, `x-amz-date` and `x-amz-content-sha256`. The Worker recomputes
the signature over the canonical request for every whitelisted secret; if none matches it
answers `403` and nothing is written. `x-amz-acl` is accepted and ignored — R2 has no ACLs,
public reads come from the bucket's custom domain.

After the signature checks out, the request must also pass:

- **key prefix** — the key starts with one of `ALLOWED_PREFIXES`, narrowed further by the
  maintainer's own `prefixes` when they have one
- **content type** — in `ALLOWED_CONTENT_TYPES`, with a file extension that agrees with it
- **size** — at most `MAX_UPLOAD_BYTES`
- **no clobbering** — an existing key is refused with `409` unless the maintainer row sets
  `"overwrite": true`
- **clock skew** — `x-amz-date` within `MAX_CLOCK_SKEW_SECONDS` of now
- **CORS** — browser requests only from `ALLOWED_ORIGINS`

## Minting a key pair

One pair per maintainer:

```bash
npm run keygen
```

`secretAccessKey` is 30 random bytes in base64, which is exactly 40 characters — the shape
Sveltia's `apiKeyPattern` for `aws_s3` requires (a key of any other length is silently
discarded by the CMS settings dialog).

`accessKeyId` is public: it lives in the CMS config, which the browser downloads. Because
Sveltia takes the access key id from the site config and only the **secret** from each
editor's settings, all maintainers normally share one `accessKeyId` and differ by secret —
the Worker tries every whitelist row that carries that id. Per-maintainer ids also work if
someone runs their own copy of `/admin`.

## Configuration

`wrangler.jsonc` holds the R2 binding (`MEDIA`, whose `bucket_name` you must fill in) and
the `vars` above. One secret:

```bash
npx wrangler secret put MAINTAINERS
```

```json
[
  {
    "name": "Alex",
    "accessKeyId": "<shared access key id>",
    "secretAccessKey": "<Alex's 40-character secret>",
    "prefixes": ["events/", "venues/"],
    "overwrite": false
  }
]
```

`prefixes` and `overwrite` are optional. Deleting a row revokes that person on the next
deploy of the secret; nothing else has to change.

## Deploying

```bash
npx wrangler deploy --domain uploads.<site-host>
```

Then point the CMS at it with `PUBLIC_MEDIA_UPLOAD_ENDPOINT=https://uploads.<site-host>`
and add that origin to `ALLOWED_ORIGINS`.

## Tests

```bash
npm test
```

Runs entirely in Node with a fake R2 binding — no deploy, no network. `test/sign.ts` is an
independent transcription of Sveltia's signer; `test/sveltia-parity.test.ts` additionally
lifts the real signer out of the installed `@sveltia/cms` source map and checks the Worker
accepts what it produces.
