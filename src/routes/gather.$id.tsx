import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, MapPin, Share2, Users, X } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, EmptyState, TopBar } from "@/components/fendee/ui";
import {
  GatherHostStack,
  GatherInviteStatus,
  GatherInviteeActions,
  GatherManageSheet,
  GatherRSVPSummary,
  MessageHostButton,
} from "@/components/fendee/gather-v2";
import { getPerson, me } from "@/lib/fendee-data";
import { useGatherStore, type GatherPermission } from "@/lib/gather-store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gather/$id")({
  head: () => ({
    meta: [
      { title: "Chi tiết Gather - Fendee" },
      { name: "description", content: "Thông tin Gather, co-host và RSVP." },
    ],
  }),
  component: GatherDetail,
});

function GatherDetail() {
  const { id } = Route.useParams();
  const store = useGatherStore();
  const gather = store.getGather(id);
  const [manageOpen, setManageOpen] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);

  if (!gather) {
    return (
      <AppShell>
        <TopBar title="Chi tiết Gather" back="/gather" />
        <EmptyState
          icon={<X className="h-6 w-6" />}
          title="Gather không tồn tại"
          body="Gather này đã bị xoá hoặc chưa được đồng bộ trong phiên hiện tại."
        />
      </AppShell>
    );
  }

  const owner = gather.ownerId === me.id ? me : getPerson(gather.ownerId)!;
  const inactive = gather.status !== "live" || Date.now() > gather.expiresAtMs;
  const currentInvite = gather.invites.find((invite) => invite.personId === store.currentUserId);
  const pendingCohost = gather.hosts.find(
    (host) => host.personId === store.currentUserId && host.cohostStatus === "pending",
  );
  const canManage = (permission: GatherPermission) =>
    store.can(gather, store.currentUserId, permission);
  const isManager = canManage("view_rsvp");

  return (
    <AppShell>
      <TopBar
        title="Chi tiết Gather"
        back="/gather"
        right={
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Chia sẻ"
          >
            <Share2 className="h-4 w-4" />
          </button>
        }
      />

      <section className="overflow-hidden rounded-3xl bg-brand-gradient p-5 text-primary-foreground shadow-glow">
        <Chip tone="accent" className="bg-white/15 text-primary-foreground">
          {gather.status === "expired"
            ? "Đã hết hạn"
            : gather.status === "ended"
              ? "Đã kết thúc"
              : gather.startsIn}
        </Chip>
        <h1 className="mt-3 text-2xl font-bold leading-snug">{gather.title}</h1>
        <p className="mt-2 text-sm text-primary-foreground/75">{gather.note}</p>
        <div className="mt-4 flex items-center gap-3">
          <Ava src={owner.avatar} alt={owner.name} size={40} />
          <div>
            <p className="text-sm font-semibold">{owner.name}</p>
            <p className="text-[11px] text-primary-foreground/70">Owner · {gather.distance}</p>
          </div>
        </div>
      </section>

      {inactive && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Gather này không còn hoạt động</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              RSVP mới đã bị tắt. Vị trí hoạt động gắn với Gather không còn được hiển thị.
            </p>
          </div>
        </div>
      )}

      {pendingCohost && gather.status === "live" && (
        <div className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-4">
          <p className="text-sm font-semibold">{owner.name} mời bạn cùng tạo một Gather</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chấp nhận để xuất hiện như co-host và chỉnh sửa các trường được phép.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              data-testid="cohost-accept"
              className="flex-1 rounded-full"
              onClick={() =>
                store.respondToCohostInvite(gather.id, store.currentUserId, "accepted")
              }
            >
              Cùng tạo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="cohost-decline"
              className="flex-1 rounded-full"
              onClick={() =>
                store.respondToCohostInvite(gather.id, store.currentUserId, "declined")
              }
            >
              Từ chối
            </Button>
          </div>
        </div>
      )}

      <section className="mt-4 space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <GatherHostStack gather={gather} />
        <p className="flex items-center gap-2.5 text-sm">
          <MapPin className="h-4 w-4 text-primary" /> {gather.place}
        </p>
        <p className="flex items-center gap-2.5 text-sm">
          <Clock className="h-4 w-4 text-primary" /> {gather.duration} · {gather.expiresAt}
        </p>
        <p className="flex items-center gap-2.5 text-sm">
          <Users className="h-4 w-4 text-primary" />
          {gather.audienceSnapshot.resolvedRecipientIds.length} người được mời
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">RSVP summary</h2>
        <GatherRSVPSummary gather={gather} />
      </section>

      {currentInvite && (
        <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Phản hồi của bạn</h2>
            <GatherInviteStatus invite={currentInvite} />
          </div>
          <GatherInviteeActions
            status={currentInvite.status}
            disabled={inactive}
            onChange={(status) => store.updateRSVP(gather.id, store.currentUserId, status)}
          />
          <div className="mt-3">
            <MessageHostButton hostId={gather.ownerId} />
          </div>
        </section>
      )}

      {isManager && (
        <div className="mb-4 mt-6 space-y-2">
          <Button
            size="lg"
            data-testid="open-gather-manage"
            className="w-full rounded-full"
            onClick={() => setManageOpen(true)}
          >
            Quản lý Gather
          </Button>
          {!canManage("end_gather") && (
            <Button
              size="lg"
              variant="secondary"
              data-testid="owner-only-attempt"
              className="w-full rounded-full"
              onClick={() => setDenied("Co-host không thể kết thúc hoặc xoá Gather trong V1.")}
            >
              Thử thao tác owner-only
            </Button>
          )}
        </div>
      )}

      {denied && (
        <p className="mt-3 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">{denied}</p>
      )}

      <GatherManageSheet
        gather={gather}
        open={manageOpen}
        onOpenChange={setManageOpen}
        can={canManage}
        onEnd={() => store.endGather(gather.id, store.currentUserId)}
        onExpire={() => store.expireGather(gather.id)}
        onOwnerOnlyAttempt={() => setDenied("Bạn không có quyền quản lý co-host cho Gather này.")}
      />

      <div className="h-4" />
    </AppShell>
  );
}
