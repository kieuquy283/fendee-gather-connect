import { ApiError } from "./api-errors";
import { me, people, type Availability } from "./fendee-data";
import type {
  CurrentUserProfile,
  FriendGroupView,
  FriendRequestStatus,
  PrivacySettings,
  ProfileSummary,
  ProfileVisibility,
  ReportSubmission,
  ViewableProfile,
} from "./social-contracts";

type UserRecord = {
  id: string;
  handle?: string;
  name: string;
  age: number;
  bio: string;
  avatar: string;
  distance: string;
  distanceMeters?: number;
  relativeAngle?: number;
  status?: string;
  note?: string;
  place: string;
  online: boolean;
  visibility: ProfileVisibility;
  interests: string[];
  canHelp: string[];
  needHelp: string[];
  match: number;
};

type FriendshipRecord = {
  id: string;
  requesterUserId: string;
  addresseeUserId: string;
  status: FriendRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
  updatedAt: string;
};

type GroupRecord = FriendGroupView;

type BlockRecord = {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
};

type ReportRecord = ReportSubmission;

type SocialStoreSnapshot = {
  users: Map<string, UserRecord>;
  friendships: Map<string, FriendshipRecord>;
  groups: Map<string, GroupRecord>;
  privacy: Map<string, PrivacySettings>;
  blocks: Map<string, BlockRecord>;
  reports: Map<string, ReportRecord>;
};

const GLOBAL_SOCIAL_STORE_KEY = Symbol.for("fendee.server-social-store");

type SocialStoreRegistry = Map<string, SocialStoreSnapshot>;

const seedNow = "2026-08-09T09:00:00.000Z";

function toVisibility(value: Availability): ProfileVisibility {
  return value;
}

function createUserRecord(person: (typeof people)[number]): UserRecord {
  return {
    id: person.id,
    name: person.name,
    age: person.age,
    bio: person.bio,
    avatar: person.avatar,
    distance: person.distance,
    ...(person.distanceMeters != null ? { distanceMeters: person.distanceMeters } : {}),
    ...(person.relativeAngle != null ? { relativeAngle: person.relativeAngle } : {}),
    ...(person.status ? { status: person.status } : {}),
    ...(person.note ? { note: person.note } : {}),
    place: person.place,
    online: person.online,
    visibility: toVisibility(person.visibility),
    interests: [...person.interests],
    canHelp: [...person.canHelp],
    needHelp: [...person.needHelp],
    match: person.match,
  };
}

function createMeRecord(): UserRecord {
  return {
    id: me.id,
    handle: me.handle,
    name: me.name,
    age: me.age,
    bio: me.bio,
    avatar: me.avatar,
    distance: "Tai day",
    place: "Khu vuc hien tai",
    online: true,
    visibility: toVisibility(me.visibility),
    interests: [...me.interests],
    canHelp: [...me.canHelp],
    needHelp: [...me.needHelp],
    match: 100,
    status: "Available",
  };
}

function defaultPrivacySettings(visibility: ProfileVisibility): PrivacySettings {
  return {
    profileVisibility: visibility,
    shareLocation: false,
    showInNearby: true,
    relativeDistanceOnly: true,
    allowStrangerNotes: true,
    showOnlineStatus: true,
    allowInterestMatching: true,
    friendsOnlyMessaging: true,
    friendsOnlyGatherInvites: true,
  };
}

function canonicalPair(userA: string, userB: string) {
  return [userA, userB].sort().join("::");
}

function createSeedStore(): SocialStoreSnapshot {
  const users = new Map<string, UserRecord>();
  users.set(me.id, createMeRecord());
  for (const person of people) {
    users.set(person.id, createUserRecord(person));
  }

  const privacy = new Map<string, PrivacySettings>();
  for (const user of users.values()) {
    privacy.set(user.id, defaultPrivacySettings(user.visibility));
  }

  const friendships = new Map<string, FriendshipRecord>();
  const acceptedPairs = people.filter((person) => person.isFriend).map((person) => person.id);
  for (const targetId of acceptedPairs) {
    const id = `friendship-${canonicalPair(me.id, targetId)}`;
    friendships.set(id, {
      id,
      requesterUserId: me.id,
      addresseeUserId: targetId,
      status: "accepted",
      requestedAt: seedNow,
      respondedAt: seedNow,
      updatedAt: seedNow,
    });
  }

  const pendingRequests: Array<{ targetId: string; reason: string }> = [
    { targetId: "khanhvy", reason: "3 so thich chung" },
    { targetId: "gialong", reason: "Cung khu vuc Binh Thanh" },
    { targetId: "hoanglan", reason: "Co the giup ban: Tim tai lieu triet hoc" },
  ];
  pendingRequests.forEach((request, index) => {
    const id = `friend-request-${request.targetId}`;
    friendships.set(id, {
      id,
      requesterUserId: request.targetId,
      addresseeUserId: me.id,
      status: "pending",
      requestedAt: new Date(Date.parse(seedNow) + index * 60_000).toISOString(),
      respondedAt: null,
      updatedAt: new Date(Date.parse(seedNow) + index * 60_000).toISOString(),
    });
  });

  const groups = new Map<string, GroupRecord>();
  [
    {
      id: "close-friends",
      ownerUserId: me.id,
      name: "Ban than quanh truong",
      description: "Nhom hay gap sau gio hoc",
      memberIds: ["hailang", "minhtu", "linhchi", "baongoc"],
    },
    {
      id: "study-crew",
      ownerUserId: me.id,
      name: "Nhom hoc tai chinh va du lieu cuoi tuan",
      description: "Ten dai de kiem tra layout nhom",
      memberIds: ["tuananh", "quanghuy", "baongoc", "minhtu"],
    },
    {
      id: "coffee-loop",
      ownerUserId: me.id,
      name: "Coffee loop",
      description: "Ban be hay ngoi cafe lam viec",
      memberIds: ["hailang", "linhchi", "quanghuy"],
    },
    {
      id: "bob-private-group",
      ownerUserId: "hailang",
      name: "Hailang private group",
      description: "Foreign-owned test group",
      memberIds: ["me", "minhtu"],
    },
  ].forEach((group) => groups.set(group.id, { ...group }));

  const blocks = new Map<string, BlockRecord>();
  const defaultBlockId = `block-${me.id}-baongoc`;
  blocks.set(defaultBlockId, {
    id: defaultBlockId,
    blockerUserId: me.id,
    blockedUserId: "baongoc",
    createdAt: seedNow,
  });

  return {
    users,
    friendships,
    groups,
    privacy,
    blocks,
    reports: new Map<string, ReportRecord>(),
  };
}

const globalSocialStore = globalThis as typeof globalThis & {
  [GLOBAL_SOCIAL_STORE_KEY]?: SocialStoreRegistry;
};

function getSocialStoreRegistry(): SocialStoreRegistry {
  if (!globalSocialStore[GLOBAL_SOCIAL_STORE_KEY]) {
    globalSocialStore[GLOBAL_SOCIAL_STORE_KEY] = new Map<string, SocialStoreSnapshot>();
  }
  return globalSocialStore[GLOBAL_SOCIAL_STORE_KEY];
}

function getSocialStore(bucketId = "global") {
  const registry = getSocialStoreRegistry();
  const existing = registry.get(bucketId);
  if (existing) return existing;
  const seeded = createSeedStore();
  registry.set(bucketId, seeded);
  return seeded;
}

export function nowIso() {
  return new Date().toISOString();
}

export function resetSocialStoreForTesting(bucketId = "global") {
  const socialStore = createSeedStore();
  getSocialStoreRegistry().set(bucketId, socialStore);
  return {
    ok: true as const,
    bucketId,
    userCount: socialStore.users.size,
    friendshipCount: socialStore.friendships.size,
    groupCount: socialStore.groups.size,
  };
}

function ensureUserExists(userId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  const user = socialStore.users.get(userId);
  if (!user) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung.", 404);
  }
  return user;
}

export function getUserIdentitySnapshot(userId: string, bucketId?: string) {
  const user = ensureUserExists(userId, bucketId);
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
  };
}

export function listUsers(bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return [...socialStore.users.values()];
}

export function getUserRecord(userId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return socialStore.users.get(userId) ?? null;
}

export function updateUserRecord(userId: string, patch: Partial<UserRecord>, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  const current = ensureUserExists(userId, bucketId);
  const next = {
    ...current,
    ...patch,
  };
  socialStore.users.set(userId, next);
  return next;
}

export function getPrivacyRecord(userId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  const privacy = socialStore.privacy.get(userId);
  if (!privacy) {
    throw new ApiError("NOT_FOUND", "Khong tim thay cau hinh quyen rieng tu.", 404);
  }
  return privacy;
}

export function updatePrivacyRecord(
  userId: string,
  patch: Partial<PrivacySettings>,
  bucketId?: string,
) {
  const socialStore = getSocialStore(bucketId);
  const current = getPrivacyRecord(userId, bucketId);
  const next = {
    ...current,
    ...patch,
  };
  socialStore.privacy.set(userId, next);
  const user = ensureUserExists(userId, bucketId);
  if (patch.profileVisibility && patch.profileVisibility !== user.visibility) {
    socialStore.users.set(userId, {
      ...user,
      visibility: patch.profileVisibility,
    });
  }
  return next;
}

export function listFriendshipRecords(bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return [...socialStore.friendships.values()];
}

export function upsertFriendship(record: FriendshipRecord, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.friendships.set(record.id, record);
  return record;
}

export function deleteFriendship(friendshipId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.friendships.delete(friendshipId);
}

export function listGroupRecords(bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return [...socialStore.groups.values()];
}

export function getGroupRecord(groupId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return socialStore.groups.get(groupId) ?? null;
}

export function upsertGroup(record: GroupRecord, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.groups.set(record.id, record);
  return record;
}

export function deleteGroupRecord(groupId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.groups.delete(groupId);
}

export function listBlockRecords(bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return [...socialStore.blocks.values()];
}

export function getBlockRecord(blockerUserId: string, blockedUserId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return (
    [...socialStore.blocks.values()].find(
      (record) => record.blockerUserId === blockerUserId && record.blockedUserId === blockedUserId,
    ) ?? null
  );
}

export function upsertBlock(record: BlockRecord, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.blocks.set(record.id, record);
  return record;
}

export function deleteBlock(blockId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.blocks.delete(blockId);
}

export function upsertReport(record: ReportRecord, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  socialStore.reports.set(record.id, record);
  return record;
}

export function listReportsForReporter(reporterId: string, bucketId?: string) {
  const socialStore = getSocialStore(bucketId);
  return [...socialStore.reports.values()].filter((record) => record.reporterId === reporterId);
}

export function toProfileSummary(
  user: UserRecord,
  input?: {
    isFriend?: boolean;
    visibility?: ProfileVisibility;
  },
): ProfileSummary {
  return {
    id: user.id,
    name: user.name,
    age: user.age,
    bio: user.bio,
    avatar: user.avatar,
    distance: user.distance,
    ...(user.distanceMeters != null ? { distanceMeters: user.distanceMeters } : {}),
    ...(user.relativeAngle != null ? { relativeAngle: user.relativeAngle } : {}),
    ...(user.status ? { status: user.status } : {}),
    ...(user.note ? { note: user.note } : {}),
    place: user.place,
    online: user.online,
    isFriend: input?.isFriend ?? false,
    visibility: input?.visibility ?? user.visibility,
    interests: [...user.interests],
    canHelp: [...user.canHelp],
    needHelp: [...user.needHelp],
    match: user.match,
  };
}

export function toCurrentUserProfile(
  userId: string,
  friendCount: number,
  bucketId?: string,
): CurrentUserProfile {
  const user = ensureUserExists(userId, bucketId);
  return {
    kind: "self",
    ...toProfileSummary(user, { isFriend: false, visibility: user.visibility }),
    ...(user.handle ? { handle: user.handle } : {}),
    friendCount,
  };
}

export function toViewableProfile(
  userId: string,
  input: {
    kind: "friend" | "public";
    isFriend: boolean;
  },
  bucketId?: string,
): ViewableProfile {
  const user = ensureUserExists(userId, bucketId);
  return {
    kind: input.kind,
    ...toProfileSummary(user, { isFriend: input.isFriend, visibility: user.visibility }),
  };
}
