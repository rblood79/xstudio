# Pencil `.pen` Format Model

This document captures the installed Pencil sample format as a compatibility
model. It is based on bundled `.pen` files from Pencil `1.1.53`.

## Top-Level Shape

Observed top-level keys:

| Key | Meaning |
| --- | --- |
| `version` | Document schema version. Observed values: `2.6`, `2.8`. |
| `children` | Root scenegraph nodes. |
| `themes` | Theme dimensions such as mode names. |
| `variables` | Design tokens keyed by CSS-like variable names. |

Minimal documents may only contain `version` and `children`.

## Node Taxonomy

Observed node types across bundled samples:

| Type | Role |
| --- | --- |
| `frame` | Main container, layout box, component master, slot host, slide/page frame. Comparable to a `div` that can run auto-layout. |
| `text` | Text layer with content and typography fields. |
| `ref` | Component instance referencing a reusable node. |
| `icon_font` | Icon glyph backed by icon font metadata. |
| `path` | Vector path geometry. |
| `rectangle` | Shape primitive. |
| `ellipse` | Shape primitive. |
| `line` | Line primitive. |
| `prompt` | AI prompt node stored on canvas. |

The sample corpus was dominated by `frame`, `text`, and `ref` nodes. This is an
important modeling signal: Pencil libraries are mostly frame/text/ref graphs,
not opaque widgets.

## Common Node Fields

| Field | Meaning |
| --- | --- |
| `id` | Stable node id or path segment. |
| `type` | Node type discriminator. |
| `name` | Layer/component display name. |
| `x`, `y` | Local position. |
| `width`, `height` | Numeric or symbolic sizing value. |
| `children` | Child nodes for frame/group-like nodes. |
| `fill` | Paint value, token reference, or empty/complex paint payload. |
| `stroke` | Stroke object with alignment, thickness, color/fill, joins, caps. |
| `effect` | Effect object or array, observed primarily as shadow. |
| `layout` | Layout mode, commonly `vertical` or `none`. |
| `gap` | Layout spacing between children. |
| `padding` | Layout padding, often array shorthand. |
| `justifyContent`, `alignItems` | Layout alignment controls. |
| `cornerRadius` | Shape/frame radius, often tokenized. |
| `reusable` | Marks a node as a component master. |
| `ref` | Component master reference for `type: "ref"`. |
| `descendants` | Instance override map by descendant id/path. |
| `slot` | Recommendation list for a slot host frame. |
| `context` | Node-local text context. |
| `theme` | Theme selection on viewport/root nodes. |

## Sizing Values

Pencil mixes numeric values with symbolic size strings.

| Value shape | Meaning |
| --- | --- |
| number | Fixed size in document units. |
| `fill_container` | Stretch to parent/container. |
| `fill_container(n)` | Fill with a preferred or bounded dimension. |
| `fit_content` | Size to content. |
| `fit_content(n)` | Content-sized with a preferred/bounded dimension. |

Composition should not reduce these to plain CSS strings too early. They are
layout constraints and should remain semantic through the layout pipeline.

## Layout Model

Observed layout fields map to a compact auto-layout model:

| Field | Observed shape |
| --- | --- |
| `layout` | `horizontal`, `vertical`, or `none`. In bundled samples, omitted frame layout behaves like the default horizontal mode. |
| `gap` | Number. |
| `padding` | Number or array shorthand. |
| `alignItems` | Alignment keyword. |
| `justifyContent` | Alignment/distribution keyword. |
| `clip` | Boolean clipping behavior. |
| `layoutIncludeStroke` | Stroke-in-layout participation flag. |

Frame auto-layout is therefore the closest Pencil equivalent to:

```css
.frame {
  display: flex;
  flex-direction: row; /* default/implicit horizontal */
}

.frame[data-layout="vertical"] {
  flex-direction: column;
}

.frame[data-layout="none"] {
  display: block; /* children use manual local positions */
}
```

This CSS analogy is useful for Composition implementation, but the `.pen`
format should keep the semantic layout values rather than storing CSS strings.

Observed frame counts from bundled documents:

| Frame category | Count |
| --- | ---: |
| Total frame nodes | 2586 |
| Frames with children | 2431 |
| Frames with explicit layout field | 1139 |
| Explicit `layout: "vertical"` | 828 |
| Explicit `layout: "none"` | 311 |
| Omitted layout, default horizontal behavior | 1447 |
| Frames with flex-like fields (`gap`, `padding`, `alignItems`, `justifyContent`) | 1991 |

## Typography

Text nodes commonly store:

| Field | Meaning |
| --- | --- |
| `content` | Text content. |
| `fontFamily` | Font name or token reference. |
| `fontSize` | Numeric font size. |
| `fontWeight` | Numeric string or `normal`. |
| `lineHeight` | Unitless line-height multiplier. |
| `letterSpacing` | Numeric spacing. |
| `textAlign`, `textAlignVertical` | Text alignment. |
| `textGrowth` | Text sizing behavior. |

Observed font families include both explicit families and token references such
as `$--font-primary` and `$--font-secondary`.

## Variables And Themes

Variables are keyed by CSS-like names such as `--foreground` and
`--background`. Variable records use:

```json
{
  "type": "color",
  "value": [
    { "value": "#ffffff", "theme": { "Mode": "Light" } },
    { "value": "#000000", "theme": { "Mode": "Dark" } }
  ]
}
```

Theme dimensions are modeled separately, for example:

```json
{
  "themes": {
    "Mode": ["Light", "Dark"]
  }
}
```

UI fill/stroke/font fields can reference variables using `$--token-name`.

## Refs And Descendants

`type: "ref"` nodes reference reusable masters. Instance-local changes are
stored in `descendants`, keyed by descendant id/path:

```json
{
  "type": "ref",
  "ref": "master-id",
  "descendants": {
    "label-id": { "content": "Override text" },
    "slot-id": { "children": [{ "type": "ref", "ref": "child-master" }] }
  }
}
```

This is the main format bridge between reusable component UX and per-instance
editing.

## Prompt Nodes

Prompt nodes are stored in the document with:

| Field | Meaning |
| --- | --- |
| `model` | Target model or agent type. |
| `content` | Prompt text. |
| `x`, `y`, `width`, `height` | Canvas placement. |

This indicates that AI instructions are treated as first-class canvas artifacts,
not only transient chat messages.
