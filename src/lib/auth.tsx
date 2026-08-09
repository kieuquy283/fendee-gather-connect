import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearSensitivePrototypeStorage,
  clearUserScopedPrototypeStorage,
  authSessionStorageKey,
} from "./prototype-storage";
import { runPrototypeTask, type PrototypeMutationStatus } from "./prototype-runtime";
import { getPerson, me } from "./fendee-data";
import { ApiError, parseApiResponse, type ApiErrorCode } from "./api-errors";
import {
  expireCurrentSession,
  getCurrentSession,
  requestAccountDeletionSession,
  signInSession,
  signOutSession,
} from "./auth.functions";
import type { AccountDeletionRequest } from "./auth-contracts";
import { allowDevelopmentLocalAuth, authRefreshIntervalMs } from "./runtime-config";
import type {
  AuthenticatedUser,
  SessionStatus,
  SignInInput,
  VerifiedSession,
} from "./auth-contracts";

export type AuthStatus = SessionStatus;
export type AuthSession = VerifiedSession;
export type { AuthenticatedUser, SignInInput };

type MutationState = {
  status: PrototypeMutationStatus;
  error: string | null;
};

type SessionSnapshotResponse = {
  status: "authenticated" | "unauthenticated" | "expired" | "revoked";
  session: AuthSession | null;
};

export interface AuthRepository {
  getSession(): Promise<SessionSnapshotResponse>;
  signIn(input: SignInInput): Promise<AuthSession>;
  signOut(): Promise<void>;
  expireSession(): Promise<void>;
  requestAccountDeletion(session: AuthSession): Promise<AccountDeletionRequest>;
}

export interface SessionRepository {
  getOptionalSession(): Promise<AuthSession | null>;
  requireSession(): Promise<AuthSession>;
  revokeSession(sessionId: string): Promise<void>;
}

const now = () => new Date().toISOString();

function userFromId(userId: string): AuthenticatedUser {
  const person = userId === me.id ? me : getPerson(userId);
  return {
    id: person?.id ?? me.id,
    name: person?.name ?? me.name,
    avatar: person?.avatar ?? me.avatar,
  };
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AuthSession>;
  return Boolean(
    session.authMethod === "development" &&
    typeof session.id === "string" &&
    typeof session.userId === "string" &&
    session.user &&
    typeof session.user.id === "string" &&
    typeof session.expiresAt === "string",
  );
}

export class DevelopmentAuthRepository implements AuthRepository {
  async getSession() {
    if (typeof window === "undefined") {
      return { status: "unauthenticated" as const, session: null };
    }

    try {
      const raw = window.localStorage.getItem(authSessionStorageKey);
      if (!raw) return { status: "unauthenticated" as const, session: null };
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidSession(parsed)) return { status: "unauthenticated" as const, session: null };
      if (Date.parse(parsed.expiresAt) <= Date.now() || parsed.status === "expired") {
        return { status: "expired" as const, session: parsed };
      }
      if (parsed.status === "revoked") {
        return { status: "revoked" as const, session: parsed };
      }
      return { status: "authenticated" as const, session: parsed };
    } catch {
      return { status: "unauthenticated" as const, session: null };
    }
  }

  async signIn(input: SignInInput) {
    const createdAt = now();
    const session: AuthSession = {
      id: `dev-${Date.now()}`,
      userId: input.userId ?? me.id,
      user: userFromId(input.userId ?? me.id),
      createdAt,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: createdAt,
      authMethod: "development",
      status: "active",
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
    }
    return session;
  }

  async signOut() {
    clearSensitivePrototypeStorage();
  }

  async expireSession() {
    if (typeof window === "undefined") return;
    const current = await this.getSession();
    if (!current.session) return;
    window.localStorage.setItem(
      authSessionStorageKey,
      JSON.stringify({
        ...current.session,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        status: "expired",
      }),
    );
  }

  async requestAccountDeletion(_session: AuthSession): Promise<AccountDeletionRequest> {
    return {
      requestedAt: now(),
      status: "pending_backend",
    };
  }
}

class ServerAuthRepository implements AuthRepository {
  async getSession() {
    return getCurrentSession();
  }

  async signIn(input: SignInInput) {
    const payload = await signInSession({ data: input });
    if (!payload.session) {
      throw new ApiError("UNAUTHENTICATED", "Không thể tạo phiên đăng nhập.", 401);
    }
    return payload.session;
  }

  async signOut() {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    });
    await parseApiResponse<{ ok: true; revokedSessionId: string | null }>(response);
  }

  async expireSession() {
    await expireCurrentSession({ data: { action: "expire-current" } });
  }

  async requestAccountDeletion(_session: AuthSession): Promise<AccountDeletionRequest> {
    return requestAccountDeletionSession();
  }
}

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  user: AuthenticatedUser | null;
  error: string | null;
  signInState: MutationState;
  signOutState: MutationState;
  deletionState: MutationState;
  repository: AuthRepository;
  signIn: (input: SignInInput) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  expireSession: () => Promise<void>;
  requestAccountDeletion: () => Promise<AccountDeletionRequest | null>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const defaultRepository = allowDevelopmentLocalAuth
  ? new DevelopmentAuthRepository()
  : new ServerAuthRepository();
const idleMutationState: MutationState = { status: "idle", error: null };

function statusFromErrorCode(code: ApiErrorCode): AuthStatus {
  if (code === "SESSION_EXPIRED") return "expired";
  if (code === "SESSION_REVOKED") return "revoked";
  if (code === "UNAUTHENTICATED") return "unauthenticated";
  return "error";
}

export function isAuthFailureCode(code: ApiErrorCode) {
  return code === "UNAUTHENTICATED" || code === "SESSION_EXPIRED" || code === "SESSION_REVOKED";
}

export function AuthProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode;
  repository?: AuthRepository;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [signInState, setSignInState] = useState<MutationState>(idleMutationState);
  const [signOutState, setSignOutState] = useState<MutationState>(idleMutationState);
  const [deletionState, setDeletionState] = useState<MutationState>(idleMutationState);

  const refreshSession = useCallback(async () => {
    try {
      const next = await repository.getSession();
      setSession(next.session);
      setStatus(next.status);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể xác minh phiên đăng nhập.";
      setSession(null);
      setStatus("error");
      setError(message);
    }
  }, [repository]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshSession();
    }, authRefreshIntervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    };

    const handleFocus = () => {
      void refreshSession();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!session || status !== "authenticated") return;
    const delay = Date.parse(session.expiresAt) - Date.now();
    if (delay <= 0) {
      setStatus("expired");
      return;
    }
    const timer = window.setTimeout(() => {
      setStatus("expired");
    }, delay + 25);
    return () => window.clearTimeout(timer);
  }, [session, status]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      setSignInState({ status: "loading", error: null });
      try {
        const previousUserId = session?.user.id ?? null;
        const next = await runPrototypeTask("auth.sign_in", () => repository.signIn(input));
        if (previousUserId && previousUserId !== next.user.id) {
          clearUserScopedPrototypeStorage();
        }
        setSession(next);
        setStatus("authenticated");
        setError(null);
        setSignInState({ status: "success", error: null });
        return next;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Đăng nhập thất bại.";
        if (err instanceof ApiError) {
          setStatus(statusFromErrorCode(err.code));
        }
        setSignInState({ status: "error", error: message });
        throw err;
      }
    },
    [repository, session?.user.id],
  );

  const signOut = useCallback(async () => {
    setSignOutState({ status: "loading", error: null });
    try {
      await repository.signOut();
      clearSensitivePrototypeStorage();
      setSession(null);
      setStatus("unauthenticated");
      setError(null);
      setSignOutState({ status: "success", error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng xuất thất bại.";
      setSignOutState({ status: "error", error: message });
      throw err;
    }
  }, [repository]);

  const expireSession = useCallback(async () => {
    await repository.expireSession();
    await refreshSession();
  }, [refreshSession, repository]);

  const requestAccountDeletion = useCallback(async () => {
    if (!session) return null;
    setDeletionState({ status: "loading", error: null });
    try {
      const request = await runPrototypeTask("auth.request_deletion", () =>
        repository.requestAccountDeletion(session),
      );
      setError(null);
      setDeletionState({ status: "success", error: null });
      return request;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể gửi yêu cầu xóa tài khoản.";
      if (err instanceof ApiError) {
        setStatus(statusFromErrorCode(err.code));
      }
      setDeletionState({ status: "error", error: message });
      throw err;
    }
  }, [repository, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: status === "authenticated" ? (session?.user ?? null) : null,
      error,
      signInState,
      signOutState,
      deletionState,
      repository,
      signIn,
      signOut,
      expireSession,
      requestAccountDeletion,
      refreshSession,
    }),
    [
      status,
      session,
      error,
      signInState,
      signOutState,
      deletionState,
      repository,
      signIn,
      signOut,
      expireSession,
      requestAccountDeletion,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  if (auth.status !== "authenticated") {
    return (
      <div
        data-testid="auth-required"
        className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-6 py-12 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">
          {auth.status === "expired"
            ? "Session expired"
            : auth.status === "revoked"
              ? "Session revoked"
              : auth.status === "error"
                ? "Session unavailable"
                : "Sign in required"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {auth.status === "error"
            ? (auth.error ?? "Không thể xác minh phiên đăng nhập của bạn lúc này.")
            : "Fendee protects presence, Gather, chat, notifications, and profile data behind an authenticated session."}
        </p>
        <div className="mt-5 flex gap-2">
          <Button className="flex-1 rounded-full" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button
            variant="secondary"
            className="flex-1 rounded-full"
            onClick={() => router.history.back()}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
