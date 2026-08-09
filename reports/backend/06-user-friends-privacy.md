# D2 User, Friends, Privacy Backend

Date: 2026-08-09

## Scope

D2 moved these domains behind verified-session server repositories:

- current user / editable profile
- other-user profile visibility
- friendships and friend requests
- private friend groups
- privacy settings
- block state
- report submission compatibility

Still out of scope:

- presence / nearby
- Gather persistence and invitations
- chat persistence
- notifications delivery and durability
- moderation workflow
- account lifecycle

## Storage Model

Current D2 persistence is **DEV/TEST ONLY**.

Implementation detail:

- D2 state now lives in a server-only in-memory social store
- the store is scoped by verified session id in dev/test
- this prevents Playwright browser contexts from mutating each other's D2 state during parallel runs

What this does not provide:

- durable storage across server restarts
- multi-instance consistency
- production-grade persistence

Production dependency that remains open:

- real database / durable shared store

## Repository Boundaries

Server-only D2 implementation files:

- [src/lib/social-store.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-store.server.ts)
- [src/lib/social-authorization.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-authorization.server.ts)
- [src/lib/social-repositories.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-repositories.server.ts)
- [src/lib/social-api.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-api.server.ts)

Client-safe/shared files:

- [src/lib/social-contracts.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-contracts.ts)
- [src/lib/social.functions.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social.functions.ts)
- [src/lib/social-graph.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-graph.tsx)
- [src/lib/privacy-store.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/lib/privacy-store.tsx)

Frontend routes now consume server-backed D2 state instead of direct local/mock mutation:

- [src/routes/profile.index.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/profile.index.tsx)
- [src/routes/profile.$id.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/profile.$id.tsx)
- [src/routes/setup-profile.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/setup-profile.tsx)
- [src/routes/friends.index.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/friends.index.tsx)
- [src/routes/friends.requests.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/friends.requests.tsx)
- [src/routes/add-friend.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/add-friend.tsx)
- [src/routes/settings.privacy.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/settings.privacy.tsx)

## Profile Visibility Model

Server-side profile reads now distinguish:

- self profile
- friend-visible profile
- public profile
- forbidden / blocked / not found

Rules enforced server-side:

- actor identity always comes from verified D1 session
- client `userId` never establishes caller identity
- blocked relationships fail closed
- friends-only profile visibility requires accepted friendship
- private fields are filtered before data reaches the browser

## Friendship Rules

Server-side friendship behavior now supports:

- send request
- accept request
- decline request
- cancel request
- remove friend
- incoming list
- outgoing list
- friend suggestions

Rules enforced server-side:

- no self-request
- no duplicate pending request
- no duplicate accepted friendship
- no acting on another user's request
- blocked relationships cannot create requests

## Group Rules

Friend groups are now owner-scoped server resources.

Server-side rules:

- only the owner may rename/delete/update membership
- added members must exist
- added members must be accepted friends of the owner
- blocked relationships are rejected
- duplicate members are rejected

Gather V2 was not migrated in D2, but its friend/group selectors now consume the shared D2 repository-backed friend/group state.

## Block Semantics

Authoritative D2 block primitive:

- [src/lib/social-authorization.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-authorization.server.ts)

Current block side effects in D2:

- create durable server-side block record in the dev/test store
- remove accepted friendship between blocker and target
- cancel pending friend requests either direction
- remove blocked target from blocker-owned friend groups
- deny D2 profile/friend/group operations against the blocked relationship

Not yet fully enforced server-side outside D2:

- presence / nearby
- Gather persistence and invite resolution
- chat persistence / delivery
- notifications delivery

## Security Test Evidence

Dedicated D2 adversarial suite:

- `npm run test:d2` -> `17/17 passed`

Covered cases:

- own profile allowed
- friend profile allowed
- stranger profile denied
- blocked profile denied
- spoofed profile update ignored
- spoofed friend request denied
- duplicate request conflict
- self-request validation error
- blocked request denied
- foreign request acceptance denied
- foreign group mutation denied
- non-friend group member denied
- spoofed privacy update ignored
- block/unblock persisted
- reload persistence verified
- logout/relogin does not reuse previous user's D2 state

## Remaining Production Dependencies

- production database / durable shared store
- cross-domain server enforcement for block in Presence, Gather, Chat, Notifications
- real moderation workflow over submitted reports
- production identity provider and durable session store from D1
