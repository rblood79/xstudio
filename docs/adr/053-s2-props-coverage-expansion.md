# ADR-053: S2 Props 커버리지 확장

## Status

Proposed — 2026-04-05

## Context

ADR-052에서 S2 Props API 정합성 마이그레이션(이름 변경 + 기능 통합 + 기능 변경)을 결정했다. 전체 컴포넌트 대조 결과, ADR-052 범위(14건) 외에도 **S2에 존재하나 XStudio에 누락된 props가 ~66건**, **타입 불일치가 ~24건** 발견되었다.

이 ADR은 S2와의 나머지 gap을 해소하여 XStudio Spec Props를 S2 공식 API에 완전 정렬하는 것을 다룬다.

**Hard Constraints**:

1. 타입 체크 (`pnpm type-check`) + 빌드 (`pnpm build`) 통과 필수
2. size XL 추가 시 Spec `sizes` 객체에 fontSize/padding/borderRadius 등 실제 값 정의 필수 — S2 소스의 디자인 토큰 참조
3. contextualHelp는 S2에서 `ReactNode` 타입이나 빌더에서 JSX 입력 불가 — string 또는 커스텀 에디터 결정 필요
4. Toast variant 리네이밍은 기존 저장 데이터 호환성 유지 (normalization 레이어)

**Soft Constraints**:

- Phase별 점진 적용 (한 번에 전부 할 필요 없음)
- size XL은 Spec `sizes` 정의 + SyntheticComputedStyle 프리셋 + CSS 자동 생성 3곳 동시 추가
- Phase 4 개별 컴포넌트 props는 우선순위가 낮으며, 실제 사용 빈도에 따라 선별 가능

## Alternatives Considered

### 대안 A: 5 Phase 점진 적용 (권장)

- 설명: 일괄 패턴(size XL → 공통 field props → staticColor → 개별 props → variant 확장) 순서로 점진 적용. 각 Phase는 동일 패턴 반복이므로 병렬 에이전트 활용 가능.
- 근거: ADR-052와 동일한 점진 전략. 각 Phase가 독립적으로 빌드 가능.
- 위험:
  - 기술: L — 패턴 반복 (props 추가만, 기존 코드 변경 최소)
  - 성능: L — props 추가만으로 성능 영향 없음
  - 유지보수: L — S2 정렬로 장기 유지보수성 향상
  - 마이그레이션: M — Phase 5 Toast variant 리네이밍에서 기존 데이터 변환 필요

### 대안 B: 필수 항목만 선별 적용

- 설명: contextualHelp, labelAlign 등 프로퍼티 패널에 직접 표시되는 props만 추가. size XL, named colors 등은 보류.
- 근거: 최소 작업량으로 S2 핵심 기능만 확보.
- 위험:
  - 기술: L — 변경 범위 작음
  - 성능: L
  - 유지보수: M — S2와의 gap이 일부 남아 향후 추가 작업 필요
  - 마이그레이션: L — Toast 보류하면 데이터 변환 불필요

### 대안 C: 현상 유지

- 설명: ADR-052만 실행하고 나머지 gap은 유지.
- 근거: 안정성 우선. 추가 작업 없음.
- 위험:
  - 기술: L
  - 성능: L
  - 유지보수: H — S2 props gap이 66건+ 남아 새 컴포넌트 추가 시 혼란 지속
  - 마이그레이션: L

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | L    | L    | L        | M            |     0      |
| B    | L    | L    | M        | L            |     0      |
| C    | L    | L    | H        | L            |     1      |

## Decision

**대안 A: 5 Phase 점진 적용**을 선택한다.

선택 근거:

1. HIGH+ 위험 0건
2. Phase 1~3은 동일 패턴 반복으로 병렬 에이전트 실행 가능 (빠른 완료)
3. Phase 4~5는 우선순위에 따라 선별 실행 가능
4. ADR-052와 동일한 점진 전략으로 일관성 유지

기각 사유:

- **대안 B 기각**: 유지보수 MEDIUM 위험. 부분 적용은 "어디까지 했는지" 추적 부담 발생.
- **대안 C 기각**: 유지보수 HIGH 위험. 66건 gap 유지는 S2 정렬 목표와 모순.

> 구현 상세: [053-s2-props-coverage-breakdown.md](../design/053-s2-props-coverage-breakdown.md)

## Gates

| Gate         | 시점       | 통과 조건                                                                    | 실패 시 대안         |
| ------------ | ---------- | ---------------------------------------------------------------------------- | -------------------- |
| Phase 1 완료 | 즉시       | 17개 컴포넌트 size xl 추가. type-check + build + CSS 생성 통과               | 개별 컴포넌트 롤백   |
| Phase 2 완료 | Phase 1 후 | contextualHelp 15개, labelAlign 10개, isEmphasized 4개 추가. type-check 통과 | Phase 1만 유지       |
| Phase 3 완료 | Phase 2 후 | staticColor auto 4개 컴포넌트 추가. type-check 통과                          | Phase 2까지 유지     |
| Phase 5 완료 | Phase 4 후 | Toast variant 리네이밍 + 데이터 normalization 동작                           | 런타임 fallback 유지 |

잔존 HIGH 위험 없음.

## Consequences

### Positive

- S2 Props 커버리지 ~66건 gap 해소 → S2 공식 API 완전 정렬
- size XL 추가로 대형 UI 컴포넌트 지원 확대
- contextualHelp/labelAlign으로 접근성 + 레이아웃 옵션 확장
- Badge/StatusLight named color 확장으로 디자인 표현력 향상
- Toast variant S2 리네이밍으로 S2 문서와 1:1 대응

### Negative

- Phase 1 size XL은 17개 컴포넌트 × (Spec sizes + CSS + SyntheticComputedStyle) 다량 변경
- Phase 2 contextualHelp는 S2 `ReactNode` → XStudio `string` 타입 축소 (빌더 제약)
- Phase 5 Toast variant 리네이밍은 기존 데이터 normalization 필요
- Phase 4 개별 props는 컴포넌트별 사용 빈도에 따라 일부 보류 가능

### S2 Divergence (의도적 차이)

| 항목                  | S2                    | XStudio                  | 사유                     |
| --------------------- | --------------------- | ------------------------ | ------------------------ |
| size casing           | `'S'\|'M'\|'L'\|'XL'` | `'sm'\|'md'\|'lg'\|'xl'` | ADR-036 Spec 네이밍 규칙 |
| size `xs`             | 없음                  | 일부 컴포넌트에 존재     | 빌더 확장 (소형 UI 지원) |
| `contextualHelp` 타입 | `ReactNode`           | `string`                 | 빌더에서 JSX 입력 불가   |
| Avatar `size`         | px 숫자               | enum                     | 빌더 UX (드롭다운 선택)  |
