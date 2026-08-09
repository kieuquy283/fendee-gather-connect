import { expect, test, type Page } from "@playwright/test";
import { resetD2ServerState, resetD3ServerState, seedAuthSession } from "../gather-v2/helpers";

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

async function whoAmI(page: Page) {
  return fetchJson(page, { url: "/api/auth/me" });
}

async function debugPresenceState(page: Page, userId: string) {
  return fetchJson(page, {
    url: `/api/dev/d3/debug-state?userId=${encodeURIComponent(userId)}`,
  });
}

function ownerPresenceSlice(
  response: Awaited<ReturnType<typeof debugPresenceState>>,
  userId: string,
) {
  const payload = response.json as {
    snapshot: unknown;
    sessions: Array<{ userId: string }>;
    nearbyPresence: Array<{ userId: string }>;
    friendSnapshots: Array<{ ownerUserId: string }>;
  };
  return {
    snapshot: payload.snapshot,
    sessions: payload.sessions.filter((session) => session.userId === userId),
    nearbyPresence: payload.nearbyPresence.filter((record) => record.userId === userId),
    friendSnapshots: payload.friendSnapshots.filter((snapshot) => snapshot.ownerUserId === userId),
  };
}

function expectDebugSnapshot(
  response: Awaited<ReturnType<typeof debugPresenceState>>,
  expected: {
    currentArea: "area-a" | "area-b" | "area-c" | null;
    nearbyAreaId: "area-a" | "area-b" | "area-c" | null;
    friendSnapshotArea: "area-a" | "area-b" | "area-c" | null;
    presenceSessionStatus: string | null;
    latestAcceptedLocationZoneId?: "area-a" | "area-b" | "area-c" | null;
  },
) {
  expect(response.status).toBe(200);
  const payload = response.json as {
    snapshot: {
      currentArea: "area-a" | "area-b" | "area-c" | null;
      nearbyAreaId: "area-a" | "area-b" | "area-c" | null;
      friendSnapshotArea: "area-a" | "area-b" | "area-c" | null;
      presenceSessionStatus: string | null;
      latestAcceptedLocationSample: { zoneId: "area-a" | "area-b" | "area-c" } | null;
    };
  };
  expect(payload.snapshot.currentArea).toBe(expected.currentArea);
  expect(payload.snapshot.nearbyAreaId).toBe(expected.nearbyAreaId);
  expect(payload.snapshot.friendSnapshotArea).toBe(expected.friendSnapshotArea);
  expect(payload.snapshot.presenceSessionStatus).toBe(expected.presenceSessionStatus);
  if (expected.latestAcceptedLocationZoneId !== undefined) {
    expect(payload.snapshot.latestAcceptedLocationSample?.zoneId ?? null).toBe(
      expected.latestAcceptedLocationZoneId,
    );
  }
}

async function resetWorld(page: Page, userId = "me") {
  await seedAuthSession(page, userId);
  await resetD2ServerState(page);
  await resetD3ServerState(page);
  await seedAuthSession(page, userId);
}

async function startPresence(
  page: Page,
  input?: {
    audience?: {
      mode: "all_friends" | "groups" | "selected";
      groupIds: string[];
      friendIds: string[];
    };
    zoneId?: "area-a" | "area-b" | "area-c";
    accuracyMeters?: number;
    dwellMs?: number;
    motion?: "stable" | "moving" | "inaccurate" | "offline";
    permission?: "granted" | "prompt" | "denied" | "revoked";
  },
) {
  return fetchJson(page, {
    url: "/api/d3/presence/start",
    method: "POST",
    body: {
      audience: input?.audience ?? { mode: "all_friends", groupIds: [], friendIds: [] },
      location: {
        zoneId: input?.zoneId ?? "area-a",
        accuracyMeters: input?.accuracyMeters ?? 18,
        dwellMs: input?.dwellMs ?? 180000,
        motion: input?.motion ?? "stable",
        capturedAt: new Date().toISOString(),
      },
      permission: input?.permission ?? "granted",
    },
  });
}

async function syncLocation(
  page: Page,
  sessionId: string,
  input: {
    zoneId: "area-a" | "area-b" | "area-c";
    accuracyMeters?: number;
    dwellMs?: number;
    motion?: "stable" | "moving" | "inaccurate" | "offline";
    permission?: "granted" | "prompt" | "denied" | "revoked";
  },
) {
  return fetchJson(page, {
    url: "/api/d3/presence/sync-location",
    method: "POST",
    body: {
      sessionId,
      location: {
        zoneId: input.zoneId,
        accuracyMeters: input.accuracyMeters ?? 18,
        dwellMs: input.dwellMs ?? 180000,
        motion: input.motion ?? "stable",
        capturedAt: new Date().toISOString(),
      },
      permission: input.permission ?? "granted",
    },
  });
}

async function setNearbyVisible(page: Page) {
  const result = await fetchJson(page, {
    url: "/api/d2/privacy",
    method: "PATCH",
    body: {
      profileVisibility: "public",
      showInNearby: true,
    },
  });
  expect(result.status).toBe(200);
}

function debugStep(label: string, payload: unknown) {
  console.log(`[d3-canonical] ${label}: ${JSON.stringify(payload)}`);
}

test.beforeEach(async ({ page }) => {
  await resetWorld(page);
});

test("@phase-d3 canonical Area A to moving to Area B invariant holds", async ({ page }) => {
  await setNearbyVisible(page);
  const started = await startPresence(page, {
    audience: { mode: "selected", groupIds: [], friendIds: ["hailang"] },
    zoneId: "area-a",
  });
  expect(started.status).toBe(200);
  debugStep("1. Alice starts in A", started.json);
  const sessionId = (started.json as { presenceSession: { id: string } }).presenceSession.id;

  let mePresence = await fetchJson(page, { url: "/api/d3/presence/me" });
  debugStep("1a. Alice reads own state after start", mePresence.json);
  expect(mePresence.json).toMatchObject({
    nearbyPresence: { areaId: "area-a" },
    friendLocationSnapshot: { zoneId: "area-a" },
    friendSnapshotOutdated: false,
  });
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-a",
    nearbyAreaId: "area-a",
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-a",
  });

  await seedAuthSession(page, "hailang");
  debugStep("4.actor Bob", await whoAmI(page));
  let bobSnapshot = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  debugStep("4. Bob reads Alice snapshot", bobSnapshot.json);
  debugStep("4.debug Alice after Bob read", await debugPresenceState(page, "me"));
  expect(bobSnapshot.status).toBe(200);
  expect(bobSnapshot.json).toMatchObject({
    ownerUserId: "me",
    zoneId: "area-a",
  });

  await seedAuthSession(page, "me");
  debugStep("2.actor Alice", await whoAmI(page));
  const moved = await syncLocation(page, sessionId, {
    zoneId: "area-b",
    dwellMs: 20000,
    motion: "moving",
  });
  debugStep("2. Alice leaves A", moved.json);
  debugStep("2.debug Alice after leaving A", await debugPresenceState(page, "me"));
  expect(moved.status).toBe(200);
  expect(moved.json).toMatchObject({
    nearbyPresence: null,
    friendLocationSnapshot: { zoneId: "area-a" },
  });
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-a",
    nearbyAreaId: null,
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "moving",
    latestAcceptedLocationZoneId: "area-b",
  });

  await seedAuthSession(page, "annanguyen");
  debugStep("3a.actor Frank", await whoAmI(page));
  await startPresence(page, { zoneId: "area-a" });
  const frankNearby = await fetchJson(page, { url: "/api/d3/nearby?areaId=area-a" });
  debugStep("3a. Frank queries area A", frankNearby.json);
  debugStep("3a.debug Alice from Frank context", await debugPresenceState(page, "me"));
  expect(frankNearby.status).toBe(200);
  expect(frankNearby.json).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ userId: "me" })]),
  );
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-a",
    nearbyAreaId: null,
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "moving",
    latestAcceptedLocationZoneId: "area-b",
  });

  await seedAuthSession(page, "me");
  debugStep("3.actor Alice again", await whoAmI(page));
  const stable = await syncLocation(page, sessionId, {
    zoneId: "area-b",
    dwellMs: 180000,
    motion: "stable",
  });
  debugStep("3. Alice enters B", stable.json);
  debugStep("3.debug Alice after stable B", await debugPresenceState(page, "me"));
  expect(stable.status).toBe(200);
  expect(stable.json).toMatchObject({
    nearbyPresence: { areaId: "area-b" },
    friendLocationSnapshot: { zoneId: "area-a" },
    friendSnapshotOutdated: true,
  });
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-b",
    nearbyAreaId: "area-b",
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-b",
  });

  await seedAuthSession(page, "hailang");
  debugStep("4b.actor Bob", await whoAmI(page));
  bobSnapshot = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  debugStep("4b. Bob reads Alice snapshot after B", bobSnapshot.json);
  debugStep("4b.debug Alice after Bob read B", await debugPresenceState(page, "me"));
  expect(bobSnapshot.json).toMatchObject({ zoneId: "area-a" });
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-b",
    nearbyAreaId: "area-b",
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-b",
  });

  await seedAuthSession(page, "me");
  debugStep("5.actor Alice", await whoAmI(page));
  mePresence = await fetchJson(page, { url: "/api/d3/presence/me" });
  debugStep("5. Alice becomes actor again", mePresence.json);
  debugStep("5.debug Alice before update", await debugPresenceState(page, "me"));
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-b",
    nearbyAreaId: "area-b",
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-b",
  });
  const stableBeforeUpdate = await syncLocation(page, sessionId, {
    zoneId: "area-b",
    dwellMs: 180000,
    motion: "stable",
  });
  expect(stableBeforeUpdate.status).toBe(200);
  debugStep("5a. Alice re-syncs B before update", stableBeforeUpdate.json);
  const updated = await fetchJson(page, {
    url: "/api/d3/presence/update-friend-snapshot",
    method: "POST",
    body: { sessionId, notifyAgain: false },
  });
  debugStep("6. Alice updates friend snapshot", updated.json);
  expect(updated.status).toBe(200);
  expect(updated.json).toMatchObject({
    nearbyPresence: { areaId: "area-b" },
    friendLocationSnapshot: { zoneId: "area-b" },
    friendSnapshotOutdated: false,
  });
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-b",
    nearbyAreaId: "area-b",
    friendSnapshotArea: "area-b",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-b",
  });

  await seedAuthSession(page, "hailang");
  bobSnapshot = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(bobSnapshot.json).toMatchObject({ zoneId: "area-b" });
});

test("@phase-d3 cross-user reads do not mutate owner presence state", async ({ page }) => {
  await setNearbyVisible(page);
  const started = await startPresence(page, {
    audience: { mode: "selected", groupIds: [], friendIds: ["hailang"] },
    zoneId: "area-a",
  });
  const sessionId = (started.json as { presenceSession: { id: string } }).presenceSession.id;

  const stable = await syncLocation(page, sessionId, {
    zoneId: "area-b",
    dwellMs: 180000,
    motion: "stable",
  });
  expect(stable.status).toBe(200);

  const before = await debugPresenceState(page, "me");
  expectDebugSnapshot(before, {
    currentArea: "area-b",
    nearbyAreaId: "area-b",
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-b",
  });

  await seedAuthSession(page, "hailang");
  const bobSnapshot = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(bobSnapshot.status).toBe(200);

  await seedAuthSession(page, "annanguyen");
  await startPresence(page, { zoneId: "area-b" });
  const nearby = await fetchJson(page, { url: "/api/d3/nearby?areaId=area-b" });
  expect(nearby.status).toBe(200);
  expect(nearby.json).toEqual(expect.arrayContaining([expect.objectContaining({ userId: "me" })]));

  const after = await debugPresenceState(page, "me");
  expect(ownerPresenceSlice(after, "me")).toMatchObject(ownerPresenceSlice(before, "me"));
});

test("@phase-d3 new auth session for the same user resolves the existing presence session", async ({
  page,
}) => {
  await setNearbyVisible(page);
  const started = await startPresence(page, { zoneId: "area-a" });
  const sessionId = (started.json as { presenceSession: { id: string } }).presenceSession.id;

  const stable = await syncLocation(page, sessionId, {
    zoneId: "area-b",
    dwellMs: 180000,
    motion: "stable",
  });
  expect(stable.status).toBe(200);

  await seedAuthSession(page, "me");
  const who = await whoAmI(page);
  expect(who.status).toBe(200);
  expect((who.json as { sessionId: string }).sessionId).not.toBeNull();

  const mePresence = await fetchJson(page, { url: "/api/d3/presence/me" });
  expect(mePresence.status).toBe(200);
  expect(mePresence.json).toMatchObject({
    presenceSession: { id: sessionId, userId: "me", currentAreaId: "area-b" },
    nearbyPresence: { presenceSessionId: sessionId, areaId: "area-b" },
    friendLocationSnapshot: { zoneId: "area-a" },
  });
  expectDebugSnapshot(await debugPresenceState(page, "me"), {
    currentArea: "area-b",
    nearbyAreaId: "area-b",
    friendSnapshotArea: "area-a",
    presenceSessionStatus: "active",
    latestAcceptedLocationZoneId: "area-b",
  });
});

test("@phase-d3 selected audience and block authorization are enforced", async ({ page }) => {
  await startPresence(page, {
    audience: { mode: "selected", groupIds: [], friendIds: ["hailang"] },
  });

  await seedAuthSession(page, "hailang");
  const bob = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(bob.status).toBe(200);

  await seedAuthSession(page, "minhtu");
  const cara = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(cara.status).toBe(403);

  await seedAuthSession(page, "baongoc");
  await startPresence(page);
  const erinNearby = await fetchJson(page, { url: "/api/d3/nearby" });
  expect(erinNearby.json).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ userId: "me" })]),
  );
});

test("@phase-d3 TTL expiry removes stale nearby visibility", async ({ page }) => {
  await setNearbyVisible(page);
  await startPresence(page);

  await seedAuthSession(page, "annanguyen");
  await startPresence(page);
  let nearby = await fetchJson(page, { url: "/api/d3/nearby?areaId=area-a" });
  expect(nearby.json).toEqual(expect.arrayContaining([expect.objectContaining({ userId: "me" })]));

  await seedAuthSession(page, "me");
  const advanced = await fetchJson(page, {
    url: "/api/dev/d3/clock/advance",
    method: "POST",
    body: { ms: 76000 },
  });
  expect(advanced.status).toBe(200);

  await seedAuthSession(page, "annanguyen");
  nearby = await fetchJson(page, { url: "/api/d3/nearby?areaId=area-a" });
  expect(nearby.json).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ userId: "me" })]),
  );
});

test("@phase-d3 permission denied before start is rejected", async ({ page }) => {
  const result = await startPresence(page, { permission: "denied" });
  expect(result.status).toBe(403);
  expect(result.json).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
});

test("@phase-d3 permission loss unpublishes nearby but keeps the friend snapshot visible", async ({
  page,
}) => {
  const started = await startPresence(page, {
    audience: { mode: "selected", groupIds: [], friendIds: ["hailang"] },
  });
  const sessionId = (started.json as { presenceSession: { id: string } }).presenceSession.id;

  const lost = await syncLocation(page, sessionId, {
    zoneId: "area-a",
    motion: "offline",
    permission: "revoked",
  });
  expect(lost.status).toBe(200);
  expect(lost.json).toMatchObject({
    nearbyPresence: null,
    friendLocationSnapshot: { zoneId: "area-a" },
    currentDomainState: "PERMISSION_LOST",
  });

  await seedAuthSession(page, "hailang");
  const bobSnapshot = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(bobSnapshot.status).toBe(200);
  expect(bobSnapshot.json).toMatchObject({ zoneId: "area-a" });
});

test("@phase-d3 block during active session revokes snapshot and nearby access immediately", async ({
  page,
}) => {
  await startPresence(page, {
    audience: { mode: "selected", groupIds: [], friendIds: ["hailang"] },
  });

  await seedAuthSession(page, "hailang");
  await startPresence(page);
  const beforeBlock = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(beforeBlock.status).toBe(200);

  await seedAuthSession(page, "me");
  const block = await fetchJson(page, {
    url: "/api/d2/blocks",
    method: "POST",
    body: { targetUserId: "hailang" },
  });
  expect(block.status).toBe(200);

  await seedAuthSession(page, "hailang");
  const afterBlock = await fetchJson(page, { url: "/api/d3/friend-snapshots/me" });
  expect(afterBlock.status).toBe(403);

  const nearby = await fetchJson(page, { url: "/api/d3/nearby" });
  expect(nearby.json).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ userId: "me" })]),
  );
});

test("@phase-d3 reload reconstructs presence from the server without duplicating the session", async ({
  page,
}) => {
  const started = await startPresence(page);
  const sessionId = (started.json as { presenceSession: { id: string } }).presenceSession.id;

  await page.goto("/nearby");
  await page.reload();

  const mePresence = await fetchJson(page, { url: "/api/d3/presence/me" });
  expect(mePresence.status).toBe(200);
  expect(mePresence.json).toMatchObject({
    presenceSession: { id: sessionId },
    nearbyPresence: { presenceSessionId: sessionId },
  });
});
