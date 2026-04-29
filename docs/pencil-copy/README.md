# Pencil Compatibility Notes

This directory is a clean-room compatibility dossier for the locally installed
Pencil desktop app. It is intentionally not a source-code copy, decompile, or
reconstruction of Pencil.

## Boundary

- Do not store extracted Pencil source, minified bundles, or large verbatim
  `.pen` payloads here.
- Store observed behavior, schema contracts, and Composition implementation
  mapping only.
- Use synthetic fixtures for tests and examples.
- When checking the installed app again, record the app version and the exact
  observed behavior instead of copying implementation code.

## Local App Snapshot

Observed local install:

| Field | Value |
| --- | --- |
| App path | `/Applications/Pencil.app` |
| Bundle identifier | `dev.pencil.desktop` |
| Version | `1.1.53` |
| App archive | `/Applications/Pencil.app/Contents/Resources/app.asar` |

The GUI automation attempt through Computer Use failed with macOS Apple Event
authorization error `-10000`. The current notes therefore rely on installed
bundle metadata, bundled `.pen` documents, and static behavior signatures.

## Files

| File | Purpose |
| --- | --- |
| [slot-model.md](slot-model.md) | Slot and descendants behavior contract. |
| [composition-mapping.md](composition-mapping.md) | Current Composition parity mapping. |
| [observations.md](observations.md) | Local Pencil app observations and evidence summary. |
| [fixtures/slot-fill.synthetic.json](fixtures/slot-fill.synthetic.json) | Non-Pencil synthetic fixture for tests. |

## Current Verdict

For slot insertion, Composition should match Pencil's split model:

1. `slot` is a recommendation/allow-list on a frame-like reusable node.
2. Actual slot fill content is stored on the instance under
   `descendants[slotId].children`.
3. Adding a recommended component to a slot appends a new child instance.
4. Repeating the same recommended component is valid; it creates distinct
   child nodes with the same `ref`.
5. The recommendation list itself should remain set-like and should not need
   duplicate entries.

