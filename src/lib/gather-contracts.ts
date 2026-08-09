import { z } from "zod";

export const gatherHostRoleSchema = z.enum(["owner", "cohost"]);
export const cohostStatusSchema = z.enum(["pending", "accepted", "declined"]);
export const inviteStatusSchema = z.enum(["sent", "seen", "going", "maybe", "declined"]);
export const gatherAudienceSourceSchema = z.enum([
  "all_friends",
  "groups",
  "selected_friends",
  "mixed",
]);
export const gatherStatusSchema = z.enum(["live", "expired", "ended"]);
export const gatherNotificationTypeSchema = z.enum([
  "COHOST_INVITE",
  "COHOST_ACCEPTED",
  "COHOST_DECLINED",
  "GATHER_INVITE",
  "RSVP_GOING",
  "RSVP_MAYBE",
  "RSVP_DECLINED",
  "GATHER_UPDATED",
  "GATHER_EXPIRING",
  "GATHER_ENDED",
]);

export const gatherAudienceSelectionSchema = z.object({
  includeAllFriends: z.boolean(),
  groupIds: z.array(z.string().trim().min(1)).default([]),
  friendIds: z.array(z.string().trim().min(1)).default([]),
});

export const gatherAudienceSnapshotSchema = z.object({
  source: gatherAudienceSourceSchema,
  selectedGroupIds: z.array(z.string().trim().min(1)),
  selectedFriendIds: z.array(z.string().trim().min(1)),
  resolvedRecipientIds: z.array(z.string().trim().min(1)),
  resolvedAt: z.string().datetime(),
});

export const gatherHostSchema = z.object({
  personId: z.string().trim().min(1),
  role: gatherHostRoleSchema,
  cohostStatus: cohostStatusSchema,
  invitedAt: z.string().datetime(),
  respondedAt: z.string().datetime().optional(),
});

export const gatherInviteSchema = z.object({
  id: z.string().trim().min(1),
  gatherId: z.string().trim().min(1),
  personId: z.string().trim().min(1),
  status: inviteStatusSchema,
  source: gatherAudienceSourceSchema,
  sourceLabels: z.array(z.string()),
  sentAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const gatherSchema = z.object({
  id: z.string().trim().min(1),
  ownerId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  note: z.string(),
  place: z.string().trim().min(1),
  distance: z.string(),
  startsIn: z.string(),
  duration: z.string().trim().min(1),
  expiresAt: z.string(),
  expiresAtMs: z.number().int(),
  status: gatherStatusSchema,
  hosts: z.array(gatherHostSchema),
  invites: z.array(gatherInviteSchema),
  audienceSnapshot: gatherAudienceSnapshotSchema,
  slots: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const gatherNotificationSchema = z.object({
  id: z.string().trim().min(1),
  type: gatherNotificationTypeSchema,
  gatherId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  recipientId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  body: z.string(),
  pushBody: z.string(),
  time: z.string(),
  unread: z.boolean(),
  deepLink: z.string().trim().min(1),
});

export const createGatherInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  note: z.string().max(500),
  place: z.string().trim().min(1).max(160),
  duration: z.string().trim().min(1).max(32),
  cohostSelection: gatherAudienceSelectionSchema,
  inviteSelection: gatherAudienceSelectionSchema,
});

export const gatherPermissionSchema = z.enum([
  "edit_content",
  "edit_note",
  "edit_image",
  "edit_place",
  "edit_expiry",
  "manage_cohosts",
  "manage_audience",
  "invite_more",
  "end_gather",
  "delete_gather",
  "view_rsvp",
  "publish_updates",
]);

export const updateGatherSchema = z.object({
  gatherId: z.string().trim().min(1),
  patch: z
    .object({
      title: z.string().trim().min(1).max(120).optional(),
      note: z.string().max(500).optional(),
      place: z.string().trim().min(1).max(160).optional(),
      duration: z.string().trim().min(1).max(32).optional(),
      expiresAt: z.string().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "Gather patch is required."),
});

export const inviteMoreSchema = z.object({
  gatherId: z.string().trim().min(1),
  selection: gatherAudienceSelectionSchema,
});

export const cohostResponseSchema = z.object({
  gatherId: z.string().trim().min(1),
  status: z.enum(["accepted", "declined"]),
});

export const updateGatherRsvpSchema = z.object({
  gatherId: z.string().trim().min(1),
  status: inviteStatusSchema,
});

export const endGatherSchema = z.object({
  gatherId: z.string().trim().min(1),
});

export const readGatherByIdSchema = z.object({
  gatherId: z.string().trim().min(1),
});

export const gatherCanSchema = z.object({
  gatherId: z.string().trim().min(1),
  permission: gatherPermissionSchema,
});

export const seedGatherStateSchema = z.object({
  state: z.object({
    gathers: z.array(gatherSchema),
    notifications: z.array(gatherNotificationSchema),
  }),
});

export type GatherHostRole = z.infer<typeof gatherHostRoleSchema>;
export type CohostStatus = z.infer<typeof cohostStatusSchema>;
export type InviteStatus = z.infer<typeof inviteStatusSchema>;
export type GatherAudienceSource = z.infer<typeof gatherAudienceSourceSchema>;
export type GatherStatus = z.infer<typeof gatherStatusSchema>;
export type GatherNotificationType = z.infer<typeof gatherNotificationTypeSchema>;
export type GatherAudienceSelection = z.infer<typeof gatherAudienceSelectionSchema>;
export type GatherAudienceSnapshot = z.infer<typeof gatherAudienceSnapshotSchema>;
export type GatherHost = z.infer<typeof gatherHostSchema>;
export type GatherInvite = z.infer<typeof gatherInviteSchema>;
export type Gather = z.infer<typeof gatherSchema>;
export type GatherNotification = z.infer<typeof gatherNotificationSchema>;
export type CreateGatherInput = z.infer<typeof createGatherInputSchema>;
export type GatherPermission = z.infer<typeof gatherPermissionSchema>;
