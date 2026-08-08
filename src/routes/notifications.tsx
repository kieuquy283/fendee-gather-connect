import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarClock, MapPin, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { EmptyState, TopBar } from "@/components/fendee/ui";
import { notifications, type Notice } from "@/lib/fendee-data";
import { useGatherStore, type GatherNotification } from "@/lib/gather-store";
import { usePresence } from "@/lib/presence-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Thông báo - Fendee" },
      {
        name: "description",
        content: "Lời mời Gather, co-host, RSVP, lời mời kết bạn và cập nhật hiện diện.",
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
  const presence = usePresence();
  const gatherStore = useGatherStore();
  const sessionNotice: Notice | null =
    presence.presenceSession?.notificationSent && presence.friendLocationSnapshot
      ? {
          id: "presence-session",
          type: "nearby",
          title: "Presence shared",
          body: `${presence.audienceLabel} received a one-time snapshot for ${presence.friendLocationSnapshot.zone.shortLabel}.`,
          time: "now",
          unread: true,
        }
      : null;
  const visibleNotifications = sessionNotice ? [sessionNotice, ...notifications] : notifications;
  const visibleGatherNotifications = gatherStore.notifications.filter(
    (notice) => notice.recipientId === gatherStore.currentUserId,
  );

  return (
    <AppShell>
      <TopBar title="Thông báo" subtitle="Gather, RSVP và hiện diện" back="/home" />

      {visibleGatherNotifications.length || visibleNotifications.length ? (
        <ul className="space-y-2">
          {visibleGatherNotifications.map((notice) => (
            <li key={notice.id}>
              <GatherNoticeItem notice={notice} />
              {notice.type === "COHOST_INVITE" &&
                notice.recipientId === gatherStore.currentUserId && (
                  <div className="-mt-2 mb-2 flex gap-2 rounded-b-2xl border-x border-b border-primary/20 bg-accent/20 px-3 pb-3">
                    <Button
                      size="sm"
                      className="flex-1 rounded-full"
                      onClick={() =>
                        gatherStore.respondToCohostInvite(
                          notice.gatherId,
                          gatherStore.currentUserId,
                          "accepted",
                        )
                      }
                    >
                      Cùng tạo
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 rounded-full"
                      onClick={() =>
                        gatherStore.respondToCohostInvite(
                          notice.gatherId,
                          gatherStore.currentUserId,
                          "declined",
                        )
                      }
                    >
                      Từ chối
                    </Button>
                  </div>
                )}
            </li>
          ))}

          {visibleNotifications.map((notice: Notice) => {
            const Icon = icons[notice.type];
            return (
              <li key={notice.id}>
                <Link
                  to={links[notice.type]}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5 transition-colors",
                    notice.unread ? "border-primary/30 bg-accent/40" : "border-border/70 bg-card",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{notice.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{notice.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{notice.time} trước</p>
                  </div>
                  {notice.unread && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Chưa có thông báo"
          body="Khi bạn bè tạo Gather hoặc cập nhật RSVP, bạn sẽ thấy ở đây."
        />
      )}
      <div className="h-4" />
    </AppShell>
  );
}

function GatherNoticeItem({ notice }: { notice: GatherNotification }) {
  const Icon = notice.type.startsWith("COHOST") ? UserCog : CalendarClock;
  return (
    <Link
      to="/gather/$id"
      params={{ id: notice.gatherId }}
      className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-accent/40 p-3.5 transition-colors"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{notice.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{notice.body}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{notice.time}</p>
      </div>
      {notice.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </Link>
  );
}
