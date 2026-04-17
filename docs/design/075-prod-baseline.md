# ADR-075 Phase 0 Baseline — 측정 시도 및 차단 상황 기록

> 측정 시각: 2026-04-18 03:59 KST
> 대상 HEAD: `c3389488` (ADR-075 Proposed) + 세션 내 수정 (빌드 에러 10건 unblock + merge conflict resolve)
> 측정 도구: `window.__composition_PERF__.snapshotLongTasks()` + observe labels (`input.*`, `render.*`)
> 빌드: `pnpm build` + `pnpm -F @composition/builder vite preview --base=/composition/` (4173)

---

## 0. 수행 의도

ADR-075 breakdown §0 은 Phase 0 에 **prod 빌드 기준 구간별 baseline** 을 요구한다:

- `longtask.input` / `longtask.render` / `longtask.unclassified` p50/p95/p99/viol100ms
- **추가 (Codex 3차 리뷰 지적 3)**: `render.content.build` / `render.plan.build` / `render.skia.draw` / `render.frame` observe 구간별 p50/p95/p99
  - **근거**: Codex 지적 3 — "단계별 baseline 없이 `rAF budget` 을 19.7s stall 해법으로 결론 내면 예측 실패 원인 설명 불가". 주 기여 구간 식별이 Phase 1 진입 조건.

이 데이터 없이는:

- Phase 1 (rAF budget) 의 실제 타깃 구간 불명
- Gate G2 (`longtask.render` p99 < 500ms) 의 선행 지표 부재

---

## 1. 측정 시도 결과 — 두 경로 모두 차단

### 1-A. Prod preview (4173) + Supabase 인증 공백

| 시도 | 대상 project                                                        | 결과                                                                                                                                  |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `1490246a-21e3-412e-8b99-9d7e6bcdb783` (이전 dev 탭 참조)           | React mount ✅ / `elementCount=0` / Skia canvas 1개 / `__composition_PERF__` 접근 가능하나 **측정 의미 없음** (5000+ elements 미로드) |
| 2    | `bdc2f503-9dca-451c-b035-81ad03c01d04` (사용자 현 dev 세션 project) | `[BuilderCore] 프로젝트를 찾을 수 없음: bdc2f503-...` — **prod 세션에 Supabase auth 부재**                                            |

네트워크 요청 33건 중 Supabase API 호출 0건 → **prod 탭은 signin 을 거치지 않아 RLS 정책에 의해 element fetch 불가**.

추가 관찰:

- `/fonts/PretendardVariable.woff2` / `/fonts/InterVariable.woff2` 404 — prod 빌드에서 font 경로가 `/composition/fonts/` prefix 누락. **infra debt (측정과 독립)**. 후속 ADR 필요.

### 1-B. Dev server (5173) — renderer frozen

| 탭         | project        | 결과                                                                                               |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------- |
| 2123359845 | `1490246a-...` | `CDP sendCommand "Runtime.evaluate" timed out after 45000ms` — Runtime 이 main thread 에 응답 불가 |
| 2123359856 | `bdc2f503-...` | 동일 (45s timeout × 2회)                                                                           |

즉 **dev 빌드 + 대규모 project 초기 로드 자체가 main thread 를 45s+ 점유**. 이는:

1. Codex 지적 가설(subscriber fan-out + rAF budget 부재) 의 **경험적 증거**
2. CDP protocol 의 Runtime.evaluate 조차 응답하지 못할 정도의 main thread stall
3. ADR-074 Addendum 2 에 기록된 `longtask.render` p99 **19742ms** 과 정합

측정 도구(`__composition_PERF__`) 자체에 접근할 수 없으므로 구간별 분해 **확보 불가**.

---

## 2. 판정 — Phase 1 진입 조건 미충족

ADR-075 breakdown §0 "판정 조건":

- ✗ "prod longtask.render p99 가 < 500ms 이면 scope 축소" — **prod 측정 자체 불가**
- ✗ "prod 수치가 여전히 높다면 Phase 1~3 진입 확정" — 확인 불가
- **Codex 지적 3 연계**: 주 기여 구간 (content.build / plan.build / skia.draw) 분해 없이 Phase 1 rAF budget 도입은 **예측 실패 시 설명 불가**

**결론**: Phase 1 진입 blocker 2건 존재.

| Blocker                     | 해소 조건                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| B1. Prod auth 경로 확립     | Prod preview 탭에서 signin 완료 후 `bdc2f503-...` 혹은 동일 규모 project 로드                |
| B2. 구간별 observe baseline | `render.content.build` / `render.plan.build` / `render.skia.draw` / `render.frame` 실측 확보 |

---

## 3. ADR-074 Addendum 2 Dev 수치 (재참조, 참고용만)

| 라벨                    | count |   mean    |  p50  |  p95  |     p99     |     max     | viol100  |
| ----------------------- | :---: | :-------: | :---: | :---: | :---------: | :---------: | :------: |
| `longtask.input`        |  52   | 463.79ms  | 467ms | 621ms |   1016ms    |   1016ms    | **100%** |
| `longtask.render`       |  21   | 1219.95ms | 393ms | 578ms | **19742ms** | **19742ms** |   57%    |
| `longtask.unclassified` |  105  |  172.5ms  | 119ms | 411ms |    447ms    |   2942ms    |   65%    |

**주의**: 이 수치는 **dev 빌드 기준**. ADR-069 종결 패턴에 따라 prod 에서는 `longtask.input` 이 -86% 감소 (645→88ms) 선례 존재. Render longtask 의 prod 감소율은 **미측정**. 본 Phase 0 의 존재 의의 자체가 "prod 수치 확보" 이었으나 인증 공백으로 보류.

**구간별 분해 데이터**: **없음** (측정 불가로 Codex 지적 3 미해소).

---

## 4. Phase 0 상태 — Deferred

| 항목                     | 상태                                             |
| ------------------------ | ------------------------------------------------ |
| prod longtask.\* 측정    | ⏸ deferred (B1 auth)                             |
| prod render.\* 구간 측정 | ⏸ deferred (B2 baseline)                         |
| dev 재측정 (구간별)      | ⏸ deferred — dev stall 로 observe 자체 실행 불가 |
| font 404 infra 수정      | 📝 후속 ADR 후보 (본 ADR scope 외)               |

**Phase 1 진입 전 필수 선행**: B1 + B2 모두 해소 필요. 본 문서는 해소 시 업데이트.

---

## 5. Gate G1 (P0 land 후) 상태

ADR-075 Gate G1 정의:

> P0 baseline 측정 완료 + `docs/design/075-prod-baseline.md` 기록

- 측정 시도 및 차단 사유 **기록 완료** ✅
- 실측 데이터 **미확보** — 재시도 조건 명시 (위 §2 Blocker 테이블)

본 문서는 Gate G1 의 "기록" 요구는 충족하되, 실측 데이터는 B1/B2 해소 후 Phase 0 rerun 시 확보.

---

## 6. 다음 조치

1. 사용자 prod preview(4173) 에 signin 수동 수행 → `bdc2f503-...` 혹은 대체 5000+ elements project 로드 확인
2. 확인 후 ADR-075 breakdown §0 시나리오 재실행 (50회 pointerdown / 20회 page-transition / render.\* 구간별 snapshot)
3. 결과를 본 문서 §1 자리에 실측 수치로 교체
4. §2 Blocker 제거 + §4 Phase 0 상태 ✅ 전환
5. Phase 1 진입 또는 (구간별 분해 결과) scope 재조정 결정
