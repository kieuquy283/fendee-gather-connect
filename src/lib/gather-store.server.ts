import { ApiError } from "./api-errors";
import { gathers as legacyGathers, me, people } from "./fendee-data";
import type {
  CohostStatus,
  Gather,
  GatherAudienceSelection,
  GatherAudienceSnapshot,
  GatherAudienceSource,
  GatherHost,
  GatherInvite,
  GatherNotification,
  GatherNotificationType,
  GatherStatus,
  InviteStatus,
} from "./gather-contracts";

type GatherStoreSnapshot = {
  gathers: Map<string, Gather>;
  notifications: Map<string, GatherNotification>;
};

const GLOBAL_GATHER_STORE_KEY = Symbol.for("fendee.server-gather-store");
type GatherStoreRegistry = Map<string, GatherStoreSnapshot>;

const seedNowMs = Date.parse("2026-08-09T09:00:00.000Z");

function nowIso() {
  return new Date().toISOString();
}

function hoursFromSeed(hours: number) {
  return seedNowMs + hours * 60 * 60 * 1000;
}

function getAudienceSource(selection: GatherAudienceSelection): GatherAudienceSource {
  if (selection.includeAllFriends && (selection.groupIds.length || selection.friendIds.length)) {
    return "mixed";
  }
  if (selection.includeAllFriends) return "all_friends";
  if (selection.groupIds.length && selection.friendIds.length) return "mixed";
  if (selection.groupIds.length) return "groups";
  return "selected_friends";
}

function makeInvite(
  gatherId: string,
  personId: string,
  status: InviteStatus,
  source: GatherAudienceSource,
  sourceLabels: string[],
  timestamp: string,
): GatherInvite {
  return {
    id: `${gatherId}-${personId}`,
    gatherId,
    personId,
    status,
    source,
    sourceLabels,
    sentAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeNotification(input: {
  type: GatherNotificationType;
  gatherId: string;
  actorId: string;
  recipientId: string;
  title: string;
  body: string;
  pushBody?: string;
  time?: string;
  unread?: boolean;
}): GatherNotification {
  return {
    id: `${input.type}-${input.gatherId}-${input.actorId}-${input.recipientId}`,
    type: input.type,
    gatherId: input.gatherId,
    actorId: input.actorId,
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    pushBody: input.pushBody ?? "Ban co cap nhat Gather moi tren Fendee.",
    time: input.time ?? "vua xong",
    unread: input.unread ?? true,
    deepLink: `/gather/${input.gatherId}`,
  };
}

function seedGathers(): Gather[] {
  const seeded = legacyGathers.map<Gather>((gather, index) => {
    const source: GatherAudienceSource =
      gather.audience === "friends"
        ? "all_friends"
        : gather.audience === "selected"
          ? "selected_friends"
          : "mixed";
    const inviteIds = [...new Set([me.id, ...gather.joined])].filter((id) => id !== gather.hostId);
    const createdAt = new Date(seedNowMs + index * 60_000).toISOString();
    const hosts: GatherHost[] = [
      {
        personId: gather.hostId,
        role: "owner",
        cohostStatus: "accepted",
        invitedAt: createdAt,
        respondedAt: createdAt,
      },
    ];

    if (gather.id === "g3") {
      hosts.push({
        personId: me.id,
        role: "cohost",
        cohostStatus: "pending",
        invitedAt: createdAt,
      });
    }

    return {
      id: gather.id,
      ownerId: gather.hostId,
      title: gather.title,
      note: gather.note,
      place: gather.place,
      distance: gather.distance,
      startsIn: gather.startsIn,
      duration: gather.duration,
      expiresAt: gather.expiresAt,
      expiresAtMs: gather.status === "expired" ? seedNowMs - 3600_000 : hoursFromSeed(index + 1),
      status: gather.status === "expired" ? "expired" : "live",
      hosts,
      invites: inviteIds.map((id) =>
        makeInvite(
          gather.id,
          id,
          gather.joined.includes(id) ? "going" : "sent",
          source,
          [gather.audience === "friends" ? "Tat ca ban be" : "Du lieu mau"],
          createdAt,
        ),
      ),
      audienceSnapshot: {
        source,
        selectedGroupIds: [],
        selectedFriendIds: gather.audience === "selected" ? gather.joined : [],
        resolvedRecipientIds: inviteIds,
        resolvedAt: createdAt,
      },
      slots: gather.slots,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const createdAt = new Date(seedNowMs - 60_000).toISOString();
  seeded.unshift({
    id: "g-me",
    ownerId: me.id,
    title: "Ca phe lam viec chung",
    note: "Minh ngoi tang 2, ai ranh qua lam cung mot tieng.",
    place: "The Coffee House Thai Ha",
    distance: "Cach 80m",
    startsIn: "Dang mo",
    duration: "2 gio",
    expiresAt: "Den 21:30",
    expiresAtMs: hoursFromSeed(2),
    status: "live",
    hosts: [
      {
        personId: me.id,
        role: "owner",
        cohostStatus: "accepted",
        invitedAt: createdAt,
        respondedAt: createdAt,
      },
      {
        personId: "hailang",
        role: "cohost",
        cohostStatus: "accepted",
        invitedAt: createdAt,
        respondedAt: createdAt,
      },
      {
        personId: "minhtu",
        role: "cohost",
        cohostStatus: "pending",
        invitedAt: createdAt,
      },
    ],
    invites: ["linhchi", "quanghuy", "tuananh"].map((id, index) =>
      makeInvite(
        "g-me",
        id,
        index === 0 ? "going" : index === 1 ? "maybe" : "sent",
        "mixed",
        ["Coffee loop", "Ban duoc chon"],
        createdAt,
      ),
    ),
    audienceSnapshot: {
      source: "mixed",
      selectedGroupIds: ["coffee-loop"],
      selectedFriendIds: ["tuananh"],
      resolvedRecipientIds: ["linhchi", "quanghuy", "tuananh"],
      resolvedAt: createdAt,
    },
    slots: 8,
    createdAt,
    updatedAt: createdAt,
  });

  return seeded;
}

function initialNotifications(gathers: Gather[]): GatherNotification[] {
  const pendingCohost = gathers.find((gather) =>
    gather.hosts.some((host) => host.personId === me.id && host.cohostStatus === "pending"),
  );
  const directInvite = gathers.find((gather) =>
    gather.invites.some((invite) => invite.personId === me.id),
  );
  const notices: GatherNotification[] = [];

  if (pendingCohost) {
    notices.push(
      makeNotification({
        type: "COHOST_INVITE",
        gatherId: pendingCohost.id,
        actorId: pendingCohost.ownerId,
        recipientId: me.id,
        title: `${people.find((person) => person.id === pendingCohost.ownerId)?.name ?? "Ban be"} moi ban cung tao mot Gather`,
        body: pendingCohost.title,
      }),
    );
  }

  if (directInvite) {
    notices.push(
      makeNotification({
        type: "GATHER_INVITE",
        gatherId: directInvite.id,
        actorId: directInvite.ownerId,
        recipientId: me.id,
        title: "Ban co loi moi Gather",
        body: `${directInvite.title} · mo trong app de xem dia diem`,
      }),
    );
  }

  return notices;
}

function createSeedStore(): GatherStoreSnapshot {
  const seededGathers = seedGathers();
  return {
    gathers: new Map(seededGathers.map((gather) => [gather.id, gather])),
    notifications: new Map(
      initialNotifications(seededGathers).map((notification) => [notification.id, notification]),
    ),
  };
}

const globalGatherStore = globalThis as typeof globalThis & {
  [GLOBAL_GATHER_STORE_KEY]?: GatherStoreRegistry;
};

function getGatherStoreRegistry(): GatherStoreRegistry {
  if (!globalGatherStore[GLOBAL_GATHER_STORE_KEY]) {
    globalGatherStore[GLOBAL_GATHER_STORE_KEY] = new Map<string, GatherStoreSnapshot>();
  }
  return globalGatherStore[GLOBAL_GATHER_STORE_KEY];
}

function getGatherStore(bucketId = "global") {
  const registry = getGatherStoreRegistry();
  const existing = registry.get(bucketId);
  if (existing) return existing;
  const seeded = createSeedStore();
  registry.set(bucketId, seeded);
  return seeded;
}

export function gatherNowIso() {
  return nowIso();
}

export function resetGatherStoreForTesting(bucketId = "global") {
  const snapshot = createSeedStore();
  getGatherStoreRegistry().set(bucketId, snapshot);
  return {
    ok: true as const,
    bucketId,
    gatherCount: snapshot.gathers.size,
    notificationCount: snapshot.notifications.size,
  };
}

export function seedGatherStoreForTesting(
  state: { gathers: Gather[]; notifications: GatherNotification[] },
  bucketId = "global",
) {
  const snapshot: GatherStoreSnapshot = {
    gathers: new Map(state.gathers.map((gather) => [gather.id, gather])),
    notifications: new Map(
      state.notifications.map((notification) => [notification.id, notification]),
    ),
  };
  getGatherStoreRegistry().set(bucketId, snapshot);
  return {
    ok: true as const,
    bucketId,
    gatherCount: snapshot.gathers.size,
    notificationCount: snapshot.notifications.size,
  };
}

export function listGatherRecords(bucketId?: string) {
  return [...getGatherStore(bucketId).gathers.values()];
}

export function getGatherRecord(gatherId: string, bucketId?: string) {
  return getGatherStore(bucketId).gathers.get(gatherId) ?? null;
}

export function requireGatherRecord(gatherId: string, bucketId?: string) {
  const gather = getGatherRecord(gatherId, bucketId);
  if (!gather) {
    throw new ApiError("NOT_FOUND", "Khong tim thay Gather.", 404);
  }
  return gather;
}

export function upsertGatherRecord(gather: Gather, bucketId?: string) {
  getGatherStore(bucketId).gathers.set(gather.id, gather);
  return gather;
}

export function deleteGatherRecord(gatherId: string, bucketId?: string) {
  getGatherStore(bucketId).gathers.delete(gatherId);
}

export function listGatherNotifications(bucketId?: string) {
  return [...getGatherStore(bucketId).notifications.values()];
}

export function upsertGatherNotification(notification: GatherNotification, bucketId?: string) {
  getGatherStore(bucketId).notifications.set(notification.id, notification);
  return notification;
}

export function upsertGatherNotifications(notifications: GatherNotification[], bucketId?: string) {
  const store = getGatherStore(bucketId);
  for (const notification of notifications) {
    store.notifications.set(notification.id, notification);
  }
  return notifications;
}

export function getGatherDebugSnapshot(gatherId: string, bucketId?: string) {
  return getGatherRecord(gatherId, bucketId);
}

export function computeGatherAudienceSource(selection: GatherAudienceSelection) {
  return getAudienceSource(selection);
}

export function makeGatherInviteRecord(input: {
  gatherId: string;
  personId: string;
  status: InviteStatus;
  source: GatherAudienceSource;
  sourceLabels: string[];
  timestamp: string;
}) {
  return makeInvite(
    input.gatherId,
    input.personId,
    input.status,
    input.source,
    input.sourceLabels,
    input.timestamp,
  );
}

export function makeGatherNotificationRecord(input: {
  type: GatherNotificationType;
  gatherId: string;
  actorId: string;
  recipientId: string;
  title: string;
  body: string;
  pushBody?: string;
  time?: string;
  unread?: boolean;
}) {
  return makeNotification(input);
}

export function mergeRecipientIds(snapshot: GatherAudienceSnapshot, additions: string[]) {
  return [...new Set([...snapshot.resolvedRecipientIds, ...additions])];
}

export function toGatherStatus(gather: Gather, nowMs = Date.now()): GatherStatus {
  if (gather.status === "ended") return "ended";
  if (gather.expiresAtMs <= nowMs) return "expired";
  return gather.status;
}
