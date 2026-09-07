# Cloudflare Setup

The site, the CMS auth proxy and media storage can all run on Cloudflare. This describes how to recreate that setup on any Cloudflare account and zone; placeholders in `<angle brackets>` are yours to fill in. Nothing here contains secrets.

| Piece                | Cloudflare product         | Example hostname                         |
| -------------------- | -------------------------- | ---------------------------------------- |
| Site (static assets) | Workers                    | `<site-host>` e.g. `staging.example.com` |
| Sveltia GitHub OAuth | Workers (sveltia-cms-auth) | `auth.<site-host>`                       |
| Source images        | R2 bucket                  | `images.<site-host>`                     |
| CMS image uploads    | Workers (media-upload)     | `uploads.<site-host>`                    |
| PR previews          | Workers (one per PR)       | `pr-<n>-preview.<site-host>`             |

Hostnames must belong to a zone on the same Cloudflare account. The site hostname is configured in exactly one place: the `STAGING_HOST` environment variable (a GitHub Actions **repository variable** in CI, a shell variable locally). The auth Worker's route and the R2 custom domain are set when those are deployed.

## 1. API token

Dashboard → profile icon → **My Profile → API Tokens → Create Token → Custom token**:

| Scope   | Permission         | Level |
| ------- | ------------------ | ----- |
| Account | Workers Scripts    | Edit  |
| Account | Workers R2 Storage | Edit  |
| Account | Account Settings   | Read  |
| Zone    | Zone               | Read  |
| Zone    | DNS                | Edit  |
| Zone    | Workers Routes     | Edit  |

Account Resources: the account. Zone Resources: the zone the hostnames live on. Permission changes can take a minute or two to propagate.

You also need the **Account ID** (Compute (Workers) → Overview → right sidebar).

Wrangler reads both from the environment:

```bash
export CLOUDFLARE_API_TOKEN=<token>
export CLOUDFLARE_ACCOUNT_ID=<account-id>
```

Keep them outside the repo (e.g. `~/.cloudflare.env`, `chmod 600`). Never commit them.

## 2. Site Worker

[`wrangler.jsonc`](../wrangler.jsonc) deploys `dist/` as Workers static assets; set `name` for your Worker. The custom domain is passed at deploy time and its DNS record is created automatically on first deploy.

```bash
STAGING_HOST=<site-host> npm run deploy:staging
```

This runs [`scripts/deploy-staging.ts`](../scripts/deploy-staging.ts): `astro build` with `SITE_URL=https://<site-host>` (so canonical/OG URLs point at this deployment rather than production) followed by `wrangler deploy --domain <site-host>`.

If the site redirects to `*.cloudflareaccess.com`, a Zero Trust Access application covers the hostname — remove it under **Zero Trust → Access controls → Applications**.

## 3. CI: deploys and PR previews

[`cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml):

- push to the staging branch → `wrangler deploy --domain <site-host>` (updates the site)
- pull request opened/updated → a dedicated Worker `oktech-pr-<n>` deployed to `pr-<n>-preview.<site-host>`; the URL is posted as a sticky PR comment and as a **commit status** named `Cloudflare Preview`, which Sveltia CMS turns into a **View Preview** button in the editor
- pull request closed → the `cleanup` job deletes that Worker and its hostname via the Workers API

Hostnames and certificates: no wildcard DNS is needed. Each Workers custom domain creates its own proxied DNS record and provisions its own certificate (about a minute). Keep preview hostnames **one label below the site host** (`pr-<n>-preview.<site-host>`): Universal SSL only covers the zone's first level, and deeper names such as `pr-<n>.preview.<site-host>` were not issued certificates in testing (TLS handshake failures). A pre-existing wildcard record on the zone (e.g. `*.example.com`) does not interfere, because the per-hostname records are more specific.

Under Settings → Secrets and variables → Actions add the **secrets** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `STADIA_MAPS_API_KEY`, and the **variable** `STAGING_HOST` (e.g. `staging.example.com`). Previews need `workers_dev` and `preview_urls` enabled in `wrangler.jsonc` (they are).

`STADIA_MAPS_API_KEY` is a **build** secret, not a runtime one: the build fetches map tiles for venues that have no committed map image, stitches them with `sharp` and emits ordinary optimised assets, so the key never reaches the published site. A free key from <https://client.stadiamaps.com/signup/> is enough. Without it the build still succeeds — those venues just render without a map, with a warning. It is set in both [`astro.yml`](../.github/workflows/astro.yml) and [`cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml).

### Rebuilding when an event ends

An event moves from "upcoming" to "past" purely by the passage of time, so a static build goes stale on its own. [`rebuild-when-event-ends.yml`](../.github/workflows/rebuild-when-event-ends.yml) runs daily, checks out the repository, computes the next event's end time from `content/` with `tsx scripts/next-event-end.ts` (the same helper the site's pages use) and dispatches the deploy workflow once it has passed. It makes no network call to the site and needs no secret beyond the default `GITHUB_TOKEN`. GitHub disables `schedule:` triggers after 60 days of repository inactivity; `workflow_dispatch` is the manual escape hatch, and any merge rebuilds anyway.

## 4. Sveltia auth Worker (GitHub OAuth)

Sveltia's "Sign in with GitHub" needs an OAuth proxy. Run [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) as a separate Worker.

1. Create a GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: `https://<site-host>`
   - Authorization callback URL: `https://auth.<site-host>/callback`
   - Generate a client secret.
2. Deploy the Worker:

   ```bash
   git clone --depth 1 https://github.com/sveltia/sveltia-cms-auth /tmp/sveltia-cms-auth
   cd /tmp/sveltia-cms-auth && rm wrangler.toml
   cat > wrangler.jsonc <<'EOF'
   {
     "name": "<auth-worker-name>",
     "main": "src/index.js",
     "compatibility_date": "2026-09-01",
     "routes": [{ "pattern": "auth.<site-host>", "custom_domain": true }],
     "workers_dev": false,
     "vars": { "ALLOWED_DOMAINS": "<site-host>, *.<site-host>, *.<subdomain>.workers.dev" }
   }
   EOF
   npx wrangler deploy
   printf '%s' "$CLIENT_ID" | npx wrangler secret put GITHUB_CLIENT_ID
   printf '%s' "$CLIENT_SECRET" | npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

   `ALLOWED_DOMAINS` must list every origin the CMS is served from: the site, the per-PR previews (`*.<site-host>`) and `workers.dev` if used; find `<subdomain>` with `npx wrangler whoami` or under Compute (Workers) → Overview.

3. Point the CMS at it with `PUBLIC_CMS_AUTH_BASE_URL=https://auth.<site-host>` (see [sveltia.md](./sveltia.md)).

## 5. R2 bucket for images

New images are stored in R2 and referenced by URL; Astro fetches and optimises them at build time. Existing images in `content/` stay in the repo until migrated.

1. Dashboard → **R2 Object Storage** → Create bucket `<bucket>` (R2 needs a payment method on file; the free tier covers 10 GB and egress is free).
2. Custom domain + CORS via the API (`<zone-id>` is on the zone's Overview page):

   ```bash
   A="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/<bucket>"
   H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
   curl -X POST "$A/domains/custom" -H "$H" -H 'Content-Type: application/json' \
     -d '{"domain":"images.<site-host>","zoneId":"<zone-id>","enabled":true,"minTLS":"1.2"}'
   curl -X PUT "$A/cors" -H "$H" -H 'Content-Type: application/json' \
     -d '{"rules":[{"allowed":{"origins":["https://<site-host>","http://localhost:4321"],"methods":["GET","PUT","HEAD"],"headers":["*"]},"maxAgeSeconds":3600}]}'
   ```

   The CORS rule is only needed while the CMS uploads **directly** to R2. Once uploads go through the upload Worker (section 6) the browser never talks to the bucket, and `GET`/`HEAD` are all that remain.

3. Test: `npx wrangler r2 object put <bucket>/test/x.webp --file some.webp --content-type image/webp --remote`, then open `https://images.<site-host>/test/x.webp`.

## 6. Upload Worker (optional, recommended)

[`workers/media-upload`](../workers/media-upload) is a Worker that accepts the CMS's S3-compatible upload requests, verifies each signature against a maintainer whitelist, and writes to the bucket through an R2 binding — so no bucket credential exists in any browser. The full rationale, key generation and editor instructions are in **[docs/media-upload.md](./media-upload.md)**; the deploy is:

```bash
cd workers/media-upload
npm run keygen                      # one key pair per maintainer
# set bucket_name and the real /admin origins in ALLOWED_ORIGINS in wrangler.jsonc
npx wrangler deploy --domain uploads.<site-host>
npx wrangler secret put MAINTAINERS # JSON array of the whitelist
```

Then set the repository **variable** `MEDIA_UPLOAD_ENDPOINT` to `https://uploads.<site-host>` (origin only, no trailing slash and no bucket segment — the CMS appends the bucket itself); `cloudflare-staging.yml` passes it through as `PUBLIC_MEDIA_UPLOAD_ENDPOINT`. Leaving it unset keeps the direct-to-R2 path.

## Useful commands

```bash
npx wrangler whoami                      # token + account check
npx wrangler deployments list            # site worker history
npx wrangler deployments list --name oktech-pr-<n>   # a PR preview worker
npx wrangler r2 bucket list
npx wrangler tail <auth-worker-name>     # live logs from the auth worker
```
