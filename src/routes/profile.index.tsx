import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Eye,
  HandHeart,
  HelpCircle,
  LayoutGrid,
  Pencil,
  Settings,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { StopPresenceSheet, UpdateLocationSheet } from "@/components/fendee/sheets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { me } from "@/lib/fendee-data";
import { usePresence, type AudienceMode } from "@/lib/presence-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "My profile - Fendee" },
      {
        name: "description",
        content: "Manage profile, friend audience, and manual shared-location snapshot.",
      },
    ],
  }),
  component: MyProfile,
});

const audienceOptions = [
  { key: "all_friends", label: "All friends", sub: "All friends keep seeing the snapshot" },
  { key: "groups", label: "Friend groups", sub: "Close-friends group for this session" },
  { key: "selected", label: "Selected friends", sub: "Only selected friends see the snapshot" },
] as const;

function MyProfile() {
  const presence = usePresence();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);

  const setAudience = (mode: AudienceMode) => {
    presence.changeAudience(
      mode === "groups"
        ? { mode, groupIds: ["close-friends"], friendIds: [] }
        : mode === "selected"
          ? { mode, groupIds: [], friendIds: ["hailang", "minhtu", "tuananh"] }
          : { mode, groupIds: [], friendIds: [] },
    );
  };

  return (
    <AppShell>
      <TopBar
        title="Profile"
        right={
          <Link
            to="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        }
      />

      <section className="rounded-3xl bg-brand-gradient p-5 text-center text-primary-foreground shadow-glow">
        <Ava src={me.avatar} alt={me.name} size={84} />
        <h1 className="mt-3 text-xl font-bold">{me.name}</h1>
        <p className="text-xs text-primary-foreground/70">{me.bio}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" className="rounded-full" asChild>
            <Link to="/setup-profile">
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/25"
            asChild
          >
            <Link to="/add-friend">Share QR</Link>
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <Label className="mb-2.5 block">Presence and location sharing</Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="font-semibold">Nearby strangers</p>
            <p className="mt-1 text-muted-foreground">
              {presence.nearbyPresenceLocation
                ? presence.nearbyPresenceLocation.zone.shortLabel
                : "Hidden"}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="font-semibold">Friends snapshot</p>
            <p className="mt-1 text-muted-foreground">
              {presence.friendLocationSnapshot
                ? presence.friendLocationSnapshot.zone.shortLabel
                : "No active snapshot"}
            </p>
          </div>
        </div>
        {presence.isFriendSnapshotOutdated && (
          <p className="mt-3 rounded-2xl bg-warn/10 p-3 text-xs text-muted-foreground">
            You are now in a new area. People nearby can see you here, but friends still see the
            previous shared location.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1 rounded-full"
            disabled={!presence.isPresenceEnabled}
            onClick={() => setUpdateOpen(true)}
          >
            Update location
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 rounded-full"
            disabled={!presence.isPresenceEnabled}
            onClick={() => setStopOpen(true)}
          >
            Stop presence
          </Button>
        </div>
      </section>

      <section className="mt-4">
        <Label className="mb-2.5 block">Friend audience</Label>
        <div className="space-y-2">
          {audienceOptions.map((option) => {
            const on = presence.selectedFriendAudience.mode === option.key;
            return (
              <button
                key={option.key}
                onClick={() => setAudience(option.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  on ? "border-primary bg-accent/40" : "border-border bg-card",
                )}
              >
                <Users className="h-4.5 w-4.5 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-[11px] text-muted-foreground">{option.sub}</p>
                </div>
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border-[5px]",
                    on ? "border-primary" : "border-border",
                  )}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Changing audience does not update the friend snapshot. Use Update location for that.
        </p>
      </section>

      <section className="mt-6 space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">Status and Note</p>
        <div className="space-y-1.5">
          <Label htmlFor="where" className="text-xs text-muted-foreground">
            Place label
          </Label>
          <Input id="where" placeholder="Approximate place only" className="h-11 rounded-2xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="can" className="text-xs text-muted-foreground">
            Give
          </Label>
          <Input id="can" defaultValue={me.canHelp[0]} className="h-11 rounded-2xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="need" className="text-xs text-muted-foreground">
            Need
          </Label>
          <Input id="need" defaultValue={me.needHelp[0]} className="h-11 rounded-2xl" />
        </div>
        <Button className="w-full rounded-full">Save status</Button>
      </section>

      <section className="mt-6">
        <Label className="mb-2.5 block">Interests</Label>
        <div className="flex flex-wrap gap-2">
          {me.interests.map((i) => (
            <Chip key={i} tone="accent">
              {i}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-1 rounded-3xl border border-border/70 bg-card p-1 shadow-card">
        {[
          { to: "/friends/requests", icon: Users, label: "Friend requests", meta: "3" },
          { to: "/friends", icon: Users, label: "Friends", meta: String(me.friends) },
          { to: "/notifications", icon: Bell, label: "Notifications", meta: "2 new" },
          { to: "/widgets", icon: LayoutGrid, label: "Home screen widgets", meta: "" },
          { to: "/settings", icon: Settings, label: "Settings", meta: "" },
          { to: "/settings/privacy", icon: Eye, label: "Privacy and safety", meta: "" },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-secondary"
            >
              <Icon className="h-4.5 w-4.5 text-primary" />
              <span className="flex-1 text-sm font-medium">{r.label}</span>
              {r.meta && <span className="text-xs text-muted-foreground">{r.meta}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <HandHeart className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Helped</p>
          <p className="text-xl font-bold">18</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <HelpCircle className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Got help</p>
          <p className="text-xl font-bold">11</p>
        </div>
      </section>
      <div className="h-4" />

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
    </AppShell>
  );
}
