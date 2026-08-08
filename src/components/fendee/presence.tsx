import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Clock, HandHeart, HelpCircle, MapPin, Sparkles, Users } from "lucide-react";
import { Chip } from "./ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  gatherTagLabel,
  getPresence,
  type PresenceGather,
  type PresencePerson,
  type PresenceState,
} from "@/lib/fendee-presence";

export const presenceDot: Record<PresenceState, string> = {
  gather: "bg-primary",
  public: "bg-online",
  friends: "bg-warn",
  stale: "bg-muted-foreground/50",
};

export const presenceLabel: Record<PresenceState, string> = {
  gather: "Có Gather",
  public: "Đang Public",
  friends: "Chỉ bạn bè",
  stale: "Trạng thái cũ",
};

export function PresenceAva({ person, size = 56 }: { person: PresencePerson; size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <img
        src={person.avatar}
        alt={person.name}
        loading="lazy"
        className={cn(
          "h-full w-full rounded-full object-cover",
          person.presence === "gather" &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background",
          person.presence === "stale" && "opacity-60 grayscale",
        )}
      />
      <span
        className={cn(
          "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background",
          presenceDot[person.presence],
        )}
      />
    </span>
  );
}

export function PresenceRail({
  people,
  onPick,
}: {
  people: PresencePerson[];
  onPick: (p: PresencePerson) => void;
}) {
  return (
    <ul className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1">
      {people.map((p) => (
        <li key={p.id} className="w-[70px] shrink-0 text-center">
          <button type="button" onClick={() => onPick(p)} className="w-full">
            <PresenceAva person={p} />
            <p className="mt-1.5 truncate text-[11px] font-semibold">{p.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{p.short}</p>
            <p className="truncate text-[10px] text-muted-foreground/80">{p.distance}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PresenceLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {(["gather", "public", "friends", "stale"] as PresenceState[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              s === "gather" ? "ring-1 ring-primary" : presenceDot[s],
            )}
          />
          {presenceLabel[s]}
        </span>
      ))}
    </div>
  );
}

export function GiveNeed({ person }: { person: PresencePerson }) {
  return (
    <div className="mt-2.5 space-y-1 text-xs">
      <p className="flex gap-1.5 text-muted-foreground">
        <HandHeart className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" /> Có thể giúp:
        <span className="truncate text-foreground">{person.canHelp}</span>
      </p>
      <p className="flex gap-1.5 text-muted-foreground">
        <HelpCircle className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" /> Đang cần:
        <span className="truncate text-foreground">{person.needHelp}</span>
      </p>
    </div>
  );
}

export function PresenceCard({
  person,
  onPreview,
}: {
  person: PresencePerson;
  onPreview: (p: PresencePerson) => void;
}) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <PresenceAva person={person} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {person.name} <span className="font-normal text-muted-foreground">· {person.role}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" />
              {person.distance}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              {person.publicLeft}
            </span>
          </p>
        </div>
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm">{person.status}</p>
      <GiveNeed person={person} />

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {person.reasons.slice(0, 2).map((r) => (
          <Chip key={r} tone="accent">
            <Sparkles className="h-3 w-3" /> {r}
          </Chip>
        ))}
      </div>

      <div className="mt-3.5 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 rounded-full"
          onClick={() => onPreview(person)}
        >
          Xem nhanh
        </Button>
        <Button size="sm" className="flex-1 rounded-full" asChild>
          <Link to="/profile/$id" params={{ id: person.id }}>
            Kết nối
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function GatherPresenceCard({ gather }: { gather: PresenceGather }) {
  const host = getPresence(gather.hostId)!;
  return (
    <article className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Chip tone={gather.tag === "expiring" ? "accent" : "outline"}>
          {gatherTagLabel[gather.tag]}
        </Chip>
        <span className="text-[11px] text-muted-foreground">{gather.time}</span>
      </div>
      <Link to="/gather/$id" params={{ id: gather.id }} className="flex items-start gap-3">
        <PresenceAva person={host} size={42} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{gather.activity}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {host.name} · {gather.place}
          </p>
        </div>
      </Link>
      <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">{gather.note}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Users className="h-3.5 w-3.5 text-primary" />
        {gather.going} người sẽ qua · {gather.maybe} có thể qua
      </p>
      <div className="mt-3.5 flex gap-2">
        <Button size="sm" className="flex-1 rounded-full">
          Tôi sẽ qua
        </Button>
        <Button size="sm" variant="secondary" className="flex-1 rounded-full">
          Có thể qua
        </Button>
      </div>
    </article>
  );
}

export function StateCard({
  tone = "info",
  title,
  body,
  actions,
}: {
  tone?: "info" | "warn";
  title: string;
  body: string;
  actions: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-4",
        tone === "warn" ? "border-warn/40 bg-warn/10" : "border-dashed border-border bg-surface/60",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
