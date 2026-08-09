import { deleteCookie, getCookie, setCookie } from "@tanstack/start-server-core";
import { ApiError } from "./api-errors";
import type {
  AccountDeletionRequest,
  SessionSnapshot,
  SignInInput,
  VerifiedSession,
} from "./auth-contracts";
import {
  assertDevelopmentIdentitiesEnabled,
  createAccountDeletionRequestSnapshot,
  createVerifiedSession,
  getOrCreateIsolationBucketId,
  developmentIdentityFixtures,
  getSessionStore,
  nowIso,
  readSessionIdFromCookieHeader,
  resolveAuthContextFromSessionId,
  resolveDevelopmentIdentity,
  sessionRepository,
  type AuthRequestContext,
} from "./server-auth-core";
import {
  devIsolationCookieName,
  getDevIsolationCookieOptions,
  getSessionCookieOptions,
  sessionCookieName,
} from "./runtime-config.server";

function serializeCookie(name: string, value: string, expiresAt: Date) {
  const options = getSessionCookieOptions(expiresAt);
  const sameSite = options.sameSite;
  const sameSiteLabel = `${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`;
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Expires=${options.expires.toUTCString()}`,
    `SameSite=${sameSiteLabel}`,
    options.httpOnly ? "HttpOnly" : null,
    options.secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export function readSessionIdFromRequest(request: Request) {
  return readSessionIdFromCookieHeader(request.headers.get("cookie"));
}

export function readIsolationBucketIdFromRequest(request: Request, sessionId: string | null) {
  const cookies = request.headers.get("cookie");
  const parsed = cookies
    ? new Map(
        cookies
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex < 0) return [part, ""];
            const key = part.slice(0, separatorIndex).trim();
            const value = part.slice(separatorIndex + 1).trim();
            return [key, decodeURIComponent(value)];
          }),
      )
    : new Map<string, string>();
  return parsed.get(devIsolationCookieName) ?? sessionId;
}

export function buildSessionCookieHeader(sessionId: string, expiresAt: string) {
  return serializeCookie(sessionCookieName, sessionId, new Date(expiresAt));
}

export function buildClearSessionCookieHeader() {
  return serializeCookie(sessionCookieName, "", new Date(0));
}

export function buildIsolationBucketCookieHeader(bucketId: string) {
  return serializeCookie(
    devIsolationCookieName,
    bucketId,
    getDevIsolationCookieOptions(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).expires,
  );
}

function clearSessionCookie() {
  deleteCookie(sessionCookieName, { path: "/", sameSite: "lax" });
}

export function issueSessionCookie(record: { id: string; expiresAt: string }) {
  setCookie(sessionCookieName, record.id, getSessionCookieOptions(new Date(record.expiresAt)));
}

export function getIsolationBucketId() {
  return getCookie(devIsolationCookieName) ?? null;
}

export function getRequestBucketId(sessionId: string) {
  return getIsolationBucketId() ?? sessionId;
}

export function getOptionalAuthContext(): AuthRequestContext {
  const resolved = resolveAuthContextFromSessionId(getCookie(sessionCookieName) ?? null);
  if (resolved.clearCookie) {
    clearSessionCookie();
  }
  return resolved.auth;
}

export function requireAuthContext(): AuthRequestContext & {
  status: "authenticated";
  session: VerifiedSession;
  actorUserId: string;
} {
  const context = getOptionalAuthContext();
  if (context.status === "authenticated") {
    return context as AuthRequestContext & {
      status: "authenticated";
      session: VerifiedSession;
      actorUserId: string;
    };
  }
  if (context.status === "expired") {
    throw new ApiError("SESSION_EXPIRED", "Phien dang nhap da het han.", 401);
  }
  if (context.status === "revoked") {
    throw new ApiError("SESSION_REVOKED", "Phien dang nhap da bi thu hoi.", 401);
  }
  throw new ApiError("UNAUTHENTICATED", "Ban can dang nhap de tiep tuc.", 401);
}

export function getSessionSnapshot(): SessionSnapshot {
  const auth = getOptionalAuthContext();
  return {
    status: auth.status,
    session: auth.session,
  };
}

export function getSessionSnapshotFromRequest(request: Request) {
  const resolved = resolveAuthContextFromSessionId(readSessionIdFromRequest(request));
  return {
    snapshot: {
      status: resolved.auth.status,
      session: resolved.auth.session,
    } satisfies SessionSnapshot,
    clearCookie: resolved.clearCookie,
  };
}

export function signInWithDevelopmentIdentity(input: SignInInput): SessionSnapshot {
  assertDevelopmentIdentitiesEnabled();

  const record = sessionRepository.create({
    userId: resolveDevelopmentIdentity(input),
    authMethod: "development",
  });

  issueSessionCookie(record);

  return {
    status: "authenticated",
    session: createVerifiedSession(record),
  };
}

export function signInWithDevelopmentIdentityForRequest(input: SignInInput) {
  assertDevelopmentIdentitiesEnabled();

  const record = sessionRepository.create({
    userId: resolveDevelopmentIdentity(input),
    authMethod: "development",
  });

  return {
    snapshot: {
      status: "authenticated" as const,
      session: createVerifiedSession(record),
    } satisfies SessionSnapshot,
    setCookieHeader: buildSessionCookieHeader(record.id, record.expiresAt),
    bucketCookieHeader: buildIsolationBucketCookieHeader(getOrCreateIsolationBucketId()),
  };
}

export function revokeActiveSession() {
  const sessionId = getCookie(sessionCookieName);
  if (!sessionId) {
    clearSessionCookie();
    return null;
  }

  const record = sessionRepository.revoke(sessionId);
  clearSessionCookie();
  return record ? createVerifiedSession(record) : null;
}

export function revokeSessionForRequest(request: Request) {
  const sessionId = readSessionIdFromRequest(request);
  if (!sessionId) {
    return {
      session: null,
      clearCookieHeader: buildClearSessionCookieHeader(),
    };
  }

  const record = sessionRepository.revoke(sessionId);
  return {
    session: record ? createVerifiedSession(record) : null,
    clearCookieHeader: buildClearSessionCookieHeader(),
  };
}

export function expireCurrentSessionForTesting() {
  const sessionId = getCookie(sessionCookieName);
  if (!sessionId) {
    throw new ApiError("UNAUTHENTICATED", "Khong co phien de het han.", 401);
  }
  const record = sessionRepository.get(sessionId);
  if (!record) {
    throw new ApiError("UNAUTHENTICATED", "Phien hien tai khong con ton tai.", 401);
  }
  const expired = {
    ...record,
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  };
  getSessionStore().set(sessionId, expired);
  return createVerifiedSession(expired);
}

export function expireSessionForRequestTesting(request: Request) {
  const sessionId = readSessionIdFromRequest(request);
  if (!sessionId) {
    throw new ApiError("UNAUTHENTICATED", "Khong co phien de het han.", 401);
  }

  const record = sessionRepository.get(sessionId);
  if (!record) {
    throw new ApiError("UNAUTHENTICATED", "Phien hien tai khong con ton tai.", 401);
  }

  const expired = {
    ...record,
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  };
  getSessionStore().set(sessionId, expired);
  return createVerifiedSession(expired);
}

export function createSessionForTesting(input: {
  userId: string;
  status?: "active" | "expired" | "revoked";
}) {
  assertDevelopmentIdentitiesEnabled();

  const record = sessionRepository.create({
    userId:
      developmentIdentityFixtures[input.userId as keyof typeof developmentIdentityFixtures] ??
      input.userId,
    authMethod: "development",
  });

  let next = record;
  if (input.status === "expired") {
    next = {
      ...next,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    getSessionStore().set(next.id, next);
  } else if (input.status === "revoked") {
    next = {
      ...next,
      revokedAt: nowIso(),
    };
    getSessionStore().set(next.id, next);
  }

  issueSessionCookie(next);

  const verified = createVerifiedSession(next);

  return {
    status: verified.status === "active" ? "authenticated" : verified.status,
    session: verified,
  } satisfies SessionSnapshot;
}

export function createSessionForRequestTesting(input: {
  userId: string;
  status?: "active" | "expired" | "revoked";
}) {
  assertDevelopmentIdentitiesEnabled();

  const record = sessionRepository.create({
    userId:
      developmentIdentityFixtures[input.userId as keyof typeof developmentIdentityFixtures] ??
      input.userId,
    authMethod: "development",
  });

  let next = record;
  if (input.status === "expired") {
    next = {
      ...next,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    getSessionStore().set(next.id, next);
  } else if (input.status === "revoked") {
    next = {
      ...next,
      revokedAt: nowIso(),
    };
    getSessionStore().set(next.id, next);
  }

  const verified = createVerifiedSession(next);

  return {
    snapshot: {
      status: verified.status === "active" ? "authenticated" : verified.status,
      session: verified,
    } satisfies SessionSnapshot,
    setCookieHeader: buildSessionCookieHeader(record.id, record.expiresAt),
    bucketCookieHeader: buildIsolationBucketCookieHeader(getOrCreateIsolationBucketId()),
  };
}

export function createAccountDeletionRequest(): AccountDeletionRequest {
  requireAuthContext();
  return createAccountDeletionRequestSnapshot();
}
