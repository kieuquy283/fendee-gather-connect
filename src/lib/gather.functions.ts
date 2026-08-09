import { createServerFn } from "@tanstack/react-start";
import {
  cohostResponseSchema,
  createGatherInputSchema,
  endGatherSchema,
  gatherCanSchema,
  inviteMoreSchema,
  readGatherByIdSchema,
  seedGatherStateSchema,
  updateGatherRsvpSchema,
  updateGatherSchema,
  type CreateGatherInput,
  type Gather,
  type GatherNotification,
  type GatherPermission,
} from "./gather-contracts";
import {
  canGather,
  createGather,
  endGather,
  getGatherById,
  getGatherState,
  inviteMore,
  listVisibleGatherNotifications,
  listVisibleGathers,
  resetGatherStateDevOnly,
  respondToCohostInvite,
  seedGatherStateDevOnly,
  updateGather,
  updateGatherRsvp,
} from "./gather-repositories.server";

export const getGatherStateFn = createServerFn({ method: "GET" }).handler(async () =>
  getGatherState(),
);
export const listVisibleGathersFn = createServerFn({ method: "GET" }).handler(
  async () => listVisibleGathers() satisfies Gather[],
);
export const listVisibleGatherNotificationsFn = createServerFn({ method: "GET" }).handler(
  async () => listVisibleGatherNotifications() satisfies GatherNotification[],
);
export const getGatherByIdFn = createServerFn({ method: "GET" })
  .validator(readGatherByIdSchema)
  .handler(async ({ data }) => getGatherById(data.gatherId));
export const canGatherFn = createServerFn({ method: "GET" })
  .validator(gatherCanSchema)
  .handler(async ({ data }) => canGather(data.gatherId, data.permission) satisfies boolean);
export const createGatherFn = createServerFn({ method: "POST" })
  .validator(createGatherInputSchema)
  .handler(async ({ data }) => createGather(data) satisfies string);
export const updateGatherFn = createServerFn({ method: "POST" })
  .validator(updateGatherSchema)
  .handler(
    async ({ data }) =>
      updateGather(
        data.gatherId,
        Object.fromEntries(
          Object.entries(data.patch).filter(([, value]) => value !== undefined),
        ) as Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
      ) satisfies boolean,
  );
export const inviteMoreFn = createServerFn({ method: "POST" })
  .validator(inviteMoreSchema)
  .handler(async ({ data }) => inviteMore(data.gatherId, data.selection) satisfies boolean);
export const respondToCohostInviteFn = createServerFn({ method: "POST" })
  .validator(cohostResponseSchema)
  .handler(async ({ data }) => respondToCohostInvite(data.gatherId, data.status));
export const updateGatherRsvpFn = createServerFn({ method: "POST" })
  .validator(updateGatherRsvpSchema)
  .handler(async ({ data }) => updateGatherRsvp(data.gatherId, data.status));
export const endGatherFn = createServerFn({ method: "POST" })
  .validator(endGatherSchema)
  .handler(async ({ data }) => endGather(data.gatherId) satisfies boolean);
export const resetGatherStateDevFn = createServerFn({ method: "POST" }).handler(async () =>
  resetGatherStateDevOnly(),
);
export const seedGatherStateDevFn = createServerFn({ method: "POST" })
  .validator(seedGatherStateSchema)
  .handler(async ({ data }) => seedGatherStateDevOnly(data.state));

export type { CreateGatherInput, Gather, GatherNotification, GatherPermission };
