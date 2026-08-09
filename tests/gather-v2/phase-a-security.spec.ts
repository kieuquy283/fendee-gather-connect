import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  clearGatherStorage,
  qaState,
  seedAuthSession,
  seedGatherState,
  seedPrivacyState,
  waitForApp,
} from "./helpers";

test("@phase-a anonymous user cannot open protected routes", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/home");
  await waitForApp(page);
  await expect(page.getByTestId("auth-required")).toBeVisible();
  await expect(page.getByText("Sign in required")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("@phase-a expired session blocks protected routes", async ({ page }) => {
  await seedAuthSession(page, "me", true);
  await page.goto("/gather");
  await waitForApp(page);
  await expect(page.getByTestId("auth-required")).toBeVisible();
  await expect(page.getByText("Session expired")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("@phase-a login reload and logout back remain protected", async ({ page }) => {
  await page.goto("/auth");
  await waitForApp(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await waitForApp(page);
  await page.getByRole("button", { name: "Tiếp tục với Google", exact: true }).click();
  await waitForApp(page);
  await expect(page).toHaveURL(/\/setup-profile|\/home/);

  await page.goto("/home");
  await expect(page.getByText("Chào bạn")).toBeVisible();
  await page.reload();
  await waitForApp(page);
  await expect(page.getByText("Chào bạn")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("button", { name: /Logout/i }).click();
  await waitForApp(page);
  await expect(page).toHaveURL(/\/auth/);
  await page.goBack();
  await waitForApp(page);
  await expect(page.getByTestId("auth-required")).toBeVisible();
});

test("@phase-a uninvited user cannot open restricted Gather or manage route", async ({ page }) => {
  await seedAuthSession(page, "me");
  await seedGatherState(page, qaState());

  await page.goto("/gather/qa-normal");
  await waitForApp(page);
  await expect(page.getByText("Normal Viewer QA Gather")).toHaveCount(0);
  await expect(page.getByTestId("gather-access-denied")).toBeVisible();

  await page.goto("/gather/qa-normal/manage");
  await waitForApp(page);
  await expect(page.getByText("Normal Viewer QA Gather")).toHaveCount(0);
  await expect(page.getByTestId("gather-manage-denied")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("@phase-a blocked user cannot open chat or profile content", async ({ page }) => {
  await clearGatherStorage(page);
  await seedPrivacyState(page, ["hailang"]);

  await page.goto("/chat/c1");
  await waitForApp(page);
  await expect(page.getByTestId("chat-access-denied")).toBeVisible();
  await expect(page.getByText("Ok m")).toHaveCount(0);

  await page.goto("/profile/hailang");
  await waitForApp(page);
  await expect(page.getByTestId("blocked-profile")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("@phase-a permission lost hides active nearby presence", async ({ page }) => {
  await seedAuthSession(page, "me");
  await page.goto("/auth");
  await page.evaluate(async () => {
    const now = new Date().toISOString();
    const started = await fetch("/api/d3/presence/start", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audience: { mode: "all_friends", groupIds: [], friendIds: [] },
        location: {
          zoneId: "area-a",
          accuracyMeters: 18,
          dwellMs: 180000,
          motion: "stable",
          capturedAt: now,
        },
        permission: "granted",
      }),
    });
    const startedJson = (await started.json()) as { presenceSession?: { id: string } };
    if (!started.ok || !startedJson.presenceSession) {
      throw new Error("Unable to seed D3 presence session for permission-lost test.");
    }
    await fetch("/api/d3/presence/sync-location", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sessionId: startedJson.presenceSession.id,
        location: {
          zoneId: "area-a",
          accuracyMeters: 18,
          dwellMs: 180000,
          motion: "offline",
          capturedAt: new Date().toISOString(),
        },
        permission: "revoked",
      }),
    });
  });

  await page.goto("/nearby");
  await waitForApp(page);
  await expect(page.getByText("Mất quyền vị trí", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Khung Nearby · 100m")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

test("@phase-a invalid Gather deep link fails closed", async ({ page }) => {
  await clearGatherStorage(page);
  await page.goto("/gather/not-a-real-gather");
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: /Gather/ }).nth(1)).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
