import { expect, test, type Page } from "@playwright/test";
import {
  qaState,
  resetD2ServerState,
  resetD3ServerState,
  resetD4ServerState,
  seedAuthSession,
} from "../gather-v2/helpers";

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
      init.headers = { "content-type": "application/json" };
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

async function resetWorld(page: Page, userId = "me") {
  await seedAuthSession(page, userId);
  await resetD2ServerState(page);
  await resetD3ServerState(page);
  await resetD4ServerState(page);
  await seedAuthSession(page, userId);
}

async function seedGatherWorld(page: Page) {
  await seedAuthSession(page, "me");
  await page.goto("/auth");
  await page.evaluate(async (state) => {
    await fetch("/api/dev/d4/seed", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ state }),
    });
  }, qaState());
}

async function createGather(page: Page) {
  return fetchJson(page, {
    url: "/api/d4/gathers",
    method: "POST",
    body: {
      title: "D4 Backend Gather",
      note: "Server-authoritative gather",
      place: "The Coffee House Thai Ha",
      duration: "1 gio",
      cohostSelection: {
        includeAllFriends: false,
        groupIds: [],
        friendIds: ["minhtu"],
      },
      inviteSelection: {
        includeAllFriends: true,
        groupIds: ["close-friends", "study-crew"],
        friendIds: ["hailang", "minhtu", "baongoc"],
      },
    },
  });
}

async function getDebugGather(page: Page, gatherId: string) {
  const response = await fetchJson(page, {
    url: `/api/dev/d4/debug-state?gatherId=${encodeURIComponent(gatherId)}`,
  });
  expect(response.status).toBe(200);
  return response.json as {
    gather: {
      id: string;
      ownerId: string;
      status: string;
      hosts: Array<{ personId: string; role: string; cohostStatus: string }>;
      invites: Array<{ personId: string; status: string }>;
      audienceSnapshot: { resolvedRecipientIds: string[] };
    } | null;
  };
}

test.beforeEach(async ({ page }) => {
  await resetWorld(page);
});

test("@phase-d4 server resolves mixed audience, deduplicates, and excludes blocked users", async ({
  page,
}) => {
  const created = await createGather(page);
  expect(created.status).toBe(200);
  const gatherId = created.json as string;

  const debug = await getDebugGather(page, gatherId);
  expect(debug.gather).not.toBeNull();
  const inviteIds = debug.gather!.invites.map((invite) => invite.personId);

  expect(inviteIds).toEqual([...new Set(inviteIds)]);
  expect(inviteIds).not.toContain("me");
  expect(inviteIds).not.toContain("baongoc");
  expect(inviteIds).toContain("hailang");
  expect(inviteIds).toContain("minhtu");
  expect(debug.gather!.hosts.find((host) => host.personId === "minhtu")?.cohostStatus).toBe(
    "pending",
  );
});

test("@phase-d4 pending cohost cannot manage, accepted cohost can edit, and owner-only action stays forbidden", async ({
  page,
}) => {
  await seedGatherWorld(page);

  let canManage = await fetchJson(page, {
    url: "/api/d4/gathers/qa-pending-cohost/can?permission=view_rsvp",
  });
  expect(canManage.status).toBe(200);
  expect(canManage.json).toBe(false);

  await seedAuthSession(page, "me");
  let response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-pending-cohost/cohost-response",
    method: "POST",
    body: { status: "accepted" },
  });
  expect(response.status).toBe(200);

  canManage = await fetchJson(page, {
    url: "/api/d4/gathers/qa-pending-cohost/can?permission=view_rsvp",
  });
  expect(canManage.status).toBe(200);
  expect(canManage.json).toBe(true);

  response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-pending-cohost/end",
    method: "POST",
  });
  expect(response.status).toBe(403);
});

test("@phase-d4 invitee can update own RSVP and foreign actors cannot update it", async ({
  page,
}) => {
  await seedGatherWorld(page);

  let response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-invitee/rsvp",
    method: "POST",
    body: { status: "going" },
  });
  expect(response.status).toBe(200);

  const debug = await getDebugGather(page, "qa-invitee");
  expect(debug.gather?.invites.find((invite) => invite.personId === "me")?.status).toBe("going");

  await seedAuthSession(page, "annanguyen");
  response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-invitee/rsvp",
    method: "POST",
    body: { status: "maybe" },
  });
  expect(response.status).toBe(403);
});

test("@phase-d4 strangers and blocked users cannot access private Gather data", async ({
  page,
}) => {
  await seedGatherWorld(page);

  await seedAuthSession(page, "annanguyen");
  let response = await fetchJson(page, { url: "/api/d4/gathers/qa-invitee" });
  expect(response.status).toBe(403);

  await seedAuthSession(page, "baongoc");
  response = await fetchJson(page, { url: "/api/d4/gathers/qa-owner" });
  expect(response.status).toBe(403);
});

test("@phase-d4 expired Gather rejects RSVP and ended Gather rejects active mutations", async ({
  page,
}) => {
  await seedGatherWorld(page);

  let response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-expired/rsvp",
    method: "POST",
    body: { status: "going" },
  });
  expect(response.status).toBe(410);

  response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-owner/end",
    method: "POST",
  });
  expect(response.status).toBe(200);

  response = await fetchJson(page, {
    url: "/api/d4/gathers/qa-owner/rsvp",
    method: "POST",
    body: { status: "going" },
  });
  expect(response.status).toBe(410);
});

test("@phase-d4 reload and cross-user reads preserve shared server state", async ({ page }) => {
  const created = await createGather(page);
  expect(created.status).toBe(200);
  const gatherId = created.json as string;

  let debug = await getDebugGather(page, gatherId);
  const before = JSON.stringify(debug.gather);

  await page.reload();
  debug = await getDebugGather(page, gatherId);
  expect(JSON.stringify(debug.gather)).toBe(before);

  await seedAuthSession(page, "hailang");
  const visible = await fetchJson(page, { url: "/api/d4/gathers" });
  expect(visible.status).toBe(200);
  expect(
    (visible.json as { gathers: Array<{ id: string }> }).gathers.some((g) => g.id === gatherId),
  ).toBe(true);

  await seedAuthSession(page, "me");
  debug = await getDebugGather(page, gatherId);
  expect(JSON.stringify(debug.gather)).toBe(before);
});
