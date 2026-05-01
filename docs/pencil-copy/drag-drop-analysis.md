# Pencil Drag And Drop Object Move Analysis

This document records a fresh local check of the installed Pencil desktop app.
It is a behavior summary only. It does not store extracted Pencil source,
minified bundle text, or verbatim `.pen` payloads.

## Recheck Scope

| Field                    | Observation                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| Recheck date             | 2026-05-01                                                         |
| Local app                | `/Applications/Pencil.app`                                         |
| Bundle identifier        | `dev.pencil.desktop`                                               |
| App version              | `1.1.53`                                                           |
| Archive                  | `/Applications/Pencil.app/Contents/Resources/app.asar`             |
| Measured archive SHA-256 | `ba0c429743018e820b39d4672e8eb0f9d95312a1549fc2a44476ea76ca600d90` |
| Editor bundle checked    | `/out/editor/assets/index.js` inside `app.asar`                    |
| GUI automation           | Not completed; Computer Use permissions remained pending.          |

The current pass re-read the installed app bundle directly instead of relying
on older extracted notes.

## Static Behavior Signals

The current editor bundle still contains drag-session state and layout-drop
signals for object movement:

| Signal                       | Count | Interpretation                                                            |
| ---------------------------- | ----: | ------------------------------------------------------------------------- |
| `deferredDropNode`           |     7 | A layout target can be remembered during drag and committed on exit/drop. |
| `deferredDropChildIndex`     |     7 | Layout insertion index is tracked with the deferred target.               |
| `findInsertionIndexInLayout` |     3 | Layout containers compute a child insertion index from pointer position.  |
| `findDropFrame`              |     2 | Cross-frame/container drop target search exists.                          |
| `changeParent`               |    24 | Reparenting is a first-class scenegraph operation.                        |
| `animateLayoutChange`        |     5 | Layout changes are animated after child movement/reorder.                 |
| `animateVisualOffset`        |     4 | Visual offsets are used to smooth movement back to the resolved layout.   |
| `renderOnTop`                |     5 | Dragged nodes are raised during interaction.                              |
| `moveNodes`                  |     2 | File/MCP-level node movement also routes through parent/index changes.    |

These signals are not enough to copy implementation details, but they are
enough to correct the high-level behavior model.

## Object Drag Session Model

The installed app does not look like a pure "store remains untouched until
drop" model. The stronger reading is:

1. Drag start builds a session from the current selection.
2. The session captures each dragged node's parent, original index, x/y
   properties, and offset from the combined drag bounds.
3. Normal descendants of non-overridden component instances are excluded, while
   slot-instance descendants can still participate.
4. Guides and resize handles are disabled while dragging.
5. Pointer movement uses world/canvas coordinates, not screen-only coordinates.
6. During drag, Pencil performs transient scenegraph update blocks with
   `undo: false` for reorder/translation feedback.
7. The original snapshot is committed as the undoable user action on exit/drop.

So the deferred part is primarily the user-visible undo/history commit, not
necessarily every internal scenegraph mutation.

## Same-Container Layout Reorder

When the drag starts inside a layout container and the cursor remains inside
that same container:

1. The container computes an insertion index with
   `findInsertionIndexInLayout`.
2. Dragged nodes are marked to render on top.
3. Parent/index changes can be applied during the drag in a transient
   `undo: false` block.
4. Layout changes are animated, and dragged nodes keep a visual offset so they
   follow the pointer instead of snapping immediately to final layout position.

This means same-container reorder is not purely deferred until pointerup. It is
temporarily reflected in the live scenegraph for feedback, then represented as
one undoable user action.

## Cross-Container And Layout Drop

When the cursor leaves the starting container:

1. Pencil searches for an acceptable frame/container at the pointer location.
2. Candidate targets must accept the dragged nodes. Frame size and child
   acceptance checks are part of the target search.
3. If the target has layout behavior, or is a slot instance, and the dragged
   nodes affect layout, Pencil records `deferredDropNode` and
   `deferredDropChildIndex`.
4. While such a layout target is pending, the dragged nodes continue to move as
   floating content.
5. On exit/drop, Pencil changes the dragged nodes' parent to the deferred target
   and clamps/applies the deferred child index.

For non-layout movement, the session can translate nodes into the current
target during drag with transient scenegraph updates.

## Drop Indicator And Feedback

The installed app has explicit visual feedback for layout drop:

1. The deferred target frame is outlined in a zoom-scaled stroke.
2. If a child insertion index is present, an insertion line is drawn between
   neighboring children.
3. Horizontal and vertical layout directions choose different insertion-line
   axes.
4. Layout changes are animated through visual offsets that ease back to zero.
5. Connections are redrawn during drag movement.

The visual model is therefore a combination of floating dragged nodes, target
highlight, insertion line, and layout animation.

## Corrected Conclusions

Earlier summaries that say "dragging may defer parent changes until drop" are
directionally useful but too broad. The current installed app supports this
more precise model:

1. Pencil keeps one user-level undo/history intent for the drag.
2. Pencil can still mutate the live scenegraph during drag with non-undoable
   transient blocks.
3. Same-container layout reorder may update parent/index during drag.
4. Cross-container layout drop uses a deferred target/index before finalizing.
5. Slot-instance descendants are treated differently from ordinary guarded
   instance descendants.

For Composition parity, avoid claiming that Pencil has zero internal mutation
during drag. The safer contract is: transient drag feedback may update a live
interaction scenegraph, but persistence/history should collapse the whole drag
into one user action.

## Composition Implications

1. Keep transient drag feedback separate from persisted/history state.
2. Use scene/world-space bounds for target search and insertion index.
3. Preserve one undo/history entry per completed drag.
4. For layout reorder, support a live gap/insertion feedback path rather than
   waiting until pointerup to show all movement.
5. For cross-container layout drop, keep explicit target and child-index state
   until drop.
6. Respect component-instance guards, with a slot-instance exception where
   Pencil allows child movement/editing.
