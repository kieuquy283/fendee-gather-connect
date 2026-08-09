import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, MapPin, Plus, RotateCcw, Send, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { useChatStore } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: "Tin nhắn | Fendee" },
      { name: "description", content: "Nhắn tin trực tiếp trong Fendee." },
      { property: "og:title", content: "Tin nhắn trên Fendee" },
      { property: "og:description", content: "Nhắn tin nhanh để chốt chỗ gặp." },
    ],
  }),
  component: ChatRoom,
});

function ChatRoom() {
  const { id } = Route.useParams();
  const chat = useChatStore();
  const thread = chat.getThread(id);
  const loadConversation = chat.loadConversation;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    void loadConversation(id);
  }, [id, loadConversation]);

  const conversation = thread.conversation;

  if (thread.status === "loading" || thread.status === "idle") {
    return (
      <AppShell nav={false}>
        <TopBar title="Tin nhắn" back="/chat" />
        <div className="rounded-3xl border border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">
          Đang tải cuộc trò chuyện...
        </div>
      </AppShell>
    );
  }

  if (thread.status === "forbidden") {
    return (
      <AppShell nav={false}>
        <TopBar title="Tin nhắn" back="/chat" />
        <div
          data-testid="chat-access-denied"
          className="rounded-3xl border border-border bg-surface-2 p-6 text-center"
        >
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Không thể mở cuộc trò chuyện</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {thread.error ??
              "Cuộc trò chuyện này đang bị chặn hoặc phiên của bạn không có quyền truy cập."}
          </p>
        </div>
      </AppShell>
    );
  }

  if (thread.status === "not_found") {
    return (
      <AppShell nav={false}>
        <TopBar title="Tin nhắn" back="/chat" />
        <div className="rounded-3xl border border-border bg-surface-2 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Không tìm thấy cuộc trò chuyện</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {thread.error ??
              "Cuộc trò chuyện này không còn tồn tại hoặc đã bị thu hồi quyền truy cập."}
          </p>
        </div>
      </AppShell>
    );
  }

  if (thread.status === "error" || !conversation) {
    return (
      <AppShell nav={false}>
        <TopBar title="Tin nhắn" back="/chat" />
        <div
          data-testid="chat-access-denied"
          className="rounded-3xl border border-border bg-surface-2 p-6 text-center"
        >
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Không thể mở cuộc trò chuyện</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {thread.error ?? "Cuộc trò chuyện này hiện không thể tải."}
          </p>
        </div>
      </AppShell>
    );
  }

  async function handleSend() {
    if (!draft.trim()) return;
    const nextDraft = draft;
    setDraft("");
    try {
      await chat.sendMessage(id, nextDraft);
    } catch {
      setDraft(nextDraft);
    }
  }

  return (
    <AppShell nav={false}>
      <TopBar
        title={conversation.personName}
        subtitle={conversation.personOnline ? "Đang hoạt động" : "Hoạt động trước đó"}
        back="/chat"
        right={
          <Link
            to="/profile/$id"
            params={{ id: conversation.personId }}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Xem hồ sơ"
          >
            <Ava src={conversation.personAvatar} alt={conversation.personName} size={34} />
          </Link>
        }
      />

      <div className="flex flex-col gap-3 pb-6">
        <div className="mx-auto">
          <Chip tone="outline">Hôm nay</Chip>
        </div>

        <Link
          to="/gather/$id"
          params={{ id: "g1" }}
          className="rounded-2xl border border-primary/30 bg-accent/40 p-3"
        >
          <p className="text-xs font-semibold">Gather: Cà phê và làm việc chung</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" /> The Coffee House · còn 1 giờ 20 phút
          </p>
        </Link>

        {thread.messages.map((message) => (
          <div
            key={message.clientMessageId}
            className={cn(
              "max-w-[78%] break-words rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
              message.direction === "outgoing"
                ? "self-end rounded-br-lg bg-primary text-primary-foreground"
                : "self-start rounded-bl-lg bg-secondary text-secondary-foreground",
            )}
          >
            {message.body}
            <span
              className={cn(
                "mt-1 flex items-center gap-1 text-[10px]",
                message.direction === "outgoing"
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              {message.timeLabel}
              {message.deliveryState === "sending" && <span>· Đang gửi</span>}
              {message.deliveryState === "failed" && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 underline"
                  onClick={() => void chat.retryMessage(id, message.clientMessageId)}
                >
                  <RotateCcw className="h-3 w-3" /> Gửi lại
                </button>
              )}
            </span>
          </div>
        ))}

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <button className="inline-flex items-center gap-1 hover:text-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> Chặn
          </button>
          <span className="h-3 w-px bg-border" />
          <button className="inline-flex items-center gap-1 hover:text-foreground">
            <Flag className="h-3.5 w-3.5" /> Báo cáo
          </button>
        </div>

        {chat.sendState.status === "error" && (
          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
            {chat.sendState.error ?? "Không thể gửi tin nhắn."}
          </div>
        )}
      </div>

      <div className="-mx-4 mt-auto border-t border-border/70 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-11 w-11 shrink-0 rounded-full"
            asChild
          >
            <Link to="/gather/new" aria-label="Tạo Gather">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nhắn gì đó cho bạn..."
            className="flex-1 rounded-full"
            disabled={!conversation.canSend || chat.sendState.status === "loading"}
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            aria-label="Gửi tin nhắn"
            disabled={!draft.trim() || !conversation.canSend || chat.sendState.status === "loading"}
            onClick={() => void handleSend()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
