---
title: Use Zustand Factory Pattern
impact: HIGH
impactDescription: 타입 안전성, 미들웨어 호환, 모듈화
tags: [zustand, state, architecture]
---

Zustand 스토어 생성 시 StateCreator를 사용한 팩토리 패턴을 적용합니다.

## Incorrect

```tsx
// ❌ 직접 create 호출
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

## Correct

```tsx
// ✅ StateCreator 팩토리 패턴
import { create, StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CounterState {
  count: number;
  increment: () => void;
}

const createCounterSlice: StateCreator<
  CounterState,
  [['zustand/devtools', never], ['zustand/persist', unknown]]
> = (set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
});

export const useCounterStore = create<CounterState>()(
  devtools(
    persist(createCounterSlice, { name: 'counter-storage' }),
    { name: 'CounterStore' }
  )
);
```
