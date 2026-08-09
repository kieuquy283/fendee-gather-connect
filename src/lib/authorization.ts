import type { Conversation, Person } from "./fendee-data";
import type { Gather, GatherPermission } from "./gather-store";
import type { PresenceSession } from "./presence-store";

export type Actor = {
  id: string;
  authenticated: boolean;
};

export type BlockRegistry = {
  blockedUserIds: string[];
  blockedByUserIds?: string[];
};

export function isBlocked(actor: Actor, targetId: string, blocks: BlockRegistry) {
  return (
    blocks.blockedUserIds.includes(targetId) || (blocks.blockedByUserIds ?? []).includes(targetId)
  );
}

export function canViewProfile(actor: Actor, person: Person | undefined, blocks: BlockRegistry) {
  if (!actor.authenticated || !person) return false;
  if (person.id === actor.id) return true;
  return !isBlocked(actor, person.id, blocks);
}

export function canMessageUser(actor: Actor, person: Person | undefined, blocks: BlockRegistry) {
  if (!actor.authenticated || !person || person.id === actor.id) return false;
  if (isBlocked(actor, person.id, blocks)) return false;
  return Boolean(person.isFriend || person.visibility === "public");
}

export function canViewConversation(
  actor: Actor,
  conversation: Conversation | undefined,
  person: Person | undefined,
  blocks: BlockRegistry,
) {
  return Boolean(conversation && canMessageUser(actor, person, blocks));
}

export function canViewGather(actor: Actor, gather: Gather | undefined, blocks: BlockRegistry) {
  if (!actor.authenticated || !gather) return false;
  if (gather.ownerId === actor.id) return true;
  if (gather.hosts.some((host) => host.personId === actor.id && host.cohostStatus !== "declined")) {
    return true;
  }
  if (gather.invites.some((invite) => invite.personId === actor.id)) return true;
  if (isBlocked(actor, gather.ownerId, blocks)) return false;
  return false;
}

export function canManageGather(actor: Actor, gather: Gather | undefined, blocks: BlockRegistry) {
  if (!canViewGather(actor, gather, blocks) || !gather || gather.status !== "live") return false;
  return gather.hosts.some(
    (host) => host.personId === actor.id && host.cohostStatus === "accepted",
  );
}

export function canEditGather(
  actor: Actor,
  gather: Gather | undefined,
  permission: GatherPermission,
  blocks: BlockRegistry,
) {
  if (!canManageGather(actor, gather, blocks) || !gather) return false;
  const host = gather.hosts.find(
    (item) => item.personId === actor.id && item.cohostStatus === "accepted",
  );
  if (!host) return false;
  if (host.role === "owner") return true;
  return [
    "edit_content",
    "edit_note",
    "edit_image",
    "edit_place",
    "edit_expiry",
    "view_rsvp",
    "publish_updates",
  ].includes(permission);
}

export function canInviteToGather(actor: Actor, gather: Gather | undefined, blocks: BlockRegistry) {
  return canEditGather(actor, gather, "invite_more", blocks);
}

export function canUpdateRSVP(actor: Actor, gather: Gather | undefined, blocks: BlockRegistry) {
  if (!canViewGather(actor, gather, blocks) || !gather || gather.status !== "live") return false;
  return gather.invites.some((invite) => invite.personId === actor.id);
}

export function canViewPresence(actor: Actor, person: Person | undefined, blocks: BlockRegistry) {
  if (!actor.authenticated || !person) return false;
  if (isBlocked(actor, person.id, blocks)) return false;
  return person.visibility === "public" || person.isFriend;
}

export function canViewFriendLocation(actor: Actor, targetId: string, blocks: BlockRegistry) {
  if (!actor.authenticated || actor.id === targetId) return false;
  return !isBlocked(actor, targetId, blocks);
}

export function canPublishNearbyPresence(actor: Actor, session: PresenceSession | null) {
  return Boolean(
    actor.authenticated &&
    session &&
    ["starting", "active", "moving", "offline"].includes(session.status),
  );
}

export function canViewNotification(actor: Actor, recipientId: string) {
  return Boolean(actor.authenticated && actor.id === recipientId);
}

export function canSubmitReport(actor: Actor, targetId: string) {
  return Boolean(actor.authenticated && actor.id !== targetId);
}
