import { ApiError } from "./api-errors";
import { getRequestBucketId, requireAuthContext } from "./server-auth.server";
import {
  actorHasBlocked,
  areFriends,
  canViewProfile,
  getPendingFriendshipBetween,
  isBlockedEitherDirection,
  listBlockedUserIds,
  requireFriendship,
  requireGroupOwner,
  requireNoBlockedRelationship,
  requireOwnUser,
} from "./social-authorization.server";
import type {
  CreateGroupInput,
  CurrentUserProfile,
  FriendGroupView,
  FriendRequestView,
  PrivacySettings,
  ProfileSummary,
  ReportSubmission,
  ReportSubmissionInput,
  UpdateCurrentProfileInput,
  UpdatePrivacySettingsInput,
  ViewableProfile,
} from "./social-contracts";
import {
  deleteBlock,
  deleteFriendship,
  deleteGroupRecord,
  getBlockRecord,
  getGroupRecord,
  getPrivacyRecord,
  getUserRecord,
  listFriendshipRecords,
  listGroupRecords,
  listReportsForReporter,
  listUsers,
  nowIso,
  resetSocialStoreForTesting,
  toCurrentUserProfile,
  toProfileSummary,
  toViewableProfile,
  updatePrivacyRecord,
  updateUserRecord,
  upsertBlock,
  upsertFriendship,
  upsertGroup,
  upsertReport,
} from "./social-store.server";

type FriendRequestReasonLookup = Record<string, string>;

const incomingRequestReasonByUserId: FriendRequestReasonLookup = {
  khanhvy: "3 so thich chung",
  gialong: "Cung khu vuc Binh Thanh",
  hoanglan: "Co the giup ban: Tim tai lieu triet hoc",
};

function actorIdFromSession() {
  const auth = requireAuthContext();
  return {
    actorId: auth.actorUserId,
    bucketId: getRequestBucketId(auth.session.id),
  };
}

function resolveActorContext(actorUserId?: string, bucketId?: string) {
  if (actorUserId) {
    return {
      actorId: actorUserId,
      bucketId: bucketId ?? "global",
    };
  }
  return actorIdFromSession();
}

function computeMutualCount(actorId: string, targetId: string, bucketId?: string) {
  const actorFriends = new Set(
    listFriendshipRecords(bucketId)
      .filter(
        (record) =>
          record.status === "accepted" &&
          (record.requesterUserId === actorId || record.addresseeUserId === actorId),
      )
      .map((record) =>
        record.requesterUserId === actorId ? record.addresseeUserId : record.requesterUserId,
      ),
  );

  const targetFriends = new Set(
    listFriendshipRecords(bucketId)
      .filter(
        (record) =>
          record.status === "accepted" &&
          (record.requesterUserId === targetId || record.addresseeUserId === targetId),
      )
      .map((record) =>
        record.requesterUserId === targetId ? record.addresseeUserId : record.requesterUserId,
      ),
  );

  let count = 0;
  actorFriends.forEach((friendId) => {
    if (targetFriends.has(friendId)) count += 1;
  });
  return count;
}

function friendCountForUser(userId: string, bucketId?: string) {
  return listFriendshipRecords(bucketId).filter(
    (record) =>
      record.status === "accepted" &&
      (record.requesterUserId === userId || record.addresseeUserId === userId),
  ).length;
}

type FriendshipRecordView = ReturnType<typeof listFriendshipRecords>[number];

function toFriendRequestView(
  actorId: string,
  record: FriendshipRecordView,
  bucketId?: string,
): FriendRequestView {
  const incoming = record.addresseeUserId === actorId;
  const otherUserId = incoming ? record.requesterUserId : record.addresseeUserId;
  const otherUser = getUserRecord(otherUserId, bucketId);
  if (!otherUser) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung cua loi moi.", 404);
  }

  return {
    id: record.id,
    requesterUserId: record.requesterUserId,
    addresseeUserId: record.addresseeUserId,
    direction: incoming ? "incoming" : "outgoing",
    requestedAt: record.requestedAt,
    status: "pending",
    mutualCount: computeMutualCount(actorId, otherUserId, bucketId),
    reason:
      incomingRequestReasonByUserId[otherUserId] ??
      (incoming ? "Muon ket ban tren Fendee" : "Loi moi dang cho phan hoi"),
    person: toProfileSummary(otherUser, {
      isFriend: areFriends(actorId, otherUserId, bucketId),
      visibility: otherUser.visibility,
    }),
  };
}

function listPendingRequestsForActor(
  actorId: string,
  direction: "incoming" | "outgoing",
  bucketId?: string,
) {
  return listFriendshipRecords(bucketId)
    .filter((record) => record.status === "pending")
    .filter((record) =>
      direction === "incoming"
        ? record.addresseeUserId === actorId
        : record.requesterUserId === actorId,
    )
    .map((record) => toFriendRequestView(actorId, record, bucketId));
}

function listFriendSummariesForActor(actorId: string, bucketId?: string) {
  return listFriendshipRecords(bucketId)
    .filter(
      (record) =>
        record.status === "accepted" &&
        (record.requesterUserId === actorId || record.addresseeUserId === actorId),
    )
    .map((record) =>
      record.requesterUserId === actorId ? record.addresseeUserId : record.requesterUserId,
    )
    .filter((userId) => !isBlockedEitherDirection(actorId, userId, bucketId))
    .map((userId) => {
      const user = getUserRecord(userId, bucketId);
      if (!user) {
        throw new ApiError("NOT_FOUND", "Khong tim thay ban be.", 404);
      }
      return toProfileSummary(user, { isFriend: true, visibility: user.visibility });
    });
}

function listSuggestedProfilesForActor(actorId: string, bucketId?: string) {
  const friendIds = new Set(
    listFriendSummariesForActor(actorId, bucketId).map((person) => person.id),
  );
  const pendingIds = new Set(
    listFriendshipRecords(bucketId)
      .filter(
        (record) =>
          record.status === "pending" &&
          (record.requesterUserId === actorId || record.addresseeUserId === actorId),
      )
      .map((record) =>
        record.requesterUserId === actorId ? record.addresseeUserId : record.requesterUserId,
      ),
  );

  return listUsers(bucketId)
    .filter((user) => user.id !== actorId)
    .filter((user) => !friendIds.has(user.id))
    .filter((user) => !pendingIds.has(user.id))
    .filter((user) => !isBlockedEitherDirection(actorId, user.id, bucketId))
    .map((user) => toProfileSummary(user, { isFriend: false, visibility: user.visibility }))
    .sort((left, right) => right.match - left.match);
}

function sanitizeList(values: string[] | undefined) {
  if (!values) return undefined;
  const next = values.map((value) => value.trim()).filter(Boolean);
  return next.length ? next : [];
}

export function getCurrentUserProfile(actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  return toCurrentUserProfile(
    actor.actorId,
    friendCountForUser(actor.actorId, actor.bucketId),
    actor.bucketId,
  );
}

export function getProfileById(
  targetUserId: string,
  actorUserId?: string,
  bucketId?: string,
): ViewableProfile {
  const actor = resolveActorContext(actorUserId, bucketId);
  if (actor.actorId === targetUserId) {
    throw new ApiError("CONFLICT", "Dung endpoint profile hien tai cho tai khoan cua minh.", 409);
  }
  const access = canViewProfile(actor.actorId, targetUserId, actor.bucketId);
  return toViewableProfile(
    targetUserId,
    {
      kind: access.kind === "friend" ? "friend" : "public",
      isFriend: areFriends(actor.actorId, targetUserId, actor.bucketId),
    },
    actor.bucketId,
  );
}

export function updateCurrentUserProfile(
  input: UpdateCurrentProfileInput,
  actorUserId?: string,
  bucketId?: string,
): CurrentUserProfile {
  const actor = resolveActorContext(actorUserId, bucketId);
  const current = getUserRecord(actor.actorId, actor.bucketId);
  if (!current) {
    throw new ApiError("NOT_FOUND", "Khong tim thay tai khoan hien tai.", 404);
  }

  const next = updateUserRecord(
    actor.actorId,
    {
      ...(input.name ? { name: input.name } : {}),
      ...(input.bio ? { bio: input.bio } : {}),
      ...(input.avatar ? { avatar: input.avatar } : {}),
      ...(sanitizeList(input.interests) ? { interests: sanitizeList(input.interests)! } : {}),
      ...(sanitizeList(input.canHelp) ? { canHelp: sanitizeList(input.canHelp)! } : {}),
      ...(sanitizeList(input.needHelp) ? { needHelp: sanitizeList(input.needHelp)! } : {}),
    },
    actor.bucketId,
  );

  return {
    kind: "self",
    ...toProfileSummary(next, { isFriend: false, visibility: next.visibility }),
    ...(next.handle ? { handle: next.handle } : {}),
    friendCount: friendCountForUser(actor.actorId, actor.bucketId),
  };
}

export function listFriends(actorUserId?: string, bucketId?: string): ProfileSummary[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listFriendSummariesForActor(actor.actorId, actor.bucketId);
}

export function listIncomingFriendRequests(
  actorUserId?: string,
  bucketId?: string,
): FriendRequestView[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listPendingRequestsForActor(actor.actorId, "incoming", actor.bucketId);
}

export function listOutgoingFriendRequests(
  actorUserId?: string,
  bucketId?: string,
): FriendRequestView[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listPendingRequestsForActor(actor.actorId, "outgoing", actor.bucketId);
}

export function listFriendSuggestions(actorUserId?: string, bucketId?: string): ProfileSummary[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listSuggestedProfilesForActor(actor.actorId, actor.bucketId);
}

export function sendFriendRequest(targetUserId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  if (actor.actorId === targetUserId) {
    throw new ApiError("VALIDATION_ERROR", "Ban khong the tu gui loi moi ket ban.", 400);
  }
  if (!getUserRecord(targetUserId, actor.bucketId)) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung duoc moi.", 404);
  }
  requireNoBlockedRelationship(actor.actorId, targetUserId, actor.bucketId);
  if (areFriends(actor.actorId, targetUserId, actor.bucketId)) {
    throw new ApiError("CONFLICT", "Hai nguoi da la ban be.", 409);
  }
  const existingPending = getPendingFriendshipBetween(actor.actorId, targetUserId, actor.bucketId);
  if (existingPending) {
    throw new ApiError("CONFLICT", "Da co loi moi ket ban dang cho.", 409);
  }

  const timestamp = nowIso();
  const recordId = `friend-request-${crypto.randomUUID()}`;
  upsertFriendship(
    {
      id: recordId,
      requesterUserId: actor.actorId,
      addresseeUserId: targetUserId,
      status: "pending",
      requestedAt: timestamp,
      respondedAt: null,
      updatedAt: timestamp,
    },
    actor.bucketId,
  );
}

export function acceptFriendRequest(requestId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const record = listFriendshipRecords(actor.bucketId).find((entry) => entry.id === requestId);
  if (!record || record.status !== "pending") {
    throw new ApiError("NOT_FOUND", "Khong tim thay loi moi ket ban.", 404);
  }
  if (record.addresseeUserId !== actor.actorId) {
    throw new ApiError("FORBIDDEN", "Ban khong duoc chap nhan loi moi nay.", 403);
  }
  requireNoBlockedRelationship(actor.actorId, record.requesterUserId, actor.bucketId);
  const timestamp = nowIso();
  upsertFriendship(
    {
      ...record,
      status: "accepted",
      respondedAt: timestamp,
      updatedAt: timestamp,
    },
    actor.bucketId,
  );
}

export function declineFriendRequest(requestId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const record = listFriendshipRecords(actor.bucketId).find((entry) => entry.id === requestId);
  if (!record || record.status !== "pending") {
    throw new ApiError("NOT_FOUND", "Khong tim thay loi moi ket ban.", 404);
  }
  if (record.addresseeUserId !== actor.actorId) {
    throw new ApiError("FORBIDDEN", "Ban khong duoc tu choi loi moi nay.", 403);
  }
  const timestamp = nowIso();
  upsertFriendship(
    {
      ...record,
      status: "declined",
      respondedAt: timestamp,
      updatedAt: timestamp,
    },
    actor.bucketId,
  );
}

export function cancelFriendRequest(requestId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const record = listFriendshipRecords(actor.bucketId).find((entry) => entry.id === requestId);
  if (!record || record.status !== "pending") {
    throw new ApiError("NOT_FOUND", "Khong tim thay loi moi ket ban.", 404);
  }
  if (record.requesterUserId !== actor.actorId) {
    throw new ApiError("FORBIDDEN", "Ban khong duoc huy loi moi nay.", 403);
  }
  const timestamp = nowIso();
  upsertFriendship(
    {
      ...record,
      status: "cancelled",
      respondedAt: timestamp,
      updatedAt: timestamp,
    },
    actor.bucketId,
  );
}

export function removeFriend(targetUserId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  requireFriendship(actor.actorId, targetUserId, actor.bucketId);
  const record = listFriendshipRecords(actor.bucketId).find(
    (entry) =>
      entry.status === "accepted" &&
      ((entry.requesterUserId === actor.actorId && entry.addresseeUserId === targetUserId) ||
        (entry.requesterUserId === targetUserId && entry.addresseeUserId === actor.actorId)),
  );
  if (!record) {
    throw new ApiError("NOT_FOUND", "Khong tim thay quan he ban be.", 404);
  }
  const timestamp = nowIso();
  upsertFriendship(
    {
      ...record,
      status: "removed",
      respondedAt: timestamp,
      updatedAt: timestamp,
    },
    actor.bucketId,
  );
}

export function listGroups(actorUserId?: string, bucketId?: string): FriendGroupView[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listGroupRecords(actor.bucketId).filter((group) => group.ownerUserId === actor.actorId);
}

export function createGroup(
  input: CreateGroupInput,
  actorUserId?: string,
  bucketId?: string,
): FriendGroupView {
  const actor = resolveActorContext(actorUserId, bucketId);
  const uniqueMembers = [
    ...new Set(input.memberIds.filter((memberId) => memberId !== actor.actorId)),
  ];
  uniqueMembers.forEach((memberId) => {
    if (!getUserRecord(memberId, actor.bucketId)) {
      throw new ApiError("NOT_FOUND", "Khong tim thay thanh vien nhom.", 404);
    }
    requireNoBlockedRelationship(actor.actorId, memberId, actor.bucketId);
    requireFriendship(actor.actorId, memberId, actor.bucketId);
  });

  const group: FriendGroupView = {
    id: `group-${crypto.randomUUID()}`,
    ownerUserId: actor.actorId,
    name: input.name,
    description: input.description,
    memberIds: uniqueMembers,
  };
  upsertGroup(group, actor.bucketId);
  return group;
}

export function renameGroup(
  groupId: string,
  name: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const group = requireGroupOwner(actor.actorId, groupId, actor.bucketId);
  upsertGroup(
    {
      ...group,
      name,
    },
    actor.bucketId,
  );
}

export function deleteGroup(groupId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  requireGroupOwner(actor.actorId, groupId, actor.bucketId);
  deleteGroupRecord(groupId, actor.bucketId);
}

export function addGroupMember(
  groupId: string,
  memberUserId: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const group = requireGroupOwner(actor.actorId, groupId, actor.bucketId);
  if (!getUserRecord(memberUserId, actor.bucketId)) {
    throw new ApiError("NOT_FOUND", "Khong tim thay thanh vien nhom.", 404);
  }
  requireNoBlockedRelationship(actor.actorId, memberUserId, actor.bucketId);
  requireFriendship(actor.actorId, memberUserId, actor.bucketId);
  if (group.memberIds.includes(memberUserId)) {
    throw new ApiError("CONFLICT", "Nguoi dung da co trong nhom.", 409);
  }
  upsertGroup(
    {
      ...group,
      memberIds: [...group.memberIds, memberUserId],
    },
    actor.bucketId,
  );
}

export function removeGroupMember(
  groupId: string,
  memberUserId: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const group = requireGroupOwner(actor.actorId, groupId, actor.bucketId);
  if (!group.memberIds.includes(memberUserId)) {
    throw new ApiError("NOT_FOUND", "Nguoi dung khong nam trong nhom.", 404);
  }
  upsertGroup(
    {
      ...group,
      memberIds: group.memberIds.filter((memberId) => memberId !== memberUserId),
    },
    actor.bucketId,
  );
}

export function getPrivacySettings(actorUserId?: string, bucketId?: string): PrivacySettings {
  const actor = resolveActorContext(actorUserId, bucketId);
  return getPrivacyRecord(actor.actorId, actor.bucketId);
}

export function updatePrivacySettings(
  input: UpdatePrivacySettingsInput,
  actorUserId?: string,
  bucketId?: string,
): PrivacySettings {
  const actor = resolveActorContext(actorUserId, bucketId);
  const patch: Partial<PrivacySettings> = {};
  if (input.profileVisibility !== undefined) patch.profileVisibility = input.profileVisibility;
  if (input.shareLocation !== undefined) patch.shareLocation = input.shareLocation;
  if (input.showInNearby !== undefined) patch.showInNearby = input.showInNearby;
  if (input.relativeDistanceOnly !== undefined) {
    patch.relativeDistanceOnly = input.relativeDistanceOnly;
  }
  if (input.allowStrangerNotes !== undefined) {
    patch.allowStrangerNotes = input.allowStrangerNotes;
  }
  if (input.showOnlineStatus !== undefined) patch.showOnlineStatus = input.showOnlineStatus;
  if (input.allowInterestMatching !== undefined) {
    patch.allowInterestMatching = input.allowInterestMatching;
  }
  if (input.friendsOnlyMessaging !== undefined) {
    patch.friendsOnlyMessaging = input.friendsOnlyMessaging;
  }
  if (input.friendsOnlyGatherInvites !== undefined) {
    patch.friendsOnlyGatherInvites = input.friendsOnlyGatherInvites;
  }
  return updatePrivacyRecord(actor.actorId, patch, actor.bucketId);
}

export function listBlockedUsers(actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listBlockedUserIds(actor.actorId, actor.bucketId);
}

export function blockUser(targetUserId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  if (actor.actorId === targetUserId) {
    throw new ApiError("VALIDATION_ERROR", "Ban khong the tu chan chinh minh.", 400);
  }
  if (!getUserRecord(targetUserId, actor.bucketId)) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung can chan.", 404);
  }
  const existing = getBlockRecord(actor.actorId, targetUserId, actor.bucketId);
  if (existing) {
    throw new ApiError("CONFLICT", "Nguoi dung nay da bi chan.", 409);
  }

  upsertBlock(
    {
      id: `block-${actor.actorId}-${targetUserId}`,
      blockerUserId: actor.actorId,
      blockedUserId: targetUserId,
      createdAt: nowIso(),
    },
    actor.bucketId,
  );

  const acceptedFriendship = listFriendshipRecords(actor.bucketId).find(
    (record) =>
      record.status === "accepted" &&
      ((record.requesterUserId === actor.actorId && record.addresseeUserId === targetUserId) ||
        (record.requesterUserId === targetUserId && record.addresseeUserId === actor.actorId)),
  );
  if (acceptedFriendship) {
    upsertFriendship(
      {
        ...acceptedFriendship,
        status: "removed",
        respondedAt: nowIso(),
        updatedAt: nowIso(),
      },
      actor.bucketId,
    );
  }

  listFriendshipRecords(actor.bucketId)
    .filter(
      (record) =>
        record.status === "pending" &&
        ((record.requesterUserId === actor.actorId && record.addresseeUserId === targetUserId) ||
          (record.requesterUserId === targetUserId && record.addresseeUserId === actor.actorId)),
    )
    .forEach((record) =>
      upsertFriendship(
        {
          ...record,
          status: "cancelled",
          respondedAt: nowIso(),
          updatedAt: nowIso(),
        },
        actor.bucketId,
      ),
    );

  const ownedGroups = listGroupRecords(actor.bucketId).filter(
    (group) => group.ownerUserId === actor.actorId,
  );
  ownedGroups.forEach((group) => {
    if (!group.memberIds.includes(targetUserId)) return;
    upsertGroup(
      {
        ...group,
        memberIds: group.memberIds.filter((memberId) => memberId !== targetUserId),
      },
      actor.bucketId,
    );
  });
}

export function unblockUser(targetUserId: string, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const existing = getBlockRecord(actor.actorId, targetUserId, actor.bucketId);
  if (!existing) {
    throw new ApiError("NOT_FOUND", "Khong tim thay quan he chan.", 404);
  }
  deleteBlock(existing.id, actor.bucketId);
}

export function submitReport(
  input: ReportSubmissionInput,
  actorUserId?: string,
  bucketId?: string,
): ReportSubmission {
  const actor = resolveActorContext(actorUserId, bucketId);
  if (actor.actorId === input.targetUserId) {
    throw new ApiError("VALIDATION_ERROR", "Ban khong the tu bao cao chinh minh.", 400);
  }
  if (!getUserRecord(input.targetUserId, actor.bucketId)) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung can bao cao.", 404);
  }

  const record: ReportSubmission = {
    id: `report-${crypto.randomUUID()}`,
    reporterId: actor.actorId,
    targetId: input.targetUserId,
    reason: input.reason,
    createdAt: nowIso(),
    status: "submitted",
  };
  upsertReport(record, actor.bucketId);
  return record;
}

export function listOwnReports(actorUserId?: string, bucketId?: string): ReportSubmission[] {
  const actor = resolveActorContext(actorUserId, bucketId);
  return listReportsForReporter(actor.actorId, actor.bucketId);
}

export function getBlockedProfileState(
  targetUserId: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  return actorHasBlocked(actor.actorId, targetUserId, actor.bucketId);
}

export function resetSocialStateDevOnly(bucketId?: string) {
  return resetSocialStoreForTesting(bucketId);
}
