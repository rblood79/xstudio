---
title: Use Correct Display Mode for Hybrid Layout Engine
impact: CRITICAL
impactDescription: 올바른 레이아웃 엔진 선택, CSS 호환 배치
tags: [pixi, layout, canvas, hybrid-engine]
---

하이브리드 레이아웃 엔진은 `display` 값에 따라 자동으로 엔진을 선택합니다.
올바른 display를 지정해야 CSS와 동일한 배치 결과를 얻을 수 있습니다.

### 엔진 선택 규칙

| display 값 | 엔진 | 설명 |
|------------|------|------|
| `block` (기본값) | BlockEngine | 수직 쌓임, width 100%, margin collapse |
| `inline-block` | BlockEngine | 가로 배치, 줄바꿈, vertical-align |
| `flex` | FlexEngine (Yoga/@pixi/layout) | Flexbox 레이아웃 |
| `grid` | GridEngine | 2D 그리드 레이아웃 |
| `flow-root` | BlockEngine | BFC 생성 (margin collapse 차단) |

### 지원 CSS 속성

- **Box Model**: `boxSizing`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`
- **Overflow/BFC**: `overflow`, `overflowX`, `overflowY`
- **Typography**: `lineHeight`, `verticalAlign`
- **Visibility**: `visibility: hidden` (공간 유지, 렌더링 안 함)
- **Grid 자식**: `alignSelf`, `justifySelf`

## Incorrect

```tsx
// ❌ block 의도인데 flex로 워크어라운드
<Container style={{
  display: 'flex',
  flexDirection: 'column',
}}>
  <Container style={{ height: 100, marginBottom: 20 }} />
  <Container style={{ height: 100, marginTop: 30 }} />
  {/* flex에서는 margin collapse 안 됨 → 간격 50px */}
</Container>

// ❌ grid 자식에 flex용 alignSelf 사용
<Container style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
  <Container style={{ alignSelf: 'flex-end' }} />
</Container>

// ❌ blockification 무시 (flex 부모의 inline-block 자식)
<Container style={{ display: 'flex' }}>
  <Container style={{ display: 'inline-block', width: 100 }} />
  {/* flex/grid 부모의 자식은 자동 blockify → inline-block이 block으로 변환됨 */}
</Container>
```

## Correct

```tsx
// ✅ block 레이아웃: 수직 쌓임 + margin collapse
<Container style={{ display: 'block' }}>
  <Container style={{ height: 100, marginBottom: 20 }} />
  <Container style={{ height: 100, marginTop: 30 }} />
  {/* margin collapse → 간격 30px (큰 값) */}
</Container>

// ✅ inline-block: 가로 배치 + 줄바꿈
<Container style={{ display: 'block' }}>
  <Container style={{ display: 'inline-block', width: 150, height: 50 }} />
  <Container style={{ display: 'inline-block', width: 150, height: 80 }} />
  {/* 부모 너비에 따라 자동 줄바꿈, vertical-align 적용 */}
</Container>

// ✅ grid 자식에 올바른 self 정렬
<Container style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
  <Container style={{ justifySelf: 'center', alignSelf: 'end' }} />
</Container>

// ✅ BFC로 margin collapse 차단
<Container style={{ display: 'block' }}>
  <Container style={{ height: 100, marginBottom: 20 }} />
  <Container style={{ overflow: 'hidden', height: 100, marginTop: 30 }} />
  {/* BFC 요소는 margin collapse 안 함 → 간격 50px */}
</Container>

// ✅ box-sizing: border-box
<Container style={{
  width: 200,
  padding: 20,
  boxSizing: 'border-box',
  // content width = 200 - 40 = 160px
}} />
```

> **참고**: 레이아웃 엔진 상세 구현은 [LAYOUT_REQUIREMENTS.md](../../../../docs/LAYOUT_REQUIREMENTS.md) 참조.
