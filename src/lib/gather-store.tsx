import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { gathers as legacyGathers, me, people, type Person } from "./fendee-data";

export type GatherHostRole = "owner" | "cohost";
export type CohostStatus = "pending" | "accepted" | "declined";
export type InviteStatus = "sent" | "seen" | "going" | "maybe" | "declined";
export type GatherAudienceSource = "all_friends" | "groups" | "selected_friends" | "mixed";
export type GatherStatus = "live" | "expired" | "ended";
export type GatherNotificationType =
  | "COHOST_INVITE"
  | "COHOST_ACCEPTED"
  | "COHOST_DECLINED"
  | "GATHER_INVITE"
  | "RSVP_GOING"
  | "RSVP_MAYBE"
  | "RSVP_DECLINED"
  | "GATHER_UPDATED"
  | "GATHER_EXPIRING"
  | "GATHER_ENDED";

export type GatherHost = {
  personId: string;
  role: GatherHostRole;
  cohostStatus: CohostStatus;
  invitedAt: string;
  respondedAt?: string;
};

export type GatherInvite = {
  id: string;
  gatherId: string;
  personId: string;
  status: InviteStatus;
  source: GatherAudienceSource;
  sourceLabels: string[];
  sentAt: string;
  updatedAt: string;
};

export type GatherAudienceSelection = {
  includeAllFriends: boolean;
  groupIds: string[];
  friendIds: string[];
};

export type GatherAudienceSnapshot = {
  source: GatherAudienceSource;
  selectedGroupIds: string[];
  selectedFriendIds: string[];
  resolvedRecipientIds: string[];
  resolvedAt: string;
};

export type Gather = {
  id: string;
  ownerId: string;
  title: string;
  note: string;
  place: string;
  distance: string;
  startsIn: string;
  duration: string;
  expiresAt: string;
  expiresAtMs: number;
  status: GatherStatus;
  hosts: GatherHost[];
  invites: GatherInvite[];
  audienceSnapshot: GatherAudienceSnapshot;
  slots: number;
  createdAt: string;
  updatedAt: string;
};

export type FriendGroup = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
};

export type GatherNotification = {
  id: string;
  type: GatherNotificationType;
  gatherId: string;
  actorId: string;
  recipientId: string;
  title: string;
  body: string;
  pushBody: string;
  time: string;
  unread: boolean;
  deepLink: string;
};

export type CreateGatherInput = {
  title: string;
  note: string;
  place: string;
  duration: string;
  cohostSelection: GatherAudienceSelection;
  inviteSelection: GatherAudienceSelection;
};

export type GatherPermission =
  | "edit_content"
  | "edit_note"
  | "edit_image"
  | "edit_place"
  | "edit_expiry"
  | "manage_cohosts"
  | "manage_audience"
  | "invite_more"
  | "end_gather"
  | "delete_gather"
  | "view_rsvp"
  | "publish_updates";

type StoredGatherState = {
  gathers: Gather[];
  notifications: GatherNotification[];
};

type ResolutionResult = {
  source: GatherAudienceSource;
  selectedGroupIds: string[];
  selectedFriendIds: string[];
  resolvedRecipientIds: string[];
  selectedGroupLabels: string[];
  selectedFriendLabels: string[];
};

type GatherContextValue = StoredGatherState & {
  currentUserId: string;
  friends: Person[];
  groups: FriendGroup[];
  blockedUserIds: string[];
  getGather: (id: string) => Gather | undefined;
  resolveAudience: (selection: GatherAudienceSelection) => ResolutionResult;
  createGather: (input: CreateGatherInput) => string;
  respondToCohostInvite: (
    gatherId: string,
    personId: string,
    status: Exclude<CohostStatus, "pending">,
  ) => void;
  updateRSVP: (gatherId: string, personId: string, status: InviteStatus) => void;
  editGather: (
    gatherId: string,
    actorId: string,
    patch: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
  ) => boolean;
  inviteMore: (gatherId: string, actorId: string, selection: GatherAudienceSelection) => boolean;
  endGather: (gatherId: string, actorId: string) => boolean;
  expireGather: (gatherId: string) => void;
  can: (gather: Gather | undefined, actorId: string, permission: GatherPermission) => boolean;
};

export const currentUserId = me.id;

const now = () => new Date().toISOString();

const hoursFromNow = (hours: number) => Date.now() + hours * 60 * 60 * 1000;

export const blockedUserIds = ["baongoc"];

export const friendGroups: FriendGroup[] = [
  {
    id: "close-friends",
    name: "Bạn thân quanh trường",
    description: "Nhóm hay gặp sau giờ học",
    memberIds: ["hailang", "minhtu", "linhchi", "baongoc"],
  },
  {
    id: "study-crew",
    name: "Nhóm học tài chính và dữ liệu cuối tuần",
    description: "Tên dài để kiểm tra layout nhóm",
    memberIds: ["tuananh", "quanghuy", "baongoc", "minhtu"],
  },
  {
    id: "coffee-loop",
    name: "Coffee loop",
    description: "Bạn bè hay ngồi cafe làm việc",
    memberIds: ["hailang", "linhchi", "quanghuy"],
  },
];

const emptySelection: GatherAudienceSelection = {
  includeAllFriends: false,
  groupIds: [],
  friendIds: [],
};

function isValidInvitee(person: Person | undefined) {
  return Boolean(person && person.isFriend && !blockedUserIds.includes(person.id));
}

function getAudienceSource(selection: GatherAudienceSelection): GatherAudienceSource {
  if (selection.includeAllFriends && (selection.groupIds.length || selection.friendIds.length)) {
    return "mixed";
  }
  if (selection.includeAllFriends) return "all_friends";
  if (selection.groupIds.length && selection.friendIds.length) return "mixed";
  if (selection.groupIds.length) return "groups";
  return "selected_friends";
}

function resolveAudienceSelection(selection: GatherAudienceSelection): ResolutionResult {
  const ids = new Set<string>();
  const selectedGroupLabels: string[] = [];

  if (selection.includeAllFriends) {
    people.filter(isValidInvitee).forEach((person) => ids.add(person.id));
  }

  selection.groupIds.forEach((groupId) => {
    const group = friendGroups.find((item) => item.id === groupId);
    if (!group) return;
    selectedGroupLabels.push(group.name);
    group.memberIds.forEach((personId) => {
      if (isValidInvitee(people.find((person) => person.id === personId))) ids.add(personId);
    });
  });

  selection.friendIds.forEach((personId) => {
    if (isValidInvitee(people.find((person) => person.id === personId))) ids.add(personId);
  });

  ids.delete(currentUserId);

  return {
    source: getAudienceSource(selection),
    selectedGroupIds: [...selection.groupIds],
    selectedFriendIds: [...selection.friendIds],
    resolvedRecipientIds: [...ids],
    selectedGroupLabels,
    selectedFriendLabels: selection.friendIds
      .map((id) => people.find((person) => person.id === id)?.name)
      .filter(Boolean) as string[],
  };
}

function makeNotification(input: {
  type: GatherNotificationType;
  gatherId: string;
  actorId: string;
  recipientId: string;
  title: string;
  body: string;
  pushBody?: string;
}): GatherNotification {
  return {
    id: `${input.type}-${input.gatherId}-${input.actorId}-${input.recipientId}`,
    type: input.type,
    gatherId: input.gatherId,
    actorId: input.actorId,
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    pushBody: input.pushBody ?? "Bạn có cập nhật Gather mới trên Fendee.",
    time: "vừa xong",
    unread: true,
    deepLink: `/gather/${input.gatherId}`,
  };
}

function mergeNotifications(
  existing: GatherNotification[],
  additions: GatherNotification[],
): GatherNotification[] {
  const seen = new Set(existing.map((notice) => notice.id));
  return [...additions.filter((notice) => !seen.has(notice.id)), ...existing];
}

function inviteFromPerson(
  gatherId: string,
  personId: string,
  status: InviteStatus,
  source: GatherAudienceSource,
  sourceLabels: string[],
): GatherInvite {
  const timestamp = now();
  return {
    id: `${gatherId}-${personId}`,
    gatherId,
    personId,
    status,
    source,
    sourceLabels,
    sentAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedGathers(): Gather[] {
  const seeded = legacyGathers.map<Gather>((gather, index) => {
    const source: GatherAudienceSource =
      gather.audience === "friends"
        ? "all_friends"
        : gather.audience === "selected"
          ? "selected_friends"
          : "mixed";
    const inviteIds = [...new Set([currentUserId, ...gather.joined])].filter(
      (id) => id !== gather.hostId,
    );
    const hosts: GatherHost[] = [
      {
        personId: gather.hostId,
        role: "owner",
        cohostStatus: "accepted",
        invitedAt: now(),
        respondedAt: now(),
      },
    ];

    if (gather.id === "g3") {
      hosts.push({
        personId: currentUserId,
        role: "cohost",
        cohostStatus: "pending",
        invitedAt: now(),
      });
    }

    return {
      id: gather.id,
      ownerId: gather.hostId,
      title: gather.title,
      note: gather.note,
      place: gather.place,
      distance: gather.distance,
      startsIn: gather.startsIn,
      duration: gather.duration,
      expiresAt: gather.expiresAt,
      expiresAtMs: gather.status === "expired" ? Date.now() - 3600000 : hoursFromNow(index + 1),
      status: gather.status === "expired" ? "expired" : "live",
      hosts,
      invites: inviteIds.map((id) =>
        inviteFromPerson(gather.id, id, gather.joined.includes(id) ? "going" : "sent", source, [
          gather.audience === "friends" ? "Tất cả bạn bè" : "Dữ liệu mẫu",
        ]),
      ),
      audienceSnapshot: {
        source,
        selectedGroupIds: [],
        selectedFriendIds: gather.audience === "selected" ? gather.joined : [],
        resolvedRecipientIds: inviteIds,
        resolvedAt: now(),
      },
      slots: gather.slots,
      createdAt: now(),
      updatedAt: now(),
    };
  });

  seeded.unshift({
    id: "g-me",
    ownerId: currentUserId,
    title: "Cà phê làm việc chung",
    note: "Mình ngồi tầng 2, ai rảnh qua làm cùng một tiếng.",
    place: "The Coffee House Thái Hà",
    distance: "Cách 80m",
    startsIn: "Đang mở",
    duration: "2 giờ",
    expiresAt: "Đến 21:30",
    expiresAtMs: hoursFromNow(2),
    status: "live",
    hosts: [
      {
        personId: currentUserId,
        role: "owner",
        cohostStatus: "accepted",
        invitedAt: now(),
        respondedAt: now(),
      },
      {
        personId: "hailang",
        role: "cohost",
        cohostStatus: "accepted",
        invitedAt: now(),
        respondedAt: now(),
      },
      {
        personId: "minhtu",
        role: "cohost",
        cohostStatus: "pending",
        invitedAt: now(),
      },
    ],
    invites: ["linhchi", "quanghuy", "tuananh"].map((id, index) =>
      inviteFromPerson(
        "g-me",
        id,
        index === 0 ? "going" : index === 1 ? "maybe" : "sent",
        "mixed",
        ["Coffee loop", "Bạn được chọn"],
      ),
    ),
    audienceSnapshot: {
      source: "mixed",
      selectedGroupIds: ["coffee-loop"],
      selectedFriendIds: ["tuananh"],
      resolvedRecipientIds: ["linhchi", "quanghuy", "tuananh"],
      resolvedAt: now(),
    },
    slots: 8,
    createdAt: now(),
    updatedAt: now(),
  });

  return seeded;
}

function initialNotifications(gathers: Gather[]): GatherNotification[] {
  const pendingCohost = gathers.find((gather) =>
    gather.hosts.some((host) => host.personId === currentUserId && host.cohostStatus === "pending"),
  );
  const directInvite = gathers.find((gather) =>
    gather.invites.some((invite) => invite.personId === currentUserId),
  );
  const notices: GatherNotification[] = [];

  if (pendingCohost) {
    notices.push(
      makeNotification({
        type: "COHOST_INVITE",
        gatherId: pendingCohost.id,
        actorId: pendingCohost.ownerId,
        recipientId: currentUserId,
        title: `${people.find((person) => person.id === pendingCohost.ownerId)?.name ?? "Bạn bè"} mời bạn cùng tạo một Gather`,
        body: pendingCohost.title,
      }),
    );
  }

  if (directInvite) {
    notices.push(
      makeNotification({
        type: "GATHER_INVITE",
        gatherId: directInvite.id,
        actorId: directInvite.ownerId,
        recipientId: currentUserId,
        title: "Bạn có lời mời Gather",
        body: `${directInvite.title} · mở trong app để xem địa điểm`,
        pushBody: "Bạn có một lời mời Gather mới trên Fendee.",
      }),
    );
  }

  return notices;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && Boolean(value[key]);
}

function isStoredGather(value: unknown): value is Gather {
  if (!isObject(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "ownerId") &&
    hasString(value, "title") &&
    hasString(value, "place") &&
    typeof value["expiresAtMs"] === "number" &&
    ["live", "expired", "ended"].includes(String(value["status"])) &&
    Array.isArray(value["hosts"]) &&
    Array.isArray(value["invites"]) &&
    isObject(value["audienceSnapshot"]) &&
    Array.isArray(value["audienceSnapshot"]["resolvedRecipientIds"])
  );
}

function isStoredNotification(value: unknown): value is GatherNotification {
  if (!isObject(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "type") &&
    hasString(value, "gatherId") &&
    hasString(value, "recipientId") &&
    hasString(value, "deepLink")
  );
}

function readStoredState(): StoredGatherState {
  const fallbackGathers = seedGathers();
  const fallback = {
    gathers: fallbackGathers,
    notifications: initialNotifications(fallbackGathers),
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem("fendee-gather-state-v2");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredGatherState>;
    const storedGathers = Array.isArray(parsed.gathers)
      ? parsed.gathers.filter(isStoredGather)
      : [];
    const storedNotifications = Array.isArray(parsed.notifications)
      ? parsed.notifications.filter(isStoredNotification)
      : [];
    return {
      gathers: storedGathers.length ? storedGathers : fallback.gathers,
      notifications: storedNotifications.length ? storedNotifications : fallback.notifications,
    };
  } catch {
    return fallback;
  }
}

function canActor(gather: Gather | undefined, actorId: string, permission: GatherPermission) {
  if (!gather || gather.status !== "live") return false;
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

const GatherContext = createContext<GatherContextValue | null>(null);

export function GatherProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredGatherState>(readStoredState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("fendee-gather-state-v2", JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    const markExpired = () => {
      const timestamp = Date.now();
      setState((current) => {
        let changed = false;
        const gathers = current.gathers.map((gather) => {
          if (gather.status !== "live" || gather.expiresAtMs > timestamp) return gather;
          changed = true;
          return { ...gather, status: "expired" as const, updatedAt: now() };
        });
        return changed ? { ...current, gathers } : current;
      });
    };

    markExpired();
    const timer = window.setInterval(markExpired, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const getGather = useCallback(
    (id: string) => state.gathers.find((gather) => gather.id === id),
    [state.gathers],
  );

  const resolveAudience = useCallback((selection: GatherAudienceSelection) => {
    return resolveAudienceSelection(selection);
  }, []);

  const createGather = useCallback((input: CreateGatherInput) => {
    const title = input.title.trim();
    const note = input.note.trim();
    const place = input.place.trim();
    if (!title || !place || !input.duration) {
      throw new Error("Gather cần nội dung, địa điểm và thời hạn.");
    }

    const inviteResolution = resolveAudienceSelection(input.inviteSelection);
    if (!inviteResolution.resolvedRecipientIds.length) {
      throw new Error("Bạn cần chọn ít nhất một người nhận hợp lệ.");
    }

    const cohostResolution = resolveAudienceSelection(input.cohostSelection);
    const createdAt = now();
    const id = `g-${Date.now()}`;
    const expiresAtMs = hoursFromNow(
      input.duration.includes("30")
        ? 0.5
        : input.duration.includes("3")
          ? 3
          : input.duration.includes("2")
            ? 2
            : 1,
    );
    const sourceLabels = [
      ...inviteResolution.selectedGroupLabels,
      ...inviteResolution.selectedFriendLabels,
      input.inviteSelection.includeAllFriends ? "Tất cả bạn bè" : "",
    ].filter(Boolean);

    const hosts: GatherHost[] = [
      {
        personId: currentUserId,
        role: "owner",
        cohostStatus: "accepted",
        invitedAt: createdAt,
        respondedAt: createdAt,
      },
      ...cohostResolution.resolvedRecipientIds.map<GatherHost>((personId) => ({
        personId,
        role: "cohost",
        cohostStatus: "pending",
        invitedAt: createdAt,
      })),
    ];

    const gather: Gather = {
      id,
      ownerId: currentUserId,
      title,
      note,
      place,
      distance: "Khu vực hiện tại",
      startsIn: "Đang mở",
      duration: input.duration,
      expiresAt: `Đến ${new Date(expiresAtMs).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      expiresAtMs,
      status: "live",
      hosts,
      invites: inviteResolution.resolvedRecipientIds.map((personId) =>
        inviteFromPerson(id, personId, "sent", inviteResolution.source, sourceLabels),
      ),
      audienceSnapshot: {
        source: inviteResolution.source,
        selectedGroupIds: inviteResolution.selectedGroupIds,
        selectedFriendIds: inviteResolution.selectedFriendIds,
        resolvedRecipientIds: inviteResolution.resolvedRecipientIds,
        resolvedAt: createdAt,
      },
      slots: Math.max(inviteResolution.resolvedRecipientIds.length + 1, 4),
      createdAt,
      updatedAt: createdAt,
    };

    const notifications = [
      ...cohostResolution.resolvedRecipientIds.map((personId) =>
        makeNotification({
          type: "COHOST_INVITE",
          gatherId: id,
          actorId: currentUserId,
          recipientId: personId,
          title: `${me.name} mời bạn cùng tạo một Gather`,
          body: title,
        }),
      ),
      ...inviteResolution.resolvedRecipientIds.map((personId) =>
        makeNotification({
          type: "GATHER_INVITE",
          gatherId: id,
          actorId: currentUserId,
          recipientId: personId,
          title: "Bạn có lời mời Gather",
          body: `${title} · mở trong app để xem địa điểm`,
          pushBody: "Bạn có một lời mời Gather mới trên Fendee.",
        }),
      ),
    ];

    setState((current) => ({
      gathers: [gather, ...current.gathers],
      notifications: mergeNotifications(current.notifications, notifications),
    }));

    return id;
  }, []);

  const respondToCohostInvite = useCallback(
    (gatherId: string, personId: string, status: Exclude<CohostStatus, "pending">) => {
      setState((current) => {
        let changedGather: Gather | undefined;
        const gathers = current.gathers.map((gather) => {
          if (gather.id !== gatherId) return gather;
          changedGather = {
            ...gather,
            hosts: gather.hosts.map((host) =>
              host.personId === personId && host.role === "cohost"
                ? { ...host, cohostStatus: status, respondedAt: now() }
                : host,
            ),
            updatedAt: now(),
          };
          return changedGather;
        });

        if (!changedGather) return current;
        const actor = people.find((person) => person.id === personId) ?? me;
        const notice = makeNotification({
          type: status === "accepted" ? "COHOST_ACCEPTED" : "COHOST_DECLINED",
          gatherId,
          actorId: personId,
          recipientId: changedGather.ownerId,
          title:
            status === "accepted"
              ? `${actor.name} đã cùng tạo Gather`
              : `${actor.name} đã từ chối cùng tạo Gather`,
          body: changedGather.title,
        });

        return {
          gathers,
          notifications: mergeNotifications(current.notifications, [notice]),
        };
      });
    },
    [],
  );

  const updateRSVP = useCallback((gatherId: string, personId: string, status: InviteStatus) => {
    setState((current) => {
      let target: Gather | undefined;
      const gathers = current.gathers.map((gather) => {
        if (gather.id !== gatherId || gather.status !== "live") return gather;
        target = gather;
        return {
          ...gather,
          invites: gather.invites.map((invite) =>
            invite.personId === personId ? { ...invite, status, updatedAt: now() } : invite,
          ),
          updatedAt: now(),
        };
      });

      if (!target) return current;
      const actor = people.find((person) => person.id === personId) ?? me;
      const notificationType: GatherNotificationType =
        status === "going" ? "RSVP_GOING" : status === "maybe" ? "RSVP_MAYBE" : "RSVP_DECLINED";
      const notice = makeNotification({
        type: notificationType,
        gatherId,
        actorId: personId,
        recipientId: target.ownerId,
        title: `${actor.name} cập nhật RSVP`,
        body: status === "going" ? "Sẽ qua" : status === "maybe" ? "Có thể qua" : "Không tham gia",
      });

      return {
        gathers,
        notifications: mergeNotifications(current.notifications, [notice]),
      };
    });
  }, []);

  const editGather = useCallback(
    (
      gatherId: string,
      actorId: string,
      patch: Partial<Pick<Gather, "title" | "note" | "place" | "duration" | "expiresAt">>,
    ) => {
      let allowed = false;
      setState((current) => ({
        ...current,
        gathers: current.gathers.map((gather) => {
          if (gather.id !== gatherId) return gather;
          const canEdit =
            ("title" in patch && canActor(gather, actorId, "edit_content")) ||
            ("note" in patch && canActor(gather, actorId, "edit_note")) ||
            ("place" in patch && canActor(gather, actorId, "edit_place")) ||
            (("duration" in patch || "expiresAt" in patch) &&
              canActor(gather, actorId, "edit_expiry"));
          allowed = canEdit;
          return canEdit ? { ...gather, ...patch, updatedAt: now() } : gather;
        }),
      }));
      return allowed;
    },
    [],
  );

  const inviteMore = useCallback(
    (gatherId: string, actorId: string, selection: GatherAudienceSelection) => {
      let allowed = false;
      setState((current) => ({
        ...current,
        gathers: current.gathers.map((gather) => {
          if (gather.id !== gatherId || !canActor(gather, actorId, "invite_more")) return gather;
          allowed = true;
          const resolution = resolveAudienceSelection(selection);
          const existing = new Set(gather.invites.map((invite) => invite.personId));
          const additions = resolution.resolvedRecipientIds
            .filter((personId) => !existing.has(personId))
            .map((personId) =>
              inviteFromPerson(gather.id, personId, "sent", resolution.source, [
                ...resolution.selectedGroupLabels,
                ...resolution.selectedFriendLabels,
              ]),
            );
          return {
            ...gather,
            invites: [...gather.invites, ...additions],
            audienceSnapshot: {
              ...gather.audienceSnapshot,
              resolvedRecipientIds: [
                ...new Set([
                  ...gather.audienceSnapshot.resolvedRecipientIds,
                  ...additions.map((i) => i.personId),
                ]),
              ],
            },
            updatedAt: now(),
          };
        }),
      }));
      return allowed;
    },
    [],
  );

  const endGather = useCallback((gatherId: string, actorId: string) => {
    let allowed = false;
    setState((current) => {
      let ended: Gather | undefined;
      const gathers = current.gathers.map((gather) => {
        if (gather.id !== gatherId || !canActor(gather, actorId, "end_gather")) return gather;
        allowed = true;
        ended = { ...gather, status: "ended", updatedAt: now() };
        return ended;
      });

      const notices = ended
        ? ended.invites.map((invite) =>
            makeNotification({
              type: "GATHER_ENDED",
              gatherId,
              actorId,
              recipientId: invite.personId,
              title: "Gather đã kết thúc",
              body: ended!.title,
            }),
          )
        : [];

      return {
        gathers,
        notifications: mergeNotifications(current.notifications, notices),
      };
    });
    return allowed;
  }, []);

  const expireGather = useCallback((gatherId: string) => {
    setState((current) => ({
      ...current,
      gathers: current.gathers.map((gather) =>
        gather.id === gatherId ? { ...gather, status: "expired", updatedAt: now() } : gather,
      ),
    }));
  }, []);

  const can = useCallback(canActor, []);

  const value = useMemo<GatherContextValue>(
    () => ({
      ...state,
      currentUserId,
      friends: people.filter((person) => person.isFriend && person.id !== currentUserId),
      groups: friendGroups,
      blockedUserIds,
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
      state,
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
