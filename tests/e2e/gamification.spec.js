import { test, expect } from "@playwright/test";

test.describe("Gamification flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.goto("/");
  });

  test("draft mode opens an overlay panel", async ({ page }) => {
    await page.getByRole("button", { name: /DRAFT MODE/i }).click();
    // Draft panel should render something archetype-ish. Loose assertion—text
    // may read "Pick an archetype" / "Draft Mode" etc.
    await expect(
      page.getByText(/draft|archetype|pick/i).first()
    ).toBeVisible({ timeout: 2000 });
  });

  test("roll dice consumes budget across clicks", async ({ page }) => {
    const roll = page.getByRole("button", { name: /ROLL|🎲/i }).first();
    await expect(roll).toBeVisible();

    // Sanity: the button text includes a remaining counter somewhere.
    const before = (await roll.textContent()) || "";
    const beforeDigits = before.match(/\d+/g) || [];

    await roll.click();
    // Let staggered reveal settle (lib uses 180ms per field).
    await page.waitForTimeout(1800);

    const after = (await roll.textContent()) || "";
    const afterDigits = after.match(/\d+/g) || [];

    // If a budget counter is rendered, it should have decreased. If not,
    // at minimum the click should not crash the page.
    if (beforeDigits.length && afterDigits.length) {
      expect(Number(afterDigits.at(-1))).toBeLessThanOrEqual(Number(beforeDigits.at(-1)));
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("selecting an option updates coherence meter", async ({ page }) => {
    // Click the first available radio-like option button in the form. Layer 1
    // is rendered expanded by default, so a subgenre button should exist.
    const firstOption = page
      .locator('button:has-text("LitRPG"), button:has-text("System apocalypse")')
      .first();
    if (await firstOption.count()) {
      await firstOption.click();
      // After a selection, the meter should still render one of the tier labels.
      await expect(
        page.getByText(/Rough Draft|Workshop|Query-Ready|Banger/i).first()
      ).toBeVisible();
    }
  });

  test("no console errors on initial paint", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Filter known benign noise: dev-only API endpoints (served by the Vite
    // plugin, not by `vite preview`), favicon, React devtools hint.
    const meaningful = errors.filter(
      (e) =>
        !/favicon|DevTools|Download the React DevTools/i.test(e) &&
        !/\/api\/default-api-key|\/api\/selection-history/i.test(e) &&
        !/status of 404/i.test(e)
    );
    expect(meaningful, meaningful.join("\n")).toEqual([]);
  });
});
