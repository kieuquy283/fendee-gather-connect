export type AppEnvironment = "development" | "test" | "staging" | "production";
export type AuthDriver = "server-session" | "development-local";

const serverEnv = typeof process !== "undefined" ? process.env : undefined;

function normalizeAppEnvironment(value: string | undefined): AppEnvironment {
  switch (value) {
    case "test":
    case "staging":
    case "production":
      return value;
    default:
      return "development";
  }
}

function normalizeAuthDriver(value: string | undefined): AuthDriver {
  return value === "development-local" ? "development-local" : "server-session";
}

export const appEnvironment = normalizeAppEnvironment(
  serverEnv?.["FENDEE_APP_ENV"] ?? serverEnv?.["NODE_ENV"],
);

export const authDriver = normalizeAuthDriver(serverEnv?.["FENDEE_AUTH_DRIVER"]);
export const sessionCookieName = serverEnv?.["FENDEE_SESSION_COOKIE_NAME"] || "fendee_session";
export const devIsolationCookieName =
  serverEnv?.["FENDEE_DEV_ISOLATION_COOKIE_NAME"] || "fendee_dev_bucket";
export const sessionTtlMs = Number(serverEnv?.["FENDEE_SESSION_TTL_MS"] ?? 8 * 60 * 60 * 1000);
export const sessionCookieGraceMs = Number(
  serverEnv?.["FENDEE_SESSION_COOKIE_GRACE_MS"] ?? 5 * 60 * 1000,
);

export const isProductionLike = appEnvironment === "production" || appEnvironment === "staging";
export const isDevelopmentLike = appEnvironment === "development" || appEnvironment === "test";
export const allowDevelopmentIdentities = isDevelopmentLike;

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProductionLike,
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt.getTime() + sessionCookieGraceMs),
  };
}

export function getDevIsolationCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProductionLike,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function assertRuntimeConfiguration() {
  if (!Number.isFinite(sessionTtlMs) || sessionTtlMs <= 0) {
    throw new Error("Invalid FENDEE_SESSION_TTL_MS configuration.");
  }

  if (!Number.isFinite(sessionCookieGraceMs) || sessionCookieGraceMs < 0) {
    throw new Error("Invalid FENDEE_SESSION_COOKIE_GRACE_MS configuration.");
  }

  if (isProductionLike && authDriver === "development-local") {
    throw new Error("development-local auth is not allowed in staging or production.");
  }
}
