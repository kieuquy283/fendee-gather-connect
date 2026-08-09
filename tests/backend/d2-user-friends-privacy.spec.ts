import { expect, test, type Page } from "@playwright/test";
import { resetD2ServerState, seedAuthSession, waitForApp } from "../gather-v2/helpers";

async function fetchJson(
  page: Page,
  input: {
    url: string;
    method?: string;
    body?: unknown;
  },
) {
  return page.evaluate(async ({ url, method, body }) => {
    const init: RequestInit = {
      method: method ?? "GET",
      credentials: "include",
    };

    if (body !== undefined) {
      init.headers = {
        "content-type": "application/json",
      };
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    return {
      status: response.status,
      json,
    };
  }, input);
}

async function resetAndLogin(page: Page, userId = "me") {
  await resetD2ServerState(page);
  await seedAuthSession(page, userId);
}

test.beforeEach(async ({ page }) => {
  await resetD2ServerState(page);
});

test("@phase-d2 own profile loads from server repository", async ({ page }) => {
  await seedAuthSession(page, "me");
  const result = await fetchJson(page, { url: "/api/d2/profile/me" });

  expect(result.status).toBe(200);
  expect(result.json).toMatchObject({
    id: "me",
    kind: "self",
  });
});

test("@phase-d2 friend profile is readable when server policy allows it", async ({ page }) => {
  await seedAuthSession(page, "me");
  const result = await fetchJson(page, { url: "/api/d2/profiles/hailang" });

  expect(result.status).toBe(200);
  expect(result.json).toMatchObject({
    id: "hailang",
    kind: "public",
  });
});

test("@phase-d2 stranger cannot read friends-only profile", async ({ page }) => {
  await seedAuthSession(page, "annanguyen");
  const result = await fetchJson(page, { url: "/api/d2/profiles/me" });

  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
    },
  });
});

test("@phase-d2 blocked user cannot read protected profile", async ({ page }) => {
  await seedAuthSession(page, "baongoc");
  const result = await fetchJson(page, { url: "/api/d2/profiles/me" });

  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
    },
  });
});

test("@phase-d2 profile update ignores spoofed userId and only updates the actor", async ({
  page,
}) => {
  await seedAuthSession(page, "hailang");
  const update = await fetchJson(page, {
    url: "/api/d2/profile/me",
    method: "PATCH",
    body: {
      userId: "me",
      name: "Hai Dang Updated",
    },
  });
  expect(update.status).toBe(200);
  expect(update.json).toMatchObject({
    id: "hailang",
    name: "Hai Dang Updated",
  });

  await seedAuthSession(page, "me");
  const meProfile = await fetchJson(page, { url: "/api/d2/profile/me" });
  expect(meProfile.status).toBe(200);
  expect(meProfile.json).toMatchObject({
    id: "me",
  });
  expect(meProfile.json).not.toMatchObject({
    name: "Hai Dang Updated",
  });
});

test("@phase-d2 client cannot send a friend request as another user", async ({ page }) => {
  await seedAuthSession(page, "me");
  const send = await fetchJson(page, {
    url: "/api/d2/friends/requests",
    method: "POST",
    body: {
      targetUserId: "annanguyen",
      requesterUserId: "hailang",
    },
  });
  expect(send.status).toBe(200);

  const outgoing = await fetchJson(page, { url: "/api/d2/friends/requests/outgoing" });
  expect(outgoing.status).toBe(200);
  expect(outgoing.json).toMatchObject([
    {
      requesterUserId: "me",
      addresseeUserId: "annanguyen",
    },
  ]);
});

test("@phase-d2 duplicate pending friend request is rejected", async ({ page }) => {
  await seedAuthSession(page, "me");
  const first = await fetchJson(page, {
    url: "/api/d2/friends/requests",
    method: "POST",
    body: { targetUserId: "annanguyen" },
  });
  expect(first.status).toBe(200);

  const second = await fetchJson(page, {
    url: "/api/d2/friends/requests",
    method: "POST",
    body: { targetUserId: "annanguyen" },
  });
  expect(second.status).toBe(409);
  expect(second.json).toMatchObject({
    ok: false,
    error: {
      code: "CONFLICT",
    },
  });
});

test("@phase-d2 self friend request is rejected", async ({ page }) => {
  await seedAuthSession(page, "me");
  const result = await fetchJson(page, {
    url: "/api/d2/friends/requests",
    method: "POST",
    body: { targetUserId: "me" },
  });

  expect(result.status).toBe(400);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
    },
  });
});

test("@phase-d2 blocked relationship cannot create a friend request", async ({ page }) => {
  await seedAuthSession(page, "me");
  const result = await fetchJson(page, {
    url: "/api/d2/friends/requests",
    method: "POST",
    body: { targetUserId: "baongoc" },
  });

  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
    },
  });
});

test("@phase-d2 actor cannot accept a friend request addressed to another user", async ({
  page,
}) => {
  await seedAuthSession(page, "hailang");
  const result = await fetchJson(page, {
    url: "/api/d2/friends/requests/friend-request-khanhvy/accept",
    method: "POST",
  });

  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
    },
  });
});

test("@phase-d2 foreign group rename is forbidden", async ({ page }) => {
  await seedAuthSession(page, "hailang");
  const result = await fetchJson(page, {
    url: "/api/d2/groups/close-friends",
    method: "PATCH",
    body: { name: "Rename attempt" },
  });

  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
    },
  });
});

test("@phase-d2 non-friend group member add is denied", async ({ page }) => {
  await seedAuthSession(page, "me");
  const result = await fetchJson(page, {
    url: "/api/d2/groups/close-friends/members",
    method: "POST",
    body: { memberUserId: "annanguyen" },
  });

  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
    },
  });
});

test("@phase-d2 privacy update ignores spoofed userId and only changes the actor", async ({
  page,
}) => {
  await seedAuthSession(page, "hailang");
  const update = await fetchJson(page, {
    url: "/api/d2/privacy",
    method: "PATCH",
    body: {
      userId: "me",
      showOnlineStatus: false,
    },
  });
  expect(update.status).toBe(200);
  expect(update.json).toMatchObject({
    showOnlineStatus: false,
  });

  await seedAuthSession(page, "me");
  const mePrivacy = await fetchJson(page, { url: "/api/d2/privacy" });
  expect(mePrivacy.status).toBe(200);
  expect(mePrivacy.json).toMatchObject({
    showOnlineStatus: true,
  });
});

test("@phase-d2 block and unblock are persisted server-side", async ({ page }) => {
  await resetAndLogin(page, "me");
  let blocks = await fetchJson(page, { url: "/api/d2/blocks" });
  expect(blocks.status).toBe(200);
  expect(blocks.json).toMatchObject({
    blockedUserIds: ["baongoc"],
  });

  const block = await fetchJson(page, {
    url: "/api/d2/blocks",
    method: "POST",
    body: { targetUserId: "annanguyen" },
  });
  expect(block.status).toBe(200);

  blocks = await fetchJson(page, { url: "/api/d2/blocks" });
  expect(blocks.json).toMatchObject({
    blockedUserIds: expect.arrayContaining(["baongoc", "annanguyen"]),
  });

  const unblock = await fetchJson(page, {
    url: "/api/d2/blocks/annanguyen",
    method: "DELETE",
  });
  expect(unblock.status).toBe(200);

  blocks = await fetchJson(page, { url: "/api/d2/blocks" });
  expect(blocks.json).toMatchObject({
    blockedUserIds: ["baongoc"],
  });
});

test("@phase-d2 friend request state survives reload through server persistence", async ({
  page,
}) => {
  await seedAuthSession(page, "me");
  const send = await fetchJson(page, {
    url: "/api/d2/friends/requests",
    method: "POST",
    body: { targetUserId: "annanguyen" },
  });
  expect(send.status).toBe(200);

  await page.goto("/friends/requests");
  await waitForApp(page);
  await page.reload();
  await waitForApp(page);

  const outgoing = await fetchJson(page, { url: "/api/d2/friends/requests/outgoing" });
  expect(outgoing.status).toBe(200);
  expect(outgoing.json).toMatchObject([
    {
      addresseeUserId: "annanguyen",
      status: "pending",
    },
  ]);
});

test("@phase-d2 privacy settings survive reload through server persistence", async ({ page }) => {
  await seedAuthSession(page, "me");
  const update = await fetchJson(page, {
    url: "/api/d2/privacy",
    method: "PATCH",
    body: { showOnlineStatus: false },
  });
  expect(update.status).toBe(200);

  await page.goto("/settings/privacy");
  await waitForApp(page);
  await page.reload();
  await waitForApp(page);

  const settings = await fetchJson(page, { url: "/api/d2/privacy" });
  expect(settings.status).toBe(200);
  expect(settings.json).toMatchObject({
    showOnlineStatus: false,
  });
});

test("@phase-d2 logout and relogin do not reuse previous user D2 state as authoritative client state", async ({
  page,
}) => {
  await seedAuthSession(page, "me");
  const block = await fetchJson(page, {
    url: "/api/d2/blocks",
    method: "POST",
    body: { targetUserId: "annanguyen" },
  });
  expect(block.status).toBe(200);

  await page.goto("/settings");
  await waitForApp(page);
  await page.getByRole("button", { name: /Logout/i }).click();
  await waitForApp(page);

  await seedAuthSession(page, "hailang");
  const blocks = await fetchJson(page, { url: "/api/d2/blocks" });
  expect(blocks.status).toBe(200);
  expect(blocks.json).toMatchObject({
    blockedUserIds: [],
  });
});
