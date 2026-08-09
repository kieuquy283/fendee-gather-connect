import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { StopPresenceSheet, UpdateLocationSheet } from "@/components/fendee/sheets";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePresence, type AudienceMode } from "@/lib/presence-store";
import { useSocialGraph } from "@/lib/social-graph";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Hồ sơ của tôi - Fendee" },
      {
        name: "description",
        content: "Quản lý hồ sơ, phạm vi bạn bè và snapshot vị trí chia sẻ thủ công.",
      },
    ],
  }),
  component: MyProfile,
});

const audienceOptions = [
  {
    key: "all_friends",
    label: "Tất cả bạn bè",
    sub: "Mọi bạn bè đều tiếp tục thấy snapshot này",
  },
  {
    key: "groups",
    label: "Nhóm bạn",
    sub: "Chọn nhóm bạn thân cho lần chia sẻ này",
  },
  {
    key: "selected",
    label: "Bạn bè đã chọn",
    sub: "Chỉ những người bạn chọn mới thấy snapshot",
  },
] as const;

function MyProfile() {
  const presence = usePresence();
  const socialGraph = useSocialGraph();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [canHelp, setCanHelp] = useState("");
  const [needHelp, setNeedHelp] = useState("");

  useEffect(() => {
    if (!socialGraph.currentProfile) return;
    setCanHelp(socialGraph.currentProfile.canHelp[0] ?? "");
    setNeedHelp(socialGraph.currentProfile.needHelp[0] ?? "");
  }, [socialGraph.currentProfile]);

  const setAudience = (mode: AudienceMode) => {
    presence.changeAudience(
      mode === "groups"
        ? { mode, groupIds: ["close-friends"], friendIds: [] }
        : mode === "selected"
          ? { mode, groupIds: [], friendIds: ["hailang", "minhtu", "tuananh"] }
          : { mode, groupIds: [], friendIds: [] },
    );
  };

  const profile = socialGraph.currentProfile;
  const savingProfile = socialGraph.actionState.updateProfile.status === "loading";

  if (socialGraph.loading && !profile) {
    return (
      <AppShell>
        <TopBar title="Hồ sơ" />
        <div className="rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
          Đang tải hồ sơ...
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <TopBar title="Hồ sơ" />
        <div className="rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
          {socialGraph.error ?? "Không thể tải hồ sơ lúc này."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar
        title="Hồ sơ"
        right={
          <Link
            to="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Cài đặt"
          >
            <Settings className="h-4 w-4" />
          </Link>
        }
      />

      <section className="rounded-3xl bg-brand-gradient p-5 text-center text-primary-foreground shadow-glow">
        <Ava src={profile.avatar} alt={profile.name} size={84} />
        <h1 className="mt-3 text-xl font-bold">{profile.name}</h1>
        <p className="text-xs text-primary-foreground/70">{profile.bio}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" className="rounded-full" asChild>
            <Link to="/setup-profile">
              <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa hồ sơ
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/25"
            asChild
          >
            <Link to="/add-friend">Chia sẻ QR</Link>
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <Label className="mb-2.5 block">Hiện diện và chia sẻ vị trí</Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="font-semibold">Nearby thấy</p>
            <p className="mt-1 text-muted-foreground">
              {presence.nearbyPresenceLocation
                ? presence.nearbyPresenceLocation.zone.shortLabel
                : "Đang ẩn"}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="font-semibold">Bạn bè đang thấy</p>
            <p className="mt-1 text-muted-foreground">
              {presence.friendLocationSnapshot
                ? presence.friendLocationSnapshot.zone.shortLabel
                : "Chưa có snapshot"}
            </p>
          </div>
        </div>
        {presence.isFriendSnapshotOutdated && (
          <p className="mt-3 rounded-2xl bg-warn/10 p-3 text-xs text-muted-foreground">
            Bạn đang ở khu vực mới. Nearby thấy vị trí hiện tại, nhưng bạn bè vẫn thấy vị trí đã
            chia sẻ trước đó.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1 rounded-full"
            disabled={!presence.isPresenceEnabled}
            onClick={() => setUpdateOpen(true)}
          >
            Cập nhật vị trí
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 rounded-full"
            disabled={!presence.isPresenceEnabled}
            onClick={() => setStopOpen(true)}
          >
            Tắt hiện diện
          </Button>
        </div>
      </section>

      <section className="mt-4">
        <Label className="mb-2.5 block">Phạm vi bạn bè</Label>
        <div className="space-y-2">
          {audienceOptions.map((option) => {
            const selected = presence.selectedFriendAudience.mode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setAudience(option.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  selected ? "border-primary bg-accent/40" : "border-border bg-card",
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
                    selected ? "border-primary" : "border-border",
                  )}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Đổi phạm vi bạn bè không tự cập nhật snapshot. Dùng Cập nhật vị trí để gửi lần mới.
        </p>
      </section>

      <section className="mt-6 space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">Trạng thái và Note</p>
        <div className="space-y-1.5">
          <Label htmlFor="where" className="text-xs text-muted-foreground">
            Nhãn địa điểm
          </Label>
          <Input
            id="where"
            defaultValue={profile.place}
            placeholder="Chỉ hiển thị địa điểm gần đúng"
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="can" className="text-xs text-muted-foreground">
            Có thể giúp
          </Label>
          <Input
            id="can"
            value={canHelp}
            onChange={(event) => setCanHelp(event.target.value)}
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="need" className="text-xs text-muted-foreground">
            Đang cần giúp
          </Label>
          <Input
            id="need"
            value={needHelp}
            onChange={(event) => setNeedHelp(event.target.value)}
            className="h-11 rounded-2xl"
          />
        </div>
        <Button
          className="w-full rounded-full"
          disabled={savingProfile}
          onClick={() =>
            void socialGraph.updateProfile({
              canHelp: canHelp ? [canHelp] : [],
              needHelp: needHelp ? [needHelp] : [],
            })
          }
        >
          {savingProfile ? "Đang lưu..." : "Lưu trạng thái"}
        </Button>
      </section>

      <section className="mt-6">
        <Label className="mb-2.5 block">Sở thích</Label>
        <div className="flex flex-wrap gap-2">
          {profile.interests.map((interest) => (
            <Chip key={interest} tone="accent">
              {interest}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-1 rounded-3xl border border-border/70 bg-card p-1 shadow-card">
        {[
          {
            to: "/friends/requests",
            icon: Users,
            label: "Lời mời kết bạn",
            meta: String(socialGraph.incomingRequests.length),
          },
          { to: "/friends", icon: Users, label: "Bạn bè", meta: String(profile.friendCount) },
          { to: "/notifications", icon: Bell, label: "Thông báo", meta: "2 mới" },
          { to: "/widgets", icon: LayoutGrid, label: "Widget màn hình chính", meta: "" },
          { to: "/settings", icon: Settings, label: "Cài đặt", meta: "" },
          { to: "/settings/privacy", icon: Eye, label: "Quyền riêng tư & an toàn", meta: "" },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <Link
              key={row.to}
              to={row.to}
              className="flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-secondary"
            >
              <Icon className="h-4.5 w-4.5 text-primary" />
              <span className="flex-1 text-sm font-medium">{row.label}</span>
              {row.meta && <span className="text-xs text-muted-foreground">{row.meta}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <HandHeart className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Đã giúp</p>
          <p className="text-xl font-bold">18</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <HelpCircle className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Được giúp</p>
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
        busy={presence.actionState.updateFriendLocation.status === "loading"}
        error={presence.actionState.updateFriendLocation.error}
        onConfirm={(notifyAgain) => presence.updateFriendLocation({ notifyAgain })}
      />
      <StopPresenceSheet
        open={stopOpen}
        onOpenChange={setStopOpen}
        busy={presence.actionState.stop.status === "loading"}
        error={presence.actionState.stop.error}
        onConfirm={presence.stopPresence}
      />
    </AppShell>
  );
}
