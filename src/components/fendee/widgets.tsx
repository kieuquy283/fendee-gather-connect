import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Bell, Clock, Eye, MapPin, Plus, ShieldCheck, Signal, Users } from "lucide-react";
import logo from "@/assets/fendee-logo.png.asset.json";
import {
  getPresence,
  presenceGathers,
  presencePeople,
  station,
  type PresenceGather,
  type PresencePerson,
} from "@/lib/fendee-presence";
import { cn } from "@/lib/utils";

type WidgetPresenceMode = "off" | "friends" | "public";

function WidgetShell({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-[370px] overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-card">
      {children}
    </section>
  );
}

function WidgetHeader({ mode }: { mode: WidgetPresenceMode }) {
  const label =
    mode === "off" ? "Vị trí đang tắt" : mode === "friends" ? "Chỉ bạn bè" : "Public quanh đây";

  return (
    <header className="bg-brand-gradient p-4 text-primary-foreground">
      <div className="flex items-center gap-2">
        <img src={logo.url} alt="Fendee" className="h-8 w-8 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/70">
            Fendee Widget
          </p>
          <p className="truncate text-sm font-semibold">{label}</p>
        </div>
        <Link
          to="/notifications"
          aria-label="Thông báo"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/12"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white" />
        </Link>
      </div>
    </header>
  );
}

function ModeButton({
  mode,
  active,
  children,
  onClick,
}: {
  mode: WidgetPresenceMode;
  active: boolean;
  children: ReactNode;
  onClick: (mode: WidgetPresenceMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      className={cn(
        "h-8 flex-1 rounded-full px-2 text-[11px] font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function StationSummary({ mode }: { mode: WidgetPresenceMode }) {
  if (mode === "off") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-3.5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Signal className="h-4 w-4 text-primary" /> Chưa xuất hiện
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Bật hiện diện để xem bạn bè, Gather và tín hiệu phù hợp quanh bạn.
        </p>
      </div>
    );
  }

  return (
    <Link
      to="/tram"
      className="block rounded-2xl bg-brand-gradient p-3.5 text-primary-foreground shadow-glow"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/70">
        Trạm hiện tại
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{station.name}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-primary-foreground/75">
        <Clock className="h-3.5 w-3.5" />
        {mode === "public" ? station.publicLeft : "Chỉ bạn bè · còn 47 phút"}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { value: station.friends, label: "Bạn bè" },
          { value: station.matches, label: "Phù hợp" },
          { value: station.gathers, label: "Gather" },
        ].map((item) => (
          <span key={item.label} className="rounded-xl bg-white/10 px-2 py-1.5">
            <span className="block text-sm font-bold">{item.value}</span>
            <span className="block text-[9.5px] text-primary-foreground/65">{item.label}</span>
          </span>
        ))}
      </div>
    </Link>
  );
}

function NearbyStrip({ people, disabled }: { people: PresencePerson[]; disabled: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">Bạn bè gần đây</p>
        <Link to="/tram" className="text-[11px] font-medium text-primary">
          Mở Trạm
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {people.map((person) => (
          <Link
            key={person.id}
            to="/profile/$id"
            params={{ id: person.id }}
            className={cn(
              "w-[62px] shrink-0 text-center",
              disabled && "pointer-events-none opacity-45",
            )}
          >
            <span className="relative mx-auto block h-12 w-12">
              <img
                src={person.avatar}
                alt={person.name}
                className="h-full w-full rounded-full object-cover"
              />
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                  person.presence === "gather" && "bg-primary",
                  person.presence === "public" && "bg-online",
                  person.presence === "friends" && "bg-warn",
                  person.presence === "stale" && "bg-muted-foreground",
                )}
              />
            </span>
            <span className="mt-1 block truncate text-[10.5px] font-semibold">{person.name}</span>
            <span className="block truncate text-[9.5px] text-muted-foreground">
              {person.distance}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NotableCard({ person, disabled }: { person: PresencePerson; disabled: boolean }) {
  return (
    <Link
      to="/profile/$id"
      params={{ id: person.id }}
      className={cn(
        "block rounded-2xl border border-border/70 bg-surface-2 p-3.5",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <div className="flex items-center gap-3">
        <img
          src={person.avatar}
          alt={person.name}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {person.name} · {person.role}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" />
            {person.distance}
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[11.5px] leading-snug">{person.status}</p>
      <p className="mt-2 truncate text-[10.5px] text-muted-foreground">
        Có thể giúp: <span className="text-foreground">{person.canHelp}</span>
      </p>
    </Link>
  );
}

function GatherCard({ gather, disabled }: { gather: PresenceGather; disabled: boolean }) {
  const host = getPresence(gather.hostId)!;

  return (
    <Link
      to="/gather/$id"
      params={{ id: gather.id }}
      className={cn(
        "block rounded-2xl border border-border/70 bg-surface-2 p-3.5",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <div className="flex items-start gap-3">
        <img src={host.avatar} alt={host.name} className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{gather.activity}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            {host.name} · {gather.place}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-2 py-1 text-[9.5px] font-semibold text-accent-foreground">
          {gather.time}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
        {gather.note}
      </p>
    </Link>
  );
}

export function WidgetMiniInterface() {
  const [mode, setMode] = useState<WidgetPresenceMode>("friends");
  const active = mode !== "off";
  const friends = useMemo(() => presencePeople.filter((person) => person.isFriend).slice(0, 4), []);
  const notable = useMemo(
    () => presencePeople.find((person) => !person.isFriend && person.presence === "public")!,
    [],
  );
  const gather = presenceGathers[0]!;

  return (
    <WidgetShell>
      <WidgetHeader mode={mode} />
      <div className="space-y-4 p-4">
        <div className="flex gap-2 rounded-full bg-surface-2 p-1">
          <ModeButton mode="off" active={mode === "off"} onClick={setMode}>
            Tắt
          </ModeButton>
          <ModeButton mode="friends" active={mode === "friends"} onClick={setMode}>
            Bạn bè
          </ModeButton>
          <ModeButton mode="public" active={mode === "public"} onClick={setMode}>
            Public
          </ModeButton>
        </div>

        <StationSummary mode={mode} />
        <NearbyStrip people={friends} disabled={!active} />

        <div className="grid gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold">Đáng chú ý</p>
            <NotableCard person={notable} disabled={!active} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold">Gather đang mở</p>
            <GatherCard gather={gather} disabled={!active} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/gather/new"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Tạo Gather
          </Link>
          <Link
            to="/tram"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          >
            <Users className="h-3.5 w-3.5" /> Mở Trạm
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Không bản đồ, không tọa độ
          </span>
          <Link
            to="/settings/privacy"
            className="inline-flex items-center gap-1 font-medium text-primary"
          >
            <Eye className="h-3.5 w-3.5" />
            Riêng tư
          </Link>
        </div>
      </div>
    </WidgetShell>
  );
}

function WidgetFrame({
  size,
  children,
  className,
}: {
  size: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] bg-brand-gradient p-4 text-primary-foreground shadow-glow",
        size === "sm" && "aspect-square w-[158px]",
        size === "md" && "h-[158px] w-full",
        size === "lg" && "h-[338px] w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

function WidgetBrand({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/70">
      <img src={logo.url} alt="Fendee" className="h-4 w-4 rounded-[5px]" />
      {label}
    </div>
  );
}

export function WidgetSmall() {
  const g = presenceGathers[0]!;
  const host = getPresence(g.hostId)!;

  return (
    <Link to="/gather/$id" params={{ id: g.id }} className="block">
      <WidgetFrame size="sm">
        <WidgetBrand label="Đang gần bạn" />
        <div className="mt-3 flex items-center gap-2">
          <img src={host.avatar} alt={host.name} className="h-8 w-8 rounded-full object-cover" />
          <p className="text-xs font-semibold">{host.name} đang ở gần</p>
        </div>
        <p className="mt-2 text-[11px] text-primary-foreground/75">
          {g.place} · {g.time}
        </p>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-snug">"{g.note}"</p>
      </WidgetFrame>
    </Link>
  );
}

export function WidgetMedium() {
  const friends = presencePeople.filter((p) => p.isFriend).slice(0, 2);
  const matches = presencePeople.filter((p) => !p.isFriend).slice(0, 2);

  return (
    <WidgetFrame size="md">
      <div className="flex items-center justify-between">
        <WidgetBrand label={station.name} />
        <span className="text-[10px] text-primary-foreground/60">{station.updated}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {[
          { title: "Bạn bè", list: friends },
          { title: "Phù hợp", list: matches },
        ].map((block) => (
          <div key={block.title} className="rounded-2xl bg-white/8 p-2.5 backdrop-blur">
            <p className="text-[10px] uppercase tracking-widest text-primary-foreground/65">
              {block.title}
            </p>
            {block.list.map((p) => (
              <div key={p.id} className="mt-1.5 flex items-center gap-1.5">
                <img src={p.avatar} alt={p.name} className="h-5 w-5 rounded-full object-cover" />
                <span className="truncate text-[10.5px] font-medium">{p.name}</span>
                <span className="ml-auto shrink-0 text-[9.5px] text-primary-foreground/60">
                  {p.distance}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <Link
          to="/gather/new"
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-1.5 text-[11px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo Gather
        </Link>
        <Link
          to="/tram"
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/12 py-1.5 text-[11px] font-semibold backdrop-blur"
        >
          <Users className="h-3.5 w-3.5" /> Mở Trạm
        </Link>
      </div>
    </WidgetFrame>
  );
}

export function WidgetLarge() {
  const friends = presencePeople.filter((p) => p.isFriend).slice(0, 3);
  const notable = presencePeople.filter((p) => !p.isFriend)[0]!;

  return (
    <WidgetFrame size="lg">
      <div className="flex items-center justify-between">
        <WidgetBrand label="Fendee" />
        <span className="text-[10px] text-primary-foreground/60">{station.updated}</span>
      </div>

      <div className="mt-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/65">
          Trạng thái của tôi
        </p>
        <p className="mt-1 text-[12.5px] font-semibold">{station.name}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-primary-foreground/75">
          <Clock className="h-3 w-3" /> {station.publicLeft}
        </p>
      </div>

      <div className="mt-2.5 rounded-2xl bg-white/8 p-3 backdrop-blur">
        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/65">
          Bạn bè gần đây
        </p>
        <div className="mt-2 space-y-1.5">
          {friends.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <img src={p.avatar} alt={p.name} className="h-6 w-6 rounded-full object-cover" />
              <span className="truncate text-[11px] font-medium">{p.name}</span>
              <span className="truncate text-[10px] text-primary-foreground/65">· {p.short}</span>
              <span className="ml-auto shrink-0 text-[10px] text-primary-foreground/60">
                {p.distance}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 rounded-2xl border border-white/12 p-3">
        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/65">
          Đáng chú ý
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <img
            src={notable.avatar}
            alt={notable.name}
            className="h-7 w-7 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold">
              {notable.name} · {notable.role}
            </p>
            <p className="truncate text-[10px] text-primary-foreground/70">
              Có thể giúp: {notable.canHelp}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          to="/gather/new"
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-2 text-[11px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo Gather
        </Link>
        <Link
          to="/tram"
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/12 py-2 text-[11px] font-semibold backdrop-blur"
        >
          <Users className="h-3.5 w-3.5" /> Mở Trạm
        </Link>
      </div>
    </WidgetFrame>
  );
}

export function WidgetLock() {
  return (
    <div className="space-y-2 rounded-3xl bg-neutral-900 p-4">
      {[
        { icon: Bell, text: "Bạn có một lời mời Gather mới" },
        { icon: Users, text: "2 người bạn đang hoạt động gần bạn" },
      ].map((r) => (
        <div key={r.text} className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <r.icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[12px] font-medium text-white">{r.text}</span>
        </div>
      ))}
    </div>
  );
}
