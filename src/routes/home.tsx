import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, MapPin, Pencil, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { GatherCard, StatusCard } from "@/components/fendee/cards";
import { Ava, Chip, EmptyState, SectionTitle } from "@/components/fendee/ui";
import { feed, gathers, me, people } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Trang chủ Fendee — Bạn bè đang làm gì" },
      {
        name: "description",
        content:
          "Xem trạng thái ngắn của bạn bè, Gather đang mở quanh bạn và cập nhật trạng thái của chính bạn.",
      },
      { property: "og:title", content: "Trang chủ Fendee" },
      { property: "og:description", content: "Bạn bè đang ở đâu và đang cần gì." },
    ],
  }),
  component: HomeFeed,
});

function HomeFeed() {
  const [shareLocation, setShareLocation] = useState(false);
  const live = gathers.filter((g) => g.status === "live");
  const friendsOnline = people.filter((p) => p.isFriend);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 -mx-5 mb-4 bg-background/85 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Ava src={me.avatar} alt={me.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Chào buổi chiều</p>
            <p className="truncate text-base font-semibold">{me.name}</p>
          </div>
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            aria-label="Thông báo"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <Ava src={me.avatar} alt={me.name} size={40} />
          <Link
            to="/profile"
            className="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted-foreground"
          >
            Bạn đang ở đâu, đang làm gì?
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-medium">Chia sẻ vị trí kèm trạng thái</p>
              <p className="text-[11px] text-muted-foreground">
                {shareLocation ? "Chỉ bạn bè thấy khu vực của bạn" : "Đang tắt — mặc định an toàn"}
              </p>
            </div>
          </div>
          <Switch checked={shareLocation} onCheckedChange={setShareLocation} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1 rounded-full" asChild>
            <Link to="/gather/new">
              <Plus className="h-4 w-4" /> Tạo Gather
            </Link>
          </Button>
          <Button size="sm" variant="secondary" className="flex-1 rounded-full" asChild>
            <Link to="/profile">
              <Pencil className="h-4 w-4" /> Cập nhật Note
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/friends" className="text-xs font-medium text-primary">
              Tất cả
            </Link>
          }
        >
          Bạn bè đang hoạt động
        </SectionTitle>
        <ul className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1">
          {friendsOnline.map((p) => (
            <li key={p.id} className="w-16 shrink-0 text-center">
              <Link to="/profile/$id" params={{ id: p.id }}>
                <Ava src={p.avatar} alt={p.name} size={56} online={p.online} ring={p.online} />
                <p className="mt-1.5 truncate text-[11px] font-medium">{p.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{p.distance}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/gather" className="text-xs font-medium text-primary">
              Xem tất cả
            </Link>
          }
        >
          Gather đang mở
        </SectionTitle>
        <div className="space-y-3">
          {live.slice(0, 2).map((g) => (
            <GatherCard key={g.id} gather={g} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Trạng thái của bạn bè</SectionTitle>
        <div className="space-y-3">
          {feed.map((p) => (
            <StatusCard key={p.id} post={p} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Chưa có gì mới</SectionTitle>
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Hết cập nhật rồi"
          body="Bạn bè chưa đăng gì thêm. Thử tạo một Gather để rủ mọi người ra ngoài xem sao."
          action={
            <Button className="rounded-full" asChild>
              <Link to="/gather/new">Tạo Gather</Link>
            </Button>
          }
        />
      </section>

      <p className="mb-4 mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Vị trí chỉ được chia sẻ khi bạn bật
        <Link to="/settings/privacy" className="font-medium text-primary underline">
          Cài đặt riêng tư
        </Link>
      </p>
      <div className="mb-2 flex justify-center">
        <Chip tone="outline">Fendee không phải app hẹn hò</Chip>
      </div>
    </AppShell>
  );
}
