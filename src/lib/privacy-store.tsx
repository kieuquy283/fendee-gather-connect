import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import {
  getPrivacySettingsFn,
  listBlockedUsersFn,
  listOwnReportsFn,
  updatePrivacySettingsFn,
  type PrivacySettings,
  type ReportSubmission,
  type UpdatePrivacySettingsInput,
} from "./social.functions";
import { useSocialGraph } from "./social-graph";
import type { PrototypeMutationStatus } from "./prototype-runtime";

type MutationState = {
  status: PrototypeMutationStatus;
  error: string | null;
};

type PrivacyContextValue = {
  blockedUserIds: string[];
  reports: ReportSubmission[];
  deletionRequest: {
    requestedAt: string;
    status: "pending_backend";
  } | null;
  settings: PrivacySettings | null;
  actionState: {
    block: MutationState;
    report: MutationState;
    deletion: MutationState;
    settings: MutationState;
  };
  isBlocked: (personId: string) => boolean;
  blockUser: (personId: string) => Promise<void>;
  unblockUser: (personId: string) => Promise<void>;
  reportUser: (personId: string, reason: string) => Promise<ReportSubmission | null>;
  requestAccountDeletion: () => Promise<void>;
  updateSettings: (input: UpdatePrivacySettingsInput) => Promise<void>;
  refresh: () => Promise<void>;
};

const idleMutationState: MutationState = { status: "idle", error: null };
const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const socialGraph = useSocialGraph();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [deletionRequest, setDeletionRequest] = useState<{
    requestedAt: string;
    status: "pending_backend";
  } | null>(null);
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [blockState, setBlockState] = useState<MutationState>(idleMutationState);
  const [reportState, setReportState] = useState<MutationState>(idleMutationState);
  const [deletionState, setDeletionState] = useState<MutationState>(idleMutationState);
  const [settingsState, setSettingsState] = useState<MutationState>(idleMutationState);

  const refresh = useCallback(async () => {
    if (auth.status !== "authenticated") {
      setBlockedUserIds([]);
      setReports([]);
      setSettings(null);
      return;
    }

    const [nextSettings, nextBlockedIds, nextReports] = await Promise.all([
      getPrivacySettingsFn(),
      listBlockedUsersFn(),
      listOwnReportsFn(),
    ]);

    setSettings(nextSettings);
    setBlockedUserIds(nextBlockedIds);
    setReports(nextReports);
  }, [auth.status]);

  useEffect(() => {
    void refresh();
  }, [refresh, auth.user?.id]);

  const isBlocked = useCallback(
    (personId: string) => blockedUserIds.includes(personId),
    [blockedUserIds],
  );

  const blockUser = useCallback(
    async (personId: string) => {
      setBlockState({ status: "loading", error: null });
      try {
        await socialGraph.blockUser(personId);
        await refresh();
        setBlockState({ status: "success", error: null });
      } catch (error) {
        const message = messageFromError(error, "Khong the chan nguoi dung.");
        setBlockState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh, socialGraph],
  );

  const unblockUser = useCallback(
    async (personId: string) => {
      setBlockState({ status: "loading", error: null });
      try {
        await socialGraph.unblockUser(personId);
        await refresh();
        setBlockState({ status: "success", error: null });
      } catch (error) {
        const message = messageFromError(error, "Khong the bo chan nguoi dung.");
        setBlockState({ status: "error", error: message });
        throw error;
      }
    },
    [refresh, socialGraph],
  );

  const reportUser = useCallback(
    async (personId: string, reason: string) => {
      if (!auth.user || auth.user.id === personId) return null;
      setReportState({ status: "loading", error: null });
      try {
        const report = await socialGraph.reportUser(personId, reason);
        await refresh();
        setReportState({ status: "success", error: null });
        return report;
      } catch (error) {
        const message = messageFromError(error, "Khong the gui bao cao.");
        setReportState({ status: "error", error: message });
        throw error;
      }
    },
    [auth.user, refresh, socialGraph],
  );

  const requestAccountDeletion = useCallback(async () => {
    setDeletionState({ status: "loading", error: null });
    try {
      const request = await auth.requestAccountDeletion();
      if (!request) return;
      setDeletionRequest(request);
      setDeletionState({ status: "success", error: null });
    } catch (error) {
      const message = messageFromError(error, "Khong the gui yeu cau xoa tai khoan.");
      setDeletionState({ status: "error", error: message });
      throw error;
    }
  }, [auth]);

  const updateSettings = useCallback(async (input: UpdatePrivacySettingsInput) => {
    setSettingsState({ status: "loading", error: null });
    try {
      const next = await updatePrivacySettingsFn({ data: input });
      setSettings(next);
      setSettingsState({ status: "success", error: null });
    } catch (error) {
      const message = messageFromError(error, "Khong the cap nhat quyen rieng tu.");
      setSettingsState({ status: "error", error: message });
      throw error;
    }
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      blockedUserIds,
      reports,
      deletionRequest,
      settings,
      actionState: {
        block: blockState,
        report: reportState,
        deletion: deletionState,
        settings: settingsState,
      },
      isBlocked,
      blockUser,
      unblockUser,
      reportUser,
      requestAccountDeletion,
      updateSettings,
      refresh,
    }),
    [
      blockedUserIds,
      reports,
      deletionRequest,
      settings,
      blockState,
      reportState,
      deletionState,
      settingsState,
      isBlocked,
      blockUser,
      unblockUser,
      reportUser,
      requestAccountDeletion,
      updateSettings,
      refresh,
    ],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error("usePrivacy must be used inside PrivacyProvider");
  return context;
}
