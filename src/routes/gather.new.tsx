import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Chip, TopBar } from "@/components/fendee/ui";
import {
  GatherAudienceSelector,
  GatherCoHostSelector,
  GatherPrivacyPreview,
  GatherSelectionSummary,
} from "@/components/fendee/gather-v2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blankGatherSelection, useGatherStore } from "@/lib/gather-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gather/new")({
  head: () => ({
    meta: [
      { title: "Tạo Gather trong 15 giây - Fendee" },
      {
        name: "description",
        content: "Chọn co-host riêng với người được mời, chọn thời lượng và gửi lời mời Gather.",
      },
      { property: "og:title", content: "Tạo Gather - Fendee" },
      { property: "og:description", content: "Rủ bạn gặp mặt với co-host và invite riêng." },
    ],
  }),
  component: NewGather,
});

const durations = ["30 phút", "1 giờ", "2 giờ", "3 giờ"];

function expiryLabel(duration: string) {
  const minutes = duration.includes("30")
    ? 30
    : duration.includes("3")
      ? 180
      : duration.includes("2")
        ? 120
        : 60;
  return `đến ${new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function NewGather() {
  const navigate = useNavigate();
  const store = useGatherStore();
  const [step, setStep] = useState(0);
  const [cohosts, setCohosts] = useState(blankGatherSelection);
  const [invites, setInvites] = useState(blankGatherSelection);
  const [duration, setDuration] = useState("1 giờ");
  const [title, setTitle] = useState("Cà phê làm việc chung");
  const [note, setNote] = useState("Mình ngồi tầng 2, ai rảnh qua ngồi cho vui.");
  const [place, setPlace] = useState("The Coffee House Thái Hà");
  const [error, setError] = useState<string | null>(null);

  const steps = ["Nội dung", "Người", "Thời lượng", "Xem trước"];
  const cohostResolution = useMemo(() => store.resolveAudience(cohosts), [store, cohosts]);
  const inviteResolution = useMemo(() => store.resolveAudience(invites), [store, invites]);
  const canContinue =
    step === 0
      ? Boolean(title.trim() && place.trim())
      : step === 1
        ? inviteResolution.resolvedRecipientIds.length > 0
        : true;

  const publish = () => {
    setError(null);
    try {
      const id = store.createGather({
        title,
        note,
        place,
        duration,
        cohostSelection: cohosts,
        inviteSelection: invites,
      });
      navigate({ to: "/gather/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi Gather.");
    }
  };

  return (
    <AppShell>
      <TopBar title="Tạo Gather" subtitle={`Bước ${step + 1}/4 · ${steps[step]}`} back="/gather" />

      <div className="mb-5 flex gap-1.5">
        {steps.map((_, index) => (
          <span
            key={index}
            className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Bạn muốn rủ làm gì?</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Cà phê", "Đi bộ", "Ăn trưa", "Học chung", "Board game"].map((quickTitle) => (
              <button key={quickTitle} type="button" onClick={() => setTitle(quickTitle)}>
                <Chip tone="outline" className="px-3 py-1.5 text-xs">
                  {quickTitle}
                </Chip>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú ngắn</Label>
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-2xl"
            />
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-left"
          >
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">
              <span className="block text-sm font-medium">{place}</span>
              <span className="block text-[11px] text-muted-foreground">
                Địa điểm chỉ hiện đầy đủ trong app cho người được mời.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <Input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            className="h-11 rounded-2xl"
            aria-label="Địa điểm Gather"
          />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <GatherCoHostSelector
            friends={store.friends}
            groups={store.groups}
            value={cohosts}
            onChange={setCohosts}
          />
          <GatherAudienceSelector
            friends={store.friends}
            groups={store.groups}
            value={invites}
            onChange={setInvites}
          />
          <GatherSelectionSummary
            title="Tóm tắt co-host"
            selection={cohosts}
            groups={store.groups}
            friends={store.friends}
            resolvedCount={cohostResolution.resolvedRecipientIds.length}
          />
          <GatherSelectionSummary
            title="Tóm tắt người được mời"
            selection={invites}
            groups={store.groups}
            friends={store.friends}
            resolvedCount={inviteResolution.resolvedRecipientIds.length}
          />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <Label>Gather kéo dài bao lâu?</Label>
          <div className="grid grid-cols-2 gap-3">
            {durations.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDuration(item)}
                className={cn(
                  "rounded-2xl border p-4 text-center",
                  duration === item ? "border-primary bg-accent/40" : "border-border bg-card",
                )}
              >
                <Clock className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{item}</p>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium">Tự động hết hạn</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sau {duration}, Gather không nhận RSVP mới và không còn hiện là Gather đang mở.
            </p>
          </div>
        </section>
      )}

      {step === 3 && (
        <GatherPrivacyPreview
          title={title}
          note={note}
          place={place}
          duration={duration}
          expiryLabel={expiryLabel(duration)}
          cohostCount={cohostResolution.resolvedRecipientIds.length}
          inviteCount={inviteResolution.resolvedRecipientIds.length}
          cohostSummary={
            <GatherSelectionSummary
              title="Co-host invitations"
              selection={cohosts}
              groups={store.groups}
              friends={store.friends}
              resolvedCount={cohostResolution.resolvedRecipientIds.length}
            />
          }
          inviteSummary={
            <GatherSelectionSummary
              title="Gather invitations"
              selection={invites}
              groups={store.groups}
              friends={store.friends}
              resolvedCount={inviteResolution.resolvedRecipientIds.length}
            />
          }
        />
      )}

      {error && (
        <p className="mt-4 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">{error}</p>
      )}

      <div className="mb-4 mt-8 flex gap-3">
        {step > 0 && (
          <Button
            variant="secondary"
            size="lg"
            className="flex-1 rounded-full"
            onClick={() => setStep(step - 1)}
          >
            Quay lại
          </Button>
        )}
        {step < 3 ? (
          <Button
            size="lg"
            className="flex-1 rounded-full"
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
          >
            Tiếp tục
          </Button>
        ) : (
          <Button size="lg" className="flex-1 rounded-full" onClick={publish}>
            Gửi Gather
          </Button>
        )}
      </div>
    </AppShell>
  );
}
