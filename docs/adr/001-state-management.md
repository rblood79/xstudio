# ADR-001: Zustand for State Management

**Status:** Accepted
**Date:** 2024-01-01
**Decision Makers:** XStudio Team

## Context

XStudio Builder는 복잡한 상태 관리가 필요합니다:
- 수천 개의 Element 트리 관리
- 실시간 Selection/Multi-selection
- Undo/Redo 히스토리
- Canvas 뷰포트 상태 (zoom, pan)
- 패널 레이아웃 상태

## Decision

**Zustand**를 주요 상태 관리 라이브러리로 선택합니다.

## Alternatives Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| Redux Toolkit | 풍부한 생태계, DevTools | 보일러플레이트, 번들 크기 |
| Jotai | 원자적 상태, 작은 크기 | 복잡한 파생 상태 어려움 |
| Zustand | 간결한 API, 작은 번들, 슬라이스 패턴 | 상대적으로 작은 생태계 |
| MobX | 자동 추적, 반응형 | 프록시 오버헤드, 학습 곡선 |

## Rationale

1. **성능**: 선택적 구독으로 불필요한 리렌더링 방지
2. **슬라이스 패턴**: 대규모 스토어를 모듈화 가능
3. **번들 크기**: ~1KB (gzipped)
4. **TypeScript**: 우수한 타입 추론
5. **미들웨어**: persist, devtools 등 필요한 기능 지원

## Consequences

### Positive
- 간결한 코드로 복잡한 상태 관리
- HMR 지원으로 개발 경험 향상
- Map 기반 O(1) 인덱싱과 자연스럽게 통합

### Negative
- Redux DevTools보다 제한적인 디버깅
- 복잡한 비동기 로직은 별도 처리 필요

## Implementation

```typescript
// 슬라이스 패턴
export const useStore = create<Store>()((...args) => ({
  ...createElementsSlice(...args),
  ...createSelectionSlice(...args),
  ...createSettingsSlice(...args),
}));
```

## References

- `apps/builder/src/builder/stores/index.ts` - 스토어 정의
- `apps/builder/src/builder/stores/elements.ts` - Elements 슬라이스
- `.claude/skills/xstudio-patterns/rules/zustand-*.md` - 관련 규칙
