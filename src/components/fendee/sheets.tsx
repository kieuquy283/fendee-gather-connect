import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Clock, Eye, Globe2, Lock, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Chip } from "./ui";
import { GiveNeed, PresenceAva, presenceLabel } from "./presence";
import { presenceDurations, type PresencePerson } from "@/lib/fendee-presence";
import { cn } from "@/lib/utils";

export type PresenceMode = "off" | "friends" | "public";

export function AppearSheet({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (mode: Exclude<PresenceMode, "off">, duration: string) => void;
}) {
  const [mode, setMode] = useState<Exclude<PresenceMode, "off"> | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  const options = [
    {
      key: "friends" as const,
      icon: Users,
      title: "Chỉ bạn bè",
      body: "Chỉ bạn bè thấy bạn đang hiện diện và khu vực tương đối.",
    },
    {
      key: "public" as const,
      icon: Globe2,
      title: "Công khai quanh đây",
      body: "Người phù hợp quanh địa điểm này có thể thấy bạn trong thời hạn đã chọn.",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        <SheetHeader className="px-0 pb-1 text-left">
          <SheetTitle>Xuất hiện quanh đây</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground">
          Fendee không tự bật vị trí. Bạn chọn ai thấy và trong bao lâu.
        </p>

        <div className="mt-4 space-y-2">
          {options.map((o) => {
            const active = mode === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setMode(o.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  active ? "border-primary bg-primary/8" : "border-border/70 bg-surface-2",
                )}
              >
                <o.icon className="mt-0.5 h-4.5 w-4.5 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{o.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{o.body}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <p className="mt-4 mb-2 text-xs font-semibold">Thời hạn hiện diện</p>
        <div className="flex flex-wrap gap-2">
          {presenceDurations.map((d) => (
            <button key={d} type="button" onClick={() => setDuration(d)}>
              <Chip
                tone={duration === d ? "accent" : "outline"}
                className={cn("px-3 py-1.5", duration === d && "ring-1 ring-primary")}
              >
                <Clock className="h-3 w-3" /> {d}
              </Chip>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-border/70 bg-surface-2 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Eye className="h-3.5 w-3.5 text-primary" /> Người khác sẽ thấy
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <li>· Tên, ảnh đại diện, trường/nghề</li>
            <li>· Trạng thái ngắn và Give &amp; Need của bạn</li>
            <li>· Khoảng cách tương đối (cùng địa điểm / dưới 1 km / 1–3 km)</li>
          </ul>
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" />
            Không hiển thị bản đồ, toạ độ hay khoảng cách chính xác. Hết thời hạn, hiện diện tự tắt.
          </p>
        </div>

        <Button
          className="mt-4 w-full rounded-full"
          disabled={!mode || !duration}
          onClick={() => {
            if (mode && duration) {
              onConfirm(mode, duration);
              onOpenChange(false);
            }
          }}
        >
          {mode && duration ? `Bật ${mode === "public" ? "Public" : "Chỉ bạn bè"} · ${duration}` : "Chọn chế độ và thời hạn"}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" /> Bạn có thể tắt bất cứ lúc nào
        </p>
      </SheetContent>
    </Sheet>
  );
}

export function QuickPreview({
  person,
  onOpenChange,
}: {
  person: PresencePerson | null;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={!!person} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        {person && (
          <>
            <SheetHeader className="px-0 text-left">
              <SheetTitle className="sr-only">Xem nhanh {person.name}</SheetTitle>
            </SheetHeader>
            <div className="-mt-2 flex items-start gap-3">
              <PresenceAva person={person} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.age} tuổi · {person.role}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {person.distance} · {person.publicLeft}
                </p>
              </div>
              <Chip tone="outline">{presenceLabel[person.presence]}</Chip>
            </div>

            <p className="mt-3 text-sm">{person.status}</p>
            <GiveNeed person={person} />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.reasons.map((r) => (
                <Chip key={r} tone="accent">
                  {r}
                </Chip>
              ))}
              <Chip tone="outline">{person.mutual} bạn chung</Chip>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1 rounded-full">Gửi lời giới thiệu</Button>
              <Button variant="secondary" className="flex-1 rounded-full" asChild>
                <Link to="/profile/$id" params={{ id: person.id }}>
                  Xem profile đầy đủ
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Lời giới thiệu luôn kèm tên thật của bạn — Fendee không cho tương tác vô danh.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
