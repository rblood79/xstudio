# ADR-035 Phase 0: Behavioral Baseline & Observability

## Purpose

ADR-035 리팩토링 전후 동작 비교 기준.
각 phase 완료 시 이 문서의 체크리스트로 회귀를 검증한다.

---

## Baseline Performance Metrics

아래 메트릭은 리팩토링 시작 전 GPUDebugOverlay에서 수집한 기준값이다.
각 phase 완료 후 동일 시나리오에서 측정하여 회귀 여부를 판단한다.

### 수집 방법

1. 개발 서버 실행 (`pnpm dev`)
2. 10개 이상 요소가 포함된 테스트 프로젝트 로드
3. GPUDebugOverlay 활성화 (개발 환경 자동)
4. 각 시나리오 수행 후 5초 대기, 안정화된 값 기록

### 2026-03-13 Baseline Capture

- 대상 URL: `http://localhost:5173/builder/2eb9fbea-5904-44c5-98ac-6636e1edbdfd`
- 인증 상태: Chrome 로컬 스토리지를 임시 headless 프로필로 복사하여 동일 세션 재사용
- 시나리오: `ADR035 Baseline` 임시 페이지 생성 후 body 포함 13개 요소 로드, 1440x976 viewport에서 6초 안정화
- 확인 결과: 페이지 선택, body 자동 선택, invalidation history 기록, canvas lifecycle ready 확인

### 메트릭 테이블

| 메트릭                | 단위  | Baseline | Phase 완료 후 | 허용 범위      |
| --------------------- | ----- | -------- | ------------- | -------------- |
| averageFps            | fps   | 59.99    |               | baseline ± 5%  |
| lastFrameTime         | ms    | 16.67    |               | baseline ± 10% |
| skiaFrameTimeAvgMs    | ms    | 17.75    |               | baseline ± 10% |
| contentRenderTimeMs   | ms    | 1.12     |               | baseline ± 10% |
| blitTimeMs            | ms    | 0.30     |               | baseline ± 20% |
| skiaTreeBuildTimeMs   | ms    | 0.013    |               | baseline ± 15% |
| selectionBuildTimeMs  | ms    | 0.00     |               | baseline ± 15% |
| aiBoundsBuildTimeMs   | ms    | 0.00     |               | baseline ± 15% |
| contentRendersPerSec  | count | 0.568    |               | baseline ± 20% |
| registryChangesPerSec | count | 5.025    |               | baseline ± 20% |
| idleFrameRatio        | ratio | 0.848    |               | baseline ± 10% |

> **판정 기준**: 허용 범위를 초과하면 해당 phase를 revert하고 원인을 분석한다.

---

## Manual Verification Checklist

각 phase 완료 후 아래 시나리오를 수동 확인한다.
모든 항목에서 시각적/동작적 차이가 없어야 gate 통과.

### 1. Viewport

- [ ] Breakpoint 변경 (Desktop → Tablet → Mobile) — 캔버스 크기 전환
- [ ] Zoom in/out (Ctrl+Scroll) — 줌 레벨 반영
- [ ] Fit to canvas (Ctrl+0) — 전체 보기
- [ ] Fill canvas — 화면 채우기
- [ ] Pan drag — 캔버스 이동

### 2. Selection & Interaction

- [ ] 단일 요소 클릭 선택 — 선택 하이라이트 표시
- [ ] Lasso 다중 선택 — 영역 드래그로 복수 선택
- [ ] Resize handle 드래그 — 크기 조절
- [ ] Hover highlight — 마우스 오버 시 테두리 표시

### 3. Text Editing

- [ ] 더블클릭 텍스트 편집 시작 — TextEditOverlay 표시
- [ ] 텍스트 입력/수정 — 실시간 반영
- [ ] 편집 완료 (Enter/Escape/외부 클릭) — 오버레이 닫힘
- [ ] 줌 상태에서 텍스트 편집 — 오버레이 위치/크기 정합

### 4. Overlay

- [ ] Workflow overlay on/off 토글 — 엣지/노드 표시
- [ ] Compare mode — 좌우 분할 비교
- [ ] AI 이펙트 바운드 — 생성 효과 영역 표시

### 5. Resource Loading

- [ ] 이미지 로드 후 캔버스 갱신 — 이미지 표시
- [ ] 폰트 로드 후 텍스트 재렌더 — 올바른 폰트 적용
- [ ] 테마 변경 (Light → Dark) — 전체 색상 전환

### 6. Multi-page

- [ ] 페이지 전환 — 올바른 페이지 표시
- [ ] 멀티페이지 스크롤 — 페이지 간 이동

---

## Debug Logging Categories

`CanvasDebugCategory` 타입으로 카테고리별 로깅을 활성화/비활성화한다.

| Category       | 용도                              | 기본 상태 |
| -------------- | --------------------------------- | --------- |
| `viewport`     | zoom/pan/fit/fill 상태 변경       | off       |
| `render`       | 프레임 빌드, content/overlay 렌더 | off       |
| `layout`       | 레이아웃 계산, Taffy 호출         | off       |
| `selection`    | 선택/hover/lasso/resize 이벤트    | off       |
| `invalidation` | 캐시 무효화 reason, version 변경  | off       |
| `resource`     | 폰트/이미지/테마 로드/변경        | off       |
| `workflow`     | 워크플로우 엣지/노드 계산         | off       |
| `metrics`      | 성능 메트릭 수집/플러시           | off       |

### 사용법

```ts
import { canvasDebug } from "./utils/canvasDebug";

canvasDebug.viewport("fit", { zoom: 1.0, panX: 0, panY: 0 });
canvasDebug.render("frame-build", { reason: "content", duration: 2.3 });
canvasDebug.enable("viewport", "invalidation"); // 런타임 활성화
canvasDebug.disable("viewport"); // 런타임 비활성화
```

---

## Active Metrics Summary (15/20)

### Collected

| 카테고리       | 메트릭                                              | 기록 위치                        |
| -------------- | --------------------------------------------------- | -------------------------------- |
| RAF/FPS        | averageFps, lastFrameTime                           | gpuProfilerCore.ts               |
| Skia Render    | skiaFrameTimeAvgMs, contentRenderTimeMs, blitTimeMs | SkiaRenderer.ts                  |
| Frame Analysis | idleFrameRatio, presentFramesPerSec                 | SkiaRenderer.ts                  |
| Tree Build     | skiaTreeBuildTimeMs, selectionBuildTimeMs           | SkiaOverlay.tsx                  |
| AI             | aiBoundsBuildTimeMs                                 | SkiaOverlay.tsx                  |
| Dev            | contentRendersPerSec, registryChangesPerSec         | SkiaRenderer.ts, SkiaOverlay.tsx |

### Not Collected (수집 불필요 또는 불가)

| 메트릭                        | 사유                                   |
| ----------------------------- | -------------------------------------- |
| vramUsed                      | WebGL 확장 API 미지원                  |
| textureCount, spriteCount     | PixiJS 내부 상태 접근 불가             |
| dirtyRectCountAvg             | dirty rect 시스템 미도입               |
| boundsLookupAvgMs 외 레이아웃 | recordWasmMetric 호출 사이트 추가 예정 |
