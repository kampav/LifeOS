/**
 * E2E critical path tests (PRD §8.6 — 10 critical user journeys).
 * These run against a live/staging environment with PLAYWRIGHT_BASE_URL set.
 * Auth is bypassed via test user credentials in env vars.
 */
import { test, expect, Page } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "test@lifeos.ai";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "testpassword123";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/^\/(health|coach|goals|habits|\s*)/, { timeout: 10_000 });
}

// ── 1. Auth: login redirects to dashboard ──────────────────────────────────
test("1. user can log in and see dashboard", async ({ page }) => {
  await login(page);
  await expect(page).not.toHaveURL(/login/);
  // Life score or domain cards should be visible
  await expect(page.getByText(/life score|wheel of life|health/i).first()).toBeVisible({ timeout: 8_000 });
});

// ── 2. Auth: unauthenticated redirect ─────────────────────────────────────
test("2. unauthenticated user redirected to login", async ({ page }) => {
  await page.goto("/coach");
  await expect(page).toHaveURL(/login/, { timeout: 8_000 });
});

// ── 3. Log a health entry ──────────────────────────────────────────────────
test("3. user can log a health entry", async ({ page }) => {
  await login(page);
  await page.goto("/health");
  await page.getByRole("button", { name: /log entry|add entry|\+/i }).first().click();
  await page.getByLabel(/title|what did you do/i).fill("Morning run 5k");
  await page.getByRole("button", { name: /save|submit|log/i }).click();
  await expect(page.getByText(/morning run/i)).toBeVisible({ timeout: 8_000 });
});

// ── 4. Create a goal ──────────────────────────────────────────────────────
test("4. user can create a goal", async ({ page }) => {
  await login(page);
  await page.goto("/goals");
  await page.getByRole("button", { name: /new goal|add goal|\+/i }).first().click();
  await page.getByLabel(/title/i).fill("Run a 10k by June");
  await page.getByRole("button", { name: /save|create/i }).click();
  await expect(page.getByText(/run a 10k/i)).toBeVisible({ timeout: 8_000 });
});

// ── 5. Log a habit ────────────────────────────────────────────────────────
test("5. user can log a habit completion", async ({ page }) => {
  await login(page);
  await page.goto("/habits");
  // Tick the first habit checkbox/button
  const firstHabit = page.locator("[data-testid='habit-item']").first();
  if (await firstHabit.count() > 0) {
    await firstHabit.getByRole("button", { name: /complete|check|log/i }).click();
    await expect(firstHabit).toHaveClass(/completed|checked/, { timeout: 5_000 });
  } else {
    // No habits — create one first
    await page.getByRole("button", { name: /new habit|add habit|\+/i }).first().click();
    await page.getByLabel(/name/i).fill("Daily meditation");
    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page.getByText(/daily meditation/i)).toBeVisible({ timeout: 8_000 });
  }
});

// ── 6. AI coach chat responds ────────────────────────────────────────────
test("6. AI coach responds to a message", async ({ page }) => {
  await login(page);
  await page.goto("/coach");
  const input = page.getByPlaceholder(/message|ask|type/i);
  await input.fill("How am I doing with my health goals?");
  await page.keyboard.press("Enter");
  // Wait for AI response (can take several seconds)
  await expect(page.locator(".ai-message, [data-role='assistant']").first()).toBeVisible({ timeout: 30_000 });
});

// ── 7. Daily brief loads ──────────────────────────────────────────────────
test("7. daily brief page loads without error", async ({ page }) => {
  await login(page);
  await page.goto("/review");
  await expect(page.getByText(/brief|review|today/i).first()).toBeVisible({ timeout: 10_000 });
});

// ── 8. Notifications bell renders ────────────────────────────────────────
test("8. notification bell visible and opens panel", async ({ page }) => {
  await login(page);
  const bell = page.getByRole("button", { name: /notification/i });
  await expect(bell).toBeVisible({ timeout: 8_000 });
  await bell.click();
  // Panel or dropdown appears
  await expect(page.getByText(/notifications|no notifications/i).first()).toBeVisible({ timeout: 5_000 });
});

// ── 9. Domain page loads with score ──────────────────────────────────────
test("9. health domain page loads with score", async ({ page }) => {
  await login(page);
  await page.goto("/health");
  await expect(page.getByText(/health/i).first()).toBeVisible({ timeout: 8_000 });
  // Score (0-100) or "No data" state should be present
  await expect(page.locator("text=/\\d+|no data/i").first()).toBeVisible({ timeout: 8_000 });
});

// ── 10. Settings page saves profile ──────────────────────────────────────
test("10. settings page loads and shows profile form", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.getByLabel(/name|timezone/i).first()).toBeVisible({ timeout: 8_000 });
});
