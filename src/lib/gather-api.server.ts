import { z } from "zod";
import { ApiError, createApiErrorResponse } from "./api-errors";
import {
  cohostResponseSchema,
  createGatherInputSchema,
  endGatherSchema,
  gatherCanSchema,
  inviteMoreSchema,
  readGatherByIdSchema,
  seedGatherStateSchema,
  updateGatherRsvpSchema,
  updateGatherSchema,
  type Gather,
} from "./gather-contracts";
import {
  canGather,
  createGather,
  endGather,
  getGatherById,
  getGatherState,
  inviteMore,
  resetGatherStateDevOnly,
  respondToCohostInvite,
  seedGatherStateDevOnly,
  updateGather,
  updateGatherRsvp,
} from "./gather-repositories.server";
import {
  getGatherDebugSnapshot,
  listGatherNotifications,
  listGatherRecords,
} from "./gather-store.server";
import { allowDevelopmentIdentities } from "./runtime-config.server";
import { readIsolationBucketIdFromRequest, readSessionIdFromRequest } from "./server-auth.server";
import { resolveAuthContextFromSessionId } from "./server-auth-core";

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function requireGatherAuth(request: Request) {
  const sessionId = readSessionIdFromRequest(request);
  const bucketId = readIsolationBucketIdFromRequest(request, sessionId) ?? "global";
  const resolved = resolveAuthContextFromSessionId(sessionId);
  if (resolved.auth.status === "authenticated") {
    return {
      actorUserId: resolved.auth.actorUserId,
      bucketId,
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

const resetSchema = z.object({
  action: z.literal("reset"),
});

export async function handleGatherApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const actor =
      path.startsWith("/api/d4/") || path.startsWith("/api/dev/d4/")
        ? requireGatherAuth(request)
        : null;

    if (request.method === "GET" && path === "/api/d4/gathers") {
      return jsonResponse(getGatherState(actor?.actorUserId, actor?.bucketId ?? undefined));
    }
    if (request.method === "GET" && path.startsWith("/api/d4/gathers/") && !path.endsWith("/can")) {
      const gatherId = path.replace("/api/d4/gathers/", "");
      return jsonResponse(
        getGatherById(
          readGatherByIdSchema.parse({ gatherId }).gatherId,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "GET" && path.endsWith("/can") && path.startsWith("/api/d4/gathers/")) {
      const gatherId = path.replace("/api/d4/gathers/", "").replace("/can", "");
      const permission = url.searchParams.get("permission");
      return jsonResponse(
        canGather(
          gatherCanSchema.parse({ gatherId, permission }).gatherId,
          gatherCanSchema.parse({ gatherId, permission }).permission,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/d4/gathers") {
      return jsonResponse(
        createGather(
          createGatherInputSchema.parse(await request.json()),
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "PATCH" && path.startsWith("/api/d4/gathers/")) {
      const gatherId = path.replace("/api/d4/gathers/", "");
      const body = updateGatherSchema.parse({ ...(await request.json()), gatherId });
      return jsonResponse(
        updateGather(
          body.gatherId,
          Object.fromEntries(
            Object.entries(body.patch).filter(([, value]) => value !== undefined),
          ) as Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (
      request.method === "POST" &&
      path.endsWith("/invite-more") &&
      path.startsWith("/api/d4/gathers/")
    ) {
      const gatherId = path.replace("/api/d4/gathers/", "").replace("/invite-more", "");
      const json = (await request.json()) as Record<string, unknown>;
      const body = inviteMoreSchema.parse({ ...json, gatherId });
      return jsonResponse(
        inviteMore(body.gatherId, body.selection, actor?.actorUserId, actor?.bucketId ?? undefined),
      );
    }
    if (
      request.method === "POST" &&
      path.endsWith("/cohost-response") &&
      path.startsWith("/api/d4/gathers/")
    ) {
      const gatherId = path.replace("/api/d4/gathers/", "").replace("/cohost-response", "");
      const json = (await request.json()) as Record<string, unknown>;
      const body = cohostResponseSchema.parse({ ...json, gatherId });
      return jsonResponse(
        respondToCohostInvite(
          body.gatherId,
          body.status,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (
      request.method === "POST" &&
      path.endsWith("/rsvp") &&
      path.startsWith("/api/d4/gathers/")
    ) {
      const gatherId = path.replace("/api/d4/gathers/", "").replace("/rsvp", "");
      const json = (await request.json()) as Record<string, unknown>;
      const body = updateGatherRsvpSchema.parse({ ...json, gatherId });
      return jsonResponse(
        updateGatherRsvp(
          body.gatherId,
          body.status,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path.endsWith("/end") && path.startsWith("/api/d4/gathers/")) {
      const gatherId = path.replace("/api/d4/gathers/", "").replace("/end", "");
      const body = endGatherSchema.parse({ gatherId });
      return jsonResponse(
        endGather(body.gatherId, actor?.actorUserId, actor?.bucketId ?? undefined),
      );
    }

    if (request.method === "POST" && path === "/api/dev/d4/reset") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D4 API chi bat trong dev/test.", 403);
      }
      resetSchema.parse(await request.json());
      return jsonResponse(resetGatherStateDevOnly(actor?.bucketId ?? "global"));
    }
    if (request.method === "POST" && path === "/api/dev/d4/seed") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D4 API chi bat trong dev/test.", 403);
      }
      const body = seedGatherStateSchema.parse(await request.json());
      return jsonResponse(seedGatherStateDevOnly(body.state, actor?.bucketId ?? "global"));
    }
    if (request.method === "GET" && path === "/api/dev/d4/debug-state") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D4 API chi bat trong dev/test.", 403);
      }
      const gatherId = url.searchParams.get("gatherId");
      return jsonResponse({
        actor,
        gatherId,
        gather: gatherId ? getGatherDebugSnapshot(gatherId, actor?.bucketId ?? undefined) : null,
        gathers: listGatherRecords(actor?.bucketId ?? undefined),
        notifications: listGatherNotifications(actor?.bucketId ?? undefined),
      });
    }
  } catch (error) {
    return createApiErrorResponse(error);
  }

  return null;
}
