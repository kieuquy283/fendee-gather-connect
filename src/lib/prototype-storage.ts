export const authSessionStorageKey = "fendee-dev-auth-session-v1";
export const gatherStorageKey = "fendee-gather-state-v2";
export const presenceStorageKey = "fendee-presence-state";
export const privacyStorageKey = "fendee-privacy-state-v1";
export const themeStorageKey = "fendee-theme";

export const sensitivePrototypeStorageKeys = [
  authSessionStorageKey,
  gatherStorageKey,
  presenceStorageKey,
  privacyStorageKey,
] as const;

export const userScopedPrototypeStorageKeys = [
  gatherStorageKey,
  presenceStorageKey,
  privacyStorageKey,
] as const;

export function clearSensitivePrototypeStorage() {
  if (typeof window === "undefined") return;
  sensitivePrototypeStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export function clearUserScopedPrototypeStorage() {
  if (typeof window === "undefined") return;
  userScopedPrototypeStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}
