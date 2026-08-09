import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Clock, Eye, Globe2, Lock, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Chip } from "./ui";
import { GiveNeed, PresenceAva, presenceLabel } from "./presence";
import { presenceDurations, type PresencePerson } from "@/lib/fendee-presence";
import type { AudienceMode, FriendAudience, PresenceZone } from "@/lib/presence-store";
import { cn } from "@/lib/utils";

export type PresenceMode = "off" | "friends" | "public";

const audienceOptions = [
  {
    key: "all_friends" as const,
    icon: Users,
    title: "Tất cả bạn bè",
    body: "Mọi bạn bè đều thấy snapshot vị trí đã chia sẻ.",
  },
  {
    key: "groups" as const,
    icon: UserCheck,
    title: "Nhóm bạn",
    body: "Dùng nhóm bạn thân và nhóm tin cậy cho lần chia sẻ này.",
  },
  {
    key: "selected" as const,
    icon: Check,
    title: "Bạn bè đã chọn",
    body: "Chỉ chia sẻ snapshot với những người bạn chọn.",
  },
];

function audienceFromMode(mode: AudienceMode): FriendAudience {
  if (mode === "groups") {
    return { mode, groupIds: ["close-friends"], friendIds: [] };
  }
  if (mode === "selected") {
    return { mode, groupIds: [], friendIds: ["hailang", "minhtu", "tuananh"] };
  }
  return { mode, groupIds: [], friendIds: [] };
}

export function PresenceConfigSheet({
  open,
  onOpenChange,
  onConfirm,
  busy = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (audience: FriendAudience) => Promise<boolean> | boolean;
  busy?: boolean;
  error?: string | null;
}) {
  const [mode, setMode] = useState<AudienceMode>("all_friends");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        <SheetHeader className="px-0 pb-1 text-left">
          <SheetTitle>Bật hiện diện</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground">
          Chọn những người bạn nhận snapshot vị trí. Khi hiện diện đang bật, người ở gần cũng có thể
          thấy bạn trong Nearby.
        </p>

        <div className="mt-4 space-y-2">
          {audienceOptions.map((option) => {
            const active = mode === option.key;
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setMode(option.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  active ? "border-primary bg-primary/8" : "border-border/70 bg-surface-2",
                )}
              >
                <Icon className="mt-0.5 h-4.5 w-4.5 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.body}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-border/70 bg-surface-2 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Hai lớp chia sẻ vị trí riêng biệt
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Nearby bám theo khu vực hiện tại khi đang bật. Bạn bè chỉ nhận snapshot mới khi bạn bấm
            Cập nhật vị trí.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            {error}
          </p>
        )}

        <Button
          className="mt-4 w-full rounded-full"
          disabled={busy}
          onClick={async () => {
            const didStart = await onConfirm(audienceFromMode(mode));
            if (didStart) onOpenChange(false);
          }}
        >
          {busy ? "Đang bật..." : "Xác nhận và bật hiện diện"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

export function UpdateLocationSheet({
  open,
  onOpenChange,
  previous,
  next,
  audienceCount,
  onConfirm,
  busy = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  previous: PresenceZone | null;
  next: PresenceZone;
  audienceCount: number;
  onConfirm: (notifyAgain: boolean) => Promise<boolean> | boolean;
  busy?: boolean;
  error?: string | null;
}) {
  const [notifyAgain, setNotifyAgain] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        <SheetHeader className="px-0 pb-1 text-left">
          <SheetTitle>Cập nhật vị trí đã chia sẻ?</SheetTitle>
        </SheetHeader>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-border/70 bg-surface-2 p-3">
            <p className="font-semibold">Trước đó</p>
            <p className="mt-1 text-muted-foreground">
              {previous?.shortLabel ?? "Chưa có snapshot"}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/35 bg-accent/40 p-3">
            <p className="font-semibold">Mới</p>
            <p className="mt-1 text-muted-foreground">{next.shortLabel}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {audienceCount} bạn bè sẽ nhận vị trí chia sẻ đã cập nhật.
        </p>
        <label className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 p-3 text-xs">
          <input
            type="checkbox"
            checked={notifyAgain}
            onChange={(event) => setNotifyAgain(event.target.checked)}
          />
          Gửi thông báo lại cho bạn bè
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            {error}
          </p>
        )}
        <Button
          className="mt-4 w-full rounded-full"
          disabled={busy}
          onClick={async () => {
            const didUpdate = await onConfirm(notifyAgain);
            if (didUpdate) onOpenChange(false);
          }}
        >
          {busy ? "Đang cập nhật..." : "Cập nhật vị trí cho bạn bè"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

export function StopPresenceSheet({
  open,
  onOpenChange,
  onConfirm,
  busy = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => Promise<boolean> | boolean;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        <SheetHeader className="px-0 pb-1 text-left">
          <SheetTitle>Tắt hiện diện?</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground">
          Hành động này sẽ lập tức gỡ bạn khỏi Nearby, kết thúc phiên chia sẻ cho bạn bè và xóa các
          chỉ báo vị trí đang hoạt động.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Giữ nguyên
          </Button>
          <Button
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={async () => {
              const didStop = await onConfirm();
              if (didStop) onOpenChange(false);
            }}
          >
            {busy ? "Đang tắt..." : "Tắt hiện diện"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
          {options.map((option) => {
            const active = mode === option.key;
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setMode(option.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  active ? "border-primary bg-primary/8" : "border-border/70 bg-surface-2",
                )}
              >
                <Icon className="mt-0.5 h-4.5 w-4.5 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.body}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold">Thời hạn hiện diện</p>
        <div className="flex flex-wrap gap-2">
          {presenceDurations.map((durationOption) => (
            <button key={durationOption} type="button" onClick={() => setDuration(durationOption)}>
              <Chip
                tone={duration === durationOption ? "accent" : "outline"}
                className={cn("px-3 py-1.5", duration === durationOption && "ring-1 ring-primary")}
              >
                <Clock className="h-3 w-3" /> {durationOption}
              </Chip>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-border/70 bg-surface-2 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Eye className="h-3.5 w-3.5 text-primary" /> Người khác sẽ thấy
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <li>• Tên, ảnh đại diện, trường/nghề</li>
            <li>• Trạng thái ngắn và Give &amp; Need của bạn</li>
            <li>• Khoảng cách tương đối (cùng địa điểm / dưới 1 km / 1-3 km)</li>
          </ul>
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" />
            Không hiển thị bản đồ, tọa độ hay khoảng cách chính xác. Hết thời hạn, hiện diện tự tắt.
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
          {mode && duration
            ? `Bật ${mode === "public" ? "Công khai" : "Chỉ bạn bè"} · ${duration}`
            : "Chọn chế độ và thời hạn"}
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
              {person.reasons.map((reason) => (
                <Chip key={reason} tone="accent">
                  {reason}
                </Chip>
              ))}
              <Chip tone="outline">{person.mutual} bạn chung</Chip>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1 rounded-full">Gửi lời giới thiệu</Button>
              <Button variant="secondary" className="flex-1 rounded-full" asChild>
                <Link to="/profile/$id" params={{ id: person.id }}>
                  Xem hồ sơ đầy đủ
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Lời giới thiệu luôn kèm tên thật của bạn - Fendee không cho tương tác vô danh.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
