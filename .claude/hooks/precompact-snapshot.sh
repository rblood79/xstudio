#!/bin/bash
# PreCompact Context Snapshot — 컨텍스트 압축 직전 핵심 정보 재주입
# Anthropic Reference: "Context Engineering" — Just-in-time 컨텍스트 로딩

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== PreCompact Context Snapshot ==="
echo ""
echo "## Project: XStudio NoCode Builder"
echo ""
echo "## CRITICAL Rules"
echo "- No inline Tailwind → tv() + CSS files"
echo "- No \`any\` type → explicit types"
echo "- DirectContainer pattern → engine result x/y direct placement"
echo "- O(1) elementsMap lookup → no array traversal"
echo "- History before state change → Undo/Redo"
echo "- layoutVersion + 1 → on layout-affecting props change"
echo "- batchUpdateElementOrders() → single set() for order_num"
echo "- resolveToken() → no direct TokenRef in numeric ops"
echo ""
echo "## Pipeline: Memory→Index→History→DB→Preview→Rebalance"
echo "## Engines: Taffy WASM (Flex/Grid/Block), CanvasKit/Skia (render), PixiJS (events)"
echo ""
echo "## Session Protocol"
echo "- Read .claude/progress.md for current state"
echo "- Read .claude/agent-memory/{agent}/MEMORY.md for context"
echo "- Update progress.md when done"
echo "- Limit sub-agent output to 1,000-2,000 tokens (detail → files)"
echo ""

# progress.md 현재 상태 주입 (있으면)
PROGRESS_FILE="$PROJECT_DIR/progress.md"
if [ -f "$PROGRESS_FILE" ]; then
  echo "## Current Progress (from .claude/progress.md)"
  # 첫 40줄만 — 컨텍스트 절약
  head -40 "$PROGRESS_FILE"
  echo ""
fi

echo "## Key Files"
echo "- SKILL.md: .claude/skills/xstudio-patterns/SKILL.md"
echo "- Agents: .claude/agents/ (architect, implementer, evaluator, reviewer, debugger, documenter, refactorer, tester)"
echo "- Rules: .claude/rules/ (canvas-rendering, layout-engine, state-management, css-tokens, react-aria-skill)"
echo "=== End Snapshot ==="
