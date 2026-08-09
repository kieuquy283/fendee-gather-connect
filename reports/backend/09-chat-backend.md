# D5 Chat Backend

Date: August 9, 2026
Status: DEV/TEST CHAT BACKEND READY

## Scope

D5 moved Chat behind authenticated server repositories without starting Notifications or Push backend migration. The existing mobile chat list and thread UX remain in place, but conversations and messages are now server-authoritative inside the local dev/test adapter.

## Before

- `src/routes/chat.index.tsx` and `src/routes/chat.$id.tsx` relied on client-local mock chat data.
- Conversation visibility depended on client policy checks after the data was already bundled into the app.
- Newly sent messages were not durable across reload.
- Direct conversations had no server-side uniqueness rule.
- Message send had no idempotency guard.
- Conversation access was not protected by a server-side participant check.

## After

### Server boundary

- `src/lib/chat-contracts.ts`
- `src/lib/chat-store.server.ts`
- `src/lib/chat-repositories.server.ts`
- `src/lib/chat.functions.ts`
- `src/lib/chat-api.server.ts`

`src/server.ts` now routes `/api/d5/*` and `/api/dev/d5/*` through the Chat backend.

### Client boundary

- `src/lib/chat-store.tsx` is now the client-facing provider/store boundary.
- `src/routes/chat.index.tsx` and `src/routes/chat.$id.tsx` consume server-backed Chat state.
- `scripts/check-client-boundary.mjs` now blocks client imports of `chat-repositories.server` and `chat-store.server`.

## Domain models

### Conversation

- `id`
- `type`
- `directKey`
- `participantIds`
- `createdAt`
- `updatedAt`
- `lastMessageId`

### ConversationParticipant

- `conversationId`
- `userId`
- `role`
- `joinedAt`
- `lastReadMessageId`

### Message

- `id`
- `conversationId`
- `senderId`
- `body`
- `clientMessageId`
- `createdAt`
- `updatedAt`
- `deletedAt`

## Authenticated actor and membership authorization

Every Chat operation derives actor identity from the verified D1 session through the existing server auth boundary.

Server authorization now verifies:

- the actor is an actual participant before returning a conversation or message page
- the actor cannot send into a conversation they do not belong to
- the actor cannot send as another user because `senderId` always comes from the verified session
- arbitrary conversation ids fail closed when the actor is not a participant

The durable domain owner is the user inside the test-world bucket, not the auth session id.

## Block and privacy enforcement

Chat reuses D2 primitives instead of introducing a separate messaging policy layer.

Server-side enforcement includes:

- `isBlockedEitherDirection()` for read and send checks
- `areFriends()` and target privacy checks for direct-conversation creation
- participant checks before message history access

Blocked users cannot:

- create a new protected direct conversation
- reopen a protected direct conversation
- send new messages

## Idempotent send

`sendMessage()` requires `clientMessageId`.

The in-memory server adapter maintains an idempotency index by:

- `conversationId`
- `senderId`
- `clientMessageId`

If the same client retries the same send, the server returns the original stored message instead of creating a duplicate.

## Reload and session rotation

Chat is now server-authoritative in the local adapter:

- message send survives reload
- a second authenticated request by the other participant sees the same stored messages
- auth-session rotation for the same user still resolves the existing conversation state because ownership is user-based, not session-id-based

## Test-world isolation

The D5 adapter follows the same shared-world isolation model used by D2, D3, and D4:

- users in the same test world share the same Chat dataset
- parallel test worlds do not collide
- Chat state is not partitioned by auth session id

## Frontend behavior preserved

The existing RC mobile chat experience remains intact while gaining server-backed state:

- conversation list
- thread view
- loading / empty / forbidden / not-found states
- sending / failed / retry handling
- composer layout above the mobile keyboard

## Dev/test persistence limitation

Chat persistence remains in-memory and local to the dev/test adapter.

This means D5 is backend-complete at the authorization and domain-contract layer, but not production-durable yet.

## Validation

Validated on August 9, 2026:

- D1 auth suite: 21/21 pass
- D2 backend suite: 17/17 pass
- D3 backend suite: 9/9 pass
- D4 backend suite: 6/6 pass
- D5 targeted backend suite: 8/8 pass
- Gather functional: 21/21 pass
- Gather visual: 12/12 pass
- Full E2E: 141/141 pass
- Client boundary: pass
- `npm run typecheck`: pass
- `npm run lint`: pass with existing warnings only
- `npm run build`: pass

## Remaining production blockers

- production database for durable conversation and message persistence
- production realtime infrastructure for live delivery, read-state fan-out, and multi-instance propagation
- production identity/session infrastructure inherited from D1
- notifications/push delivery backend remains a separate later milestone
