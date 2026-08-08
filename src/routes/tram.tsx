import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Chip, TopBar } from "@/components/fendee/ui";
import { PresenceAva, PresenceCard, StateCard } from "@/components/fendee/presence";
import { QuickPreview } from "@/components/fendee/sheets";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  activityClusters,
  getPresence,
  presencePeople,
  station,
  stationFilters,
  type PresencePerson,
} from "@/lib/fendee-presence";
import { usePresence } from "@/lib/presence-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tram")({
  head: () => ({
    meta: [
      { title: "Station - Fendee" },
      {
        name: "description",
        content: "Station view uses centralized presence state and approximate place labels.",
      },
    ],
  }),
  component: TramScreen,
});

function TramScreen() {
  const presence = usePresence();
  const [preview, setPreview] = useState<PresencePerson | null>(null);
  const [filters, setFilters] = useState<string[]>(["Dưới 1 km"]);

  const toggle = (f: string) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const friends = presencePeople.filter((p) => p.isFriend);
  const here = presencePeople.filter((p) => p.sameStation);
  const forYou = presencePeople.filter((p) => p.presence !== "stale");

  return (
    <AppShell>
      <TopBar
        title="Station"
        back="/home"
        subtitle={
          presence.isPresenceEnabled
            ? `Nearby ${presence.nearbyPresenceLocation?.zone.shortLabel ?? "hidden"} - Friends ${
                presence.friendLocationSnapshot?.zone.shortLabel ?? "none"
              }`
            : "Presence off"
        }
      />

      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="text-sm">
          {station.friends} friends - {station.matches} relevant people - {station.gathers} open
          Gathers
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Device {presence.deviceLocation.zone.shortLabel} - friend snapshot{" "}
          {presence.friendLocationSnapshot?.zone.shortLabel ?? "none"}
        </p>
        {presence.isFriendSnapshotOutdated && (
          <p className="mt-2 rounded-2xl bg-warn/10 p-2 text-[11px] text-muted-foreground">
            Friends are still seeing the previous shared location. Nearby follows the current area.
          </p>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <div className="no-scrollbar -mx-5 flex flex-wrap gap-2 px-5">
          {stationFilters.map((f) => (
            <button key={f} type="button" onClick={() => toggle(f)}>
              <Chip
                tone={filters.includes(f) ? "accent" : "outline"}
                className={cn("px-3 py-1.5", filters.includes(f) && "ring-1 ring-primary")}
              >
                {f}
              </Chip>
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="foryou" className="mt-5">
        <TabsList className="w-full rounded-full">
          <TabsTrigger value="foryou" className="rounded-full text-xs">
            For you
          </TabsTrigger>
          <TabsTrigger value="friends" className="rounded-full text-xs">
            Friends
          </TabsTrigger>
          <TabsTrigger value="here" className="rounded-full text-xs">
            Here
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-full text-xs">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foryou" className="mt-4 space-y-3">
          {forYou.map((p) => (
            <PresenceCard key={p.id} person={p} onPreview={setPreview} />
          ))}
          <StateCard
            title="Station uses approximate labels"
            body="No map, coordinates, or live friend tracking is displayed here."
            actions={
              <Button size="sm" variant="secondary" className="rounded-full" asChild>
                <Link to="/settings/privacy">Privacy settings</Link>
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="friends" className="mt-4 space-y-3">
          {friends.map((p) => (
            <PresenceCard key={p.id} person={p} onPreview={setPreview} />
          ))}
        </TabsContent>

        <TabsContent value="here" className="mt-4 space-y-3">
          {here.length ? (
            here.map((p) => <PresenceCard key={p.id} person={p} onPreview={setPreview} />)
          ) : (
            <StateCard
              title="No one active here"
              body="No prototype users are active in this station right now."
              actions={
                <Button size="sm" className="rounded-full" asChild>
                  <Link to="/gather/new">Create Gather</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-3">
          {activityClusters.map((c) => (
            <article
              key={c.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  {c.id === "friends" ? (
                    <Users className="h-4.5 w-4.5" />
                  ) : (
                    <Sparkles className="h-4.5 w-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {c.count} {c.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.hint}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {c.ids.map((id) => {
                    const p = getPresence(id);
                    return p ? <PresenceAva key={id} person={p} size={30} /> : null;
                  })}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-auto rounded-full"
                  onClick={() => setPreview(getPresence(c.ids[0]!) ?? null)}
                >
                  Quick view
                </Button>
              </div>
            </article>
          ))}
        </TabsContent>
      </Tabs>

      <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
        Fendee shows approximate distance and place labels only.
      </p>

      <QuickPreview person={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </AppShell>
  );
}
