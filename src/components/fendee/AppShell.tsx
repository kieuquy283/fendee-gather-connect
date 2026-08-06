import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, MapPin, Users, MessageCircle, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/tram", label: "Trạm", icon: MapPin },
  { to: "/gather", label: "Gather", icon: Users, center: true },
  { to: "/chat", label: "Tin nhắn", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="pointer-events-auto sticky bottom-0 z-30 -mx-5 border-t border-border/70 bg-background/90 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <ul className="flex items-end justify-between">
        {tabs.map((t) => {
          const active = pathname === t.to || pathname.startsWith(t.to + "/");
          const Icon = t.icon;
          if (t.center) {
            return (
              <li key={t.to} className="flex-1">
                <Link
                  to="/gather/new"
                  className="mx-auto -mt-6 flex h-13 w-13 flex-col items-center justify-center rounded-2xl bg-accent-gradient text-primary-foreground shadow-glow"
                  style={{ height: 52, width: 52 }}
                  aria-label="Tạo Gather"
                >
                  <Plus className="h-6 w-6" />
                </Link>
                <span className="mt-1 block text-center text-[10px] font-medium text-muted-foreground">
                  Gather
                </span>
              </li>
            );
          }
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
                {t.label}
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
}: {
  children: ReactNode;
  nav?: boolean;
  bare?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5",
          !bare && "pb-4",
          "sm:border-x sm:border-border/60",
        )}
      >
        <main className="flex-1">{children}</main>
        {nav && <BottomNav />}
      </div>
    </div>
  );
}
