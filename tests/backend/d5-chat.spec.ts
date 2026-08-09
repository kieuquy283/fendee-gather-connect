import { expect, test, type Browser, type Page } from "@playwright/test";
import { resetD2ServerState, seedAuthSession } from "../gather-v2/helpers";

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

async function resetD5ServerState(page: Page) {
  await page.goto("/auth");
  await page.evaluate(async () => {
    await fetch("/api/dev/auth/session", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userId: "alice-owner",
        status: "active",
      }),
    });
    await fetch("/api/dev/d5/reset", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "reset",
      }),
    });
  });
}

async function resetWorld(page: Page, userId = "me") {
  await seedAuthSession(page, userId);
  await resetD2ServerState(page);
  await resetD5ServerState(page);
  await seedAuthSession(page, userId);
}

async function getDebugChat(page: Page) {
  const response = await fetchJson(page, { url: "/api/dev/d5/debug-state" });
  expect(response.status).toBe(200);
  return response.json as {
    conversations: Array<{ id: string; updatedAt: string; lastMessageId: string | null }>;
    participants: Array<{
      conversationId: string;
      userId: string;
      lastReadMessageId: string | null;
    }>;
    messages: Array<{
      id: string;
      conversationId: string;
      senderId: string;
      body: string;
      clientMessageId: string;
    }>;
  };
}

test.beforeEach(async ({ page }) => {
  await resetWorld(page);
});

test("@phase-d5 participants can read their own conversation and strangers are denied", async ({
  page,
}) => {
  let response = await fetchJson(page, { url: "/api/d5/conversations" });
  expect(response.status).toBe(200);
  expect(
    (response.json as { conversations: Array<{ id: string }> }).conversations.length,
  ).toBeGreaterThan(0);

  response = await fetchJson(page, { url: "/api/d5/conversations/c1" });
  expect(response.status).toBe(200);
  expect((response.json as { id: string }).id).toBe("c1");

  await seedAuthSession(page, "annanguyen");
  response = await fetchJson(page, { url: "/api/d5/conversations/c1" });
  expect(response.status).toBe(403);
});

test("@phase-d5 direct conversation creation is unique and respects privacy and block rules", async ({
  page,
}) => {
  let response = await fetchJson(page, {
    url: "/api/d5/conversations/direct",
    method: "POST",
    body: { targetUserId: "hailang" },
  });
  expect(response.status).toBe(200);
  expect((response.json as { id: string }).id).toBe("c1");

  response = await fetchJson(page, {
    url: "/api/d5/conversations/direct",
    method: "POST",
    body: { targetUserId: "annanguyen" },
  });
  expect(response.status).toBe(403);

  response = await fetchJson(page, {
    url: "/api/d5/conversations/direct",
    method: "POST",
    body: { targetUserId: "baongoc" },
  });
  expect(response.status).toBe(403);
});

test("@phase-d5 empty messages are rejected and foreign conversation sends are forbidden", async ({
  page,
}) => {
  let response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: {
      body: "   ",
      clientMessageId: "empty-message",
    },
  });
  expect(response.status).toBe(400);

  await seedAuthSession(page, "annanguyen");
  response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: {
      body: "Spoof attempt",
      clientMessageId: "foreign-send",
    },
  });
  expect(response.status).toBe(403);
});

test("@phase-d5 duplicate send with the same client message id does not create duplicates", async ({
  page,
}) => {
  const before = await getDebugChat(page);
  const beforeCount = before.messages.length;

  const payload = {
    body: "Retry-safe hello",
    clientMessageId: "dup-send-1",
  };

  let response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: payload,
  });
  expect(response.status).toBe(200);
  const firstId = (response.json as { id: string }).id;

  response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: payload,
  });
  expect(response.status).toBe(200);
  expect((response.json as { id: string }).id).toBe(firstId);

  const after = await getDebugChat(page);
  expect(after.messages.length).toBe(beforeCount + 1);
  expect(
    after.messages.filter((message) => message.clientMessageId === payload.clientMessageId),
  ).toHaveLength(1);
});

test("@phase-d5 reload and cross-user replies preserve shared server state", async ({ page }) => {
  let response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: {
      body: "Alice says hello from D5",
      clientMessageId: "reload-alice-1",
    },
  });
  expect(response.status).toBe(200);

  await page.reload();

  response = await fetchJson(page, { url: "/api/d5/conversations/c1/messages" });
  expect(response.status).toBe(200);
  expect(
    (response.json as { items: Array<{ body: string }> }).items.some(
      (message) => message.body === "Alice says hello from D5",
    ),
  ).toBe(true);

  await seedAuthSession(page, "hailang");
  response = await fetchJson(page, { url: "/api/d5/conversations/c1/messages" });
  expect(response.status).toBe(200);
  expect(
    (response.json as { items: Array<{ body: string }> }).items.some(
      (message) => message.body === "Alice says hello from D5",
    ),
  ).toBe(true);

  response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: {
      body: "Bob replies from D5",
      clientMessageId: "reload-bob-1",
    },
  });
  expect(response.status).toBe(200);

  await seedAuthSession(page, "me");
  response = await fetchJson(page, { url: "/api/d5/conversations/c1/messages" });
  expect(response.status).toBe(200);
  expect(
    (response.json as { items: Array<{ body: string }> }).items.some(
      (message) => message.body === "Bob replies from D5",
    ),
  ).toBe(true);
});

test("@phase-d5 cross-user reads do not mutate conversation state", async ({ page }) => {
  const before = await getDebugChat(page);
  const beforeJson = JSON.stringify(before);

  await seedAuthSession(page, "hailang");
  let response = await fetchJson(page, { url: "/api/d5/conversations/c1" });
  expect(response.status).toBe(200);
  response = await fetchJson(page, { url: "/api/d5/conversations/c1/messages" });
  expect(response.status).toBe(200);

  await seedAuthSession(page, "me");
  const after = await getDebugChat(page);
  expect(JSON.stringify(after)).toBe(beforeJson);
});

test("@phase-d5 auth session rotation for the same user keeps existing conversation state", async ({
  page,
}) => {
  let response = await fetchJson(page, {
    url: "/api/d5/conversations/c1/messages",
    method: "POST",
    body: {
      body: "Persist across session rotation",
      clientMessageId: "session-rotation-1",
    },
  });
  expect(response.status).toBe(200);

  await seedAuthSession(page, "me");

  response = await fetchJson(page, { url: "/api/d5/conversations/c1/messages" });
  expect(response.status).toBe(200);
  expect(
    (response.json as { items: Array<{ body: string }> }).items.some(
      (message) => message.body === "Persist across session rotation",
    ),
  ).toBe(true);

  response = await fetchJson(page, { url: "/api/d5/conversations" });
  expect(response.status).toBe(200);
  expect(
    (response.json as { conversations: Array<{ id: string }> }).conversations.some(
      (conversation) => conversation.id === "c1",
    ),
  ).toBe(true);
});

test("@phase-d5 test worlds stay isolated", async ({ browser }) => {
  const pageA = await createIsolatedPage(browser);
  const pageB = await createIsolatedPage(browser);

  try {
    await resetWorld(pageA);
    await resetWorld(pageB);

    let response = await fetchJson(pageA, {
      url: "/api/d5/conversations/c1/messages",
      method: "POST",
      body: {
        body: "World A only",
        clientMessageId: "world-a-1",
      },
    });
    expect(response.status).toBe(200);

    response = await fetchJson(pageA, { url: "/api/d5/conversations/c1/messages" });
    expect(
      (response.json as { items: Array<{ body: string }> }).items.some(
        (message) => message.body === "World A only",
      ),
    ).toBe(true);

    response = await fetchJson(pageB, { url: "/api/d5/conversations/c1/messages" });
    expect(
      (response.json as { items: Array<{ body: string }> }).items.some(
        (message) => message.body === "World A only",
      ),
    ).toBe(false);
  } finally {
    await pageA.context().close();
    await pageB.context().close();
  }
});

async function createIsolatedPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}
