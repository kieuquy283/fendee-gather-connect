import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ChevronRight, Eye, HelpCircle, Moon, ShieldAlert, Sun, User } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const { theme, setTheme } = useTheme();

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
      <div className="h-4" />
    </AppShell>
  );
}
