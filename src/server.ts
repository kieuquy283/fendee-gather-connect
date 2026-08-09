import "./lib/error-capture";

import { z } from "zod";
import { consumeLastCapturedError } from "./lib/error-capture";
import { ApiError, createApiErrorResponse } from "./lib/api-errors";
import { signInInputSchema } from "./lib/auth-contracts";
import { handleChatApiRequest } from "./lib/chat-api.server";
import { renderErrorPage } from "./lib/error-page";
import { handleGatherApiRequest } from "./lib/gather-api.server";
import { allowDevelopmentIdentities } from "./lib/runtime-config.server";
import { handlePresenceApiRequest } from "./lib/presence-api.server";
import { handleSocialApiRequest } from "./lib/social-api.server";
import { resolveAuthContextFromSessionId } from "./lib/server-auth-core";
import {
  buildClearSessionCookieHeader,
  buildIsolationBucketCookieHeader,
  createSessionForRequestTesting,
  expireSessionForRequestTesting,
  getSessionSnapshotFromRequest,
  readIsolationBucketIdFromRequest,
  readSessionIdFromRequest,
  revokeSessionForRequest,
  signInWithDevelopmentIdentityForRequest,
} from "./lib/server-auth.server";
import { getOrCreateIsolationBucketId } from "./lib/server-auth-core";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const devSessionBodySchema = z.object({
  userId: z.string().trim().optional(),
  status: z.enum(["active", "expired", "revoked"]).optional(),
  action: z.enum(["create", "clear", "expire-current", "revoke-current"]).default("create"),
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function cookieHeaders(...values: string[]) {
  const headers = new Headers();
  for (const value of values.filter(Boolean)) {
    headers.append("set-cookie", value);
  }
  return headers;
}

async function handleAuthApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  try {
    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      const { snapshot, clearCookie } = getSessionSnapshotFromRequest(request);
      return jsonResponse(
        snapshot,
        clearCookie
          ? {
              headers: {
                "set-cookie": buildClearSessionCookieHeader(),
              },
            }
          : undefined,
      );
    }

    if (request.method === "POST" && url.pathname === "/api/auth/sign-in") {
      const input = signInInputSchema.parse(await request.json());
      const result = signInWithDevelopmentIdentityForRequest(input);
      const existingBucket = readIsolationBucketIdFromRequest(request, null);
      return jsonResponse(result.snapshot, {
        headers: cookieHeaders(
          result.setCookieHeader,
          existingBucket
            ? ""
            : buildIsolationBucketCookieHeader(getOrCreateIsolationBucketId(existingBucket)),
        ),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/sign-out") {
      const result = revokeSessionForRequest(request);
      return jsonResponse(
        {
          ok: true,
          revokedSessionId: result.session?.id ?? null,
        },
        {
          headers: {
            "set-cookie": result.clearCookieHeader,
          },
        },
      );
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      const resolved = resolveAuthContextFromSessionId(readSessionIdFromRequest(request));
      if (resolved.auth.status !== "authenticated") {
        const response = createApiErrorResponse(
          resolved.auth.status === "expired"
            ? new ApiError("SESSION_EXPIRED", "Phiên đăng nhập đã hết hạn.", 401)
            : resolved.auth.status === "revoked"
              ? new ApiError("SESSION_REVOKED", "Phiên đăng nhập đã bị thu hồi.", 401)
              : new ApiError("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục.", 401),
        );
        if (resolved.clearCookie) {
          response.headers.set("set-cookie", buildClearSessionCookieHeader());
        }
        return response;
      }

      return jsonResponse({
        actorUserId: resolved.auth.actorUserId,
        queryUserId: url.searchParams.get("userId"),
        sessionId: resolved.auth.session.id,
      });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/account-deletion") {
      const resolved = resolveAuthContextFromSessionId(readSessionIdFromRequest(request));
      if (resolved.auth.status !== "authenticated") {
        const response = createApiErrorResponse(
          resolved.auth.status === "expired"
            ? new ApiError("SESSION_EXPIRED", "Phiên đăng nhập đã hết hạn.", 401)
            : resolved.auth.status === "revoked"
              ? new ApiError("SESSION_REVOKED", "Phiên đăng nhập đã bị thu hồi.", 401)
              : new ApiError("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục.", 401),
        );
        if (resolved.clearCookie) {
          response.headers.set("set-cookie", buildClearSessionCookieHeader());
        }
        return response;
      }

      return jsonResponse({
        requestedAt: new Date().toISOString(),
        status: "pending_backend",
      });
    }

    if (request.method === "POST" && url.pathname === "/api/dev/auth/session") {
      if (!allowDevelopmentIdentities) {
        return createApiErrorResponse(
          new ApiError("FORBIDDEN", "Development session API chỉ bật trong dev/test.", 403),
        );
      }

      const body = devSessionBodySchema.parse(await request.json());
      if (body.action === "clear") {
        const result = revokeSessionForRequest(request);
        return jsonResponse({ ok: true }, { headers: { "set-cookie": result.clearCookieHeader } });
      }

      if (body.action === "expire-current") {
        return jsonResponse({ ok: true, session: expireSessionForRequestTesting(request) });
      }

      if (body.action === "revoke-current") {
        const result = revokeSessionForRequest(request);
        return jsonResponse(
          { ok: true, session: result.session },
          { headers: { "set-cookie": result.clearCookieHeader } },
        );
      }

      const result = createSessionForRequestTesting({
        userId: body.userId ?? "alice-owner",
        ...(body.status ? { status: body.status } : {}),
      });
      const existingBucket = readIsolationBucketIdFromRequest(request, null);

      return jsonResponse(result.snapshot, {
        headers: cookieHeaders(
          result.setCookieHeader,
          existingBucket
            ? ""
            : buildIsolationBucketCookieHeader(getOrCreateIsolationBucketId(existingBucket)),
        ),
      });
    }
  } catch (error) {
    return createApiErrorResponse(error);
  }

  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleAuthApiRequest(request);
      if (apiResponse) {
        return apiResponse;
      }

      const socialApiResponse = await handleSocialApiRequest(request);
      if (socialApiResponse) {
        return socialApiResponse;
      }

      const presenceApiResponse = await handlePresenceApiRequest(request);
      if (presenceApiResponse) {
        return presenceApiResponse;
      }

      const gatherApiResponse = await handleGatherApiRequest(request);
      if (gatherApiResponse) {
        return gatherApiResponse;
      }

      const chatApiResponse = await handleChatApiRequest(request);
      if (chatApiResponse) {
        return chatApiResponse;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
