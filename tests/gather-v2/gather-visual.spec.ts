import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  assertNoHorizontalOverflow,
  capture,
  clearGatherStorage,
  qaState,
  seedGatherState,
  visualDir,
  waitForApp,
} from "./helpers";

test.beforeAll(() => {
  fs.mkdirSync(visualDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await clearGatherStorage(page);
});

test("@gather-visual gather list at mobile widths", async ({ page }, testInfo) => {
  await page.goto("/gather");
  await capture(page, testInfo, `gather-list-${page.viewportSize()?.width}.png`);
  await expect(page.getByRole("heading", { name: "Gather" }).first()).toBeVisible();
});

test("@gather-visual gather creation wizard captures every step", async ({ page }, testInfo) => {
  await page.goto("/gather/new");
  await capture(page, testInfo, "gather-new-step1-390.png");
  await expect(page.getByRole("textbox", { name: /Gather/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ti/i }).last()).toBeVisible();

  await page.getByRole("button", { name: /Ti/i }).last().click();
  await waitForApp(page);
  await expect(page.getByTestId("gather-cohost-selector")).toBeVisible();
  await expect(page.getByTestId("gather-audience-selector")).toBeVisible();

  await page.getByTestId("cohost-with-others").click();
  await page.getByTestId("gather-cohost-selector").getByTestId("group-study-crew").click();
  await page.getByTestId("gather-cohost-selector").getByTestId("friend-hailang").click();
  await capture(page, testInfo, "gather-new-step2-cohosts-390.png");

  await page.getByTestId("gather-audience-selector").getByTestId("audience-all-friends").click();
  await page.getByTestId("gather-audience-selector").getByTestId("group-coffee-loop").click();
  await page.getByTestId("gather-audience-selector").getByTestId("friend-quanghuy").click();
  await capture(page, testInfo, "gather-new-step2-audience-390.png");

  await page.getByRole("button", { name: /Ti/i }).last().click();
  await waitForApp(page);
  await page.getByRole("button", { name: /2/ }).click();
  await capture(page, testInfo, "gather-new-step3-390.png");

  await page.getByRole("button", { name: /Ti/i }).last().click();
  await waitForApp(page);
  await capture(page, testInfo, "gather-new-step4-390.png");
  await page.getByRole("button", { name: /G/i }).last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /G/i }).last()).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("@gather-visual role detail and manage screenshots", async ({ page }, testInfo) => {
  await seedGatherState(page, qaState());

  await page.goto("/gather/qa-owner");
  await capture(page, testInfo, "gather-detail-owner-390.png");
  await expect(page.getByRole("button", { name: /Gather/i }).first()).toBeVisible();

  await page.goto("/gather/qa-cohost");
  await capture(page, testInfo, "gather-detail-cohost-390.png");
  await expect(page.getByRole("button", { name: /Gather/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /owner-only/i })).toBeVisible();

  await page.goto("/gather/qa-invitee");
  await capture(page, testInfo, "gather-detail-invitee-390.png");
  await expect(page.getByRole("button", { name: /qua/i }).first()).toBeVisible();

  await page.goto("/gather/qa-owner/manage");
  await capture(page, testInfo, "gather-manage-390.png");
  await expect(page.getByText(/đã chấp nhận/i)).toBeVisible();
  await expect(page.getByText(/chưa phản hồi/i)).toBeVisible();

  await page.goto("/gather/qa-expired");
  await capture(page, testInfo, "gather-expired-390.png");
  await expect(page.getByTestId("rsvp-going")).toBeDisabled();
  await expect(page.getByTestId("rsvp-maybe")).toBeDisabled();
});

test("@gather-visual notifications screenshot includes Gather event types", async ({ page }) => {
  await seedGatherState(page, qaState());
  await page.goto("/notifications");
  await waitForApp(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: path.join(visualDir, "gather-notifications-390.png"),
    fullPage: true,
    animations: "disabled",
  });
  await expect(page.getByText("COHOST INVITE")).toBeVisible();
  await expect(page.getByText("GATHER ENDED")).toBeVisible();
});
