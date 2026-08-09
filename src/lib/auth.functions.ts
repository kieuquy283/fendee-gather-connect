import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createAccountDeletionRequest,
  expireCurrentSessionForTesting,
  getSessionSnapshot,
  revokeActiveSession,
  signInWithDevelopmentIdentity,
} from "./server-auth.server";
import type { AccountDeletionRequest, SessionSnapshot, SignInInput } from "./auth-contracts";
import { signInInputSchema } from "./auth-contracts";
import type { VerifiedSession } from "./auth-contracts";

type SessionSnapshotResponse = {
  status: "authenticated" | "unauthenticated" | "expired" | "revoked";
  session: VerifiedSession | null;
};

const expireSessionSchema = z.object({
  action: z.literal("expire-current"),
});

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionSnapshot() satisfies SessionSnapshotResponse;
});

export const signInSession = createServerFn({ method: "POST" })
  .validator(signInInputSchema)
  .handler(async ({ data }) => {
    return signInWithDevelopmentIdentity(data) satisfies SessionSnapshot;
  });

export const signOutSession = createServerFn({ method: "POST" }).handler(async () => {
  const revoked = revokeActiveSession();
  return {
    ok: true as const,
    revokedSessionId: revoked?.id ?? null,
  };
});

export const requestAccountDeletionSession = createServerFn({ method: "POST" }).handler(
  async () => {
    return createAccountDeletionRequest() satisfies AccountDeletionRequest;
  },
);

export const expireCurrentSession = createServerFn({ method: "POST" })
  .validator(expireSessionSchema)
  .handler(async () => {
    return {
      ok: true as const,
      session: expireCurrentSessionForTesting(),
    };
  });

export type { SessionSnapshotResponse, SignInInput };
