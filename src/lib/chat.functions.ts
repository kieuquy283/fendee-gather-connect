import { createServerFn } from "@tanstack/react-start";
import {
  conversationIdSchema,
  directConversationTargetSchema,
  listMessagesSchema,
  seedChatStateSchema,
  sendMessageSchema,
  type ChatState,
  type ConversationDetail,
  type ConversationParticipant,
  type Conversation,
  type Message,
  type MessagePage,
  type MessageView,
  type SendMessageInput,
} from "./chat-contracts";
import {
  getConversationById,
  getOrCreateDirectConversation,
  listConversations,
  listMessages,
  resetChatStateDevOnly,
  seedChatStateDevOnly,
  sendMessage,
} from "./chat-repositories.server";

export const listConversationsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listConversations() satisfies ChatState;
});

export const getConversationByIdFn = createServerFn({ method: "GET" })
  .validator(conversationIdSchema)
  .handler(async ({ data }) => {
    return getConversationById(data.conversationId) satisfies ConversationDetail;
  });

export const getOrCreateDirectConversationFn = createServerFn({ method: "POST" })
  .validator(directConversationTargetSchema)
  .handler(async ({ data }) => {
    return getOrCreateDirectConversation(data.targetUserId) satisfies ConversationDetail;
  });

export const listMessagesFn = createServerFn({ method: "GET" })
  .validator(listMessagesSchema)
  .handler(async ({ data }) => {
    return listMessages(data.conversationId, {
      cursor: data.cursor ?? null,
      limit: data.limit,
    }) satisfies MessagePage;
  });

export const sendMessageFn = createServerFn({ method: "POST" })
  .validator(sendMessageSchema)
  .handler(async ({ data }) => {
    return sendMessage(data) satisfies MessageView;
  });

export const resetChatStateDevFn = createServerFn({ method: "POST" }).handler(async () => {
  return resetChatStateDevOnly();
});

export const seedChatStateDevFn = createServerFn({ method: "POST" })
  .validator(seedChatStateSchema)
  .handler(async ({ data }) => {
    return seedChatStateDevOnly(data.state);
  });

export type {
  ChatState,
  Conversation,
  ConversationDetail,
  ConversationParticipant,
  Message,
  MessagePage,
  MessageView,
  SendMessageInput,
};
