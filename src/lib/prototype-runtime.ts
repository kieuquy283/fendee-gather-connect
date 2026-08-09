export const prototypeRuntimeStorageKey = "fendee-prototype-runtime-v1";

export type PrototypeMutationStatus = "idle" | "loading" | "success" | "error";

type PrototypeRuntimeConfig = {
  offline?: boolean;
  delayMs?: number;
  delays?: Record<string, number>;
  failKeys?: string[];
  failMessages?: Record<string, string>;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function readRuntimeConfig(): PrototypeRuntimeConfig {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(prototypeRuntimeStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PrototypeRuntimeConfig;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function getPrototypeOfflineState() {
  if (typeof window === "undefined") return false;
  const config = readRuntimeConfig();
  return Boolean(config.offline) || window.navigator.onLine === false;
}

export async function runPrototypeTask<T>(
  key: string,
  task: () => T | Promise<T>,
  defaultDelayMs = 220,
): Promise<T> {
  if (typeof window !== "undefined") {
    const config = readRuntimeConfig();
    const delayMs = config.delays?.[key] ?? config.delayMs ?? defaultDelayMs;
    await sleep(delayMs);

    if (getPrototypeOfflineState()) {
      throw new Error("Offline. Reconnect and try again.");
    }

    if (config.failKeys?.includes(key)) {
      throw new Error(config.failMessages?.[key] ?? `Prototype action failed: ${key}`);
    }
  }

  return task();
}
