#!/bin/bash
# =============================================================================
# ADR-017: M3 Token → Semantic/Tailwind Replacement Script
# =============================================================================
# CRITICAL: Execute replacements in longest-first order to prevent prefix collisions.
# var() wrapper acts as a natural boundary: var(--primary) won't match var(--primary-hover).
# For bare references (e.g. --primary: ...;), theme definitions are already deleted in Phase 1.
#
# Usage:
#   ./scripts/m3-token-replace.sh [--dry-run]
# =============================================================================

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY-RUN MODE: No files will be modified ==="
fi

# Target directories
TARGETS=(
  "packages/shared/src/components/styles"
  "apps/builder/src"
)

# Count variables
TOTAL_REPLACEMENTS=0
TOTAL_FILES=0

# Replacement function
replace_token() {
  local from="$1"
  local to="$2"
  local count=0

  for dir in "${TARGETS[@]}"; do
    if [[ ! -d "$dir" ]]; then
      continue
    fi

    while IFS= read -r -d '' file; do
      local matches
      matches=$(grep -c "var(${from})" "$file" 2>/dev/null || true)

      if [[ "$matches" -gt 0 ]]; then
        count=$((count + matches))

        if [[ "$DRY_RUN" == "true" ]]; then
          echo "  [DRY] $file: $matches occurrences of var(${from})"
        else
          # Use perl for reliable replacement (handles special chars in color-mix)
          perl -pi -e "s/var\\(${from}\\)/${to}/g" "$file"
        fi
      fi
    done < <(find "$dir" -name "*.css" -type f -print0)
  done

  if [[ "$count" -gt 0 ]]; then
    TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + count))
    echo "  ${from} → ${to}  ($count occurrences)"
  fi
}

echo ""
echo "=== ADR-017: M3 Token Replacement (longest-first order) ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Group 1: Compound tokens (longest first — prefix collision safe)
# ─────────────────────────────────────────────────────────────────
echo "--- Group 1: Compound tokens ---"

replace_token "--on-primary-container"       "var(--color-primary-900)"
replace_token "--on-secondary-container"     "var(--color-neutral-900)"
replace_token "--on-error-container"         "var(--color-error-900)"
replace_token "--on-tertiary-container"      "var(--color-tertiary-900)"
replace_token "--surface-container-highest"  "var(--color-neutral-200)"
replace_token "--surface-container-lowest"   "var(--color-white)"
replace_token "--surface-container-high"     "var(--overlay-background)"
replace_token "--surface-container-low"      "var(--color-neutral-50)"
replace_token "--primary-container"          "var(--color-primary-100)"
replace_token "--secondary-container"        "var(--color-neutral-100)"
replace_token "--tertiary-container"         "var(--color-tertiary-100)"
replace_token "--error-container"            "var(--color-error-100)"

# ─────────────────────────────────────────────────────────────────
# Group 2: Variant tokens (medium length)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Group 2: Variant tokens ---"

replace_token "--on-surface-variant"  "var(--text-color-placeholder)"
replace_token "--outline-variant"     "var(--border-color)"

# ─────────────────────────────────────────────────────────────────
# Group 3: State tokens (hover/pressed)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Group 3: State tokens ---"

replace_token "--primary-hover"     "color-mix(in srgb, var(--highlight-background) 85%, black)"
replace_token "--primary-pressed"   "var(--highlight-background-pressed)"
replace_token "--secondary-hover"   "color-mix(in srgb, var(--button-background) 85%, black)"
replace_token "--secondary-pressed" "color-mix(in srgb, var(--button-background) 75%, black)"
replace_token "--error-hover"       "color-mix(in srgb, var(--invalid-color) 85%, black)"
replace_token "--error-pressed"     "color-mix(in srgb, var(--invalid-color) 75%, black)"
replace_token "--tertiary-hover"    "color-mix(in srgb, var(--color-purple-600) 85%, black)"
replace_token "--tertiary-pressed"  "color-mix(in srgb, var(--color-purple-600) 75%, black)"

# ─────────────────────────────────────────────────────────────────
# Group 4: Base tokens (shortest last — prefix collision safe
#           because longer variants already replaced above)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Group 4: Base tokens ---"

replace_token "--on-surface"        "var(--text-color)"
replace_token "--surface-container" "var(--field-background)"
replace_token "--on-primary"        "var(--highlight-foreground)"
replace_token "--on-secondary"      "var(--color-white)"
replace_token "--on-error"          "var(--color-white)"
replace_token "--on-tertiary"       "var(--color-white)"
replace_token "--outline"           "var(--border-color-hover)"
replace_token "--primary"           "var(--highlight-background)"
replace_token "--secondary"         "var(--button-background)"
replace_token "--tertiary"          "var(--color-purple-600)"
replace_token "--error"             "var(--invalid-color)"

# ─────────────────────────────────────────────────────────────────
# Group 5: Misc tokens (low frequency)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Group 5: Misc tokens ---"

replace_token "--inverse-surface"    "var(--color-neutral-800)"
replace_token "--inverse-on-surface" "var(--color-neutral-100)"
replace_token "--inverse-primary"    "var(--color-primary-300)"
replace_token "--scrim"              "rgba(0, 0, 0, 0.32)"
replace_token "--surface-tint"       "var(--highlight-background)"
replace_token "--surface-variant"    "var(--color-surface-200)"
replace_token "--on-background"      "var(--text-color)"
replace_token "--background"         "var(--background-color)"
replace_token "--surface"            "var(--color-white)"

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────
echo ""
echo "=== Summary ==="
echo "Total replacements: ${TOTAL_REPLACEMENTS}"
echo ""

# ─────────────────────────────────────────────────────────────────
# Verification: Check for remaining M3 tokens
# ─────────────────────────────────────────────────────────────────
echo "=== Verification: Remaining M3 tokens ==="

M3_TOKENS="var(--primary)|var(--on-primary)|var(--secondary)|var(--on-secondary)|var(--tertiary)|var(--on-tertiary)|var(--error)|var(--on-error)|var(--on-surface)|var(--surface-container)|var(--outline-variant)|var(--outline[^-])|var(--surface[^-])|var(--inverse-)|var(--scrim)|var(--background[^-])|var(--on-background)"

REMAINING=0
for dir in "${TARGETS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    continue
  fi
  local_count=$(grep -rE "$M3_TOKENS" --include="*.css" "$dir" 2>/dev/null | grep -v "theme/preview-system.css" | grep -v "theme/builder-system.css" | wc -l | tr -d ' ')
  if [[ "$local_count" -gt 0 ]]; then
    echo "  REMAINING in $dir: $local_count"
    grep -rEn "$M3_TOKENS" --include="*.css" "$dir" 2>/dev/null | grep -v "theme/preview-system.css" | grep -v "theme/builder-system.css" | head -20
    REMAINING=$((REMAINING + local_count))
  fi
done

if [[ "$REMAINING" -eq 0 ]]; then
  echo "  ✓ No remaining M3 tokens found!"
else
  echo ""
  echo "  ⚠ WARNING: $REMAINING remaining M3 token references found."
  echo "  These need manual review."
fi

echo ""
echo "=== Done ==="
