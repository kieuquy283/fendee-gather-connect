import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Clock,
  EyeOff,
  MapPin,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  Users,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { NearbyMarkerSheet, NearbyRadar, type NearbyPick } from "@/components/fendee/nearby-radar";
import {
  GatherPresenceCard,
  PresenceCard,
  PresenceLegend,
  PresenceRail,
  StateCard,
} from "@/components/fendee/presence";
import {
  PresenceConfigSheet,
  QuickPreview,
  StopPresenceSheet,
  UpdateLocationSheet,
} from "@/components/fendee/sheets";
import { Ava, Chip, EmptyState, SectionTitle } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { me } from "@/lib/fendee-data";
import {
  getPresence,
  nearbyFar,
  nearbyMarkers,
  presenceGathers,
  presencePeople,
  station,
  type PresencePerson,
} from "@/lib/fendee-presence";
import { getNearbyPeopleFn } from "@/lib/presence.functions";
import { usePresence } from "@/lib/presence-store";
import { usePrivacy } from "@/lib/privacy-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Fendee - Presence and current area" },
      {
        name: "description",
        content:
          "Presence uses separate Nearby stranger visibility and friend shared-location snapshots.",
      },
    ],
  }),
  component: HomeFeed,
});

function HomeFeed() {
  const presence = usePresence();
  const privacy = usePrivacy();
  const [configOpen, setConfigOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [preview, setPreview] = useState<PresencePerson | null>(null);
  const [pick, setPick] = useState<NearbyPick | null>(null);
  const [serverMarkers, setServerMarkers] = useState(nearbyMarkers);

  const friends = presencePeople.filter((p) => p.isFriend);
  const notable = presencePeople.filter((p) => !p.isFriend || p.presence === "public").slice(0, 3);
  const farPeople = nearbyFar
    .map(getPresence)
    .filter((person): person is PresencePerson =>
      Boolean(person && !privacy.blockedUserIds.includes(person.id)),
    );
  const sessionStatus = presence.presenceSession?.status ?? "off";
  const on = presence.isPresenceEnabled;
  const activeNearby = on && Boolean(presence.nearbyPresenceLocation);
  const indicator = !on
    ? "Vị trí đang tắt"
    : sessionStatus === "moving"
      ? "Đang di chuyển, Nearby tạm ẩn"
      : sessionStatus === "offline"
        ? "Mất quyền vị trí"
        : `Nearby ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "đang ẩn"} · bạn bè thấy ${
            presence.friendLocationSnapshot?.zone.shortLabel ?? "chưa chia sẻ"
          }`;

  useEffect(() => {
    let cancelled = false;

    if (!activeNearby) {
      setServerMarkers([]);
      return;
    }

    void getNearbyPeopleFn().then((markers) => {
      if (!cancelled) {
        setServerMarkers(
          markers.map((marker) => ({
            id: marker.userId,
            x: marker.x,
            y: marker.y,
            meters: marker.meters,
            place: marker.place,
          })),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeNearby, presence.nearbyPresenceLocation?.zone.id, presence.presenceSession?.id]);

  const visibleMarkers = useMemo(() => {
    if (!activeNearby) return [];
    return serverMarkers.filter((marker) => !privacy.blockedUserIds.includes(marker.id));
  }, [activeNearby, privacy.blockedUserIds, serverMarkers]);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 -mx-5 mb-4 bg-background/85 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Ava src={me.avatar} alt={me.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Chào bạn</p>
            <p className="truncate text-base font-semibold">{me.name}</p>
          </div>
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            aria-label="Thông báo"
          >
            <Bell className="h-4.5 w-4.5" />
            {presence.presenceSession?.notificationSent && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => (on ? setStopOpen(true) : setConfigOpen(true))}
          className={cn(
            "mt-2.5 flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium",
            !on && "bg-secondary text-muted-foreground",
            on && sessionStatus !== "moving" && "bg-online/12 text-online",
            sessionStatus === "moving" && "bg-warn/15 text-warn-foreground",
          )}
        >
          <Signal className="h-3.5 w-3.5" />
          {indicator}
          <span className="ml-auto opacity-70">{on ? "Quản lý" : "Bật"}</span>
        </button>
      </header>

      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <Ava src={me.avatar} alt={me.name} size={40} />
          <Link
            to="/profile"
            className="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted-foreground"
          >
            Cập nhật ghi chú, Give và Need
          </Link>
        </div>

        <button
          type="button"
          onClick={() => (on ? setUpdateOpen(true) : setConfigOpen(true))}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-xs font-semibold">Điểm chia sẻ với bạn bè</span>
              <span className="block text-[11px] text-muted-foreground">
                {on
                  ? `${presence.friendLocationSnapshot?.zone.shortLabel ?? "chưa chia sẻ"} · ${
                      presence.audienceLabel
                    }`
                  : "Đang tắt · chưa có vị trí chia sẻ"}
              </span>
            </span>
          </span>
          <Chip tone={on ? "success" : "outline"}>{on ? "Đang bật" : "Đang tắt"}</Chip>
        </button>

        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1 rounded-full" asChild>
            <Link to="/gather/new">
              <Plus className="h-4 w-4" /> Tạo Gather
            </Link>
          </Button>
          <Button size="sm" variant="secondary" className="flex-1 rounded-full" asChild>
            <Link to="/profile">
              <Pencil className="h-4 w-4" /> Sửa ghi chú
            </Link>
          </Button>
        </div>
      </section>

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

      <section className="mt-6">
        <SectionTitle>Trạng thái hiện diện</SectionTitle>
        {on ? (
          <div className="rounded-3xl bg-brand-gradient p-4 text-primary-foreground shadow-glow">
            <p className="text-[11px] uppercase tracking-widest text-primary-foreground/70">
              Khu vực thiết bị
            </p>
            <p className="mt-1 text-lg font-semibold">{presence.deviceLocation.zone.label}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-primary-foreground/80">
              <Clock className="h-3.5 w-3.5" />
              Sai số ~{presence.deviceLocation.accuracyMeters}m · ở lại{" "}
              {Math.round(presence.deviceLocation.dwellMs / 1000)}s
            </p>
            <p className="mt-3 text-sm">
              Nearby bám theo khu vực ổn định hiện tại. Bạn bè chỉ thấy điểm bạn chủ động chia sẻ.
            </p>
          </div>
        ) : (
          <StateCard
            title="Vị trí đang tắt"
            body="Bật hiện diện để chia sẻ một điểm hẹn cho bạn bè và xuất hiện trong Nearby của khu vực hiện tại."
            actions={
              <Button size="sm" className="rounded-full" onClick={() => setConfigOpen(true)}>
                Bật hiện diện
              </Button>
            }
          />
        )}

        {on && sessionStatus === "moving" && (
          <div className="mt-3">
            <StateCard
              tone="warn"
              title="Đang di chuyển"
              body="Nearby tạm ẩn bạn khi khu vực chưa ổn định. Bạn bè vẫn thấy điểm bạn đã chủ động chia sẻ trước đó."
              actions={
                <>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => presence.handleZoneTransition("area-b")}
                  >
                    Chuyển sang khu vực B
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setStopOpen(true)}
                  >
                    Tắt hiện diện
                  </Button>
                </>
              }
            />
          </div>
        )}

        {on && presence.isFriendSnapshotOutdated && (
          <div className="mt-3">
            <StateCard
              tone="warn"
              title="Bạn đang ở khu vực mới"
              body="Người ở gần có thể thấy bạn tại đây. Bạn bè vẫn đang thấy vị trí chia sẻ trước đó."
              actions={
                <>
                  <Button size="sm" className="rounded-full" onClick={() => setUpdateOpen(true)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Cập nhật cho bạn bè
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setStopOpen(true)}
                  >
                    Tắt hiện diện
                  </Button>
                </>
              }
            />
          </div>
        )}

        {on && !presence.isFriendSnapshotOutdated && sessionStatus === "active" && (
          <div className="mt-3">
            <StateCard
              title="Hiện diện đang hoạt động"
              body={`Nearby: ${
                presence.nearbyPresenceLocation?.zone.shortLabel ?? "đang ẩn"
              }. Bạn bè thấy: ${presence.friendLocationSnapshot?.zone.shortLabel ?? "chưa chia sẻ"}.`}
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setStopOpen(true)}
                >
                  Tắt hiện diện
                </Button>
              }
            />
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/nearby/filters" className="text-xs font-medium text-primary">
              Filters
            </Link>
          }
        >
          Nearby
        </SectionTitle>

        {presence.permission === "lost" ? (
          <StateCard
            tone="warn"
            title="Mất quyền vị trí"
            body="Nearby đã ẩn bạn và phiên hiện diện tạm ngoại tuyến cho đến khi quyền vị trí quay lại."
            actions={
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => presence.simulatePermission("granted")}
              >
                Khôi phục quyền
              </Button>
            }
          />
        ) : !activeNearby ? (
          <EmptyState
            icon={<EyeOff className="h-6 w-6" />}
            title="Nearby đang tắt"
            body="Bật hiện diện để xuất hiện trong khung Nearby ngay tại Home."
            action={
              <Button className="rounded-full" onClick={() => setConfigOpen(true)}>
                Bật Nearby
              </Button>
            }
          />
        ) : (
          <>
            <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Radio className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Khung Nearby · 100m</p>
                    <p className="text-xs text-muted-foreground">
                      Vị trí tương đối, không bản đồ, không toạ độ.
                    </p>
                  </div>
                </div>
                <Chip tone="success">
                  {presence.nearbyPresenceLocation?.zone.shortLabel ?? "Nearby"}
                </Chip>
              </div>
              <NearbyRadar markers={visibleMarkers} onPick={setPick} />
              <PresenceLegend />
            </div>

            {sessionStatus === "offline" && (
              <div className="mt-3">
                <StateCard
                  tone="warn"
                  title="Thiết bị đang ngoại tuyến"
                  body="Không lấy được vị trí thiết bị. Nearby tạm ẩn cho đến khi kết nối quay lại."
                  actions={
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => presence.setOffline(false)}
                    >
                      Kết nối lại
                    </Button>
                  }
                />
              </div>
            )}

            {visibleMarkers.length === 0 && (
              <div className="mt-3">
                <StateCard
                  title="Chưa có ai trong Nearby"
                  body="Hiện diện của bạn đang bật, nhưng chưa có người dùng mô phỏng nào ở trong phạm vi gần."
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => presence.handleZoneTransition("area-a")}
                    >
                      Quay lại khu vực A
                    </Button>
                  }
                />
              </div>
            )}

            <div className="mt-4">
              <SectionTitle>Bạn bè ngoài phạm vi Nearby</SectionTitle>
              <PresenceRail people={farPeople} onPick={setPreview} />
            </div>
          </>
        )}
      </section>

      {on && (
        <section className="mt-4 rounded-3xl border border-dashed border-border bg-surface/60 p-4">
          <p className="text-sm font-semibold">Công cụ mô phỏng bản demo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Giữ lại để QA luồng local trước khi có backend và hạ tầng vị trí thật.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                presence.handleDevicePosition({
                  zoneId: "area-a",
                  accuracyMeters: 28,
                  dwellMs: 20000,
                })
              }
            >
              Giả lập di chuyển
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => presence.handleZoneTransition("area-b")}
            >
              Sang khu vực B
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => presence.setOffline(true)}
            >
              <WifiOff className="h-4 w-4" /> Ngoại tuyến
            </Button>
          </div>
        </section>
      )}

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
            title="Chưa có phiên hiện diện"
            body="Fendee chỉ gợi ý người phù hợp sau khi bạn chủ động bật hiện diện."
            actions={
              <>
                <Button size="sm" className="rounded-full" onClick={() => setConfigOpen(true)}>
                  Bật hiện diện
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full" asChild>
                  <Link to="/gather/new">Tạo Gather</Link>
                </Button>
              </>
            }
          />
        )}
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/gather" className="text-xs font-medium text-primary">
              All
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
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> Không hiển thị tọa độ chính
        xác.
      </p>
      <div className="mb-2 flex justify-center">
        <Chip tone="outline">
          <Users className="h-3 w-3" /> {station.friends} friends in prototype data
        </Chip>
      </div>

      <PresenceConfigSheet
        open={configOpen}
        onOpenChange={setConfigOpen}
        busy={presence.actionState.start.status === "loading"}
        error={presence.actionState.start.error}
        onConfirm={(audience) => presence.startPresence({ audience })}
      />
      <UpdateLocationSheet
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        previous={presence.friendLocationSnapshot?.zone ?? null}
        next={presence.deviceLocation.zone}
        audienceCount={presence.audienceCount}
        busy={presence.actionState.updateFriendLocation.status === "loading"}
        error={presence.actionState.updateFriendLocation.error}
        onConfirm={(notifyAgain) => presence.updateFriendLocation({ notifyAgain })}
      />
      <StopPresenceSheet
        open={stopOpen}
        onOpenChange={setStopOpen}
        busy={presence.actionState.stop.status === "loading"}
        error={presence.actionState.stop.error}
        onConfirm={presence.stopPresence}
      />
      <NearbyMarkerSheet pick={pick} onOpenChange={(v) => !v && setPick(null)} />
      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
