<div align="center">
  <a href="https://oktech.jp">
    <img src="./src/assets/OKTech-logo-auto.svg" alt="OKTech.jp logo" height="120" />
  </a>

<h1>
  <a href="https://oktech.jp">OKTech.jp Website</a>
</h1>
  <p>OKTech Technology Meetup Group in Osaka, Kyoto, Kansai (formerly OWDDM and KWDDM).</p>
</div>

---

## Overview

This project is a Static Site Generator website, built with Astro 5, TypeScript, React, Tailwind, and Daisy UI.

It is hosted on GitHub Pages, available at [oktech.jp](https://oktech.jp).

## Development Environment

The recommended way to develop is to launch the provided [Dev Container](.devcontainer/devcontainer.json) (see [containers.dev](https://containers.dev/)) which provides a Node 22 environment.

Install dependencies and run common tasks with the following commands (see [package.json](./package.json) for all scripts):

```bash
npm install # or npm ci
npm run dev # starts the development server
npm run build # builds the SSG website
npm run preview # previews the SSG website
npm run checks # checks types, lints, and prunes code
npm run test # runs the tests (playwright)
```

See [./AGENTS.md](./AGENTS.md) for automation tips, code-style expectations, and task-specific checklists.

## Content Manager (Sveltia CMS)

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is available at `/admin` for editing events, venues, articles, and the code of conduct.

- **Locally**, run `npm run dev` and open [/admin](http://localhost:4321/admin), then click _Work with Local Repository_ to edit `content/` directly. This uses the File System Access API, so a Chromium-based browser is required.
- **On staging** ([oktech.doo.boo/admin](https://oktech.doo.boo/admin)), sign in with GitHub to commit changes. Deploy with `STAGING_HOST=<host> npm run deploy:staging`.

The configuration is TypeScript in [src/cms/](./src/cms/), not a `config.yml`. See [docs/sveltia.md](./docs/sveltia.md) for the collections, environment variables, image handling, and what deliberately stays out of the CMS.

## Content

Primary content lives in `content/` and is edited in this repository, either through the CMS or by hand.

- [./content/events](./content/events) — one folder per event, with its cover and gallery images.
- [./content/venues](./content/venues) and [./content/articles](./content/articles) — added the same way.

## Workflows

Pushes and pull requests build the site and deploy it with [cloudflare-staging.yml](.github/workflows/cloudflare-staging.yml); pushes to `main` build, test and publish to GitHub Pages with [astro.yml](.github/workflows/astro.yml).

Because an event moves from upcoming to past purely with the passage of time, [rebuild-when-event-ends.yml](.github/workflows/rebuild-when-event-ends.yml) runs daily, computes the next event end with `tsx scripts/next-event-end.ts`, and triggers a rebuild once it has passed.

## Tests

- Playwright-based tests live under `test/`.
- `npm run test:dev` runs against the dev server; `npm run test:build` builds first and then tests; `npm run test:dist` test an existing build and is used in CI.
- Install browsers with `npx playwright install --with-deps` if they are missing and keep fixtures in sync with layout changes.

## Contributing

- Review the Style Guide in `./AGENTS.md` before starting work.
- Fork the repository, create a feature branch, and open a pull request with passing `npm run checks` and relevant tests.

## Artificial Intelligence (AI) and Large Language Model (LLM) Disclosure

This project was created with the assistance of AI development tools including Cursor IDE, Claude Code, Codex CLI, and others, utilizing various models throughout the development of this project since its start in April 2025. Thank you to all who made it possible.
