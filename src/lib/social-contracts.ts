import { z } from "zod";

export const profileVisibilityValues = ["public", "friends", "hidden"] as const;
export const friendRequestStatusValues = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "removed",
] as const;

export type ProfileVisibility = (typeof profileVisibilityValues)[number];
export type FriendRequestStatus = (typeof friendRequestStatusValues)[number];

export type ProfileSummary = {
  id: string;
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
  isFriend: boolean;
  visibility: ProfileVisibility;
  interests: string[];
  canHelp: string[];
  needHelp: string[];
  match: number;
};

export type CurrentUserProfile = ProfileSummary & {
  kind: "self";
  handle?: string;
  friendCount: number;
};

export type ViewableProfile = ProfileSummary & {
  kind: "friend" | "public";
};

export type FriendRequestView = {
  id: string;
  requesterUserId: string;
  addresseeUserId: string;
  direction: "incoming" | "outgoing";
  requestedAt: string;
  status: Extract<FriendRequestStatus, "pending">;
  mutualCount: number;
  reason: string;
  person: ProfileSummary;
};

export type FriendGroupView = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  memberIds: string[];
};

export type PrivacySettings = {
  profileVisibility: ProfileVisibility;
  shareLocation: boolean;
  showInNearby: boolean;
  relativeDistanceOnly: boolean;
  allowStrangerNotes: boolean;
  showOnlineStatus: boolean;
  allowInterestMatching: boolean;
  friendsOnlyMessaging: boolean;
  friendsOnlyGatherInvites: boolean;
};

export type ReportSubmission = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  createdAt: string;
  status: "submitted";
};

export const updateCurrentProfileSchema = z.object({
  name: z.string().trim().min(1, "Ten hien thi la bat buoc.").max(80, "Ten qua dai.").optional(),
  bio: z.string().trim().max(240, "Gioi thieu qua dai.").optional(),
  avatar: z.string().trim().min(1).max(10000).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  canHelp: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  needHelp: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
});

export const targetUserIdSchema = z.object({
  targetUserId: z.string().trim().min(1, "Thieu target user id."),
});

export const requestIdSchema = z.object({
  requestId: z.string().trim().min(1, "Thieu request id."),
});

export const groupIdSchema = z.object({
  groupId: z.string().trim().min(1, "Thieu group id."),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Ten nhom la bat buoc.").max(80, "Ten nhom qua dai."),
  description: z.string().trim().max(160, "Mo ta nhom qua dai.").default(""),
  memberIds: z.array(z.string().trim().min(1)).max(50),
});

export const renameGroupSchema = z.object({
  groupId: z.string().trim().min(1, "Thieu group id."),
  name: z.string().trim().min(1, "Ten nhom la bat buoc.").max(80, "Ten nhom qua dai."),
});

export const mutateGroupMemberSchema = z.object({
  groupId: z.string().trim().min(1, "Thieu group id."),
  memberUserId: z.string().trim().min(1, "Thieu member user id."),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(profileVisibilityValues),
  shareLocation: z.boolean(),
  showInNearby: z.boolean(),
  relativeDistanceOnly: z.boolean(),
  allowStrangerNotes: z.boolean(),
  showOnlineStatus: z.boolean(),
  allowInterestMatching: z.boolean(),
  friendsOnlyMessaging: z.boolean(),
  friendsOnlyGatherInvites: z.boolean(),
});

export const updatePrivacySettingsSchema = privacySettingsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Khong co thay doi de cap nhat.",
  });

export const reportSubmissionSchema = z.object({
  targetUserId: z.string().trim().min(1, "Thieu target user id."),
  reason: z.string().trim().min(3, "Ly do bao cao qua ngan.").max(200, "Ly do bao cao qua dai."),
});

export type UpdateCurrentProfileInput = z.infer<typeof updateCurrentProfileSchema>;
export type TargetUserIdInput = z.infer<typeof targetUserIdSchema>;
export type RequestIdInput = z.infer<typeof requestIdSchema>;
export type GroupIdInput = z.infer<typeof groupIdSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type RenameGroupInput = z.infer<typeof renameGroupSchema>;
export type MutateGroupMemberInput = z.infer<typeof mutateGroupMemberSchema>;
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>;
export type ReportSubmissionInput = z.infer<typeof reportSubmissionSchema>;
