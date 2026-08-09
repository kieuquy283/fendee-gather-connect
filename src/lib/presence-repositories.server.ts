import { ApiError } from "./api-errors";
import { getPresenceZone } from "./location-zones";
import type {
  FriendAudience,
  LocationSample,
  MyPresenceState,
  NearbyPersonMarker,
  VisibleFriendLocationSnapshot,
} from "./presence-contracts";
import {
  makeFriendSnapshotRecord,
  makeNearbyPresenceRecord,
  makePresenceSessionRecord,
  cleanupExpiredPresence,
  getPresenceDebugSnapshot,
  findFriendSnapshotByOwner,
  getActivePresenceSessionForUser,
  getFixtureMarkers,
  isUsableLocationSample,
  listPresenceSessions,
  presenceConfig,
  listVisibleFriendSnapshotsByRecipient,
  nowIso,
  projectMyPresence,
  putFriendSnapshot,
  putNearbyPresence,
  removeNearbyPresence,
  requirePresenceSessionOwner,
  resetPresenceStoreForTesting,
  upsertPresenceSession,
  advancePresenceClockForTesting,
} from "./presence-store.server";
import { getRequestBucketId, requireAuthContext } from "./server-auth.server";
import { areFriends, isBlockedEitherDirection } from "./social-authorization.server";
import { getPrivacyRecord, getUserRecord, listGroupRecords } from "./social-store.server";

function tracePresence(
  label: string,
  input: {
    testWorldId: string;
    authenticatedUserId: string;
    targetUserId?: string;
  },
) {
  const snapshot = getPresenceDebugSnapshot(
    input.targetUserId ?? input.authenticatedUserId,
    input.testWorldId,
  );
  console.log(
    JSON.stringify({
      type: "d3-trace",
      label,
      testWorldId: input.testWorldId,
      authenticatedUserId: input.authenticatedUserId,
      ...snapshot,
    }),
  );
}

function actorContext() {
  const auth = requireAuthContext();
  return {
    actorUserId: auth.actorUserId,
    bucketId: getRequestBucketId(auth.session.id),
  };
}

function resolveActorContext(actorUserId?: string, bucketId?: string) {
  if (actorUserId) {
    return {
      actorUserId,
      bucketId: bucketId ?? "global",
    };
  }
  return actorContext();
}

function resolveAudienceUserIds(actorUserId: string, audience: FriendAudience, bucketId: string) {
  const fromGroups =
    audience.mode === "groups" || audience.mode === "selected"
      ? listGroupRecords(bucketId)
          .filter((group) => group.ownerUserId === actorUserId)
          .filter((group) => audience.groupIds.includes(group.id))
          .flatMap((group) => group.memberIds)
      : [];
  const candidateIds =
    audience.mode === "all_friends"
      ? listGroupRecords(bucketId)
          .filter((group) => group.ownerUserId === actorUserId)
          .flatMap((group) => group.memberIds)
      : [...fromGroups, ...audience.friendIds];

  return [...new Set(candidateIds)]
    .filter((targetId) => targetId !== actorUserId)
    .filter((targetId) => areFriends(actorUserId, targetId, bucketId))
    .filter((targetId) => !isBlockedEitherDirection(actorUserId, targetId, bucketId));
}

function enforceStartPermission(permission: MyPresenceState["permission"]) {
  if (permission === "denied" || permission === "revoked" || permission === "unavailable") {
    throw new ApiError("FORBIDDEN", "Ban can cap quyen vi tri de bat hien dien.", 403);
  }
}

function applyLocationToSession(
  sessionId: string,
  actorUserId: string,
  location: LocationSample,
  permission: MyPresenceState["permission"],
  bucketId: string,
) {
  const current = requirePresenceSessionOwner(actorUserId, sessionId, bucketId);
  cleanupExpiredPresence(bucketId);

  if (current.status === "expired" || current.status === "stopped") {
    throw new ApiError("EXPIRED", "Presence session da ket thuc.", 410);
  }

  if (permission === "denied" || permission === "revoked" || permission === "unavailable") {
    removeNearbyPresence(sessionId, bucketId);
    const next = upsertPresenceSession(
      {
        ...current,
        status: "permission_lost",
        domainState: "PERMISSION_LOST",
        permissionState: permission,
        currentLocationSample: location,
      },
      bucketId,
    );
    return projectMyPresence(next.userId, bucketId);
  }

  const usability = isUsableLocationSample(location, bucketId);
  const stableAreaId = usability.ok ? location.zoneId : null;
  const nextStatus = usability.ok ? "active" : "moving";

  const next = upsertPresenceSession(
    {
      ...current,
      status: nextStatus,
      permissionState: permission,
      currentAreaId: stableAreaId ?? current.currentAreaId,
      currentLocationSample: location,
    },
    bucketId,
  );

  if (stableAreaId) {
    putNearbyPresence(
      makeNearbyPresenceRecord({
        sessionId,
        userId: actorUserId,
        areaId: stableAreaId,
        bucketId,
      }),
      bucketId,
    );
  } else {
    removeNearbyPresence(sessionId, bucketId);
  }

  return projectMyPresence(next.userId, bucketId);
}

export function startPresence(
  input: {
    audience: FriendAudience;
    location: LocationSample;
    permission: MyPresenceState["permission"];
  },
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  tracePresence("startPresence:before", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  cleanupExpiredPresence(actor.bucketId);
  enforceStartPermission(input.permission);

  const existing = getActivePresenceSessionForUser(actor.actorUserId, actor.bucketId);
  if (existing) {
    return applyLocationToSession(
      existing.id,
      actor.actorUserId,
      input.location,
      input.permission,
      actor.bucketId,
    );
  }

  const audienceUserIds = resolveAudienceUserIds(actor.actorUserId, input.audience, actor.bucketId);
  const usability = isUsableLocationSample(input.location, actor.bucketId);
  const sessionId = `presence-${crypto.randomUUID()}`;
  const session = makePresenceSessionRecord({
    sessionId,
    userId: actor.actorUserId,
    permissionState: input.permission,
    audience: input.audience,
    audienceUserIds,
    location: input.location,
    status: usability.ok ? "active" : "starting",
    currentAreaId: usability.ok ? input.location.zoneId : null,
    bucketId: actor.bucketId,
  });
  upsertPresenceSession(session, actor.bucketId);
  putFriendSnapshot(
    makeFriendSnapshotRecord({
      sessionId,
      ownerUserId: actor.actorUserId,
      zoneId: input.location.zoneId,
      audienceUserIds,
      bucketId: actor.bucketId,
    }),
    actor.bucketId,
  );
  if (usability.ok) {
    putNearbyPresence(
      makeNearbyPresenceRecord({
        sessionId,
        userId: actor.actorUserId,
        areaId: input.location.zoneId,
        bucketId: actor.bucketId,
      }),
      actor.bucketId,
    );
  }
  tracePresence("startPresence:after", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  return projectMyPresence(actor.actorUserId, actor.bucketId);
}

export function syncPresenceLocation(
  input: {
    sessionId: string;
    location: LocationSample;
    permission: MyPresenceState["permission"];
  },
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  tracePresence("syncPresenceLocation:before", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  const result = applyLocationToSession(
    input.sessionId,
    actor.actorUserId,
    input.location,
    input.permission,
    actor.bucketId,
  );
  tracePresence("syncPresenceLocation:after", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  return result;
}

export function stopPresence(sessionId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const session = requirePresenceSessionOwner(actor.actorUserId, sessionId, actor.bucketId);
  removeNearbyPresence(sessionId, actor.bucketId);
  const snapshot = findFriendSnapshotByOwner(actor.actorUserId, actor.bucketId);
  if (snapshot && snapshot.presenceSessionId === sessionId) {
    putFriendSnapshot({ ...snapshot, visible: false }, actor.bucketId);
  }
  upsertPresenceSession(
    {
      ...session,
      status: "stopped",
      domainState: "OFF",
      endedAt: nowIso(actor.bucketId),
    },
    actor.bucketId,
  );
  return projectMyPresence(actor.actorUserId, actor.bucketId);
}

export function getMyPresence(actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  cleanupExpiredPresence(actor.bucketId);
  tracePresence("getMyPresence", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  return projectMyPresence(actor.actorUserId, actor.bucketId);
}

export function updateFriendLocationSnapshot(
  input: { sessionId: string; notifyAgain: boolean },
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  tracePresence("updateFriendLocationSnapshot:before", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  const session = requirePresenceSessionOwner(actor.actorUserId, input.sessionId, actor.bucketId);
  if (session.status === "expired" || session.status === "stopped") {
    throw new ApiError("EXPIRED", "Presence session da ket thuc.", 410);
  }
  const location = session.currentLocationSample;
  if (!location) {
    throw new ApiError("CONFLICT", "Chua co mau vi tri hop le de cap nhat snapshot.", 409);
  }
  putFriendSnapshot(
    makeFriendSnapshotRecord({
      sessionId: input.sessionId,
      ownerUserId: actor.actorUserId,
      zoneId: location.zoneId,
      audienceUserIds: session.audienceUserIds,
      bucketId: actor.bucketId,
    }),
    actor.bucketId,
  );
  tracePresence("updateFriendLocationSnapshot:after", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
  });
  return projectMyPresence(actor.actorUserId, actor.bucketId);
}

export function getNearbyPeople(
  actorUserId?: string,
  bucketId?: string,
  areaIdOverride?: "area-a" | "area-b" | "area-c",
): NearbyPersonMarker[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  cleanupExpiredPresence(actor.bucketId);
  const me = getMyPresence(actor.actorUserId, actor.bucketId);
  const areaId = areaIdOverride ?? me.nearbyPresence?.areaId ?? me.currentArea?.id;
  if (!areaId) return [];

  const markers = new Map<string, NearbyPersonMarker>();
  for (const marker of getFixtureMarkers(areaId)) {
    markers.set(marker.userId, marker);
  }

  const now = Date.parse(nowIso(actor.bucketId));
  for (const session of listPresenceSessions(actor.bucketId)) {
    if (session.userId === actor.actorUserId) continue;
    if (session.status !== "active") continue;
    if (session.currentAreaId !== areaId) continue;
    if (!session.currentLocationSample) continue;
    if (!isUsableLocationSample(session.currentLocationSample, actor.bucketId).ok) continue;
    if (now - Date.parse(session.currentLocationSample.capturedAt) > presenceConfig.nearbyTtlMs) {
      continue;
    }
    markers.set(session.userId, {
      userId: session.userId,
      areaId,
      x: 52,
      y: 38,
      meters: 20,
      place: getPresenceZone(areaId).nearbyLabel,
    });
  }

  return [...markers.values()].filter((marker) => {
    const target = getUserRecord(marker.userId, actor.bucketId);
    if (!target) return false;
    if (isBlockedEitherDirection(actor.actorUserId, marker.userId, actor.bucketId)) return false;
    const privacy = getPrivacyRecord(marker.userId, actor.bucketId);
    if (!privacy.showInNearby) return false;
    return true;
  });
}

export function listVisibleFriendSnapshots(
  actorUserId?: string,
  bucketId?: string,
): VisibleFriendLocationSnapshot[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  cleanupExpiredPresence(actor.bucketId);
  return listVisibleFriendSnapshotsByRecipient(actor.actorUserId, actor.bucketId).filter(
    (snapshot) =>
      areFriends(actor.actorUserId, snapshot.ownerUserId, actor.bucketId) &&
      !isBlockedEitherDirection(actor.actorUserId, snapshot.ownerUserId, actor.bucketId),
  );
}

export function getFriendLocationSnapshot(
  ownerUserId: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  cleanupExpiredPresence(actor.bucketId);
  tracePresence("getFriendLocationSnapshot", {
    testWorldId: actor.bucketId,
    authenticatedUserId: actor.actorUserId,
    targetUserId: ownerUserId,
  });
  const snapshot = findFriendSnapshotByOwner(ownerUserId, actor.bucketId);
  if (!snapshot || !snapshot.visible) {
    throw new ApiError("NOT_FOUND", "Khong tim thay friend snapshot dang chia se.", 404);
  }
  if (!snapshot.audienceUserIds.includes(actor.actorUserId)) {
    throw new ApiError("FORBIDDEN", "Ban khong nam trong audience cua snapshot nay.", 403);
  }
  if (!areFriends(actor.actorUserId, ownerUserId, actor.bucketId)) {
    throw new ApiError("FORBIDDEN", "Khong con quan he ban be hop le.", 403);
  }
  if (isBlockedEitherDirection(actor.actorUserId, ownerUserId, actor.bucketId)) {
    throw new ApiError("FORBIDDEN", "Snapshot nay khong con kha dung.", 403);
  }
  return {
    ownerUserId,
    placeLabel: snapshot.placeLabel,
    zoneId: snapshot.zoneId,
    updatedAt: snapshot.updatedAt,
    sharedWithYou: true as const,
  };
}

export function seedPresenceStateForTesting(
  input: {
    permission: MyPresenceState["permission"];
    location: LocationSample;
    audience?: FriendAudience;
    startActiveSession?: boolean;
  },
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  resetPresenceStoreForTesting(actor.bucketId);
  if (input.startActiveSession) {
    return startPresence(
      {
        audience: input.audience ?? { mode: "all_friends", groupIds: [], friendIds: [] },
        location: input.location,
        permission: input.permission,
      },
      actor.actorUserId,
      actor.bucketId,
    );
  }
  return getMyPresence(actor.actorUserId, actor.bucketId);
}

export function resetPresenceStateDevOnly(actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  return resetPresenceStoreForTesting(actor.bucketId);
}

export function advancePresenceClockDevOnly(ms: number, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  return advancePresenceClockForTesting(ms, actor.bucketId);
}
