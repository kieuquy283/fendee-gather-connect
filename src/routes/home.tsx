import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Signal,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, SectionTitle } from "@/components/fendee/ui";
import {
  GatherPresenceCard,
  PresenceCard,
  PresenceLegend,
  PresenceRail,
  StateCard,
} from "@/components/fendee/presence";
import { AppearSheet, QuickPreview, type PresenceMode } from "@/components/fendee/sheets";
import { me } from "@/lib/fendee-data";
import {
  presenceGathers,
  presencePeople,
  station,
  type PresencePerson,
} from "@/lib/fendee-presence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Fendee — Trạm hiện tại & dòng hiện diện" },
      {
        name: "description",
        content:
          "Xem quanh bạn lúc này có ai đang hiện diện, lời mời Gather nào đang mở và điều gì đáng để kết nối — không bản đồ, không toạ độ.",
      },
      { property: "og:title", content: "Fendee — Trạm hiện tại" },
      { property: "og:description", content: "Hiện diện có thời hạn, kết nối có lý do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeFeed,
});

function HomeFeed() {
  const [mode, setMode] = useState<PresenceMode>("off");
  const [duration, setDuration] = useState("1 giờ");
  const [sheet, setSheet] = useState(false);
  const [preview, setPreview] = useState<PresencePerson | null>(null);
  const [leftStation, setLeftStation] = useState(false);

  const on = mode !== "off";
  const friends = presencePeople.filter((p) => p.isFriend);
  const notable = presencePeople.filter((p) => !p.isFriend || p.presence === "public").slice(0, 3);

  const indicator =
    mode === "off"
      ? "Vị trí đang tắt"
      : mode === "friends"
        ? `Chỉ bạn bè · còn 47 phút`
        : `Public · còn 28 phút`;

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
        <button
          type="button"
          onClick={() => setSheet(true)}
          className={cn(
            "mt-2.5 flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium",
            mode === "off" && "bg-secondary text-muted-foreground",
            mode === "friends" && "bg-warn/15 text-warn-foreground",
            mode === "public" && "bg-online/12 text-online",
          )}
        >
          <Signal className="h-3.5 w-3.5" />
          {indicator}
          <span className="ml-auto opacity-70">{on ? "Đổi" : "Bật"}</span>
        </button>
      </header>

      {/* Composer */}
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

        <button
          type="button"
          onClick={() => setSheet(true)}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-xs font-semibold">Xuất hiện quanh đây</span>
              <span className="block text-[11px] text-muted-foreground">
                {mode === "off"
                  ? "Đang tắt — vị trí của bạn chưa được chia sẻ"
                  : `${mode === "public" ? "Công khai quanh đây" : "Chỉ bạn bè"} · ${duration}`}
              </span>
            </span>
          </span>
          <Chip tone={on ? "success" : "outline"}>{on ? "Đang bật" : "Tắt"}</Chip>
        </button>

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

      {/* Bạn bè đang hiện diện */}
      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/tram" className="text-xs font-medium text-primary">
              Mở Trạm
            </Link>
          }
        >
          Bạn bè đang hiện diện
        </SectionTitle>
        <PresenceRail people={friends} onPick={setPreview} />
        <PresenceLegend />
      </section>

      {/* Trạm hiện tại */}
      {on ? (
        <section className="mt-6">
          <SectionTitle>Trạm hiện tại</SectionTitle>
          <div className="rounded-3xl bg-brand-gradient p-4 text-primary-foreground shadow-glow">
            <p className="text-[11px] uppercase tracking-widest text-primary-foreground/70">
              Bạn đang ở
            </p>
            <p className="mt-1 text-lg font-semibold">{station.name}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-primary-foreground/80">
              <Clock className="h-3.5 w-3.5" />
              {mode === "public" ? station.publicLeft : "Chỉ bạn bè · còn 47 phút"}
            </p>
            <p className="mt-3 text-sm">
              {station.friends} bạn bè · {station.matches} người phù hợp · {station.gathers} Gather
              đang mở
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Bạn bè", "Hợp với bạn", "Cùng địa điểm"].map((c) => (
                <Link
                  key={c}
                  to="/tram"
                  className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-medium backdrop-blur"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>

          {leftStation ? (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Có vẻ bạn đã rời Trạm The Coffee House"
                body="Fendee không tự Public bạn ở địa điểm mới. Bạn muốn làm gì?"
                actions={
                  <>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setMode("off");
                        setLeftStation(false);
                      }}
                    >
                      Kết thúc phiên
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => setLeftStation(false)}
                    >
                      Giữ đến khi hết hạn
                    </Button>
                  </>
                }
              />
            </div>
          ) : (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Vị trí được cập nhật 18 phút trước"
                body="Trạm có thể không còn chính xác. Cập nhật để danh sách quanh bạn đúng hơn."
                actions={
                  <>
                    <Button size="sm" className="rounded-full">
                      <RefreshCw className="h-3.5 w-3.5" /> Cập nhật vị trí
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => setLeftStation(true)}
                    >
                      Kết thúc phiên
                    </Button>
                  </>
                }
              />
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <SectionTitle>Trạm hiện tại</SectionTitle>
          <StateCard
            title="Chưa có Trạm nào"
            body="Bật hiện diện để Fendee biết bạn đang ở đâu và cho bạn thấy ai đang quanh đây."
            actions={
              <Button size="sm" className="rounded-full" onClick={() => setSheet(true)}>
                Xuất hiện quanh đây
              </Button>
            }
          />
        </section>
      )}

      {/* Đáng chú ý lúc này */}
      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/tram" className="text-xs font-medium text-primary">
              Xem tất cả
            </Link>
          }
        >
          Đáng chú ý lúc này
        </SectionTitle>
        {on ? (
          <div className="space-y-3">
            {notable.map((p) => (
              <PresenceCard key={p.id} person={p} onPreview={setPreview} />
            ))}
          </div>
        ) : (
          <StateCard
            title="Chưa có ai đang chủ động xuất hiện quanh bạn"
            body="Fendee chỉ hiển thị người đang bật hiện diện. Bật của bạn hoặc rủ bạn bè cùng bật."
            actions={
              <>
                <Button size="sm" className="rounded-full" asChild>
                  <Link to="/gather/new">Tạo Gather</Link>
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full" asChild>
                  <Link to="/add-friend">Mời bạn bè</Link>
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full">
                  Thử lại sau
                </Button>
              </>
            }
          />
        )}
      </section>

      {/* Gather đang mở */}
      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/gather" className="text-xs font-medium text-primary">
              Tất cả
            </Link>
          }
        >
          Gather đang mở
        </SectionTitle>
        <div className="space-y-3">
          {presenceGathers.map((g) => (
            <GatherPresenceCard key={g.id} gather={g} />
          ))}
        </div>
      </section>

      <p className="mb-3 mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> Hiện diện luôn có thời hạn ·{" "}
        <Link to="/settings/privacy" className="font-medium text-primary underline">
          Quyền riêng tư
        </Link>
      </p>
      <div className="mb-2 flex justify-center">
        <Chip tone="outline">
          <Users className="h-3 w-3" /> Fendee không phải app hẹn hò
        </Chip>
      </div>

      <AppearSheet
        open={sheet}
        onOpenChange={setSheet}
        onConfirm={(m, d) => {
          setMode(m);
          setDuration(d);
        }}
      />
      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
