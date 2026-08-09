# Database Schema Strategy

Date: 2026-08-09

## Purpose

This document defines the initial production data model and migration strategy for Phase D. It is vendor-neutral and designed to support:

- production authentication
- object-level authorization
- durable friendships/groups
- separated presence models
- Gather V2 persistence
- chat persistence
- notifications and push delivery
- moderation
- account lifecycle
- audit logging

## Migration Strategy

Requirements:

- initial schema is reproducible
- all changes are incremental migrations
- local development can reset cleanly
- test environments can create isolated databases deterministically

Recommended migration sets:

1. `0001_initial_identity_and_social`
2. `0002_presence`
3. `0003_gather`
4. `0004_chat`
5. `0005_notifications`
6. `0006_moderation_and_account_lifecycle`
7. `0007_audit_and_rate_limits`

## Core Conventions

### IDs

- Use explicit string IDs, preferably sortable opaque IDs such as ULID/UUIDv7 equivalents.
- Client-facing IDs must not encode trust decisions.

### Timestamps

Use these columns where applicable:

- `created_at`
- `updated_at`
- `expires_at`
- `deleted_at`

### Soft deletion

Use `deleted_at` only where historical retention is needed:

- users
- groups
- conversations
- devices
- some moderation/account-lifecycle records

Do not soft-delete transient presence visibility records if TTL cleanup is simpler.

### Ownership

Every protected record must make ownership or membership derivable by joins, not by trusting client payloads.

## Tables

### users

Purpose:

- canonical account identity

Columns:

- `id` PK
- `auth_subject` unique
- `status` enum: `active | disabled | pending_deletion | deleted`
- `created_at`
- `updated_at`
- `deleted_at` nullable

Indexes:

- unique `auth_subject`
- index `status`

### user_profiles

Purpose:

- public/profile data shown in app

Columns:

- `user_id` PK/FK -> `users.id`
- `display_name`
- `handle` nullable unique
- `bio` nullable
- `avatar_url` nullable
- `visibility` enum: `public | friends | hidden`
- `can_help_json` optional normalized later
- `need_help_json` optional normalized later
- `interests_json` optional normalized later
- `created_at`
- `updated_at`

Indexes:

- unique `handle` where not null
- index `visibility`

### sessions

Purpose:

- server-verified sessions

Columns:

- `id` PK
- `user_id` FK -> `users.id`
- `issued_at`
- `expires_at`
- `revoked_at` nullable
- `last_seen_at` nullable
- `ip_hash` nullable
- `user_agent` nullable

Indexes:

- index `user_id`
- index `expires_at`
- index `revoked_at`

### friendships

Purpose:

- accepted friendship graph and request lifecycle

Columns:

- `id` PK
- `requester_user_id` FK -> `users.id`
- `addressee_user_id` FK -> `users.id`
- `status` enum: `pending | accepted | declined | removed`
- `requested_at`
- `responded_at` nullable
- `created_at`
- `updated_at`
- `deleted_at` nullable

Constraints:

- canonical unique pair on normalized user ids
- requester != addressee

Indexes:

- pair unique index
- index on `(requester_user_id, status)`
- index on `(addressee_user_id, status)`

### friend_groups

Columns:

- `id` PK
- `owner_user_id` FK -> `users.id`
- `name`
- `description` nullable
- `created_at`
- `updated_at`
- `deleted_at` nullable

Indexes:

- index `owner_user_id`

### friend_group_members

Columns:

- `id` PK
- `group_id` FK -> `friend_groups.id`
- `member_user_id` FK -> `users.id`
- `created_at`

Constraints:

- unique `(group_id, member_user_id)`

Indexes:

- index `member_user_id`

### blocks

Columns:

- `id` PK
- `blocker_user_id` FK -> `users.id`
- `blocked_user_id` FK -> `users.id`
- `created_at`
- `deleted_at` nullable

Constraints:

- unique active `(blocker_user_id, blocked_user_id)`
- blocker != blocked

Indexes:

- index `blocker_user_id`
- index `blocked_user_id`

### reports

Columns:

- `id` PK
- `reporter_user_id` FK -> `users.id`
- `target_user_id` FK -> `users.id`
- `reason_code`
- `reason_text` nullable
- `context_type` enum: `profile | presence | gather | chat | message | other`
- `context_id` nullable
- `status` enum: `submitted | triaged | reviewing | resolved | dismissed`
- `created_at`
- `updated_at`

Indexes:

- index `reporter_user_id`
- index `target_user_id`
- index `status`

### presence_sessions

Purpose:

- authenticated presence lifecycle

Columns:

- `id` PK
- `user_id` FK -> `users.id`
- `audience_mode` enum: `all_friends | groups | selected`
- `status` enum: `starting | active | moving | expired | offline | stopped`
- `permission_state` enum: `granted | denied | lost`
- `started_at`
- `last_heartbeat_at`
- `expires_at`
- `stopped_at` nullable
- `created_at`
- `updated_at`

Indexes:

- index `user_id`
- index `expires_at`
- index `(user_id, status)`

### nearby_presence

Purpose:

- dynamic nearby stranger visibility only

Columns:

- `id` PK
- `presence_session_id` FK -> `presence_sessions.id`
- `user_id` FK -> `users.id`
- `area_id`
- `area_label`
- `relative_distance_bucket`
- `published_at`
- `expires_at`

Notes:

- do not store UI-facing precise coordinates here unless strictly needed
- if precise source coordinates are required for geofencing, store them in a separate, more restricted internal table

Indexes:

- index `user_id`
- index `area_id`
- index `expires_at`
- unique active one-per-user nearby publication if product requires

### friend_location_snapshots

Purpose:

- manual friend-only snapshot, separate from Nearby

Columns:

- `id` PK
- `presence_session_id` FK -> `presence_sessions.id`
- `owner_user_id` FK -> `users.id`
- `zone_id`
- `zone_label`
- `shared_at`
- `expires_at`
- `created_at`
- `updated_at`

Indexes:

- index `owner_user_id`
- index `expires_at`

### friend_location_snapshot_audiences

Columns:

- `id` PK
- `snapshot_id` FK -> `friend_location_snapshots.id`
- `recipient_user_id` FK -> `users.id`
- `created_at`

Constraints:

- unique `(snapshot_id, recipient_user_id)`

Indexes:

- index `recipient_user_id`

### gathers

Columns:

- `id` PK
- `owner_user_id` FK -> `users.id`
- `title`
- `note` nullable
- `place_label`
- `distance_label` nullable
- `duration_minutes`
- `status` enum: `live | expired | ended`
- `expires_at`
- `ended_at` nullable
- `created_at`
- `updated_at`
- `deleted_at` nullable

Indexes:

- index `owner_user_id`
- index `status`
- index `expires_at`

### gather_hosts

Columns:

- `id` PK
- `gather_id` FK -> `gathers.id`
- `user_id` FK -> `users.id`
- `role` enum: `owner | cohost`
- `cohost_status` enum: `pending | accepted | declined`
- `invited_at`
- `responded_at` nullable
- `created_at`
- `updated_at`

Constraints:

- unique `(gather_id, user_id)`

Indexes:

- index `user_id`
- index `(gather_id, cohost_status)`

### gather_audience_snapshots

Purpose:

- immutable record of the audience resolution inputs and outputs at create/update time

Columns:

- `id` PK
- `gather_id` FK -> `gathers.id`
- `source` enum: `all_friends | groups | selected_friends | mixed`
- `selected_group_ids_json`
- `selected_friend_ids_json`
- `resolved_recipient_ids_json`
- `resolved_at`
- `created_at`

Indexes:

- index `gather_id`

### gather_invites

Columns:

- `id` PK
- `gather_id` FK -> `gathers.id`
- `recipient_user_id` FK -> `users.id`
- `source` enum: `all_friends | groups | selected_friends | mixed`
- `status` enum: `sent | seen | going | maybe | declined`
- `sent_at`
- `updated_at`

Constraints:

- unique `(gather_id, recipient_user_id)`

Indexes:

- index `recipient_user_id`
- index `(gather_id, status)`

### conversations

Columns:

- `id` PK
- `type` enum: `direct | group`
- `created_at`
- `updated_at`
- `deleted_at` nullable

Indexes:

- index `updated_at`

### conversation_participants

Columns:

- `id` PK
- `conversation_id` FK -> `conversations.id`
- `user_id` FK -> `users.id`
- `joined_at`
- `left_at` nullable
- `last_read_message_id` nullable

Constraints:

- unique active `(conversation_id, user_id)`

Indexes:

- index `user_id`
- index `conversation_id`

### messages

Columns:

- `id` PK
- `conversation_id` FK -> `conversations.id`
- `sender_user_id` FK -> `users.id`
- `body`
- `created_at`
- `edited_at` nullable
- `deleted_at` nullable

Indexes:

- index `(conversation_id, created_at)`
- index `sender_user_id`

### notifications

Columns:

- `id` PK
- `recipient_user_id` FK -> `users.id`
- `actor_user_id` nullable FK -> `users.id`
- `type`
- `resource_type`
- `resource_id`
- `title`
- `body`
- `push_preview`
- `deep_link`
- `action_required` boolean
- `read_at` nullable
- `created_at`

Indexes:

- index `recipient_user_id`
- index `(recipient_user_id, read_at)`
- index `created_at`

### push_devices

Columns:

- `id` PK
- `user_id` FK -> `users.id`
- `platform`
- `push_token`
- `status` enum: `active | revoked | invalid`
- `last_seen_at`
- `created_at`
- `updated_at`
- `revoked_at` nullable

Constraints:

- unique active token

Indexes:

- index `user_id`
- index `status`

### account_deletion_requests

Columns:

- `id` PK
- `user_id` FK -> `users.id`
- `status` enum: `requested | confirmed | processing | completed | cancelled | failed`
- `requested_at`
- `confirmed_at` nullable
- `completed_at` nullable
- `created_at`
- `updated_at`

Indexes:

- index `user_id`
- index `status`

### audit_events

Columns:

- `id` PK
- `actor_user_id` nullable FK -> `users.id`
- `event_type`
- `resource_type`
- `resource_id` nullable
- `metadata_json`
- `created_at`

Rules:

- do not store passwords
- do not store session tokens
- do not store raw message bodies
- do not store precise location unless explicitly justified

Indexes:

- index `actor_user_id`
- index `event_type`
- index `created_at`

## Relationship Summary

- `users` 1:1 `user_profiles`
- `users` 1:n `sessions`
- `users` n:n `friendships`
- `users` 1:n `friend_groups`
- `friend_groups` 1:n `friend_group_members`
- `users` n:n `blocks`
- `users` 1:n `reports` as reporter and target
- `users` 1:n `presence_sessions`
- `presence_sessions` 1:n `nearby_presence`
- `presence_sessions` 1:n `friend_location_snapshots`
- `friend_location_snapshots` 1:n `friend_location_snapshot_audiences`
- `users` 1:n `gathers` as owner
- `gathers` 1:n `gather_hosts`
- `gathers` 1:n `gather_invites`
- `gathers` 1:n `gather_audience_snapshots`
- `conversations` 1:n `conversation_participants`
- `conversations` 1:n `messages`
- `users` 1:n `notifications`
- `users` 1:n `push_devices`
- `users` 1:n `account_deletion_requests`
- `users` 1:n `audit_events`

## Authorization-Relevant Query Notes

### Profile

Need joins against:

- `users`
- `user_profiles`
- `friendships`
- `blocks`

### Nearby

Need filters against:

- `nearby_presence`
- `presence_sessions`
- `blocks`
- optional visibility rules on profile/public discoverability

### Friend snapshot

Need filters against:

- `friend_location_snapshots`
- `friend_location_snapshot_audiences`
- `blocks`

### Gather

Need joins against:

- `gathers`
- `gather_hosts`
- `gather_invites`
- `blocks`

### Chat

Need joins against:

- `conversations`
- `conversation_participants`
- `blocks`

### Notifications

Need joins against:

- `notifications`
- underlying resource tables
- current authorization state at open time

## Test Database Requirements

Support deterministic fixtures for:

- owner
- friend
- co-host
- invitee
- blocked user
- stranger

Test reset must:

- wipe or recreate all tables
- reseed canonical identities and relationships
- provide stable resource IDs for adversarial authorization tests

## Conclusion

This schema is sufficient to begin backend implementation without changing frontend product behavior. The next step is not a frontend rewrite; it is choosing the actual persistence/auth stack and implementing these models behind the existing repository boundaries.
