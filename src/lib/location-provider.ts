import { getPresenceZone } from "./location-zones";
import type { DeviceMotionState, PresenceZoneId } from "./presence-contracts";

export type ClientPermissionState = "prompt" | "granted" | "denied" | "lost";

export type DeviceLocation = {
  zoneId: PresenceZoneId;
  accuracyMeters: number;
  motion: DeviceMotionState;
  dwellMs: number;
  updatedAt: string;
};

export type LocationSnapshot = {
  permission: ClientPermissionState;
  location: DeviceLocation;
};

export type LocationProvider = {
  getSnapshot(): LocationSnapshot;
  requestPermission(): Promise<ClientPermissionState>;
  getCurrentPosition(): Promise<DeviceLocation>;
  watchPosition(listener: (snapshot: LocationSnapshot) => void): () => void;
  simulateLocation(input: Partial<DeviceLocation> & { zoneId: PresenceZoneId }): void;
  simulatePermission(permission: ClientPermissionState): void;
};

const initialSnapshot: LocationSnapshot = {
  permission: "prompt",
  location: {
    zoneId: getPresenceZone("area-a").id,
    accuracyMeters: 18,
    motion: "stable",
    dwellMs: 180_000,
    updatedAt: new Date().toISOString(),
  },
};

class DevelopmentLocationProvider implements LocationProvider {
  private snapshot: LocationSnapshot = initialSnapshot;
  private listeners = new Set<(snapshot: LocationSnapshot) => void>();

  getSnapshot() {
    return this.snapshot;
  }

  async requestPermission() {
    if (this.snapshot.permission === "prompt") {
      this.simulatePermission("granted");
    }
    return this.snapshot.permission;
  }

  async getCurrentPosition() {
    return this.snapshot.location;
  }

  watchPosition(listener: (snapshot: LocationSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  simulateLocation(input: Partial<DeviceLocation> & { zoneId: PresenceZoneId }) {
    this.snapshot = {
      ...this.snapshot,
      location: {
        ...this.snapshot.location,
        ...input,
        updatedAt: new Date().toISOString(),
      },
    };
    this.emit();
  }

  simulatePermission(permission: ClientPermissionState) {
    this.snapshot = {
      ...this.snapshot,
      permission,
      location: {
        ...this.snapshot.location,
        motion: permission === "lost" ? "offline" : this.snapshot.location.motion,
        updatedAt: new Date().toISOString(),
      },
    };
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

const developmentLocationProvider = new DevelopmentLocationProvider();

export function getLocationProvider() {
  return developmentLocationProvider;
}
