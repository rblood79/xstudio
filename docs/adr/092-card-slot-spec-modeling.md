# ADR-092: Card slot 모델링 — CardHeader / CardContent / CardFooter spec 신설

## Status

Proposed — 2026-04-21

## Context

composition SSOT 체인 (ADR-036/063) 에서 Card 복합 컴포넌트의 **header/content slot 구조**가 spec SSOT 로 모델링되지 않음. ADR-087 SP5 가 "CardHeader/CardContent spec 부재로 scope 외" 명시한 후속 debt.

### 실측 — 현재 Card 구조

- **`packages/specs/src/components/Card.spec.ts`** 존재 (skipCSSGeneration: false, sizes xs~xl, CompositionSpec `childPath: ["CardHeader", "Heading"]` / `["CardContent", "Description"]` 전파 rule 있음)
- **`packages/specs/src/components/CardView.spec.ts`** 존재 (별도 용도 — 단순 카드 뷰, 본 ADR scope 외)
- **CardHeader.spec.ts / CardContent.spec.ts 부재**
- **`packages/shared/src/components/styles/generated/Card.css`** 자동 생성 (Card.spec skipCSSGeneration: false)
- **`packages/shared/src/components/styles/Card.css` 수동 파일 없음** — 모든 CSS 가 Generator 담당 중 (ADR-078 ListBox 과 다른 이상적 상태)
- **`implicitStyles.ts:1824-1870` 3 분기** 존재:
  - `card` 분기 (`:1825`): 자식 `CardHeader/CardContent` Element 에 `style.width: "100%"` 주입
  - `cardheader` 분기 (`:1841`): 자식 `Heading` Element 에 `style.flex: 1` 주입
  - `cardcontent` 분기 (`:1857`): 자식 `Description` Element 에 `style.width: "100%"` 주입
- **CardHeader/CardContent 는 실제 element 로 사용 중** — spec 부재 + element 존재 = ADR-078 ListBoxItem 상황과 동일 패턴

### D3 domain 판정 ([ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

**D3 (시각 스타일) symmetric consumer 의 대칭 복구**. CardHeader/CardContent 의 layout primitive (display/flexDirection/alignItems) 와 size-indexed padding 이 현재 spec 부재로 implicitStyles 분기에 runtime 로직으로 분산. 정식 spec 으로 리프팅하여 3경로 (CSS/Skia/Taffy) SSOT 확보.

### RSP/RAC API 참조

- **RSP Card** (S2, react-spectrum.adobe.com): `<Card>` + child components 구조. 네이밍 (CardBody vs CardContent) 은 **본 ADR 내 WebFetch 검증 미수행** — 별도 후속 ADR 에서 RSP 네이밍 정합 확정
- **composition 현재**: `CardHeader` + `CardContent` + `CardFooter` (factory 자동 생성). 네이밍 유지 — 이미 element 사용 중, 리네이밍은 migration 비용 추가

### Hard Constraints

1. **CardHeader/CardContent element 호환 유지** — 기존 프로젝트 저장 데이터에 CardHeader/CardContent 요소 포함 시 그대로 동작
2. **`implicitStyles.ts` 3 분기 runtime 로직 2 종 보존**: (a) Card 분기 CardHeader/CardContent 자식 width:100% 주입, (b) CardHeader 분기 Heading flex:1 주입. 이는 **자식 Element 에 주입** 이라 containerStyles 로 커버 불가 — 분기 유지 또는 spec propagation 확장
3. **본 ADR scope = spec 신설 + containerStyles 리프팅** 에 한정. 자식 element injection 은 별도 ADR (propagation 확장 필요)
4. `pnpm type-check` 3/3 + specs 166/166 + builder 217/217 PASS
5. `CompositionSpec.propagation.rules` 에 이미 있는 `childPath: ["CardHeader", "Heading"]` 전파 rule 은 보존

### Soft Constraints

- ADR-078 (ListBoxItem) + ADR-090 (GridListItem) childSpecs 패턴 3회 재사용
- **CardFooter 실제 사용 중** — `apps/builder/src/builder/factories/definitions/LayoutComponents.ts:220` factory 가 Card 생성 시 CardFooter element 자동 생성 + `apps/builder/src/builder/hooks/useElementCreator.ts:154-176` Card action 컴포넌트를 CardFooter 로 자동 라우팅. `implicitStyles.ts` 분기는 없으나 element 사용 확인 → **본 ADR scope 포함 (CardHeader/CardContent/CardFooter 3 spec 동시 신설)** 로 확장

## Alternatives Considered

### 대안 A: CardHeader/CardContent/CardFooter 독립 spec 3 신설 + childSpecs 배선 (선정)

- 설명: `CardHeader.spec.ts` + `CardContent.spec.ts` + `CardFooter.spec.ts` 3개 신설. 각자 `archetype: "simple"`, `containerStyles` (display/flexDirection/alignItems), `sizes.md` (paddingX/Y, gap). `CardSpec.childSpecs = [CardHeaderSpec, CardContentSpec, CardFooterSpec]` 배선. ADR-078/090 패턴 재사용
- 근거: 선례 패턴 2회 검증 완료, 3회째 반복. CardFooter 는 factory 자동 생성 + Card action 자동 라우팅 중이라 spec 신설 필수
- 위험:
  - 기술: LOW — 선례 확정
  - 성능: LOW
  - 유지보수: LOW — SSOT 복귀
  - 마이그레이션: LOW — BC 0 (기존 element 호환)

### 대안 B: CompositionSpec.slots Schema 확장 — 단일 Card spec 내부 slot 메타데이터

- 설명: `CompositionSpec` 에 `slots?: Record<string, SlotSpec>` 신설. `CardSpec.composition.slots.header = { padding, fontSize, ... }` 형태. spec 파일 1개 유지
- 근거: 파일 수 감소, slot 관계가 명시적
- 위험:
  - 기술: **MEDIUM** — Schema 확장 + Generator / Skia consumer / Style Panel / Taffy 모두 새 path 지원 필요
  - 성능: LOW
  - 유지보수: **MEDIUM** — 기존 childSpecs 패턴과 이원화, 어느 때 slots vs childSpecs 사용할지 가이드 필요
  - 마이그레이션: LOW

### 대안 C: 현 상태 유지 (spec 부재 유지)

- 설명: CardHeader/CardContent spec 신설 없이 implicitStyles 분기 로직 유지
- 근거: 범위 축소
- 위험:
  - 기술: LOW
  - 성능: LOW
  - 유지보수: **HIGH** — ADR-087 SP5 debt 영구화. ADR-063 D3 symmetric 원칙 위반 고착화
  - 마이그레이션: LOW

### Risk Threshold Check

| 대안                                         | HIGH+ 수 | 판정                                    |
| -------------------------------------------- | :------: | --------------------------------------- |
| A: 독립 spec + childSpecs (ADR-078/090 반복) |    0     | PASS                                    |
| B: CompositionSpec.slots 스키마 확장         |    2     | (MED 2 — 인프라 확장 부담 → 기각, 후속) |
| C: 현 상태 유지                              |    1     | (debt 영구화 → 기각)                    |

대안 A 가 HIGH+ 0.

## Decision

**대안 A 채택**. ADR-078 (ListBoxItem) + ADR-090 (GridListItem) 패턴 3회 재사용. 자식 Element runtime injection 로직 (Heading flex:1, Description width:100%) 은 **본 ADR scope 외** — implicitStyles 분기에 남김 (spec propagation 확장 필요한 후속 ADR).

### Phase 구성

- **Phase 1 (1세션)**:
  1. `packages/specs/src/components/CardHeader.spec.ts` 신설 — archetype:"simple", skipCSSGeneration:false (or true, 수동 CSS 전환 결정 필요), containerStyles (display:flex, alignItems:center, width:100%), sizes.md (paddingX:16, paddingY:12, gap:8, fontSize/lineHeight TokenRef), states
  2. `packages/specs/src/components/CardContent.spec.ts` 신설 — containerStyles (display:flex, flexDirection:column, width:100%), sizes.md (paddingX:16, paddingY:12, gap:4), states
  3. `packages/specs/src/components/CardFooter.spec.ts` 신설 — containerStyles (display:flex, alignItems:center, justifyContent:flex-end, width:100%), sizes.md (paddingX:16, paddingY:12, gap:8), states. factory 자동 생성 호환 유지
  4. `packages/specs/src/components/index.ts` export 3건 추가
  5. `CardSpec.childSpecs = [CardHeaderSpec, CardContentSpec, CardFooterSpec]` 배선
- **Phase 2 (0.5세션)**: `implicitStyles.ts:1824-1838` Card 분기 `width:"100%"` 주입 제거 (containerStyles.width="100%" 가 대신 주입). `:1840-1854` CardHeader Heading flex:1 주입 **유지** (자식 Element injection — scope 외). `:1856-1870` CardContent 동일 유지
- **Phase 3 (검증)**: type-check + specs + builder + build:specs 재생성 확인. Card generated CSS 에 CardHeader/CardContent selector emit 확인 (skipCSSGeneration 결정에 따라 달라짐)

### 구현 파일 변경 목록

1. `packages/specs/src/components/CardHeader.spec.ts` — 신규
2. `packages/specs/src/components/CardContent.spec.ts` — 신규
3. `packages/specs/src/components/CardFooter.spec.ts` — 신규
4. `packages/specs/src/components/Card.spec.ts` — childSpecs 추가 (3 spec)
5. `packages/specs/src/components/index.ts` — export 3건
6. `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` — Card 분기 width:"100%" 주입 제거
7. `packages/shared/src/components/styles/generated/Card.css` — build:specs 재생성

## Risks

| ID  | 위험                                                                  | 심각도 | 대응                                                                                  |
| --- | --------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------- |
| R1  | CardHeader/CardContent spec 의 `skipCSSGeneration` 값 결정            |  LOW   | Card.spec.skipCSSGeneration=false 이므로 두 자식 spec 도 false + childSpecs emit 경로 |
| R2  | CardHeader Heading flex:1 injection 은 자식 element 단위 runtime 필요 |  LOW   | 본 ADR scope 외 명시. 향후 propagation 확장 ADR 대기                                  |
| R3  | Card generated CSS 에 CardHeader/CardContent selector 중복 emit       |  LOW   | ListBoxItem 경로 선례 (ADR-078 Phase 2) 재사용 — 독립 CSS emit skip 옵션 고려         |

잔존 HIGH 위험 없음.

## Gates

잔존 HIGH 위험 없음. 검증 기준:

- type-check 3/3 PASS
- specs 166/166 PASS (snapshot 변동 허용)
- builder 217/217 PASS
- `rg "style: { ...cs, width: \"100%\"" implicitStyles.ts` = 본 ADR 기준 Card 분기 1건 제거 (CardContent/cardheader 분기는 scope 외 유지)
- `packages/shared/src/components/styles/generated/Card.css` diff 확인 — CardHeader/CardContent selector emit 반영

## Consequences

### Positive

- ADR-087 SP5 debt 일부(Card 분기) 해소
- CardHeader/CardContent 가 Style Panel / Skia / Taffy 3경로 SSOT 로 복귀
- ADR-078/090 패턴 3회 검증 — 복합 컴포넌트 slot 모델링 표준 확립

### Negative

- 자식 element injection (Heading flex:1, Description width:100%) 은 여전히 implicitStyles 분기 잔존 — 별도 ADR 필요 (propagation 확장)
- RSP 네이밍 (`CardBody` vs `CardContent`) 정합은 별도 ADR 후속 (WebFetch 검증 필요)

## 참조

- [ADR-078](078-listboxitem-spec-and-generator-child-selector.md) — ListBoxItem spec + childSpecs 선례
- [ADR-090](090-gridlistitem-spec-and-skia-metric-ssot.md) — GridListItem spec 선례 (skipCSSGeneration 고려 포함)
- [ADR-087](087-implicitstyles-residual-branches-categorized-sweep.md) — SP5 후속 후보 #1 선언
- [ADR-063](063-ssot-chain-charter.md) — SSOT 체인 D3 domain
