import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

import { CMS_FIXTURES, type CmsFixture } from "../fixtures/cms/fixtures";

/**
 * Round-trip check for the Sveltia CMS collections: `scripts/cms-fixture.ts run` builds
 * the site with the fixture entries present, runs this spec in the `present` phase,
 * deletes them, rebuilds and runs it again in the `absent` phase.
 */
const phase = process.env.CMS_FIXTURE_PHASE;

// Without the driver the fixtures are not in the working tree, so a plain `playwright test`
// run (npm test / npm run test:build) skips this file instead of failing on missing pages.
if (!phase) {
  test.skip("CMS fixture round-trip only runs via `npm run test:cms-crud`", () => {});
}

const repoPath = (relativePath: string) => path.join(process.cwd(), relativePath);
const contentExists = (fixture: CmsFixture) =>
  fs.existsSync(repoPath(path.join("content", fixture.contentPath)));
const distExists = (fixture: CmsFixture) => fs.existsSync(repoPath(fixture.distPath));

const listedFixtures = CMS_FIXTURES.filter((fixture) => fixture.listingPath);

if (phase === "present") {
  test.describe("CMS fixtures are published", () => {
    for (const fixture of CMS_FIXTURES) {
      test(`${fixture.label} page renders at ${fixture.pagePath}`, async ({ page }) => {
        expect(contentExists(fixture), `${fixture.contentPath} should have been written`).toBe(
          true,
        );
        expect(distExists(fixture), `${fixture.distPath} should have been built`).toBe(true);

        const response = await page.goto(fixture.pagePath);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator(`text="${fixture.title}"`).first()).toBeAttached();
        expect(await page.title()).toContain("OKTech");
      });
    }

    for (const fixture of listedFixtures) {
      test(`${fixture.label} is listed on ${fixture.listingPath}`, async ({ page }) => {
        const response = await page.goto(fixture.listingPath!);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator(`text="${fixture.title}"`).first()).toBeAttached();
      });
    }
  });
}

if (phase === "absent") {
  test.describe("CMS fixtures are removed", () => {
    for (const fixture of CMS_FIXTURES) {
      test(`${fixture.label} page is gone from ${fixture.pagePath}`, async ({ page }) => {
        expect(contentExists(fixture), `${fixture.contentPath} should have been deleted`).toBe(
          false,
        );
        expect(distExists(fixture), `${fixture.distPath} should no longer be built`).toBe(false);

        const response = await page.goto(fixture.pagePath);
        expect(response?.status()).toBeGreaterThanOrEqual(400);
      });
    }

    for (const fixture of listedFixtures) {
      test(`${fixture.label} is delisted from ${fixture.listingPath}`, async ({ page }) => {
        await page.goto(fixture.listingPath!);
        await expect(page.locator(`text="${fixture.title}"`)).toHaveCount(0);
      });
    }
  });
}
