import { createFileRoute, Link } from "@tanstack/react-router";
import { Edit3, Plus, Settings, UserCog, X } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, EmptyState, TopBar } from "@/components/fendee/ui";
import { GatherInviteStatus } from "@/components/fendee/gather-v2";
import { Button } from "@/components/ui/button";
import { getPerson, me } from "@/lib/fendee-data";
import { useGatherStore, type GatherPermission } from "@/lib/gather-store";

export const Route = createFileRoute("/gather/$id_/manage")({
  head: () => ({
    meta: [
      { title: "Quản lý Gather - Fendee" },
      { name: "description", content: "Co-host, người được mời và RSVP của Gather." },
    ],
  }),
  component: GatherManageRoute,
});

function GatherManageRoute() {
  const { id } = Route.useParams();
  const store = useGatherStore();
  const gather = store.getGather(id);

  if (!gather) {
    return (
      <AppShell>
        <TopBar title="Quản lý Gather" back="/gather" />
        <EmptyState
          icon={<X className="h-6 w-6" />}
          title="Gather không tồn tại"
          body="Không thể mở màn hình quản lý cho Gather này."
        />
      </AppShell>
    );
  }

  const can = (permission: GatherPermission) => store.can(gather, store.currentUserId, permission);
  const acceptedHosts = gather.hosts.filter((host) => host.cohostStatus === "accepted");
  const pendingHosts = gather.hosts.filter((host) => host.cohostStatus === "pending");
  const going = gather.invites.filter((invite) => invite.status === "going");
  const maybe = gather.invites.filter((invite) => invite.status === "maybe");
  const declined = gather.invites.filter((invite) => invite.status === "declined");
  const noResponse = gather.invites.filter((invite) => ["sent", "seen"].includes(invite.status));

  return (
    <AppShell>
      <TopBar title="Quản lý Gather" subtitle={gather.title} back="/gather" />

      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <Settings className="h-5 w-5 text-primary" />
        <p className="mt-2 text-sm font-semibold">Quyền quản lý</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Owner có toàn quyền. Co-host chỉ chỉnh nội dung, ghi chú, ảnh, địa điểm, thời gian và xem
          RSVP.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button className="rounded-full" disabled={!can("invite_more")}>
            <Plus className="h-4 w-4" /> Invite more
          </Button>
          <Button variant="secondary" className="rounded-full" disabled={!can("edit_content")}>
            <Edit3 className="h-4 w-4" /> Edit Gather
          </Button>
          <Button variant="secondary" className="rounded-full" disabled={!can("manage_cohosts")}>
            <UserCog className="h-4 w-4" /> Manage co-hosts
          </Button>
          <Button
            variant="secondary"
            className="rounded-full"
            disabled={!can("end_gather")}
            onClick={() => store.endGather(gather.id, store.currentUserId)}
          >
            End Gather
          </Button>
        </div>
      </section>

      <PeopleSection
        title="Người cùng tạo - accepted"
        ids={acceptedHosts.map((host) => host.personId)}
      />
      <PeopleSection
        title="Người cùng tạo - pending"
        ids={pendingHosts.map((host) => host.personId)}
      />
      <InviteSection title="Người được mời - going" invites={going} />
      <InviteSection title="Người được mời - maybe" invites={maybe} />
      <InviteSection title="Người được mời - declined" invites={declined} />
      <InviteSection title="Người được mời - no response" invites={noResponse} />

      <Button className="mb-4 mt-6 w-full rounded-full" asChild>
        <Link to="/gather/$id" params={{ id }}>
          Về chi tiết Gather
        </Link>
      </Button>
    </AppShell>
  );
}

function PeopleSection({ title, ids }: { title: string; ids: string[] }) {
  return (
    <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="space-y-2">
        {ids.length ? (
          ids.map((personId) => {
            const person = personId === me.id ? me : getPerson(personId);
            if (!person) return null;
            return (
              <div key={personId} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <Ava src={person.avatar} alt={person.name} size={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{person.name}</span>
                <Chip tone="outline">host</Chip>
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            Không có ai trong nhóm này.
          </p>
        )}
      </div>
    </section>
  );
}

function InviteSection({
  title,
  invites,
}: {
  title: string;
  invites: ReturnType<typeof useGatherStore>["gathers"][number]["invites"];
}) {
  return (
    <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="space-y-2">
        {invites.length ? (
          invites.map((invite) => {
            const person = getPerson(invite.personId);
            if (!person) return null;
            return (
              <div key={invite.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <Ava src={person.avatar} alt={person.name} size={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{person.name}</span>
                <GatherInviteStatus invite={invite} />
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            Chưa có người nào.
          </p>
        )}
      </div>
    </section>
  );
}
