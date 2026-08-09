import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "./api-errors";
import { useAuth } from "./auth";
import type {
  CohostStatus,
  CreateGatherInput,
  Gather,
  GatherAudienceSelection,
  GatherAudienceSource,
  GatherHost,
  GatherInvite,
  GatherNotification,
  GatherPermission,
  InviteStatus,
} from "./gather-contracts";
import {
  createGatherFn,
  endGatherFn,
  getGatherStateFn,
  inviteMoreFn,
  respondToCohostInviteFn,
  updateGatherFn,
  updateGatherRsvpFn,
} from "./gather.functions";
import { usePrivacy } from "./privacy-store";
import { useSocialGraph } from "./social-graph";
import type { Person } from "./fendee-data";

export type {
  CohostStatus,
  CreateGatherInput,
  Gather,
  GatherAudienceSelection,
  GatherAudienceSource,
  GatherHost,
  GatherInvite,
  GatherNotification,
  GatherPermission,
  InviteStatus,
} from "./gather-contracts";

export type FriendGroup = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
};

type ResolutionResult = {
  source: GatherAudienceSource;
  selectedGroupIds: string[];
  selectedFriendIds: string[];
  resolvedRecipientIds: string[];
  selectedGroupLabels: string[];
  selectedFriendLabels: string[];
};

type MutationState = {
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
};

type GatherContextValue = {
  loading: boolean;
  error: string | null;
  gathers: Gather[];
  notifications: GatherNotification[];
  currentUserId: string;
  friends: Person[];
  groups: FriendGroup[];
  blockedUserIds: string[];
  actionState: {
    create: MutationState;
    cohost: MutationState;
    rsvp: MutationState;
    manage: MutationState;
  };
  refresh: () => Promise<void>;
  getGather: (id: string) => Gather | undefined;
  resolveAudience: (selection: GatherAudienceSelection) => ResolutionResult;
  createGather: (input: CreateGatherInput) => Promise<string>;
  respondToCohostInvite: (
    gatherId: string,
    personId: string,
    status: Exclude<CohostStatus, "pending">,
  ) => Promise<void>;
  updateRSVP: (gatherId: string, personId: string, status: InviteStatus) => Promise<void>;
  editGather: (
    gatherId: string,
    actorId: string,
    patch: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
  ) => Promise<boolean>;
  inviteMore: (
    gatherId: string,
    actorId: string,
    selection: GatherAudienceSelection,
  ) => Promise<boolean>;
  endGather: (gatherId: string, actorId: string) => Promise<boolean>;
  expireGather: (gatherId: string) => Promise<void>;
  can: (gather: Gather | undefined, actorId: string, permission: GatherPermission) => boolean;
};

const idleMutationState: MutationState = { status: "idle", error: null };
const GatherContext = createContext<GatherContextValue | null>(null);

const emptySelection: GatherAudienceSelection = {
  includeAllFriends: false,
  groupIds: [],
  friendIds: [],
};

function getAudienceSource(selection: GatherAudienceSelection): GatherAudienceSource {
  if (selection.includeAllFriends && (selection.groupIds.length || selection.friendIds.length)) {
    return "mixed";
  }
  if (selection.includeAllFriends) return "all_friends";
  if (selection.groupIds.length && selection.friendIds.length) return "mixed";
  if (selection.groupIds.length) return "groups";
  return "selected_friends";
}

function isValidInvitee(person: Person | undefined, blockedIds: string[]) {
  return Boolean(person && person.isFriend && !blockedIds.includes(person.id));
}

function resolveAudienceSelection(
  selection: GatherAudienceSelection,
  actorId: string,
  blockedIds: string[],
  availableFriends: Person[],
  availableGroups: FriendGroup[],
): ResolutionResult {
  const ids = new Set<string>();
  const selectedGroupLabels: string[] = [];

  if (selection.includeAllFriends) {
    availableFriends
      .filter((person) => isValidInvitee(person, blockedIds))
      .forEach((person) => ids.add(person.id));
  }

  selection.groupIds.forEach((groupId) => {
    const group = availableGroups.find((item) => item.id === groupId);
    if (!group) return;
    selectedGroupLabels.push(group.name);
    group.memberIds.forEach((personId) => {
      if (
        isValidInvitee(
          availableFriends.find((person) => person.id === personId),
          blockedIds,
        )
      ) {
        ids.add(personId);
      }
    });
  });

  selection.friendIds.forEach((personId) => {
    if (
      isValidInvitee(
        availableFriends.find((person) => person.id === personId),
        blockedIds,
      )
    ) {
      ids.add(personId);
    }
  });

  ids.delete(actorId);

  return {
    source: getAudienceSource(selection),
    selectedGroupIds: [...selection.groupIds],
    selectedFriendIds: [...selection.friendIds],
    resolvedRecipientIds: [...ids],
    selectedGroupLabels,
    selectedFriendLabels: selection.friendIds
      .map((id) => availableFriends.find((person) => person.id === id)?.name)
      .filter(Boolean) as string[],
  };
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function canViewGatherClient(
  actorId: string,
  gather: Gather | undefined,
  blockedUserIds: string[],
) {
  if (!gather || actorId === "anonymous") return false;
  if (gather.ownerId === actorId) return true;
  if (blockedUserIds.includes(gather.ownerId)) return false;
  if (gather.hosts.some((host) => host.personId === actorId && host.cohostStatus !== "declined")) {
    return true;
  }
  if (gather.invites.some((invite) => invite.personId === actorId)) return true;
  return false;
}

function canManageGatherClient(
  actorId: string,
  gather: Gather | undefined,
  blockedUserIds: string[],
) {
  if (
    !canViewGatherClient(actorId, gather, blockedUserIds) ||
    !gather ||
    gather.status !== "live"
  ) {
    return false;
  }
  return gather.hosts.some((host) => host.personId === actorId && host.cohostStatus === "accepted");
}

function canEditGatherClient(
  actorId: string,
  gather: Gather | undefined,
  permission: GatherPermission,
  blockedUserIds: string[],
) {
  if (!canManageGatherClient(actorId, gather, blockedUserIds) || !gather) return false;
  const host = gather.hosts.find(
    (item) => item.personId === actorId && item.cohostStatus === "accepted",
  );
  if (!host) return false;
  if (host.role === "owner") return true;
  return [
    "edit_content",
    "edit_note",
    "edit_image",
    "edit_place",
    "edit_expiry",
    "view_rsvp",
    "publish_updates",
  ].includes(permission);
}

export function GatherProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const privacy = usePrivacy();
  const socialGraph = useSocialGraph();
  const actorId = auth.user?.id ?? "anonymous";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gathers, setGathers] = useState<Gather[]>([]);
  const [notifications, setNotifications] = useState<GatherNotification[]>([]);
  const [createState, setCreateState] = useState<MutationState>(idleMutationState);
  const [cohostState, setCohostState] = useState<MutationState>(idleMutationState);
  const [rsvpState, setRsvpState] = useState<MutationState>(idleMutationState);
  const [manageState, setManageState] = useState<MutationState>(idleMutationState);

  const refresh = useCallback(async () => {
    if (auth.status !== "authenticated") {
      setGathers([]);
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await getGatherStateFn();
      setGathers(snapshot.gathers);
      setNotifications(snapshot.notifications);
      setError(null);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "UNAUTHENTICATED" ||
          error.code === "SESSION_EXPIRED" ||
          error.code === "SESSION_REVOKED")
      ) {
        setGathers([]);
        setNotifications([]);
      }
      setError(messageFromError(error, "Khong the tai du lieu Gather."));
    } finally {
      setLoading(false);
    }
  }, [auth.status]);

  useEffect(() => {
    void refresh();
  }, [refresh, auth.user?.id]);

  const getGather = useCallback(
    (id: string) => gathers.find((gather) => gather.id === id),
    [gathers],
  );

  const resolveAudience = useCallback(
    (selection: GatherAudienceSelection) =>
      resolveAudienceSelection(
        selection,
        actorId,
        privacy.blockedUserIds,
        socialGraph.friends as Person[],
        socialGraph.groups as FriendGroup[],
      ),
    [actorId, privacy.blockedUserIds, socialGraph.friends, socialGraph.groups],
  );

  const runCreateMutation = useCallback(
    async <T,>(task: () => Promise<T>) => {
      setCreateState({ status: "loading", error: null });
      try {
        const result = await task();
        await refresh();
        setCreateState({ status: "success", error: null });
        return result;
      } catch (error) {
        const message = messageFromError(error, "Khong the tao Gather.");
        setCreateState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const runCohostMutation = useCallback(
    async (task: () => Promise<unknown>) => {
      setCohostState({ status: "loading", error: null });
      try {
        await task();
        await refresh();
        setCohostState({ status: "success", error: null });
      } catch (error) {
        const message = messageFromError(error, "Khong the cap nhat co-host.");
        setCohostState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const runRsvpMutation = useCallback(
    async (task: () => Promise<unknown>) => {
      setRsvpState({ status: "loading", error: null });
      try {
        await task();
        await refresh();
        setRsvpState({ status: "success", error: null });
      } catch (error) {
        const message = messageFromError(error, "Khong the cap nhat RSVP.");
        setRsvpState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const runManageMutation = useCallback(
    async <T,>(task: () => Promise<T>) => {
      setManageState({ status: "loading", error: null });
      try {
        const result = await task();
        await refresh();
        setManageState({ status: "success", error: null });
        return result;
      } catch (error) {
        const message = messageFromError(error, "Khong the cap nhat Gather.");
        setManageState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const createGather = useCallback(
    async (input: CreateGatherInput) => runCreateMutation(() => createGatherFn({ data: input })),
    [runCreateMutation],
  );

  const respondToCohostInvite = useCallback(
    async (gatherId: string, _personId: string, status: Exclude<CohostStatus, "pending">) =>
      runCohostMutation(() => respondToCohostInviteFn({ data: { gatherId, status } })),
    [runCohostMutation],
  );

  const updateRSVP = useCallback(
    async (gatherId: string, _personId: string, status: InviteStatus) =>
      runRsvpMutation(() => updateGatherRsvpFn({ data: { gatherId, status } })),
    [runRsvpMutation],
  );

  const editGather = useCallback(
    async (
      gatherId: string,
      _actorId: string,
      patch: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
    ) => runManageMutation(() => updateGatherFn({ data: { gatherId, patch } })),
    [runManageMutation],
  );

  const inviteMore = useCallback(
    async (gatherId: string, _actorId: string, selection: GatherAudienceSelection) =>
      runManageMutation(() => inviteMoreFn({ data: { gatherId, selection } })),
    [runManageMutation],
  );

  const endGather = useCallback(
    async (gatherId: string, _actorId: string) =>
      runManageMutation(() => endGatherFn({ data: { gatherId } })),
    [runManageMutation],
  );

  const expireGather = useCallback(
    async (gatherId: string) => {
      const gather = getGather(gatherId);
      if (!gather) return;
      await editGather(gatherId, actorId, {
        expiresAt: "Da het han",
      });
    },
    [actorId, editGather, getGather],
  );

  const can = useCallback(
    (gather: Gather | undefined, checkActorId: string, permission: GatherPermission) =>
      canEditGatherClient(checkActorId, gather, permission, privacy.blockedUserIds),
    [privacy.blockedUserIds],
  );

  const value = useMemo<GatherContextValue>(
    () => ({
      loading,
      error,
      gathers,
      notifications,
      currentUserId: actorId,
      friends: socialGraph.friends as Person[],
      groups: socialGraph.groups as FriendGroup[],
      blockedUserIds: privacy.blockedUserIds,
      actionState: {
        create: createState,
        cohost: cohostState,
        rsvp: rsvpState,
        manage: manageState,
      },
      refresh,
      getGather,
      resolveAudience,
      createGather,
      respondToCohostInvite,
      updateRSVP,
      editGather,
      inviteMore,
      endGather,
      expireGather,
      can,
    }),
    [
      loading,
      error,
      gathers,
      notifications,
      actorId,
      socialGraph.friends,
      socialGraph.groups,
      privacy.blockedUserIds,
      createState,
      cohostState,
      rsvpState,
      manageState,
      refresh,
      getGather,
      resolveAudience,
      createGather,
      respondToCohostInvite,
      updateRSVP,
      editGather,
      inviteMore,
      endGather,
      expireGather,
      can,
    ],
  );

  return <GatherContext.Provider value={value}>{children}</GatherContext.Provider>;
}

export function useGatherStore() {
  const context = useContext(GatherContext);
  if (!context) throw new Error("useGatherStore must be used inside GatherProvider");
  return context;
}

export const blankGatherSelection = (): GatherAudienceSelection => ({ ...emptySelection });
