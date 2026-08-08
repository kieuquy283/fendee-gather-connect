import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AudienceMode = "all_friends" | "groups" | "selected";
export type PermissionState = "prompt" | "granted" | "denied" | "lost";
export type DeviceMotionState = "stable" | "moving" | "inaccurate" | "offline";
export type PresenceStatus = "off" | "starting" | "active" | "moving" | "expired" | "offline";

export type PresenceZone = {
  id: "area-a" | "area-b" | "area-c";
  label: string;
  shortLabel: string;
  nearbyLabel: string;
};

export type DeviceLocation = {
  zone: PresenceZone;
  accuracyMeters: number;
  motion: DeviceMotionState;
  dwellMs: number;
  updatedAt: string;
};

export type FriendLocationSnapshot = {
  zone: PresenceZone;
  updatedAt: string;
};

export type NearbyPresenceLocation = {
  zone: PresenceZone;
  publishedAt: string;
};

export type FriendAudience = {
  mode: AudienceMode;
  groupIds: string[];
  friendIds: string[];
};

export type PresenceSession = {
  id: string;
  status: PresenceStatus;
  startedAt: string;
  expiresAt: string;
  notificationSent: boolean;
};

type StoredPresence = {
  deviceLocation: DeviceLocation;
  friendLocationSnapshot: FriendLocationSnapshot | null;
  nearbyPresenceLocation: NearbyPresenceLocation | null;
  selectedFriendAudience: FriendAudience;
  currentNearbyZone: PresenceZone | null;
  presenceSession: PresenceSession | null;
  permission: PermissionState;
};

export const presenceZones: PresenceZone[] = [
  {
    id: "area-a",
    label: "Area A - The Coffee House Thai Ha",
    shortLabel: "Area A",
    nearbyLabel: "The Coffee House Thai Ha",
  },
  {
    id: "area-b",
    label: "Area B - Lang Ha Library",
    shortLabel: "Area B",
    nearbyLabel: "Lang Ha Library",
  },
  {
    id: "area-c",
    label: "Area C - Dreamplex Lang Ha",
    shortLabel: "Area C",
    nearbyLabel: "Dreamplex Lang Ha",
  },
];

const defaultAudience: FriendAudience = {
  mode: "all_friends",
  groupIds: [],
  friendIds: [],
};

const now = () => new Date().toISOString();

const initialDeviceLocation: DeviceLocation = {
  zone: presenceZones[0]!,
  accuracyMeters: 18,
  motion: "stable",
  dwellMs: 180000,
  updatedAt: now(),
};

const initialState: StoredPresence = {
  deviceLocation: initialDeviceLocation,
  friendLocationSnapshot: null,
  nearbyPresenceLocation: null,
  selectedFriendAudience: defaultAudience,
  currentNearbyZone: initialDeviceLocation.zone,
  presenceSession: null,
  permission: "prompt",
};

export const presenceConfig = {
  maxAccuracyMeters: 80,
  stableDwellMs: 90000,
  defaultDurationMs: 2 * 60 * 60 * 1000,
};

type StartPresenceOptions = {
  audience: FriendAudience;
};

type UpdateFriendLocationOptions = {
  notifyAgain?: boolean;
};

type HandleDevicePositionInput = {
  zoneId: PresenceZone["id"];
  accuracyMeters?: number;
  dwellMs?: number;
  motion?: DeviceMotionState;
};

type PresenceContextValue = StoredPresence & {
  isPresenceEnabled: boolean;
  isFriendSnapshotOutdated: boolean;
  audienceCount: number;
  audienceLabel: string;
  startPresence: (options: StartPresenceOptions) => Promise<boolean>;
  stopPresence: () => void;
  updateFriendLocation: (options?: UpdateFriendLocationOptions) => void;
  changeAudience: (audience: FriendAudience) => void;
  handleDevicePosition: (input: HandleDevicePositionInput) => void;
  handleZoneTransition: (
    zoneId: PresenceZone["id"],
    accuracyMeters?: number,
    dwellMs?: number,
  ) => void;
  simulatePermission: (permission: PermissionState) => void;
  expirePresence: () => void;
  setOffline: (offline: boolean) => void;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

function getZone(zoneId: PresenceZone["id"]) {
  return presenceZones.find((zone) => zone.id === zoneId) ?? presenceZones[0]!;
}

function readStoredState(): StoredPresence {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = window.localStorage.getItem("fendee-presence-state");
    if (!raw) return initialState;
    return { ...initialState, ...(JSON.parse(raw) as Partial<StoredPresence>) };
  } catch {
    return initialState;
  }
}

function isSessionEnabled(session: PresenceSession | null) {
  return Boolean(session && ["starting", "active", "moving", "offline"].includes(session.status));
}

function audienceCount(audience: FriendAudience) {
  if (audience.mode === "selected") return Math.max(audience.friendIds.length, 2);
  if (audience.mode === "groups") return Math.max(audience.groupIds.length * 8, 8);
  return 142;
}

function audienceLabel(audience: FriendAudience) {
  if (audience.mode === "selected") return "Selected friends";
  if (audience.mode === "groups") return "Friend groups";
  return "All friends";
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredPresence>(readStoredState);

  useEffect(() => {
    window.localStorage.setItem("fendee-presence-state", JSON.stringify(state));
  }, [state]);

  const stopPresence = useCallback(() => {
    setState((current) => ({
      ...current,
      friendLocationSnapshot: null,
      nearbyPresenceLocation: null,
      presenceSession: null,
    }));
  }, []);

  const startPresence = useCallback(
    async ({ audience }: StartPresenceOptions) => {
      if (state.permission === "denied" || state.permission === "lost") return false;

      const startedAt = now();
      const sessionId = `presence-${Date.now()}`;
      setState((current) => {
        if (current.permission === "denied" || current.permission === "lost") {
          return current;
        }

        const session: PresenceSession = {
          id: sessionId,
          status: "starting",
          startedAt,
          expiresAt: new Date(Date.now() + presenceConfig.defaultDurationMs).toISOString(),
          notificationSent: true,
        };

        const snapshot = {
          zone: current.deviceLocation.zone,
          updatedAt: startedAt,
        };

        return {
          ...current,
          permission: "granted",
          selectedFriendAudience: audience,
          currentNearbyZone: current.deviceLocation.zone,
          friendLocationSnapshot: snapshot,
          nearbyPresenceLocation: {
            zone: current.deviceLocation.zone,
            publishedAt: startedAt,
          },
          presenceSession: session,
        };
      });

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          setState((current) =>
            current.presenceSession?.id === sessionId &&
            current.presenceSession.status === "starting"
              ? {
                  ...current,
                  presenceSession: {
                    ...current.presenceSession,
                    status: "active",
                  },
                }
              : current,
          );
        }, 650);
      }

      return true;
    },
    [state.permission],
  );

  const updateFriendLocation = useCallback((_options?: UpdateFriendLocationOptions) => {
    setState((current) => {
      if (!isSessionEnabled(current.presenceSession)) return current;
      return {
        ...current,
        friendLocationSnapshot: {
          zone: current.deviceLocation.zone,
          updatedAt: now(),
        },
      };
    });
  }, []);

  const changeAudience = useCallback((audience: FriendAudience) => {
    setState((current) => ({
      ...current,
      selectedFriendAudience: audience,
    }));
  }, []);

  const handleDevicePosition = useCallback((input: HandleDevicePositionInput) => {
    setState((current) => {
      const zone = getZone(input.zoneId);
      const accuracyMeters = input.accuracyMeters ?? current.deviceLocation.accuracyMeters;
      const dwellMs = input.dwellMs ?? current.deviceLocation.dwellMs;
      const explicitMotion = input.motion;
      const forcedHidden =
        explicitMotion === "moving" ||
        explicitMotion === "inaccurate" ||
        explicitMotion === "offline";
      const inaccurate = accuracyMeters > presenceConfig.maxAccuracyMeters;
      const stable = dwellMs >= presenceConfig.stableDwellMs && !inaccurate && !forcedHidden;
      const motion: DeviceMotionState = explicitMotion ?? (stable ? "stable" : "moving");
      const enabled = isSessionEnabled(current.presenceSession);
      const updatedAt = now();

      const nextSession = current.presenceSession
        ? {
            ...current.presenceSession,
            status:
              motion === "offline"
                ? "offline"
                : enabled && stable
                  ? "active"
                  : enabled
                    ? "moving"
                    : current.presenceSession.status,
          }
        : current.presenceSession;

      return {
        ...current,
        deviceLocation: {
          zone,
          accuracyMeters,
          dwellMs,
          motion: inaccurate ? "inaccurate" : motion,
          updatedAt,
        },
        currentNearbyZone: stable ? zone : current.currentNearbyZone,
        nearbyPresenceLocation:
          enabled && stable
            ? {
                zone,
                publishedAt: updatedAt,
              }
            : null,
        presenceSession: nextSession,
      };
    });
  }, []);

  const handleZoneTransition = useCallback(
    (zoneId: PresenceZone["id"], accuracyMeters = 22, dwellMs = presenceConfig.stableDwellMs) => {
      handleDevicePosition({ zoneId, accuracyMeters, dwellMs });
    },
    [handleDevicePosition],
  );

  const simulatePermission = useCallback((permission: PermissionState) => {
    setState((current) => ({
      ...current,
      permission,
      nearbyPresenceLocation:
        permission === "denied" || permission === "lost" ? null : current.nearbyPresenceLocation,
      presenceSession:
        permission === "lost" && current.presenceSession
          ? { ...current.presenceSession, status: "offline" }
          : current.presenceSession,
    }));
  }, []);

  const expirePresence = useCallback(() => {
    setState((current) => ({
      ...current,
      friendLocationSnapshot: null,
      nearbyPresenceLocation: null,
      presenceSession: current.presenceSession
        ? { ...current.presenceSession, status: "expired" }
        : {
            id: `presence-${Date.now()}`,
            status: "expired",
            startedAt: now(),
            expiresAt: now(),
            notificationSent: false,
          },
    }));
  }, []);

  const setOffline = useCallback((offline: boolean) => {
    setState((current) => {
      const updatedAt = now();
      const canPublish =
        !offline &&
        isSessionEnabled(current.presenceSession) &&
        current.deviceLocation.accuracyMeters <= presenceConfig.maxAccuracyMeters &&
        current.deviceLocation.dwellMs >= presenceConfig.stableDwellMs;

      return {
        ...current,
        deviceLocation: {
          ...current.deviceLocation,
          motion: offline ? "offline" : canPublish ? "stable" : "moving",
          updatedAt,
        },
        currentNearbyZone: canPublish ? current.deviceLocation.zone : current.currentNearbyZone,
        nearbyPresenceLocation: canPublish
          ? {
              zone: current.deviceLocation.zone,
              publishedAt: updatedAt,
            }
          : null,
        presenceSession: current.presenceSession
          ? {
              ...current.presenceSession,
              status: offline ? "offline" : canPublish ? "active" : "moving",
            }
          : current.presenceSession,
      };
    });
  }, []);

  const value = useMemo<PresenceContextValue>(() => {
    const enabled = isSessionEnabled(state.presenceSession);
    const snapshotZone = state.friendLocationSnapshot?.zone.id;
    const currentZone = state.deviceLocation.zone.id;

    return {
      ...state,
      isPresenceEnabled: enabled,
      isFriendSnapshotOutdated: Boolean(enabled && snapshotZone && snapshotZone !== currentZone),
      audienceCount: audienceCount(state.selectedFriendAudience),
      audienceLabel: audienceLabel(state.selectedFriendAudience),
      startPresence,
      stopPresence,
      updateFriendLocation,
      changeAudience,
      handleDevicePosition,
      handleZoneTransition,
      simulatePermission,
      expirePresence,
      setOffline,
    };
  }, [
    state,
    startPresence,
    stopPresence,
    updateFriendLocation,
    changeAudience,
    handleDevicePosition,
    handleZoneTransition,
    simulatePermission,
    expirePresence,
    setOffline,
  ]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) throw new Error("usePresence must be used inside PresenceProvider");
  return context;
}
