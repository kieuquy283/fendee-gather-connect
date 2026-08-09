import type { AuthRepository, SessionRepository } from "./auth";
import type { ChatState, ConversationDetail, MessagePage, MessageView } from "./chat-contracts";
import type { AccountDeletionRequest } from "./auth-contracts";
import type { Person } from "./fendee-data";
import type {
  CohostStatus,
  CreateGatherInput,
  Gather,
  GatherAudienceSelection,
  GatherNotification,
  GatherPermission,
  InviteStatus,
} from "./gather-store";
import type { FriendAudience, PresenceSession } from "./presence-store";

export type RepositoryMode = "development-local" | "production-api";

export type RepositoryResult<T> = Promise<T>;

export interface UserRepository {
  getSessionUser(): RepositoryResult<Person | null>;
  getCurrentUser(): RepositoryResult<Person | null>;
  getUserById(id: string): RepositoryResult<Person | null>;
  updateProfile(input: {
    userId: string;
    name?: string;
    bio?: string;
    avatar?: string;
  }): RepositoryResult<Person>;
}

export interface FriendRepository {
  listFriends(): RepositoryResult<Person[]>;
  listFriendRequests(): RepositoryResult<Person[]>;
  areFriends(userId: string, otherUserId: string): RepositoryResult<boolean>;
  sendFriendRequest(targetUserId: string): RepositoryResult<void>;
  acceptFriendRequest(targetUserId: string): RepositoryResult<void>;
  declineFriendRequest(targetUserId: string): RepositoryResult<void>;
  removeFriend(targetUserId: string): RepositoryResult<void>;
}

export interface GroupRepository {
  listGroups(): RepositoryResult<Array<{ id: string; name: string; memberIds: string[] }>>;
  createGroup(input: { name: string; memberIds: string[] }): RepositoryResult<string>;
  renameGroup(groupId: string, name: string): RepositoryResult<void>;
  deleteGroup(groupId: string): RepositoryResult<void>;
  addGroupMember(groupId: string, memberUserId: string): RepositoryResult<void>;
  removeGroupMember(groupId: string, memberUserId: string): RepositoryResult<void>;
}

export interface PresenceRepository {
  startPresence(input: { audience: FriendAudience }): RepositoryResult<PresenceSession>;
  stopPresence(sessionId: string): RepositoryResult<void>;
  heartbeat(sessionId: string): RepositoryResult<PresenceSession>;
  publishNearbyArea(sessionId: string, areaId: string): RepositoryResult<void>;
  unpublishNearbyArea(sessionId: string): RepositoryResult<void>;
  updateFriendSnapshot(sessionId: string): RepositoryResult<void>;
  getNearby(actorId: string): RepositoryResult<Person[]>;
}

export interface GatherRepository {
  listVisibleGathers(actorId: string): RepositoryResult<Gather[]>;
  getGatherById(actorId: string, gatherId: string): RepositoryResult<Gather | null>;
  can(actorId: string, gatherId: string, permission: GatherPermission): RepositoryResult<boolean>;
  createGather(input: CreateGatherInput): RepositoryResult<string>;
  updateGather(
    gatherId: string,
    input: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
  ): RepositoryResult<boolean>;
  inviteMore(gatherId: string, selection: GatherAudienceSelection): RepositoryResult<boolean>;
  respondToCohostInvite(
    gatherId: string,
    personId: string,
    status: Exclude<CohostStatus, "pending">,
  ): RepositoryResult<void>;
  updateRSVP(gatherId: string, personId: string, status: InviteStatus): RepositoryResult<void>;
  endGather(gatherId: string): RepositoryResult<boolean>;
}

export interface ChatRepository {
  listConversations(): RepositoryResult<ChatState>;
  getConversation(conversationId: string): RepositoryResult<ConversationDetail>;
  getOrCreateDirectConversation(targetUserId: string): RepositoryResult<ConversationDetail>;
  listMessages(input: {
    conversationId: string;
    cursor?: string | null;
    limit?: number;
  }): RepositoryResult<MessagePage>;
  sendMessage(input: {
    conversationId: string;
    body: string;
    clientMessageId: string;
  }): RepositoryResult<MessageView>;
}

export interface NotificationRepository {
  listNotifications(actorId: string): RepositoryResult<GatherNotification[]>;
  markRead(notificationId: string): RepositoryResult<void>;
  registerDevice(input: { platform: string; pushToken: string }): RepositoryResult<void>;
}

export interface PrivacyRepository {
  getPrivacySettings(
    actorId: string,
  ): RepositoryResult<{ visibility: "public" | "friends" | "hidden" }>;
  listBlockedUserIds(actorId: string): RepositoryResult<string[]>;
  blockUser(actorId: string, targetId: string): RepositoryResult<void>;
  unblockUser(actorId: string, targetId: string): RepositoryResult<void>;
}

export type ReportRecord = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  createdAt: string;
  status: "pending_backend" | "submitted";
};

export interface ReportRepository {
  createReport(input: {
    reporterId: string;
    targetId: string;
    reason: string;
  }): RepositoryResult<ReportRecord>;
  listReports(actorId: string): RepositoryResult<ReportRecord[]>;
}

export interface AccountRepository {
  requestDeletion(input?: { reason?: string }): RepositoryResult<AccountDeletionRequest>;
  requestExport(): RepositoryResult<{ requestedAt: string; status: "pending_backend" }>;
}

export type FendeeRepositories = {
  mode: RepositoryMode;
  auth: AuthRepository;
  sessions?: SessionRepository;
  users?: UserRepository;
  friends?: FriendRepository;
  groups?: GroupRepository;
  presence?: PresenceRepository;
  gather?: GatherRepository;
  chat?: ChatRepository;
  notifications?: NotificationRepository;
  privacy?: PrivacyRepository;
  reports?: ReportRepository;
  account?: AccountRepository;
};
