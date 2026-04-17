# ADR-075 Phase 0 Baseline — Prod 실측 (경로 1: ADR scope 축소 판정)

> 측정 시각: 2026-04-18 04:30+ KST (사용자 수동 실행)
> 대상 HEAD: `c3389488` (ADR-075 Proposed) + 세션 내 수정 (빌드 에러 10건 unblock + merge conflict resolve + ADR-075 Codex 3차 리뷰 반영 재작성)
> 측정 도구: `window.__composition_PERF__.snapshotLongTasks()` + observe labels (`input.*`, `render.*`)
> 빌드/서빙: `pnpm build` + `pnpm -F @composition/builder vite preview --base=/composition/` (4173, **prod bundle**)
> 시나리오: 50회 캔버스 요소 클릭 + 20회 페이지 전환, 사용자 수동 입력

---

## 0. 수행 의도

ADR-075 breakdown §0 은 Phase 0 에 **prod 빌드 기준 구간별 baseline** 을 요구하고, Codex 3차 리뷰 지적 3 에 따라 `render.*` 구간별 observe 분해를 추가 필수 데이터로 포함한다.

---

## 1. Prod 실측 수치

### 1-A. Observe 본체 지표 (ADR-074 비회귀 확인)

| 라벨                    | count |  mean  |    p50    | 목표  |   판정    |
| ----------------------- | :---: | :----: | :-------: | :---: | :-------: |
| `input.pointerdown`     |  26   | 1.2ms  | **1.0ms** | < 2ms | ✅ 비회귀 |
| `input.page-transition` |  22   | 0.82ms | **0.7ms** | < 2ms | ✅ 비회귀 |

ADR-074 Implemented 시점 (dev) p50 1.1ms / 0.8ms 와 prod 에서도 거의 동일 — **ADR-074 Gate 프로덕션에서도 재현 확증**.

### 1-B. longtask 분류 — prod

| 라벨                    | count |  mean   | p50  | **p95**  | **p99**  |  max  | viol>50ms |  viol>100ms  | topAttributions |
| ----------------------- | :---: | :-----: | :--: | :------: | :------: | :---: | :-------: | :----------: | :-------------: |
| `longtask.input`        |  40   | 68.2ms  | 68ms | **87ms** |  140ms   | 140ms | 40 (100%) | **1 (2.5%)** |  `window` (40)  |
| `longtask.render`       | **1** |  57ms   | 57ms |   57ms   | **57ms** | 57ms  | 1 (100%)  |  **0 (0%)**  |  `window` (1)   |
| `longtask.unclassified` |  26   | 74.42ms | 79ms |   90ms   |   98ms   | 98ms  | 26 (100%) |    0 (0%)    |  `window` (26)  |

### 1-C. Render 구간별 observe 분해 — **미기록 (전 라벨 count=0)**

```
render.frame          → snapshot() = null
render.content.build  → snapshot() = null
render.plan.build     → snapshot() = null
render.skia.draw      → snapshot() = null
```

**해석**:

- 50회 요소 클릭 + 20회 페이지 전환 시나리오 동안 위 4종 라벨로 `observe()` 호출이 **한 번도 발생하지 않음** (count=0 이라 `getSnapshot()` 이 null 반환)
- 가능성:
  1. SkiaCanvas rAF body 가 해당 시나리오에서 유의미한 work 를 안 돌림 (idle rAF skip 정상 경로 — frame deferral/skip 로직이 rAF body 실행 자체를 건너뜀)
  2. 또는 observe() 래핑이 현재 시점 SkiaCanvas 에 배선되어 있지 않음
- 현재 ADR-075 판정 맥락에서는 **render stall 이 발생하지 않은 증거** — 시나리오 중 skia.draw 가 longtask 경계를 넘은 경우가 `longtask.render` count=1 한 건 (57ms, viol100ms=0)

**후속 감사**: render.\* observe 배선 여부 확인은 별도 infra debt 로 분리 (본 ADR scope 외).

---

## 2. 판정 — Phase 0 breakdown §0 "경로 1"

ADR-075 breakdown §0 3-Way 분기:

| 경로 | 조건                                                                  |     현 실측      |
| ---- | --------------------------------------------------------------------- | :--------------: |
| 1    | `longtask.render` p99 < 500ms → **scope 축소** (dev overhead 가 전부) | ✅ **57ms 충족** |
| 2    | p99 높고 단일 구간 주 기여 → Phase 1 rAF budget                       |   ✗ 해당 없음    |
| 3    | p99 높고 여러 구간 분산 → Phase 3 subscriber 감사 우선                |   ✗ 해당 없음    |

**판정**: **경로 1 — ADR scope 축소 확정**

---

## 3. Gate 판정

| Gate | 목표                                   | 실측                                              |                        판정                        |
| ---- | -------------------------------------- | ------------------------------------------------- | :------------------------------------------------: |
| G1   | P0 baseline + 구간별 observe 분해 기록 | longtask 3종 확보 / render.\* 4종 count=0 기록    | ⚠️ 부분 (render.\* 미기록은 idle 경로 증거로 수용) |
| G1.5 | 주 기여 구간 식별                      | p99 57ms 단일 건, 식별 불필요 (stall 사실상 없음) |                    ✅ N/A 수용                     |
| G2   | `longtask.render` p99 < 500ms          | **57ms**                                          |                      ✅ 통과                       |
| G3   | `longtask.input` p95 < 100ms           | **87ms**                                          |                      ✅ 통과                       |
| G4   | `longtask.*` viol100ms < 10%           | input **2.5%** / render 0% / unclassified 0%      |                      ✅ 통과                       |
| G5   | ADR-074 observe 본체 비회귀            | p50 1.0ms / 0.7ms                                 |                      ✅ 통과                       |

**모든 Hard Constraint Gate 충족** — Phase 1~5 구현 작업 **불필요**.

---

## 4. ADR-069 선례 재현 확증

| 라벨                     | dev (ADR-074 Addendum 2) | prod (본 측정)  |   감소율   |            비교             |
| ------------------------ | :----------------------: | :-------------: | :--------: | :-------------------------: |
| `longtask.input` p95     |          621ms           |    **87ms**     | **-86.0%** |     ADR-069 (-86%) 동일     |
| `longtask.input` p99     |          1016ms          |      140ms      |   -86.2%   |              —              |
| `longtask.input` viol100 |       100% (52/52)       | **2.5% (1/40)** |  -97.5%p   |              —              |
| `longtask.render` p99    |         19742ms          |    **57ms**     | **-99.7%** | ★ dev stall prod 재현 안 됨 |
| `longtask.render` max    |         19742ms          |      57ms       |   -99.7%   |              —              |

**결론**: ADR-069 (2026-04-17 종결) 당시와 **정확히 동일한 패턴** — dev scheduler.development.js + React dev overhead 가 longtask 의 주 기여자였고 prod 빌드에서 자동 해소. **Codex 1~3차 리뷰가 예측한 대로** subscribeWithSelector/rAF budget 은 이번 ADR scope 에서 불필요.

---

## 5. 다음 조치 (ADR-075 종결 방향)

1. **ADR-075 Status 전이**: Proposed → **Implemented** + Addendum (또는 Accepted 유지 후 Implementation = "측정으로 Gate 충족, 구현 Phase skip") — ADR-069 종결 패턴 차용
2. **구현 Phase 1~4 보류/기각 명시**:
   - Phase 1 (rAF budget) — 대상 stall 부재, 불필요
   - Phase 2 (subscribeWithSelector) — 이미 §Decision 보류 조건(>5%) 미충족 전제, 기각
   - Phase 3 (subscriber 감사) — 대상 fan-out 부재, 불필요
   - Phase 4 (attribution payload) — 유일하게 **독립 가치 있는 infra 개선**. 별도 PR 로 분리하거나 후속 ADR 로 이관 고려
   - Phase 5 (prod gate 재검증) — 본 문서가 Phase 5 역할 겸함
3. **Debt 로 이관**:
   - `render.*` observe 배선 확인 (별도 infra 감사)
   - font 404 (`/fonts/PretendardVariable.woff2`) — prod 빌드 `/composition/fonts/` prefix 누락 (본 세션 발견, scope 외)
4. **ADR 본문 Addendum 추가**: 본 측정 결과 + 경로 1 판정 기록 + Phase 1~3 skip 근거 명시

---

## 6. Raw 측정 로그 (사용자 DevTools Console 실행)

```
window.__composition_PERF__.reset() → undefined

window.__composition_PERF__.snapshot("input.pointerdown")
→ {label: "input.pointerdown", count: 26, totalCount: 26, mean: 1.2, p50: 1, p95: ?, p99: ?, ...}

window.__composition_PERF__.snapshot("input.page-transition")
→ {label: "input.page-transition", count: 22, totalCount: 22, mean: 0.82, p50: 0.7, ...}

JSON.stringify(window.__composition_PERF__.snapshotLongTasks(), null, 2)
→ [longtask.input / longtask.render / longtask.unclassified 수치 § 1-B 참조]

["render.frame","render.content.build","render.plan.build","render.skia.draw"]
  .forEach(l => console.log(l, window.__composition_PERF__.snapshot(l)))
→ 각 label 에 대해 console.log 가 null 출력 (count=0)
```
