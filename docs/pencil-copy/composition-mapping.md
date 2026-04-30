# Composition Mapping

## Matching Surfaces

| Pencil model | Composition surface | Status |
| --- | --- | --- |
| Slot host stores recommendation list | `FrameSlotSection` writes slot metadata | Matches intended model. |
| Recommendation list is set-like | `handleAddRecommendation` guards existing references | Matches intended model. |
| Slot fill is instance-local | `ComponentSlotFillSection` writes `descendants[slotPath]` | Matches intended model. |
| Slot fill appends children | `ComponentSlotFillSection` appends to existing children | Required for Pencil parity. |
| Same recommended component can be inserted repeatedly | Fill child id generation must create unique child ids | Required for Pencil parity. |

## Implementation Requirements

For Pencil parity, Composition should preserve these invariants:

1. Enabling a slot creates an empty recommendation list.
2. Disabling a slot removes or disables the slot metadata on the host.
3. Adding a recommendation should not create canvas children by itself.
4. Inserting a recommendation into a slot should create a `type: "ref"` child.
5. Inserted refs should be appended to the selected instance's
   `descendants[slotPath].children`.
6. Inserted refs should have stable unique ids even when they share the same
   `ref`.
7. Clearing a slot should remove only the instance-local slot fill entry.

## Current Code Anchors

- `apps/builder/src/builder/panels/properties/FrameSlotSection.tsx`
  - `handleAddRecommendation`: protects the recommendation list from duplicate
    reusable references.
  - `handleInsertDefault`: creates a new child ref under a concrete slot host.
- `apps/builder/src/builder/panels/properties/ComponentSlotFillSection.tsx`
  - `getFillNodeId`: generates unique child ids for repeated fills.
  - `handleFillSlot`: appends a new child to `descendants[slotPath].children`.
  - `handleClearSlot`: removes the selected slot's instance-local fill.

## Regression Tests To Keep

Keep tests for these cases:

- Repeated insert from the same recommendation creates two child refs.
- Repeated fill of the same selected slot appends, rather than replaces.
- Rapid repeated fill does not lose the first pending child.
- Recommendation registration still prevents duplicate recommendation entries.

## Broader Mapping Targets

| Pencil behavior | Composition target |
| --- | --- |
| Root `children` drive canvas and layers | Keep `childrenMap`/tree views derived from persisted element hierarchy. |
| `reusable` marks component masters | Avoid a separate component registry that can drift from document nodes. |
| `ref` instances carry overrides | Preserve canonical ref/master semantics and instance-local descendants. |
| `variables` resolve tokenized visual fields | Keep token references through storage, render, inspector, and export. |
| Symbolic sizing values | Do not collapse `fill_container`/`fit_content` equivalents into lossy CSS text. |
| Frame as layout group | Treat frame as the default grouping/container primitive, analogous to `div` + flex layout. |
| Omitted frame layout | Interpret as default horizontal/row layout unless explicit `layout: "none"` is present. |
| Theme dimension maps | Keep theme state separate from variable values. |
| Prompt nodes are canvas artifacts | Treat AI prompt/context data as document-level data when implementing parity features. |
| Scenegraph commit blocks | Group one user action into one undo entry. |
| Selection-driven inspector | Keep inspector sections conditional on selected node type and component status. |

## Gaps To Audit Before Claiming Full Parity

- Whether Composition's layer tree can represent reusable masters, refs, and
  instance descendants with the same visual distinction.
- Whether tokenized fill/stroke/font values round-trip without resolving to
  literals too early.
- Whether symbolic sizing values survive canvas, inspector, preview, and export
  paths.
- Whether prompt/context metadata has a durable file-format home.
- Whether slide/export behavior is frame-derived rather than maintained as a
  separate order list that can drift.

## Non-Goals

- Do not copy Pencil's UI source or minified runtime code.
- Do not mirror Pencil's private variable names, class names, or bundled code
  structure.
- Do not store Pencil `.pen` examples verbatim as fixtures.
