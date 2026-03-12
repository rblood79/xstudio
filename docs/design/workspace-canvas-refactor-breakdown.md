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

1. `Phase 0`을 먼저 완료해 baseline 성능 수치와 수동 시각 비교 기준을 확보한다.
2. 저위험/중위험 phase부터 진행해 invalidation, runtime service, source tree를 먼저 정리한다.
3. hot path인 `nodeRenderers.ts` 분해는 가장 마지막에 수행한다.
4. 각 phase는 1커밋으로 끝내고, phase 종료 시 gate 검증을 통과해야 한다.

즉 순서는 다음과 같다.

1. `Phase 0` baseline 완성
2. `Phase 3` invalidation 모델 정리
3. `Phase 6` theme/resource runtime 정리
4. `Phase 8` generated artifact 격리
5. `Phase 7` DOM 의존 유틸 제거
6. `Phase 5` node renderer 분해

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

- `InvalidationReason` enum 정의
- 캐시 무효화 표 작성
- version 조합 규칙 명시
- content/layout/overlay/theme/resource별 invalidation ownership 문서화

### 검증 포인트

- stale frame 없음
- 불필요한 content rebuild 감소
- invalidation reason 추적 가능

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

### 제약

- 이 phase는 **extract-only**로 제한
- 함수 이동/파일 분리 외 로직 변경 금지
- paragraph cache, strutStyle, fontFamilies 동기화 규칙 변경 금지
- 성능 최적화나 렌더 수정은 후속 phase로 분리

### 진입 조건

- `Phase 0`, `Phase 3`, `Phase 6`, `Phase 8` 완료
- baseline 수치와 수동 시각 비교 기준 확보
- 직전 phase까지 gate 검증 연속 통과

### 검증 포인트

- 동일 scene에서 렌더 결과 차이 없음
- text/image/box rendering 회귀 없음
- frame time/FPS 악화 없음

---

## Phase 6. Theme / Resource Runtime 정리

### 목표

- giant util과 watcher 정리

### 작업

- `cssVariableReader.ts` 분리
- theme snapshot service
- font/image watcher service

### 검증 포인트

- theme 변경 반영 경로 동일
- font/image resource 갱신 타이밍 동일

---

## Phase 7. DOM 의존 유틸 제거

### 목표

- UI shell과 runtime 경계 명확화

### 작업

- `CanvasScrollbar`의 `querySelector` 제거
- shell 측 측정값 전달 경로 명시
- DOM 측정 책임을 runtime 외부로 이동

### 검증 포인트

- scrollbar 동작 동일
- shell 레이아웃 변경에 대한 취약성 감소

---

## Phase 8. Source Tree Hygiene

### 목표

- generated artifact 격리

### 작업

- `wasm-pkg`, `target`, generated JS/WASM 정리

### 검증 포인트

- source tree 탐색성 개선
- handwritten source와 generated output 경계 명확화

---

## Phase Gate

모든 phase는 아래 gate를 통과해야 완료로 간주한다.

1. `pnpm -F @xstudio/builder type-check`
2. 핵심 수동 렌더링 비교 통과
3. 성능 baseline 대비 회귀 없음
4. phase 범위가 1커밋으로 rollback 가능

수동 렌더링 비교 최소 체크리스트:

- breakpoint 변경
- compare mode
- zoom/pan
- lasso/selection/resize
- text edit
- workflow overlay
- image/font/theme 변경
