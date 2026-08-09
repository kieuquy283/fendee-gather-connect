# Mobile Review 17 - Testing

## Existing Coverage

- Playwright functional tests for Gather V2 creation, dedupe, co-host transitions, RSVP, owner/co-host permissions, expiry, notifications, and persistence.
- Playwright visual screenshots for Gather list, creation steps, detail roles, manage, expired state, and notifications at 360/390/430.
- No-overflow assertions exist in Gather visual helpers.

## Missing Coverage

- Unit/domain tests outside Gather.
- Presence E2E and visual regression.
- Auth/onboarding/profile setup tests.
- Friends/groups tests.
- Chat tests.
- Block/report tests.
- Privacy settings tests.
- Accessibility tests.
- Performance regression tests.
- Full viewport matrix 320/360/375/390/393/412/430 across whole app.
- CI configuration and artifact retention policy.

## Readiness

PARTIAL. Gather V2 is covered. Product-level mobile release coverage is insufficient.

