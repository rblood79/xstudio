# ADR-905: Fill 비정형 background payload 정책

## Status

Implemented — 2026-04-24

## Context

ADR-904는 Fill을 D3 시각 스타일 SSOT로 승격하고 Preview/Publish는 `fills -> CSS background*` 어댑터를 통해 소비하도록 정리했다. 그 결과 builder 내부의 주요 ingress는 `fills` canonical payload로 수렴됐지만, 외부 producer가 임의의 `backgroundImage`/data URL/CSS shorthand를 생성해 주입할 경우 어디까지 자동 canonicalize할지 정책은 별도 결정이 남았다.

현재 구현은 다음 범위까지만 bounded parser를 제공한다.

1. `backgroundColor`
2. `linear-gradient(...)`
3. `radial-gradient(...)`
4. `conic-gradient(...)`
5. `url(...) + backgroundSize`
6. mesh adapter가 생성한 SVG data URL

이 범위를 넘어서는 payload를 무제한 수용하면 Fill SSOT가 다시 CSS 의미 체계에 종속될 수 있고, 반대로 전면 차단하면 paste/import/외부 연동의 하위 호환성이 깨질 수 있다.

### SSOT 체인 위치 (ADR-063)

본 ADR은 [ADR-063](063-ssot-chain-charter.md)의 **D3 (시각 스타일)** 후속 정책이다. D3 정본은 계속 top-level `fills`이며, 본 문서는 D3로 진입하는 외부 `background*` payload의 허용 범위와 canonicalization 경계를 결정한다.

### Hard Constraints

1. **정본 불변**: 저장/런타임 정본은 계속 `fills`여야 하며, 비정형 `background*` payload를 새 정본으로 인정하지 않는다.
2. **하위 호환 유지**: ADR-904가 이미 허용한 bounded legacy ingress(`backgroundColor`, 3종 gradient, `url + backgroundSize`, mesh adapter SVG)는 계속 canonicalize되어야 한다.
3. **예측 가능성**: parser가 지원하지 않는 payload는 조용히 임의 변환하지 않고, 명시적 pass-through 또는 명시적 거부 중 하나로 일관되게 처리되어야 한다.
4. **예외 분리**: `RowEditor`/`CellEditor` 같은 component-specific `backgroundColor` prop은 generic fill ingress 정책과 혼합하지 않는다.

### Soft Constraints

- Preview/Publish adapter의 출력 계약은 당분간 유지한다.
- parser 범위는 사람이 리뷰 가능한 수준의 bounded allowlist로 유지한다.
- 향후 producer가 canonical `fills`를 직접 emit하도록 유도하되, 즉시 전면 강제는 피한다.

## Alternatives Considered

### 대안 A: bounded allowlist canonicalization + explicit residual policy

- 설명: 현재 parser 지원 범위를 공식 allowlist로 동결하고, 그 밖의 비정형 payload는 generic fill canonicalization 대상이 아님을 명시한다.
- 근거:
  - ADR-904가 이미 구현한 ingress 범위와 정확히 일치한다.
  - bounded parser는 리뷰/테스트 가능한 범위를 유지한다.
- 위험:
  - 기술: **L** — 현재 구현 경계와 일치
  - 성능: **L** — 추가 파싱 비용 최소
  - 유지보수: **M** — 새 payload 유형이 생기면 명시적 추가 결정 필요
  - 마이그레이션: **L** — 기존 canonicalized 범위 BC 유지

### 대안 B: arbitrary CSS background parser 확장

- 설명: 가능한 한 많은 CSS `background*` 조합을 해석해서 `fills`로 승격한다.
- 근거:
  - 외부 ingress 호환성이 최대화된다.
- 위험:
  - 기술: **H** — CSS 의미 체계가 Fill 모델보다 훨씬 넓어 완전 변환이 어렵다
  - 성능: **M** — parser/normalizer 비용 증가
  - 유지보수: **H** — corner case가 급격히 늘어난다
  - 마이그레이션: **M** — 잘못된 자동 변환이 silent corruption을 만들 수 있다

### 대안 C: Fill V2에서 noncanonical background payload 전면 차단

- 설명: generic ingress에서 `background*`가 들어오면 parser 범위와 관계없이 거부하거나 제거한다.
- 근거:
  - 모델 순도는 가장 높다.
- 위험:
  - 기술: **M** — 구현은 단순
  - 성능: **L** — 파싱 비용 최소
  - 유지보수: **M** — 예외 목록 관리 필요
  - 마이그레이션: **H** — 기존 paste/import/외부 연동 BC가 크게 흔들린다

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | L    | L    | M        | L            |     0      |
| B    | H    | M    | H        | M            |     2      |
| C    | M    | L    | M        | H            |     1      |

루프 판정: 대안 A는 HIGH 위험이 없어 채택 가능하다. 대안 B/C는 parser 과확장 또는 BC 훼손 위험이 커서 기각한다.

## Decision

**대안 A: bounded allowlist canonicalization + explicit residual policy**를 선택한다.

선택 근거:

1. ADR-904가 이미 구현한 canonicalization 범위와 정책 문서가 정확히 일치한다.
2. Fill SSOT를 유지하면서도 legacy/외부 ingress의 현실적인 하위 호환 범위를 보존한다.
3. parser 범위를 bounded allowlist로 고정하면 silent conversion risk를 통제할 수 있다.

기각 사유:

- **대안 B 기각**: CSS `background*` 전체를 Fill 모델로 역변환하는 것은 표현력 차이 때문에 구조적으로 과도하다.
- **대안 C 기각**: 모델은 깨끗하지만 현재 paste/import/외부 연동의 BC를 과도하게 훼손한다.

> 구현 상세: [905-fill-noncanonical-background-payload-policy-breakdown.md](../design/905-fill-noncanonical-background-payload-policy-breakdown.md)

## Risks

| ID  | 위험                                                                                  | 심각도 | 대응                                                 |
| --- | ------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------- |
| R1  | 새 producer가 allowlist 밖 payload를 emit할 때 generic fill canonicalization에서 누락 |  MED   | G1 — ingress inventory + producer contract 문서화    |
| R2  | component-specific `backgroundColor` prop이 generic fill 정책에 잘못 흡수             |  MED   | G2 — Row/Cell 류 예외 도메인 분리 명시               |
| R3  | Preview/Publish adapter output을 다시 ingress parser가 해석하려는 순환 기대 발생      |  LOW   | G3 — adapter output은 direct authoring 아님을 문서화 |

## Gates

| Gate                  | 시점    | 통과 조건                                                                                                                                                            | 실패 시 대안                                 |
| --------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| G1: Allowlist Freeze  | Phase 1 | 지원 ingress 타입 목록과 residual policy가 문서/테스트에 고정된다                                                                                                    | parser 범위 재분류 후 ADR 수정               |
| G2: Exception Split   | Phase 2 | component-specific `backgroundColor` prop이 generic fill 정책에서 분리된다                                                                                           | 예외 목록을 ADR 본문과 breakdown에 추가 고정 |
| G3: Producer Contract | Phase 3 | 신규 producer는 canonical `fills` 또는 allowlist payload만 emit 하도록 가이드되고, allowlist 밖 payload는 현 단계에서 무표식 pass-through residual policy로 유지된다 | ingress 경계에서 warning/guard 추가 검토     |

## Implementation Notes — 2026-04-24

- **Phase 0 완료**: allowlist 6종 parser coverage + residual pass-through + `addElement/addComplexElement/mergeElements/hydrateProjectSnapshot/preview-generated batch` seam baseline 고정.
- **Phase 1 완료**: Preview batch / clipboard paste / Design Kit import / generic store update ingress producer contract 문서화.
- **Phase 2 완료**: `RowEditor` / `CellEditor`의 `backgroundColor`를 table domain prop 예외로 분리.
- **Phase 3 완료**: 현재 코드에는 noncanonical payload 전용 warning/telemetry/guard가 없으며, 본 ADR은 이를 즉시 추가하지 않는다. allowlist 밖 payload는 generic fill canonicalization 정본으로 승격되지 않는 **무표식 pass-through residual policy**로 확정한다.
- warning/telemetry/guard는 필요 시 후속 ADR 또는 addendum에서 다룬다.

## Consequences

### Positive

- ADR-904 완료 상태를 유지한 채 남은 policy debt를 별도 의사결정으로 분리할 수 있다.
- parser 과확장을 막아 Fill SSOT의 의미 경계를 보존할 수 있다.
- 외부 ingress 하위 호환 범위를 문서와 테스트로 명확히 관리할 수 있다.
- runtime warning/telemetry를 섣불리 넣지 않아 기존 paste/import/producer 경로의 노이즈 증가를 피할 수 있다.

### Negative

- allowlist 밖 payload는 계속 residual policy 영역으로 남는다.
- 새 producer 유형이 추가될 때마다 명시적 ADR/addendum 또는 정책 갱신이 필요하다.
- unsupported payload의 사용 현황을 자동으로 수집하지 않으므로, guard 필요성 판단은 별도 조사에 의존한다.

## References

- [docs/adr/904-fill-ssot-preview-publish-adapter.md](904-fill-ssot-preview-publish-adapter.md)
- [docs/adr/design/904-fill-ssot-preview-publish-adapter-breakdown.md](../design/904-fill-ssot-preview-publish-adapter-breakdown.md)
- [apps/builder/src/builder/panels/styles/utils/fillCssIngressParser.ts](../../../apps/builder/src/builder/panels/styles/utils/fillCssIngressParser.ts)
- [apps/builder/src/builder/panels/styles/utils/fillExternalIngress.ts](../../../apps/builder/src/builder/panels/styles/utils/fillExternalIngress.ts)
- [docs/adr/063-ssot-chain-charter.md](063-ssot-chain-charter.md)
