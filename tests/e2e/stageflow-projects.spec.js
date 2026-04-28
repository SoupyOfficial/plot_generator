// tests/e2e/stageflow-projects.spec.js
//
// E2E tests for StageFlow project CRUD operations
//
// Tests:
// - Create new project
// - Rename existing project
// - Delete project
// - Switch between projects
// - Auto-select first project on load
// - Persist current project to localStorage

import { test, expect } from "@playwright/test";

test.describe("StageFlow — Project CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Clear storage for clean test state
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch { /* noop */ }
    });
    
    // Switch to StageFlow mode
    await page.getByRole("button", { name: /STAGEFLOW/i }).click();
    
    // Wait for StageFlow to load
    await expect(page.getByText(/L1.*Seed/i).first()).toBeVisible();
  });

  test("creates a new project", async ({ page }) => {
    // Click the NEW PROJECT button (should be visible in project bar)
    const newProjectBtn = page.getByRole("button", { name: /NEW PROJECT/i });
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // Modal should appear with name input
    const modal = page.locator('[role="dialog"]').or(page.getByText(/Create New Project/i).locator('..'));
    await expect(modal).toBeVisible();

    // Enter project name
    const nameInput = page.getByPlaceholder(/project name/i);
    await nameInput.fill("Test Project Alpha");

    // Click CREATE button in modal
    const createBtn = page.getByRole("button", { name: /CREATE/i });
    await createBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 2000 });

    // Dropdown should show the new project
    const dropdown = page.getByRole("combobox").or(page.locator("select"));
    await expect(dropdown).toHaveValue(/.+/); // Should have a value (project ID)
  });

  test("renames an existing project", async ({ page }) => {
    // Create a project first
    await page.getByRole("button", { name: /NEW PROJECT/i }).click();
    await page.getByPlaceholder(/project name/i).fill("Original Name");
    await page.getByRole("button", { name: /CREATE/i }).click();
    await page.waitForTimeout(500);

    // Click RENAME button
    const renameBtn = page.getByRole("button", { name: /RENAME/i });
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    // Modal with name input should appear
    const nameInput = page.getByPlaceholder(/project name/i);
    await expect(nameInput).toHaveValue("Original Name");
    
    // Change the name
    await nameInput.fill("Renamed Project");
    
    // Click RENAME in modal
    await page.getByRole("button", { name: /RENAME/i }).click();
    
    // Dropdown should show updated name
    const dropdown = page.getByRole("combobox").or(page.locator("select"));
    await expect(dropdown).toContainText("Renamed Project");
  });

  test("deletes a project with confirmation", async ({ page }) => {
    // Create a project first
    await page.getByRole("button", { name: /NEW PROJECT/i }).click();
    await page.getByPlaceholder(/project name/i).fill("Temporary Project");
    await page.getByRole("button", { name: /CREATE/i }).click();
    await page.waitForTimeout(500);

    // Click DELETE button
    const deleteBtn = page.getByRole("button", { name: /DELETE/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirmation dialog should appear
    const confirmDialog = page.locator('[role="dialog"]').or(page.getByText(/Are you sure/i).locator('..'));
    await expect(confirmDialog).toBeVisible();

    // Click CONFIRM DELETE button
    const confirmBtn = page.getByRole("button", { name: /CONFIRM|DELETE/i }).last();
    await confirmBtn.click();

    // Dialog should close
    await expect(confirmDialog).not.toBeVisible({ timeout: 2000 });

    // Dropdown should be empty or show placeholder
    const dropdown = page.getByRole("combobox").or(page.locator("select"));
    const dropdownText = await dropdown.textContent();
    expect(dropdownText).toMatch(/no projects|choose|select/i);
  });

  test("switches between multiple projects", async ({ page }) => {
    // Create first project
    await page.getByRole("button", { name: /NEW PROJECT/i }).click();
    await page.getByPlaceholder(/project name/i).fill("Project A");
    await page.getByRole("button", { name: /CREATE/i }).click();
    await page.waitForTimeout(500);

    // Create second project
    await page.getByRole("button", { name: /NEW PROJECT/i }).click();
    await page.getByPlaceholder(/project name/i).fill("Project B");
    await page.getByRole("button", { name: /CREATE/i }).click();
    await page.waitForTimeout(500);

    // Dropdown should show Project B (most recently created)
    const dropdown = page.getByRole("combobox").or(page.locator("select"));
    await expect(dropdown).toContainText("Project B");

    // Switch to Project A by changing dropdown
    await dropdown.selectOption({ label: /Project A/i });

    // Verify dropdown now shows Project A
    await expect(dropdown).toContainText("Project A");
  });

  test("persists current project to localStorage", async ({ page }) => {
    // Create a project
    await page.getByRole("button", { name: /NEW PROJECT/i }).click();
    await page.getByPlaceholder(/project name/i).fill("Persistent Project");
    await page.getByRole("button", { name: /CREATE/i }).click();
    await page.waitForTimeout(500);

    // Get the current project ID from localStorage
    const projectId = await page.evaluate(() => {
      return localStorage.getItem("stageflow:current-project");
    });

    expect(projectId).toBeTruthy();
    expect(projectId).toHaveLength(36); // UUID format

    // Reload the page
    await page.reload();

    // Switch back to StageFlow mode (viewMode might reset to wizard)
    await page.getByRole("button", { name: /STAGEFLOW/i }).click();
    await page.waitForTimeout(500);

    // Dropdown should still show the same project
    const dropdown = page.getByRole("combobox").or(page.locator("select"));
    await expect(dropdown).toContainText("Persistent Project");

    // Verify localStorage still has the same project ID
    const restoredId = await page.evaluate(() => {
      return localStorage.getItem("stageflow:current-project");
    });

    expect(restoredId).toBe(projectId);
  });
});
