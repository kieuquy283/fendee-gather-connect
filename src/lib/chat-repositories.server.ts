import { ApiError } from "./api-errors";
import type {
  ChatState,
  Conversation,
  ConversationDetail,
  ConversationListItem,
  Message,
  MessagePage,
  MessageView,
  SendMessageInput,
} from "./chat-contracts";
import {
  chatNowIso,
  directConversationKey,
  getConversationParticipant,
  getConversationRecord,
  getDirectConversationRecord,
  getMessageByClientMessageId,
  getMessageById,
  listConversationMessages,
  listConversationParticipants,
  listConversationRecords,
  requireConversationParticipant,
  requireConversationRecord,
  resetChatStoreForTesting,
  seedChatStoreForTesting,
  upsertConversationParticipant,
  upsertConversationRecord,
  upsertMessageRecord,
} from "./chat-store.server";
import { getRequestBucketId, requireAuthContext } from "./server-auth.server";
import { areFriends, isBlockedEitherDirection } from "./social-authorization.server";
import { getPrivacyRecord, getUserRecord } from "./social-store.server";

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

function toTimeLabel(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toRelativeTimeLabel(timestamp: string) {
  const deltaMs = Math.max(0, Date.now() - Date.parse(timestamp));
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}

function requireDirectConversationPeer(conversation: Conversation, actorUserId: string) {
  const peerId = conversation.participantIds.find((participantId) => participantId !== actorUserId);
  if (!peerId) {
    throw new ApiError("INTERNAL_ERROR", "Cuoc tro chuyen bi loi participant.", 500);
  }
  return peerId;
}

function requireVisibleConversation(conversationId: string, actorUserId: string, bucketId: string) {
  const conversation = requireConversationRecord(conversationId, bucketId);
  requireConversationParticipant(conversationId, actorUserId, bucketId);
  const peerId = requireDirectConversationPeer(conversation, actorUserId);
  if (isBlockedEitherDirection(actorUserId, peerId, bucketId)) {
    throw new ApiError("FORBIDDEN", "Ban khong the mo cuoc tro chuyen nay.", 403);
  }
  const peer = getUserRecord(peerId, bucketId);
  if (!peer) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung trong cuoc tro chuyen.", 404);
  }
  return {
    conversation,
    peerId,
    peer,
  };
}

function requireMessagingAllowed(actorUserId: string, targetUserId: string, bucketId: string) {
  if (actorUserId === targetUserId) {
    throw new ApiError("VALIDATION_ERROR", "Khong the tu nhan tin cho chinh minh.", 400);
  }
  if (isBlockedEitherDirection(actorUserId, targetUserId, bucketId)) {
    throw new ApiError("FORBIDDEN", "Tin nhan nay da bi chan.", 403);
  }
  const target = getUserRecord(targetUserId, bucketId);
  if (!target) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi nhan.", 404);
  }
  const privacy = getPrivacyRecord(targetUserId, bucketId);
  if (privacy.friendsOnlyMessaging && !areFriends(actorUserId, targetUserId, bucketId)) {
    throw new ApiError("FORBIDDEN", "Nguoi nay chi nhan tin nhan tu ban be.", 403);
  }
  return target;
}

function unreadCountForActor(conversationId: string, actorUserId: string, bucketId: string) {
  const participant = getConversationParticipant(conversationId, actorUserId, bucketId);
  if (!participant) return 0;
  const conversationMessages = listConversationMessages(conversationId, bucketId).filter(
    (message) => message.senderId !== actorUserId,
  );
  if (!participant.lastReadMessageId) return conversationMessages.length;
  const lastReadIndex = conversationMessages.findIndex(
    (message) => message.id === participant.lastReadMessageId,
  );
  if (lastReadIndex < 0) return conversationMessages.length;
  return Math.max(0, conversationMessages.length - (lastReadIndex + 1));
}

function toConversationListItem(
  conversation: Conversation,
  actorUserId: string,
  bucketId: string,
): ConversationListItem | null {
  const peerId = requireDirectConversationPeer(conversation, actorUserId);
  if (isBlockedEitherDirection(actorUserId, peerId, bucketId)) return null;
  const peer = getUserRecord(peerId, bucketId);
  if (!peer) return null;
  const lastMessage = conversation.lastMessageId
    ? getMessageById(conversation.lastMessageId, bucketId)
    : null;
  return {
    id: conversation.id,
    personId: peerId,
    personName: peer.name,
    personAvatar: peer.avatar,
    personOnline: peer.online,
    lastMessagePreview: lastMessage?.body ?? "",
    lastMessageAt: lastMessage?.createdAt ?? conversation.updatedAt,
    lastMessageTimeLabel: toRelativeTimeLabel(lastMessage?.createdAt ?? conversation.updatedAt),
    unreadCount: unreadCountForActor(conversation.id, actorUserId, bucketId),
    blocked: false,
    canSend: true,
  };
}

function toConversationDetail(
  conversation: Conversation,
  actorUserId: string,
  bucketId: string,
): ConversationDetail {
  const peerId = requireDirectConversationPeer(conversation, actorUserId);
  const peer = getUserRecord(peerId, bucketId);
  if (!peer) {
    throw new ApiError("NOT_FOUND", "Khong tim thay nguoi dung trong cuoc tro chuyen.", 404);
  }
  return {
    id: conversation.id,
    personId: peerId,
    personName: peer.name,
    personAvatar: peer.avatar,
    personOnline: peer.online,
    blocked: false,
    canSend: true,
    createdAt: conversation.createdAt,
  };
}

function toMessageView(message: Message, actorUserId: string): MessageView {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    direction: message.senderId === actorUserId ? "outgoing" : "incoming",
    body: message.body,
    createdAt: message.createdAt,
    timeLabel: toTimeLabel(message.createdAt),
    status: "sent",
    clientMessageId: message.clientMessageId,
  };
}

export function listConversations(actorUserId?: string, bucketId?: string): ChatState {
  const actor = resolveActorContext(actorUserId, bucketId);
  const conversations = listConversationRecords(actor.bucketId)
    .filter((conversation) =>
      listConversationParticipants(conversation.id, actor.bucketId).some(
        (participant) => participant.userId === actor.actorUserId,
      ),
    )
    .map((conversation) => toConversationListItem(conversation, actor.actorUserId, actor.bucketId))
    .filter(Boolean)
    .sort((left, right) => Date.parse(right!.lastMessageAt) - Date.parse(left!.lastMessageAt))
    .map((item) => item!);
  return { conversations };
}

export function getConversationById(
  conversationId: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const { conversation } = requireVisibleConversation(
    conversationId,
    actor.actorUserId,
    actor.bucketId,
  );
  return toConversationDetail(conversation, actor.actorUserId, actor.bucketId);
}

export function getOrCreateDirectConversation(
  targetUserId: string,
  actorUserId?: string,
  bucketId?: string,
) {
  const actor = resolveActorContext(actorUserId, bucketId);
  requireMessagingAllowed(actor.actorUserId, targetUserId, actor.bucketId);
  const existing = getDirectConversationRecord(actor.actorUserId, targetUserId, actor.bucketId);
  if (existing) {
    return toConversationDetail(existing, actor.actorUserId, actor.bucketId);
  }

  const createdAt = chatNowIso();
  const conversation: Conversation = {
    id: `c-${crypto.randomUUID()}`,
    type: "direct",
    directKey: directConversationKey(actor.actorUserId, targetUserId),
    participantIds: [actor.actorUserId, targetUserId].sort(),
    createdAt,
    updatedAt: createdAt,
    lastMessageId: null,
  };
  upsertConversationRecord(conversation, actor.bucketId);
  upsertConversationParticipant(
    {
      conversationId: conversation.id,
      userId: actor.actorUserId,
      role: "participant",
      joinedAt: createdAt,
      lastReadMessageId: null,
    },
    actor.bucketId,
  );
  upsertConversationParticipant(
    {
      conversationId: conversation.id,
      userId: targetUserId,
      role: "participant",
      joinedAt: createdAt,
      lastReadMessageId: null,
    },
    actor.bucketId,
  );
  return toConversationDetail(conversation, actor.actorUserId, actor.bucketId);
}

export function listMessages(
  conversationId: string,
  input?: { cursor?: string | null; limit?: number },
  actorUserId?: string,
  bucketId?: string,
): MessagePage {
  const actor = resolveActorContext(actorUserId, bucketId);
  requireVisibleConversation(conversationId, actor.actorUserId, actor.bucketId);
  const sorted = listConversationMessages(conversationId, actor.bucketId);
  let endIndex = sorted.length;
  if (input?.cursor) {
    const cursorIndex = sorted.findIndex((message) => message.id === input.cursor);
    if (cursorIndex >= 0) {
      endIndex = cursorIndex;
    }
  }
  const limit = input?.limit ?? 50;
  const startIndex = Math.max(0, endIndex - limit);
  const slice = sorted.slice(startIndex, endIndex);
  return {
    items: slice.map((message) => toMessageView(message, actor.actorUserId)),
    nextCursor: startIndex > 0 ? (sorted[startIndex]?.id ?? null) : null,
    hasMore: startIndex > 0,
  };
}

export function sendMessage(input: SendMessageInput, actorUserId?: string, bucketId?: string) {
  const actor = resolveActorContext(actorUserId, bucketId);
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new ApiError("VALIDATION_ERROR", "Tin nhan khong duoc de trong.", 400);
  }
  const { conversation, peerId } = requireVisibleConversation(
    input.conversationId,
    actor.actorUserId,
    actor.bucketId,
  );
  requireMessagingAllowed(actor.actorUserId, peerId, actor.bucketId);

  const existing = getMessageByClientMessageId(
    input.conversationId,
    actor.actorUserId,
    input.clientMessageId,
    actor.bucketId,
  );
  if (existing) {
    return toMessageView(existing, actor.actorUserId);
  }

  const createdAt = chatNowIso();
  const message: Message = {
    id: `m-${crypto.randomUUID()}`,
    conversationId: input.conversationId,
    senderId: actor.actorUserId,
    body: trimmedBody,
    clientMessageId: input.clientMessageId,
    createdAt,
    updatedAt: null,
    deletedAt: null,
  };
  upsertMessageRecord(message, actor.bucketId);
  upsertConversationRecord(
    {
      ...conversation,
      updatedAt: createdAt,
      lastMessageId: message.id,
    },
    actor.bucketId,
  );
  upsertConversationParticipant(
    {
      ...requireConversationParticipant(input.conversationId, actor.actorUserId, actor.bucketId),
      lastReadMessageId: message.id,
    },
    actor.bucketId,
  );

  return toMessageView(message, actor.actorUserId);
}

export function resetChatStateDevOnly(bucketId?: string) {
  return resetChatStoreForTesting(bucketId);
}

export function seedChatStateDevOnly(
  state: {
    conversations: Conversation[];
    participants: import("./chat-contracts").ConversationParticipant[];
    messages: Message[];
  },
  bucketId?: string,
) {
  return seedChatStoreForTesting(state, bucketId);
}
