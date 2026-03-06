# 서브에이전트 위임 가이드라인

Spec 파일 일괄 수정 등 병렬 에이전트(Task tool)에 작업을 위임할 때, 아래 규칙을 프롬프트에 **반드시** 포함하세요.

## 수정 금지 패턴 (Protected Patterns)

서브에이전트 프롬프트에 다음을 명시:

```
⚠️ 수정 금지 패턴 — 아래 코드는 절대 변경/삭제/이동하지 마세요:

1. _hasChildren 패턴: 아래 코드 블록을 삭제, 이동, 조건 변경하지 마세요.
   const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
   if (hasChildren) return shapes;

2. CHILD_COMPOSITION_EXCLUDE_TAGS 관련 로직

3. ElementSprite.tsx의 _hasChildren 주입 로직 (2단계 평가)

4. rearrangeShapesForColumn / SPEC_RENDERS_ALL_TAGS_SET 가드 로직

5. TAG_SPEC_MAP 등록 로직 (child spec 렌더링 경로)

요청된 수정 범위만 정확히 수행하고, 그 외 로직은 건드리지 마세요.
```

## 위임 프롬프트 템플릿

```markdown
## 작업 범위

[구체적 수정 내용만 기술]

## 수정 대상 파일

[파일 목록]

## 수정 패턴

[Before → After 예시 코드]

## ⚠️ 수정 금지

- `_hasChildren` 체크 코드 (삭제/이동/변경 금지)
- `COMPLEX_COMPONENT_TAGS` 관련 로직
- shapes 함수의 early return 구조
- 요청 범위 외 리팩토링
```

## 위임 시 체크리스트

| 항목              | 설명                                              |
| ----------------- | ------------------------------------------------- |
| 범위 한정         | "fontSize만 수정", "import만 추가" 등 명시적 범위 |
| 금지 패턴 포함    | 위 수정 금지 패턴을 프롬프트에 복사               |
| Before/After 예시 | 정확한 변경 패턴을 코드로 제시                    |
| 검증 지시         | `npx tsc --noEmit` 타입 체크 수행 지시            |
