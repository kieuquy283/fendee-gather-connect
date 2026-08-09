import { z } from "zod";
import { createApiErrorResponse, ApiError } from "./api-errors";
import { allowDevelopmentIdentities } from "./runtime-config.server";
import { readIsolationBucketIdFromRequest, readSessionIdFromRequest } from "./server-auth.server";
import { resolveAuthContextFromSessionId } from "./server-auth-core";
import {
  readFriendSnapshotSchema,
  seedPresenceStateSchema,
  startPresenceSchema,
  stopPresenceSchema,
  syncPresenceLocationSchema,
  updateFriendSnapshotSchema,
} from "./presence-contracts";
import {
  advancePresenceClockDevOnly,
  getFriendLocationSnapshot,
  getMyPresence,
  getNearbyPeople,
  listVisibleFriendSnapshots,
  resetPresenceStateDevOnly,
  seedPresenceStateForTesting,
  startPresence,
  stopPresence,
  syncPresenceLocation,
  updateFriendLocationSnapshot,
} from "./presence-repositories.server";
import {
  getPresenceDebugSnapshot,
  listFriendSnapshots,
  listNearbyPresenceRecords,
  listPresenceSessions,
} from "./presence-store.server";

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function requirePresenceAuth(request: Request) {
  const sessionId = readSessionIdFromRequest(request);
  const resolved = resolveAuthContextFromSessionId(sessionId);
  if (resolved.auth.status === "authenticated") {
    return {
      actorUserId: resolved.auth.actorUserId,
      bucketId: readIsolationBucketIdFromRequest(request, sessionId),
    };
  }
  if (resolved.auth.status === "expired") {
    throw new ApiError("SESSION_EXPIRED", "Phien dang nhap da het han.", 401);
  }
  if (resolved.auth.status === "revoked") {
    throw new ApiError("SESSION_REVOKED", "Phien dang nhap da bi thu hoi.", 401);
  }
  throw new ApiError("UNAUTHENTICATED", "Ban can dang nhap de tiep tuc.", 401);
}

const advanceClockSchema = z.object({
  ms: z
    .number()
    .int()
    .min(1)
    .max(24 * 60 * 60 * 1000),
});

export async function handlePresenceApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const actor =
      path.startsWith("/api/d3/") || path.startsWith("/api/dev/d3/")
        ? requirePresenceAuth(request)
        : null;

    if (request.method === "GET" && path === "/api/d3/presence/me") {
      return jsonResponse(getMyPresence(actor?.actorUserId, actor?.bucketId ?? undefined));
    }
    if (request.method === "GET" && path === "/api/d3/nearby") {
      const areaId = url.searchParams.get("areaId");
      return jsonResponse(
        getNearbyPeople(
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
          areaId === "area-a" || areaId === "area-b" || areaId === "area-c" ? areaId : undefined,
        ),
      );
    }
    if (request.method === "GET" && path === "/api/d3/friend-snapshots") {
      return jsonResponse(
        listVisibleFriendSnapshots(actor?.actorUserId, actor?.bucketId ?? undefined),
      );
    }
    if (request.method === "GET" && path.startsWith("/api/d3/friend-snapshots/")) {
      const ownerUserId = path.replace("/api/d3/friend-snapshots/", "");
      return jsonResponse(
        getFriendLocationSnapshot(
          readFriendSnapshotSchema.parse({ ownerUserId }).ownerUserId,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/d3/presence/start") {
      return jsonResponse(
        startPresence(
          startPresenceSchema.parse(await request.json()),
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/d3/presence/stop") {
      return jsonResponse(
        stopPresence(
          stopPresenceSchema.parse(await request.json()).sessionId,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/d3/presence/sync-location") {
      return jsonResponse(
        syncPresenceLocation(
          syncPresenceLocationSchema.parse(await request.json()),
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/d3/presence/update-friend-snapshot") {
      return jsonResponse(
        updateFriendLocationSnapshot(
          updateFriendSnapshotSchema.parse(await request.json()),
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }

    if (request.method === "POST" && path === "/api/dev/d3/reset") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D3 API chi bat trong dev/test.", 403);
      }
      return jsonResponse(
        resetPresenceStateDevOnly(actor?.actorUserId, actor?.bucketId ?? undefined),
      );
    }
    if (request.method === "POST" && path === "/api/dev/d3/seed") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D3 API chi bat trong dev/test.", 403);
      }
      const parsed = seedPresenceStateSchema.parse(await request.json()).state;
      return jsonResponse(
        seedPresenceStateForTesting(
          {
            permission: parsed.permission,
            location: parsed.location,
            ...(parsed.audience ? { audience: parsed.audience } : {}),
            ...(parsed.startActiveSession !== undefined
              ? { startActiveSession: parsed.startActiveSession }
              : {}),
          },
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/dev/d3/clock/advance") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D3 API chi bat trong dev/test.", 403);
      }
      return jsonResponse(
        advancePresenceClockDevOnly(
          advanceClockSchema.parse(await request.json()).ms,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "GET" && path === "/api/dev/d3/debug-state") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D3 API chi bat trong dev/test.", 403);
      }
      const targetUserId = url.searchParams.get("userId") ?? actor?.actorUserId ?? "";
      return jsonResponse({
        actor,
        targetUserId,
        snapshot: getPresenceDebugSnapshot(targetUserId, actor?.bucketId ?? undefined),
        sessions: listPresenceSessions(actor?.bucketId ?? undefined),
        nearbyPresence: listNearbyPresenceRecords(actor?.bucketId ?? undefined),
        friendSnapshots: listFriendSnapshots(actor?.bucketId ?? undefined),
      });
    }
  } catch (error) {
    return createApiErrorResponse(error);
  }

  return null;
}
