import { ApiError } from "./api-errors";
import { conversations as legacyConversations, messages as legacyMessages } from "./fendee-data";
import type { Conversation, ConversationParticipant, Message } from "./chat-contracts";

type ChatStoreSnapshot = {
  conversations: Map<string, Conversation>;
  participants: Map<string, ConversationParticipant>;
  messages: Map<string, Message>;
  directIndex: Map<string, string>;
  idempotencyIndex: Map<string, string>;
};

const GLOBAL_CHAT_STORE_KEY = Symbol.for("fendee.server-chat-store");
type ChatStoreRegistry = Map<string, ChatStoreSnapshot>;

const seedNowMs = Date.parse("2026-08-09T09:00:00.000Z");

function conversationParticipantKey(conversationId: string, userId: string) {
  return `${conversationId}::${userId}`;
}

function directKeyFor(userA: string, userB: string) {
  return [userA, userB].sort().join("::");
}

function idempotencyKey(conversationId: string, senderId: string, clientMessageId: string) {
  return `${conversationId}::${senderId}::${clientMessageId}`;
}

function createSeedStore(): ChatStoreSnapshot {
  const conversations = new Map<string, Conversation>();
  const participants = new Map<string, ConversationParticipant>();
  const messages = new Map<string, Message>();
  const directIndex = new Map<string, string>();
  const idempotencyIndex = new Map<string, string>();

  legacyConversations.forEach((conversationSeed, conversationIndex) => {
    const createdAt = new Date(seedNowMs + conversationIndex * 60_000).toISOString();
    const directKey = directKeyFor("me", conversationSeed.personId);
    const messageRows = legacyMessages[conversationSeed.id] ?? [];

    const conversationMessages = messageRows.map((row, messageIndex) => {
      const senderId = row.from === "me" ? "me" : conversationSeed.personId;
      const timestamp = new Date(seedNowMs + conversationIndex * 60_000 + messageIndex * 60_000);
      const clientMessageId = `${conversationSeed.id}-seed-${messageIndex + 1}`;
      const message: Message = {
        id: `${conversationSeed.id}-m${messageIndex + 1}`,
        conversationId: conversationSeed.id,
        senderId,
        body: row.text,
        clientMessageId,
        createdAt: timestamp.toISOString(),
        updatedAt: null,
        deletedAt: null,
      };
      messages.set(message.id, message);
      idempotencyIndex.set(
        idempotencyKey(conversationSeed.id, senderId, clientMessageId),
        message.id,
      );
      return message;
    });

    const lastMessage = conversationMessages.at(-1) ?? null;
    const conversation: Conversation = {
      id: conversationSeed.id,
      type: "direct",
      directKey,
      participantIds: ["me", conversationSeed.personId],
      createdAt,
      updatedAt: lastMessage?.createdAt ?? createdAt,
      lastMessageId: lastMessage?.id ?? null,
    };
    conversations.set(conversation.id, conversation);
    directIndex.set(directKey, conversation.id);

    const meLastReadMessageId =
      conversationSeed.unread > 0
        ? (conversationMessages.at(
            Math.max(0, conversationMessages.length - conversationSeed.unread - 1),
          )?.id ?? null)
        : (lastMessage?.id ?? null);
    participants.set(conversationParticipantKey(conversation.id, "me"), {
      conversationId: conversation.id,
      userId: "me",
      role: "participant",
      joinedAt: createdAt,
      lastReadMessageId: meLastReadMessageId,
    });
    participants.set(conversationParticipantKey(conversation.id, conversationSeed.personId), {
      conversationId: conversation.id,
      userId: conversationSeed.personId,
      role: "participant",
      joinedAt: createdAt,
      lastReadMessageId: lastMessage?.id ?? null,
    });
  });

  return {
    conversations,
    participants,
    messages,
    directIndex,
    idempotencyIndex,
  };
}

const globalChatStore = globalThis as typeof globalThis & {
  [GLOBAL_CHAT_STORE_KEY]?: ChatStoreRegistry;
};

function getChatStoreRegistry(): ChatStoreRegistry {
  if (!globalChatStore[GLOBAL_CHAT_STORE_KEY]) {
    globalChatStore[GLOBAL_CHAT_STORE_KEY] = new Map<string, ChatStoreSnapshot>();
  }
  return globalChatStore[GLOBAL_CHAT_STORE_KEY];
}

function getChatStore(bucketId = "global") {
  const registry = getChatStoreRegistry();
  const existing = registry.get(bucketId);
  if (existing) return existing;
  const seeded = createSeedStore();
  registry.set(bucketId, seeded);
  return seeded;
}

export function chatNowIso() {
  return new Date().toISOString();
}

export function resetChatStoreForTesting(bucketId = "global") {
  const snapshot = createSeedStore();
  getChatStoreRegistry().set(bucketId, snapshot);
  return {
    ok: true as const,
    bucketId,
    conversationCount: snapshot.conversations.size,
    messageCount: snapshot.messages.size,
  };
}

export function seedChatStoreForTesting(
  state: {
    conversations: Conversation[];
    participants: ConversationParticipant[];
    messages: Message[];
  },
  bucketId = "global",
) {
  const snapshot: ChatStoreSnapshot = {
    conversations: new Map(
      state.conversations.map((conversation) => [conversation.id, conversation]),
    ),
    participants: new Map(
      state.participants.map((participant) => [
        conversationParticipantKey(participant.conversationId, participant.userId),
        participant,
      ]),
    ),
    messages: new Map(state.messages.map((message) => [message.id, message])),
    directIndex: new Map(
      state.conversations.map((conversation) => [conversation.directKey, conversation.id]),
    ),
    idempotencyIndex: new Map(
      state.messages.map((message) => [
        idempotencyKey(message.conversationId, message.senderId, message.clientMessageId),
        message.id,
      ]),
    ),
  };
  getChatStoreRegistry().set(bucketId, snapshot);
  return {
    ok: true as const,
    bucketId,
    conversationCount: snapshot.conversations.size,
    messageCount: snapshot.messages.size,
  };
}

export function listConversationRecords(bucketId?: string) {
  return [...getChatStore(bucketId).conversations.values()];
}

export function listParticipantRecords(bucketId?: string) {
  return [...getChatStore(bucketId).participants.values()];
}

export function listMessageRecords(bucketId?: string) {
  return [...getChatStore(bucketId).messages.values()].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );
}

export function getConversationRecord(conversationId: string, bucketId?: string) {
  return getChatStore(bucketId).conversations.get(conversationId) ?? null;
}

export function requireConversationRecord(conversationId: string, bucketId?: string) {
  const conversation = getConversationRecord(conversationId, bucketId);
  if (!conversation) {
    throw new ApiError("NOT_FOUND", "Khong tim thay cuoc tro chuyen.", 404);
  }
  return conversation;
}

export function getDirectConversationRecord(userA: string, userB: string, bucketId?: string) {
  const conversationId = getChatStore(bucketId).directIndex.get(directKeyFor(userA, userB));
  return conversationId ? getConversationRecord(conversationId, bucketId) : null;
}

export function listConversationParticipants(conversationId: string, bucketId?: string) {
  return listParticipantRecords(bucketId).filter(
    (participant) => participant.conversationId === conversationId,
  );
}

export function getConversationParticipant(
  conversationId: string,
  userId: string,
  bucketId?: string,
) {
  return (
    getChatStore(bucketId).participants.get(conversationParticipantKey(conversationId, userId)) ??
    null
  );
}

export function requireConversationParticipant(
  conversationId: string,
  userId: string,
  bucketId?: string,
) {
  const participant = getConversationParticipant(conversationId, userId, bucketId);
  if (!participant) {
    throw new ApiError("FORBIDDEN", "Ban khong nam trong cuoc tro chuyen nay.", 403);
  }
  return participant;
}

export function listConversationMessages(conversationId: string, bucketId?: string) {
  return listMessageRecords(bucketId).filter(
    (message) => message.conversationId === conversationId,
  );
}

export function getMessageById(messageId: string, bucketId?: string) {
  return getChatStore(bucketId).messages.get(messageId) ?? null;
}

export function getMessageByClientMessageId(
  conversationId: string,
  senderId: string,
  clientMessageId: string,
  bucketId?: string,
) {
  const messageId = getChatStore(bucketId).idempotencyIndex.get(
    idempotencyKey(conversationId, senderId, clientMessageId),
  );
  return messageId ? getMessageById(messageId, bucketId) : null;
}

export function upsertConversationRecord(conversation: Conversation, bucketId?: string) {
  const store = getChatStore(bucketId);
  store.conversations.set(conversation.id, conversation);
  store.directIndex.set(conversation.directKey, conversation.id);
  return conversation;
}

export function upsertConversationParticipant(
  participant: ConversationParticipant,
  bucketId?: string,
) {
  getChatStore(bucketId).participants.set(
    conversationParticipantKey(participant.conversationId, participant.userId),
    participant,
  );
  return participant;
}

export function upsertMessageRecord(message: Message, bucketId?: string) {
  const store = getChatStore(bucketId);
  store.messages.set(message.id, message);
  store.idempotencyIndex.set(
    idempotencyKey(message.conversationId, message.senderId, message.clientMessageId),
    message.id,
  );
  return message;
}

export function getChatDebugSnapshot(bucketId?: string) {
  return {
    conversations: listConversationRecords(bucketId),
    participants: listParticipantRecords(bucketId),
    messages: listMessageRecords(bucketId),
  };
}

export function directConversationKey(userA: string, userB: string) {
  return directKeyFor(userA, userB);
}
