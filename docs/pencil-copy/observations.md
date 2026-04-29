# Local Pencil Observations

## Method

The installed app was checked locally from `/Applications/Pencil.app`.
`Info.plist` identified the app as `Pencil`, bundle identifier
`dev.pencil.desktop`, version `1.1.53`.

The app archive at `Contents/Resources/app.asar` contained bundled `.pen`
documents and an editor bundle. The analysis used targeted extraction of
document/schema evidence and static behavior signatures. No extracted source
code is stored in this directory.

## Bundled `.pen` Summary

The bundled documents use `.pen` schema versions `2.6` and `2.8`. The samples
include slot-bearing libraries and examples with reusable components,
component refs, and descendant overrides.

Observed aggregate facts:

| Fact | Observation |
| --- | --- |
| Slot-bearing bundled documents | Present across Halo, Lunaris, Nitro, Shadcn, and welcome files. |
| Slot hosts per library/sample | Commonly 11 slot hosts in the checked bundled documents. |
| Empty slots | Present. |
| Non-empty slots | Present. |
| Duplicate entries inside `slot` arrays | Not observed in bundled samples. |
| `descendants[*].children` with multiple children | Observed. |
| Multiple refs under one slot fill | Observed. |
| Same `ref` repeated under one slot fill | Observed in welcome documents. |

## High-Signal Slot Cases

Observed examples from bundled Pencil data:

- A page-number slot defines multiple recommendations while previous/next
  button refs nearby use `descendants` for instance-local overrides.
- A sidebar-content slot defines three recommendations, while an instance fills
  that slot with five child refs and repeats one of the recommended refs three
  times.
- A data-table-content slot defines one recommendation, while an instance fills
  that slot with five child refs all pointing to the same recommended ref.

These cases establish that Pencil does not interpret a slot recommendation as
"insert at most once". A recommendation is a candidate source. The actual fill
array can contain repeated child instances.

## Static Behavior Signatures

The installed editor bundle contains behavior signatures consistent with the
data model:

- Frame nodes expose slot state separately from child nodes.
- A frame can be a slot when it belongs to reusable ancestry.
- Slot instances are allowed to accept inserted children even where ordinary
  component instance descendants are guarded.
- The component/slot panel computes available components from the slot
  recommendation list and creates new instances from selected reusable
  components.

These signatures support the same conclusion as the `.pen` data: slot fill is
append-oriented and instance-local.

## Limitation

GUI automation was not completed because the local Computer Use bridge was not
authorized for Apple Events and returned `-10000`. The current evidence is
therefore based on local app metadata, bundled documents, and static behavior
signatures.

