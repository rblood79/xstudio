---
applyTo: "src/builder/preview/**"
---
# Preview / iframe Messaging
- Validate event.origin on receive.
- Queue messages until PREVIEW_READY then flush.
- Message types: UPDATE_ELEMENTS, ELEMENT_SELECTED, UPDATE_ELEMENT_PROPS.
