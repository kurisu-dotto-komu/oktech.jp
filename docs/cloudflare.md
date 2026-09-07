# Cloudflare Setup

The site, the CMS auth proxy and media storage can all run on Cloudflare. This describes how to recreate that setup on any Cloudflare account and zone; placeholders in `<angle brackets>` are yours to fill in. Nothing here contains secrets.

| Piece                | Cloudflare product         | Example hostname                               |
| -------------------- | -------------------------- | ---------------------------------------------- |
| Site (static assets) | Workers                    | `<site-host>` e.g. `staging.example.com`       |
| Sveltia GitHub OAuth | Workers (sveltia-cms-auth) | `auth.<site-host>`                             |
| Source images        | R2 bucket                  | `images.<site-host>`                           |
| PR previews          | Workers versions           | `<hash>-<worker-name>.<subdomain>.workers.dev` |

Hostnames must belong to a zone on the same Cloudflare account. They are set in `routes[].pattern` in [`wrangler.jsonc`](../wrangler.jsonc), the auth Worker's route, the R2 custom domain and `SITE_URL` in [`.github/workflows/cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml).

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

[`wrangler.jsonc`](../wrangler.jsonc) deploys `dist/` as Workers static assets with a custom domain. Set `name` and `routes[].pattern` for your Worker and hostname. The custom domain and its DNS record are created automatically on first deploy.

```bash
SITE_URL=https://<site-host> npx astro build && npx wrangler deploy
```

`npm run deploy:staging` does the same with the hostname configured in `package.json`. `SITE_URL` must match the hostname so canonical/OG URLs point at this deployment rather than production.

If the site redirects to `*.cloudflareaccess.com`, a Zero Trust Access application covers the hostname — remove it under **Zero Trust → Access controls → Applications**.

## 3. CI: deploys and PR previews

[`cloudflare-staging.yml`](../.github/workflows/cloudflare-staging.yml):

- push to the staging branch → `wrangler deploy` (updates `<site-host>`)
- pull request → `wrangler versions upload` → sticky PR comment with a preview URL

Add the token and account ID as repository **Actions secrets** named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions). Previews need `workers_dev` and `preview_urls` enabled in `wrangler.jsonc` (they are).

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
     "vars": { "ALLOWED_DOMAINS": "<site-host>, *.<subdomain>.workers.dev" }
   }
   EOF
   npx wrangler deploy
   printf '%s' "$CLIENT_ID" | npx wrangler secret put GITHUB_CLIENT_ID
   printf '%s' "$CLIENT_SECRET" | npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

   `ALLOWED_DOMAINS` must list every origin the CMS is served from (site + preview URLs); find `<subdomain>` with `npx wrangler whoami` or under Compute (Workers) → Overview.

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
     -d '{"rules":[{"allowed":{"origins":["https://<site-host>","http://localhost:4321"],"methods":["GET","HEAD"],"headers":["*"]},"maxAgeSeconds":3600}]}'
   ```

3. Test: `npx wrangler r2 object put <bucket>/test/x.webp --file some.webp --content-type image/webp --remote`, then open `https://images.<site-host>/test/x.webp`.

## Useful commands

```bash
npx wrangler whoami                      # token + account check
npx wrangler deployments list            # site worker history
npx wrangler versions list               # preview versions
npx wrangler r2 bucket list
npx wrangler tail <auth-worker-name>     # live logs from the auth worker
```
