import { z } from "zod";

export const conversationTypeSchema = z.enum(["direct"]);
export const participantRoleSchema = z.enum(["participant"]);
export const messageDeliveryStateSchema = z.enum(["sent"]);

export const conversationParticipantSchema = z.object({
  conversationId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  role: participantRoleSchema,
  joinedAt: z.string().datetime(),
  lastReadMessageId: z.string().trim().min(1).nullable(),
});

export const conversationSchema = z.object({
  id: z.string().trim().min(1),
  type: conversationTypeSchema,
  directKey: z.string().trim().min(1),
  participantIds: z.array(z.string().trim().min(1)).length(2),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastMessageId: z.string().trim().min(1).nullable(),
});

export const messageSchema = z.object({
  id: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
  senderId: z.string().trim().min(1),
  body: z.string().trim().min(1),
  clientMessageId: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
});

export const conversationListItemSchema = z.object({
  id: z.string().trim().min(1),
  personId: z.string().trim().min(1),
  personName: z.string().trim().min(1),
  personAvatar: z.string().trim().min(1),
  personOnline: z.boolean(),
  lastMessagePreview: z.string(),
  lastMessageAt: z.string().datetime(),
  lastMessageTimeLabel: z.string().trim().min(1),
  unreadCount: z.number().int().min(0),
  blocked: z.boolean(),
  canSend: z.boolean(),
});

export const conversationDetailSchema = z.object({
  id: z.string().trim().min(1),
  personId: z.string().trim().min(1),
  personName: z.string().trim().min(1),
  personAvatar: z.string().trim().min(1),
  personOnline: z.boolean(),
  blocked: z.boolean(),
  canSend: z.boolean(),
  createdAt: z.string().datetime(),
});

export const messageViewSchema = z.object({
  id: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
  senderId: z.string().trim().min(1),
  direction: z.enum(["incoming", "outgoing"]),
  body: z.string(),
  createdAt: z.string().datetime(),
  timeLabel: z.string().trim().min(1),
  status: messageDeliveryStateSchema,
  clientMessageId: z.string().trim().min(1),
});

export const messagePageSchema = z.object({
  items: z.array(messageViewSchema),
  nextCursor: z.string().trim().min(1).nullable(),
  hasMore: z.boolean(),
});

export const chatStateSchema = z.object({
  conversations: z.array(conversationListItemSchema),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().trim().min(1, "Thieu conversation id."),
});

export const directConversationTargetSchema = z.object({
  targetUserId: z.string().trim().min(1, "Thieu target user id."),
});

export const listMessagesSchema = z.object({
  conversationId: z.string().trim().min(1, "Thieu conversation id."),
  cursor: z.string().trim().min(1).nullable().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().trim().min(1, "Thieu conversation id."),
  body: z.string().trim().min(1, "Tin nhan khong duoc de trong.").max(2000, "Tin nhan qua dai."),
  clientMessageId: z.string().trim().min(1, "Thieu client message id."),
});

export const seedChatStateSchema = z.object({
  state: z.object({
    conversations: z.array(conversationSchema),
    participants: z.array(conversationParticipantSchema),
    messages: z.array(messageSchema),
  }),
});

export type ConversationType = z.infer<typeof conversationTypeSchema>;
export type ParticipantRole = z.infer<typeof participantRoleSchema>;
export type ConversationParticipant = z.infer<typeof conversationParticipantSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
export type MessageView = z.infer<typeof messageViewSchema>;
export type MessagePage = z.infer<typeof messagePageSchema>;
export type ChatState = z.infer<typeof chatStateSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
