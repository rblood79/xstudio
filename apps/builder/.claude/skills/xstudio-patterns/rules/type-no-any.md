---
title: No any Types
impact: CRITICAL
impactDescription: 타입 안전성, 런타임 에러 방지, IDE 지원
tags: [typescript, type-safety]
---

`any` 타입 사용을 금지합니다. strict typing을 준수하세요.

## Incorrect

```tsx
// ❌ any 타입 사용
function processData(data: any) {
  return data.value;
}

const handler = (event: any) => {
  console.log(event.target.value);
};

// ❌ as any 캐스팅
const result = someValue as any;

// ❌ 암시적 any
function process(data) {  // 타입 누락
  return data;
}
```

## Correct

```tsx
// ✅ 명시적 타입 정의
interface DataType {
  value: string;
  count: number;
}

function processData(data: DataType): string {
  return data.value;
}

// ✅ 이벤트 타입 명시
const handler = (event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
};

// ✅ unknown + 타입 가드
function safeProcess(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}

// ✅ 제네릭 사용
function processGeneric<T extends { value: string }>(data: T): string {
  return data.value;
}
```
