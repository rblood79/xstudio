# ADR-905 Breakdown: Fill 비정형 background payload 정책

## 목표

- generic fill ingress가 지원하는 `background*` payload 범위를 allowlist로 고정한다.
- allowlist 밖 payload는 정책적으로 residual 영역으로 분리한다.
- component-specific `backgroundColor` prop 예외를 generic fill 정책과 분리한다.

## 정책 요약

### Canonicalization allowlist

현재 generic ingress가 `fills`로 canonicalize하는 범위:

1. `backgroundColor`
2. `linear-gradient(...)`
3. `radial-gradient(...)`
4. `conic-gradient(...)`
5. `url(...) + backgroundSize`
6. mesh adapter가 생성한 SVG data URL

### Residual policy

- 위 allowlist 밖의 `backgroundImage`/data URL/CSS shorthand payload는 generic fill canonicalization 대상이 아니다.
- 이 경우 ingress는 payload를 임의 변환하지 않는다.
- 신규 producer는 가능하면 top-level `fills`를 직접 emit해야 한다.

### Exception domain

- `RowEditor`
- `CellEditor`

위 두 경로의 `backgroundColor`는 table row/cell domain prop이며 generic `style.backgroundColor` ingress와 동일 규칙으로 해석하지 않는다.

## Phase Plan

### Phase 0 — Inventory Freeze

- `fillCssIngressParser.ts` 지원 범위를 문서/테스트와 1:1로 맞춘다.
- `fillExternalIngress.ts` / `elementCreation.ts` / `elements.ts` / `useIframeMessenger.ts` ingress seam을 기준선으로 고정한다.

### Phase 1 — Producer Contract 문서화

- Preview-generated batch
- clipboard paste
- Design Kit import
- generic store update ingress

위 producer/sink가 canonical `fills` 또는 allowlist payload만 emit/accept한다는 계약을 문서화한다.

### Phase 2 — Exception Split

- row/cell 같은 component-specific background prop 경로를 별도 domain으로 문서화한다.
- generic fill 정책 문서에서 해당 예외를 명시적으로 제외한다.

### Phase 3 — Guard Follow-up

- 필요 시 allowlist 밖 payload에 대한 warning 또는 telemetry를 검토한다.
- 단, 본 ADR 자체는 정책 결정이므로 즉시 runtime guard 추가를 필수로 요구하지 않는다.

## 파일 영향 초안

- ADR 본문
  - `docs/adr/905-fill-noncanonical-background-payload-policy.md`
- 구현 기준 문서
  - `docs/adr/design/905-fill-noncanonical-background-payload-policy-breakdown.md`
- 참조 코드
  - `apps/builder/src/builder/panels/styles/utils/fillCssIngressParser.ts`
  - `apps/builder/src/builder/panels/styles/utils/fillExternalIngress.ts`
  - `apps/builder/src/builder/stores/utils/elementCreation.ts`
  - `apps/builder/src/builder/stores/elements.ts`
  - `apps/builder/src/builder/hooks/useIframeMessenger.ts`

## 검증 체크리스트

- [ ] allowlist 6종이 문서와 테스트에서 동일하게 유지된다.
- [ ] allowlist 밖 payload가 generic fill canonicalization의 정본으로 승격되지 않는다.
- [ ] row/cell background prop 예외가 generic fill 정책과 분리되어 문서화된다.
- [ ] 신규 producer 가이드를 README/후속 ADR/리뷰 기준 중 최소 한 곳에 남긴다.

## 오픈 이슈

1. allowlist 밖 payload에 warning을 넣을지, telemetry만 둘지, 무표식 pass-through로 둘지.
2. Preview/Publish adapter output cache 정책을 이 ADR에서 다룰지 별도 성능 ADR로 분리할지.
3. 저장 시 파생 `background*` persistence 완전 제거를 별도 ADR로 언제 분리할지.
