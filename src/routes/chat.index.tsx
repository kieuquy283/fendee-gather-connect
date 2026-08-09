import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircleOff, Search } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, EmptyState, TopBar } from "@/components/fendee/ui";
import { useChatStore } from "@/lib/chat-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "Tin nhắn — Fendee" },
      {
        name: "description",
        content: "Trò chuyện với bạn bè và những người cùng tham gia Gather của bạn.",
      },
      { property: "og:title", content: "Tin nhắn trên Fendee" },
      { property: "og:description", content: "Nhắn tin nhanh để chốt chỗ gặp." },
    ],
  }),
  component: ChatList,
});

function ChatList() {
  const chat = useChatStore();
  const visibleConversations = chat.conversations;

  return (
    <AppShell>
      <TopBar title="Tin nhắn" subtitle="Chỉ nhắn được với bạn bè hoặc người cùng Gather" />

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm bạn bè..." className="pl-10" />
      </div>

      <ul className="mt-4 space-y-1">
        {chat.loading && (
          <li className="rounded-2xl border border-border bg-surface-2 px-4 py-6 text-center text-sm text-muted-foreground">
            Đang tải danh sách trò chuyện...
          </li>
        )}
        {visibleConversations.map((conversation) => (
          <li key={conversation.id}>
            <Link
              to="/chat/$id"
              params={{ id: conversation.id }}
              className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary"
            >
              <Ava
                src={conversation.personAvatar}
                alt={conversation.personName}
                size={48}
                online={conversation.personOnline}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-sm font-semibold">{conversation.personName}</p>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {conversation.lastMessageTimeLabel}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {conversation.lastMessagePreview}
                </p>
              </div>
              {conversation.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {conversation.unreadCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {!chat.loading && chat.error && (
        <div className="mt-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          {chat.error}
        </div>
      )}

      <div className="mt-6">
        <EmptyState
          icon={<MessageCircleOff className="h-6 w-6" />}
          title="Chưa có lời mời trò chuyện"
          body="Người lạ chỉ có thể nhắn cho bạn khi đang cùng một Gather hoặc đã kết nối an toàn."
          action={
            <Button variant="secondary" className="rounded-full" asChild>
              <Link to="/settings/privacy">Xem ai có thể nhắn cho tôi</Link>
            </Button>
          }
        />
      </div>
      <div className="h-4" />
    </AppShell>
  );
}
