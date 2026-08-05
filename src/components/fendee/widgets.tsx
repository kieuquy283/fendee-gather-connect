import { Link } from "@tanstack/react-router";
import { MapPin, Plus, Users, Clock } from "lucide-react";
import logo from "@/assets/fendee-logo.png.asset.json";
import { gathers, getPerson, people } from "@/lib/fendee-data";
import { cn } from "@/lib/utils";

function WidgetFrame({
  size,
  children,
  className,
}: {
  size: "sm" | "md" | "lg";
  children: React.ReactNode;
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
  const g = gathers[0];
  const host = getPerson(g.hostId)!;
  return (
    <Link to="/gather/$id" params={{ id: g.id }} className="block">
      <WidgetFrame size="sm">
        <WidgetBrand label="Fendee" />
        <div className="mt-3 flex items-center gap-2">
          <img src={host.avatar} alt={host.name} className="h-8 w-8 rounded-full object-cover" />
          <p className="text-xs font-semibold">{host.name}</p>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug">{g.title}</p>
        <p className="mt-1 text-[11px] text-primary-foreground/70">
          {g.distance} · {g.startsIn}
        </p>
      </WidgetFrame>
    </Link>
  );
}

export function WidgetMedium() {
  const items = gathers.filter((g) => g.status === "live").slice(0, 2);
  return (
    <WidgetFrame size="md">
      <div className="flex items-center justify-between">
        <WidgetBrand label="Gather quanh bạn" />
        <Link
          to="/gather/new"
          className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold"
        >
          + Tạo
        </Link>
      </div>
      <div className="mt-2.5 space-y-2">
        {items.map((g) => {
          const host = getPerson(g.hostId)!;
          return (
            <Link
              key={g.id}
              to="/gather/$id"
              params={{ id: g.id }}
              className="flex items-center gap-2.5 rounded-2xl bg-white/8 px-2.5 py-2 backdrop-blur"
            >
              <img
                src={host.avatar}
                alt={host.name}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold">{g.title}</p>
                <p className="truncate text-[10px] text-primary-foreground/70">
                  {host.name} · {g.distance}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-primary-foreground/70">{g.duration}</span>
            </Link>
          );
        })}
      </div>
    </WidgetFrame>
  );
}

export function WidgetLarge() {
  const items = gathers.filter((g) => g.status === "live");
  const suggestion = people.find((p) => !p.isFriend)!;
  return (
    <WidgetFrame size="lg">
      <div className="flex items-center justify-between">
        <WidgetBrand label="Hôm nay quanh bạn" />
        <span className="text-[10px] text-primary-foreground/60">Cập nhật 2 phút trước</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((g) => {
          const host = getPerson(g.hostId)!;
          return (
            <Link
              key={g.id}
              to="/gather/$id"
              params={{ id: g.id }}
              className="flex items-center gap-2.5 rounded-2xl bg-white/8 px-3 py-2.5 backdrop-blur"
            >
              <img
                src={host.avatar}
                alt={host.name}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold">{g.title}</p>
                <p className="truncate text-[10.5px] text-primary-foreground/70">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {g.distance} · <Clock className="mx-1 inline h-3 w-3" />
                  {g.startsIn}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold">
                Tham gia
              </span>
            </Link>
          );
        })}
        <Link
          to="/profile/$id"
          params={{ id: suggestion.id }}
          className="flex items-center gap-2.5 rounded-2xl border border-white/12 px-3 py-2.5"
        >
          <img
            src={suggestion.avatar}
            alt={suggestion.name}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold">
              {suggestion.name} · hợp {suggestion.match}%
            </p>
            <p className="truncate text-[10.5px] text-primary-foreground/70">
              Có thể giúp: {suggestion.canHelp[0]}
            </p>
          </div>
        </Link>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          to="/gather/new"
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-2 text-[11px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo Gather
        </Link>
        <Link
          to="/nearby"
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/12 py-2 text-[11px] font-semibold backdrop-blur"
        >
          <Users className="h-3.5 w-3.5" /> Xem Nearby
        </Link>
      </div>
    </WidgetFrame>
  );
}
