import { expect, test, type Page } from "@playwright/test";
import type { Gather, GatherInvite, GatherNotification } from "@/lib/gather-store";
import {
  assertNoHorizontalOverflow,
  clearGatherStorage,
  qaState,
  seedGatherState,
  seedGatherStateIfMissing,
  waitForApp,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearGatherStorage(page);
});

test("@gather-functional create with mixed audience deduplicates recipients", async ({ page }) => {
  await page.goto("/gather/new");
  await waitForApp(page);
  await page.getByRole("button", { name: /Ti/i }).last().click();
  await expect(page.getByTestId("gather-cohost-selector")).toBeVisible();

  await page.getByTestId("cohost-with-others").click();
  await page.getByTestId("gather-cohost-selector").getByTestId("friend-hailang").click();
  await page.getByTestId("gather-audience-selector").getByTestId("audience-all-friends").click();
  await page.getByTestId("gather-audience-selector").getByTestId("group-close-friends").click();
  await page.getByTestId("gather-audience-selector").getByTestId("group-study-crew").click();
  await page.getByTestId("gather-audience-selector").getByTestId("friend-hailang").click();
  await page.getByTestId("gather-audience-selector").getByTestId("friend-minhtu").click();

  await page.getByRole("button", { name: /Ti/i }).last().click();
  await page.getByRole("button", { name: /Ti/i }).last().click();
  await page.getByRole("button", { name: /G/i }).last().click();
  await waitForApp(page);
  await expect(page).toHaveURL(/\/gather\/g-/);

  const created = await latestGather(page);
  const inviteIds = created.invites.map((invite) => invite.personId);
  const uniqueInviteIds = [...new Set(inviteIds)];

  expect(inviteIds).toEqual(uniqueInviteIds);
  expect(inviteIds).not.toContain("me");
  expect(inviteIds).not.toContain("baongoc");
  expect(inviteIds).toContain("hailang");
  expect(created.hosts.filter((host) => host.role === "cohost")).toHaveLength(1);
  expect(created.hosts.find((host) => host.personId === "hailang")?.cohostStatus).toBe("pending");
});

test("@gather-functional co-host invite accept and decline transitions", async ({ page }) => {
  await seedGatherState(page, qaState());
  await page.goto("/gather/qa-pending-cohost");

  await expect(
    page
      .getByText(/m/i)
      .filter({ hasText: /Gather/i })
      .first(),
  ).toBeVisible();
  await page.getByTestId("cohost-accept").click();
  await expect(page.getByTestId("open-gather-manage")).toBeVisible();

  let gather = await getGather(page, "qa-pending-cohost");
  expect(gather.hosts.find((host) => host.personId === "me")?.cohostStatus).toBe("accepted");

  await seedGatherState(page, qaState());
  await page.goto("/gather/qa-pending-cohost");
  await page.getByTestId("cohost-decline").click();
  gather = await getGather(page, "qa-pending-cohost");
  expect(gather.hosts.find((host) => host.personId === "me")?.cohostStatus).toBe("declined");
});

test("@gather-functional invitee RSVP updates immediately", async ({ page }) => {
  await seedGatherState(page, qaState());
  await page.goto("/gather/qa-invitee");

  await page.getByTestId("rsvp-going").click();
  expect((await getInvite(page, "qa-invitee", "me")).status).toBe("going");

  await page.getByTestId("rsvp-maybe").click();
  expect((await getInvite(page, "qa-invitee", "me")).status).toBe("maybe");

  await page.getByTestId("rsvp-withdraw").click();
  expect((await getInvite(page, "qa-invitee", "me")).status).toBe("seen");

  await page.getByTestId("rsvp-declined").click();
  expect((await getInvite(page, "qa-invitee", "me")).status).toBe("declined");
});

test("@gather-functional owner and co-host permissions are enforced on manage route", async ({
  page,
}) => {
  await seedGatherState(page, qaState());

  await page.goto("/gather/qa-owner/manage");
  await expect(page.getByRole("button", { name: /End Gather/i })).toBeEnabled();
  await page.getByRole("button", { name: /End Gather/i }).click();
  expect((await getGather(page, "qa-owner")).status).toBe("ended");

  await seedGatherState(page, qaState());
  await page.goto("/gather/qa-cohost/manage");
  await expect(page.getByRole("button", { name: /Edit Gather/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /End Gather/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Manage co-hosts/i })).toBeDisabled();
  expect((await getGather(page, "qa-cohost")).status).toBe("live");
});

test("@gather-functional expired Gather is inactive and not listed as active", async ({ page }) => {
  await seedGatherState(page, qaState());
  await page.goto("/gather/qa-expired");
  await waitForApp(page);
  await expect(page.getByTestId("rsvp-going")).toBeDisabled();
  await expect(page.getByTestId("rsvp-maybe")).toBeDisabled();

  await page.goto("/gather");
  await waitForApp(page);
  await expect(page.getByText("Expired QA Gather")).toHaveCount(0);
  await page.getByTestId("gather-tab-expired").click();
  await expect(page.getByText("Expired QA Gather")).toBeVisible();
});

test("@gather-functional notification routing, uniqueness, and privacy copy", async ({ page }) => {
  await seedGatherState(page, qaState());
  await page.goto("/notifications");
  await expect(page.getByText("COHOST INVITE")).toBeVisible();
  await expect(page.getByText("GATHER INVITE")).toBeVisible();
  await expect(page.getByText("GATHER ENDED")).toBeVisible();

  const notifications = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("fendee-gather-state-v2")!) as {
      notifications: GatherNotification[];
    };
    return state.notifications;
  });
  expect(notifications.map((notice) => notice.id)).toHaveLength(
    new Set(notifications.map((notice) => notice.id)).size,
  );
  expect(notifications.every((notice) => notice.recipientId === "me")).toBeTruthy();
  expect(notifications.every((notice) => notice.deepLink.startsWith("/gather/"))).toBeTruthy();
  expect(
    notifications.every((notice) => !notice.pushBody.includes("The Coffee House")),
  ).toBeTruthy();
});

test("@gather-functional persistence survives reload and corrupted state fails safely", async ({
  page,
}) => {
  await seedGatherStateIfMissing(page, qaState());
  await page.goto("/gather/qa-invitee");
  await waitForApp(page);
  await page.getByTestId("rsvp-going").click();
  await expect.poll(() => getInvite(page, "qa-invitee", "me")).toMatchObject({ status: "going" });
  await page.reload();
  await waitForApp(page);
  expect((await getInvite(page, "qa-invitee", "me")).status).toBe("going");

  await page.evaluate(() => {
    window.localStorage.setItem("fendee-gather-state-v2", "{bad-json");
  });
  await page.goto("/gather");
  await expect(page.getByRole("heading", { name: "Gather" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.evaluate(() => {
    window.localStorage.setItem("fendee-gather-state-v2", JSON.stringify({ gathers: [{}] }));
  });
  await page.goto("/gather");
  await expect(page.getByRole("heading", { name: "Gather" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

async function latestGather(page: Page): Promise<Gather> {
  const gather = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("fendee-gather-state-v2")!) as {
      gathers: Gather[];
    };
    return state.gathers[0];
  });
  if (!gather) throw new Error("Expected at least one Gather in localStorage");
  return gather;
}

async function getGather(page: Page, id: string): Promise<Gather> {
  const gather = await page.evaluate((gatherId: string) => {
    const state = JSON.parse(window.localStorage.getItem("fendee-gather-state-v2")!) as {
      gathers: Gather[];
    };
    return state.gathers.find((gather) => gather.id === gatherId);
  }, id);
  if (!gather) throw new Error(`Expected Gather ${id} in localStorage`);
  return gather;
}

async function getInvite(page: Page, gatherId: string, personId: string): Promise<GatherInvite> {
  const invite = await page.evaluate(
    ({ gatherId: id, personId: targetId }) => {
      const state = JSON.parse(window.localStorage.getItem("fendee-gather-state-v2")!) as {
        gathers: Array<Gather & { invites: GatherInvite[] }>;
      };
      return state.gathers
        .find((gather) => gather.id === id)
        ?.invites.find((invite) => invite.personId === targetId);
    },
    { gatherId, personId },
  );
  if (!invite) throw new Error(`Expected invite ${personId} in Gather ${gatherId}`);
  return invite;
}
