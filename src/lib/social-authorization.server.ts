import { ApiError } from "./api-errors";
import {
  getBlockRecord,
  getGroupRecord,
  getPrivacyRecord,
  getUserRecord,
  listBlockRecords,
  listFriendshipRecords,
} from "./social-store.server";

function friendshipPairMatches(userA: string, userB: string, requester: string, addressee: string) {
  return (
    (requester === userA && addressee === userB) || (requester === userB && addressee === userA)
  );
}

export function areFriends(userA: string, userB: string, bucketId?: string) {
  return listFriendshipRecords(bucketId).some(
    (record) =>
      record.status === "accepted" &&
      friendshipPairMatches(userA, userB, record.requesterUserId, record.addresseeUserId),
  );
}

export function getPendingFriendshipBetween(userA: string, userB: string, bucketId?: string) {
  return (
    listFriendshipRecords(bucketId).find(
      (record) =>
        record.status === "pending" &&
        friendshipPairMatches(userA, userB, record.requesterUserId, record.addresseeUserId),
    ) ?? null
  );
}

export function isBlockedEitherDirection(userA: string, userB: string, bucketId?: string) {
  return Boolean(getBlockRecord(userA, userB, bucketId) || getBlockRecord(userB, userA, bucketId));
}

export function actorHasBlocked(actorId: string, targetId: string, bucketId?: string) {
  return Boolean(getBlockRecord(actorId, targetId, bucketId));
}

export function canViewProfile(actorId: string, targetId: string, bucketId?: string) {
  if (actorId === targetId) return { allowed: true as const, kind: "self" as const };
  if (!getUserRecord(targetId, bucketId)) {
    throw new ApiError("NOT_FOUND", "Khong tim thay ho so.", 404);
  }
  if (isBlockedEitherDirection(actorId, targetId, bucketId)) {
    throw new ApiError("FORBIDDEN", "Ban khong the xem ho so nay.", 403);
  }

  const targetPrivacy = getPrivacyRecord(targetId, bucketId);
  if (targetPrivacy.profileVisibility === "public") {
    return { allowed: true as const, kind: "public" as const };
  }
  if (targetPrivacy.profileVisibility === "friends" && areFriends(actorId, targetId, bucketId)) {
    return { allowed: true as const, kind: "friend" as const };
  }

  throw new ApiError("FORBIDDEN", "Ban khong duoc phep xem ho so nay.", 403);
}

export function requireOwnUser(actorId: string, targetUserId: string) {
  if (actorId !== targetUserId) {
    throw new ApiError("FORBIDDEN", "Ban chi duoc thay doi tai khoan cua minh.", 403);
  }
}

export function requireNoBlockedRelationship(
  actorId: string,
  targetUserId: string,
  bucketId?: string,
) {
  if (isBlockedEitherDirection(actorId, targetUserId, bucketId)) {
    throw new ApiError("FORBIDDEN", "Khong the thuc hien thao tac voi nguoi dung da chan.", 403);
  }
}

export function requireGroupOwner(actorId: string, groupId: string, bucketId?: string) {
  const group = getGroupRecord(groupId, bucketId);
  if (!group) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nhom ban.", 404);
  }
  if (group.ownerUserId !== actorId) {
    throw new ApiError("FORBIDDEN", "Ban khong so huu nhom ban nay.", 403);
  }
  return group;
}

export function requireFriendship(actorId: string, targetUserId: string, bucketId?: string) {
  if (!areFriends(actorId, targetUserId, bucketId)) {
    throw new ApiError("FORBIDDEN", "Chi co the thao tac voi ban da ket ban.", 403);
  }
}

export function listBlockedUserIds(actorId: string, bucketId?: string) {
  return listBlockRecords(bucketId)
    .filter((record) => record.blockerUserId === actorId)
    .map((record) => record.blockedUserId);
}
