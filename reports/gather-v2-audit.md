# Gather V2 Audit

## Current Create Flow

- `/gather/new` contains the complete four-step wizard in route-local React state.
- Step 1 captures title, note, and shows a fixed place label.
- Step 2 currently selects one audience mode from `friends`, `selected`, or `public`.
- Step 2 only supports selected individual friends for the `selected` mode.
- Step 3 selects a display duration string.
- Step 4 renders a privacy preview, then links directly to `/gather/g1`.
- Publishing does not create or persist a new Gather.
- The audience is preselected as `friends`, which conflicts with the new requirement to never preselect the audience.

## Current Data Model

- `src/lib/fendee-data.ts` defines `Gather` with:
  - `id`
  - `hostId`
  - `title`
  - `note`
  - `place`
  - `distance`
  - `startsIn`
  - `duration`
  - `expiresAt`
  - `audience`
  - `joined`
  - `slots`
  - `status`
- `audience` is a single enum: `friends`, `public`, or `selected`.
- Attendance is represented only by `joined[]`.
- There are no individual invite records, immutable recipient snapshots, co-host records, host roles, or host statuses.
- `getGather()` reads directly from the static `gathers` array.

## Missing Co-Host Concept

- A Gather has exactly one `hostId`.
- The owner and co-hosts are not modeled separately.
- Pending/accepted/declined co-host invitation states do not exist.
- There is no permission layer for owner versus co-host actions.

## Invitation Behavior

- Invitations are implied by the Gather audience field.
- Selected recipients are route-local and not persisted.
- Group selection does not exist.
- Recipient resolution, deduplication, blocked-user filtering, and immutable audience snapshots do not exist.
- Co-host selection and invitation audience are currently conflated as "people receiving the Gather".

## RSVP Behavior

- RSVP is represented by `joined[]` only.
- There is no `going`, `maybe`, `declined`, `seen`, or `sent` status.
- Invitees cannot change or withdraw RSVP in a persistent model.
- Expired Gathers disable the old "Tham gia" CTA, but no domain rule prevents RSVP changes.

## Notification Behavior

- `src/lib/fendee-data.ts` contains static notifications with a broad `type`.
- `/notifications` maps gather notifications to `/gather`, not a specific Gather detail.
- There are no notification event types for co-host invites, co-host responses, RSVP changes, updates, expiry, or ending.
- Duplicate prevention is not modeled.
- Presence session notifications were added separately and are unrelated to Gather.

## Reusable Components

- `GatherCard` lives in `src/components/fendee/cards.tsx` and reads host data from `getPerson()`.
- `GatherPresenceCard` lives in `src/components/fendee/presence.tsx` and uses the separate presence mock model.
- Common visual primitives are `Button`, `Chip`, `Ava`, `TopBar`, `Sheet`, `Input`, `Textarea`, and `Label`.
- Current Gather UI does not have reusable selectors for friends, groups, selected chips, privacy preview, host stack, RSVP summary, or management.

## Routing And State

- Existing Gather routes are:
  - `/gather`
  - `/gather/new`
  - `/gather/$id`
- `src/routes/README.md` says TanStack Start file routing is used and `routeTree.gen.ts` is generated.
- No `/gather/$id/manage` route exists.
- Gather state is not centralized.
- There is no Gather persistence; the app reads static mock arrays.

## Friend And Group Data

- `people` in `src/lib/fendee-data.ts` is the friend/user source.
- Friends are filtered via `isFriend`.
- No group model currently exists.
- Blocked users and invalid/deleted friendships are not modeled.

## Design Tokens And Product Spec

- `README.md` defines Fendee as a privacy-first mobile app for short status, Gather, Nearby, chat, notifications, and privacy controls.
- The app should avoid continuous location tracking and expose only appropriate approximate location details.
- `src/styles.css` defines the Fendee visual system: light/dark tokens, red primary accent, near-black dark surfaces, rounded cards, `bg-brand-gradient`, `bg-accent-gradient`, `shadow-card`, and `shadow-glow`.
- The V2 Gather work should preserve these tokens and existing compact mobile-first layout patterns.

## Implementation Implications

- Add a centralized Gather domain/store layer and make routes call that API instead of manipulating mock arrays.
- Keep co-host membership independent from invite audience.
- Resolve group memberships to immutable individual invite snapshots when publishing.
- Add a permission function that denies owner-only actions at the domain layer, not only through hidden UI.
- Preserve the four-step wizard but replace Step 2 with separate co-host and invitation sections.
- Add a detail and management surface that reads hosts, invites, RSVP summary, and permissions from the domain layer.
