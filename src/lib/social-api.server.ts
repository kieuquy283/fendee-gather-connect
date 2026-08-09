import { z } from "zod";
import { createApiErrorResponse, ApiError } from "./api-errors";
import { allowDevelopmentIdentities } from "./runtime-config.server";
import { readIsolationBucketIdFromRequest, readSessionIdFromRequest } from "./server-auth.server";
import { resolveAuthContextFromSessionId } from "./server-auth-core";
import {
  acceptFriendRequest,
  addGroupMember,
  blockUser,
  createGroup,
  declineFriendRequest,
  deleteGroup,
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

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function requireActorContextFromRequest(request: Request) {
  const sessionId = readSessionIdFromRequest(request);
  const bucketId = readIsolationBucketIdFromRequest(request, sessionId) ?? "global";
  const resolved = resolveAuthContextFromSessionId(readSessionIdFromRequest(request));
  if (resolved.auth.status === "authenticated") {
    return {
      actorUserId: resolved.auth.actorUserId,
      bucketId,
    };
  }
  if (resolved.auth.status === "expired") {
    throw new ApiError("SESSION_EXPIRED", "Phiên đăng nhập đã hết hạn.", 401);
  }
  if (resolved.auth.status === "revoked") {
    throw new ApiError("SESSION_REVOKED", "Phiên đăng nhập đã bị thu hồi.", 401);
  }
  throw new ApiError("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục.", 401);
}

const resetSchema = z.object({
  action: z.literal("reset"),
});

export async function handleSocialApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const actor = path.startsWith("/api/d2/") ? requireActorContextFromRequest(request) : null;

    if (request.method === "GET" && path === "/api/d2/profile/me") {
      return jsonResponse(getCurrentUserProfile(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "PATCH" && path === "/api/d2/profile/me") {
      const body = updateCurrentProfileSchema.parse(await request.json());
      return jsonResponse(updateCurrentUserProfile(body, actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "GET" && path.startsWith("/api/d2/profiles/")) {
      const targetUserId = path.replace("/api/d2/profiles/", "");
      return jsonResponse(
        getProfileById(
          targetUserIdSchema.parse({ targetUserId }).targetUserId,
          actor?.actorUserId,
          actor?.bucketId,
        ),
      );
    }

    if (request.method === "GET" && path === "/api/d2/friends") {
      return jsonResponse(listFriends(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "GET" && path === "/api/d2/friends/requests/incoming") {
      return jsonResponse(listIncomingFriendRequests(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "GET" && path === "/api/d2/friends/requests/outgoing") {
      return jsonResponse(listOutgoingFriendRequests(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "GET" && path === "/api/d2/friends/suggestions") {
      return jsonResponse(listFriendSuggestions(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "POST" && path === "/api/d2/friends/requests") {
      const body = targetUserIdSchema.parse(await request.json());
      sendFriendRequest(body.targetUserId, actor?.actorUserId, actor?.bucketId);
      return jsonResponse({ ok: true });
    }

    if (
      request.method === "POST" &&
      path.endsWith("/accept") &&
      path.includes("/api/d2/friends/requests/")
    ) {
      const requestId = path.replace("/api/d2/friends/requests/", "").replace("/accept", "");
      acceptFriendRequest(
        requestIdSchema.parse({ requestId }).requestId,
        actor?.actorUserId,
        actor?.bucketId,
      );
      return jsonResponse({ ok: true });
    }

    if (
      request.method === "POST" &&
      path.endsWith("/decline") &&
      path.includes("/api/d2/friends/requests/")
    ) {
      const requestId = path.replace("/api/d2/friends/requests/", "").replace("/decline", "");
      declineFriendRequest(
        requestIdSchema.parse({ requestId }).requestId,
        actor?.actorUserId,
        actor?.bucketId,
      );
      return jsonResponse({ ok: true });
    }

    if (request.method === "DELETE" && path.startsWith("/api/d2/friends/")) {
      const targetUserId = path.replace("/api/d2/friends/", "");
      removeFriend(
        targetUserIdSchema.parse({ targetUserId }).targetUserId,
        actor?.actorUserId,
        actor?.bucketId,
      );
      return jsonResponse({ ok: true });
    }

    if (request.method === "GET" && path === "/api/d2/groups") {
      return jsonResponse(listGroups(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "POST" && path === "/api/d2/groups") {
      const body = createGroupSchema.parse(await request.json());
      return jsonResponse(createGroup(body, actor?.actorUserId, actor?.bucketId));
    }

    if (
      request.method === "PATCH" &&
      path.startsWith("/api/d2/groups/") &&
      !path.includes("/members/") &&
      !path.endsWith("/members")
    ) {
      const groupId = path.replace("/api/d2/groups/", "");
      const body = renameGroupSchema.parse({ ...(await request.json()), groupId });
      renameGroup(body.groupId, body.name, actor?.actorUserId, actor?.bucketId);
      return jsonResponse({ ok: true });
    }

    if (
      request.method === "DELETE" &&
      path.startsWith("/api/d2/groups/") &&
      !path.includes("/members/")
    ) {
      const groupId = path.replace("/api/d2/groups/", "");
      deleteGroup(groupIdSchema.parse({ groupId }).groupId, actor?.actorUserId, actor?.bucketId);
      return jsonResponse({ ok: true });
    }

    if (
      request.method === "POST" &&
      path.endsWith("/members") &&
      path.startsWith("/api/d2/groups/")
    ) {
      const groupId = path.replace("/api/d2/groups/", "").replace("/members", "");
      const json = (await request.json()) as Record<string, unknown>;
      const body = mutateGroupMemberSchema.parse({ ...json, groupId });
      addGroupMember(body.groupId, body.memberUserId, actor?.actorUserId, actor?.bucketId);
      return jsonResponse({ ok: true });
    }

    if (
      request.method === "DELETE" &&
      path.includes("/members/") &&
      path.startsWith("/api/d2/groups/")
    ) {
      const [, groupId, memberUserId] =
        path.match(/^\/api\/d2\/groups\/([^/]+)\/members\/([^/]+)$/) ?? [];
      const body = mutateGroupMemberSchema.parse({ groupId, memberUserId });
      removeGroupMember(body.groupId, body.memberUserId, actor?.actorUserId, actor?.bucketId);
      return jsonResponse({ ok: true });
    }

    if (request.method === "GET" && path === "/api/d2/privacy") {
      return jsonResponse(getPrivacySettings(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "PATCH" && path === "/api/d2/privacy") {
      const body = updatePrivacySettingsSchema.parse(await request.json());
      return jsonResponse(updatePrivacySettings(body, actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "GET" && path === "/api/d2/blocks") {
      return jsonResponse({
        blockedUserIds: listBlockedUsers(actor?.actorUserId, actor?.bucketId),
      });
    }

    if (request.method === "POST" && path === "/api/d2/blocks") {
      const body = targetUserIdSchema.parse(await request.json());
      blockUser(body.targetUserId, actor?.actorUserId, actor?.bucketId);
      return jsonResponse({ ok: true });
    }

    if (request.method === "DELETE" && path.startsWith("/api/d2/blocks/")) {
      const targetUserId = path.replace("/api/d2/blocks/", "");
      unblockUser(
        targetUserIdSchema.parse({ targetUserId }).targetUserId,
        actor?.actorUserId,
        actor?.bucketId,
      );
      return jsonResponse({ ok: true });
    }

    if (request.method === "GET" && path === "/api/d2/reports") {
      return jsonResponse(listOwnReports(actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "POST" && path === "/api/d2/reports") {
      const body = reportSubmissionSchema.parse(await request.json());
      return jsonResponse(submitReport(body, actor?.actorUserId, actor?.bucketId));
    }

    if (request.method === "POST" && path === "/api/dev/d2/reset") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D2 API chi bat trong dev/test.", 403);
      }
      resetSchema.parse(await request.json());
      return jsonResponse(
        resetSocialStateDevOnly(readIsolationBucketIdFromRequest(request, null) ?? "global"),
      );
    }
  } catch (error) {
    return createApiErrorResponse(error);
  }

  return null;
}
