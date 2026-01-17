---
title: Avoid flex + Percentage Height Combination
impact: MEDIUM-HIGH
impactDescription: 레이아웃 버그 방지, 예측 가능한 크기
tags: [pixi, layout, flexbox]
---

flex 레이아웃에서 percentage height를 사용하면 예상치 못한 결과가 발생합니다.

## Incorrect

```tsx
// ❌ flex 컨테이너에서 % 높이 사용
<Container style={{ display: 'flex', height: '100%' }}>
  <Container style={{ height: '50%' }} />  // 계산 오류 발생 가능
</Container>

// ❌ 중첩 flex에서 % 크기
<Container style={{ flexDirection: 'column', height: 500 }}>
  <Container style={{ flex: 1, height: '100%' }}>  // 충돌
    <Child />
  </Container>
</Container>
```

## Correct

```tsx
// ✅ flex 속성 사용
<Container style={{ display: 'flex', height: 500 }}>
  <Container style={{ flex: 1 }} />  // 50%
  <Container style={{ flex: 1 }} />  // 50%
</Container>

// ✅ 고정 크기 또는 flex 조합
<Container style={{ flexDirection: 'column', height: 500 }}>
  <Container style={{ height: 100 }}>Header</Container>
  <Container style={{ flex: 1 }}>Content (자동 계산)</Container>
  <Container style={{ height: 50 }}>Footer</Container>
</Container>

// ✅ absolute 포지션에서만 % 사용
<Container style={{ position: 'relative', width: 400, height: 300 }}>
  <Container style={{
    position: 'absolute',
    width: '100%',
    height: '50%',  // 부모 기준으로 정확히 계산됨
    top: 0
  }} />
</Container>
```
