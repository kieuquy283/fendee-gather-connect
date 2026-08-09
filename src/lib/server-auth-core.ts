import { ApiError } from "./api-errors";
import type {
  AccountDeletionRequest,
  AuthenticatedUser,
  SessionRepositoryRecord,
  SessionStatus,
  SignInInput,
  VerifiedSession,
} from "./auth-contracts";
import { me } from "./fendee-data";
import { getUserIdentitySnapshot } from "./social-store.server";
import {
  allowDevelopmentIdentities,
  devIsolationCookieName,
  assertRuntimeConfiguration,
  sessionCookieName,
  sessionTtlMs,
} from "./runtime-config.server";

const GLOBAL_SESSION_STORE_KEY = Symbol.for("fendee.server-session-store");
const GLOBAL_DEV_BUCKETS_KEY = Symbol.for("fendee.dev-isolation-buckets");

type SessionStore = Map<string, SessionRepositoryRecord>;

export type AuthRequestContext = {
  status: Exclude<SessionStatus, "loading" | "error">;
  session: VerifiedSession | null;
  actorUserId: string | null;
};

const globalSessionStore = globalThis as typeof globalThis & {
  [GLOBAL_SESSION_STORE_KEY]?: SessionStore;
  [GLOBAL_DEV_BUCKETS_KEY]?: Set<string>;
};

function getDevBucketStore() {
  if (!globalSessionStore[GLOBAL_DEV_BUCKETS_KEY]) {
    globalSessionStore[GLOBAL_DEV_BUCKETS_KEY] = new Set<string>();
  }
  return globalSessionStore[GLOBAL_DEV_BUCKETS_KEY];
}

export function getSessionStore(): SessionStore {
  if (!globalSessionStore[GLOBAL_SESSION_STORE_KEY]) {
    globalSessionStore[GLOBAL_SESSION_STORE_KEY] = new Map<string, SessionRepositoryRecord>();
  }

  return globalSessionStore[GLOBAL_SESSION_STORE_KEY];
}

export function getOrCreateIsolationBucketId(existing?: string | null) {
  const bucket = existing?.trim() ? existing : crypto.randomUUID();
  getDevBucketStore().add(bucket);
  return bucket;
}

export function nowIso() {
  return new Date().toISOString();
}

function createSessionId() {
  return crypto.randomUUID();
}

function resolveAuthenticatedUser(userId: string): AuthenticatedUser {
  const person = getUserIdentitySnapshot(userId);
  return {
    id: person.id ?? me.id,
    name: person.name ?? me.name,
    avatar: person.avatar ?? me.avatar,
  };
}

export interface SessionRepository {
  create(input: {
    userId: string;
    authMethod: "server-session" | "development";
  }): SessionRepositoryRecord;
  get(sessionId: string): SessionRepositoryRecord | null;
  touch(sessionId: string): SessionRepositoryRecord | null;
  revoke(sessionId: string): SessionRepositoryRecord | null;
}

class InMemorySessionRepository implements SessionRepository {
  private readonly store = getSessionStore();

  create(input: { userId: string; authMethod: "server-session" | "development" }) {
    const createdAt = nowIso();
    const record: SessionRepositoryRecord = {
      id: createSessionId(),
      userId: input.userId,
      createdAt,
      expiresAt: new Date(Date.now() + sessionTtlMs).toISOString(),
      revokedAt: null,
      lastVerifiedAt: createdAt,
      authMethod: input.authMethod,
    };

    this.store.set(record.id, record);
    return record;
  }

  get(sessionId: string) {
    return this.store.get(sessionId) ?? null;
  }

  touch(sessionId: string) {
    const record = this.store.get(sessionId);
    if (!record) return null;
    const next = {
      ...record,
      lastVerifiedAt: nowIso(),
    };
    this.store.set(sessionId, next);
    return next;
  }

  revoke(sessionId: string) {
    const record = this.store.get(sessionId);
    if (!record) return null;
    const next = {
      ...record,
      revokedAt: record.revokedAt ?? nowIso(),
    };
    this.store.set(sessionId, next);
    return next;
  }
}

export const sessionRepository: SessionRepository = new InMemorySessionRepository();

export const developmentIdentityFixtures = {
  default: me.id,
  "alice-owner": me.id,
  "bob-friend": "hailang",
  "cara-cohost": "minhtu",
  "dan-invitee": "tuananh",
  "erin-blocked": "baongoc",
  "frank-stranger": "annanguyen",
} as const;

export function resolveDevelopmentIdentity(input: SignInInput) {
  const emailMap = new Map<string, string>([
    ["ban@email.com", me.id],
    ["google-dev@fendee.local", me.id],
    ["apple-dev@fendee.local", me.id],
    ["bob@fendee.local", "hailang"],
    ["cara@fendee.local", "minhtu"],
    ["dan@fendee.local", "tuananh"],
    ["erin@fendee.local", "baongoc"],
    ["frank@fendee.local", "annanguyen"],
  ]);

  if (input.userId) {
    return (
      developmentIdentityFixtures[input.userId as keyof typeof developmentIdentityFixtures] ??
      input.userId
    );
  }

  return emailMap.get(input.email) ?? me.id;
}

export function createVerifiedSession(record: SessionRepositoryRecord): VerifiedSession {
  const expired = Date.parse(record.expiresAt) <= Date.now();
  const revoked = Boolean(record.revokedAt);

  return {
    id: record.id,
    userId: record.userId,
    user: resolveAuthenticatedUser(record.userId),
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastVerifiedAt: record.lastVerifiedAt,
    authMethod: record.authMethod,
    status: revoked ? "revoked" : expired ? "expired" : "active",
  };
}

export function parseCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return new Map<string, string>();

  return new Map(
    cookieHeader
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
  );
}

export function readSessionIdFromCookieHeader(cookieHeader: string | null | undefined) {
  return parseCookieHeader(cookieHeader).get(sessionCookieName) ?? null;
}

export function resolveAuthContextFromSessionId(sessionId: string | null) {
  assertRuntimeConfiguration();

  if (!sessionId) {
    return {
      auth: {
        status: "unauthenticated" as const,
        session: null,
        actorUserId: null,
      },
      clearCookie: false,
    };
  }

  const record = sessionRepository.get(sessionId);
  if (!record) {
    return {
      auth: {
        status: "unauthenticated" as const,
        session: null,
        actorUserId: null,
      },
      clearCookie: true,
    };
  }

  const touched = sessionRepository.touch(sessionId) ?? record;
  const session = createVerifiedSession(touched);

  if (session.status === "expired") {
    return {
      auth: { status: "expired" as const, session, actorUserId: null },
      clearCookie: true,
    };
  }

  if (session.status === "revoked") {
    return {
      auth: { status: "revoked" as const, session, actorUserId: null },
      clearCookie: true,
    };
  }

  return {
    auth: {
      status: "authenticated" as const,
      session,
      actorUserId: session.userId,
    },
    clearCookie: false,
  };
}

export function createAccountDeletionRequestSnapshot(): AccountDeletionRequest {
  return {
    requestedAt: nowIso(),
    status: "pending_backend",
  };
}

export function assertDevelopmentIdentitiesEnabled() {
  if (!allowDevelopmentIdentities) {
    throw new ApiError(
      "REQUIRES_IDENTITY_PROVIDER",
      "Moi truong nay chua cau hinh nha cung cap danh tinh production.",
      501,
    );
  }
}
