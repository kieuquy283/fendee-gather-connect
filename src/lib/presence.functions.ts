import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  readFriendSnapshotSchema,
  seedPresenceStateSchema,
  startPresenceSchema,
  stopPresenceSchema,
  syncPresenceLocationSchema,
  updateFriendSnapshotSchema,
} from "./presence-contracts";
import {
  advancePresenceClockDevOnly,
  getFriendLocationSnapshot,
  getMyPresence,
  getNearbyPeople,
  listVisibleFriendSnapshots,
  resetPresenceStateDevOnly,
  seedPresenceStateForTesting,
  startPresence,
  stopPresence,
  syncPresenceLocation,
  updateFriendLocationSnapshot,
} from "./presence-repositories.server";

export const getMyPresenceFn = createServerFn({ method: "GET" }).handler(async () =>
  getMyPresence(),
);
export const getNearbyPeopleFn = createServerFn({ method: "GET" }).handler(async () =>
  getNearbyPeople(),
);
export const listVisibleFriendSnapshotsFn = createServerFn({ method: "GET" }).handler(async () =>
  listVisibleFriendSnapshots(),
);

export const startPresenceFn = createServerFn({ method: "POST" })
  .validator(startPresenceSchema)
  .handler(async ({ data }) => startPresence(data));

export const stopPresenceFn = createServerFn({ method: "POST" })
  .validator(stopPresenceSchema)
  .handler(async ({ data }) => stopPresence(data.sessionId));

export const syncPresenceLocationFn = createServerFn({ method: "POST" })
  .validator(syncPresenceLocationSchema)
  .handler(async ({ data }) => syncPresenceLocation(data));

export const updateFriendSnapshotFn = createServerFn({ method: "POST" })
  .validator(updateFriendSnapshotSchema)
  .handler(async ({ data }) => updateFriendLocationSnapshot(data));

export const getFriendLocationSnapshotFn = createServerFn({ method: "GET" })
  .validator(readFriendSnapshotSchema)
  .handler(async ({ data }) => getFriendLocationSnapshot(data.ownerUserId));

export const seedPresenceStateDevFn = createServerFn({ method: "POST" })
  .validator(seedPresenceStateSchema)
  .handler(async ({ data }) =>
    seedPresenceStateForTesting({
      permission: data.state.permission,
      location: data.state.location,
      ...(data.state.audience ? { audience: data.state.audience } : {}),
      ...(data.state.startActiveSession !== undefined
        ? { startActiveSession: data.state.startActiveSession }
        : {}),
    }),
  );

export const resetPresenceStateDevFn = createServerFn({ method: "POST" }).handler(async () =>
  resetPresenceStateDevOnly(),
);

export const advancePresenceClockDevFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ms: z
        .number()
        .int()
        .min(1)
        .max(24 * 60 * 60 * 1000),
    }),
  )
  .handler(async ({ data }) => advancePresenceClockDevOnly(data.ms));
