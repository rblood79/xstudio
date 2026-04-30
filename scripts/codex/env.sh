#!/usr/bin/env bash
# Shared helpers for Codex harness scripts.

set -euo pipefail

codex_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

codex_activate_env() {
  if command -v mise >/dev/null 2>&1; then
    eval "$(mise hook-env -s bash 2>/dev/null || mise hook-env 2>/dev/null || true)"
    export CODEX_MISE_STATUS="active"
  else
    export CODEX_MISE_STATUS="not-installed"
  fi
}

codex_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
    return
  fi

  echo "[codex] pnpm not found. Install pnpm or enable corepack." >&2
  return 127
}

codex_changed_files() {
  {
    git diff --name-only --diff-filter=ACMR 2>/dev/null || true
    git diff --name-only --cached --diff-filter=ACMR 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | sed '/^$/d' | sort -u
}
