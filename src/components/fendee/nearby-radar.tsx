import { Link } from "@tanstack/react-router";
import { CalendarPlus, MapPin, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Chip } from "./ui";
import { GiveNeed, presenceDot, presenceLabel } from "./presence";
import { getPresence, type NearbyMarker, type PresencePerson } from "@/lib/fendee-presence";
import { cn } from "@/lib/utils";

export type NearbyPick = { person: PresencePerson; marker: NearbyMarker };

/** Relative proximity frame - a 100m bubble, not a map. */
export function NearbyRadar({
  markers,
  onPick,
}: {
  markers: NearbyMarker[];
  onPick: (pick: NearbyPick) => void;
}) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[32px] border border-border/70 bg-surface shadow-card">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="absolute h-[92%] w-[92%] rounded-full border border-primary/12 bg-primary/[0.03]" />
        <span className="absolute h-[62%] w-[62%] rounded-full border border-primary/16 bg-primary/[0.05]" />
        <span className="absolute h-[32%] w-[32%] rounded-full border border-primary/25 bg-primary/[0.07]" />
        <span className="radar-sweep absolute h-[92%] w-[92%] rounded-full [background:conic-gradient(from_0deg,transparent_0deg,transparent_300deg,color-mix(in_oklab,var(--color-primary)_28%,transparent)_355deg,transparent_360deg)]" />
      </div>

      <span className="absolute left-4 top-4 rounded-full bg-card/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
        Bán kính ~100m · vị trí tương đối
      </span>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <MapPin className="h-5 w-5" />
        </span>
        <p className="mt-1 text-[10px] font-semibold text-muted-foreground">Bạn</p>
      </div>

      {markers.length === 0 && (
        <div className="absolute inset-x-8 top-[58%] text-center">
          <p className="text-sm font-semibold">Chưa có ai ở gần</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Khung Nearby vẫn hoạt động khi bạn đang bật hiện diện.
          </p>
        </div>
      )}

      {markers.map((marker) => {
        const person = getPresence(marker.id);
        if (!person) return null;
        return (
          <button
            key={marker.id}
            type="button"
            onClick={() => onPick({ person, marker })}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            className="absolute w-[86px] -translate-x-1/2 -translate-y-1/2 text-center transition-transform active:scale-95"
          >
            <span className="mx-auto mb-1 block max-w-full truncate rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold shadow-card">
              {person.name}
            </span>
            <span className="relative mx-auto block h-12 w-12">
              <span className="absolute inset-0 rounded-full rounded-bl-md bg-card p-[3px] shadow-card ring-1 ring-border/70">
                <img
                  src={person.avatar}
                  alt={person.name}
                  loading="lazy"
                  className={cn(
                    "h-full w-full rounded-full object-cover",
                    person.presence === "stale" && "opacity-60 grayscale",
                  )}
                />
              </span>
              <span
                className={cn(
                  "absolute -right-0.5 bottom-0 h-3 w-3 rounded-full border-2 border-card",
                  presenceDot[person.presence],
                )}
              />
            </span>
            <span className="mt-1 block truncate text-[10px] text-muted-foreground">
              ~{marker.meters}m
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function NearbyMarkerSheet({
  pick,
  onOpenChange,
}: {
  pick: NearbyPick | null;
  onOpenChange: (v: boolean) => void;
}) {
  const person = pick?.person;
  return (
    <Sheet open={!!pick} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        {person && pick && (
          <>
            <SheetHeader className="px-0 text-left">
              <SheetTitle className="sr-only">{person.name}</SheetTitle>
            </SheetHeader>
            <div className="-mt-2 flex items-start gap-3">
              <img
                src={person.avatar}
                alt={person.name}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.age} tuổi · {person.role}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" /> ~{pick.marker.meters}m ·{" "}
                  {pick.marker.place}
                </p>
              </div>
              <Chip tone="outline">{presenceLabel[person.presence]}</Chip>
            </div>

            <p className="mt-3 text-sm">{person.status}</p>
            <GiveNeed person={person} />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.interests.map((interest) => (
                <Chip key={interest} tone="outline">
                  {interest}
                </Chip>
              ))}
              <Chip tone="accent">{person.mutual} bạn chung</Chip>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1 rounded-full">
                <UserPlus className="h-4 w-4" /> Kết nối
              </Button>
              <Button variant="secondary" className="flex-1 rounded-full" asChild>
                <Link to="/gather/new">
                  <CalendarPlus className="h-4 w-4" /> Mời Gather
                </Link>
              </Button>
            </div>
            <Button variant="ghost" className="mt-2 w-full rounded-full" asChild>
              <Link to="/profile/$id" params={{ id: person.id }}>
                Xem hồ sơ
              </Link>
            </Button>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              Khoảng cách chỉ là ước lượng tương đối - Fendee không hiển thị tọa độ.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
