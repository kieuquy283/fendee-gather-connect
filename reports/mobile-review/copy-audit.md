# Phase C Copy Audit

Date: 2026-08-09

## Scope

Reviewed visible product copy across:

- entry routes: `/`, `/onboarding`, `/auth`
- profile setup and friend onboarding
- Home, Trạm, Nearby, filters
- Gather list, create, detail, manage
- Chat list and chat detail
- Profile, friends, friend requests
- Notifications
- Privacy settings
- Widgets
- shared shell, sheets, empty states, route-level denied/error states

## Normalized Terms

The following terms are now used consistently in current frontend surfaces:

- `Gather` remains the product term and is not translated.
- `Cùng tạo` is used for co-host participation.
- `Mời tham gia` remains the invitation audience concept in Gather flows.
- `Bạn bè` is used for direct friend relationships.
- `Nhóm bạn` is used for grouped friend audiences.
- `Nearby` remains the product term for nearby discovery.
- `Trạm` is used for the station-style presence screen.
- `Hiện diện` is used for presence state and sharing controls.
- `Bật hiện diện`, `Tắt hiện diện`, and `Cập nhật vị trí` are used consistently for presence actions.
- `Người xung quanh` is used in Nearby preview contexts instead of ambiguous stranger wording.

## Verified Improvements

- Removed remaining mojibake/encoding defects from Auth, Setup Profile, Add Friend, Privacy, Trạm, Widgets, Gather detail/manage, Friends Requests, Notifications, Profile, Nearby shared surfaces, and AppShell.
- Replaced leftover English UI text on user-facing mobile screens where English was not intentional.
- Localized root `404` and root error boundary copy.
- Refreshed README and root metadata wording away from scaffold/generic phrasing.

## Intentional English

These remain intentionally English in the current product language:

- `Fendee`
- `Nearby`
- `Gather`
- `Chat`
- `Widget`

These are treated as product nouns rather than untranslated leftovers.

## Copy Style Conclusions

The current frontend copy is now materially more coherent:

- shorter and more mobile-first
- clearer in privacy/presence states
- more explicit in destructive/safety contexts
- more consistent between shell, route, and sheet surfaces

## Remaining Copy Limitations

- Some mock data still contains fixed relative time labels rather than live-formatted timestamps.
- Backend-driven transactional copy for real errors, notification delivery, moderation, and account lifecycle still depends on server implementation.
