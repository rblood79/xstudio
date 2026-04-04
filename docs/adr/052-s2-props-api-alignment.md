# ADR-052: S2 Props API 정합성 마이그레이션

## Status

Proposed — 2026-04-05

## Context

React Aria Components는 low-level primitives로서 props가 과다하다 (컴포넌트당 평균 15~30개). Spectrum 2(S2)는 이를 통합·축소하여 개발자 경험을 개선했다. XStudio Spec의 Props 인터페이스와 프로퍼티 패널 fields는 현재 React Aria Components 기준으로 작성되어 있어, S2 API와 정렬이 필요하다.

**Hard Constraints**:

1. `render.shapes()` 또는 `propagation`에서 참조되는 prop은 이름 변경 시 해당 코드도 동시 수정 필수
2. 기존 Supabase에 저장된 프로젝트 데이터의 props 호환성 유지 (마이그레이션 스크립트 또는 런타임 fallback)
3. 타입 체크 (`pnpm type-check`) + 빌드 (`pnpm build`) 통과 필수
4. Preview(iframe) 컴포넌트가 해당 props를 전달받는 경우, Preview 측도 동시 변경

**Soft Constraints**:

- 프로퍼티 패널 field 제거/변경은 사용자 혼란 최소화 필요
- NumberField `formatOptions` 통합은 프로퍼티 패널 UI 재설계 수반 (JSON 입력 또는 서브필드)
- Phase별 점진 적용 가능 (한 번에 전부 할 필요 없음)

## Alternatives Considered

### 대안 A: Phase별 점진 적용 (권장)

- 설명: Phase 1→5 순서로 각 Phase 완료 후 type-check + build 검증. Phase 3~4는 프로퍼티 패널 UI 변경이 수반되므로 별도 세션.
- 근거: S2 마이그레이션 가이드 (adobe/react-spectrum) 권장 패턴. 각 Phase가 독립적으로 배포 가능.
- 위험:
  - 기술: L — 각 Phase가 작고 독립적
  - 성능: L — props 수 감소로 오히려 개선
  - 유지보수: L — S2 공식 API 정렬로 장기 유지보수성 향상
  - 마이그레이션: M — Phase 3에서 기존 데이터의 formatStyle→formatOptions 변환 필요

### 대안 B: 전체 일괄 적용

- 설명: 모든 Phase를 한 번에 적용. worktree 격리로 진행.
- 근거: 단일 커밋으로 S2 정합성 확보. 중간 상태 없음.
- 위험:
  - 기술: M — 변경 범위가 넓어 충돌 가능성
  - 성능: L — 동일
  - 유지보수: L — 동일
  - 마이그레이션: H — 모든 데이터 변환을 한 번에 처리해야 하며, 롤백 시 전체 되돌림

### 대안 C: 현상 유지 (React Aria 기준)

- 설명: S2 API 정렬을 하지 않고, 현재 React Aria Components 기준 유지.
- 근거: 기존 코드와 데이터 변경 없음. 안정성 최우선.
- 위험:
  - 기술: L — 변경 없음
  - 성능: L — 변경 없음
  - 유지보수: H — S2 문서/예제와 XStudio Spec 간 괴리 증가. 새 컴포넌트 추가 시 혼란.
  - 마이그레이션: L — 변경 없음

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | L    | L    | L        | M            |     0      |
| B    | M    | L    | L        | H            |     1      |
| C    | L    | L    | H        | L            |     1      |

## Decision

**대안 A: Phase별 점진 적용**을 선택한다.

선택 근거:

1. HIGH+ 위험이 0건으로 가장 안전
2. 각 Phase가 독립 배포 가능하여 문제 발생 시 해당 Phase만 롤백
3. Phase 1~2는 shapes/propagation 참조만 수정하면 되어 즉시 실행 가능
4. Phase 3의 formatOptions 통합은 프로퍼티 패널 UI 변경이 필요하나, 별도 세션으로 분리 가능

기각 사유:

- **대안 B 기각**: 마이그레이션 HIGH 위험. 일괄 적용 실패 시 전체 롤백 필요.
- **대안 C 기각**: 유지보수 HIGH 위험. S2 기준과의 괴리가 지속적으로 증가하여 장기적으로 더 큰 비용 발생.

> 구현 상세: [052-s2-props-api-breakdown.md](../design/052-s2-props-api-breakdown.md)

## Gates

| Gate         | 시점       | 통과 조건                                          | 실패 시 대안                            |
| ------------ | ---------- | -------------------------------------------------- | --------------------------------------- |
| Phase 1 완료 | 즉시       | type-check + build 통과, 4개 prop 이름 변경 확인   | 개별 prop 롤백                          |
| Phase 2 완료 | Phase 1 후 | shapes 렌더링 정상, showValue→valueLabel 3컴포넌트 | Phase 1만 유지                          |
| Phase 3 완료 | Phase 2 후 | formatOptions 에디터 동작, 기존 데이터 호환        | 런타임 fallback으로 개별 prop 지원 유지 |

## Consequences

### Positive

- Spec Props가 S2 공식 API와 1:1 정렬 → 문서 참조 용이
- NumberField props 7개 → 1개 (formatOptions) → 프로퍼티 패널 단순화
- 총 -9 props 감소 (21→12)
- 새 S2 컴포넌트 추가 시 API 일관성 보장

### Negative

- Phase 3 formatOptions 통합은 FormatOptionsEditor UI 신규 개발 필요
- 기존 저장 데이터의 prop 이름이 변경되므로 마이그레이션 스크립트 또는 런타임 호환 레이어 필요
- Phase 4 TableView 구조 변경은 Column Spec 수정 수반
