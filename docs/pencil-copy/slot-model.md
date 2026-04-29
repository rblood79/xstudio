# Pencil Slot Model

## Concepts

Pencil separates slot definition from slot fill content.

| Concept | Stored on | Meaning |
| --- | --- | --- |
| `slot` | reusable frame-like node | Candidate component references that may be inserted into this position. |
| `descendants` | component instance/ref node | Instance-level overrides and filled slot children. |
| `descendants[slotId].children` | component instance/ref node | Actual nodes inserted into a named slot of the referenced component. |

## Slot Definition

A slot host is a frame inside a reusable component. Its `slot` property is an
array of reusable component references. The array behaves like an available
component list, not like the actual inserted children.

Observed properties:

- Slot hosts can have an empty `slot` array.
- Non-empty slot arrays list reusable component references.
- Bundled Pencil samples did not show duplicate entries inside a `slot` array.
- A slot with one recommended component can still be filled by multiple child
  instances of that same component.

## Slot Fill

When a component instance fills a slot, the fill is stored on the instance:

```json
{
  "type": "ref",
  "ref": "component-master-id",
  "descendants": {
    "slot-frame-id": {
      "children": [
        { "id": "child-1", "type": "ref", "ref": "recommended-component-id" },
        { "id": "child-2", "type": "ref", "ref": "recommended-component-id" }
      ]
    }
  }
}
```

The important behavior is append semantics. Filling a slot again adds another
child to `children`; it does not replace the existing child and it does not
block solely because the same `ref` already exists.

## Duplicate Semantics

Pencil's observed model distinguishes two duplicate cases:

| Case | Expected behavior |
| --- | --- |
| Duplicate recommendation in `slot` | Avoid. The recommendation list is set-like. |
| Duplicate inserted `ref` in `descendants[slotId].children` | Allow. Each insertion is a distinct child instance. |

This means UI logic should prevent adding the same recommendation twice, but
must not prevent inserting the same recommended component into a slot multiple
times.

## Slot Host Eligibility

Observed behavior signatures in the installed app indicate:

- A frame can become a slot when it is inside a reusable component ancestry.
- Slot instances are special: children can be inserted into a component
  instance's slot even when ordinary component instance descendants are not
  directly editable.
- Slot insertion should target the selected instance's `descendants`, not mutate
  the reusable master children.

