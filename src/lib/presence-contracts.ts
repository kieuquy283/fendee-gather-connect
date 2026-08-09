import { z } from "zod";

export const audienceModeValues = ["all_friends", "groups", "selected"] as const;
export const permissionStateValues = [
  "unknown",
  "prompt",
  "granted",
  "denied",
  "revoked",
  "unavailable",
] as const;
export const deviceMotionStateValues = ["stable", "moving", "inaccurate", "offline"] as const;
export const presenceDomainStateValues = [
  "OFF",
  "STARTING",
  "ACTIVE_AREA",
  "MOVING",
  "NEW_AREA_DETECTED",
  "FRIEND_SNAPSHOT_OUTDATED",
  "PERMISSION_LOST",
  "EXPIRED",
  "STOPPING",
  "ERROR",
] as const;
export const presenceSessionStatusValues = [
  "starting",
  "active",
  "moving",
  "expired",
  "permission_lost",
  "stopped",
  "error",
] as const;
export const presenceZoneIdValues = ["area-a", "area-b", "area-c"] as const;

export type AudienceMode = (typeof audienceModeValues)[number];
export type PermissionState = (typeof permissionStateValues)[number];
export type DeviceMotionState = (typeof deviceMotionStateValues)[number];
export type PresenceDomainState = (typeof presenceDomainStateValues)[number];
export type PresenceSessionStatus = (typeof presenceSessionStatusValues)[number];
export type PresenceZoneId = (typeof presenceZoneIdValues)[number];

export type PresenceZone = {
  id: PresenceZoneId;
  label: string;
  shortLabel: string;
  nearbyLabel: string;
};

export type FriendAudience = {
  mode: AudienceMode;
  groupIds: string[];
  friendIds: string[];
};

export type LocationSample = {
  zoneId: PresenceZoneId;
  accuracyMeters: number;
  dwellMs: number;
  motion: DeviceMotionState;
  capturedAt: string;
};

export type PresenceSession = {
  id: string;
  userId: string;
  status: PresenceSessionStatus;
  domainState: PresenceDomainState;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  permissionState: PermissionState;
  notificationSent: boolean;
  friendAudience: FriendAudience;
  audienceUserIds: string[];
};

export type NearbyPresence = {
  userId: string;
  presenceSessionId: string;
  areaId: PresenceZoneId;
  placeLabel: string;
  publishedAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type FriendLocationSnapshot = {
  id: string;
  presenceSessionId: string;
  ownerUserId: string;
  zoneId: PresenceZoneId;
  placeLabel: string;
  updatedAt: string;
  visible: boolean;
  audienceUserIds: string[];
};

export type NearbyPersonMarker = {
  userId: string;
  areaId: PresenceZoneId;
  x: number;
  y: number;
  meters: number;
  place: string;
};

export type VisibleFriendLocationSnapshot = {
  ownerUserId: string;
  placeLabel: string;
  zoneId: PresenceZoneId;
  updatedAt: string;
  sharedWithYou: true;
};

export type MyPresenceState = {
  permission: PermissionState;
  presenceSession: PresenceSession | null;
  nearbyPresence: NearbyPresence | null;
  friendLocationSnapshot: FriendLocationSnapshot | null;
  currentArea: PresenceZone | null;
  currentLocationSample: LocationSample | null;
  currentDomainState: PresenceDomainState;
  friendSnapshotOutdated: boolean;
};

export const friendAudienceSchema = z.object({
  mode: z.enum(audienceModeValues),
  groupIds: z.array(z.string().trim().min(1)).max(50),
  friendIds: z.array(z.string().trim().min(1)).max(200),
});

export const locationSampleSchema = z.object({
  zoneId: z.enum(presenceZoneIdValues),
  accuracyMeters: z.number().finite().min(0).max(10_000),
  dwellMs: z
    .number()
    .finite()
    .min(0)
    .max(24 * 60 * 60 * 1000),
  motion: z.enum(deviceMotionStateValues),
  capturedAt: z.string().datetime(),
});

export const startPresenceSchema = z.object({
  audience: friendAudienceSchema,
  location: locationSampleSchema,
  permission: z.enum(permissionStateValues),
});

export const stopPresenceSchema = z.object({
  sessionId: z.string().trim().min(1, "Thieu presence session id."),
});

export const syncPresenceLocationSchema = z.object({
  sessionId: z.string().trim().min(1, "Thieu presence session id."),
  location: locationSampleSchema,
  permission: z.enum(permissionStateValues),
});

export const updateFriendSnapshotSchema = z.object({
  sessionId: z.string().trim().min(1, "Thieu presence session id."),
  notifyAgain: z.boolean().default(false),
});

export const readFriendSnapshotSchema = z.object({
  ownerUserId: z.string().trim().min(1, "Thieu owner user id."),
});

export const seedPresenceStateSchema = z.object({
  state: z.object({
    permission: z.enum(permissionStateValues),
    location: locationSampleSchema,
    audience: friendAudienceSchema.optional(),
    startActiveSession: z.boolean().optional(),
  }),
});

export type StartPresenceInput = z.infer<typeof startPresenceSchema>;
export type StopPresenceInput = z.infer<typeof stopPresenceSchema>;
export type SyncPresenceLocationInput = z.infer<typeof syncPresenceLocationSchema>;
export type UpdateFriendSnapshotInput = z.infer<typeof updateFriendSnapshotSchema>;
export type ReadFriendSnapshotInput = z.infer<typeof readFriendSnapshotSchema>;
export type SeedPresenceStateInput = z.infer<typeof seedPresenceStateSchema>;
