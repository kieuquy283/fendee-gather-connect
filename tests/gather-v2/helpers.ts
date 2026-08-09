import { expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";

export const visualDir = path.join(process.cwd(), "reports", "gather-v2-visual");

export async function waitForApp(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    if ("fonts" in document) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
  });
  expect(overflow, "page should not horizontally overflow").toBeLessThanOrEqual(1);
}

export async function capture(page: Page, testInfo: TestInfo, fileName390: string) {
  await waitForApp(page);
  await assertNoHorizontalOverflow(page);
  await page.evaluate(() => {
    if (document.getElementById("playwright-fullpage-screenshot-style")) return;
    const style = document.createElement("style");
    style.id = "playwright-fullpage-screenshot-style";
    style.textContent = ".sticky{position:static!important}";
    document.head.append(style);
  });
  const width = page.viewportSize()?.width;
  const fileName =
    width === 390 ? fileName390 : fileName390.replace("-390.png", `-${testInfo.project.name}.png`);
  await page.screenshot({
    path: path.join(visualDir, fileName),
    fullPage: true,
    animations: "disabled",
  });
}

export async function clearGatherStorage(page: Page) {
  await seedAuthSession(page, "me");
  await resetD2ServerState(page);
  await resetD3ServerState(page);
  await resetD4ServerState(page);
  await page.evaluate(() => {
    window.localStorage.removeItem("fendee-privacy-state-v1");
    window.localStorage.removeItem("fendee-theme");
  });
}

export async function resetD2ServerState(page: Page) {
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
    await fetch("/api/dev/d2/reset", {
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

export async function resetD3ServerState(page: Page) {
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
    await fetch("/api/dev/d3/reset", {
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

export async function resetD4ServerState(page: Page) {
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
    await fetch("/api/dev/d4/reset", {
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

export async function seedGatherState(page: Page, state: unknown) {
  await page.goto("/auth");
  await page.evaluate(async (value) => {
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
    await fetch("/api/dev/d4/seed", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        state: value,
      }),
    });
    window.localStorage.setItem("fendee-theme", "light");
  }, state);
}

export async function seedAuthSession(page: Page, userId = "me", expired = false) {
  await page.goto("/auth");
  await page.evaluate(
    async ({ id, isExpired }) => {
      const fixtureUserId =
        id === "me"
          ? "alice-owner"
          : id === "hailang"
            ? "bob-friend"
            : id === "minhtu"
              ? "cara-cohost"
              : id === "tuananh"
                ? "dan-invitee"
                : id === "baongoc"
                  ? "erin-blocked"
                  : id === "annanguyen"
                    ? "frank-stranger"
                    : id;

      await fetch("/api/dev/auth/session", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: fixtureUserId,
          status: isExpired ? "expired" : "active",
        }),
      });

      window.localStorage.setItem("fendee-theme", "light");
    },
    { id: userId, isExpired: expired },
  );
}

export async function seedPrivacyState(page: Page, blockedUserIds: string[]) {
  await resetD2ServerState(page);
  await seedAuthSession(page, "me");
  await page.evaluate(async (ids) => {
    for (const targetUserId of ids) {
      await fetch("/api/d2/blocks", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetUserId,
        }),
      });
    }
  }, blockedUserIds);
}

export async function seedGatherStateIfMissing(page: Page, state: unknown) {
  await seedGatherState(page, state);
}

export async function setGatherState(page: Page, state: unknown) {
  await seedGatherState(page, state);
}

export function qaState() {
  const now = new Date("2026-08-09T12:00:00.000Z").toISOString();
  const future = Date.now() + 2 * 60 * 60 * 1000;
  const past = Date.now() - 60 * 60 * 1000;

  return {
    gathers: [
      {
        id: "qa-owner",
        ownerId: "me",
        title: "Owner QA Gather",
        note: "Kiểm tra owner quản lý Gather với danh sách dài.",
        place: "The Coffee House Thái Hà",
        distance: "Khu vực hiện tại",
        startsIn: "Đang mở",
        duration: "2 giờ",
        expiresAt: "Đến 21:30",
        expiresAtMs: future,
        status: "live",
        hosts: [
          {
            personId: "me",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
          {
            personId: "hailang",
            role: "cohost",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
          {
            personId: "minhtu",
            role: "cohost",
            cohostStatus: "pending",
            invitedAt: now,
          },
          {
            personId: "tuananh",
            role: "cohost",
            cohostStatus: "declined",
            invitedAt: now,
            respondedAt: now,
          },
        ],
        invites: [
          invite("qa-owner", "linhchi", "going", now),
          invite("qa-owner", "quanghuy", "maybe", now),
          invite("qa-owner", "tuananh", "declined", now),
          invite("qa-owner", "hailang", "sent", now),
        ],
        audienceSnapshot: {
          source: "mixed",
          selectedGroupIds: ["coffee-loop", "study-crew"],
          selectedFriendIds: ["tuananh", "hailang"],
          resolvedRecipientIds: ["linhchi", "quanghuy", "tuananh", "hailang"],
          resolvedAt: now,
        },
        slots: 8,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "qa-cohost",
        ownerId: "hailang",
        title: "Co-host QA Gather",
        note: "Me là co-host đã accepted.",
        place: "Lang Ha Library",
        distance: "Cách 120m",
        startsIn: "Đang mở",
        duration: "1 giờ",
        expiresAt: "Đến 20:30",
        expiresAtMs: future,
        status: "live",
        hosts: [
          {
            personId: "hailang",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
          {
            personId: "me",
            role: "cohost",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
        ],
        invites: [invite("qa-cohost", "minhtu", "sent", now)],
        audienceSnapshot: {
          source: "selected_friends",
          selectedGroupIds: [],
          selectedFriendIds: ["minhtu"],
          resolvedRecipientIds: ["minhtu"],
          resolvedAt: now,
        },
        slots: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "qa-pending-cohost",
        ownerId: "hailang",
        title: "Pending Co-host QA Gather",
        note: "Me đang được mời cùng tạo.",
        place: "The Coffee House Thái Hà",
        distance: "Cách 90m",
        startsIn: "Đang mở",
        duration: "1 giờ",
        expiresAt: "Đến 20:00",
        expiresAtMs: future,
        status: "live",
        hosts: [
          {
            personId: "hailang",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
          {
            personId: "me",
            role: "cohost",
            cohostStatus: "pending",
            invitedAt: now,
          },
        ],
        invites: [invite("qa-pending-cohost", "me", "sent", now)],
        audienceSnapshot: {
          source: "selected_friends",
          selectedGroupIds: [],
          selectedFriendIds: ["me"],
          resolvedRecipientIds: ["me"],
          resolvedAt: now,
        },
        slots: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "qa-invitee",
        ownerId: "hailang",
        title: "Invitee QA Gather",
        note: "Me là invitee để kiểm tra RSVP.",
        place: "Dreamplex Láng Hạ",
        distance: "Cách 200m",
        startsIn: "Đang mở",
        duration: "1 giờ",
        expiresAt: "Đến 19:45",
        expiresAtMs: future,
        status: "live",
        hosts: [
          {
            personId: "hailang",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
        ],
        invites: [invite("qa-invitee", "me", "sent", now)],
        audienceSnapshot: {
          source: "selected_friends",
          selectedGroupIds: [],
          selectedFriendIds: ["me"],
          resolvedRecipientIds: ["me"],
          resolvedAt: now,
        },
        slots: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "qa-normal",
        ownerId: "hailang",
        title: "Normal Viewer QA Gather",
        note: "Me không phải host hoặc invitee.",
        place: "Quiet Corner",
        distance: "Cách 300m",
        startsIn: "Đang mở",
        duration: "1 giờ",
        expiresAt: "Đến 18:45",
        expiresAtMs: future,
        status: "live",
        hosts: [
          {
            personId: "hailang",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
        ],
        invites: [invite("qa-normal", "minhtu", "sent", now)],
        audienceSnapshot: {
          source: "selected_friends",
          selectedGroupIds: [],
          selectedFriendIds: ["minhtu"],
          resolvedRecipientIds: ["minhtu"],
          resolvedAt: now,
        },
        slots: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "qa-expired",
        ownerId: "hailang",
        title: "Expired QA Gather",
        note: "Gather này đã hết hạn.",
        place: "Old Cafe",
        distance: "Cách 600m",
        startsIn: "Đã hết hạn",
        duration: "30 phút",
        expiresAt: "Đã hết hạn",
        expiresAtMs: past,
        status: "expired",
        hosts: [
          {
            personId: "hailang",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: now,
            respondedAt: now,
          },
        ],
        invites: [invite("qa-expired", "me", "sent", now)],
        audienceSnapshot: {
          source: "selected_friends",
          selectedGroupIds: [],
          selectedFriendIds: ["me"],
          resolvedRecipientIds: ["me"],
          resolvedAt: now,
        },
        slots: 4,
        createdAt: now,
        updatedAt: now,
      },
    ],
    notifications: [
      notification("COHOST_INVITE", "qa-pending-cohost", "hailang", "me"),
      notification("GATHER_INVITE", "qa-invitee", "hailang", "me"),
      notification("GATHER_UPDATED", "qa-invitee", "hailang", "me"),
      notification("GATHER_EXPIRING", "qa-invitee", "hailang", "me"),
      notification("GATHER_ENDED", "qa-expired", "hailang", "me"),
      notification("COHOST_ACCEPTED", "qa-owner", "hailang", "me"),
      notification("COHOST_DECLINED", "qa-owner", "minhtu", "me"),
      notification("RSVP_GOING", "qa-owner", "linhchi", "me"),
      notification("RSVP_MAYBE", "qa-owner", "quanghuy", "me"),
      notification("RSVP_DECLINED", "qa-owner", "tuananh", "me"),
    ],
  };
}

function invite(gatherId: string, personId: string, status: string, now: string) {
  return {
    id: `${gatherId}-${personId}`,
    gatherId,
    personId,
    status,
    source: "mixed",
    sourceLabels: ["QA"],
    sentAt: now,
    updatedAt: now,
  };
}

function notification(type: string, gatherId: string, actorId: string, recipientId: string) {
  return {
    id: `${type}-${gatherId}-${actorId}-${recipientId}`,
    type,
    gatherId,
    actorId,
    recipientId,
    title: type.replaceAll("_", " "),
    body: "QA notification body without precise lock-screen place.",
    pushBody: "Bạn có cập nhật Gather mới trên Fendee.",
    time: "vừa xong",
    unread: true,
    deepLink: `/gather/${gatherId}`,
  };
}
