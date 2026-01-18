---
title: Reference Implementations
impact: HIGH
impactDescription: 참조 구현 = 일관된 패턴, 빠른 온보딩
tags: [architecture, reference, patterns]
---

새 기능 구현 시 참조할 모범 구현 파일 목록입니다.

> **Note**: 모든 경로는 `apps/builder/src/` 기준입니다.

## 컴포넌트 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| React-Aria 컴포넌트 | `builder/components/dialog/AddPageDialog.tsx` | Modal + Form 조합 |
| 복합 컴포넌트 | `builder/panels/properties/PropertiesPanel.tsx` | 다중 섹션 구성 |

## Canvas/PIXI 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| PIXI 컴포넌트 | `builder/workspace/canvas/ui/PixiButton.tsx` | Canvas UI 표준 |
| Selection Layer | `builder/workspace/canvas/selection/SelectionLayer.tsx` | 선택 오버레이 |
| Viewport Control | `builder/workspace/canvas/viewport/ViewportController.ts` | 줌/팬 처리 |

## Store 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| Zustand 스토어 | `builder/stores/elements.ts` | Elements 상태 + 인덱싱 |
| 인덱스 관리 | `builder/stores/utils/elementIndexer.ts` | O(1) 페이지 인덱싱 |
| 요소 업데이트 | `builder/stores/utils/elementCreation.ts` | 생성 + 히스토리 패턴 |
| 히스토리 | `builder/stores/history.ts` | HistoryManager 싱글톤 |

## 서비스 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| API 서비스 | `services/api/ProjectsApiService.ts` | Supabase 서비스 래핑 |
| Base 서비스 | `services/api/BaseApiService.ts` | 공통 API 패턴 |
| 에러 핸들러 | `services/api/ErrorHandler.ts` | 에러 처리 유틸 |

## Factory 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| 컴포넌트 생성 | `builder/factories/ComponentFactory.ts` | 복합 컴포넌트 생성 |
| 요소 생성 유틸 | `builder/factories/utils/elementCreation.ts` | 생성 파이프라인 |

## 메시징 패턴

| 패턴 | 참조 파일 | 설명 |
|------|----------|------|
| iframe Messenger | `utils/dom/iframeMessenger.ts` | Origin 검증 + 버퍼링 |
| Delta Messenger | `builder/utils/canvasDeltaMessenger.ts` | Delta 동기화 |
| Message Handler | `preview/messaging/messageHandler.ts` | 메시지 타입 정의 |

## 사용법

```typescript
// 새 컴포넌트 생성 시
// 1. 참조 파일 확인 (apps/builder/src/ 기준)
// 2. 동일한 패턴 적용
// 3. 관련 규칙 준수

// 예: 새 Dialog 컴포넌트
// 참조: builder/components/dialog/AddPageDialog.tsx
// 규칙: react-aria-hooks-required, style-tv-variants
```

## ADR 참조

아키텍처 결정 배경은 다음 문서 참조:
- `docs/adr/001-state-management.md` - Zustand 선택 이유
- `docs/adr/002-styling-approach.md` - ITCSS + tv() 선택 이유
- `docs/adr/003-canvas-rendering.md` - PixiJS 선택 이유
- `docs/adr/004-preview-isolation.md` - iframe 격리 이유
