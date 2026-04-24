# ADR-069 Baseline — Phase 2 착수 직전 longtask 측정

> 측정 시각: 2026-04-17
> HEAD: `f08f08de` (Phase 0 관찰성 인프라 land) + 관찰성 2.0 (longtask observer) 추가 상태
> 측정 도구: `window.__composition_PERF__.snapshotLongTasks()` (perfMarks.ts)
> 빌드: dev (vite + HMR 연결 상태 — 재연결 1회 포함)

## 수집 시나리오

Phase 2-A/2-B 진행 전, "대규모 편집" 근사 워크플로를 in-vivo로 수행:

- 앱 부팅
- `usePageManager.addPage` 반복 호출 (Page 2 ~ Page 10, 총 9회)
- 빈 영역 클릭 / 다른 페이지 요소 클릭 / workflow overlay 토글 혼합
- HMR 재연결 1회 (`[vite] connecting... connected.` 2회 관찰)

시나리오 혼합이라 "페이지 전환 클릭 20회" 정제 baseline은 아니지만 **현업 패턴에 가까운 비정제 측정**으로 Phase 2 ROI 판단 근거로 충분.

## 수치

| Label                   | Samples | p50   | p95        | p99    | max    | mean      | viol>50ms | viol>100ms |
| ----------------------- | ------- | ----- | ---------- | ------ | ------ | --------- | --------- | ---------- |
| `longtask.input`        | 11      | 450ms | **645ms**  | 645ms  | 645ms  | 426.64ms  | 11 (100%) | 11 (100%)  |
| `longtask.render`       | 24      | 512ms | **5005ms** | 6450ms | 6450ms | 1146.38ms | 24 (100%) | 19 (79%)   |
| `longtask.unclassified` | 154     | 148ms | 565ms      | 951ms  | 2856ms | 236.48ms  | 153 (99%) | 102 (66%)  |

## Gate G2' 목표 대비 gap

- 목표: `longtask.input` p95 < 50ms + `violations50ms` = 0
- 현재: p95 **645ms** (~**12.9×**), violations50ms **11/11 = 100%**
- **→ Phase 2 fan-out 축소 없이는 Gate 통과 불가능**

## 관찰된 Chrome Violation 패턴 (console 발췌)

반복적 2-step 쌍 (React 동시성 scheduler 전형):

```
[Violation] 'click' handler took 453ms
[Violation] 'click' handler took 509ms
[Violation] 'message' handler took 220ms    // scheduler.development.js
[Violation] 'click' handler took 447ms
[Violation] 'click' handler took 501ms
[Violation] 'message' handler took 201ms
```

- `click` 430~510ms ×2 + `scheduler` 200~260ms 주기가 매우 일관됨 → React commit + subscriber fan-out 직접 증거
- `pointerdown` handler는 180~593ms. Phase 1(`selectElementWithPageTransition`) 적용 이후에도 주변 task가 함께 Violation — **진짜 병목은 `pointerdown` 함수 본체가 아닌 뒤따르는 task 체인**

## 분류 관찰 — unclassified 154건의 정체

`observe()` trace 미래핑 경로:

- **React click handler** (`handleElementClickRef` 경로에 observe 래핑 없음)
- `focusout` (TextEditOverlay commit 추정), `keydown`
- `usePageManager.addPage` + 후속 `message` handler
- HMR 재연결 직후 bootstrap task

→ Phase 2-A/2-B로 subscriber fan-out 축소 시 `longtask.unclassified`도 간접 감소 예상. 현재 correlation 로직은 `startTime > trace.end`인 task를 매치 못 함 (추후 grace window 도입 가능성).

## 참고 — render 극단값 주의

`longtask.render` max 6450ms / p95 5005ms 는 **HMR 재연결 + initial bootstrap** 영향. 실제 rAF 루프 자체는:

- `render.frame` observe 평균 0.07~0.22ms (Phase 0 Phase 1 세션 기록)
- `render.content.build` / `plan.build` / `skia.draw` 각 0.01ms

→ `longtask.render`는 **초기 1회성 heavy task의 outlier가 분포 왜곡**. Phase 2 적용 후 outlier 제거 시 median ~500ms 기준으로 평가.

## 스냅샷 원본

브라우저 DevTools Console 출력 (축약):

```
__composition_PERF__.snapshotLongTasks()
[
  { label: "longtask.input",        count: 11,  p50: 450,  p95: 645,  p99: 645,  max: 645,  mean: 426.64, violations50ms: 11,  violations100ms: 11,  topAttributions: [1 entry] },
  { label: "longtask.render",       count: 24,  p50: 512,  p95: 5005, p99: 6450, max: 6450, mean: 1146.38, violations50ms: 24,  violations100ms: 19,  topAttributions: [1 entry] },
  { label: "longtask.unclassified", count: 154, p50: 148,  p95: 565,  p99: 951,  max: 2856, mean: 236.48,  violations50ms: 153, violations100ms: 102, topAttributions: [2 entries] }
]
```

## Phase 2-A 목표 — 수치 기준

- `longtask.input` p95 **645ms → <50ms** (92% 축소 필요)
- `longtask.input` violations50ms **11 → 0**
- `longtask.unclassified` 간접 감소 확인 (절대 목표는 없음 — Phase 2-A 전후 비교용)

## 다음 단계

1. Phase 2-A: `BuilderCanvas.tsx` L148~240 광역 `useStore` 구독 감사 + primitive selector 분해
2. 2-A 적용 직후 동일 시나리오 재측정 → 본 baseline과 delta 비교
3. Gate G2' 미달 시 Phase 2-B (Inspector/Layer/Styles 패널) 진입
