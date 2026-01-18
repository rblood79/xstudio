# ADR-002: ITCSS + tailwind-variants for Styling

**Status:** Accepted
**Date:** 2024-01-01
**Decision Makers:** XStudio Team

## Context

XStudio는 두 가지 영역의 스타일링이 필요합니다:
1. **Builder UI**: 에디터 인터페이스 (Header, Sidebar, Inspector)
2. **Preview**: 사용자가 만드는 컴포넌트 (테마 커스터마이징 가능)

## Decision

- **ITCSS (Inverted Triangle CSS)**: CSS 아키텍처
- **tailwind-variants (tv())**: 컴포넌트 스타일 생성
- **CSS Variables**: 테마 토큰 시스템
- **@layer**: CSS 우선순위 관리

## Alternatives Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| CSS Modules | 스코프 격리 | 동적 스타일 어려움 |
| Styled Components | CSS-in-JS 유연성 | 런타임 오버헤드 |
| Tailwind @apply | 익숙함 | v4에서 금지됨 |
| tailwind-variants | 타입 안전, 조건부 스타일 | 학습 필요 |

## Rationale

1. **테마 분리**: Builder(`--builder-*`)와 Preview(`--action-*`) 토큰 분리
2. **@apply 금지**: Tailwind v4 호환성
3. **tv() 장점**: 타입 안전한 variants, 조건부 스타일
4. **@layer 필수**: CSS 우선순위 충돌 방지

## ITCSS Layer Structure

```css
@layer dashboard;        /* Lowest priority */
@layer builder-system;   /* Builder UI */
@layer preview-system;   /* Preview components */
@layer shared-tokens;    /* Common tokens */
@layer base;             /* Base styles */
@layer components;       /* React Aria components */
@layer utilities;        /* Highest priority */
```

## Consequences

### Positive
- 예측 가능한 CSS 우선순위
- Builder/Preview 스타일 완전 분리
- 테마 커스터마이징 용이

### Negative
- @layer 이해 필요
- CSS 파일 구조 학습 곡선

## Implementation

```typescript
// tv() 사용
const button = tv({
  base: 'react-aria-Button',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
    },
  },
});

// CSS 파일
@layer components {
  .react-aria-Button.primary {
    background: var(--action-primary-bg);
  }
}
```

## References

- `docs/reference/components/CSS_ARCHITECTURE.md` - ITCSS 상세
- `apps/builder/src/builder/styles/` - 스타일 디렉토리
- `.claude/skills/xstudio-patterns/rules/style-*.md` - 관련 규칙
