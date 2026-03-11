# Workspace Canvas Refactor Breakdown

## Purpose

이 문서는 [ADR-035](../adr/035-workspace-canvas-refactor.md)를 실행 가능한 작업 단위로 분해한 상세 플랜이다.

목표는 다음과 같다.

- 기존 동작 완전 유지
- 리팩토링 순서 명확화
- 각 phase의 코드 변경 경계와 검증 포인트 정의

---

## Execution Strategy

리팩토링은 아래 원칙으로 진행한다.

1. 먼저 giant file을 orchestration 파일과 구현 파일로 분리한다.
2. 그 다음 state source와 invalidation을 정리한다.
3. 마지막에 frame build pipeline과 runtime service를 재구성한다.

즉 순서는 다음과 같다.

1. `Workspace.tsx`
2. `BuilderCanvas.tsx`
3. `canvas/viewport/*` + `scrollbar/*`
4. `canvas/skia/SkiaOverlay.tsx`
5. `canvas/skia/nodeRenderers.ts`
6. `canvas/utils/cssVariableReader.ts`

---

## Phase 0. Baseline

### 목표

- 리팩토링 전후 행동 비교 기준 확보

### 작업

- 주요 시나리오 체크리스트 작성
- 성능 계측 지점 표준화
- debug logging 정리 기준 수립

### 검증

- breakpoint 변경
- compare mode
- zoom/pan
- lasso/selection/resize
- text edit
- workflow overlay
- image/font/theme 변경

---

## Phase 1. Workspace Shell 분해

### 목표

- `Workspace.tsx`를 shell orchestration 파일로 축소

### 1-1. 시각 섹션 분리

- `WorkflowCanvasToggles`
- compare mode render block
- status indicator block

### 1-2. shell 계산 분리

- breakpoint 기반 canvas size 계산
- container resize tracking
- initial centering / fit-mode 재센터링
- compare split drag state

### 1-3. 목표 파일 구조

```text
workspace/
  Workspace.tsx
  components/
    WorkflowCanvasToggles.tsx
    WorkspaceCompareMode.tsx
    WorkspaceStatusIndicator.tsx
  hooks/
    useWorkspaceCanvasSizing.ts
    useWorkspaceCompareSplit.ts
```

### 검증 포인트

- 비교 모드 UI 동일
- fallbackCanvas 경로 동일
- canvas size 계산 결과 동일
- status indicator 노출 조건 동일

---

## Phase 2. Viewport Runtime 정리

### 목표

- viewport authoritative state를 `ViewportController`로 수렴

### 작업

- `useViewportControl` 책임 축소
- `canvasSync` mirrored state 역할 명시
- `CanvasScrollbar`의 controller/store 이중 경로 축소

### 검증 포인트

- fit/fill
- pan drag
- wheel zoom
- scrollbars

---

## Phase 3. Invalidation 모델 정리

### 목표

- content/layout/overlay/theme/resource invalidation 표준화

### 작업

- invalidation reason 정의
- 캐시 무효화 표 작성
- version 조합 규칙 명시

### 검증 포인트

- stale frame 없음
- 불필요한 content rebuild 감소

---

## Phase 4. Frame Build Pipeline 분리

### 목표

- `SkiaOverlay`에서 frame build orchestration만 남김

### 작업

- `FrameInputSnapshot`
- `SharedSceneDerivedData`
- `ContentBuildResult`
- `SelectionOverlayBuildResult`
- `WorkflowOverlayBuildResult`
- `AIBuildResult`

### 핵심 원칙

- 큰 맵/트리/바운드 계산은 프레임당 1회만
- overlay 단계는 공용 산출물 재사용

---

## Phase 5. Node Renderer 분해

### 목표

- `nodeRenderers.ts` 기능별 모듈 분리

### 작업

- box/text/image/shape/effect/overflow/scrollbar/text cache 분리

---

## Phase 6. Theme / Resource Runtime 정리

### 목표

- giant util과 watcher 정리

### 작업

- `cssVariableReader.ts` 분리
- theme snapshot service
- font/image watcher service

---

## Phase 7. Source Tree Hygiene

### 목표

- generated artifact 격리

### 작업

- `wasm-pkg`, `target`, generated JS/WASM 정리

---

## Immediate Implementation Scope

이번 실행에서는 다음까지만 수행한다.

1. Phase 1 실행 시작
2. `Workspace.tsx`에서 시각 섹션 분리
3. compare-mode 렌더 블록 분리

이 단계는 동작 보존 리스크가 낮고,
이후 hook 분리 작업의 기반이 된다.
