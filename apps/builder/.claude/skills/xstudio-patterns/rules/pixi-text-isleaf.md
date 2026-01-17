---
title: Use isLeaf for Text Components
impact: HIGH
impactDescription: 텍스트 측정 정확성, 레이아웃 계산
tags: [pixi, layout, text]
---

Text 컴포넌트에 isLeaf={true}를 설정하여 레이아웃이 텍스트 크기를 올바르게 계산하도록 합니다.

## Incorrect

```tsx
// ❌ isLeaf 없이 Text 사용
<Container style={{ width: 'auto' }}>
  <Text text="Hello World" style={{ fontSize: 16 }} />
</Container>
// 컨테이너 크기가 0으로 계산될 수 있음

// ❌ 컨테이너로 Text 감싸기
<Container>
  <Container>
    <Text text="Nested" />
  </Container>
</Container>
```

## Correct

```tsx
// ✅ isLeaf로 텍스트 크기 측정 활성화
<Container style={{ width: 'auto', height: 'auto' }}>
  <Text
    text="Hello World"
    isLeaf={true}
    style={{
      fontSize: 16,
      fill: '#000000'
    }}
  />
</Container>

// ✅ PixiText 래퍼 컴포넌트 생성
interface PixiTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

function PixiText({ text, fontSize = 14, color = '#000' }: PixiTextProps) {
  return (
    <Text
      text={text}
      isLeaf={true}
      style={{
        fontSize,
        fill: color,
        fontFamily: 'Inter, sans-serif'
      }}
    />
  );
}
```
