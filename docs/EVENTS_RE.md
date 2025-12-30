# Events Panel Smart Recommendations

## Plan
1. Define the UX states for recommended events (empty, list, detail) and when the strip is shown.
2. Reuse existing event metadata + component supported events to compute a small recommended set.
3. Render the recommended events in panel-contents before pressing + and keep + behavior unchanged.
4. Add lightweight styling to match current Events Panel tokens and keep the interaction accessible.
5. Verify add-handler flow, selection, and empty state messaging.

## Background
Currently the Events Panel shows only a + action in the header. Users must open the picker to see common events, which adds friction. We want to surface default events immediately after selecting an element, improving accessibility and speed.

## Goals
- Show the component's default/recommended events inside the panel contents without pressing +.
- Keep event additions identical to the existing flow (create handler + select handler).
- Do not change existing event registry or supported events definitions.

## Non-goals
- No new event types or action types.
- No redesign of the EventTypePicker popover UI.
- No change to handler detail editing flow.

## UX States
- No element selected: keep current empty state.
- Element selected, no handlers:
  - Show recommended events in panel-contents.
  - Empty state text mentions recommended quick add + + button.
- Element selected, handlers exist, no handler selected:
  - Show recommended events above the handlers list (if any remain).
- Handler detail view:
  - Hide recommended events to keep focus on editing.

## Data Source
- Component supported events: `componentMeta.inspector.supportedEvents`.
- Implemented events filter: `isImplementedEventType`.
- Recommended list: `COMPONENT_RECOMMENDED_EVENTS` in `eventCategories.ts`.
- Fallback order: `EVENT_PRIORITY` (click/change/submit/keyboard/mouse/focus).

## Interaction
- Clicking a recommended event should call the same add handler path as the + picker.
- If a recommended event is already registered, it should not appear.
- If no recommended events remain, the strip should be hidden.

## Accessibility
- Provide clear aria-labels for each quick-add event button.
- Ensure focus styles and keyboard activation match existing icon buttons.

## Styling
- Reuse existing recommended chip styles (currently in EventTypePicker popover).
- Wrap in a small panel-contents section with consistent spacing.

## Implementation Notes
- Add a shared helper to compute priority-based recommended events.
- Reuse existing label map: `EVENT_TYPE_LABELS`.
- Keep logic local to Events Panel; no global store changes.

## Validation
- Select a Button: recommended shows (click, key down, key up if supported).
- Select a TextField: recommended shows (change, key down, key up as supported).
- Add a recommended event: handler appears and becomes selected.
- If all supported events are already added: no recommended strip.

## Open Questions
- Should recommended events display when handlers exist but one is selected?
- Should we show a "More" link to open the picker, or keep only +?
