# ADR-003: PixiJS for Canvas Rendering

**Status:** Accepted
**Date:** 2024-01-01
**Decision Makers:** XStudio Team

## Context

XStudio Builder는 시각적 캔버스 에디터가 필요합니다:
- 수백~수천 개의 요소 렌더링
- 60fps 인터랙션 (드래그, 리사이즈, 선택)
- 줌/팬 뷰포트 변환
- 선택 오버레이, 가이드라인

## Decision

**PixiJS 8 + @pixi/layout + @pixi/react**를 캔버스 렌더링에 사용합니다.

## Alternatives Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| DOM + CSS Transform | 단순함, 접근성 | 대규모 요소 성능 저하 |
| Canvas 2D | 가벼움 | 인터랙션 구현 복잡 |
| PixiJS | WebGL 성능, 풍부한 API | 학습 곡선 |
| Three.js | 3D 지원 | 2D 에디터에 과도함 |
| Konva | React 통합 좋음 | Canvas 2D 기반 한계 |

## Rationale

1. **WebGL 성능**: GPU 가속으로 수천 개 요소도 60fps
2. **@pixi/layout**: Yoga 기반 Flexbox 레이아웃
3. **@pixi/react**: React 선언적 문법 유지
4. **생태계**: 필터, 마스킹, 텍스처 등 풍부한 기능

## Key Constraints

### @pixi/layout 규칙
```typescript
// ❌ x/y props 금지
<Container x={100} y={50} />

// ✅ style 기반 레이아웃
<Container style={{ marginLeft: 100, marginTop: 50 }} />

// ✅ Text는 isLeaf 필수
<Text text="Hello" isLeaf />

// ✅ @pixi/layout 최우선 import
import '@pixi/layout';
import { Container, Text } from '@pixi/react';
```

## Consequences

### Positive
- 대규모 프로젝트에서도 부드러운 인터랙션
- Yoga 레이아웃으로 CSS-like 레이아웃
- React 패턴과 자연스러운 통합

### Negative
- 접근성 직접 구현 필요
- @pixi/layout 규칙 학습 필요
- 디버깅이 DOM보다 어려움

## Implementation

```typescript
import '@pixi/layout';
import { Stage, Container, Text } from '@pixi/react';

function BuilderCanvas() {
  return (
    <Stage>
      <Container style={{ display: 'flex', flexDirection: 'column' }}>
        <Container style={{ flex: 1 }}>
          <Text text="Content" isLeaf />
        </Container>
      </Container>
    </Stage>
  );
}
```

## References

- `apps/builder/src/builder/workspace/canvas/` - Canvas 구현
- `.claude/skills/xstudio-patterns/rules/pixi-*.md` - PIXI 규칙
- `docs/reference/components/PIXI_LAYOUT.md` - 레이아웃 상세
