import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, EmptyState, TopBar } from "@/components/fendee/ui";
import { me, people } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/friends/")({
  head: () => ({
    meta: [
      { title: "Danh sách bạn bè — Fendee" },
      {
        name: "description",
        content: "Quản lý bạn bè trên Fendee. Chỉ bạn bè mới thấy trạng thái và khu vực của bạn.",
      },
      { property: "og:title", content: "Bạn bè trên Fendee" },
      { property: "og:description", content: "Danh sách bạn bè và lời mời kết bạn." },
    ],
  }),
  component: FriendsList,
});

function FriendsList() {
  const friends = people.filter((p) => p.isFriend);
  return (
    <AppShell>
      <TopBar
        title="Bạn bè"
        subtitle={`${me.friends} người bạn`}
        back="/profile"
        right={
          <Link
            to="/add-friend"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Thêm bạn"
          >
            <UserPlus className="h-4 w-4" />
          </Link>
        }
      />

      <Link
        to="/friends/requests"
        className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-accent/40 p-4"
      >
        <Users className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Lời mời kết bạn</p>
          <p className="text-[11px] text-muted-foreground">3 người đang chờ bạn phản hồi</p>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          3
        </span>
      </Link>

      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm trong bạn bè..." className="h-11 rounded-2xl pl-10" />
      </div>

      <ul className="mt-4 space-y-1">
        {friends.map((p) => (
          <li key={p.id}>
            <Link
              to="/profile/$id"
              params={{ id: p.id }}
              className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary"
            >
              <Ava src={p.avatar} alt={p.name} size={46} online={p.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {p.online ? `${p.distance} · ${p.place}` : "Đang ẩn vị trí"}
                </p>
              </div>
              <Button size="sm" variant="secondary" className="rounded-full" asChild>
                <span>Rủ gặp</span>
              </Button>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Bạn bè đang ẩn vị trí"
          body="Những người bạn đã tắt chia sẻ vị trí sẽ không hiện ở đây. Bạn vẫn nhắn tin cho họ được."
        />
      </div>
      <div className="h-4" />
    </AppShell>
  );
}
