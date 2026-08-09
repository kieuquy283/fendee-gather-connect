# D1 Authorization Foundation

Date: 2026-08-09

## Scope

D1 does not complete domain authorization. It establishes the verified actor contract that later backend phases will consume.

## Actor Contract

Server authorization now has a stable caller input:

- actor identity from verified session
- target resource identity from request input
- relationship and ownership state from repositories

Conceptual flow:

authenticated actor
+
resource
+
relationship
-> authorization policy
-> allow or deny

## D1 Guarantees

- caller identity no longer comes from client `userId`
- request middleware can attach verified auth context
- server operations can consistently require a verified session
- logout and expiry move the frontend out of authenticated state

## Existing Policy Vocabulary Preserved

Frontend policy vocabulary in `src/lib/authorization.ts` remains the reference set for D2+ server rollout:

- profile visibility
- conversation visibility
- Gather view/manage/edit/invite/RSVP
- presence visibility
- notification ownership
- report submission

## D2 Handoff

Next milestone:

- attach these policies to durable user/profile repositories
- add friends/groups/privacy/block persistence
- enforce object-level authorization server-side
