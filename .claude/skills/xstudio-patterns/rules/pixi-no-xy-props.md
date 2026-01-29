---
title: Never Use x/y Props in PIXI Layout
impact: CRITICAL
impactDescription: 레이아웃 시스템 충돌 방지, 일관된 배치
tags: [pixi, layout, canvas]
---

@pixi/layout 사용 시 x/y props를 사용하지 않습니다. 레이아웃 시스템이 위치를 관리합니다.

## Incorrect

```tsx
// ❌ x, y 직접 설정
<Container x={100} y={50}>
  <PixiButton label="Click" />
</Container>

// ❌ position 객체로 설정
<Sprite texture={tex} position={{ x: 10, y: 20 }} />
```

## Correct

```tsx
// ✅ Flex 레이아웃으로 배치
<Container style={{
  display: 'flex',
  flexDirection: 'row',
  gap: 10,
  marginLeft: 100,
  marginTop: 50,
}}>
  <PixiButton label="Click" />
</Container>

// ✅ Block 레이아웃 (수직 쌓임, width 100% 기본값)
<Container style={{ display: 'block' }}>
  <Container style={{ height: 100 }} />
  <Container style={{ height: 200 }} />
</Container>

// ✅ Grid 레이아웃
<Container style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
}}>
  <Container />
  <Container />
</Container>

// ✅ position: 'absolute'와 함께만 직접 위치 지정
<Container style={{ position: 'relative', width: '100%', height: '100%' }}>
  <Sprite
    texture={tex}
    style={{
      position: 'absolute',
      left: 10,
      top: 20
    }}
  />
</Container>
```

> **참고**: display에 따라 하이브리드 레이아웃 엔진이 자동 선택됩니다.
> block/inline-block → BlockEngine, flex → FlexEngine(Yoga), grid → GridEngine.
> 자세한 내용은 [pixi-hybrid-layout-engine](pixi-hybrid-layout-engine.md) 참조.
