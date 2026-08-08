import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EyeOff, MapPin, Radio, ShieldCheck, SlidersHorizontal, WifiOff } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { EmptyState, SectionTitle, TopBar } from "@/components/fendee/ui";
import {
  PresenceCard,
  PresenceLegend,
  PresenceRail,
  StateCard,
} from "@/components/fendee/presence";
import { NearbyRadar, NearbyMarkerSheet, type NearbyPick } from "@/components/fendee/nearby-radar";
import {
  PresenceConfigSheet,
  QuickPreview,
  StopPresenceSheet,
  UpdateLocationSheet,
} from "@/components/fendee/sheets";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getPresence, nearbyFar, nearbyMarkers, type PresencePerson } from "@/lib/fendee-presence";
import { usePresence } from "@/lib/presence-store";

export const Route = createFileRoute("/nearby/")({
  head: () => ({
    meta: [
      { title: "Nearby - Relative presence | Fendee" },
      {
        name: "description",
        content:
          "Nearby is a relative 100m presence frame, not a map. Friend location remains snapshot-based.",
      },
    ],
  }),
  component: Nearby,
});

function Nearby() {
  const presence = usePresence();
  const [configOpen, setConfigOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [pick, setPick] = useState<NearbyPick | null>(null);
  const [preview, setPreview] = useState<PresencePerson | null>(null);

  const farPeople = nearbyFar.map(getPresence).filter(Boolean) as PresencePerson[];
  const status = presence.presenceSession?.status ?? "off";
  const activeNearby = presence.isPresenceEnabled && Boolean(presence.nearbyPresenceLocation);
  const visibleMarkers = useMemo(() => {
    if (!activeNearby) return [];
    if (presence.nearbyPresenceLocation?.zone.id === "area-c") return [];
    if (presence.nearbyPresenceLocation?.zone.id === "area-b") {
      return nearbyMarkers.map((marker, index) => ({
        ...marker,
        x: 100 - marker.x,
        y: index % 2 === 0 ? marker.y + 4 : marker.y - 4,
        place: presence.nearbyPresenceLocation?.zone.nearbyLabel ?? marker.place,
      }));
    }
    return nearbyMarkers;
  }, [activeNearby, presence.nearbyPresenceLocation?.zone]);

  return (
    <AppShell>
      <TopBar
        title="Nearby"
        subtitle="Relative position - no map, no coordinates"
        right={
          <Link
            to="/nearby/filters"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Link>
        }
      />

      <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Radio className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Presence session</p>
            <p className="text-xs text-muted-foreground">
              {presence.isPresenceEnabled
                ? status === "starting"
                  ? "Presence Starting"
                  : `Nearby ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "hidden"}`
                : status === "expired"
                  ? "Presence Expired"
                  : "Location Off"}
            </p>
          </div>
        </div>
        <Switch
          checked={presence.isPresenceEnabled}
          onCheckedChange={(checked) => (checked ? setConfigOpen(true) : setStopOpen(true))}
        />
      </div>

      {presence.permission === "denied" && (
        <div className="mt-3">
          <StateCard
            tone="warn"
            title="Permission Required"
            body="Location permission is needed to start Nearby presence. This prototype grants permission when you continue."
            actions={
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => presence.simulatePermission("prompt")}
              >
                Reset permission prompt
              </Button>
            }
          />
        </div>
      )}

      {presence.permission === "lost" && (
        <div className="mt-3">
          <StateCard
            tone="warn"
            title="Location Permission Lost"
            body="Nearby presence is hidden and the active session is offline until permission returns."
            actions={
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => presence.simulatePermission("granted")}
              >
                Restore permission
              </Button>
            }
          />
        </div>
      )}

      {!presence.isPresenceEnabled ? (
        <div className="mt-4 space-y-3">
          <EmptyState
            icon={<EyeOff className="h-6 w-6" />}
            title={status === "expired" ? "Presence Expired" : "Location Off"}
            body="Nearby stranger presence and friend shared location are both inactive."
            action={
              <Button className="rounded-full" onClick={() => setConfigOpen(true)}>
                Enable presence
              </Button>
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => presence.simulatePermission("denied")}
            >
              Permission Required
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={presence.expirePresence}>
              Presence Expired
            </Button>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-4">
            <SectionTitle>Nearby frame - 100m</SectionTitle>
            <NearbyRadar markers={visibleMarkers} onPick={setPick} />
            <PresenceLegend />
            <p className="mt-2 text-[11px] text-muted-foreground">
              This is a rounded spatial frame for relative proximity only. It has no streets, map
              tiles, coordinates, or navigation.
            </p>
          </section>

          {status === "starting" && (
            <div className="mt-3">
              <StateCard
                title="Presence Starting"
                body="Requesting location permission, creating a friend snapshot, notifying the audience, and publishing Nearby."
                actions={
                  <Button size="sm" variant="secondary" className="rounded-full" disabled>
                    Starting...
                  </Button>
                }
              />
            </div>
          )}

          {status === "moving" && (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Moving"
                body="You have been removed from the previous Nearby area. Strangers cannot see you until a stable area is detected."
                actions={
                  <>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => presence.handleZoneTransition("area-b")}
                    >
                      Area B Detected
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => setStopOpen(true)}
                    >
                      Stop while moving
                    </Button>
                  </>
                }
              />
            </div>
          )}

          {status === "offline" && (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Offline"
                body="Device location is unavailable. Nearby is hidden until the device is online again."
                actions={
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => presence.setOffline(false)}
                  >
                    Back online
                  </Button>
                }
              />
            </div>
          )}

          {presence.isFriendSnapshotOutdated && (
            <div className="mt-3">
              <StateCard
                tone="warn"
                title="Friend Snapshot Outdated"
                body="People nearby can see you here. Your friends are still seeing your previously shared location."
                actions={
                  <Button size="sm" className="rounded-full" onClick={() => setUpdateOpen(true)}>
                    Update location for friends
                  </Button>
                }
              />
            </div>
          )}

          {visibleMarkers.length === 0 && activeNearby && (
            <div className="mt-3">
              <StateCard
                title="No nearby users"
                body="Your Nearby presence is active for this area, but no prototype users are visible in range."
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => presence.handleZoneTransition("area-a")}
                  >
                    Return to Area A
                  </Button>
                }
              />
            </div>
          )}

          <section className="mt-6">
            <SectionTitle>Friends outside Nearby range</SectionTitle>
            <PresenceRail people={farPeople} onPick={setPreview} />
            <div className="mt-3 space-y-3">
              {farPeople.map((p) => (
                <PresenceCard key={p.id} person={p} onPreview={setPreview} />
              ))}
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                presence.handleDevicePosition({
                  zoneId: "area-a",
                  accuracyMeters: 24,
                  dwellMs: 12000,
                })
              }
            >
              Move outside A
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => presence.handleZoneTransition("area-b")}
            >
              Stable Area B
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                presence.handleDevicePosition({
                  zoneId: "area-b",
                  accuracyMeters: 140,
                  dwellMs: 160000,
                })
              }
            >
              GPS inaccurate
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => presence.setOffline(true)}
            >
              <WifiOff className="h-4 w-4" /> Offline
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                presence.handleDevicePosition({
                  zoneId: "area-c",
                  accuracyMeters: 24,
                  dwellMs: 160000,
                })
              }
            >
              No nearby users
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setStopOpen(true)}>
              Stop presence
            </Button>
          </section>

          <p className="mb-4 mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Strangers see only rounded distance and relative position.
          </p>
        </>
      )}

      <PresenceConfigSheet
        open={configOpen}
        onOpenChange={setConfigOpen}
        onConfirm={(audience) => void presence.startPresence({ audience })}
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
      <NearbyMarkerSheet pick={pick} onOpenChange={(v) => !v && setPick(null)} />
      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
