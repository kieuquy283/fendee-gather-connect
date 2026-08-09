import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { usePresence } from "@/lib/presence-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tram")({
  head: () => ({
    meta: [
      { title: "Trạm - Fendee" },
      {
        name: "description",
        content: "Màn hình Trạm dùng trạng thái hiện diện tập trung và nhãn địa điểm gần đúng.",
      },
    ],
  }),
  component: TramScreen,
});

function TramScreen() {
  const presence = usePresence();
  const [preview, setPreview] = useState<PresencePerson | null>(null);
  const [filters, setFilters] = useState<string[]>(["Dưới 1 km"]);

  const toggle = (filter: string) =>
    setFilters((current) =>
      current.includes(filter) ? current.filter((value) => value !== filter) : [...current, filter],
    );

  const friends = presencePeople.filter((person) => person.isFriend);
  const here = presencePeople.filter((person) => person.sameStation);
  const forYou = presencePeople.filter((person) => person.presence !== "stale");

  return (
    <AppShell>
      <TopBar
        title="Trạm"
        back="/home"
        subtitle={
          presence.isPresenceEnabled
            ? `Nearby ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "ẩn"} - Bạn bè ${
                presence.friendLocationSnapshot?.zone.shortLabel ?? "chưa chia sẻ"
              }`
            : "Hiện diện đang tắt"
        }
      />

      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="text-sm">
          {station.friends} bạn bè - {station.matches} người phù hợp - {station.gathers} Gather đang
          mở
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Thiết bị: {presence.deviceLocation.zone.shortLabel} - snapshot bạn bè{" "}
          {presence.friendLocationSnapshot?.zone.shortLabel ?? "chưa có"}
        </p>
        {presence.isFriendSnapshotOutdated && (
          <p className="mt-2 rounded-2xl bg-warn/10 p-2 text-[11px] text-muted-foreground">
            Bạn bè vẫn đang thấy vị trí đã chia sẻ trước đó. Nearby luôn bám theo khu vực hiện tại.
          </p>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Bộ lọc
        </div>
        <div className="no-scrollbar -mx-5 flex flex-wrap gap-2 px-5">
          {stationFilters.map((filter) => (
            <button key={filter} type="button" onClick={() => toggle(filter)}>
              <Chip
                tone={filters.includes(filter) ? "accent" : "outline"}
                className={cn("px-3 py-1.5", filters.includes(filter) && "ring-1 ring-primary")}
              >
                {filter}
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
            Ở đây
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-full text-xs">
            Hoạt động
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foryou" className="mt-4 space-y-3">
          {forYou.map((person) => (
            <PresenceCard key={person.id} person={person} onPreview={setPreview} />
          ))}
          <StateCard
            title="Trạm chỉ dùng nhãn gần đúng"
            body="Màn hình này không hiển thị bản đồ, tọa độ hay theo dõi bạn bè theo thời gian thực."
            actions={
              <Button size="sm" variant="secondary" className="rounded-full" asChild>
                <Link to="/settings/privacy">Quyền riêng tư</Link>
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="friends" className="mt-4 space-y-3">
          {friends.map((person) => (
            <PresenceCard key={person.id} person={person} onPreview={setPreview} />
          ))}
        </TabsContent>

        <TabsContent value="here" className="mt-4 space-y-3">
          {here.length ? (
            here.map((person) => (
              <PresenceCard key={person.id} person={person} onPreview={setPreview} />
            ))
          ) : (
            <StateCard
              title="Chưa có ai hoạt động ở đây"
              body="Hiện chưa có người dùng mẫu nào xuất hiện trong Trạm này."
              actions={
                <Button size="sm" className="rounded-full" asChild>
                  <Link to="/gather/new">Tạo Gather</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-3">
          {activityClusters.map((cluster) => (
            <article
              key={cluster.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  {cluster.id === "friends" ? (
                    <Users className="h-4.5 w-4.5" />
                  ) : (
                    <Sparkles className="h-4.5 w-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {cluster.count} {cluster.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{cluster.hint}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {cluster.ids.map((id) => {
                    const person = getPresence(id);
                    return person ? <PresenceAva key={id} person={person} size={30} /> : null;
                  })}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-auto rounded-full"
                  onClick={() => setPreview(getPresence(cluster.ids[0]!) ?? null)}
                >
                  Xem nhanh
                </Button>
              </div>
            </article>
          ))}
        </TabsContent>
      </Tabs>

      <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
        Fendee chỉ hiển thị khoảng cách tương đối và nhãn địa điểm gần đúng.
      </p>

      <QuickPreview person={preview} onOpenChange={(open) => !open && setPreview(null)} />
    </AppShell>
  );
}
