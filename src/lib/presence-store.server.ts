import { ApiError } from "./api-errors";
import { getPresenceZone } from "./location-zones";
import type {
  DeviceMotionState,
  FriendAudience,
  FriendLocationSnapshot,
  LocationSample,
  MyPresenceState,
  NearbyPersonMarker,
  NearbyPresence,
  PresenceDomainState,
  PresenceSession,
  PresenceSessionStatus,
  PresenceZoneId,
  VisibleFriendLocationSnapshot,
} from "./presence-contracts";

type PresenceStoreSnapshot = {
  sessions: Map<string, PresenceSessionRecord>;
  nearbyPresence: Map<string, NearbyPresence>;
  friendSnapshots: Map<string, FriendLocationSnapshot>;
  clockOffsetMs: number;
};

type PresenceSessionRecord = PresenceSession & {
  currentAreaId: PresenceZoneId | null;
  currentLocationSample: LocationSample | null;
};

export type PresenceDebugSnapshot = {
  userId: string;
  presenceSessionId: string | null;
  presenceSessionUserId: string | null;
  presenceSessionStatus: string | null;
  currentArea: PresenceZoneId | null;
  previousArea: PresenceZoneId | null;
  latestAcceptedLocationSample: LocationSample | null;
  nearbyAreaId: PresenceZoneId | null;
  nearbyUpdatedAt: string | null;
  nearbyExpiresAt: string | null;
  friendSnapshotArea: PresenceZoneId | null;
  friendSnapshotUpdatedAt: string | null;
};

const GLOBAL_PRESENCE_STORE_KEY = Symbol.for("fendee.server-presence-store");

const globalPresenceStore = globalThis as typeof globalThis & {
  [GLOBAL_PRESENCE_STORE_KEY]?: Map<string, PresenceStoreSnapshot>;
};

export const presenceConfig = {
  maxAccuracyMeters: 80,
  stableDwellMs: 90_000,
  maxSampleAgeMs: 2 * 60_000,
  nearbyTtlMs: 75_000,
  defaultDurationMs: 2 * 60 * 60 * 1000,
};

const fixtureMarkersByArea: Record<PresenceZoneId, NearbyPersonMarker[]> = {
  "area-a": [
    {
      userId: "hailang",
      areaId: "area-a",
      x: 30,
      y: 26,
      meters: 15,
      place: "The Coffee House Thai Ha",
    },
    {
      userId: "minhtu",
      areaId: "area-a",
      x: 70,
      y: 34,
      meters: 40,
      place: "The Coffee House Thai Ha",
    },
    { userId: "gialong", areaId: "area-a", x: 22, y: 68, meters: 65, place: "Via he Thai Ha" },
    { userId: "hoanglan", areaId: "area-a", x: 76, y: 72, meters: 90, place: "Thu vien Lang Ha" },
  ],
  "area-b": [
    { userId: "hailang", areaId: "area-b", x: 70, y: 30, meters: 18, place: "Lang Ha Library" },
    { userId: "minhtu", areaId: "area-b", x: 35, y: 40, meters: 32, place: "Lang Ha Library" },
  ],
  "area-c": [],
};

function createPresenceStore(): PresenceStoreSnapshot {
  return {
    sessions: new Map<string, PresenceSessionRecord>(),
    nearbyPresence: new Map<string, NearbyPresence>(),
    friendSnapshots: new Map<string, FriendLocationSnapshot>(),
    clockOffsetMs: 0,
  };
}

function getPresenceRegistry() {
  if (!globalPresenceStore[GLOBAL_PRESENCE_STORE_KEY]) {
    globalPresenceStore[GLOBAL_PRESENCE_STORE_KEY] = new Map<string, PresenceStoreSnapshot>();
  }
  return globalPresenceStore[GLOBAL_PRESENCE_STORE_KEY];
}

function getPresenceStore(bucketId = "global") {
  const registry = getPresenceRegistry();
  const existing = registry.get(bucketId);
  if (existing) return existing;
  const created = createPresenceStore();
  registry.set(bucketId, created);
  return created;
}

export function nowIso(bucketId?: string) {
  const store = getPresenceStore(bucketId);
  return new Date(Date.now() + store.clockOffsetMs).toISOString();
}

export function resetPresenceStoreForTesting(bucketId = "global") {
  getPresenceRegistry().set(bucketId, createPresenceStore());
  return { ok: true as const, bucketId };
}

export function advancePresenceClockForTesting(ms: number, bucketId = "global") {
  const store = getPresenceStore(bucketId);
  store.clockOffsetMs += ms;
  return { ok: true as const, bucketId, clockOffsetMs: store.clockOffsetMs };
}

function sessionVisible(session: PresenceSessionRecord, bucketId?: string) {
  return (
    session.status !== "stopped" &&
    session.status !== "expired" &&
    Date.parse(session.expiresAt) > Date.parse(nowIso(bucketId))
  );
}

export function isUsableLocationSample(
  sample: LocationSample,
  bucketId?: string,
): { ok: boolean; motion: DeviceMotionState } {
  const ageMs = Date.parse(nowIso(bucketId)) - Date.parse(sample.capturedAt);
  if (sample.motion === "offline") return { ok: false, motion: "offline" };
  if (ageMs > presenceConfig.maxSampleAgeMs) return { ok: false, motion: "moving" };
  if (sample.accuracyMeters > presenceConfig.maxAccuracyMeters) {
    return { ok: false, motion: "inaccurate" };
  }
  if (sample.dwellMs < presenceConfig.stableDwellMs) return { ok: false, motion: "moving" };
  return { ok: true, motion: "stable" };
}

function toDomainState(input: {
  status: PresenceSessionStatus;
  currentAreaId: PresenceZoneId | null;
  friendSnapshotZoneId: PresenceZoneId | null;
}): PresenceDomainState {
  if (input.status === "starting") return "STARTING";
  if (input.status === "moving") return "MOVING";
  if (input.status === "permission_lost") return "PERMISSION_LOST";
  if (input.status === "expired") return "EXPIRED";
  if (input.status === "stopped") return "OFF";
  if (input.status === "error") return "ERROR";
  if (
    input.currentAreaId &&
    input.friendSnapshotZoneId &&
    input.currentAreaId !== input.friendSnapshotZoneId
  ) {
    return "FRIEND_SNAPSHOT_OUTDATED";
  }
  return "ACTIVE_AREA";
}

export function listPresenceSessions(bucketId?: string) {
  return [...getPresenceStore(bucketId).sessions.values()];
}

export function listFriendSnapshots(bucketId?: string) {
  return [...getPresenceStore(bucketId).friendSnapshots.values()];
}

export function listNearbyPresenceRecords(bucketId?: string) {
  return [...getPresenceStore(bucketId).nearbyPresence.values()];
}

export function getPresenceSessionById(sessionId: string, bucketId?: string) {
  return getPresenceStore(bucketId).sessions.get(sessionId) ?? null;
}

export function getActivePresenceSessionForUser(userId: string, bucketId?: string) {
  return (
    listPresenceSessions(bucketId)
      .filter((session) => session.userId === userId)
      .filter((session) => sessionVisible(session, bucketId))
      .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null
  );
}

export function upsertPresenceSession(record: PresenceSessionRecord, bucketId?: string) {
  getPresenceStore(bucketId).sessions.set(record.id, record);
  return record;
}

export function putNearbyPresence(record: NearbyPresence, bucketId?: string) {
  getPresenceStore(bucketId).nearbyPresence.set(record.presenceSessionId, record);
  return record;
}

export function removeNearbyPresence(sessionId: string, bucketId?: string) {
  getPresenceStore(bucketId).nearbyPresence.delete(sessionId);
}

export function getNearbyPresence(sessionId: string, bucketId?: string) {
  return getPresenceStore(bucketId).nearbyPresence.get(sessionId) ?? null;
}

export function listNearbyPresence(bucketId?: string) {
  const now = Date.parse(nowIso(bucketId));
  return [...getPresenceStore(bucketId).nearbyPresence.values()].filter(
    (record) => Date.parse(record.expiresAt) > now,
  );
}

export function putFriendSnapshot(record: FriendLocationSnapshot, bucketId?: string) {
  getPresenceStore(bucketId).friendSnapshots.set(record.presenceSessionId, record);
  return record;
}

export function getFriendSnapshotBySession(sessionId: string, bucketId?: string) {
  return getPresenceStore(bucketId).friendSnapshots.get(sessionId) ?? null;
}

export function findFriendSnapshotByOwner(ownerUserId: string, bucketId?: string) {
  return (
    [...getPresenceStore(bucketId).friendSnapshots.values()].find(
      (snapshot) => snapshot.ownerUserId === ownerUserId && snapshot.visible,
    ) ?? null
  );
}

export function listVisibleFriendSnapshotsByRecipient(recipientUserId: string, bucketId?: string) {
  return [...getPresenceStore(bucketId).friendSnapshots.values()]
    .filter((snapshot) => snapshot.visible && snapshot.audienceUserIds.includes(recipientUserId))
    .map(
      (snapshot) =>
        ({
          ownerUserId: snapshot.ownerUserId,
          placeLabel: snapshot.placeLabel,
          zoneId: snapshot.zoneId,
          updatedAt: snapshot.updatedAt,
          sharedWithYou: true,
        }) satisfies VisibleFriendLocationSnapshot,
    );
}

export function projectMyPresence(userId: string, bucketId?: string): MyPresenceState {
  const session = getActivePresenceSessionForUser(userId, bucketId);
  const nearby = session ? getNearbyPresence(session.id, bucketId) : null;
  const snapshot = session ? getFriendSnapshotBySession(session.id, bucketId) : null;
  const currentArea = session?.currentAreaId ? getPresenceZone(session.currentAreaId) : null;
  return {
    permission: session?.permissionState ?? "prompt",
    presenceSession: session
      ? {
          ...session,
          domainState: toDomainState({
            status: session.status,
            currentAreaId: session.currentAreaId,
            friendSnapshotZoneId: snapshot?.zoneId ?? null,
          }),
        }
      : null,
    nearbyPresence: nearby,
    friendLocationSnapshot: snapshot,
    currentArea,
    currentLocationSample: session?.currentLocationSample ?? null,
    currentDomainState: session
      ? toDomainState({
          status: session.status,
          currentAreaId: session.currentAreaId,
          friendSnapshotZoneId: snapshot?.zoneId ?? null,
        })
      : "OFF",
    friendSnapshotOutdated: Boolean(
      session && snapshot && session.currentAreaId && snapshot.zoneId !== session.currentAreaId,
    ),
  };
}

export function getPresenceDebugSnapshot(userId: string, bucketId?: string): PresenceDebugSnapshot {
  const session = getActivePresenceSessionForUser(userId, bucketId);
  const nearby = session ? getNearbyPresence(session.id, bucketId) : null;
  const snapshot = session ? getFriendSnapshotBySession(session.id, bucketId) : null;
  return {
    userId,
    presenceSessionId: session?.id ?? null,
    presenceSessionUserId: session?.userId ?? null,
    presenceSessionStatus: session?.status ?? null,
    currentArea: session?.currentAreaId ?? null,
    previousArea:
      session?.currentLocationSample &&
      session.currentAreaId &&
      session.currentLocationSample.zoneId !== session.currentAreaId
        ? session.currentLocationSample.zoneId
        : null,
    latestAcceptedLocationSample: session?.currentLocationSample ?? null,
    nearbyAreaId: nearby?.areaId ?? null,
    nearbyUpdatedAt: nearby?.updatedAt ?? null,
    nearbyExpiresAt: nearby?.expiresAt ?? null,
    friendSnapshotArea: snapshot?.zoneId ?? null,
    friendSnapshotUpdatedAt: snapshot?.updatedAt ?? null,
  };
}

export function cleanupExpiredPresence(bucketId?: string) {
  const store = getPresenceStore(bucketId);
  const now = Date.parse(nowIso(bucketId));
  for (const session of store.sessions.values()) {
    if (session.status !== "stopped" && Date.parse(session.expiresAt) <= now) {
      store.sessions.set(session.id, {
        ...session,
        status: "expired",
        domainState: "EXPIRED",
        endedAt: session.endedAt ?? new Date(now).toISOString(),
      });
      store.nearbyPresence.delete(session.id);
      const snapshot = store.friendSnapshots.get(session.id);
      if (snapshot) {
        store.friendSnapshots.set(session.id, {
          ...snapshot,
          visible: false,
        });
      }
    }
  }
  for (const nearby of [...store.nearbyPresence.values()]) {
    if (Date.parse(nearby.expiresAt) <= now) {
      store.nearbyPresence.delete(nearby.presenceSessionId);
    }
  }
}

export function makePresenceSessionRecord(input: {
  sessionId: string;
  userId: string;
  permissionState: PresenceSession["permissionState"];
  audience: FriendAudience;
  audienceUserIds: string[];
  location: LocationSample;
  status: PresenceSessionStatus;
  currentAreaId: PresenceZoneId | null;
  bucketId?: string;
}) {
  const startedAt = nowIso(input.bucketId);
  return {
    id: input.sessionId,
    userId: input.userId,
    status: input.status,
    domainState: "STARTING" as const,
    startedAt,
    expiresAt: new Date(Date.parse(startedAt) + presenceConfig.defaultDurationMs).toISOString(),
    endedAt: null,
    permissionState: input.permissionState,
    notificationSent: true,
    friendAudience: input.audience,
    audienceUserIds: input.audienceUserIds,
    currentAreaId: input.currentAreaId,
    currentLocationSample: input.location,
  } satisfies PresenceSessionRecord;
}

export function makeNearbyPresenceRecord(input: {
  sessionId: string;
  userId: string;
  areaId: PresenceZoneId;
  bucketId?: string;
}) {
  const updatedAt = nowIso(input.bucketId);
  return {
    userId: input.userId,
    presenceSessionId: input.sessionId,
    areaId: input.areaId,
    placeLabel: getPresenceZone(input.areaId).nearbyLabel,
    publishedAt: updatedAt,
    updatedAt,
    expiresAt: new Date(Date.parse(updatedAt) + presenceConfig.nearbyTtlMs).toISOString(),
  } satisfies NearbyPresence;
}

export function makeFriendSnapshotRecord(input: {
  sessionId: string;
  ownerUserId: string;
  zoneId: PresenceZoneId;
  audienceUserIds: string[];
  bucketId?: string;
}) {
  return {
    id: `friend-snapshot-${input.sessionId}`,
    presenceSessionId: input.sessionId,
    ownerUserId: input.ownerUserId,
    zoneId: input.zoneId,
    placeLabel: getPresenceZone(input.zoneId).label,
    updatedAt: nowIso(input.bucketId),
    visible: true,
    audienceUserIds: [...input.audienceUserIds],
  } satisfies FriendLocationSnapshot;
}

export function getFixtureMarkers(areaId: PresenceZoneId) {
  return fixtureMarkersByArea[areaId];
}

export function requirePresenceSessionOwner(
  actorUserId: string,
  sessionId: string,
  bucketId?: string,
) {
  const session = getPresenceSessionById(sessionId, bucketId);
  if (!session) {
    throw new ApiError("NOT_FOUND", "Khong tim thay presence session.", 404);
  }
  if (session.userId !== actorUserId) {
    throw new ApiError("FORBIDDEN", "Ban khong so huu presence session nay.", 403);
  }
  return session;
}
