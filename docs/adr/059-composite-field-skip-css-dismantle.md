# ADR-059: Composite Field CSS SSOT 확립 — 대칭 파이프라인 복귀

## Status

Proposed (v2) — 2026-04-13 (선행 조사 결과 반영 재작성, v1: 2026-04-11)

## 원칙 — Spec SSOT / Symmetric Consumers

**Spec이 SSOT**이다. typography 토큰을 포함한 spec 정의가 유일한 source이며, **Preview/Publish (DOM/CSS)와 Builder (Skia)는 대등한 consumer**다. 어느 consumer도 다른 consumer의 기준이 아니다.

CSS와 Skia는 symmetric pipeline:

```
typography 토큰 ─┬─→ CSS 변수 ─→ browser CSS engine ─→ Preview/Publish
                │
                └─→ spec shapes() ─→ Skia ─────────────→ Builder Canvas
```

**ADR-059의 본질**: Composite Field에서 CSS consumer가 spec 외부에 독자 진실(수동 CSS 파일 + `@sync` 주석 + 비선언 네이밍 + 복제 delegation)을 보유한 상태를 해체하여, 두 pipeline이 spec을 대등하게 소비하는 상태로 복귀시킨다. **"수동 CSS를 자동 CSS로 교체"가 아니라 "CSS consumer의 비-spec 진실 제거"**이다.

ADR-057/058/060/061의 공통 패턴을 계승: 비-spec 진실을 유지한 채 자동화를 끼워넣는 방식을 기각하고, **비-spec 진실 자체를 삭제**한다.

## Context

### v1 전제의 실측 반증 (2026-04-13)

v1(2026-04-11) breakdown은 "Field 7개가 TextField와 구조적으로 유사해 패턴 복제로 해체 가능"을 가정했다. 선행 조사 결과 이 가정이 4축에서 파손:

| #   | SSOT 위반 축          | 실측 내용                                                                                                                                |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Delegation 미선언** | SearchField/ColorField/DateField/TimeField 4개 Field가 `composition.delegation` **자체 없음** — spec이 CSS consumer 구조를 선언하지 않음 |
| 2   | **비-spec 네이밍**    | CSS 변수 prefix (`--tf-*`, `--nf-*`) spec 외부에서 결정. **TimeField ↔ TextField 가 동일 `--tf-*` prefix 충돌**                          |
| 3   | **복제 SSOT**         | NumberField의 `@sync` 주석 8개가 ComboBox 참조 — NumberField의 실제 SSOT는 ComboBox. Phase 1 단순 해체 불가                              |
| 4   | **암묵 공유 SSOT**    | `BUTTON_SIZE_CONFIG` 7개 spec이 `@sync` 주석으로 참조 연명                                                                               |
| 5   | **일관성 위반**       | TextArea만 `skipCSSGeneration: false` + delegation 없음 — spec/CSS 양쪽에 불완전 구조                                                    |

### 기존 예외 상태

| 경로                       | 현상태                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Spec sizes**             | `spec.sizes.md = { height: 30, paddingX: 12, ... }` — Skia consumer만 소비              |
| **수동 CSS**               | `packages/shared/src/components/styles/TextField.css` — CSS consumer 독자 진실          |
| **composition.delegation** | `variables.md["--tf-input-padding"] = "8px 16px"` — 수동 CSS 매핑용 (spec.sizes와 독립) |
| **CSSGenerator**           | `if (spec.skipCSSGeneration) return null;` — CSS consumer 전체 우회                     |
| **@sync 주석**             | 13개 파일 23개소 — 비대칭 drift를 주석으로 연명                                         |

결과: `sizes.md.paddingX = 12`가 `--tf-input-padding: 8px 16px`와 수치 일치할 구조적 보장 없음. 두 consumer의 기준값이 독립 source에서 편집됨.

### 선행 ADR 완료 패턴 (계승 대상)

- **ADR-057/058** (Text): buildTextNodeData 폐지 — CSS/Skia가 spec 직접 소비
- **ADR-060** (indicator): 6개 매직 테이블 → `spec.sizes.*.indicator` SSOT
- **ADR-061** (focus ring): 50개 리터럴 → `{focus.ring.*}` TokenRef. `StateEffect.outline` 완전 제거. 상태별 스타일도 spec 소비

세 ADR의 공통 원리: **비-spec 진실 "제거"**, "동기화" 아님.

### Hard Constraints

1. Preview DOM 구조 불변 (React Aria hooks 생성 트리)
2. CSS consumer와 Skia consumer가 **spec만** 소비 — 수동 CSS 파일 0, `@sync` 주석 0이 최종 상태
3. 두 consumer 시각 결과 교차 일치 (`/cross-check`)
4. 60fps / <500KB 번들 유지
5. ADR-042 Spec Dimension Injection 무회귀
6. Phase 경계 rollback 가능

### Soft Constraints

- 네이밍 규약이 spec 내부 선언에서 파생 (prefix도 spec이 결정)
- 상태별 스타일(`:hover/:focus/[data-invalid]`)은 ADR-061 패턴(`spec.states`)을 Composite로 확장

## 의존성

- **ADR-036 Phase 4** 선행 완료 (composition.delegation 메타데이터)
- **ADR-057/058** 선행 완료 (해체 패턴 참조)
- **ADR-060/061** 선행 완료 (spec.states/indicator SSOT 확장 근거)
- **ADR-056** 병행 권장 (Base Typography SSOT)

## Alternatives Considered

### 대안 A: 현상 유지

- 설명: 59개 `skipCSSGeneration: true` 유지
- 위험: 기술 L / 성능 L / 유지보수 **CRIT** / 마이그레이션 L
  - SearchField/ColorField/DateField/TimeField는 delegation 없이 수동 CSS만 살아있음 — SSOT 위반 심화
  - TimeField `--tf-*` prefix 충돌 영구화
  - ADR-036 재승격 체인 미완결

### 대안 B: 2층 구조 (generated + 수동 override)

- 설명: CSSGenerator가 자동 생성 CSS 파일을 만들고, 기존 수동 CSS는 "React Aria 상태별 override 전용"으로 축소 유지
- 위험: 기술 M / 성능 L / 유지보수 **H** / 마이그레이션 L
  - CSS consumer를 "2차 권위"로 승격 — 대칭 파이프라인 원리 위반
  - 수동 override 파일 잔존 시 `@sync` 구조도 부분 잔존
  - v1 ADR-059 암묵 방향 — **본 v2에서 기각**

### 대안 C: CSS consumer 비-spec 진실 완전 제거, 점진 전환 (본 제안)

- 설명:
  1. **Naming SSOT** — `composition.delegation.prefix` 명시 선언 필드 도입. 기존 prefix(`--tf-*` 등) spec 내부에서 확정. TimeField → 충돌 없는 prefix로 리네임
  2. **Delegation 완전성** — 4개 Field에 delegation 신설. CSS consumer 구조 100% spec이 선언
  3. **공유 SSOT 승격** — `BUTTON_SIZE_CONFIG` → spec 참조 표준화. NumberField=ComboBox 복제 관계 명시화 (Phase 2 선행 처리)
  4. **States 확장** — `spec.states.*`를 Composite에 확장 (ADR-061 패턴). React Aria `:hover/:focus/[data-invalid]` 상태 스타일이 spec 소비
  5. **Auto-derivation** — CSSGenerator가 위 선언에서 100% 생성
  6. **수동 CSS 파일 삭제** — override 층 없이 완전 제거
- 위험: 기술 M / 성능 L / 유지보수 L / 마이그레이션 M
  - CSSGenerator 스키마 확장 (prefix, states, shared refs) — ADR-061이 focusRing 단일 축에서 실증한 패턴의 다축 확장
  - Phase 경계 = "대상 컴포넌트 수동 CSS 파일 삭제 단위" 로 rollback 시점 명확

### 대안 D: 단일 시험대 (TextField 1개만 해체)

- 설명: TextField만 해체해 패턴 실증. 나머지 6개 방치
- 위험: 기술 L / 성능 L / 유지보수 **H** / 마이그레이션 L
  - ADR-036 "Fully Implemented" 재승격 불가
  - TimeField prefix 충돌 방치
  - v2 본문에서는 "Phase 1 시험대"로 흡수 (독립 대안 자격 없음)

### 대안 E: 일괄 전환 (59개 동시)

- 설명: 단일 Phase에서 59개 동시 해체
- 위험: 기술 **H** / 성능 M / 유지보수 L / 마이그레이션 **H**

### 대안 F: 검증 도구만 추가 (v1의 대안 D)

- 설명: CSSGenerator 유지, build-time lint가 수동 CSS ↔ spec.sizes 수치 불일치 감지
- 위험: 기술 M / 성능 L / 유지보수 **H** / 마이그레이션 L
  - 두 source 유지한 채 일치 검증 — 대칭 파이프라인 원리 위반 (CSS가 준-SSOT)

### Risk Threshold Check

| 대안                 | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ |
| -------------------- | :---: | :--: | :------: | :----------: | :---: |
| A 현상 유지          |   L   |  L   | **CRIT** |      L       |   1   |
| B 2층 구조           |   M   |  L   |  **H**   |      L       |   1   |
| **C 완전 제거 점진** | **M** |  L   |    L     |    **M**     |   0   |
| D 단일 시험대        |   L   |  L   |  **H**   |      L       |   1   |
| E 일괄               | **H** |  M   |    L     |    **H**     |   2   |
| F 검증만             |   M   |  L   |  **H**   |      L       |   1   |

루프 판정: 대안 C만 HIGH+ 없고 SSOT 목적 달성. B/F는 "두 source 유지" = 대칭 원리 위반. A/D는 위반 영속/확산. E는 회귀 추적 불가.

## Decision

**대안 C: CSS consumer 비-spec 진실 완전 제거, 점진 전환**을 선택한다.

### 기각 사유

- **A**: CRIT 유지보수 위험. 4개 Field delegation 부재 + TimeField 충돌 방치
- **B**: CSS consumer를 준-SSOT로 승격 — 원칙 위반. v1 breakdown이 이 방향으로 기울었음 → v2에서 명시 기각
- **D**: 목적(ADR-036 재승격) 미달성
- **E**: 회귀 추적 불가
- **F**: 두 source 병존은 동기화 자동화일 뿐 SSOT 단일화 아님

### 위험 수용 근거

- 기술 M: CSSGenerator 3축 확장(prefix / states / shared refs)은 ADR-061 focusRing 단일 축 실증 패턴의 연장. DTS 빌드 위험은 `as const` narrowing 규약으로 관리 (ADR-061 학습)
- 마이그레이션 M: Phase 경계를 **"대상 컴포넌트 수동 CSS 파일 삭제 단위"** 로 확정 — rollback 시점은 파일 단위로 이진 명확

### Pre-Phase 4 sub-phase 분해

v1 breakdown의 단일 Pre-Phase 0(auto-derivation 메커니즘)을 **의존성 순서로 4단계 분해**:

- **Pre-Phase 0-A (Naming SSOT)** — `composition.delegation.prefix` 선언 필드 추가, 기존 prefix spec 내부 확정, TimeField prefix 충돌 제거
- **Pre-Phase 0-B (Delegation 완전성)** — SearchField/ColorField/DateField/TimeField 4개 delegation 신설, TextArea 일관성 회복
- **Pre-Phase 0-C (공유 SSOT + 복제 해체)** — `BUTTON_SIZE_CONFIG` 참조 표준화, NumberField↔ComboBox 복제를 Phase 2 선행 전제로 명시
- **Pre-Phase 0-D (States + Auto-derivation)** — CSSGenerator 확장 (sizes + states + prefix → 100% 생성). 기존 53개 simple 컴포넌트 무회귀 검증

### Phase 배열

- **Phase 1** — TextField 시험대 (1개 완전 해체, 수동 CSS 파일 삭제, `@sync` 제거, `/cross-check` 대칭성 검증)
- **Phase 1.5** — SearchField/ColorField/DateField/TimeField/TextArea 5개 해체 (NumberField 제외)
- **Phase 2** — Select/ComboBox/NumberField 해체. ADR-047 Popover 무회귀
- **Phase 3** — DatePicker/DateRangePicker 해체. ADR-050 overflow clipping 무회귀
- **Phase 4** — 잔존 Composite ~48개 Archetype 그룹 전환
- **Phase 5** — `@sync` 잔존 grep 0, `utils/fieldDelegation.ts` 폐지, ADR-036 재승격

> 구현 상세: [059-composite-field-skip-css-dismantle-breakdown.md](../design/059-composite-field-skip-css-dismantle-breakdown.md) — v2 재작성 필요

## Gates

**검증 원칙 변경**: v1의 "기존 수동 CSS ↔ generated CSS byte diff 0" Gate는 **폐기**. 기존 수동 CSS는 오염된 consumer 상태이며 reference 자격 없음. v2는 **spec을 source로 하는 두 consumer의 대칭 검증**으로 대체.

| Gate                | 시점          | 통과 조건                                                                                        | 실패 시 대안         |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------ | -------------------- |
| Prefix 충돌 제거    | Pre-Phase 0-A | `composition.delegation.prefix` 미선언 Field 0, 동일 prefix 재사용 0, TimeField `--tf-*` 참조 0  | prefix 스키마 재설계 |
| Delegation 완전성   | Pre-Phase 0-B | Field 7개 모두 delegation 선언, 필수 selector(Label/Input/Button/FieldError) 누락 0              | delegation 재설계    |
| 공유 SSOT 표준화    | Pre-Phase 0-C | `BUTTON_SIZE_CONFIG` `@sync` 주석 0, NumberField Phase 2 의존성 명시                             | 공유 토큰 재설계     |
| CSSGenerator 무회귀 | Pre-Phase 0-D | 기존 53개 simple 컴포넌트 CSS 생성 byte diff 0 (확장 자체의 회귀 없음)                           | 확장 롤백            |
| Phase N 대칭성      | 각 Phase 완료 | 대상 컴포넌트: 수동 CSS 파일 **삭제**, `@sync` 0, **`/cross-check` Preview ↔ Builder 시각 일치** | Phase 롤백           |
| 60fps / 번들        | 각 Phase      | 60fps, 번들 <500KB                                                                               | Phase 롤백           |
| Popover 무회귀      | Phase 2       | ADR-047 드롭다운 시각 일치                                                                       | Phase 2 롤백         |
| Calendar 무회귀     | Phase 3       | ADR-050 overflow clipping 무회귀                                                                 | Phase 3 롤백         |
| 최종 SSOT 순도      | Phase 5       | `grep "skipCSSGeneration.*true"` = 0, `grep "@sync"` = 0, 대상 Composite 수동 CSS 파일 = 0       | 잔존 개별 해체       |

## Consequences

### Positive

- **대칭 파이프라인 복귀** — 59개 Composite가 spec-only consumer 상태
- **수동 CSS 파일 제거** — React Aria 상태 override 포함 완전 제거. CSS consumer의 비-spec 진실 0
- **`@sync` 주석 23개 소멸** — 수동 동기화의 구조적 원인 제거
- **네이밍 규약 spec 흡수** — prefix 충돌 구조적 불가능
- **공유 SSOT 명시화** — 암묵 참조(`BUTTON_SIZE_CONFIG` 7회) 정리
- **ADR-036 "Fully Implemented" 재승격** — Phase 5 완료 시 체인 완결

### Negative

- **CSSGenerator 스키마 확장 범위 증가** — prefix/states/shared refs 3축 (v1 대비 확장)
- **Pre-Phase 4 sub-phase** — 조사/설계 기간 증가
- **검증 방식 전환 학습 비용** — byte diff → cross-check, 수동 Storybook 병행
- **Playwright visual regression 부재** — 자동화 부족, 별도 ADR 후보

### 후속 작업

- `utils/fieldDelegation.ts` 완전 폐지 — Phase 5
- ADR-036 상태 재평가 — Phase 5 완료 시 "Fully Implemented" 재승격
- Playwright visual regression 도입 검토 (별도 ADR 후보)

## 재시작 프롬프트 (v2)

새 세션에서 아래 프롬프트를 그대로 사용:

```text
ADR-059 v2 Composite Field CSS SSOT 확립 작업을 계속합니다.

원칙: Spec=SSOT, CSS/Skia는 대등 consumer, symmetric pipeline.
v2 본문: docs/adr/059-composite-field-skip-css-dismantle.md (2026-04-13 재작성)
v1→v2 변경 핵심: 2층 구조(B안) 기각, 수동 CSS 완전 삭제 + states 확장 결정

Pre-Phase 4단계:
  0-A Naming SSOT (prefix 선언 + TimeField 충돌 제거)
  0-B Delegation 완전성 (4개 Field + TextArea)
  0-C 공유 SSOT (BUTTON_SIZE_CONFIG + NumberField↔ComboBox)
  0-D States + Auto-derivation (CSSGenerator 확장)

선행 조사 결과는 MEMORY.md/adr059-launch-plan.md 및 본 ADR §Context 참조.
breakdown 문서는 v2 기준으로 재작성 필요.

Pre-Phase 0-A 착수 전 worktree 진입 권장 (superpowers:using-git-worktrees).
```
