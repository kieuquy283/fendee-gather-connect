import { Link } from "@tanstack/react-router";
import { Bell, Clock, Plus, Users } from "lucide-react";
import logo from "@/assets/fendee-logo.png.asset.json";
import { getPresence, presenceGathers, presencePeople, station } from "@/lib/fendee-presence";
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

/** Small: chỉ một tín hiệu quan trọng nhất. */
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
        <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-snug">“{g.note}”</p>
      </WidgetFrame>
    </Link>
  );
}

/** Medium: hai khối Bạn bè / Phù hợp + CTA. */
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

/** Large: Trạng thái của tôi · Bạn bè gần đây · Đáng chú ý. */
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

/** Lock screen: chỉ nội dung chung, không tên người lạ hay địa điểm. */
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
