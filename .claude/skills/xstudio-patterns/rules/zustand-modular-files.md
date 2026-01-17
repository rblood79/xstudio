---
title: Modular Zustand Store Files
impact: HIGH
impactDescription: 코드 분리, 유지보수성, 테스트 용이성
tags: [zustand, state, architecture]
---

슬라이스별로 파일을 분리하고 index.ts에서 조합합니다.

## Incorrect

```tsx
// ❌ 모든 상태를 하나의 파일에
// stores/store.ts
const useStore = create((set) => ({
  // 사용자 상태
  user: null,
  setUser: (user) => set({ user }),

  // UI 상태
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // 프로젝트 상태
  projects: [],
  addProject: (p) => set((s) => ({ projects: [...s.projects, p] })),

  // ... 수백 줄의 코드
}));
```

## Correct

```tsx
// ✅ 슬라이스별 파일 분리
// stores/slices/userSlice.ts
export interface UserSlice {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const createUserSlice: StateCreator<StoreState, [], [], UserSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }, false, 'setUser'),
});

// stores/slices/uiSlice.ts
export interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, 'toggleSidebar'),
});

// stores/index.ts
import { createUserSlice } from './slices/userSlice';
import { createUISlice } from './slices/uiSlice';

type StoreState = UserSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools((...a) => ({
    ...createUserSlice(...a),
    ...createUISlice(...a),
  }))
);
```
