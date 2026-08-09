import { Link } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, UserRound, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { me } from "@/lib/fendee-data";
import {
  getNearbyCanvasPositions,
  nearbyAnchor,
  type NearbyPerson,
  type PositionedNearbyPerson,
} from "@/lib/nearby-spatial";
import { cn } from "@/lib/utils";

function CurrentUserAnchor() {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${nearbyAnchor.x}%`, top: `${nearbyAnchor.y}%` }}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-background shadow-card ring-4 ring-primary/10">
        <img src={me.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
      </span>
      <span className="mt-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground">
        Bạn
      </span>
    </div>
  );
}

function NearbyUserMarker({
  person,
  selected,
  onSelect,
}: {
  person: PositionedNearbyPerson;
  selected: boolean;
  onSelect: (person: NearbyPerson) => void;
}) {
  const label = `${person.name}, cách ${person.distanceMeters} mét${
    person.status ? `, ${person.status}` : ""
  }${person.note ? `, ${person.note}` : ""}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(person)}
      className={cn(
        "absolute flex min-h-18 w-[88px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl px-1.5 py-1.5 text-center transition-transform",
        selected && "z-20 bg-background/75 ring-1 ring-primary/45 backdrop-blur",
      )}
      style={{
        left: `${person.x}%`,
        top: `${person.y}%`,
        transform: `translate(-50%, -50%) scale(${selected ? person.scale + 0.05 : person.scale})`,
      }}
    >
      <span className="line-clamp-1 max-w-full text-[10px] font-semibold leading-tight">
        {person.name}
      </span>
      <span className="line-clamp-1 max-w-full text-[9.5px] leading-tight text-muted-foreground">
        {person.note ?? person.status ?? person.bio}
      </span>
      <span className="mb-1 text-[10px] font-semibold text-primary">{person.distanceMeters}m</span>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border-2 border-background shadow-card",
          selected ? "ring-2 ring-primary" : "ring-1 ring-border/70",
        )}
      >
        <img src={person.avatar} alt="" className="h-full w-full rounded-full object-cover" />
      </span>
    </button>
  );
}

function NearbyEmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <Users className="h-7 w-7 text-primary" />
      <p className="mt-3 text-sm font-semibold">Chưa có ai ở gần</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Những người trong phạm vi 100m sẽ hiện ở đây.
      </p>
    </div>
  );
}

function LocationUnavailableState() {
  return (
    <div className="flex h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/60 px-6 text-center">
      <ShieldCheck className="h-7 w-7 text-primary" />
      <p className="mt-3 text-sm font-semibold">Xem ai đang ở gần</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Bật vị trí để xem những người đang ở quanh bạn.
      </p>
    </div>
  );
}

function NearbyUserPreview({
  person,
  onOpenChange,
}: {
  person: NearbyPerson | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!person} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border/70 px-5 pb-6">
        {person && (
          <>
            <SheetHeader className="px-0 text-left">
              <SheetTitle className="sr-only">Xem nhanh Nearby cho {person.name}</SheetTitle>
            </SheetHeader>
            <div className="flex items-start gap-3">
              <img src={person.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {person.isFriend ? "Bạn bè" : "Người xung quanh"} · cách {person.distanceMeters}m
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{person.place}</p>
              </div>
            </div>

            {(person.note || person.status) && (
              <div className="mt-4 rounded-2xl bg-accent/50 p-3">
                {person.note && <p className="text-sm font-semibold">"{person.note}"</p>}
                {person.status && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{person.status}</p>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-border/70 bg-surface-2 p-3">
                <p className="font-semibold">Hồ sơ</p>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{person.bio}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-2 p-3">
                <p className="font-semibold">Điểm chung</p>
                <p className="mt-1 line-clamp-2 text-muted-foreground">
                  {person.interests.slice(0, 2).join(", ")} · hợp {person.match}%
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1 rounded-full" asChild>
                <Link to="/chat">
                  <MessageCircle className="h-4 w-4" /> Nhắn tin
                </Link>
              </Button>
              <Button variant="secondary" className="flex-1 rounded-full" asChild>
                <Link to="/profile/$id" params={{ id: person.id }}>
                  <UserRound className="h-4 w-4" /> Xem hồ sơ
                </Link>
              </Button>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Chỉ hiển thị khoảng cách làm tròn. Không có tọa độ hay địa chỉ chính xác.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function NearbySection({
  users,
  locationAvailable = true,
}: {
  users: NearbyPerson[];
  locationAvailable?: boolean;
}) {
  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const positionedUsers = useMemo(() => getNearbyCanvasPositions(users), [users]);

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold">Nearby</h2>
          <p className="text-xs text-muted-foreground">Trong phạm vi 100m</p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          {users.length} người ở gần
        </span>
      </div>

      {!locationAvailable ? (
        <LocationUnavailableState />
      ) : (
        <div className="relative h-[340px] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
          <div className="absolute inset-4 rounded-[28px] border border-border/35" />
          <div className="absolute inset-11 rounded-[24px] border border-border/25" />
          <div className="absolute inset-x-5 bottom-5 top-7 rounded-[30px] bg-surface-2/45" />

          {users.length === 0 ? (
            <NearbyEmptyState />
          ) : (
            positionedUsers.map((person) => (
              <NearbyUserMarker
                key={person.id}
                person={person}
                selected={selected?.id === person.id}
                onSelect={setSelected}
              />
            ))
          )}

          <CurrentUserAnchor />
        </div>
      )}

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
        Chỉ hiển thị tương quan khoảng cách xã hội. Không có bản đồ, tuyến đường, tọa độ hay địa chỉ
        chính xác.
      </p>

      <NearbyUserPreview person={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}
