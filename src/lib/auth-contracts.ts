import { z } from "zod";

export const sessionStateValues = [
  "loading",
  "authenticated",
  "unauthenticated",
  "expired",
  "revoked",
  "error",
] as const;

export const sessionRecordStatusValues = ["active", "expired", "revoked"] as const;
export const authMethodValues = ["server-session", "development"] as const;

export type SessionStatus = (typeof sessionStateValues)[number];
export type SessionRecordStatus = (typeof sessionRecordStatusValues)[number];
export type AuthMethod = (typeof authMethodValues)[number];

export type AuthenticatedUser = {
  id: string;
  name: string;
  avatar: string;
};

export type VerifiedSession = {
  id: string;
  userId: string;
  user: AuthenticatedUser;
  createdAt: string;
  expiresAt: string;
  lastVerifiedAt: string;
  authMethod: AuthMethod;
  status: SessionRecordStatus;
};

export type SessionSnapshot = {
  status: Exclude<SessionStatus, "loading" | "error">;
  session: VerifiedSession | null;
};

export type AccountDeletionRequest = {
  requestedAt: string;
  status: "pending_backend";
};

export type SessionRepositoryRecord = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastVerifiedAt: string;
  authMethod: AuthMethod;
};

export const signInInputSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().trim().min(1, "Mật khẩu là bắt buộc."),
  userId: z.string().trim().optional(),
});

export const requestAccountDeletionSchema = z.object({
  reason: z.string().trim().max(280).optional(),
});

export type SignInInput = z.infer<typeof signInInputSchema>;
