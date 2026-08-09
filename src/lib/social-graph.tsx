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
import {
  acceptFriendRequestFn,
  blockUserFn,
  cancelFriendRequestFn,
  createGroupFn,
  declineFriendRequestFn,
  getCurrentProfileFn,
  listFriendSuggestionsFn,
  listFriendsFn,
  listGroupsFn,
  listIncomingFriendRequestsFn,
  listOutgoingFriendRequestsFn,
  removeFriendFn,
  sendFriendRequestFn,
  submitReportFn,
  unblockUserFn,
  updateCurrentProfileFn,
  type CurrentUserProfile,
  type FriendGroupView,
  type FriendRequestView,
  type ProfileSummary,
  type ReportSubmission,
  type UpdateCurrentProfileInput,
} from "./social.functions";
import type { PrototypeMutationStatus } from "./prototype-runtime";

type MutationState = {
  status: PrototypeMutationStatus;
  error: string | null;
};

type SocialGraphContextValue = {
  loading: boolean;
  error: string | null;
  currentProfile: CurrentUserProfile | null;
  friends: ProfileSummary[];
  incomingRequests: FriendRequestView[];
  outgoingRequests: FriendRequestView[];
  suggestions: ProfileSummary[];
  groups: FriendGroupView[];
  actionState: {
    updateProfile: MutationState;
    friendRequest: MutationState;
    group: MutationState;
    moderation: MutationState;
  };
  refresh: () => Promise<void>;
  updateProfile: (input: UpdateCurrentProfileInput) => Promise<void>;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (targetUserId: string) => Promise<void>;
  createGroup: (input: { name: string; description: string; memberIds: string[] }) => Promise<void>;
  blockUser: (targetUserId: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  reportUser: (targetUserId: string, reason: string) => Promise<ReportSubmission>;
};

const idleMutationState: MutationState = { status: "idle", error: null };
const SocialGraphContext = createContext<SocialGraphContextValue | null>(null);

async function loadGraphSnapshot() {
  const [currentProfile, friends, incomingRequests, outgoingRequests, suggestions, groups] =
    await Promise.all([
      getCurrentProfileFn(),
      listFriendsFn(),
      listIncomingFriendRequestsFn(),
      listOutgoingFriendRequestsFn(),
      listFriendSuggestionsFn(),
      listGroupsFn(),
    ]);

  return {
    currentProfile,
    friends,
    incomingRequests,
    outgoingRequests,
    suggestions,
    groups,
  };
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function SocialGraphProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(null);
  const [friends, setFriends] = useState<ProfileSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestView[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestView[]>([]);
  const [suggestions, setSuggestions] = useState<ProfileSummary[]>([]);
  const [groups, setGroups] = useState<FriendGroupView[]>([]);
  const [updateProfileState, setUpdateProfileState] = useState<MutationState>(idleMutationState);
  const [friendRequestState, setFriendRequestState] = useState<MutationState>(idleMutationState);
  const [groupState, setGroupState] = useState<MutationState>(idleMutationState);
  const [moderationState, setModerationState] = useState<MutationState>(idleMutationState);

  const refresh = useCallback(async () => {
    if (auth.status !== "authenticated") {
      setCurrentProfile(null);
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setSuggestions([]);
      setGroups([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await loadGraphSnapshot();
      setCurrentProfile(snapshot.currentProfile);
      setFriends(snapshot.friends);
      setIncomingRequests(snapshot.incomingRequests);
      setOutgoingRequests(snapshot.outgoingRequests);
      setSuggestions(snapshot.suggestions);
      setGroups(snapshot.groups);
      setError(null);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "UNAUTHENTICATED" ||
          error.code === "SESSION_EXPIRED" ||
          error.code === "SESSION_REVOKED")
      ) {
        setCurrentProfile(null);
        setFriends([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setSuggestions([]);
        setGroups([]);
      }
      setError(messageFromError(error, "Khong the tai du lieu ban be va ho so."));
    } finally {
      setLoading(false);
    }
  }, [auth.status]);

  useEffect(() => {
    void refresh();
  }, [refresh, auth.user?.id]);

  const updateProfile = useCallback(async (input: UpdateCurrentProfileInput) => {
    setUpdateProfileState({ status: "loading", error: null });
    try {
      const next = await updateCurrentProfileFn({ data: input });
      setCurrentProfile(next);
      setUpdateProfileState({ status: "success", error: null });
    } catch (error) {
      const message = messageFromError(error, "Khong the cap nhat ho so.");
      setUpdateProfileState({ status: "error", error: message });
      throw error;
    }
  }, []);

  const runFriendMutation = useCallback(
    async (task: () => Promise<unknown>) => {
      setFriendRequestState({ status: "loading", error: null });
      try {
        await task();
        await refresh();
        setFriendRequestState({ status: "success", error: null });
      } catch (error) {
        const message = messageFromError(error, "Khong the cap nhat trang thai ban be.");
        setFriendRequestState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const runGroupMutation = useCallback(
    async (task: () => Promise<unknown>) => {
      setGroupState({ status: "loading", error: null });
      try {
        await task();
        await refresh();
        setGroupState({ status: "success", error: null });
      } catch (error) {
        const message = messageFromError(error, "Khong the cap nhat nhom ban.");
        setGroupState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const runModerationMutation = useCallback(
    async <T,>(task: () => Promise<T>) => {
      setModerationState({ status: "loading", error: null });
      try {
        const result = await task();
        await refresh();
        setModerationState({ status: "success", error: null });
        return result;
      } catch (error) {
        const message = messageFromError(error, "Khong the cap nhat trang thai an toan.");
        setModerationState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh],
  );

  const value = useMemo<SocialGraphContextValue>(
    () => ({
      loading,
      error,
      currentProfile,
      friends,
      incomingRequests,
      outgoingRequests,
      suggestions,
      groups,
      actionState: {
        updateProfile: updateProfileState,
        friendRequest: friendRequestState,
        group: groupState,
        moderation: moderationState,
      },
      refresh,
      updateProfile,
      sendFriendRequest: async (targetUserId: string) =>
        runFriendMutation(() => sendFriendRequestFn({ data: { targetUserId } })),
      acceptFriendRequest: async (requestId: string) =>
        runFriendMutation(() => acceptFriendRequestFn({ data: { requestId } })),
      declineFriendRequest: async (requestId: string) =>
        runFriendMutation(() => declineFriendRequestFn({ data: { requestId } })),
      cancelFriendRequest: async (requestId: string) =>
        runFriendMutation(() => cancelFriendRequestFn({ data: { requestId } })),
      removeFriend: async (targetUserId: string) =>
        runFriendMutation(() => removeFriendFn({ data: { targetUserId } })),
      createGroup: async (input) => runGroupMutation(() => createGroupFn({ data: input })),
      blockUser: async (targetUserId: string) => {
        await runModerationMutation(() => blockUserFn({ data: { targetUserId } }));
      },
      unblockUser: async (targetUserId: string) => {
        await runModerationMutation(() => unblockUserFn({ data: { targetUserId } }));
      },
      reportUser: async (targetUserId: string, reason: string) =>
        runModerationMutation(() => submitReportFn({ data: { targetUserId, reason } })),
    }),
    [
      loading,
      error,
      currentProfile,
      friends,
      incomingRequests,
      outgoingRequests,
      suggestions,
      groups,
      updateProfileState,
      friendRequestState,
      groupState,
      moderationState,
      refresh,
      updateProfile,
      runFriendMutation,
      runGroupMutation,
      runModerationMutation,
    ],
  );

  return <SocialGraphContext.Provider value={value}>{children}</SocialGraphContext.Provider>;
}

export function useSocialGraph() {
  const context = useContext(SocialGraphContext);
  if (!context) throw new Error("useSocialGraph must be used inside SocialGraphProvider");
  return context;
}
