# ADR-037 Phase 0: Behavioral Baseline & Performance Budget

## Purpose

ADR-037 리팩토링의 phase gate 기준 문서.
`SceneSnapshot`, `SelectionModel`, `PointerSession`, `canvasSync` 분리 전후의
동작 동일성과 성능 예산을 검증한다.

---

## Comparison Scope

비교 대상:

- 기존 `ADR-035` 완료 상태의 workspace runtime
- `ADR-037` phase별 구조 변경 적용 상태

중요 원칙:

1. 구조 변경과 UX 변경을 분리한다.
2. 리팩토링 phase 동안 사용자 체감 동작은 동일해야 한다.
3. 성능 개선이 있더라도 시각적 회귀가 있으면 실패로 판정한다.

---

## Baseline Scenarios

### Scenario A. Medium Page Editing

- 페이지 수: 3
- 현재 페이지 요소 수: 50~100
- 텍스트, 이미지, flex/grid, card/button 혼합

### Scenario B. Large Multi-page Navigation

- 페이지 수: 10+
- 페이지 간 pan/zoom, visible page culling 확인

### Scenario C. Interaction Stress

- 단일 선택 이동
- 리사이즈
- lasso 다중 선택
- selection 전환 반복

### Scenario D. Overlay Stress

- workflow overlay on/off
- hover/focus 이동
- AI flash/generating 상태

---

## Performance Metrics

| 메트릭                  | 단위  | Baseline | 허용 범위      | 비고                                  |
| ----------------------- | ----- | -------- | -------------- | ------------------------------------- |
| averageFps              | fps   | _측정_   | baseline - 5%  | 상향은 허용                           |
| lastFrameTime           | ms    | _측정_   | baseline + 10% |                                       |
| skiaFrameTimeAvgMs      | ms    | _측정_   | baseline + 10% |                                       |
| contentRenderTimeMs     | ms    | _측정_   | baseline + 10% |                                       |
| blitTimeMs              | ms    | _측정_   | baseline + 15% |                                       |
| skiaTreeBuildTimeMs     | ms    | _측정_   | baseline + 10% | snapshot 도입 후 감소 기대            |
| selectionBuildTimeMs    | ms    | _측정_   | baseline + 10% | SelectionModel 도입 후 감소 기대      |
| contentRendersPerSec    | count | _측정_   | baseline + 15% | 불필요한 content rebuild 증가 금지    |
| registryChangesPerSec   | count | _측정_   | 참고치         | 구조 개편 중 원인 추적 지표           |
| idleFrameRatio          | ratio | _측정_   | baseline - 10% | idle 비율 급감 시 invalidation 의심   |
| sceneSnapshotBuildMs    | ms    | 신규     | 2ms 이하 목표  | Phase 1 이후 추가 수집                |
| pointerSessionStartMs   | ms    | 신규     | 1ms 이하 목표  | Phase 2 이후 추가 수집                |

---

## Behavioral Checklist

### 1. Viewport

- [ ] breakpoint 변경 시 page size 계산 동일
- [ ] zoom in/out 동작 동일
- [ ] fit/fill 결과 동일
- [ ] scrollbar 반응 동일
- [ ] compare mode split 동작 동일

### 2. Selection

- [ ] 단일 선택 테두리 위치 동일
- [ ] 다중 선택 combined bounds 동일
- [ ] body 선택 동작 동일
- [ ] handle hover cursor 동일
- [ ] 선택 해제 조건 동일

### 3. Drag / Resize / Lasso

- [ ] drag threshold 동일
- [ ] snap-to-grid 결과 동일
- [ ] absolute 요소 이동 결과 동일
- [ ] reorder drop target 결과 동일
- [ ] lasso 범위 선택 결과 동일

### 4. Text Editing

- [ ] 더블클릭 편집 시작 조건 동일
- [ ] overlay 위치/크기 동일
- [ ] 외부 클릭 완료 조건 동일
- [ ] zoom 상태 편집 정합 동일

### 5. Overlay & Workflow

- [ ] workflow edge 위치 동일
- [ ] workflow hover/focus 반응 동일
- [ ] AI flash/generating 렌더 동일
- [ ] minimap show/hide 타이밍 동일

### 6. Resource / Theme

- [ ] 폰트 로딩 후 재레이아웃 동일
- [ ] 이미지 로드 후 갱신 동일
- [ ] theme 변경 후 색상 반영 동일
- [ ] context lost/restore 표시 동일

---

## Instrumentation Additions

ADR-037에서는 아래 진단 이벤트를 추가 수집한다.

| 카테고리          | 이벤트                         | 목적                                  |
| ----------------- | ------------------------------ | ------------------------------------- |
| `scene`           | `snapshot-build`               | scene 파생 계산 비용 측정             |
| `scene`           | `snapshot-reuse`               | cache hit 여부 추적                   |
| `interaction`     | `pointer-session-start/end`    | 입력 상태 머신 비용/전환 확인         |
| `selection`       | `selection-bounds-build`       | 중복 계산 제거 검증                   |
| `invalidation`    | `matrix-hit`                   | 어떤 reason이 어떤 layer를 흔드는지 추적 |
| `renderer-skia`   | `content-rebuild`              | snapshot 기반 content rebuild 감시    |
| `renderer-pixi`   | `interaction-frame`            | 이벤트 전용 canvas 부담 추적          |

---

## Phase Exit Criteria

### Phase 1 Exit

- `SceneSnapshot` 도입 후 기존 시나리오 동일
- `pageFrames`, `visiblePageIds`, `selectionBounds`가 snapshot에서 공급됨
- 상위 엔트리의 파생 계산 감소가 코드상 확인됨

### Phase 2 Exit

- selection bounds 계산 경로가 1개로 수렴
- 중앙 pointer handler의 거대 effect가 해체됨
- drag/resize/lasso session이 분리됨

### Phase 3 Exit

- Skia/Pixi renderer가 snapshot만 소비
- ticker 내부 store 직접 조회 제거

### Phase 4 Exit

- page/group/element 3단계 컬링 동작
- full page recompute 빈도 감소

### Phase 5 Exit

- viewport/lifecycle/metrics store 분리 완료
- metrics 갱신이 viewport 구독자에 영향 주지 않음

### Phase 6 Exit

- legacy 중복 계산 제거
- 남은 경로가 ADR-037 target architecture와 일치

---

## Failure Conditions

아래 중 하나라도 발생하면 해당 phase는 실패로 판정한다.

1. selection bounds 또는 hit test 결과가 기존과 다름
2. text edit 시작/완료 조건이 달라짐
3. workflow overlay 위치가 틀어짐
4. averageFps가 baseline 대비 5% 이상 하락
5. content rebuild 횟수가 baseline 대비 유의미하게 증가
6. renderer가 app store를 직접 조회하는 신규 경로가 추가됨
