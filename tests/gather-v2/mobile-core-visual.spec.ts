import { test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  assertNoHorizontalOverflow,
  seedAuthSession,
  seedGatherState,
  waitForApp,
} from "./helpers";

const visualRoot = path.join(process.cwd(), "reports", "mobile-review", "visual");
const fixedNow = "2026-08-09T12:00:00.000Z";

type CaptureCase = {
  route: string;
  group: string;
  file: string;
  auth?: boolean;
  withPresence?: boolean;
  withGather?: boolean;
};

const cases: CaptureCase[] = [
  { route: "/", group: "entry", file: "splash-390.png", auth: false },
  { route: "/onboarding", group: "entry", file: "onboarding-390.png", auth: false },
  { route: "/auth", group: "entry", file: "auth-390.png", auth: false },
  { route: "/setup-profile", group: "profile", file: "setup-profile-390.png" },
  { route: "/add-friend", group: "friends", file: "add-friend-390.png" },
  { route: "/home", group: "home", file: "home-390.png", withPresence: true },
  { route: "/tram", group: "home", file: "tram-390.png", withPresence: true },
  { route: "/nearby", group: "nearby", file: "nearby-390.png", withPresence: true },
  { route: "/nearby/filters", group: "nearby", file: "nearby-filters-390.png", withPresence: true },
  { route: "/gather", group: "gather", file: "gather-list-390.png", withGather: true },
  { route: "/gather/new", group: "gather", file: "gather-create-390.png", withGather: true },
  { route: "/gather/qa-owner", group: "gather", file: "gather-detail-390.png", withGather: true },
  {
    route: "/gather/qa-owner/manage",
    group: "gather",
    file: "gather-manage-390.png",
    withGather: true,
  },
  { route: "/chat", group: "chat", file: "chat-list-390.png" },
  { route: "/chat/c1", group: "chat", file: "chat-detail-390.png" },
  { route: "/profile", group: "profile", file: "profile-self-390.png", withPresence: true },
  { route: "/profile/hailang", group: "profile", file: "profile-other-390.png" },
  { route: "/friends", group: "friends", file: "friends-390.png" },
  { route: "/friends/requests", group: "friends", file: "friend-requests-390.png" },
  {
    route: "/notifications",
    group: "notifications",
    file: "notifications-390.png",
    withGather: true,
    withPresence: true,
  },
  { route: "/settings/privacy", group: "settings", file: "privacy-390.png", withPresence: true },
  {
    route: "/widgets",
    group: "widgets",
    file: "widgets-390.png",
    withPresence: true,
    withGather: true,
  },
];

function ensureDir(group: string) {
  const dir = path.join(visualRoot, group);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fileNameForProject(testInfo: TestInfo, fileName390: string) {
  return fileName390.replace("-390.png", `-${testInfo.project.name}.png`);
}

async function captureRoute(page: Page, testInfo: TestInfo, group: string, fileName390: string) {
  await waitForApp(page);
  await assertNoHorizontalOverflow(page);
  await page.evaluate(() => {
    if (document.getElementById("playwright-fullpage-screenshot-style")) return;
    const style = document.createElement("style");
    style.id = "playwright-fullpage-screenshot-style";
    style.textContent = ".sticky{position:static!important}";
    document.head.append(style);
  });

  await page.screenshot({
    path: path.join(ensureDir(group), fileNameForProject(testInfo, fileName390)),
    fullPage: true,
    animations: "disabled",
  });
}

async function seedPublicState(page: Page) {
  await page.addInitScript(
    ({ now }) => {
      window.localStorage.removeItem("fendee-dev-auth-session-v1");
      window.localStorage.removeItem("fendee-gather-state-v2");
      window.localStorage.removeItem("fendee-presence-state");
      window.localStorage.removeItem("fendee-privacy-state-v1");
      window.localStorage.setItem("fendee-theme", "light");
      window.localStorage.setItem("fendee-qa-now", now);
    },
    { now: fixedNow },
  );
}

async function seedActivePresence(page: Page) {
  await page.addInitScript(
    ({ now }) => {
      const zone = {
        id: "area-a",
        label: "Area A - The Coffee House Nguyễn Chí Thanh",
        shortLabel: "Area A",
        nearbyLabel: "The Coffee House Nguyễn Chí Thanh",
      };
      window.localStorage.setItem(
        "fendee-presence-state",
        JSON.stringify({
          version: 1,
          deviceLocation: {
            zone,
            accuracyMeters: 18,
            motion: "stable",
            dwellMs: 180000,
            updatedAt: now,
          },
          friendLocationSnapshot: { zone, updatedAt: now },
          nearbyPresenceLocation: { zone, publishedAt: now },
          selectedFriendAudience: { mode: "all_friends", groupIds: [], friendIds: [] },
          currentNearbyZone: zone,
          presenceSession: {
            id: "presence-qa",
            status: "active",
            startedAt: now,
            expiresAt: "2026-08-09T15:00:00.000Z",
            notificationSent: true,
          },
          permission: "granted",
        }),
      );
    },
    { now: fixedNow },
  );
}

function qaGatherState() {
  const notificationTime = "vừa xong";
  const ownerTitle = "Cafe cuối tuần cùng mọi người trong nhóm";
  return {
    gathers: [
      {
        id: "qa-owner",
        ownerId: "me",
        title: ownerTitle,
        note: "Nguyễn Hoàng Minh Phương mang theo board game, ai rảnh ghé nhé.",
        place: "The Coffee House Signature Nguyễn Chí Thanh",
        distance: "Khu vực hiện tại",
        startsIn: "Đang mở",
        duration: "2 giờ",
        expiresAt: "Đến 21:30",
        expiresAtMs: Date.parse("2026-08-09T14:00:00.000Z"),
        status: "live",
        hosts: [
          {
            personId: "me",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: fixedNow,
            respondedAt: fixedNow,
          },
          {
            personId: "hailang",
            role: "cohost",
            cohostStatus: "accepted",
            invitedAt: fixedNow,
            respondedAt: fixedNow,
          },
          {
            personId: "minhtu",
            role: "cohost",
            cohostStatus: "pending",
            invitedAt: fixedNow,
          },
        ],
        invites: [
          invite("qa-owner", "linhchi", "going"),
          invite("qa-owner", "quanghuy", "maybe"),
          invite("qa-owner", "tuananh", "declined"),
          invite("qa-owner", "hailang", "sent"),
        ],
        audienceSnapshot: {
          source: "mixed",
          selectedGroupIds: ["coffee-loop", "study-crew"],
          selectedFriendIds: ["tuananh", "hailang"],
          resolvedRecipientIds: ["linhchi", "quanghuy", "tuananh", "hailang"],
          resolvedAt: fixedNow,
        },
        slots: 8,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
      {
        id: "qa-expired",
        ownerId: "hailang",
        title: "Gather đã hết hạn để kiểm tra trạng thái",
        note: "Giữ lại làm ảnh kiểm tra trạng thái đã hết hạn.",
        place: "Trạm cũ",
        distance: "Cách 600m",
        startsIn: "Đã hết hạn",
        duration: "30 phút",
        expiresAt: "Đã hết hạn",
        expiresAtMs: Date.parse("2026-08-09T10:00:00.000Z"),
        status: "expired",
        hosts: [
          {
            personId: "hailang",
            role: "owner",
            cohostStatus: "accepted",
            invitedAt: fixedNow,
            respondedAt: fixedNow,
          },
        ],
        invites: [invite("qa-expired", "me", "sent")],
        audienceSnapshot: {
          source: "selected_friends",
          selectedGroupIds: [],
          selectedFriendIds: ["me"],
          resolvedRecipientIds: ["me"],
          resolvedAt: fixedNow,
        },
        slots: 4,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    ],
    notifications: [
      notification("COHOST_INVITE", "qa-owner", "hailang", "me", notificationTime),
      notification("RSVP_GOING", "qa-owner", "linhchi", "me", notificationTime),
      notification("RSVP_MAYBE", "qa-owner", "quanghuy", "me", notificationTime),
      notification("GATHER_ENDED", "qa-expired", "hailang", "me", notificationTime),
    ],
  };
}

function invite(gatherId: string, personId: string, status: string) {
  return {
    id: `${gatherId}-${personId}`,
    gatherId,
    personId,
    status,
    source: "mixed",
    sourceLabels: ["QA"],
    sentAt: fixedNow,
    updatedAt: fixedNow,
  };
}

function notification(
  type: string,
  gatherId: string,
  actorId: string,
  recipientId: string,
  time: string,
) {
  return {
    id: `${type}-${gatherId}-${actorId}-${recipientId}`,
    type,
    gatherId,
    actorId,
    recipientId,
    title: type.replaceAll("_", " "),
    body: "Cập nhật Gather để kiểm tra ảnh chụp toàn ứng dụng.",
    pushBody: "Bạn có cập nhật Gather mới trên Fendee.",
    time,
    unread: true,
    deepLink: `/gather/${gatherId}`,
  };
}

test.describe("@mobile-visual @phase-c-closeout whole-app mobile screenshots", () => {
  for (const item of cases) {
    test(`${item.route} captures cleanly`, async ({ page }, testInfo) => {
      if (item.auth === false) {
        await seedPublicState(page);
      } else {
        await seedAuthSession(page, "me");
      }

      if (item.withPresence) {
        await seedActivePresence(page);
      }

      if (item.withGather) {
        await seedGatherState(page, qaGatherState());
      }

      await page.goto(item.route);
      await captureRoute(page, testInfo, item.group, item.file);
    });
  }
});
