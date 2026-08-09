import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Eye,
  HelpCircle,
  LogOut,
  Moon,
  ShieldAlert,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/lib/auth";
import { usePrivacy } from "@/lib/privacy-store";
import { useTheme, type Theme } from "@/lib/theme";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Cài đặt — Fendee" },
      {
        name: "description",
        content: "Quản lý giao diện, quyền riêng tư, thông báo và tài khoản Fendee của bạn.",
      },
      { property: "og:title", content: "Cài đặt Fendee" },
      { property: "og:description", content: "Tùy chỉnh trải nghiệm Fendee của bạn." },
    ],
  }),
  component: Settings,
});

const rows = [
  {
    to: "/settings/privacy",
    icon: Eye,
    label: "Quyền riêng tư & an toàn",
    sub: "Vị trí, hiển thị, liên hệ và danh sách đã chặn",
  },
  {
    to: "/notifications",
    icon: Bell,
    label: "Thông báo",
    sub: "Xem lời mời, tin nhắn và cập nhật hệ thống",
  },
  {
    to: "/profile",
    icon: User,
    label: "Hồ sơ",
    sub: "Ảnh, trạng thái, Note và sở thích",
  },
] as const;

function Settings() {
  const auth = useAuth();
  const privacy = usePrivacy();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const loggingOut = auth.signOutState.status === "loading";
  const requestingDeletion = privacy.actionState.deletion.status === "loading";
  const accountError = auth.signOutState.error ?? privacy.actionState.deletion.error;

  return (
    <AppShell>
      <TopBar title="Cài đặt" back="/profile" />

      <section>
        <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sun className="h-4 w-4 text-primary" /> Giao diện
        </h2>
        <div className="rounded-3xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">Theme</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Chọn dark theme hoặc light theme cho Fendee.
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(value) => {
                if (value) setTheme(value as Theme);
              }}
              aria-label="Chọn theme"
              className="rounded-2xl border border-border/70 bg-secondary p-1"
            >
              <ToggleGroupItem
                value="light"
                aria-label="Light theme"
                className="h-9 w-9 rounded-xl px-0 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm"
              >
                <Sun className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dark"
                aria-label="Dark theme"
                className="h-9 w-9 rounded-xl px-0 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm"
              >
                <Moon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-primary" /> Tài khoản
        </h2>
        <div className="space-y-1 rounded-3xl border border-border/70 bg-card p-1 shadow-card">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <Link
                key={row.to}
                to={row.to}
                className="flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-secondary"
              >
                <Icon className="h-4.5 w-4.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{row.label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{row.sub}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-border/70 bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <HelpCircle className="h-4 w-4 text-primary" /> Trợ giúp
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Các cài đặt này chỉ áp dụng trên thiết bị hiện tại trong bản demo.
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-border/70 bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-primary" /> Account lifecycle
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Logout revokes the active session and clears user-scoped prototype data on this device.
          Deletion is still a pending backend request until a production account service is
          connected.
        </p>
        {privacy.deletionRequest && (
          <p className="mt-3 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            Account deletion requested. Backend enforcement is still required.
          </p>
        )}
        {accountError && (
          <p role="alert" className="mt-3 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            {accountError}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="rounded-full"
            disabled={loggingOut || requestingDeletion}
            onClick={() =>
              void auth
                .signOut()
                .then(() => {
                  navigate({ to: "/auth" });
                })
                .catch(() => undefined)
            }
          >
            <LogOut className="h-4 w-4" /> {loggingOut ? "Logging out..." : "Logout"}
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            disabled={loggingOut || requestingDeletion}
            onClick={() => void privacy.requestAccountDeletion().catch(() => undefined)}
          >
            <Trash2 className="h-4 w-4" /> {requestingDeletion ? "Requesting..." : "Delete"}
          </Button>
        </div>
      </section>
      <div className="h-4" />
    </AppShell>
  );
}
