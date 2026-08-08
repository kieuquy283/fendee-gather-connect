import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EyeOff, MapPin, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { EmptyState, SectionTitle, TopBar } from "@/components/fendee/ui";
import { PresenceCard, PresenceLegend, PresenceRail } from "@/components/fendee/presence";
import { NearbyRadar, NearbyMarkerSheet, type NearbyPick } from "@/components/fendee/nearby-radar";
import { QuickPreview } from "@/components/fendee/sheets";
import { getPresence, nearbyFar, nearbyMarkers, type PresencePerson } from "@/lib/fendee-presence";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/nearby/")({
  head: () => ({
    meta: [
      { title: "Nearby — Người đang ở quanh bạn trong 100m | Fendee" },
      {
        name: "description",
        content:
          "Khung Nearby của Fendee hiển thị vị trí tương đối của người quanh bạn trong bán kính 100m — không bản đồ, không toạ độ, chỉ khoảng cách ước lượng.",
      },
      { property: "og:title", content: "Nearby trên Fendee" },
      {
        property: "og:description",
        content: "Khung hiển thị vị trí tương đối trong 100m, không phải bản đồ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Nearby,
});

function Nearby() {
  const [enabled, setEnabled] = useState(true);
  const [pick, setPick] = useState<NearbyPick | null>(null);
  const [preview, setPreview] = useState<PresencePerson | null>(null);

  const farPeople = nearbyFar.map(getPresence).filter(Boolean) as PresencePerson[];

  return (
    <AppShell>
      <TopBar
        title="Nearby"
        subtitle="Vị trí tương đối · không bản đồ"
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

      {!enabled ? (
        <div className="mt-4 space-y-3">
          <EmptyState
            icon={<EyeOff className="h-6 w-6" />}
            title="Nearby đang tắt"
            body="Khi tắt, không ai thấy bạn trong khung quanh đây và bạn cũng không thấy người khác. Bật lên để khám phá — tắt lại bất cứ lúc nào."
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
        </div>
      ) : (
        <>
          <section className="mt-4">
            <SectionTitle>Quanh bạn · 100m</SectionTitle>
            {nearbyMarkers.length ? (
              <>
                <NearbyRadar markers={nearbyMarkers} onPick={setPick} />
                <PresenceLegend />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Vị trí trong khung chỉ mang tính tương đối để bạn hình dung ai đang gần hơn.
                </p>
              </>
            ) : (
              <EmptyState
                icon={<MapPin className="h-6 w-6" />}
                title="Chưa có ai trong 100m"
                body="Chưa ai bật hiện diện quanh đây. Bạn có thể tạo Gather để rủ bạn bè tới."
                action={
                  <Button className="rounded-full" asChild>
                    <Link to="/gather/new">Tạo Gather</Link>
                  </Button>
                }
              />
            )}
          </section>

          <section className="mt-6">
            <SectionTitle>Bạn bè ở xa hơn</SectionTitle>
            <PresenceRail people={farPeople} onPick={setPreview} />
            <div className="mt-3 space-y-3">
              {farPeople.map((p) => (
                <PresenceCard key={p.id} person={p} onPreview={setPreview} />
              ))}
            </div>
          </section>

          <p className="mb-4 mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Người lạ chỉ thấy khoảng cách ước lượng, không thấy toạ độ hay địa chỉ của bạn.
          </p>
        </>
      )}

      <NearbyMarkerSheet pick={pick} onOpenChange={(v) => !v && setPick(null)} />
      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
