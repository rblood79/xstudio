---
title: Reference Implementations
impact: HIGH
impactDescription: 참조 구현 = 일관된 패턴, 빠른 온보딩
tags: [architecture, reference, patterns]
---

새 기능 구현 시 참조할 모범 구현 파일 목록입니다.

## 컴포넌트 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| React-Aria 컴포넌트 | `src/builder/components/dialog/AddPageDialog.tsx` | Modal + Form 조합 |
| tv() 스타일링 | `src/builder/components/buttons/Button.tsx` | tailwind-variants 패턴 |
| 복합 컴포넌트 | `src/builder/panels/properties/PropertyPanel.tsx` | 다중 섹션 구성 |

## Canvas/PIXI 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| PIXI 컴포넌트 | `src/builder/workspace/canvas/ui/PixiButton.tsx` | Canvas UI 표준 |
| Selection Overlay | `src/builder/workspace/canvas/selection/SelectionOverlay.tsx` | 선택 오버레이 |
| Viewport Transform | `src/builder/workspace/canvas/viewport/ViewportManager.ts` | 줌/팬 처리 |

## Store 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| Zustand 슬라이스 | `src/builder/stores/slices/elementsSlice.ts` | StateCreator 패턴 |
| 인덱스 관리 | `src/builder/stores/utils/elementIndexer.ts` | O(1) 인덱싱 |
| 히스토리 통합 | `src/builder/stores/utils/elementUpdate.ts` | History 기록 패턴 |

## 서비스 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| Supabase 서비스 | `src/services/projects/projectService.ts` | 서비스 모듈 패턴 |
| TanStack Query 훅 | `src/services/projects/useProjects.ts` | 쿼리 훅 패턴 |

## Factory 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| 컴포넌트 생성 | `src/builder/factories/ComponentFactory.ts` | 복합 컴포넌트 생성 |
| 요소 생성 파이프라인 | `src/builder/factories/utils/elementCreation.ts` | 생성 유틸리티 |

## 메시징 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| iframe Messenger | `src/utils/dom/iframeMessenger.ts` | Origin 검증 + 버퍼링 |
| Delta Messenger | `src/builder/utils/canvasDeltaMessenger.ts` | Delta 동기화 |
| Message Handler | `src/preview/messaging/messageHandler.ts` | 메시지 타입 정의 |

## 테스트 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| Storybook 스토리 | `src/builder/components/buttons/Button.stories.tsx` | 스토리 구성 |
| Vitest 유닛 테스트 | `src/utils/__tests__/elementUtils.test.ts` | 유닛 테스트 |

## 사용법

```typescript
// 새 컴포넌트 생성 시
// 1. 참조 파일 확인
// 2. 동일한 패턴 적용
// 3. 관련 규칙 준수

// 예: 새 Dialog 컴포넌트
// 참조: AddPageDialog.tsx
// 규칙: react-aria-hooks-required, style-tv-variants
```

## ADR 참조

아키텍처 결정 배경은 다음 문서 참조:
- `docs/adr/001-state-management.md` - Zustand 선택 이유
- `docs/adr/002-styling-approach.md` - ITCSS + tv() 선택 이유
- `docs/adr/003-canvas-rendering.md` - PixiJS 선택 이유
- `docs/adr/004-preview-isolation.md` - iframe 격리 이유
