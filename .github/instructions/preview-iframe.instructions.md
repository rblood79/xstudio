---
applyTo: "src/builder/preview/**"
---
# Preview / iframe Messaging
- Validate event.origin on receive.
- Queue messages until PREVIEW_READY then flush.
- Message types: UPDATE_ELEMENTS, ELEMENT_SELECTED, UPDATE_ELEMENT_PROPS.
- **Collect computed styles**: Use getComputedStyle() on DOM elements on selection.
- Send computed styles (layout, flexbox, typography, colors, spacing, borders) back to Builder.
