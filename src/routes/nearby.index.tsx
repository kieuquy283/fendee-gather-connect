import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EyeOff, MapPin, Radio, ShieldCheck, SlidersHorizontal, WifiOff } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { EmptyState, SectionTitle, TopBar } from "@/components/fendee/ui";
import {
  PresenceCard,
  PresenceLegend,
  PresenceRail,
  StateCard,
} from "@/components/fendee/presence";
import { NearbyRadar, NearbyMarkerSheet, type NearbyPick } from "@/components/fendee/nearby-radar";
import {
  PresenceConfigSheet,
  QuickPreview,
  StopPresenceSheet,
  UpdateLocationSheet,
} from "@/components/fendee/sheets";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getPresence, nearbyFar, nearbyMarkers, type PresencePerson } from "@/lib/fendee-presence";
import { getNearbyPeopleFn } from "@/lib/presence.functions";
import { usePresence } from "@/lib/presence-store";
import { usePrivacy } from "@/lib/privacy-store";

export const Route = createFileRoute("/nearby/")({
  head: () => ({
    meta: [
      { title: "Nearby - Relative presence | Fendee" },
      {
        name: "description",
        content:
          "Nearby is a relative 100m presence frame, not a map. Friend location remains snapshot-based.",
      },
    ],
  }),
  component: Nearby,
});

function Nearby() {
  const presence = usePresence();
  const privacy = usePrivacy();
  const [configOpen, setConfigOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [pick, setPick] = useState<NearbyPick | null>(null);
  const [preview, setPreview] = useState<PresencePerson | null>(null);
  const [serverMarkers, setServerMarkers] = useState(nearbyMarkers);

  const farPeople = nearbyFar
    .map(getPresence)
    .filter((person): person is PresencePerson =>
      Boolean(person && !privacy.blockedUserIds.includes(person.id)),
    );
  const status = presence.presenceSession?.status ?? "off";
  const activeNearby = presence.isPresenceEnabled && Boolean(presence.nearbyPresenceLocation);

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
      <TopBar
        title="Nearby"
        subtitle="Relative position - no map, no coordinates"
        right={
          <Link
            to="/nearby/filters"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Link>
        }
      />

      <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Radio className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Phiên hiện diện</p>
            <p className="text-xs text-muted-foreground">
              {presence.isPresenceEnabled
                ? status === "starting"
                  ? "Đang bật hiện diện"
                  : `Nearby ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "đang ẩn"}`
                : status === "expired"
                  ? "Đã hết hạn"
                  : "Đang tắt vị trí"}
            </p>
          </div>
        </div>
        <Switch
          checked={presence.isPresenceEnabled}
          onCheckedChange={(checked) => (checked ? setConfigOpen(true) : setStopOpen(true))}
        />
      </div>

      {presence.permission === "denied" && (
        <div className="mt-3">
          <StateCard
            tone="warn"
            title="Cần quyền vị trí"
            body="Nearby cần quyền vị trí để bật hiện diện. Bản demo local vẫn giữ cơ chế mô phỏng cho QA."
            actions={
              <Button size="sm" className="rounded-full" onClick={() => setConfigOpen(true)}>
                Xem cách chia sẻ
              </Button>
            }
          />
        </div>
      )}

      {presence.permission === "lost" && (
        <div className="mt-3">
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
        </div>
      )}

      {!presence.isPresenceEnabled || presence.permission === "lost" ? (
        <div className="mt-4 space-y-3">
          <EmptyState
            icon={<EyeOff className="h-6 w-6" />}
            title={status === "expired" ? "Phiên hiện diện đã hết hạn" : "Vị trí đang tắt"}
            body="Nearby và vị trí chia sẻ cho bạn bè đều đang tắt. Bạn chỉ xuất hiện khi chủ động bật."
            action={
              <Button className="rounded-full" onClick={() => setConfigOpen(true)}>
                Bật hiện diện
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section className="mt-4">
            <SectionTitle>Khung Nearby · 100m</SectionTitle>
            <NearbyRadar markers={visibleMarkers} onPick={setPick} />
            <PresenceLegend />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Đây là khung không gian tương đối để hiểu ai đang ở gần. Không có bản đồ, tuyến đường,
              tọa độ hay chỉ đường.
            </p>
          </section>

          {status === "starting" && (
            <div className="mt-3">
              <StateCard
                title="Đang bật hiện diện"
                body="Đang xin quyền vị trí, tạo điểm chia sẻ cho bạn bè và xuất hiện trong Nearby."
                actions={
                  <Button size="sm" variant="secondary" className="rounded-full" disabled>
                    Đang xử lý...
                  </Button>
                }
              />
            </div>
          )}

          {status === "moving" && (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Đang di chuyển"
                body="Bạn đã rời khu vực Nearby trước đó. Người lạ sẽ chưa thấy bạn cho đến khi khu vực mới ổn định."
                actions={
                  <>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => presence.handleZoneTransition("area-b")}
                    >
                      Khu vực B đã ổn định
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

          {status === "offline" && (
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

          {presence.isFriendSnapshotOutdated && (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Điểm chia sẻ cho bạn bè đã cũ"
                body="Người ở gần đang thấy bạn tại đây, nhưng bạn bè vẫn đang thấy vị trí chia sẻ trước đó."
                actions={
                  <Button size="sm" className="rounded-full" onClick={() => setUpdateOpen(true)}>
                    Cập nhật cho bạn bè
                  </Button>
                }
              />
            </div>
          )}

          {visibleMarkers.length === 0 && activeNearby && (
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

          <section className="mt-6">
            <SectionTitle>Bạn bè ngoài phạm vi Nearby</SectionTitle>
            <PresenceRail people={farPeople} onPick={setPreview} />
            <div className="mt-3 space-y-3">
              {farPeople.map((p) => (
                <PresenceCard key={p.id} person={p} onPreview={setPreview} />
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-dashed border-border bg-surface/60 p-4">
            <p className="text-sm font-semibold">Công cụ mô phỏng Nearby</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dùng cho QA local trước backend và hạ tầng vị trí thật. Không phải thao tác sản phẩm
              chính.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() =>
                  presence.handleDevicePosition({
                    zoneId: "area-a",
                    accuracyMeters: 24,
                    dwellMs: 12000,
                  })
                }
              >
                Rời khu A
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => presence.handleZoneTransition("area-b")}
              >
                Ổn định ở khu B
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() =>
                  presence.handleDevicePosition({
                    zoneId: "area-b",
                    accuracyMeters: 140,
                    dwellMs: 160000,
                  })
                }
              >
                GPS kém chính xác
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => presence.setOffline(true)}
              >
                <WifiOff className="h-4 w-4" /> Ngoại tuyến
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() =>
                  presence.handleDevicePosition({
                    zoneId: "area-c",
                    accuracyMeters: 24,
                    dwellMs: 160000,
                  })
                }
              >
                Không có ai gần
              </Button>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => presence.expirePresence()}
              >
                Hết hạn phiên
              </Button>
            </div>
          </section>

          <p className="mb-4 mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Người lạ chỉ thấy khoảng cách làm tròn và vị trí tương đối.
          </p>
        </>
      )}

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
