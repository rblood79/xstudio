# ADR-023: 컴포넌트 Variant Props S2 전환

## Status

Accepted (2026-03-05)

### 완료 이력

- **Phase 1** (2026-03-05): 타입 정의 S2 전환, 30+ 컴포넌트 TSX variant/isEmphasized 변경, 렌더러 S2 props, 5개 에디터 S2 옵션
- **Phase 2** (2026-03-05): ToggleButton.spec.ts isEmphasized, Label.spec.ts 주석 S2 정리, NavigationComponents.ts Factory 기본값 S2 전환 (Pagination variant: outline→secondary+fillStyle, default→accent)
- **Phase 3** (2026-03-05): Button premium/genai variant 추가, ToggleButton S2 전환 (variant 제거 → isEmphasized/isQuiet boolean), ToggleButtonGroup default size S→M, Badge S2 named color variant 13종 추가 (총 19종), Badge size padding S2 spacing 토큰 동기화

## Context

### 문제 정의

ADR-022에서 Spec 내부 색상 토큰을 M3→S2로 전환 완료했으나, **컴포넌트의 외부 API(variant Props)**는 여전히 M3 네이밍을 사용:

| 컴포넌트        | 현재 Props                                                                | S2 대응                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button          | `variant: "primary" \| "secondary" \| "tertiary" \| "error"`              | `variant: "accent" \| "primary" \| "secondary" \| "negative"`                                                                                               |
| Badge           | `variant: "primary" \| "secondary" \| "tertiary" \| "error" \| "surface"` | `variant: "accent" \| "informative" \| "neutral" \| "positive" \| "notice" \| "negative" \| 13 named colors` + `fillStyle: "bold" \| "subtle" \| "outline"` |
| TextField 등    | `variant: "default" \| "primary" \| "secondary" \| "tertiary" \| "error"` | `variant: "default" \| "accent" \| "secondary" \| "tertiary" \| "error"` + `isEmphasized`                                                                   |
| Checkbox/Switch | `variant: "default" \| "primary" \| "secondary" \| "error"`               | `isEmphasized` boolean + `isInvalid`                                                                                                                        |

**핵심 불일치**: S2에서 `primary`는 "검은/중립 채움 버튼"이고, XStudio에서는 "파란 강조 버튼"을 의미. 이 혼동이 S2 컴포넌트 확장 시 장기적 부채.

### Hard Constraints

- ADR-022 색상 토큰 체계(S2 ColorTokens)는 변경하지 않음
- CSS 변수명(`--highlight-background` 등)은 변경하지 않음 (ADR-024 범위)
- 기존 프로젝트 데이터(IndexedDB)의 variant 값 런타임 마이그레이션 필요
- CSS 클래스/data-variant 셀렉터도 동시 변경 필요

## Alternatives Considered

### 대안 A: S2 Props 완전 채택

- 설명: Button `variant: "accent" | "primary" | "secondary" | "negative"`, Badge `fillStyle`, Checkbox `isEmphasized` 등 S2 API 그대로 채택
- 위험:
  - 기술: **M** — S2 Button의 `primary`=검정 vs XStudio의 `primary`=파란 → 의미 반전, 사용자 혼란
  - 성능: **L** — 런타임 영향 없음
  - 유지보수: **L** — S2 문서와 1:1 대응으로 장기적 유지보수 용이
  - 마이그레이션: **H** — Factory 20+, Inspector Panel, IndexedDB 런타임 마이그레이션, CSS data-variant 셀렉터 전체 변경

### 대안 B: 하이브리드 (variant rename + fillStyle 점진 도입)

- 설명: Phase 1에서 variant 이름만 전환 (`primary`→`accent`, `error`→`negative`), Phase 2에서 `fillStyle`/`isEmphasized` 점진 도입
- 위험:
  - 기술: **L** — 단계별 전환으로 각 단계의 복잡도 관리 가능
  - 성능: **L** — 런타임 영향 없음
  - 유지보수: **M** — 과도기에 두 네이밍 공존 가능성
  - 마이그레이션: **M** — Phase 1은 rename만, Phase 2는 새 prop 추가 (기존 유지)

### 대안 C: 현상 유지 (variant 이름 변경 안 함)

- 설명: 내부 토큰만 S2, Props는 기존 M3 네이밍 유지
- 위험:
  - 기술: **L** — 변경 없음
  - 성능: **L** — 변경 없음
  - 유지보수: **H** — 내부(S2)와 외부(M3) 이중 네이밍 → 장기적 혼란 심화
  - 마이그레이션: **L** — 변경 없음

## Decision

**대안 B: 하이브리드 (variant rename + fillStyle 점진 도입)** 채택

위험 수용 근거: Phase 1에서 variant 이름만 변경하면 마이그레이션 범위가 명확하고 되돌리기 쉬움. fillStyle/isEmphasized는 Phase 2에서 별도 도입하여 각 단계 리스크 최소화.

### Phase 1: Variant 이름 전환 (rename only)

**변환 규칙**:

| 현재        | S2 신규    | 비고                     |
| ----------- | ---------- | ------------------------ |
| `primary`   | `accent`   | 파란 강조                |
| `secondary` | `neutral`  | 중립/회색                |
| `tertiary`  | `purple`   | XStudio 전용 (S2에 없음) |
| `error`     | `negative` | 에러/위험                |
| `default`   | `default`  | 변경 없음                |
| `surface`   | `surface`  | Badge 등, 변경 없음      |

**대상 파일**:

| 영역              | 파일                                                                  | 변경 내용                                              |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Spec              | `packages/specs/src/components/*.spec.ts` (~20개)                     | variant 키 rename                                      |
| Factory           | `apps/builder/src/builder/factories/definitions/*.ts` (~15개)         | variant prop 값 변경                                   |
| Inspector         | `apps/builder/src/builder/panels/inspector/*.tsx` (~5개)              | variant 옵션 UI 변경                                   |
| CSS               | `packages/shared/src/components/styles/*.css` (~30개)                 | `data-variant` 셀렉터 rename                           |
| ElementSprite     | `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx` | variant 매핑 상수 변경                                 |
| Runtime Migration | 프로젝트 로드 시 variant 값 자동 변환                                 | IndexedDB 데이터의 구 variant → 신 variant 런타임 매핑 |

### Phase 2: fillStyle / isEmphasized 도입

- **Button/Badge**: `fillStyle: "fill" | "outline" | "subtle"` prop 추가
- **Checkbox/Switch/Slider**: `isEmphasized: boolean` prop 추가
- 기존 variant 유지 + 새 prop 추가 (비파괴적)

## Gates

| Gate | 조건                                                     | 확인 방법                                   |
| ---- | -------------------------------------------------------- | ------------------------------------------- |
| G1   | Phase 1 variant rename 후 모든 Spec 빌드 성공            | `pnpm build:specs && pnpm type-check`       |
| G2   | CSS data-variant 셀렉터 전체 변환 후 Preview 시각적 동일 | 수동 비교 (5개 대표 컴포넌트)               |
| G3   | 기존 프로젝트 로드 시 variant 자동 변환 정상             | IndexedDB 구 데이터 로드 → 시각적 동일 확인 |
| G4   | Phase 2 fillStyle 추가 후 기존 variant 동작 보존         | 기존 프로젝트 로드 → 시각적 동일 확인       |

## Consequences

### Positive

- Spec 내부 토큰과 외부 Props 네이밍 일치 → 개발자 인지 부하 감소
- S2 문서/예제와의 호환성 향상
- `fillStyle`/`isEmphasized` 도입으로 디자인 표현력 확장

### Negative

- Phase 1 마이그레이션 중 50+ 파일 동시 변경 → 충돌 위험
- 런타임 마이그레이션 필요 (기존 IndexedDB 프로젝트 데이터)
- `tertiary`→`purple`은 S2에 없는 XStudio 전용 확장 → 향후 S2 업데이트와 괴리 가능
