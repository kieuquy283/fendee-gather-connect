import { expect, test, type Page } from "@playwright/test";
import { seedAuthSession, waitForApp } from "./helpers";

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
      ...(body
        ? {
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(body),
          }
        : {}),
    };

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

test("@phase-d-auth protected request without session returns UNAUTHENTICATED", async ({
  page,
}) => {
  await page.goto("/auth");
  await waitForApp(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  const result = await fetchJson(page, { url: "/api/auth/me" });
  expect(result.status).toBe(401);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "UNAUTHENTICATED",
    },
  });
});

test("@phase-d-auth valid session resolves authenticated actor and ignores query userId spoofing", async ({
  page,
}) => {
  await seedAuthSession(page, "me");
  const result = await fetchJson(page, { url: "/api/auth/me?userId=hailang" });

  expect(result.status).toBe(200);
  expect(result.json).toMatchObject({
    actorUserId: "me",
    queryUserId: "hailang",
  });
});

test("@phase-d-auth expired session is rejected server-side", async ({ page }) => {
  await seedAuthSession(page, "me", true);
  const result = await fetchJson(page, { url: "/api/auth/me" });

  expect(result.status).toBe(401);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "SESSION_EXPIRED",
    },
  });
});

test("@phase-d-auth revoked session is rejected server-side", async ({ page }) => {
  await page.goto("/auth");
  await waitForApp(page);

  await fetchJson(page, {
    url: "/api/dev/auth/session",
    method: "POST",
    body: {
      userId: "alice-owner",
      status: "revoked",
    },
  });

  const result = await fetchJson(page, { url: "/api/auth/me" });
  expect(result.status).toBe(401);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "SESSION_REVOKED",
    },
  });
});

test("@phase-d-auth malformed session cookie is rejected", async ({ page, baseURL }) => {
  await page.context().addCookies([
    {
      name: "fendee_session",
      value: "not-a-real-session",
      url: baseURL!,
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/auth");
  await waitForApp(page);

  const result = await fetchJson(page, { url: "/api/auth/me" });
  expect(result.status).toBe(401);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "UNAUTHENTICATED",
    },
  });
});

test("@phase-d-auth session expiry while app is open transitions provider out of authenticated state", async ({
  page,
}) => {
  await seedAuthSession(page, "me");
  await page.goto("/home");
  await waitForApp(page);
  await expect(page.getByTestId("auth-required")).toHaveCount(0);

  const expire = await fetchJson(page, {
    url: "/api/dev/auth/session",
    method: "POST",
    body: {
      action: "expire-current",
    },
  });
  expect(expire.status).toBe(200);

  await expect(page.getByTestId("auth-required")).toBeVisible({ timeout: 6_000 });
  await expect(page.getByText("Session expired")).toBeVisible();
});

test("@phase-d-auth logout invalidates the active session", async ({ page }) => {
  await seedAuthSession(page, "me");
  await page.goto("/settings");
  await waitForApp(page);
  await page.getByRole("button", { name: "Logout" }).click();
  await waitForApp(page);

  const result = await fetchJson(page, { url: "/api/auth/me" });
  expect(result.status).toBe(401);
  expect(result.json).toMatchObject({
    ok: false,
    error: {
      code: "UNAUTHENTICATED",
    },
  });

  await page.goBack();
  await waitForApp(page);
  await expect(page.getByTestId("auth-required")).toBeVisible();
});
