# Remediation Phase A Map

## Objective

Eliminate or accurately downgrade the original P0/P1 release blockers from the mobile production review. This phase does not attempt to fix P2-P4 findings unless they block P0/P1 remediation.

## Dependency Order

1. Authentication and session boundary.
2. Authorization policies and backend/API boundary.
3. Privacy, location, and persistence cleanup.
4. Block/report/account lifecycle.
5. Route/resource privacy enforcement.
6. Focused adversarial tests and mobile smoke validation.

## A. Authentication

### MPR-001 - P0 Authentication

- Root cause: `src/routes/auth.tsx` navigates directly to app routes. App routes do not require a verified session. Identity is imported from static `me`.
- Affected files/routes: `/auth`, `/home`, `/nearby`, `/gather`, `/gather/new`, `/gather/$id`, `/gather/$id/manage`, `/chat`, `/chat/$id`, `/notifications`, `/profile`, `/profile/$id`, `/settings`, `/friends`, `/add-friend`, `/tram`.
- Domain: Auth, session, current user.
- Dependencies: MPR-002 authorization must use authenticated session, not static `me`.
- Required architecture: `UI -> AuthService -> AuthRepository -> Session`, with a development repository adapter until backend credentials exist.
- Backend/API work: Replace development auth adapter with provider-backed session/token verification; server must own session expiry and resource identity.
- Migration risk: High. Existing code imports static `me` and uses `currentUserId = me.id`.
- Test requirements: anonymous protected route, login, reload, expired session, logout then browser Back.

## B. Server-Side Authorization Model

### MPR-002 - P0 Authorization

- Root cause: Gather has only client-side `can()` and static `currentUserId`; other domains have no centralized policy.
- Affected files/routes: Gather routes/store, profile, chat, notifications, presence, friends/groups.
- Domain: Authorization, Gather, Presence, Profile, Chat, Notifications, Block/Report.
- Dependencies: MPR-001 session.
- Required architecture: central policy functions such as `canViewGather`, `canManageGather`, `canViewProfile`, `canMessageUser`, `canViewPresence`, `canViewFriendLocation`.
- Backend/API work: Future server must enforce these same rules independently of UI state, localStorage, and client IDs.
- Migration risk: High. Client-only policy can be bypassed until backend exists.
- Test requirements: co-host owner-only denial, uninvited Gather denial, unauthorized deep link denial, blocked user communication/presence denial.

## C. Privacy and Location Enforcement

### MPR-003 - P1 Sensitive localStorage

- Root cause: Gather and Presence persist sensitive session/social state in localStorage.
- Affected files: `src/lib/gather-store.tsx`, `src/lib/presence-store.tsx`.
- Domain: Persistence, privacy, session lifecycle.
- Dependencies: MPR-001 logout cleanup and MPR-002 backend boundary.
- Required architecture: versioned local development persistence with explicit sensitive-production warning and logout cleanup; future server storage for real data.
- Backend/API work: Store Gather, Presence, notifications, privacy and block/report data server-side with retention and deletion policy.
- Migration risk: Medium. Existing Playwright tests seed localStorage.
- Test requirements: corrupted persisted state, logout cleanup, account switching/reload.

### MPR-004 - P1 Location watcher simulated

- Root cause: Presence permission and position changes are manually simulated.
- Affected files/routes: `src/lib/presence-store.tsx`, `/nearby`, `/home`, `/profile`.
- Domain: Presence, Nearby, location permission.
- Dependencies: MPR-001 session and MPR-002 privacy policy.
- Required architecture: `PresenceRepository` plus a device location controller using geolocation and Permissions API where available; keep simulation as development adapter.
- Backend/API work: Presence session start/stop, area publish/unpublish, revocation handling.
- Migration risk: High. Real browsers differ heavily, especially mobile Safari.
- Test requirements: permission revoked while active, moving/hidden state, stop clears visibility, friend snapshot does not follow device.

### MPR-010 - P1 Stop/revoke presence only local

- Root cause: Stop only clears local store and no repository/API contract exists.
- Affected files/routes: `src/lib/presence-store.tsx`, `/nearby`, `/home`, `/profile`.
- Domain: Presence privacy, Nearby visibility.
- Dependencies: Presence repository and policy layer.
- Required architecture: idempotent `stopPresence` repository call that removes Nearby publication and ends friend-sharing session.
- Backend/API work: Transactional server unpublish and session end.
- Migration risk: Medium.
- Test requirements: stop while moving, permission lost, logout cleanup.

## D. Backend/API Architecture

This dependency supports MPR-001 through MPR-010.

- Root cause: No Fendee domain repository interfaces.
- Affected domains: Auth, User, Friend, Group, Presence, Gather, Chat, Notification, Privacy, Report.
- Required architecture: `UI -> domain/service -> repository -> adapter`.
- Backend/API work: Replace development local adapters with network adapters once credentials/endpoints exist.
- Test requirements: unit/domain tests should target policies and adapter behavior without relying on hidden UI.

## E. Block / Report / Account Lifecycle

### MPR-005 - P1 Block/report not enforced

- Root cause: Profile block state is local component state; report button has no durable action.
- Affected files/routes: `/profile/$id`, Nearby, Friends, Gather, Chat, Notifications, Presence.
- Domain: Safety, visibility, abuse reporting.
- Dependencies: Auth session, authorization policies, repositories.
- Required architecture: `PrivacyRepository` for blocks and `ReportRepository` for durable reports; policy functions filter visibility.
- Backend/API work: Server-side block graph, report moderation queue, audit trail, notification suppression.
- Migration risk: High due cross-domain visibility effects.
- Test requirements: blocked user cannot message, receive presence, appear in profile/chat/notifications where disallowed.

### MPR-006 - P1 Logout/account deletion missing

- Root cause: No account lifecycle service or UI.
- Affected files/routes: settings/profile/app shell/auth.
- Domain: Account, privacy, persistence.
- Dependencies: Auth repository and local storage cleanup.
- Required architecture: logout clears local sensitive state and returns to signed-out route; account deletion creates a pending deletion request in development and requires backend enforcement.
- Backend/API work: Token revocation, account deletion workflow, data erasure, legal retention exceptions.
- Migration risk: High.
- Test requirements: logout then Back, expired session, deletion request is durable and clearly pending.

## F. Route Resource Privacy

### MPR-007 - P1 Direct deep links lack visibility checks

- Root cause: Routes load by mock/local IDs with no policy gate.
- Affected routes: `/gather/$id`, `/gather/$id/manage`, `/chat/$id`, `/profile/$id`.
- Domain: Authorization, privacy.
- Dependencies: Auth and policy layer.
- Required architecture: resource access gates using policy functions and repository methods.
- Backend/API work: Server must return 404/403 based on authenticated actor and relationship.
- Migration risk: Medium.
- Test requirements: uninvited user opens restricted Gather, invalid deep link, blocked profile/chat access.

### MPR-008 - P1 Chat static/no access control

- Root cause: Chat reads static messages and send input does not mutate through a service.
- Affected routes: `/chat`, `/chat/$id`.
- Domain: Chat, safety, privacy.
- Dependencies: Auth, block policy, chat repository.
- Required architecture: `ChatRepository` with access checks and local development adapter.
- Backend/API work: Real message delivery, encryption at rest, rate limits, moderation.
- Migration risk: High.
- Test requirements: blocked user cannot communicate, invalid chat denied.

### MPR-009 - P1 Notifications local/mock

- Root cause: Notifications are static/local and not recipient-authorized by a backend.
- Affected route: `/notifications`.
- Domain: Notifications, privacy, Gather, Presence.
- Dependencies: Auth, notification repository, block/privacy policies.
- Required architecture: `NotificationRepository` with recipient filtering and privacy-safe templates.
- Backend/API work: Push provider, delivery dedupe, read-state sync, privacy templates.
- Migration risk: High.
- Test requirements: only current recipient sees notification, blocked parties filtered, deep link authorized.

## Phase A Implementation Boundaries

Implemented locally in this phase:

- Auth/session interface and explicit development adapter.
- Protected route gate for app surfaces.
- Centralized authorization policy functions.
- Repository interfaces and local adapters.
- Block/report/account lifecycle local repository support.
- Presence repository boundary and logout/permission cleanup.
- Focused tests for adversarial P0/P1 flows.

Requires backend enforcement after this phase:

- Real identity provider and server session verification.
- Server-side resource authorization.
- Durable server storage for personal/location/social data.
- Push notification delivery.
- Moderation/report workflows.
- Production geolocation server publication and unpublish.
