# Canvas Rendering Rule

Codex용 Canvas 렌더링 규칙 엔트리포인트입니다.

- 정본 상세: [legacy `.claude/rules/canvas-rendering.md`](../../.claude/rules/canvas-rendering.md)
- 상세 레퍼런스: [composition-patterns/reference/canvas-details.md](../skills/composition-patterns/reference/canvas-details.md)

핵심:

- 렌더링 변경은 Spec/CSS/Canvas 경로를 함께 본다
- 한 경로만 수정하고 다른 consumer를 방치하지 않는다
- 검증은 `cross-check` 스킬과 type-check를 함께 사용한다
