import { expect, test } from "@playwright/test";

test.describe("Navigation Flow", () => {
  test("navigate through events and filter", async ({ page }) => {
    await page.goto("/");

    const eventsLink = page.locator('nav a[href="/events"]').first();
    await eventsLink.click();
    await page.waitForURL("/events");

    const searchInput = page.getByTestId("events-search-input");
    await searchInput.fill("agentic");
    await page.waitForTimeout(500);

    const agenticEvent = page.locator('text="Agentic Sentiments"').first();
    await expect(agenticEvent).toBeVisible();
    await agenticEvent.click();

    await page.waitForURL(/\/events\/308580120-agentic-sentiments/);
    await expect(page.locator('text="Agentic Sentiments"').first()).toBeVisible();

    // Verify venue section is displayed on event page
    await expect(page.locator('h3:has-text("About the Venue")')).toBeVisible();
  });
});
