import { createServerFn } from "@tanstack/react-start";
import type {
  CreateGroupInput,
  CurrentUserProfile,
  FriendGroupView,
  FriendRequestView,
  PrivacySettings,
  ProfileSummary,
  ReportSubmission,
  UpdateCurrentProfileInput,
  UpdatePrivacySettingsInput,
  ViewableProfile,
} from "./social-contracts";
import {
  createGroupSchema,
  groupIdSchema,
  mutateGroupMemberSchema,
  renameGroupSchema,
  reportSubmissionSchema,
  requestIdSchema,
  targetUserIdSchema,
  updateCurrentProfileSchema,
  updatePrivacySettingsSchema,
} from "./social-contracts";
import {
  acceptFriendRequest,
  addGroupMember,
  blockUser,
  cancelFriendRequest,
  createGroup,
  declineFriendRequest,
  deleteGroup,
  getBlockedProfileState,
  getCurrentUserProfile,
  getPrivacySettings,
  getProfileById,
  listBlockedUsers,
  listFriendSuggestions,
  listFriends,
  listGroups,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  listOwnReports,
  removeFriend,
  removeGroupMember,
  renameGroup,
  resetSocialStateDevOnly,
  sendFriendRequest,
  submitReport,
  unblockUser,
  updateCurrentUserProfile,
  updatePrivacySettings,
} from "./social-repositories.server";

export const getCurrentProfileFn = createServerFn({ method: "GET" }).handler(async () => {
  return getCurrentUserProfile() satisfies CurrentUserProfile;
});

export const getProfileByIdFn = createServerFn({ method: "GET" })
  .validator(targetUserIdSchema)
  .handler(async ({ data }) => {
    return getProfileById(data.targetUserId) satisfies ViewableProfile;
  });

export const updateCurrentProfileFn = createServerFn({ method: "POST" })
  .validator(updateCurrentProfileSchema)
  .handler(async ({ data }) => {
    return updateCurrentUserProfile(data) satisfies CurrentUserProfile;
  });

export const listFriendsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listFriends() satisfies ProfileSummary[];
});

export const listIncomingFriendRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listIncomingFriendRequests() satisfies FriendRequestView[];
});

export const listOutgoingFriendRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listOutgoingFriendRequests() satisfies FriendRequestView[];
});

export const listFriendSuggestionsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listFriendSuggestions() satisfies ProfileSummary[];
});

export const sendFriendRequestFn = createServerFn({ method: "POST" })
  .validator(targetUserIdSchema)
  .handler(async ({ data }) => {
    sendFriendRequest(data.targetUserId);
    return { ok: true as const };
  });

export const acceptFriendRequestFn = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    acceptFriendRequest(data.requestId);
    return { ok: true as const };
  });

export const declineFriendRequestFn = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    declineFriendRequest(data.requestId);
    return { ok: true as const };
  });

export const cancelFriendRequestFn = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    cancelFriendRequest(data.requestId);
    return { ok: true as const };
  });

export const removeFriendFn = createServerFn({ method: "POST" })
  .validator(targetUserIdSchema)
  .handler(async ({ data }) => {
    removeFriend(data.targetUserId);
    return { ok: true as const };
  });

export const listGroupsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listGroups() satisfies FriendGroupView[];
});

export const createGroupFn = createServerFn({ method: "POST" })
  .validator(createGroupSchema)
  .handler(async ({ data }) => {
    return createGroup(data) satisfies FriendGroupView;
  });

export const renameGroupFn = createServerFn({ method: "POST" })
  .validator(renameGroupSchema)
  .handler(async ({ data }) => {
    renameGroup(data.groupId, data.name);
    return { ok: true as const };
  });

export const deleteGroupFn = createServerFn({ method: "POST" })
  .validator(groupIdSchema)
  .handler(async ({ data }) => {
    deleteGroup(data.groupId);
    return { ok: true as const };
  });

export const addGroupMemberFn = createServerFn({ method: "POST" })
  .validator(mutateGroupMemberSchema)
  .handler(async ({ data }) => {
    addGroupMember(data.groupId, data.memberUserId);
    return { ok: true as const };
  });

export const removeGroupMemberFn = createServerFn({ method: "POST" })
  .validator(mutateGroupMemberSchema)
  .handler(async ({ data }) => {
    removeGroupMember(data.groupId, data.memberUserId);
    return { ok: true as const };
  });

export const getPrivacySettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  return getPrivacySettings() satisfies PrivacySettings;
});

export const updatePrivacySettingsFn = createServerFn({ method: "POST" })
  .validator(updatePrivacySettingsSchema)
  .handler(async ({ data }) => {
    return updatePrivacySettings(data) satisfies PrivacySettings;
  });

export const listBlockedUsersFn = createServerFn({ method: "GET" }).handler(async () => {
  return listBlockedUsers() satisfies string[];
});

export const blockUserFn = createServerFn({ method: "POST" })
  .validator(targetUserIdSchema)
  .handler(async ({ data }) => {
    blockUser(data.targetUserId);
    return { ok: true as const };
  });

export const unblockUserFn = createServerFn({ method: "POST" })
  .validator(targetUserIdSchema)
  .handler(async ({ data }) => {
    unblockUser(data.targetUserId);
    return { ok: true as const };
  });

export const getBlockedProfileStateFn = createServerFn({ method: "GET" })
  .validator(targetUserIdSchema)
  .handler(async ({ data }) => {
    return { blocked: getBlockedProfileState(data.targetUserId) };
  });

export const submitReportFn = createServerFn({ method: "POST" })
  .validator(reportSubmissionSchema)
  .handler(async ({ data }) => {
    return submitReport(data) satisfies ReportSubmission;
  });

export const listOwnReportsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listOwnReports() satisfies ReportSubmission[];
});

export const resetSocialStateDevFn = createServerFn({ method: "POST" }).handler(async () => {
  return resetSocialStateDevOnly();
});

export type {
  CreateGroupInput,
  CurrentUserProfile,
  FriendGroupView,
  FriendRequestView,
  PrivacySettings,
  ProfileSummary,
  ReportSubmission,
  UpdateCurrentProfileInput,
  UpdatePrivacySettingsInput,
  ViewableProfile,
};
