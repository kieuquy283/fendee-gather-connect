import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircleOff, Search } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, EmptyState, TopBar } from "@/components/fendee/ui";
import { conversations, getPerson } from "@/lib/fendee-data";
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
  return (
    <AppShell>
      <TopBar title="Tin nhắn" subtitle="Chỉ nhắn được với bạn bè hoặc cùng Gather" />

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm bạn bè..." className="h-11 rounded-2xl pl-10" />
      </div>

      <ul className="mt-4 space-y-1">
        {conversations.map((c) => {
          const p = getPerson(c.personId)!;
          return (
            <li key={c.id}>
              <Link
                to="/chat/$id"
                params={{ id: c.id }}
                className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary"
              >
                <Ava src={p.avatar} alt={p.name} size={48} online={p.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {c.time}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.last}</p>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {c.unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <EmptyState
          icon={<MessageCircleOff className="h-6 w-6" />}
          title="Lời mời tin nhắn"
          body="Không có lời mời nhắn tin nào đang chờ. Người lạ chỉ nhắn được cho bạn khi cùng tham gia một Gather."
          action={
            <Button variant="secondary" className="rounded-full" asChild>
              <Link to="/settings/privacy">Cài đặt ai được nhắn tôi</Link>
            </Button>
          }
        />
      </div>
      <div className="h-4" />
    </AppShell>
  );
}
