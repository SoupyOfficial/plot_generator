import { test, expect } from "@playwright/test";

test.describe("Story Seed Generator — smoke", () => {
  test.beforeEach(async ({ page }) => {
    // Isolate storage: fresh session + local storage per test.
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
  });

  test("loads the app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LitRPG Story Seed Generator/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/STORY SEED GENERATOR/i);
    // Generate button exists and is disabled until selections are made.
    const generate = page.getByRole("button", { name: /GENERATE SEED/i });
    await expect(generate).toBeVisible();
    await expect(generate).toBeDisabled();
  });

  test("header shows coherence meter + XP", async ({ page }) => {
    await page.goto("/");
    // Coherence meter label text is one of the tier names.
    await expect(
      page.getByText(/Rough Draft|Workshop|Query-Ready|Banger/i).first()
    ).toBeVisible();
    // XP bar labels "LVL <n>".
    await expect(page.getByText(/LVL\s*\d+/i).first()).toBeVisible();
  });

  test("action row surfaces gamification controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /GENERATE SEED/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /FILL THE REST/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ROLL|🎲/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /DRAFT MODE/i })).toBeVisible();
  });
});
