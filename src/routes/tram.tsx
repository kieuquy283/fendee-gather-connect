import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Filter, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Chip, TopBar } from "@/components/fendee/ui";
import { PresenceAva, PresenceCard, StateCard } from "@/components/fendee/presence";
import { QuickPreview } from "@/components/fendee/sheets";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  activityClusters,
  getPresence,
  presencePeople,
  station,
  stationFilters,
  type PresencePerson,
} from "@/lib/fendee-presence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tram")({
  head: () => ({
    meta: [
      { title: "Trạm hiện tại — Fendee" },
      {
        name: "description",
        content:
          "Xem ai đang hiện diện quanh trạm của bạn theo bạn bè, mức phù hợp, cùng địa điểm và cụm hoạt động — không bản đồ, không toạ độ chính xác.",
      },
      { property: "og:title", content: "Trạm hiện tại — Fendee" },
      { property: "og:description", content: "Ai đang quanh đây và vì sao đáng kết nối." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TramScreen,
});

function TramScreen() {
  const [preview, setPreview] = useState<PresencePerson | null>(null);
  const [filters, setFilters] = useState<string[]>(["Dưới 1 km"]);

  const toggle = (f: string) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const friends = presencePeople.filter((p) => p.isFriend);
  const here = presencePeople.filter((p) => p.sameStation);
  const forYou = presencePeople.filter((p) => p.presence !== "stale");

  return (
    <AppShell>
      <TopBar
        title="Trạm hiện tại"
        back="/home"
        subtitle={`${station.name} · ${station.publicLeft}`}
      />

      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="text-sm">
          {station.friends} bạn bè · {station.matches} người phù hợp · {station.gathers} Gather đang
          mở
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{station.updated}</p>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Bộ lọc
        </div>
        <div className="no-scrollbar -mx-5 flex flex-wrap gap-2 px-5">
          {stationFilters.map((f) => (
            <button key={f} type="button" onClick={() => toggle(f)}>
              <Chip
                tone={filters.includes(f) ? "accent" : "outline"}
                className={cn("px-3 py-1.5", filters.includes(f) && "ring-1 ring-primary")}
              >
                {f}
              </Chip>
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="foryou" className="mt-5">
        <TabsList className="w-full rounded-full">
          <TabsTrigger value="foryou" className="rounded-full text-xs">
            Dành cho bạn
          </TabsTrigger>
          <TabsTrigger value="friends" className="rounded-full text-xs">
            Bạn bè
          </TabsTrigger>
          <TabsTrigger value="here" className="rounded-full text-xs">
            Đang ở đây
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-full text-xs">
            Hoạt động
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foryou" className="mt-4 space-y-3">
          {forYou.map((p) => (
            <PresenceCard key={p.id} person={p} onPreview={setPreview} />
          ))}
          <StateCard
            title="Có 18 người đang Public quanh đây nhưng chưa tìm thấy nhiều điểm chung rõ ràng"
            body="Cập nhật sở thích và Give & Need để Fendee gợi ý đúng người hơn."
            actions={
              <>
                <Button size="sm" className="rounded-full">
                  Xem tất cả
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full" asChild>
                  <Link to="/setup-profile">Cập nhật sở thích</Link>
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" asChild>
                  <Link to="/profile">Cập nhật Give &amp; Need</Link>
                </Button>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="friends" className="mt-4 space-y-3">
          {friends.map((p) => (
            <PresenceCard key={p.id} person={p} onPreview={setPreview} />
          ))}
        </TabsContent>

        <TabsContent value="here" className="mt-4 space-y-3">
          {here.length ? (
            here.map((p) => <PresenceCard key={p.id} person={p} onPreview={setPreview} />)
          ) : (
            <StateCard
              title="Chưa có ai đang chủ động xuất hiện quanh bạn"
              body="Chưa ai bật hiện diện ở trạm này trong 15 phút qua."
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
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-3">
          {activityClusters.map((c) => (
            <article
              key={c.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  {c.id === "friends" ? (
                    <Users className="h-4.5 w-4.5" />
                  ) : (
                    <Sparkles className="h-4.5 w-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {c.count} {c.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.hint}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {c.ids.map((id) => {
                    const p = getPresence(id);
                    return p ? <PresenceAva key={id} person={p} size={30} /> : null;
                  })}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-auto rounded-full"
                  onClick={() => setPreview(getPresence(c.ids[0]!) ?? null)}
                >
                  Xem nhanh
                </Button>
              </div>
            </article>
          ))}
        </TabsContent>
      </Tabs>

      <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
        Fendee chỉ hiển thị khoảng cách tương đối và không bao giờ hiện bản đồ hay toạ độ.
      </p>

      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
