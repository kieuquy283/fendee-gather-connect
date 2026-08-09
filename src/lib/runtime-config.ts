type ClientAppEnvironment = "development" | "test" | "staging" | "production";
type ClientAuthDriver = "server-session" | "development-local";

function normalizeClientEnvironment(value: string | undefined): ClientAppEnvironment {
  switch (value) {
    case "test":
    case "staging":
    case "production":
      return value;
    default:
      return "development";
  }
}

function normalizeClientAuthDriver(value: string | undefined): ClientAuthDriver {
  return value === "development-local" ? "development-local" : "server-session";
}

export const clientAppEnvironment = normalizeClientEnvironment(
  import.meta.env["VITE_FENDEE_APP_ENV"] ?? import.meta.env.MODE,
);
export const clientAuthDriver = normalizeClientAuthDriver(
  import.meta.env["VITE_FENDEE_AUTH_DRIVER"],
);
export const allowDevelopmentLocalAuth =
  (clientAppEnvironment === "development" || clientAppEnvironment === "test") &&
  clientAuthDriver === "development-local";
export const authRefreshIntervalMs =
  clientAppEnvironment === "development" || clientAppEnvironment === "test" ? 2_000 : 60_000;
