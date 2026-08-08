import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Signal,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, SectionTitle } from "@/components/fendee/ui";
import {
  GatherPresenceCard,
  PresenceCard,
  PresenceLegend,
  PresenceRail,
  StateCard,
} from "@/components/fendee/presence";
import {
  PresenceConfigSheet,
  QuickPreview,
  StopPresenceSheet,
  UpdateLocationSheet,
} from "@/components/fendee/sheets";
import { Button } from "@/components/ui/button";
import { me } from "@/lib/fendee-data";
import {
  presenceGathers,
  presencePeople,
  station,
  type PresencePerson,
} from "@/lib/fendee-presence";
import { usePresence } from "@/lib/presence-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Fendee - Presence and current area" },
      {
        name: "description",
        content:
          "Presence uses separate Nearby stranger visibility and friend shared-location snapshots.",
      },
    ],
  }),
  component: HomeFeed,
});

function HomeFeed() {
  const navigate = useNavigate();
  const presence = usePresence();
  const [configOpen, setConfigOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [preview, setPreview] = useState<PresencePerson | null>(null);

  const friends = presencePeople.filter((p) => p.isFriend);
  const notable = presencePeople.filter((p) => !p.isFriend || p.presence === "public").slice(0, 3);
  const sessionStatus = presence.presenceSession?.status ?? "off";
  const on = presence.isPresenceEnabled;
  const indicator = !on
    ? "Location Off"
    : sessionStatus === "moving"
      ? "Moving - hidden from Nearby"
      : sessionStatus === "offline"
        ? "Location permission lost"
        : `Nearby ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "hidden"} - friends see ${
            presence.friendLocationSnapshot?.zone.shortLabel ?? "none"
          }`;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 -mx-5 mb-4 bg-background/85 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Ava src={me.avatar} alt={me.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Hello</p>
            <p className="truncate text-base font-semibold">{me.name}</p>
          </div>
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {presence.presenceSession?.notificationSent && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => (on ? setStopOpen(true) : setConfigOpen(true))}
          className={cn(
            "mt-2.5 flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium",
            !on && "bg-secondary text-muted-foreground",
            on && sessionStatus !== "moving" && "bg-online/12 text-online",
            sessionStatus === "moving" && "bg-warn/15 text-warn-foreground",
          )}
        >
          <Signal className="h-3.5 w-3.5" />
          {indicator}
          <span className="ml-auto opacity-70">{on ? "Manage" : "Start"}</span>
        </button>
      </header>

      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <Ava src={me.avatar} alt={me.name} size={40} />
          <Link
            to="/profile"
            className="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted-foreground"
          >
            Update note, Give and Need
          </Link>
        </div>

        <button
          type="button"
          onClick={() => (on ? setUpdateOpen(true) : setConfigOpen(true))}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-xs font-semibold">Shared location snapshot</span>
              <span className="block text-[11px] text-muted-foreground">
                {on
                  ? `${presence.friendLocationSnapshot?.zone.shortLabel ?? "none"} - ${
                      presence.audienceLabel
                    }`
                  : "Off - no active friend shared location"}
              </span>
            </span>
          </span>
          <Chip tone={on ? "success" : "outline"}>{on ? "Active" : "Off"}</Chip>
        </button>

        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1 rounded-full" asChild>
            <Link to="/gather/new">
              <Plus className="h-4 w-4" /> Create Gather
            </Link>
          </Button>
          <Button size="sm" variant="secondary" className="flex-1 rounded-full" asChild>
            <Link to="/profile">
              <Pencil className="h-4 w-4" /> Update Note
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/tram" className="text-xs font-medium text-primary">
              Open Station
            </Link>
          }
        >
          Friends currently present
        </SectionTitle>
        <PresenceRail people={friends} onPick={setPreview} />
        <PresenceLegend />
      </section>

      <section className="mt-6">
        <SectionTitle>Presence session</SectionTitle>
        {on ? (
          <div className="rounded-3xl bg-brand-gradient p-4 text-primary-foreground shadow-glow">
            <p className="text-[11px] uppercase tracking-widest text-primary-foreground/70">
              Device area
            </p>
            <p className="mt-1 text-lg font-semibold">{presence.deviceLocation.zone.label}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-primary-foreground/80">
              <Clock className="h-3.5 w-3.5" />
              Accuracy ~{presence.deviceLocation.accuracyMeters}m - dwell{" "}
              {Math.round(presence.deviceLocation.dwellMs / 1000)}s
            </p>
            <p className="mt-3 text-sm">
              Nearby follows the current stable area. Friends see only the manual snapshot.
            </p>
          </div>
        ) : (
          <StateCard
            title="Location Off"
            body="Start presence to create a friend snapshot and publish into Nearby for your current stable area."
            actions={
              <Button size="sm" className="rounded-full" onClick={() => setConfigOpen(true)}>
                Enable presence
              </Button>
            }
          />
        )}

        {on && sessionStatus === "moving" && (
          <div className="mt-3">
            <StateCard
              tone="warn"
              title="Moving"
              body="You are hidden from Nearby while the area is unstable. Authorized friends still see the last manually shared location."
              actions={
                <>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => presence.handleZoneTransition("area-b")}
                  >
                    Arrive Area B
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setStopOpen(true)}
                  >
                    Stop presence
                  </Button>
                </>
              }
            />
          </div>
        )}

        {on && presence.isFriendSnapshotOutdated && (
          <div className="mt-3">
            <StateCard
              tone="warn"
              title="You are now in a new area"
              body="People nearby can see you here. Your friends are still seeing your previously shared location."
              actions={
                <>
                  <Button size="sm" className="rounded-full" onClick={() => setUpdateOpen(true)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Update location for friends
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setStopOpen(true)}
                  >
                    Stop presence
                  </Button>
                </>
              }
            />
          </div>
        )}

        {on && !presence.isFriendSnapshotOutdated && sessionStatus === "active" && (
          <div className="mt-3">
            <StateCard
              title="Area A Active"
              body={`Nearby: ${
                presence.nearbyPresenceLocation?.zone.shortLabel ?? "hidden"
              }. Friends: ${presence.friendLocationSnapshot?.zone.shortLabel ?? "none"}.`}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() =>
                      presence.handleDevicePosition({
                        zoneId: "area-a",
                        accuracyMeters: 28,
                        dwellMs: 20000,
                      })
                    }
                  >
                    Simulate moving
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setStopOpen(true)}
                  >
                    Stop presence
                  </Button>
                </>
              }
            />
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/tram" className="text-xs font-medium text-primary">
              See all
            </Link>
          }
        >
          Notable now
        </SectionTitle>
        {on ? (
          <div className="space-y-3">
            {notable.map((p) => (
              <PresenceCard key={p.id} person={p} onPreview={setPreview} />
            ))}
          </div>
        ) : (
          <StateCard
            title="No active presence session"
            body="Fendee only shows active presence suggestions after you explicitly start a session."
            actions={
              <>
                <Button size="sm" className="rounded-full" onClick={() => setConfigOpen(true)}>
                  Enable presence
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full" asChild>
                  <Link to="/gather/new">Create Gather</Link>
                </Button>
              </>
            }
          />
        )}
      </section>

      <section className="mt-6">
        <SectionTitle
          action={
            <Link to="/gather" className="text-xs font-medium text-primary">
              All
            </Link>
          }
        >
          Open Gathers
        </SectionTitle>
        <div className="space-y-3">
          {presenceGathers.map((g) => (
            <GatherPresenceCard key={g.id} gather={g} />
          ))}
        </div>
      </section>

      <p className="mb-3 mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> No precise coordinates are
        shown.
      </p>
      <div className="mb-2 flex justify-center">
        <Chip tone="outline">
          <Users className="h-3 w-3" /> {station.friends} friends in prototype data
        </Chip>
      </div>

      <PresenceConfigSheet
        open={configOpen}
        onOpenChange={setConfigOpen}
        onConfirm={async (audience) => {
          const started = await presence.startPresence({ audience });
          if (started) navigate({ to: "/nearby" });
        }}
      />
      <UpdateLocationSheet
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        previous={presence.friendLocationSnapshot?.zone ?? null}
        next={presence.deviceLocation.zone}
        audienceCount={presence.audienceCount}
        onConfirm={(notifyAgain) => presence.updateFriendLocation({ notifyAgain })}
      />
      <StopPresenceSheet
        open={stopOpen}
        onOpenChange={setStopOpen}
        onConfirm={presence.stopPresence}
      />
      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
