# Mobile Review 01 - Product Architecture

## Current Architecture

Fendee is organized around mobile routes:

- Entry/onboarding/auth/profile setup.
- Home presence feed.
- Nearby relative presence.
- Gather list, create, detail, and manage.
- Friends, friend requests, add friend.
- Chat list and chat detail.
- Notifications.
- Profile and privacy settings.
- Station/Tram discovery.

The strongest product architecture is in Gather V2 and Presence:

- Gather V2 separates hosts, co-host status, invites, RSVP, audience snapshot, notifications, expiry, and permissions.
- Presence separates `deviceLocation`, `friendLocationSnapshot`, `nearbyPresenceLocation`, `selectedFriendAudience`, `currentNearbyZone`, and `presenceSession`.

## Gaps

- Auth identity is hard-coded as `me`.
- Friend, group, chat, notification, block/report, and profile privacy rules are not centralized as enforceable domain APIs.
- Data is mostly static mock data. Mutations either do nothing, change local component state, or write localStorage.
- No backend contract exists for user identity, resource ownership, friend graph, privacy rules, push delivery, reporting, moderation, or deletion.

## Readiness

NOT READY for production. The frontend has promising product shapes, but the operational product architecture required for a mobile social/location product is absent.

