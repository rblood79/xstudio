# ADR-911 Phase 2 Closure 5단계 사전 체크리스트

> 본 문서는 [ADR-911](../911-layout-frameset-pencil-redesign.md) **Phase 2 monitoring 종결 (~2026-05-04+) 후 즉시 Implemented 승격 + closure 5단계 가능하도록** 사전 작성된 체크리스트. 메모리 [feedback-adr-closure-5-step.md](../../../memory/feedback-adr-closure-5-step.md) 패턴 답습.

## 진입 prerequisite

| 조건                               | 검증 방법                                                        | 통과 기준             |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------- |
| monitoring 1주+ 통과               | 본문 진행 로그 (2026-04-27 세션 43) — 2차 reset 시점 ~2026-05-04 | 사용자 issue 0건 보고 |
| dev runtime 회귀 0                 | Chrome MCP / cross-check skill / 사용자 검증                     | 추가 회귀 0건         |
| Phase 2 Gate G2 (시각 회귀 0) 충족 | mockLargeDataV2 + 샘플 프로젝트 시각 비교                        | screenshot diff 0건   |

위 3 조건 모두 충족 시 **Status `In Progress → Phase 2 Implemented` 승격 가능**. (Phase 3+4+5 잔여이므로 ADR 전체 Implemented 는 보류 — partial Implemented 패턴, ADR-109 사례 참조).

## Closure 5단계 (실행 순서)

### Step 1 — Status 변경 + 진행 로그 entry 추가

**파일**: `docs/adr/911-layout-frameset-pencil-redesign.md`

```diff
## Status

-In Progress — 2026-04-26 → 2026-04-27
+**Phase 2 Implemented** — 2026-04-26 → 2026-05-XX (Phase 2 G2 통과 — monitoring 1주+ 사용자 issue 0건 + 추가 회귀 0건 확증). Phase 3+4+5 잔여로 ADR 전체 Implemented 는 보류
```

**진행 로그 entry 추가**:

```markdown
- **2026-05-XX (세션 N)**: **Phase 2 Implemented 승격 + closure 5단계** (commit `<hash>`)
  - monitoring 종결 — 2차 reset (~2026-05-04+) 후 추가 1주 무이슈 확증
  - Gate G2 통과: 시각 회귀 0 + 사용자 issue 0건 + dev runtime 회귀 0
  - Phase 3 (cascade 재작성, ~8h MED) / Phase 4 (DB schema, ~1.5d HIGH) / Phase 5 잔여
  - closure 5단계 완료: Status + 본문 + README + 본문 archive 보류 (Phase 3+4+5 진행 중) + reference link path 정합화
```

### Step 2 — CHANGELOG entry

**파일**: `docs/CHANGELOG.md`

```markdown
## [ADR-911 Phase 2 Implemented — Layout/frameset pencil 호환 cutover 종결] - 2026-05-XX

### Architecture

- **ADR-911 Phase 2 Implemented 승격** — Phase 1 함수 layer + Phase 2 cutover (canonical mode default true) + monitoring 1주+ 통과:
  - PR #251~#262 + #265 (13 PRs main land 누적)
  - canonical mode default true 전환 (`VITE_FRAMES_TAB_CANONICAL` rollback 가능)
  - 회귀 fix 2건 (PR #260 중복 frame 번호 + PR #262 preset stale)
  - **monitoring 종결**: 1차 reset (PR #271, 2026-04-27) → 2차 reset (PR #272, 2026-04-27) → 1주+ 무이슈 (~2026-05-04+ 후)
  - Gate G2 통과 — mockLargeDataV2 + 샘플 프로젝트 시각 회귀 0 + 사용자 issue 0건
  - **Why**: ADR-903 G3 (b)/(c)/(d) 잔여 영역 (FramesTab UI / canonical mode default / monitoring 후 cutover 안정화) 흡수
  - 잔여 Phase: Phase 3 cascade 재작성 (~8h MED) + Phase 4 DB schema (~1.5d HIGH) + Phase 5 hybrid cleanup
  - 위치: `apps/builder/src/builder/stores/utils/frameActions.ts` + `FramesTab.tsx` + `featureFlags.ts` 외 13 PRs
- 검증: type-check 0 / vitest 41/41 PASS (FramesTab 33 + frameActions 15) + 광역 회귀 156+ + monitoring 1주+

### Bug Fixes

- **ADR-911 회귀 fix #1** — PR #271 (`fde05cd8`): 복합 컴포넌트 등록 시 page_id/layout_id 미주입으로 화면 누락
  - **Why**: `createElementsFromDefinition` (factories/utils/elementCreation.ts) 가 parent + children Element 생성 시 page_id/layout_id 명시 주입 안 함 — 단순 컴포넌트 경로와 비대칭. ADR-911 cutover 가 비대칭을 노출
  - 수정: `ElementCreationContext` 인터페이스 신설 + parent/children page_id/layout_id 명시 주입
- **ADR-911 회귀 fix #2** — PR #272 (`ccc06b30`): canonical legacyProps element id/parent_id 누락으로 자식 있는 컴포넌트 미렌더
  - **Why**: `legacyToCanonical` metadata 가 `legacyProps: element.props` 만 보존 → element top-level fields (id/parent_id/page_id/layout_id) 미주입 → CanonicalNodeRenderer 의 `legacyUuid` fallback 으로 path-id 사용 → 자식 lookup mismatch
  - 수정: 3 위치 metadata.legacyProps 에 element top-level fields 명시 spread
```

### Step 3 — README 갱신

**파일**: `docs/adr/README.md`

#### 3-1. 최상단 update note 추가:

```markdown
> **최종 업데이트**: 2026-05-XX 세션 N — **ADR-911 Phase 2 Implemented**: Layout/frameset pencil 호환 cutover 종결.
>
> [요약 ~3-5줄]
```

#### 3-2. 카운트 갱신 — Phase 2 Implemented = partial이므로 미구현 영역 유지 (전체 Implemented 가 아님)

전체 Implemented 가 아니면 README 카운트는 미구현/진행 중에 유지. 단, 진입 가이드 + 본문 link 갱신은 필수.

#### 3-3. 진행 중 표 entry 갱신:

```diff
- | [911](911-layout-frameset-pencil-redesign.md) | Layout/Slot Frameset 완전 재설계 (pencil 호환) | **In Progress** 2026-04-26 → 2026-04-27 | ... |
+ | [911](911-layout-frameset-pencil-redesign.md) | Layout/Slot Frameset 완전 재설계 (pencil 호환) | **Phase 2 Implemented** 2026-04-26 → 2026-05-XX | Phase 1 함수 layer + Phase 2 cutover + monitoring 종결. 잔여: Phase 3 cascade (~8h MED) + Phase 4 DB schema (~1.5d HIGH) + Phase 5 hybrid cleanup. ... |
```

### Step 4 — 본문 archive 보류 (Phase 3+4+5 진행 중)

**Phase 2 만 Implemented, ADR 전체 Implemented 가 아니므로 본문 archive 는 진행하지 않음**. 위치 유지: `docs/adr/911-layout-frameset-pencil-redesign.md`

ADR-109 partial Implemented 사례 참조: 핵심 Gate 충족 + Defer 결정 시 closure 5단계 일부만 진행 가능 (Status + 본문 + CHANGELOG + reference 정합 — archive 는 ADR 전체 Implemented 시점에).

ADR 전체 Implemented 시점은:

- Phase 3 cascade land + Phase 4 DB schema land + Phase 5 hybrid cleanup land **모두 완결** 후
- 또는 Phase 3/4/5 가 별도 ADR 로 분리되고 본 ADR 의 scope 가 Phase 2 까지만 명확화 시 즉시 archive

### Step 5 — reference link path 정합화

**현 상태에서 변경 불필요** (본문 archive 보류로 path 변경 없음). Phase 3+4+5 land 시점에 ADR-911 전체 Implemented 후 archive + reference 일괄 변경.

## 메모리 진입 가이드 갱신 (Step 5 보완)

**파일**: `~/.claude/projects/-Users-admin-work-composition/memory/MEMORY.md` + 신규 `tier3-entry-2026-05-XX-session-N-adr911-phase2-implemented.md`

내용:

- ADR-911 Phase 2 Implemented 승격 결과 + commit hash + monitoring 종결 일자
- 잔여 Phase 3+4+5 우선순위
- Phase 2 Implemented unlock 후 즉시 진입 가능 작업:
  - **ADR-913 Step 4-4 write-through 활성화 (HIGH 1d)**
  - **ADR-914 P5-D/E/G-Integration**
  - **ADR-911 Phase 3 cascade 재작성 (~8h MED)**

## 종결 조건 (실패 시 fallback)

| 조건                                            | 검증                                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| Step 1: 본문 Status 갱신 + 진행 로그 entry      | git diff 확인                                        |
| Step 2: CHANGELOG entry 추가                    | grep "ADR-911 Phase 2 Implemented" docs/CHANGELOG.md |
| Step 3: README 카운트 갱신 + 진행 중 entry 변경 | git diff docs/adr/README.md                          |
| Step 4: 본문 archive 보류                       | 위치 유지 확인                                       |
| Step 5: reference link 정합                     | grep `911-layout-frameset` docs/adr                  |

실패 시: 각 Step 별 독립 commit 으로 부분 land 가능. 모든 Step 완료 후 단일 commit/PR 권장.

## 주의 사항

- **monitoring 카운터 추가 reset 발생 시 closure 보류** — 회귀 fix #3+ 발생 시 1주 시계 재시작
- **Phase 2 Implemented 승격 후 1주 추가 monitoring 권장** — 사용자 dev 환경 안정성 확증 후 Phase 3 진입
- **ADR-913 Step 4-4 진입 prerequisite** — ADR-911 Phase 2 Implemented = Step 4-4 unlock. Phase 2 monitoring 진행 중에는 Step 4-4 금지

## 관련 문서

- ADR-911: `docs/adr/911-layout-frameset-pencil-redesign.md` (Status: In Progress)
- ADR-911 design breakdown: `docs/adr/design/911-layout-frameset-pencil-redesign-breakdown.md` (843줄)
- 메모리 [feedback-adr-closure-5-step.md] — closure 5단계 패턴 정본
- 메모리 [tier3-entry-2026-04-27-session45-adr910-implemented.md] — 본 세션 진입 가이드
