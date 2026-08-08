import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EyeOff, MapPin, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { PersonCard } from "@/components/fendee/cards";
import { Chip, EmptyState, TopBar } from "@/components/fendee/ui";
import { people } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nearby/")({
  head: () => ({
    meta: [
      { title: "Nearby — Khám phá người đang Public quanh bạn | Fendee" },
      {
        name: "description",
        content:
          "Xem người đang bật chế độ Public gần bạn theo khoảng cách tương đối. Fendee không bao giờ hiển thị toạ độ chính xác cho người lạ.",
      },
      { property: "og:title", content: "Nearby trên Fendee" },
      { property: "og:description", content: "Khám phá người phù hợp đang ở gần bạn." },
    ],
  }),
  component: Nearby,
});

function Nearby() {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied">("granted");
  const [tab, setTab] = useState<"all" | "friends">("all");

  const list = people.filter((p) => (tab === "friends" ? p.isFriend : p.visibility === "public"));

  return (
    <AppShell>
      <TopBar
        title="Nearby"
        subtitle="Chỉ hiện khoảng cách tương đối"
        right={
          <Link
            to="/nearby/filters"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Bộ lọc"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Link>
        }
      />

      <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Chế độ Nearby</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "Đang bật · tự tắt sau 2 giờ" : "Đang tắt — bạn cần bật chủ động"}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {permission === "denied" && (
        <div className="mt-3 rounded-3xl border border-primary/30 bg-accent/50 p-4">
          <p className="text-sm font-semibold">Fendee chưa có quyền vị trí</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bật quyền vị trí trong Cài đặt hệ thống để dùng Nearby. Fendee chỉ đọc vị trí khi bạn mở
            màn hình này.
          </p>
          <Button size="sm" className="mt-3 rounded-full" onClick={() => setPermission("granted")}>
            Mở cài đặt quyền
          </Button>
        </div>
      )}

      {!enabled ? (
        <div className="mt-4 space-y-3">
          <EmptyState
            icon={<EyeOff className="h-6 w-6" />}
            title="Nearby đang tắt"
            body="Khi tắt, không ai thấy bạn trong danh sách quanh đây và bạn cũng không thấy người khác. Bật lên để khám phá — tắt lại bất cứ lúc nào."
            action={
              <Button className="rounded-full" onClick={() => setEnabled(true)}>
                Bật Nearby
              </Button>
            }
          />
          <p className="text-center text-[11px] text-muted-foreground">
            “Ẩn khỏi Nearby” không đồng nghĩa với “Ẩn danh” — hồ sơ của bạn vẫn có tên thật với bạn
            bè.
          </p>
          <Button
            variant="ghost"
            className="w-full rounded-full"
            onClick={() => setPermission("denied")}
          >
            Xem trạng thái chưa cấp quyền
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["all", "friends"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full py-2 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {t === "all" ? "Đang Public" : "Bạn bè"}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="accent">Trong 3km</Chip>
            <Chip tone="outline">Sở thích chung</Chip>
            <Chip tone="outline">Đang online</Chip>
          </div>

          <div className="mt-4 space-y-3">
            {list.length ? (
              list.map((p) => <PersonCard key={p.id} person={p} />)
            ) : (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="Chưa có ai quanh đây"
                body="Chưa có người nào bật Public trong bán kính bạn chọn. Thử mở rộng khoảng cách trong bộ lọc."
                action={
                  <Button variant="secondary" className="rounded-full" asChild>
                    <Link to="/nearby/filters">Chỉnh bộ lọc</Link>
                  </Button>
                }
              />
            )}
          </div>

          <p className="mb-4 mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Người lạ chỉ thấy khoảng cách làm tròn, không thấy toạ độ hay địa chỉ của bạn.
          </p>
        </>
      )}
    </AppShell>
  );
}
