# Format To UI/UX Associations

This document maps `.pen` format fields to expected user-visible behavior.

## Core Association Matrix

| Format field | UI/UX surface | Required behavior |
| --- | --- | --- |
| `children` | Layers tree, canvas render order, slide order | Reordering children changes layer order and layout order. |
| `name` | Layers, inspector name field, component list | Inline rename updates all surfaces. |
| `enabled` | Layer visibility toggle, canvas visibility | Disabled nodes should be dimmed/hidden consistently. |
| `x`, `y` | Inspector geometry, canvas transform | Dragging updates local coordinates unless layout owns position. |
| `width`, `height` | Inspector size controls, layout engine | Symbolic sizing values must stay semantic. |
| `layout`, `gap`, `padding`, `alignItems`, `justifyContent` | Layout inspector and auto-layout rendering | Canvas and inspector must round-trip the same layout values. |
| `fill`, `stroke`, `effect`, `cornerRadius`, `opacity` | Appearance inspector and renderer | Token references and literal values both need support. |
| `font*`, `lineHeight`, `letterSpacing`, `textAlign` | Typography inspector and text renderer | Text measurement must respect the same fields. |
| `reusable` | Component badge/color, Components panel | Reusable nodes become component masters. |
| `ref` | Instance badge, detach/go-to-master actions | Instances should be visibly distinct from masters. |
| `descendants` | Instance override UI, slot fill UI | Instance edits should avoid mutating the master. |
| `slot` | Slot controls and recommended component picker | Slot recommendations should drive insert candidates. |
| `context` | Context inspector section and AI actions | Context is editable metadata on the node. |
| `themes` | Theme switcher | Theme dimensions should be selectable. |
| `variables` | Token/color/font controls | Token values must resolve by active theme. |
| `prompt` node | AI prompt panel/canvas annotation | Prompt artifacts can be selected, moved, and submitted. |

## UI State From Format

Pencil-style UI should be derived from the document, not duplicated in a hidden
registry.

| UI state | Derived from |
| --- | --- |
| Layer tree | Root `children` and nested `children`. |
| Component catalog | Nodes with `reusable: true`. |
| Component instance status | Nodes with `type: "ref"` and valid `ref`. |
| Available slot fills | Slot host `slot` list, resolved through reusable nodes. |
| Filled slot contents | Selected instance `descendants[slotPath].children`. |
| Theme mode | Root/current `theme` plus top-level `themes`. |
| Token palette | Top-level `variables`. |
| Slide list | Frame-like root children used as slide frames. |
| Export target | Current selection or slide frame list. |

## Layout Round-Trip Requirements

Composition should preserve these Pencil-compatible layout semantics:

1. `fill_container` and `fit_content` are not plain CSS strings; they are layout
   constraints.
2. Numeric `width`/`height` and symbolic `width`/`height` can coexist in one
   document.
3. Frame is the primary grouping/layout primitive, roughly equivalent to an
   HTML `div` with `display: flex`.
4. Omitted frame layout should be treated as default horizontal/row layout,
   not as "no layout".
5. `layout: "vertical"` maps to column layout.
6. `layout: "none"` still allows absolute/manual child placement.
7. Auto-layout fields should be ignored or inert when layout mode does not use
   them.
8. Stroke can participate in layout when `layoutIncludeStroke` is enabled.

## Component Round-Trip Requirements

Component UX depends on exact format preservation:

1. Creating a component should set `reusable: true` without changing visual
   children.
2. Inserting a component should create a `type: "ref"` instance, not clone the
   master as ordinary nodes.
3. Detaching an instance should preserve resolved visual properties and children.
4. Editing a normal descendant of an instance should write to `descendants`,
   unless the instance has explicitly overridden children.
5. Editing a slot descendant should write to `descendants[slotPath].children`.
6. Duplicate inserted refs under one slot are valid and must receive unique ids.

## Token And Theme Requirements

Token references appear in visual fields using `$--name` syntax. To match
Pencil:

- Store literal token references, not only resolved colors.
- Resolve token values by active theme at render time.
- Preserve variable records with multiple theme-specific values.
- Treat font tokens like color tokens when used in `fontFamily`.
- Allow documents without themes/variables to render using literals only.

## Editor Chrome Requirements

The format should support a UI that can:

- Select any document node and show relevant inspector sections.
- Rename through layer tree or inspector and keep one source of truth.
- Show component/reusable/instance visual markers from `reusable` and `ref`.
- Filter/search reusable components by name.
- Export selected layers or all slide frames.
- Preserve prompt nodes as document content.
