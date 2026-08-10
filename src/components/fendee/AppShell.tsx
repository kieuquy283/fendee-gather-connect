import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, MapPin, MessageCircle, Plus, User, Users } from "lucide-react";
import { RequireAuth } from "@/lib/auth";
import { usePresence } from "@/lib/presence-store";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Trang chủ", shortLabel: "Nhà", icon: Home },
  { to: "/tram", label: "Trạm", shortLabel: "Trạm", icon: MapPin },
  { to: "/gather", label: "Tạo Gather", shortLabel: "Tạo", icon: Users, center: true },
  { to: "/chat", label: "Chat", shortLabel: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Tôi", shortLabel: "Tôi", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="pointer-events-auto sticky bottom-0 z-30 -mx-4 border-t border-border/70 bg-background/95 px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl sm:-mx-5 sm:px-3">
      <ul className="grid grid-cols-5 items-end gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          const Icon = tab.icon;

          if (tab.center) {
            return (
              <li key={tab.to} className="min-w-0">
                <Link
                  to="/gather/new"
                  aria-label={tab.label}
                  className="mx-auto -mt-6 flex h-12 w-12 items-center justify-center rounded-[20px] bg-accent-gradient text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] max-[359px]:h-11 max-[359px]:w-11"
                >
                  <Plus className="h-6 w-6" />
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.to} className="min-w-0">
              <Link
                to={tab.to}
                aria-label={tab.label}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-2xl px-1 py-2 transition-colors",
                  active ? "bg-accent/45 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({
  children,
  nav = true,
  bare = false,
  protectedRoute = true,
}: {
  children: ReactNode;
  nav?: boolean;
  bare?: boolean;
  protectedRoute?: boolean;
}) {
  const presence = usePresence();
  const status = presence.presenceSession?.status ?? "off";
  const showPresence =
    presence.isPresenceEnabled || status === "expired" || presence.permission === "lost";
  const label =
    status === "moving"
      ? "Bạn đang di chuyển, Nearby tạm ẩn"
      : status === "offline" || presence.permission === "lost"
        ? "Mất quyền vị trí"
        : status === "expired"
          ? "Hiện diện đã hết hạn"
          : presence.isPresenceEnabled
            ? `Nearby: ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "đang ẩn"} · Bạn bè: ${
                presence.friendLocationSnapshot?.zone.shortLabel ?? "chưa chia sẻ"
              }`
            : "";

  const shell = (
    <div className="min-h-[100dvh] bg-background">
      <div
        className={cn(
          "relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-4 sm:px-5",
          !bare && "pb-4",
          "sm:border-x sm:border-border/60",
        )}
      >
        {showPresence && (
          <div
            aria-live="polite"
            className={cn(
              "sticky top-0 z-40 -mx-4 border-b border-border/70 px-4 py-[max(0.625rem,env(safe-area-inset-top))] text-center text-[11px] font-semibold backdrop-blur-xl sm:-mx-5 sm:px-5",
              status === "moving" || status === "offline" || presence.permission === "lost"
                ? "bg-warn/15 text-warn-foreground"
                : status === "expired"
                  ? "bg-secondary text-muted-foreground"
                  : "bg-online/12 text-online",
            )}
          >
            {label}
          </div>
        )}
        <main className="flex-1 pb-3">{children}</main>
        {nav && <BottomNav />}
      </div>
    </div>
  );

  return protectedRoute ? <RequireAuth>{shell}</RequireAuth> : shell;
}
