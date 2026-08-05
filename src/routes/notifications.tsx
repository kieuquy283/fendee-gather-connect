import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarClock, MapPin, ShieldCheck, UserPlus } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { EmptyState, TopBar } from "@/components/fendee/ui";
import { notifications, type Notice } from "@/lib/fendee-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Thông báo — Fendee" },
      {
        name: "description",
        content: "Lời mời Gather, lời mời kết bạn và cập nhật từ bạn bè quanh bạn.",
      },
      { property: "og:title", content: "Thông báo Fendee" },
      { property: "og:description", content: "Tất cả hoạt động mới của bạn bè." },
    ],
  }),
  component: Notifications,
});

const icons = {
  gather: CalendarClock,
  friend: UserPlus,
  nearby: MapPin,
  system: ShieldCheck,
} as const;

const links = {
  gather: "/gather",
  friend: "/friends/requests",
  nearby: "/nearby",
  system: "/settings/privacy",
} as const;

function Notifications() {
  return (
    <AppShell>
      <TopBar title="Thông báo" subtitle="2 thông báo mới" back="/home" />

      {notifications.length ? (
        <ul className="space-y-2">
          {notifications.map((n: Notice) => {
            const Icon = icons[n.type];
            return (
              <li key={n.id}>
                <Link
                  to={links[n.type]}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5 transition-colors",
                    n.unread ? "border-primary/30 bg-accent/40" : "border-border/70 bg-card",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{n.time} trước</p>
                  </div>
                  {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Chưa có thông báo"
          body="Khi bạn bè tạo Gather hoặc cần giúp đỡ, bạn sẽ thấy ở đây."
        />
      )}
      <div className="h-4" />
    </AppShell>
  );
}
