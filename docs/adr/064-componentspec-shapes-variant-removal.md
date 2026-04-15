# ADR-064: ComponentSpec shapes API — variant 파라미터 제거 + self-lookup 전환

> **SSOT domain**: D3 내부 API 리팩토링 (Spec↔renderer 계약). variant 개념 자체가 아닌 **주입 주체**를 caller에서 callee로 이전. 정본: [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md), charter: [ADR-063](063-ssot-chain-charter.md).

## Status

Implemented — 2026-04-15 (Proposed 2026-04-13)

## Context

`RenderSpec.shapes` 시그니처는 현재 `(props, variant, size, state)`로, caller(PixiRenderer / buildSpecNodeData)가 `spec.variants[props.variant ?? spec.defaultVariant]` lookup 후 `variantSpec`을 인자로 주입한다. 이 계약은 다음 문제를 야기:

1. **ADR-062 블로커** — Field 계열 11개 Spec에서 `variant` prop을 제거하려면 `variants` 객체도 함께 정리 대상이나, caller가 `variants` lookup을 수행하므로 Spec 개별 제거 시 caller가 runtime 오류. Spec별 독립 작업 불가.
2. **범위 오해 유발** — ADR-062 초안은 Field 11개 "variant 제거"만을 다루려 했으나, caller의 lookup 로직은 83 Spec 전체가 공유 → Field만 제거 시 caller 분기 필요 → 지속 복잡도.
3. **Spec 자율성 약화** — Spec이 "어떤 variant 스펙을 사용할지" 결정권이 자신에게 있음에도 caller가 주입. variant 이름 컨벤션 변경, default 변경, 조건부 variant 선택 등 Spec 내부 로직 이식 불가.

2026-04-13 실측:

- `RenderSpec.shapes` 시그니처: `spec.types.ts:553`
- 호출 지점: PixiRenderer.ts:54 / buildSpecNodeData.ts:700 (2곳)
- Spec 파일: 83개 — `variant.X` 실사용 78파일 (215건), `_variant` 무시 13파일

**Hard Constraints**:

1. **시각 결과 무변경** — 본 ADR은 API 계약 이전만 수행. Spec 출력 shapes는 Phase 검증에서 **완전 동일**해야 한다 (`build:specs` 0 byte diff + parallel-verify 대칭).
2. `pnpm type-check` 3 tasks 통과
3. 83 Spec 전체 일관된 시그니처 유지 (혼재 금지)
4. 원자적 커밋 — 타입/caller/83 Spec 동시 변경. 중간 상태 빌드 실패 불가.

**Soft Constraints**:

- ADR-062(Field variant 제거)의 기술 전제. 본 ADR 완료 후 ADR-062 Phase 1 착수 가능.
- 83파일 mechanical 편집이나 self-lookup 삽입 시 Spec 내 상수 참조가 각 Spec 자체 이름(`TextFieldSpec.variants`)을 알아야 함 → 순환 참조/self-reference 주의.

## Alternatives Considered

### 대안 A: Self-lookup 전환 (본 ADR 제안)

- 설명: 시그니처에서 `variant` 파라미터 제거. 각 Spec 본문 상단에 `const variant = ThisSpec.variants[props.variant ?? ThisSpec.defaultVariant]` 삽입. caller는 `spec.render.shapes(props, sizeSpec, state)`로 호출.
- 근거: React Aria hooks 패턴 — 옵션 resolution을 hook 내부에서 수행. Spec 자율성 + caller 단순화.
- 위험:
  - 기술: **M** — 86파일 mechanical 편집. self-reference 패턴(Spec이 자신의 .variants 참조)은 ES module 순환 없이 가능. 78파일 self-lookup 삽입은 반복적이나 각 Spec별로 정확히 한 곳.
  - 성능: **L** — lookup 횟수 동일. 한 번의 인덱스 조회는 렌더 프레임당 Spec당 1회로 무시 가능.
  - 유지보수: **L** — Spec이 자율적으로 variant 선택 로직 보유. 신규 컴포넌트 온보딩 시 caller 학습 불필요.
  - 마이그레이션: **L** — 원자적 커밋 revert로 완전 롤백.

### 대안 B: 현상 유지 (ADR-062를 caller 분기로 해결)

- 설명: 시그니처 유지. ADR-062에서 Field 11개에 대해 caller가 "이 Spec은 variants 없음"을 감지하고 dummy variantSpec 주입.
- 근거: 최소 변경.
- 위험:
  - 기술: **L** — 기존 계약 그대로
  - 성능: **L**
  - 유지보수: **H** — Field와 비-Field 분기 로직이 caller에 지속 존재. 향후 다른 Spec이 동일 탈출을 요구할 때 분기 누적. Spec 자율성 약화 영구화.
  - 마이그레이션: **L**

### 대안 C: 시그니처에서 variant optional (`variant?`)

- 설명: `shapes: (props, variant: VariantSpec | undefined, size, state)`. Spec이 자체 lookup 원하면 인자 무시.
- 근거: 점진 전환.
- 위험:
  - 기술: **M** — 타입 느슨해져 caller/callee 계약 명확성 약화
  - 성능: **L**
  - 유지보수: **H** — 이중 스타일 공존, 규칙 불명확. 83 Spec이 두 스타일 혼재 허용
  - 마이그레이션: **L**

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| :--: | :--: | :--: | :------: | :----------: | :--------: |
|  A   |  M   |  L   |    L     |      L       |     0      |
|  B   |  L   |  L   |    H     |      L       |     1      |
|  C   |  M   |  L   |    H     |      L       |     1      |

**루프 판정**: A는 HIGH 0 — 추가 루프 불필요. A 채택.

## Decision

**대안 A: Self-lookup 전환**을 선택한다.

선택 근거:

1. **HIGH 위험 0** — 3개 대안 중 유일. B/C는 유지보수 HIGH 장기 부채.
2. **Spec 자율성 회복** — variant 선택 로직이 Spec 자체에 위치. 신규 컴포넌트 온보딩 단순화.
3. **ADR-062 전제 충족** — Field 11개에서 `variants` 객체를 제거해도 caller는 영향받지 않음. ADR-062가 Field 자체에만 집중 가능.
4. **원자적 롤백 가능** — 86파일 단일 커밋. 실패 시 revert.

기각 사유:

- **대안 B 기각**: caller 분기 로직은 "Spec이 자기 것을 모른다"는 역전된 의존. Field variant 제거 성공 후에도 분기 잔존으로 charter 관점에서 Spec 자율성 훼손.
- **대안 C 기각**: optional 시그니처는 "이행 중" 상태를 영구화 — composition의 모든 상태 장기 혼재. 83 Spec 중 어느 쪽이 자체 lookup인지 코드로 표기되지 않아 유지보수 HIGH.

> 구현 상세: [064-componentspec-shapes-variant-removal-breakdown.md](../design/064-componentspec-shapes-variant-removal-breakdown.md)

## Gates

| Gate | 시점              | 통과 조건                                                                                                   | 실패 시 대안                      |
| ---- | ----------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| G1   | Phase 0 커밋 직후 | `pnpm type-check` pass + `pnpm build:specs` generated CSS 0 byte diff (전 컴포넌트) + Storybook 스모크 기동 | 전체 revert, 원인 분석 후 재시도  |
| G2   | Phase 1 완료      | `parallel-verify` 5 샘플(Button/Badge/TextField/Card/Switch) 대칭 통과                                      | 실패 Spec self-lookup 로직 재검토 |

**잔존 HIGH 위험**: 없음.

## Consequences

### Positive

- ADR-062 실행 전제 충족 — Field Spec의 `variants` 객체 제거가 caller 영향 없이 가능
- Spec 자율성 회복 — variant resolution 로직이 Spec 자체에
- caller 단순화 — 2개 renderer가 lookup 책임 해제
- `VariantSpec` 파라미터 타입의 caller-chain 의존 제거

### Negative

- 83파일 단일 커밋의 대규모 diff — 코드 리뷰 부담
- self-reference 패턴(`TextFieldSpec.variants` 내부 참조)이 78 Spec에 반복 — 반복 패턴 수용
- variant 미사용 Spec(`shapes: () => []` 등)은 시그니처만 변경 — 무해하나 diff 잡음
