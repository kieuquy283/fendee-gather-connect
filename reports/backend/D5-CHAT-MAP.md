# D5 Chat Map

Date: 2026-08-09

## Purpose

This document records the Chat architecture before the D5 backend migration.

It captures:

- current chat authority
- current route and component flow
- current conversation and message modeling
- current authorization behavior
- current persistence behavior
- D1/D2/D3/D4 primitives available for reuse

## Current Authority Before D5

Chat is still client-authoritative.

Current flow:

UI routes/components
-> route-local state in `src/routes/chat.index.tsx` and `src/routes/chat.$id.tsx`
-> mock data in `src/lib/fendee-data.ts`
-> client-side policy checks in `src/lib/authorization.ts`

Chat does not yet have:

- shared chat contracts
- server functions
- server-only repositories
- server-only persistence adapter
- authenticated server-side conversation membership enforcement
- retry-safe send semantics

## Current Files Read

Core:

- `src/lib/fendee-data.ts`
- `src/lib/authorization.ts`
- `src/lib/repositories.ts`

Routes:

- `src/routes/chat.index.tsx`
- `src/routes/chat.$id.tsx`

Reference backend patterns:

- `src/lib/server-auth.server.ts`
- `src/lib/gather-contracts.ts`
- `src/lib/gather-store.server.ts`
- `src/lib/gather-repositories.server.ts`
- `src/lib/gather.functions.ts`
- `reports/backend/05-authorization.md`
- `reports/backend/06-user-friends-privacy.md`
- `reports/backend/08-gather-backend.md`

Existing security / UI tests touching chat:

- `tests/gather-v2/phase-a-security.spec.ts`
- `tests/gather-v2/mobile-core-visual.spec.ts`

## Current Domain Models In Code

Current mock conversation model in `src/lib/fendee-data.ts`:

- `Conversation`
  - `id`
  - `personId`
  - `last`
  - `time`
  - `unread`

Current mock message model:

- `Record<string, { from: "me" | "them"; text: string; time: string }[]>`

Current gaps relative to D5 target:

- no server-owned `ConversationParticipant`
- no server-owned `Message`
- no sender id on stored messages beyond `"me" | "them"`
- no durable timestamps
- no pagination contract
- no idempotency key / client message id

## Current Route Behavior

### `/chat`

Uses:

- `conversations` from `src/lib/fendee-data.ts`
- `getPerson()`
- `useAuth()`
- `usePrivacy()`
- `canViewConversation()`

Behavior:

- filters visible conversation rows entirely on the client
- assumes the current actor is `me` by default when auth is not ready
- shows the existing RC conversation list UI
- links directly to `/chat/$id`

Current gaps:

- no server-backed list authority
- no authenticated read boundary
- no blocked/read-only conversation state from the backend

### `/chat/$id`

Uses:

- route loader reads `conversations.find(...)`
- route loader reads `messages[conversationId]`
- `getPerson()`
- `useAuth()`
- `usePrivacy()`
- `canViewConversation()`
- route-local `draft` state

Behavior:

- deep link succeeds whenever the conversation id exists in local mock data
- unauthorized access is handled by a client-rendered denied state
- composer is purely local UI with no server mutation
- send button only clears local draft constraints; no authoritative message write exists

Current gaps:

- arbitrary conversation id is not protected by server-side participant checks
- messages are not durable
- reload does not preserve newly sent messages because send is not implemented
- blocked relationship enforcement is only as strong as the client guard

## Current Authorization Behavior

Current chat policy is in `src/lib/authorization.ts`.

Today:

- `canMessageUser()` denies self and blocked relationships
- otherwise it allows if target is a friend or target visibility is `public`
- `canViewConversation()` simply reuses `canMessageUser()`

Important limitations:

- policy does not verify actual conversation membership
- policy does not verify sender ownership
- policy does not protect message send/read on the server
- client can only deny what it already downloaded

## Current Repository Boundary

`src/lib/repositories.ts` contains a placeholder `ChatRepository`:

- `listConversations(actorId)`
- `canOpenConversation(actorId, conversationId)`
- `getConversation(conversationId)`
- `listMessages(conversationId)`
- `sendMessage({ conversationId, body })`

Current gaps:

- actor id is still part of the client contract
- return types are untyped placeholders
- no direct-conversation creation contract
- no pagination
- no idempotent send contract
- no blocked / forbidden / not-found state modeling

## Current Persistence

Chat persistence is mock-only.

Source of truth today:

- static `conversations` array
- static `messages` object

Behavior:

- data is bundled with the client
- no shared multi-user mutation exists
- no reload persistence for new sends
- no test-world server isolation exists because there is no server authority yet

## D1 / D2 / D3 / D4 Primitives Ready For Reuse

### D1

Available:

- verified session actor
- authenticated server request boundary
- request bucket / isolation model

### D2

Available:

- friendship state
- block state
- privacy state
- user records

These are the correct authority inputs for protected direct messaging and block enforcement.

### D3

Available:

- test-world partitioning pattern
- hydration-first client migration pattern
- server-authoritative reload reconstruction

### D4

Available:

- contract/store/repository/function layering pattern
- route migration pattern that preserves existing RC UI while moving authority server-side
- multi-user Playwright backend suite structure

## Existing Test Assumptions

Current chat coverage assumes:

- blocked users are denied route access by client-side checks
- `/chat` and `/chat/$id` render static mock UI
- visual captures use seeded mock content

D5 must preserve the current mobile UX while replacing mock authority with server-backed chat state.

## Main Migration Targets Derived From This Map

D5 needs to:

- move conversations and messages behind authenticated server repositories
- enforce participant membership server-side
- enforce D2 block rules on conversation creation and message send
- keep direct conversations unique per participant pair
- make send retry-safe without duplicate messages
- preserve reload and multi-user visibility through server authority
- keep test worlds isolated without partitioning chat data by auth session id
- preserve the current RC chat list/detail UI states while adding loading/error/send states
