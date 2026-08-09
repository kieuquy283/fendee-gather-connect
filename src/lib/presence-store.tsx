import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { getLocationProvider } from "./location-provider";
import { getPresenceZone, presenceZones } from "./location-zones";
import {
  advancePresenceClockDevFn,
  getMyPresenceFn,
  startPresenceFn,
  stopPresenceFn,
  syncPresenceLocationFn,
  updateFriendSnapshotFn,
} from "./presence.functions";
import type {
  AudienceMode,
  DeviceMotionState,
  FriendAudience,
  PresenceDomainState,
  PresenceZone,
} from "./presence-contracts";

export type PermissionState = "prompt" | "granted" | "denied" | "lost";
export type PresenceStatus =
  "off" | "starting" | "active" | "moving" | "expired" | "offline" | "error";

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

export type PresenceSession = {
  id: string;
  status: PresenceStatus;
  domainState: PresenceDomainState;
  startedAt: string;
  expiresAt: string;
  notificationSent: boolean;
  audienceUserIds: string[];
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

type MutationState = {
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
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
  actionState: {
    start: MutationState;
    stop: MutationState;
    updateFriendLocation: MutationState;
  };
  startPresence: (options: StartPresenceOptions) => Promise<boolean>;
  stopPresence: () => Promise<boolean>;
  updateFriendLocation: (options?: UpdateFriendLocationOptions) => Promise<boolean>;
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
  refresh: () => Promise<void>;
};

const defaultAudience: FriendAudience = {
  mode: "all_friends",
  groupIds: [],
  friendIds: [],
};

const locationProvider = getLocationProvider();
const PresenceContext = createContext<PresenceContextValue | null>(null);
const idleMutationState: MutationState = { status: "idle", error: null };

function permissionFromServer(value: string | null | undefined): PermissionState {
  if (value === "granted") return "granted";
  if (value === "denied") return "denied";
  if (value === "revoked" || value === "unavailable") return "lost";
  return "prompt";
}

function sessionStatusFromServer(value: string | null | undefined): PresenceStatus {
  if (value === "starting") return "starting";
  if (value === "active") return "active";
  if (value === "moving") return "moving";
  if (value === "expired") return "expired";
  if (value === "permission_lost") return "offline";
  if (value === "error") return "error";
  return "off";
}

function audienceLabel(audience: FriendAudience) {
  if (audience.mode === "selected") return "Selected friends";
  if (audience.mode === "groups") return "Friend groups";
  return "All friends";
}

function makeDeviceLocation() {
  const snapshot = locationProvider.getSnapshot();
  return {
    zone: getPresenceZone(snapshot.location.zoneId),
    accuracyMeters: snapshot.location.accuracyMeters,
    motion: snapshot.location.motion,
    dwellMs: snapshot.location.dwellMs,
    updatedAt: snapshot.location.updatedAt,
  } satisfies DeviceLocation;
}

function initialState(): StoredPresence {
  const snapshot = locationProvider.getSnapshot();
  return {
    deviceLocation: makeDeviceLocation(),
    friendLocationSnapshot: null,
    nearbyPresenceLocation: null,
    selectedFriendAudience: defaultAudience,
    currentNearbyZone: getPresenceZone(snapshot.location.zoneId),
    presenceSession: null,
    permission: snapshot.permission,
  };
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isPresenceEnabled(session: PresenceSession | null) {
  return Boolean(session && ["starting", "active", "moving", "offline"].includes(session.status));
}

function locationKey(input: {
  zoneId: PresenceZone["id"];
  accuracyMeters: number;
  motion: DeviceMotionState;
  dwellMs: number;
  updatedAt: string;
}) {
  return `${input.zoneId}:${input.accuracyMeters}:${input.motion}:${input.dwellMs}:${input.updatedAt}`;
}

function audienceCount(session: PresenceSession | null, audience: FriendAudience) {
  if (session) return session.audienceUserIds.length;
  if (audience.mode === "selected") return Math.max(audience.friendIds.length, 2);
  if (audience.mode === "groups") return Math.max(audience.groupIds.length * 8, 8);
  return 142;
}

function mapServerPresence(
  payload: Awaited<ReturnType<typeof getMyPresenceFn>>,
  draft: FriendAudience,
) {
  const snapshot = locationProvider.getSnapshot();
  const deviceLocation = {
    zone: getPresenceZone(payload.currentLocationSample?.zoneId ?? snapshot.location.zoneId),
    accuracyMeters:
      payload.currentLocationSample?.accuracyMeters ?? snapshot.location.accuracyMeters,
    motion: payload.currentLocationSample?.motion ?? snapshot.location.motion,
    dwellMs: payload.currentLocationSample?.dwellMs ?? snapshot.location.dwellMs,
    updatedAt: payload.currentLocationSample?.capturedAt ?? snapshot.location.updatedAt,
  } satisfies DeviceLocation;

  return {
    deviceLocation,
    friendLocationSnapshot: payload.friendLocationSnapshot
      ? {
          zone: getPresenceZone(payload.friendLocationSnapshot.zoneId),
          updatedAt: payload.friendLocationSnapshot.updatedAt,
        }
      : null,
    nearbyPresenceLocation: payload.nearbyPresence
      ? {
          zone: getPresenceZone(payload.nearbyPresence.areaId),
          publishedAt: payload.nearbyPresence.updatedAt,
        }
      : null,
    selectedFriendAudience: payload.presenceSession?.friendAudience ?? draft,
    currentNearbyZone: payload.currentArea,
    presenceSession: payload.presenceSession
      ? {
          id: payload.presenceSession.id,
          status: sessionStatusFromServer(payload.presenceSession.status),
          domainState: payload.presenceSession.domainState,
          startedAt: payload.presenceSession.startedAt,
          expiresAt: payload.presenceSession.expiresAt,
          notificationSent: payload.presenceSession.notificationSent,
          audienceUserIds: payload.presenceSession.audienceUserIds,
        }
      : null,
    permission: permissionFromServer(payload.permission),
  } satisfies StoredPresence;
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<StoredPresence>(() => initialState());
  const [draftAudience, setDraftAudience] = useState<FriendAudience>(defaultAudience);
  const [startState, setStartState] = useState<MutationState>(idleMutationState);
  const [stopState, setStopState] = useState<MutationState>(idleMutationState);
  const [updateState, setUpdateState] = useState<MutationState>(idleMutationState);
  const syncingRef = useRef(false);
  const hydratedFromServerRef = useRef(false);
  const authStatusRef = useRef(auth.status);
  const presenceSessionRef = useRef<PresenceSession | null>(null);
  const draftAudienceRef = useRef(draftAudience);
  const lastObservedLocationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    authStatusRef.current = auth.status;
  }, [auth.status]);

  useEffect(() => {
    presenceSessionRef.current = state.presenceSession;
  }, [state.presenceSession]);

  useEffect(() => {
    draftAudienceRef.current = draftAudience;
  }, [draftAudience]);

  const refresh = useCallback(async () => {
    if (auth.status !== "authenticated") {
      hydratedFromServerRef.current = false;
      setState(initialState());
      return;
    }
    const payload = await getMyPresenceFn();
    const nextState = mapServerPresence(payload, draftAudienceRef.current);
    presenceSessionRef.current = nextState.presenceSession;
    setState(nextState);
    hydratedFromServerRef.current = true;
  }, [auth.status, draftAudience]);

  const syncFromLocation = useCallback(
    async (override?: DeviceLocation, permissionOverride?: PermissionState) => {
      if (authStatusRef.current !== "authenticated") return;
      const session = presenceSessionRef.current;
      if (!session || !isPresenceEnabled(session) || syncingRef.current) return;
      syncingRef.current = true;
      const deviceLocation = override ?? makeDeviceLocation();
      try {
        const payload = await syncPresenceLocationFn({
          data: {
            sessionId: session.id,
            location: {
              zoneId: deviceLocation.zone.id,
              accuracyMeters: deviceLocation.accuracyMeters,
              dwellMs: deviceLocation.dwellMs,
              motion: deviceLocation.motion,
              capturedAt: deviceLocation.updatedAt,
            },
            permission:
              permissionOverride === "lost"
                ? "revoked"
                : permissionOverride === "denied"
                  ? "denied"
                  : permissionOverride === "granted"
                    ? "granted"
                    : "prompt",
          },
        });
        const nextState = mapServerPresence(payload, draftAudienceRef.current);
        presenceSessionRef.current = nextState.presenceSession;
        setState(nextState);
      } catch {
        // keep UI stable; TTL remains the server-side fallback
      } finally {
        syncingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = locationProvider.watchPosition((snapshot) => {
      const nextDeviceLocation = {
        zone: getPresenceZone(snapshot.location.zoneId),
        accuracyMeters: snapshot.location.accuracyMeters,
        motion: snapshot.location.motion,
        dwellMs: snapshot.location.dwellMs,
        updatedAt: snapshot.location.updatedAt,
      } satisfies DeviceLocation;
      const nextLocationKey = locationKey({
        zoneId: nextDeviceLocation.zone.id,
        accuracyMeters: nextDeviceLocation.accuracyMeters,
        motion: nextDeviceLocation.motion,
        dwellMs: nextDeviceLocation.dwellMs,
        updatedAt: nextDeviceLocation.updatedAt,
      });
      const previousLocationKey = lastObservedLocationKeyRef.current;
      lastObservedLocationKeyRef.current = nextLocationKey;

      setState((current) => ({
        ...current,
        deviceLocation: nextDeviceLocation,
        permission: snapshot.permission,
      }));
      if (!hydratedFromServerRef.current) return;
      if (previousLocationKey === null || previousLocationKey === nextLocationKey) return;
      void syncFromLocation(nextDeviceLocation, snapshot.permission);
    });
    return unsubscribe;
  }, [syncFromLocation]);

  useEffect(() => {
    void refresh();
  }, [refresh, auth.user?.id]);

  useEffect(() => {
    if (
      auth.status === "unauthenticated" ||
      auth.status === "expired" ||
      auth.status === "revoked"
    ) {
      hydratedFromServerRef.current = false;
      presenceSessionRef.current = null;
      setState(initialState());
    }
  }, [auth.status]);

  const startPresence = useCallback(
    async ({ audience }: StartPresenceOptions) => {
      if (auth.status !== "authenticated") return false;
      setStartState({ status: "loading", error: null });
      try {
        const permission = await locationProvider.requestPermission();
        if (permission === "denied" || permission === "lost") {
          setState((current) => ({ ...current, permission }));
          setStartState({ status: "error", error: "Can quyen vi tri de bat hien dien." });
          return false;
        }
        const location = await locationProvider.getCurrentPosition();
        const payload = await startPresenceFn({
          data: {
            audience,
            location: {
              zoneId: location.zoneId,
              accuracyMeters: location.accuracyMeters,
              dwellMs: location.dwellMs,
              motion: location.motion,
              capturedAt: location.updatedAt,
            },
            permission: permission === "granted" ? "granted" : "prompt",
          },
        });
        setDraftAudience(audience);
        setState(mapServerPresence(payload, audience));
        setStartState({ status: "success", error: null });
        return true;
      } catch (error) {
        setStartState({
          status: "error",
          error: messageFromError(error, "Unable to start presence."),
        });
        throw error;
      }
    },
    [auth.status],
  );

  const stopPresence = useCallback(async () => {
    if (!state.presenceSession) return false;
    setStopState({ status: "loading", error: null });
    try {
      const payload = await stopPresenceFn({ data: { sessionId: state.presenceSession.id } });
      setState(mapServerPresence(payload, draftAudience));
      setStopState({ status: "success", error: null });
      return true;
    } catch (error) {
      setStopState({ status: "error", error: messageFromError(error, "Unable to stop presence.") });
      throw error;
    }
  }, [draftAudience, state.presenceSession]);

  const updateFriendLocation = useCallback(
    async (options?: UpdateFriendLocationOptions) => {
      if (!state.presenceSession) return false;
      setUpdateState({ status: "loading", error: null });
      try {
        const payload = await updateFriendSnapshotFn({
          data: {
            sessionId: state.presenceSession.id,
            notifyAgain: Boolean(options?.notifyAgain),
          },
        });
        setState(mapServerPresence(payload, draftAudience));
        setUpdateState({ status: "success", error: null });
        return true;
      } catch (error) {
        setUpdateState({
          status: "error",
          error: messageFromError(error, "Unable to update friend location."),
        });
        throw error;
      }
    },
    [draftAudience, state.presenceSession],
  );

  const changeAudience = useCallback((audience: FriendAudience) => {
    setDraftAudience(audience);
    setState((current) => ({
      ...current,
      selectedFriendAudience: audience,
    }));
  }, []);

  const handleDevicePosition = useCallback((input: HandleDevicePositionInput) => {
    locationProvider.simulateLocation({
      zoneId: input.zoneId,
      ...(input.accuracyMeters !== undefined ? { accuracyMeters: input.accuracyMeters } : {}),
      ...(input.dwellMs !== undefined ? { dwellMs: input.dwellMs } : {}),
      ...(input.motion !== undefined ? { motion: input.motion } : {}),
    });
  }, []);

  const handleZoneTransition = useCallback(
    (zoneId: PresenceZone["id"], accuracyMeters = 22, dwellMs = 90_000) => {
      locationProvider.simulateLocation({
        zoneId,
        accuracyMeters,
        dwellMs,
        motion: "stable",
      });
    },
    [],
  );

  const simulatePermission = useCallback((permission: PermissionState) => {
    locationProvider.simulatePermission(permission);
  }, []);

  const expirePresence = useCallback(async () => {
    await advancePresenceClockDevFn({ data: { ms: 2 * 60 * 60 * 1000 + 90_000 } });
    await refresh();
  }, [refresh]);

  const setOffline = useCallback(
    (offline: boolean) => {
      if (offline) {
        locationProvider.simulatePermission("lost");
        locationProvider.simulateLocation({
          zoneId: state.deviceLocation.zone.id,
          motion: "offline",
        });
        return;
      }
      locationProvider.simulatePermission("granted");
      locationProvider.simulateLocation({
        zoneId: state.deviceLocation.zone.id,
        motion: "stable",
        dwellMs: Math.max(state.deviceLocation.dwellMs, 90_000),
      });
    },
    [state.deviceLocation.dwellMs, state.deviceLocation.zone.id],
  );

  const value = useMemo<PresenceContextValue>(() => {
    const enabled = isPresenceEnabled(state.presenceSession);
    const snapshotZone = state.friendLocationSnapshot?.zone.id;
    const currentZone = state.deviceLocation.zone.id;

    return {
      ...state,
      isPresenceEnabled: enabled,
      isFriendSnapshotOutdated: Boolean(enabled && snapshotZone && snapshotZone !== currentZone),
      audienceCount: audienceCount(state.presenceSession, state.selectedFriendAudience),
      audienceLabel: audienceLabel(state.selectedFriendAudience),
      actionState: {
        start: startState,
        stop: stopState,
        updateFriendLocation: updateState,
      },
      startPresence,
      stopPresence,
      updateFriendLocation,
      changeAudience,
      handleDevicePosition,
      handleZoneTransition,
      simulatePermission,
      expirePresence,
      setOffline,
      refresh,
    };
  }, [
    changeAudience,
    expirePresence,
    handleDevicePosition,
    handleZoneTransition,
    refresh,
    setOffline,
    simulatePermission,
    startPresence,
    startState,
    state,
    stopPresence,
    stopState,
    updateFriendLocation,
    updateState,
  ]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) throw new Error("usePresence must be used inside PresenceProvider");
  return context;
}

export { presenceZones };
export type { AudienceMode, FriendAudience, PresenceDomainState, PresenceZone };
