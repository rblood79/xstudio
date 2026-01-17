---
title: Explicit Return Types
impact: CRITICAL
impactDescription: 명확한 API 계약, 리팩토링 안전성
tags: [typescript, return-type]
---

함수의 반환 타입을 명시적으로 선언합니다.

## Incorrect

```tsx
// ❌ 반환 타입 누락
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ 화살표 함수 반환 타입 누락
const getUser = async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

// ❌ 복잡한 반환값 타입 추론 의존
function processElements(elements) {
  if (!elements.length) return null;
  return elements.map(el => ({ id: el.id, name: el.name }));
}
```

## Correct

```tsx
// ✅ 명시적 반환 타입
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ 화살표 함수 반환 타입
const getUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

// ✅ 복잡한 반환값 타입 명시
interface ProcessedElement {
  id: string;
  name: string;
}

function processElements(elements: Element[]): ProcessedElement[] | null {
  if (!elements.length) return null;
  return elements.map(el => ({ id: el.id, name: el.name }));
}

// ✅ 컴포넌트 반환 타입
function MyComponent({ title }: Props): React.ReactElement {
  return <div>{title}</div>;
}
```
