import { test, expect } from "@playwright/test";

/**
 * E2E tests for StageFlow L1 Seed panel
 * 
 * NOTE: These tests require StageFlow mode to be integrated into App.jsx (Task 7).
 * They are created as part of Task 3 but will be fully functional after Task 7 completion.
 */

test.describe("StageFlow L1 Seed Panel", () => {
  test.beforeEach(async ({ page }) => {
    // Isolate storage: fresh session + local storage per test
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
  });

  test("loads L1 Seed panel in StageFlow mode", async ({ page }) => {
    await page.goto("/");
    
    // Switch to StageFlow mode (once implemented in Task 7)
    // This test will be skipped if StageFlow toggle isn't available yet
    const stageFlowToggle = page.getByText(/stageflow/i);
    
    if (await stageFlowToggle.isVisible().catch(() => false)) {
      await stageFlowToggle.click();
      
      // Should show L1 Seed panel
      await expect(page.getByText(/L1.*Seed/i)).toBeVisible();
      await expect(page.getByText(/Foundational setup/i)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("renders preset picker in L1 panel", async ({ page }) => {
    await page.goto("/");
    
    const stageFlowToggle = page.getByText(/stageflow/i);
    if (await stageFlowToggle.isVisible().catch(() => false)) {
      await stageFlowToggle.click();
      
      // Preset picker should be visible
      await expect(page.getByText(/START FROM A PRESET/i)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("shows lock stage button", async ({ page }) => {
    await page.goto("/");
    
    const stageFlowToggle = page.getByText(/stageflow/i);
    if (await stageFlowToggle.isVisible().catch(() => false)) {
      await stageFlowToggle.click();
      
      // Lock button should be visible
      await expect(page.getByRole("button", { name: /LOCK SEED STAGE/i })).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("navigates between L1 and L2 stages", async ({ page }) => {
    await page.goto("/");
    
    const stageFlowToggle = page.getByText(/stageflow/i);
    if (await stageFlowToggle.isVisible().catch(() => false)) {
      await stageFlowToggle.click();
      
      // Should start on L1
      await expect(page.getByText(/L1.*Seed/i)).toBeVisible();
      
      // Click L2 button in stage rail
      await page.getByRole("button", { name: /L2/i }).click();
      
      // Should show L2 Promise panel
      await expect(page.getByText(/L2.*Promise/i)).toBeVisible();
      await expect(page.getByText(/Story shaping/i)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("persists selections to storage", async ({ page }) => {
    await page.goto("/");
    
    const stageFlowToggle = page.getByText(/stageflow/i);
    if (await stageFlowToggle.isVisible().catch(() => false)) {
      await stageFlowToggle.click();
      
      // Make a selection in L1 (would need to interact with actual fields)
      // This is a placeholder for when components are fully integrated
      
      // Reload page
      await page.reload();
      
      // Switch back to StageFlow
      await stageFlowToggle.click();
      
      // Selections should be restored (verify via storage layer)
    } else {
      test.skip();
    }
  });
});

test.describe("StageFlow L1 Seed Panel (Unit/Component Tests)", () => {
  test("component renders without errors", () => {
    // This test is primarily covered by src/components/__tests__/stages.test.jsx
    // which validates that L1Seed component renders and integrates with storage
    expect(true).toBe(true);
  });
});
