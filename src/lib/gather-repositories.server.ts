import { ApiError } from "./api-errors";
import type {
  CohostStatus,
  CreateGatherInput,
  Gather,
  GatherAudienceSelection,
  GatherAudienceSnapshot,
  GatherHost,
  GatherNotification,
  GatherPermission,
  InviteStatus,
} from "./gather-contracts";
import {
  computeGatherAudienceSource,
  gatherNowIso,
  getGatherRecord,
  listGatherNotifications,
  listGatherRecords,
  makeGatherInviteRecord,
  makeGatherNotificationRecord,
  mergeRecipientIds,
  requireGatherRecord,
  resetGatherStoreForTesting,
  seedGatherStoreForTesting,
  toGatherStatus,
  upsertGatherNotifications,
  upsertGatherRecord,
} from "./gather-store.server";
import { getRequestBucketId, requireAuthContext } from "./server-auth.server";
import { areFriends, isBlockedEitherDirection } from "./social-authorization.server";
import { getPrivacyRecord, getUserRecord, listGroupRecords } from "./social-store.server";

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

type ResolutionResult = {
  source: Gather["audienceSnapshot"]["source"];
  selectedGroupIds: string[];
  selectedFriendIds: string[];
  resolvedRecipientIds: string[];
  selectedGroupLabels: string[];
  selectedFriendLabels: string[];
};

function formatExpiry(duration: string, expiresAtMs: number) {
  return `Den ${new Date(expiresAtMs).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function sanitizeGatherPatch(
  patch: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>;
}

function durationToMs(duration: string) {
  if (duration.includes("30")) return 30 * 60 * 1000;
  if (duration.includes("3")) return 3 * 60 * 60 * 1000;
  if (duration.includes("2")) return 2 * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

function canViewGatherRecord(actorUserId: string, gather: Gather, bucketId: string) {
  if (gather.ownerId === actorUserId) return true;
  if (isBlockedEitherDirection(actorUserId, gather.ownerId, bucketId)) return false;
  if (
    gather.hosts.some((host) => host.personId === actorUserId && host.cohostStatus !== "declined")
  ) {
    return true;
  }
  if (gather.invites.some((invite) => invite.personId === actorUserId)) return true;
  return false;
}

function canManageGatherRecord(actorUserId: string, gather: Gather, bucketId: string) {
  if (!canViewGatherRecord(actorUserId, gather, bucketId)) return false;
  if (toGatherStatus(gather) !== "live") return false;
  return gather.hosts.some(
    (host) => host.personId === actorUserId && host.cohostStatus === "accepted",
  );
}

function canGatherPermission(
  actorUserId: string,
  gather: Gather,
  permission: GatherPermission,
  bucketId: string,
) {
  if (!canManageGatherRecord(actorUserId, gather, bucketId)) return false;
  const host = gather.hosts.find(
    (item) => item.personId === actorUserId && item.cohostStatus === "accepted",
  );
  if (!host) return false;
  if (host.role === "owner") return true;
  return [
    "edit_content",
    "edit_note",
    "edit_image",
    "edit_place",
    "edit_expiry",
    "view_rsvp",
    "publish_updates",
  ].includes(permission);
}

function materializeStatus(gather: Gather, bucketId: string) {
  const effective = toGatherStatus(gather);
  if (effective !== gather.status) {
    const next = {
      ...gather,
      status: effective,
      updatedAt: gatherNowIso(),
    } satisfies Gather;
    upsertGatherRecord(next, bucketId);
    return next;
  }
  return gather;
}

function resolveAudience(
  actorUserId: string,
  selection: GatherAudienceSelection,
  bucketId: string,
): ResolutionResult {
  const ids = new Set<string>();
  const selectedGroups = listGroupRecords(bucketId)
    .filter((group) => group.ownerUserId === actorUserId)
    .filter((group) => selection.groupIds.includes(group.id));
  const selectedGroupLabels = selectedGroups.map((group) => group.name);

  if (selection.includeAllFriends) {
    listGroupRecords(bucketId)
      .filter((group) => group.ownerUserId === actorUserId)
      .flatMap((group) => group.memberIds)
      .forEach((memberId) => ids.add(memberId));
  }

  for (const group of selectedGroups) {
    for (const memberId of group.memberIds) {
      ids.add(memberId);
    }
  }

  for (const friendId of selection.friendIds) {
    ids.add(friendId);
  }

  const resolvedRecipientIds = [...ids]
    .filter((targetId) => targetId !== actorUserId)
    .filter((targetId) => getUserRecord(targetId, bucketId))
    .filter((targetId) => areFriends(actorUserId, targetId, bucketId))
    .filter((targetId) => !isBlockedEitherDirection(actorUserId, targetId, bucketId))
    .filter((targetId) => getPrivacyRecord(targetId, bucketId).friendsOnlyGatherInvites);

  return {
    source: computeGatherAudienceSource(selection),
    selectedGroupIds: [...selection.groupIds],
    selectedFriendIds: [...selection.friendIds],
    resolvedRecipientIds,
    selectedGroupLabels,
    selectedFriendLabels: selection.friendIds
      .map((id) => getUserRecord(id, bucketId)?.name)
      .filter(Boolean) as string[],
  };
}

function createAudienceSnapshot(
  resolution: ResolutionResult,
  resolvedAt: string,
): GatherAudienceSnapshot {
  return {
    source: resolution.source,
    selectedGroupIds: resolution.selectedGroupIds,
    selectedFriendIds: resolution.selectedFriendIds,
    resolvedRecipientIds: resolution.resolvedRecipientIds,
    resolvedAt,
  };
}

function createHosts(
  actorUserId: string,
  cohostResolution: ResolutionResult,
  createdAt: string,
): GatherHost[] {
  return [
    {
      personId: actorUserId,
      role: "owner",
      cohostStatus: "accepted",
      invitedAt: createdAt,
      respondedAt: createdAt,
    },
    ...cohostResolution.resolvedRecipientIds.map((personId) => ({
      personId,
      role: "cohost" as const,
      cohostStatus: "pending" as const,
      invitedAt: createdAt,
    })),
  ];
}

function visibleNotificationsForActor(actorUserId: string, bucketId: string) {
  return listGatherNotifications(bucketId)
    .filter((notice) => notice.recipientId === actorUserId)
    .filter((notice) => !isBlockedEitherDirection(actorUserId, notice.actorId, bucketId));
}

export function getGatherState(actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gathers = listGatherRecords(actor.bucketId)
    .map((gather) => materializeStatus(gather, actor.bucketId))
    .filter((gather) => canViewGatherRecord(actor.actorUserId, gather, actor.bucketId))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const notifications = visibleNotificationsForActor(actor.actorUserId, actor.bucketId).sort(
    (left, right) => left.id.localeCompare(right.id),
  );
  return {
    gathers,
    notifications,
  };
}

export function listVisibleGathers(actorUserId?: string, bucketId?: string) {
  return getGatherState(actorUserId, bucketId).gathers;
}

export function listVisibleGatherNotifications(actorUserId?: string, bucketId?: string) {
  return getGatherState(actorUserId, bucketId).notifications;
}

export function getGatherById(gatherId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = getGatherRecord(gatherId, actor.bucketId);
  if (!gather) return null;
  const materialized = materializeStatus(gather, actor.bucketId);
  if (!canViewGatherRecord(actor.actorUserId, materialized, actor.bucketId)) {
    throw new ApiError("FORBIDDEN", "Ban khong co quyen xem Gather nay.", 403);
  }
  return materialized;
}

export function canGather(
  gatherId: string,
  permission: GatherPermission,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = requireGatherRecord(gatherId, actor.bucketId);
  return canGatherPermission(
    actor.actorUserId,
    materializeStatus(gather, actor.bucketId),
    permission,
    actor.bucketId,
  );
}

export function createGather(input: CreateGatherInput, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const createdAt = gatherNowIso();
  const inviteResolution = resolveAudience(
    actor.actorUserId,
    input.inviteSelection,
    actor.bucketId,
  );
  if (!inviteResolution.resolvedRecipientIds.length) {
    throw new ApiError("VALIDATION_ERROR", "Ban can chon it nhat mot nguoi nhan hop le.", 400);
  }
  const cohostResolution = resolveAudience(
    actor.actorUserId,
    input.cohostSelection,
    actor.bucketId,
  );
  const id = `g-${crypto.randomUUID()}`;
  const expiresAtMs = Date.now() + durationToMs(input.duration);
  const sourceLabels = [
    ...inviteResolution.selectedGroupLabels,
    ...inviteResolution.selectedFriendLabels,
    input.inviteSelection.includeAllFriends ? "Tat ca ban be" : "",
  ].filter(Boolean);

  const gather: Gather = {
    id,
    ownerId: actor.actorUserId,
    title: input.title.trim(),
    note: input.note.trim(),
    place: input.place.trim(),
    distance: "Khu vuc hien tai",
    startsIn: "Dang mo",
    duration: input.duration,
    expiresAt: formatExpiry(input.duration, expiresAtMs),
    expiresAtMs,
    status: "live",
    hosts: createHosts(actor.actorUserId, cohostResolution, createdAt),
    invites: inviteResolution.resolvedRecipientIds.map((personId) =>
      makeGatherInviteRecord({
        gatherId: id,
        personId,
        status: "sent",
        source: inviteResolution.source,
        sourceLabels,
        timestamp: createdAt,
      }),
    ),
    audienceSnapshot: createAudienceSnapshot(inviteResolution, createdAt),
    slots: Math.max(inviteResolution.resolvedRecipientIds.length + 1, 4),
    createdAt,
    updatedAt: createdAt,
  };
  upsertGatherRecord(gather, actor.bucketId);

  upsertGatherNotifications(
    [
      ...cohostResolution.resolvedRecipientIds.map((personId) =>
        makeGatherNotificationRecord({
          type: "COHOST_INVITE",
          gatherId: id,
          actorId: actor.actorUserId,
          recipientId: personId,
          title: `${getUserRecord(actor.actorUserId, actor.bucketId)?.name ?? "Ban"} moi ban cung tao mot Gather`,
          body: gather.title,
        }),
      ),
      ...inviteResolution.resolvedRecipientIds.map((personId) =>
        makeGatherNotificationRecord({
          type: "GATHER_INVITE",
          gatherId: id,
          actorId: actor.actorUserId,
          recipientId: personId,
          title: "Ban co loi moi Gather",
          body: `${gather.title} · mo trong app de xem dia diem`,
        }),
      ),
    ],
    actor.bucketId,
  );

  return id;
}

export function respondToCohostInvite(
  gatherId: string,
  status: Exclude<CohostStatus, "pending">,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = materializeStatus(requireGatherRecord(gatherId, actor.bucketId), actor.bucketId);
  const host = gather.hosts.find(
    (entry) => entry.personId === actor.actorUserId && entry.role === "cohost",
  );
  if (!host) {
    throw new ApiError("FORBIDDEN", "Ban khong nam trong danh sach co-host cua Gather nay.", 403);
  }
  if (gather.status !== "live") {
    throw new ApiError("EXPIRED", "Gather nay khong con hoat dong.", 410);
  }

  const updatedAt = gatherNowIso();
  const next: Gather = {
    ...gather,
    hosts: gather.hosts.map((entry) =>
      entry.personId === actor.actorUserId && entry.role === "cohost"
        ? { ...entry, cohostStatus: status, respondedAt: updatedAt }
        : entry,
    ),
    updatedAt,
  };
  upsertGatherRecord(next, actor.bucketId);
  upsertGatherNotifications(
    [
      makeGatherNotificationRecord({
        type: status === "accepted" ? "COHOST_ACCEPTED" : "COHOST_DECLINED",
        gatherId,
        actorId: actor.actorUserId,
        recipientId: gather.ownerId,
        title:
          status === "accepted"
            ? `${getUserRecord(actor.actorUserId, actor.bucketId)?.name ?? "Ban"} da cung tao Gather`
            : `${getUserRecord(actor.actorUserId, actor.bucketId)?.name ?? "Ban"} da tu choi cung tao Gather`,
        body: gather.title,
      }),
    ],
    actor.bucketId,
  );
  return next;
}

export function updateGatherRsvp(
  gatherId: string,
  status: InviteStatus,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = materializeStatus(requireGatherRecord(gatherId, actor.bucketId), actor.bucketId);
  if (gather.status !== "live") {
    throw new ApiError("EXPIRED", "Gather nay khong con nhan RSVP.", 410);
  }
  const invite = gather.invites.find((entry) => entry.personId === actor.actorUserId);
  if (!invite) {
    throw new ApiError("FORBIDDEN", "Ban khong the cap nhat RSVP cua Gather nay.", 403);
  }

  const updatedAt = gatherNowIso();
  const next: Gather = {
    ...gather,
    invites: gather.invites.map((entry) =>
      entry.personId === actor.actorUserId ? { ...entry, status, updatedAt } : entry,
    ),
    updatedAt,
  };
  upsertGatherRecord(next, actor.bucketId);
  upsertGatherNotifications(
    [
      makeGatherNotificationRecord({
        type:
          status === "going" ? "RSVP_GOING" : status === "maybe" ? "RSVP_MAYBE" : "RSVP_DECLINED",
        gatherId,
        actorId: actor.actorUserId,
        recipientId: gather.ownerId,
        title: `${getUserRecord(actor.actorUserId, actor.bucketId)?.name ?? "Ban"} cap nhat RSVP`,
        body: status === "going" ? "Se qua" : status === "maybe" ? "Co the qua" : "Khong tham gia",
      }),
    ],
    actor.bucketId,
  );
  return next;
}

export function updateGather(
  gatherId: string,
  patch: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = materializeStatus(requireGatherRecord(gatherId, actor.bucketId), actor.bucketId);
  const canEdit =
    ("title" in patch &&
      canGatherPermission(actor.actorUserId, gather, "edit_content", actor.bucketId)) ||
    ("note" in patch &&
      canGatherPermission(actor.actorUserId, gather, "edit_note", actor.bucketId)) ||
    ("place" in patch &&
      canGatherPermission(actor.actorUserId, gather, "edit_place", actor.bucketId)) ||
    (("duration" in patch || "expiresAt" in patch) &&
      canGatherPermission(actor.actorUserId, gather, "edit_expiry", actor.bucketId));
  if (!canEdit) {
    throw new ApiError("FORBIDDEN", "Ban khong the chinh sua Gather nay.", 403);
  }
  const nextPatch = sanitizeGatherPatch(patch);
  const next: Gather = {
    ...gather,
    ...nextPatch,
    updatedAt: gatherNowIso(),
  };
  upsertGatherRecord(next, actor.bucketId);
  return true;
}

export function inviteMore(
  gatherId: string,
  selection: GatherAudienceSelection,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = materializeStatus(requireGatherRecord(gatherId, actor.bucketId), actor.bucketId);
  if (!canGatherPermission(actor.actorUserId, gather, "invite_more", actor.bucketId)) {
    throw new ApiError("FORBIDDEN", "Ban khong the moi them nguoi vao Gather nay.", 403);
  }
  const resolution = resolveAudience(actor.actorUserId, selection, actor.bucketId);
  const existingRecipients = new Set(gather.invites.map((invite) => invite.personId));
  const updatedAt = gatherNowIso();
  const additions = resolution.resolvedRecipientIds
    .filter((personId) => !existingRecipients.has(personId))
    .map((personId) =>
      makeGatherInviteRecord({
        gatherId,
        personId,
        status: "sent",
        source: resolution.source,
        sourceLabels: [...resolution.selectedGroupLabels, ...resolution.selectedFriendLabels],
        timestamp: updatedAt,
      }),
    );
  const next: Gather = {
    ...gather,
    invites: [...gather.invites, ...additions],
    audienceSnapshot: {
      ...gather.audienceSnapshot,
      resolvedRecipientIds: mergeRecipientIds(
        gather.audienceSnapshot,
        additions.map((invite) => invite.personId),
      ),
    },
    updatedAt,
  };
  upsertGatherRecord(next, actor.bucketId);
  upsertGatherNotifications(
    additions.map((invite) =>
      makeGatherNotificationRecord({
        type: "GATHER_INVITE",
        gatherId,
        actorId: actor.actorUserId,
        recipientId: invite.personId,
        title: "Ban co loi moi Gather",
        body: `${gather.title} · mo trong app de xem dia diem`,
      }),
    ),
    actor.bucketId,
  );
  return true;
}

export function endGather(gatherId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const gather = materializeStatus(requireGatherRecord(gatherId, actor.bucketId), actor.bucketId);
  if (!canGatherPermission(actor.actorUserId, gather, "end_gather", actor.bucketId)) {
    throw new ApiError("FORBIDDEN", "Chi owner moi co the ket thuc Gather nay.", 403);
  }
  const updatedAt = gatherNowIso();
  const next: Gather = {
    ...gather,
    status: "ended",
    updatedAt,
  };
  upsertGatherRecord(next, actor.bucketId);
  upsertGatherNotifications(
    next.invites.map((invite) =>
      makeGatherNotificationRecord({
        type: "GATHER_ENDED",
        gatherId,
        actorId: actor.actorUserId,
        recipientId: invite.personId,
        title: "Gather da ket thuc",
        body: next.title,
      }),
    ),
    actor.bucketId,
  );
  return true;
}

export function resetGatherStateDevOnly(bucketId?: string) {
  return resetGatherStoreForTesting(bucketId);
}

export function seedGatherStateDevOnly(
  state: { gathers: Gather[]; notifications: GatherNotification[] },
  bucketId?: string,
) {
  return seedGatherStoreForTesting(state, bucketId);
}
