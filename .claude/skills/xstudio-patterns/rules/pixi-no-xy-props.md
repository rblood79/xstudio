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
// ✅ 레이아웃 시스템으로 배치
<Container style={{
  marginLeft: 100,
  marginTop: 50,
  flexDirection: 'row',
  gap: 10
}}>
  <PixiButton label="Click" />
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
