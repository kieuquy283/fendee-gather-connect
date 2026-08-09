# Phase C Motion Guidelines

Date: 2026-08-09

## Principles

- Motion should improve comprehension, not decorate every interaction.
- Mobile transitions should feel quick, soft, and interruptible.
- Use opacity/translate as the default pair.
- Avoid long springs, large scale jumps, and heavy blur.
- Respect `prefers-reduced-motion` by removing nonessential animation and shortening required transitions.

## Recommended Behaviors

### Bottom Sheets

- Purpose: clarify that content emerges from the current screen context.
- Motion: short upward translate with fade.
- Duration: `180-240ms`.
- Easing: ease-out on enter, ease-in on exit.
- Reduced motion: fade only, no travel emphasis.

### Dialogs

- Purpose: separate focused decisions from the underlying route.
- Motion: subtle fade plus very small scale/translate.
- Duration: `140-200ms`.
- Easing: standard ease-out / ease-in.
- Reduced motion: fade only.

### Nearby QuickPreview

- Purpose: reinforce tap-to-preview from a marker without feeling like navigation.
- Motion: bottom-sheet treatment, not full-screen transition.
- Duration: `180-220ms`.
- Easing: ease-out.
- Reduced motion: fade only.

### Selection Chips

- Purpose: confirm state change in filters, audiences, and interests.
- Motion: color/background transition with optional tiny scale pulse.
- Duration: `100-160ms`.
- Easing: ease-out.
- Reduced motion: color transition only.

### RSVP Changes

- Purpose: confirm mutation completion without toast spam.
- Motion: button state swap and summary row highlight.
- Duration: `120-180ms`.
- Easing: ease-out.
- Reduced motion: instant state change with no pulse.

### Presence State Changes

- Purpose: distinguish `OFF`, `ACTIVE`, `MOVING`, `EXPIRED`, and permission-loss states.
- Motion: banner/surface color transition only; no long animated badge behavior.
- Duration: `140-200ms`.
- Easing: ease-out.
- Reduced motion: instant color/state update.

### Navigation Micro-Transitions

- Purpose: preserve flow between primary mobile routes.
- Motion: keep route transitions minimal; prioritize responsiveness over theatrics.
- Duration: `120-180ms` if used.
- Easing: ease-out.
- Reduced motion: none.

## Current Phase C Conclusion

Existing motion should stay restrained. The frontend does not need additional animation for release-candidate closeout beyond sheet/dialog/selection polish already aligned to these rules.
