import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  HandHeart,
  HelpCircle,
  LayoutGrid,
  Pencil,
  Settings,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { me } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Hồ sơ của tôi — Fendee" },
      {
        name: "description",
        content:
          "Cập nhật trạng thái, chế độ chia sẻ vị trí và những điều bạn có thể giúp hoặc đang cần giúp.",
      },
      { property: "og:title", content: "Hồ sơ Fendee của tôi" },
      { property: "og:description", content: "Quản lý trạng thái và quyền riêng tư của bạn." },
    ],
  }),
  component: MyProfile,
});

const options = [
  { key: "public", label: "Mọi người", sub: "Ai ở gần cũng thấy khoảng cách tương đối", icon: Globe2 },
  { key: "friends", label: "Chỉ bạn bè", sub: "Mặc định — an toàn nhất", icon: Users },
  { key: "hidden", label: "Ẩn khỏi Nearby", sub: "Bạn vẫn xem được người khác", icon: EyeOff },
] as const;

function MyProfile() {
  const [vis, setVis] = useState<(typeof options)[number]["key"]>("friends");

  return (
    <AppShell>
      <TopBar
        title="Hồ sơ"
        right={
          <Link
            to="/settings/privacy"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Cài đặt"
          >
            <Settings className="h-4 w-4" />
          </Link>
        }
      />

      <section className="rounded-3xl bg-brand-gradient p-5 text-center text-primary-foreground shadow-glow">
        <Ava src={me.avatar} alt={me.name} size={84} />
        <h1 className="mt-3 text-xl font-bold">{me.name}</h1>
        <p className="text-xs text-primary-foreground/70">{me.bio}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" className="rounded-full" asChild>
            <Link to="/setup-profile">
              <Pencil className="h-3.5 w-3.5" /> Sửa hồ sơ
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/25"
            asChild
          >
            <Link to="/add-friend">Chia sẻ QR</Link>
          </Button>
        </div>
      </section>

      <section className="mt-4">
        <Label className="mb-2.5 block">Tuỳ chỉnh chia sẻ vị trí</Label>
        <div className="space-y-2">
          {options.map((o) => {
            const Icon = o.icon;
            const on = vis === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setVis(o.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  on ? "border-primary bg-accent/40" : "border-border bg-card",
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{o.label}</p>
                  <p className="text-[11px] text-muted-foreground">{o.sub}</p>
                </div>
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border-[5px]",
                    on ? "border-primary" : "border-border",
                  )}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          “Ẩn khỏi Nearby” không phải “Ẩn danh”: bạn bè vẫn thấy đúng tên và ảnh của bạn.
        </p>
      </section>

      <section className="mt-6 space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">Cập nhật trạng thái & Note</p>
        <div className="space-y-1.5">
          <Label htmlFor="where" className="text-xs text-muted-foreground">
            Bạn đang ở đâu?
          </Label>
          <Input id="where" placeholder="Nhập text..." className="h-11 rounded-2xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="can" className="text-xs text-muted-foreground">
            Bạn có thể giúp gì?
          </Label>
          <Input
            id="can"
            defaultValue={me.canHelp[0]}
            placeholder="Nhập text..."
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="need" className="text-xs text-muted-foreground">
            Bạn cần giúp gì?
          </Label>
          <Input
            id="need"
            defaultValue={me.needHelp[0]}
            placeholder="Nhập text..."
            className="h-11 rounded-2xl"
          />
        </div>
        <Button className="w-full rounded-full">Lưu trạng thái</Button>
      </section>

      <section className="mt-6">
        <Label className="mb-2.5 block">Sở thích</Label>
        <div className="flex flex-wrap gap-2">
          {me.interests.map((i) => (
            <Chip key={i} tone="accent">
              {i}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-1 rounded-3xl border border-border/70 bg-card p-1 shadow-card">
        {[
          { to: "/friends/requests", icon: Users, label: "Lời mời kết bạn", meta: "3" },
          { to: "/friends", icon: Users, label: "Danh sách bạn bè", meta: String(me.friends) },
          { to: "/notifications", icon: Bell, label: "Thông báo", meta: "2 mới" },
          { to: "/widgets", icon: LayoutGrid, label: "Widget màn hình chính", meta: "" },
          { to: "/settings/privacy", icon: Eye, label: "Quyền riêng tư & an toàn", meta: "" },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-secondary"
            >
              <Icon className="h-4.5 w-4.5 text-primary" />
              <span className="flex-1 text-sm font-medium">{r.label}</span>
              {r.meta && <span className="text-xs text-muted-foreground">{r.meta}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <HandHeart className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Đã giúp</p>
          <p className="text-xl font-bold">18 lần</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <HelpCircle className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Được giúp</p>
          <p className="text-xl font-bold">11 lần</p>
        </div>
      </section>
      <div className="h-4" />
    </AppShell>
  );
}
