import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Clock,
  Crown,
  Edit3,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Ava, Chip } from "./ui";
import {
  type FriendGroup,
  type Gather,
  type GatherAudienceSelection,
  type GatherHost,
  type GatherInvite,
  type GatherPermission,
} from "@/lib/gather-store";
import { getPerson, me, type Person } from "@/lib/fendee-data";
import { cn } from "@/lib/utils";

export function SelectedPersonChip({
  person,
  onRemove,
}: {
  person: Person;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 text-[11px]">
      <Ava src={person.avatar} alt={person.name} size={20} />
      <span className="truncate">{person.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Bỏ ${person.name}`}>
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </span>
  );
}

export function SelectedGroupChip({
  group,
  onRemove,
}: {
  group: FriendGroup;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px]">
      <Users className="h-3 w-3 text-primary" />
      <span className="truncate">{group.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Bỏ ${group.name}`}>
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </span>
  );
}

export function FriendPicker({
  friends,
  selectedIds,
  onToggle,
}: {
  friends: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {friends.map((person) => {
        const active = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            type="button"
            data-testid={`friend-${person.id}`}
            onClick={() => onToggle(person.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
              active ? "border-primary bg-accent/40" : "border-border bg-card",
            )}
          >
            <Ava src={person.avatar} alt={person.name} size={38} online={person.online} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{person.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {person.distance} · {person.place}
              </span>
            </span>
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {active && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function GroupPicker({
  groups,
  selectedIds,
  onToggle,
}: {
  groups: FriendGroup[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const active = selectedIds.includes(group.id);
        return (
          <button
            key={group.id}
            type="button"
            data-testid={`group-${group.id}`}
            onClick={() => onToggle(group.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
              active ? "border-primary bg-accent/40" : "border-border bg-card",
            )}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Users className="h-4 w-4 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug">{group.name}</span>
              <span className="block text-[11px] text-muted-foreground">
                {group.description} · {group.memberIds.length} thành viên
              </span>
            </span>
            {active && <Check className="mt-1 h-4 w-4 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function GatherCoHostSelector({
  friends,
  groups,
  value,
  onChange,
}: {
  friends: Person[];
  groups: FriendGroup[];
  value: GatherAudienceSelection;
  onChange: (selection: GatherAudienceSelection) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasSelection = Boolean(value.groupIds.length || value.friendIds.length);
  const alone = !expanded && !hasSelection;
  return (
    <section
      data-testid="gather-cohost-selector"
      className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card"
    >
      <div>
        <p className="text-sm font-semibold">A. Cùng tạo Gather</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Người được chọn chỉ trở thành co-host sau khi họ bấm Cùng tạo.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="cohost-alone"
          onClick={() => {
            setExpanded(false);
            onChange({ includeAllFriends: false, groupIds: [], friendIds: [] });
          }}
          className={cn(
            "rounded-2xl border p-3 text-left text-sm font-semibold",
            alone ? "border-primary bg-accent/40" : "border-border bg-surface-2",
          )}
        >
          Chỉ mình tôi
        </button>
        <button
          type="button"
          data-testid="cohost-with-others"
          onClick={() => setExpanded(true)}
          className={cn(
            "rounded-2xl border p-3 text-left text-sm font-semibold",
            !alone ? "border-primary bg-accent/40" : "border-border bg-surface-2",
          )}
        >
          Tạo cùng người khác
        </button>
      </div>
      {(expanded || hasSelection) && (
        <>
          <GroupPicker
            groups={groups}
            selectedIds={value.groupIds}
            onToggle={(id) => onChange({ ...value, groupIds: toggleId(value.groupIds, id) })}
          />
          <FriendPicker
            friends={friends}
            selectedIds={value.friendIds}
            onToggle={(id) => onChange({ ...value, friendIds: toggleId(value.friendIds, id) })}
          />
        </>
      )}
    </section>
  );
}

export function GatherAudienceSelector({
  friends,
  groups,
  value,
  onChange,
}: {
  friends: Person[];
  groups: FriendGroup[];
  value: GatherAudienceSelection;
  onChange: (selection: GatherAudienceSelection) => void;
}) {
  return (
    <section
      data-testid="gather-audience-selector"
      className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card"
    >
      <div>
        <p className="text-sm font-semibold">B. Mời tham gia</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Người nhận được chốt thành snapshot khi bạn gửi Gather.
        </p>
      </div>
      <button
        type="button"
        data-testid="audience-all-friends"
        onClick={() => onChange({ ...value, includeAllFriends: !value.includeAllFriends })}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border p-3 text-left",
          value.includeAllFriends ? "border-primary bg-accent/40" : "border-border bg-surface-2",
        )}
      >
        <Users className="h-4 w-4 text-primary" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Tất cả bạn bè</span>
          <span className="block text-[11px] text-muted-foreground">
            Có thể kết hợp với nhóm và từng người.
          </span>
        </span>
        {value.includeAllFriends && <Check className="h-4 w-4 text-primary" />}
      </button>
      <GroupPicker
        groups={groups}
        selectedIds={value.groupIds}
        onToggle={(id) => onChange({ ...value, groupIds: toggleId(value.groupIds, id) })}
      />
      <FriendPicker
        friends={friends}
        selectedIds={value.friendIds}
        onToggle={(id) => onChange({ ...value, friendIds: toggleId(value.friendIds, id) })}
      />
    </section>
  );
}

export function GatherSelectionSummary({
  title,
  selection,
  groups,
  friends,
  resolvedCount,
}: {
  title: string;
  selection: GatherAudienceSelection;
  groups: FriendGroup[];
  friends: Person[];
  resolvedCount: number;
}) {
  const selectedGroups = groups.filter((group) => selection.groupIds.includes(group.id));
  const selectedFriends = friends.filter((friend) => selection.friendIds.includes(friend.id));

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{title}</p>
        <Chip tone={resolvedCount ? "accent" : "outline"}>{resolvedCount} người</Chip>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {selection.includeAllFriends && <Chip tone="outline">Tất cả bạn bè</Chip>}
        {selectedGroups.map((group) => (
          <SelectedGroupChip key={group.id} group={group} />
        ))}
        {selectedFriends.map((friend) => (
          <SelectedPersonChip key={friend.id} person={friend} />
        ))}
        {!selection.includeAllFriends && !selectedGroups.length && !selectedFriends.length && (
          <span className="text-[11px] text-muted-foreground">Chưa chọn</span>
        )}
      </div>
    </div>
  );
}

export function GatherPrivacyPreview({
  title,
  note,
  place,
  duration,
  expiryLabel,
  cohostCount,
  inviteCount,
  cohostSummary,
  inviteSummary,
}: {
  title: string;
  note: string;
  place: string;
  duration: string;
  expiryLabel: string;
  cohostCount: number;
  inviteCount: number;
  cohostSummary: React.ReactNode;
  inviteSummary: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <article className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <Chip tone="accent">Xem trước riêng tư</Chip>
        <h2 className="mt-3 text-lg font-semibold leading-snug">{title || "Chưa có tiêu đề"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{note || "Chưa có ghi chú"}</p>
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {place}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" /> {duration} · {expiryLabel}
          </p>
          <p className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-primary" />
            Tạo bởi {me.name}, {cohostCount} lời mời co-host đang chờ
          </p>
          <p className="flex items-center gap-2">
            <Send className="h-3.5 w-3.5 text-primary" />
            {inviteCount} người sẽ nhận lời mời Gather
          </p>
        </div>
      </article>
      <p className="rounded-2xl bg-accent/40 p-3 text-xs font-medium text-accent-foreground">
        {inviteCount} người sẽ thấy {place} {expiryLabel.toLowerCase()}.
      </p>
      {cohostSummary}
      {inviteSummary}
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" />
        Gather chưa được gửi cho đến khi bạn bấm Gửi Gather.
      </p>
    </section>
  );
}

export function GatherHostStack({ gather }: { gather: Gather }) {
  const accepted = gather.hosts.filter((host) => host.cohostStatus === "accepted");
  const pending = gather.hosts.filter(
    (host) => host.role === "cohost" && host.cohostStatus === "pending",
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">Created by</p>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {accepted.map((host) => {
            const person = host.personId === me.id ? me : getPerson(host.personId);
            if (!person) return null;
            return (
              <Ava
                key={host.personId}
                src={person.avatar}
                alt={person.name}
                size={36}
                ring={host.role === "owner"}
              />
            );
          })}
        </div>
        <span className="min-w-0 text-xs text-muted-foreground">
          {accepted
            .map((host) => (host.personId === me.id ? me.name : getPerson(host.personId)?.name))
            .filter(Boolean)
            .join(", ")}
        </span>
      </div>
      {pending.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {pending.length} lời mời co-host đang chờ phản hồi
        </p>
      )}
    </div>
  );
}

export function GatherInviteStatus({ invite }: { invite: GatherInvite }) {
  const label =
    invite.status === "going"
      ? "Sẽ qua"
      : invite.status === "maybe"
        ? "Có thể qua"
        : invite.status === "declined"
          ? "Không tham gia"
          : invite.status === "seen"
            ? "Đã xem"
            : "Chưa trả lời";
  return <Chip tone={invite.status === "going" ? "success" : "outline"}>{label}</Chip>;
}

export function GatherRSVPSummary({ gather }: { gather: Gather }) {
  const going = gather.invites.filter((invite) => invite.status === "going").length;
  const maybe = gather.invites.filter((invite) => invite.status === "maybe").length;
  const noResponse = gather.invites.filter((invite) =>
    ["sent", "seen"].includes(invite.status),
  ).length;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ["Sẽ qua", going],
        ["Có thể qua", maybe],
        ["Chưa trả lời", noResponse],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function GatherManageSheet({
  gather,
  open,
  onOpenChange,
  can,
  onEnd,
  onExpire,
  onOwnerOnlyAttempt,
}: {
  gather: Gather | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  can: (permission: GatherPermission) => boolean;
  onEnd: () => void;
  onExpire: () => void;
  onOwnerOnlyAttempt?: () => void;
}) {
  if (!gather) return null;
  const accepted = gather.hosts.filter((host) => host.cohostStatus === "accepted");
  const pending = gather.hosts.filter((host) => host.cohostStatus === "pending");
  const going = gather.invites.filter((invite) => invite.status === "going");
  const maybe = gather.invites.filter((invite) => invite.status === "maybe");
  const declined = gather.invites.filter((invite) => invite.status === "declined");
  const noResponse = gather.invites.filter((invite) => ["sent", "seen"].includes(invite.status));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-[28px] px-5 pb-6"
      >
        <SheetHeader className="px-0 text-left">
          <SheetTitle>Quản lý Gather</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <ManagePeopleBlock title="Người cùng tạo - accepted" hosts={accepted} />
          <ManagePeopleBlock title="Người cùng tạo - pending" hosts={pending} />
          <InviteBlock title="Người được mời - going" invites={going} />
          <InviteBlock title="Người được mời - maybe" invites={maybe} />
          <InviteBlock title="Người được mời - declined" invites={declined} />
          <InviteBlock title="Người được mời - no response" invites={noResponse} />
          <div className="grid grid-cols-2 gap-2">
            <Button className="rounded-full" disabled={!can("invite_more")}>
              <Plus className="h-4 w-4" /> Invite more
            </Button>
            <Button variant="secondary" className="rounded-full" disabled={!can("edit_content")}>
              <Edit3 className="h-4 w-4" /> Edit Gather
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              disabled={!can("manage_cohosts")}
              onClick={() => {
                if (!can("manage_cohosts")) onOwnerOnlyAttempt?.();
              }}
            >
              <UserCog className="h-4 w-4" /> Manage co-hosts
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              disabled={!can("end_gather")}
              onClick={onEnd}
            >
              End Gather
            </Button>
            <Button variant="ghost" className="col-span-2 rounded-full" onClick={onExpire}>
              Simulate expiry
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ManagePeopleBlock({ title, hosts }: { title: string; hosts: GatherHost[] }) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {hosts.length ? (
          hosts.map((host) => {
            const person = host.personId === me.id ? me : getPerson(host.personId);
            if (!person) return null;
            return (
              <div
                key={host.personId}
                className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3"
              >
                <Ava src={person.avatar} alt={person.name} size={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{person.name}</span>
                <Chip tone={host.role === "owner" ? "accent" : "outline"}>{host.role}</Chip>
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

function InviteBlock({ title, invites }: { title: string; invites: GatherInvite[] }) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{title}</p>
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

export function GatherInviteeActions({
  status,
  disabled,
  onChange,
}: {
  status?: GatherInvite["status"];
  disabled?: boolean;
  onChange: (status: GatherInvite["status"]) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ["going", "Tôi sẽ qua"],
        ["maybe", "Có thể qua"],
        ["declined", "Không tham gia"],
      ].map(([key, label]) => (
        <Button
          key={key}
          size="sm"
          data-testid={`rsvp-${key}`}
          variant={status === key ? "default" : "secondary"}
          className="rounded-full"
          disabled={disabled}
          onClick={() => onChange(key as GatherInvite["status"])}
        >
          {label}
        </Button>
      ))}
      <Button
        size="sm"
        variant="ghost"
        data-testid="rsvp-withdraw"
        className="col-span-3 rounded-full"
        disabled={disabled}
        onClick={() => onChange("seen")}
      >
        Rút RSVP
      </Button>
    </div>
  );
}

export function MessageHostButton({ hostId }: { hostId: string }) {
  return (
    <Button size="lg" variant="secondary" className="rounded-full" asChild>
      <Link to="/chat/$id" params={{ id: "c1" }}>
        <MessageCircle className="h-4 w-4" /> Nhắn tin
      </Link>
    </Button>
  );
}
