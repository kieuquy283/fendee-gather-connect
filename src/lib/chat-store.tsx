import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { ApiError } from "./api-errors";
import { useAuth } from "./auth";
import {
  getConversationByIdFn,
  listConversationsFn,
  listMessagesFn,
  sendMessageFn,
  type ChatState,
  type ConversationDetail,
  type MessageView,
} from "./chat.functions";

type ThreadStatus = "idle" | "loading" | "ready" | "forbidden" | "not_found" | "error";
type SendState = "sending" | "sent" | "failed";

export type ChatMessage = MessageView & {
  deliveryState: SendState;
};

type MutationState = {
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
};

type ThreadState = {
  status: ThreadStatus;
  error: string | null;
  conversation: ConversationDetail | null;
  messages: ChatMessage[];
};

type ChatContextValue = {
  loading: boolean;
  error: string | null;
  conversations: ChatState["conversations"];
  sendState: MutationState;
  refresh: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<ThreadState>;
  getThread: (conversationId: string) => ThreadState;
  sendMessage: (conversationId: string, body: string) => Promise<void>;
  retryMessage: (conversationId: string, clientMessageId: string) => Promise<void>;
};

const emptyThread: ThreadState = {
  status: "idle",
  error: null,
  conversation: null,
  messages: [],
};

const idleMutationState: MutationState = {
  status: "idle",
  error: null,
};

const ChatContext = createContext<ChatContextValue | null>(null);

function toChatMessage(message: MessageView, deliveryState: SendState = "sent"): ChatMessage {
  return {
    ...message,
    deliveryState,
  };
}

function updateMessageState(
  messages: ChatMessage[],
  clientMessageId: string,
  patch: Partial<ChatMessage>,
) {
  return messages.map((message) =>
    message.clientMessageId === clientMessageId ? { ...message, ...patch } : message,
  );
}

function inferThreadStatus(error: unknown): ThreadStatus {
  if (error instanceof ApiError) {
    if (error.code === "FORBIDDEN") return "forbidden";
    if (error.code === "NOT_FOUND") return "not_found";
    return "error";
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    message.includes("khong the mo cuoc tro chuyen") ||
    message.includes("khong nam trong cuoc tro chuyen") ||
    message.includes("da bi chan")
  ) {
    return "forbidden";
  }
  if (message.includes("khong tim thay cuoc tro chuyen")) {
    return "not_found";
  }
  return "error";
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const chatRouteActive = pathname.startsWith("/chat");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatState["conversations"]>([]);
  const [threads, setThreads] = useState<Record<string, ThreadState>>({});
  const [sendState, setSendState] = useState<MutationState>(idleMutationState);

  const refresh = useCallback(async () => {
    if (!chatRouteActive) {
      setLoading(false);
      setError(null);
      return;
    }
    if (auth.status !== "authenticated") {
      setConversations([]);
      setThreads({});
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await listConversationsFn();
      setConversations(snapshot.conversations);
      setError(null);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === "UNAUTHENTICATED" ||
          err.code === "SESSION_EXPIRED" ||
          err.code === "SESSION_REVOKED")
      ) {
        setConversations([]);
        setThreads({});
      }
      setError(err instanceof Error ? err.message : "Khong the tai danh sach chat.");
    } finally {
      setLoading(false);
    }
  }, [auth.status, chatRouteActive]);

  useEffect(() => {
    void refresh();
  }, [refresh, auth.user?.id]);

  const getThread = useCallback(
    (conversationId: string) => threads[conversationId] ?? emptyThread,
    [threads],
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (auth.status !== "authenticated") {
        const next = {
          ...emptyThread,
          status: "forbidden" as const,
          error: "Ban can dang nhap de xem tin nhan.",
        };
        setThreads((current) => ({ ...current, [conversationId]: next }));
        return next;
      }

      setThreads((current) => ({
        ...current,
        [conversationId]: {
          ...(current[conversationId] ?? emptyThread),
          status: "loading",
          error: null,
        },
      }));

      try {
        const [conversation, page] = await Promise.all([
          getConversationByIdFn({ data: { conversationId } }),
          listMessagesFn({ data: { conversationId, limit: 50, cursor: null } }),
        ]);
        const next: ThreadState = {
          status: "ready",
          error: null,
          conversation,
          messages: page.items.map((message) => toChatMessage(message)),
        };
        setThreads((current) => ({ ...current, [conversationId]: next }));
        return next;
      } catch (err) {
        const status = inferThreadStatus(err);
        const next: ThreadState = {
          status,
          error: err instanceof Error ? err.message : "Khong the tai cuoc tro chuyen.",
          conversation: null,
          messages: [],
        };
        setThreads((current) => ({ ...current, [conversationId]: next }));
        return next;
      }
    },
    [auth.status],
  );

  const sendMessage = useCallback(
    async (conversationId: string, body: string) => {
      const trimmedBody = body.trim();
      if (!trimmedBody) return;
      const clientMessageId = crypto.randomUUID();
      const optimisticMessage: ChatMessage = {
        id: `optimistic-${clientMessageId}`,
        conversationId,
        senderId: auth.user?.id ?? "me",
        direction: "outgoing",
        body: trimmedBody,
        createdAt: new Date().toISOString(),
        timeLabel: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
        clientMessageId,
        deliveryState: "sending",
      };

      setThreads((current) => {
        const thread = current[conversationId] ?? emptyThread;
        return {
          ...current,
          [conversationId]: {
            ...thread,
            messages: [...thread.messages, optimisticMessage],
          },
        };
      });
      setSendState({ status: "loading", error: null });

      try {
        const sent = await sendMessageFn({
          data: {
            conversationId,
            body: trimmedBody,
            clientMessageId,
          },
        });
        setThreads((current) => {
          const thread = current[conversationId] ?? emptyThread;
          return {
            ...current,
            [conversationId]: {
              ...thread,
              messages: thread.messages.map((message) =>
                message.clientMessageId === clientMessageId ? toChatMessage(sent, "sent") : message,
              ),
            },
          };
        });
        await refresh();
        setSendState({ status: "success", error: null });
      } catch (err) {
        setThreads((current) => {
          const thread = current[conversationId] ?? emptyThread;
          return {
            ...current,
            [conversationId]: {
              ...thread,
              messages: updateMessageState(thread.messages, clientMessageId, {
                deliveryState: "failed",
              }),
            },
          };
        });
        setSendState({
          status: "error",
          error: err instanceof Error ? err.message : "Khong the gui tin nhan.",
        });
        throw err;
      }
    },
    [auth.user?.id, refresh],
  );

  const retryMessage = useCallback(
    async (conversationId: string, clientMessageId: string) => {
      const thread = threads[conversationId] ?? emptyThread;
      const failed = thread.messages.find((message) => message.clientMessageId === clientMessageId);
      if (!failed) return;
      setThreads((current) => {
        const value = current[conversationId] ?? emptyThread;
        return {
          ...current,
          [conversationId]: {
            ...value,
            messages: updateMessageState(value.messages, clientMessageId, {
              deliveryState: "sending",
            }),
          },
        };
      });
      setSendState({ status: "loading", error: null });
      try {
        const sent = await sendMessageFn({
          data: {
            conversationId,
            body: failed.body,
            clientMessageId,
          },
        });
        setThreads((current) => {
          const value = current[conversationId] ?? emptyThread;
          return {
            ...current,
            [conversationId]: {
              ...value,
              messages: value.messages.map((message) =>
                message.clientMessageId === clientMessageId ? toChatMessage(sent, "sent") : message,
              ),
            },
          };
        });
        await refresh();
        setSendState({ status: "success", error: null });
      } catch (err) {
        setThreads((current) => {
          const value = current[conversationId] ?? emptyThread;
          return {
            ...current,
            [conversationId]: {
              ...value,
              messages: updateMessageState(value.messages, clientMessageId, {
                deliveryState: "failed",
              }),
            },
          };
        });
        setSendState({
          status: "error",
          error: err instanceof Error ? err.message : "Khong the gui lai tin nhan.",
        });
        throw err;
      }
    },
    [refresh, threads],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      loading,
      error,
      conversations,
      sendState,
      refresh,
      loadConversation,
      getThread,
      sendMessage,
      retryMessage,
    }),
    [
      loading,
      error,
      conversations,
      sendState,
      refresh,
      loadConversation,
      getThread,
      sendMessage,
      retryMessage,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChatStore must be used inside ChatProvider");
  return context;
}
