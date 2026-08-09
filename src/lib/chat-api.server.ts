import { z } from "zod";
import { ApiError, createApiErrorResponse } from "./api-errors";
import {
  conversationIdSchema,
  directConversationTargetSchema,
  listMessagesSchema,
  seedChatStateSchema,
  sendMessageSchema,
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
import { getChatDebugSnapshot } from "./chat-store.server";
import { allowDevelopmentIdentities } from "./runtime-config.server";
import { readIsolationBucketIdFromRequest, readSessionIdFromRequest } from "./server-auth.server";
import { resolveAuthContextFromSessionId } from "./server-auth-core";

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function requireChatAuth(request: Request) {
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

export async function handleChatApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const actor =
      path.startsWith("/api/d5/") || path.startsWith("/api/dev/d5/")
        ? requireChatAuth(request)
        : null;

    if (request.method === "GET" && path === "/api/d5/conversations") {
      return jsonResponse(listConversations(actor?.actorUserId, actor?.bucketId ?? undefined));
    }
    if (
      request.method === "GET" &&
      path.startsWith("/api/d5/conversations/") &&
      !path.endsWith("/messages")
    ) {
      const conversationId = path.replace("/api/d5/conversations/", "");
      return jsonResponse(
        getConversationById(
          conversationIdSchema.parse({ conversationId }).conversationId,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (
      request.method === "GET" &&
      path.startsWith("/api/d5/conversations/") &&
      path.endsWith("/messages")
    ) {
      const conversationId = path.replace("/api/d5/conversations/", "").replace("/messages", "");
      const parsed = listMessagesSchema.parse({
        conversationId,
        cursor: url.searchParams.get("cursor"),
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      });
      return jsonResponse(
        listMessages(
          parsed.conversationId,
          { cursor: parsed.cursor ?? null, limit: parsed.limit },
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (request.method === "POST" && path === "/api/d5/conversations/direct") {
      return jsonResponse(
        getOrCreateDirectConversation(
          directConversationTargetSchema.parse(await request.json()).targetUserId,
          actor?.actorUserId,
          actor?.bucketId ?? undefined,
        ),
      );
    }
    if (
      request.method === "POST" &&
      path.startsWith("/api/d5/conversations/") &&
      path.endsWith("/messages")
    ) {
      const conversationId = path.replace("/api/d5/conversations/", "").replace("/messages", "");
      const body = sendMessageSchema.parse({ ...(await request.json()), conversationId });
      return jsonResponse(sendMessage(body, actor?.actorUserId, actor?.bucketId ?? undefined));
    }

    if (request.method === "POST" && path === "/api/dev/d5/reset") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D5 API chi bat trong dev/test.", 403);
      }
      resetSchema.parse(await request.json());
      return jsonResponse(resetChatStateDevOnly(actor?.bucketId ?? "global"));
    }
    if (request.method === "POST" && path === "/api/dev/d5/seed") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D5 API chi bat trong dev/test.", 403);
      }
      const body = seedChatStateSchema.parse(await request.json());
      return jsonResponse(seedChatStateDevOnly(body.state, actor?.bucketId ?? "global"));
    }
    if (request.method === "GET" && path === "/api/dev/d5/debug-state") {
      if (!allowDevelopmentIdentities) {
        throw new ApiError("FORBIDDEN", "Development D5 API chi bat trong dev/test.", 403);
      }
      return jsonResponse({
        actor,
        ...getChatDebugSnapshot(actor?.bucketId ?? undefined),
      });
    }
  } catch (error) {
    return createApiErrorResponse(error);
  }

  return null;
}
