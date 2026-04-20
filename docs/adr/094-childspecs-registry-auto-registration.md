# ADR-094: childSpecs 자동 registry 등록 — Skia 축 SSOT 복구

## Status

Proposed — 2026-04-21

## Context

composition SSOT 체인 ([ADR-063](063-ssot-chain-charter.md) / [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md)) 은 D3 시각 스타일을 **Skia ↔ CSS 2-consumer symmetric** 구조로 정의. 그러나 `childSpecs` 패턴 (ADR-078/090/092/093) 은 **CSS 축만 공급** 하고 Skia 축은 여전히 `TAG_SPEC_MAP` registry 에 의존 — 대칭 깨진 상태.

### 실측 — debt 선언적 문서화 증거

**`apps/builder/src/builder/workspace/canvas/layout/engines/resolveContainerStylesFallback.test.ts:92-102`** 가 이 debt 를 명시적으로 선언:

```ts
// ADR-083 Phase 0 주의: ListBoxItemSpec 은 TAG_SPEC_MAP 미등록 (ListBox.childSpecs
//   경로로 Skia 렌더) → Phase 0 LOWERCASE_TAG_SPEC_MAP 에도 미포함 → fallback 조회 불가.
//   ListBoxItem containerStyles 는 CSS emit / ADR-079 P1 cascade 에만 기여하며, Skia
//   layout 경로(implicitStyles) 로는 별도 ADR (ListBoxItemSpec 을 TAG_SPEC_MAP 에 등록
//   또는 childSpecs lookup 추가) 로 확장 필요. 본 test 는 그 상태를 선언적으로 문서화.
describe("listboxitem — TAG_SPEC_MAP 미등록 (Phase 0 범위 외)", () => {
  it("empty parentStyle → {} (childSpecs 전용 spec 은 lookup 미작동)", () => {
    const fb = resolveContainerStylesFallback("listboxitem", {});
    expect(fb).toEqual({});
  });
});
```

### Codex round 2 지적 (2026-04-21)

ADR-092/093 리뷰 교차검증 중 Codex 가 동일 문제 재지적:

- `tagSpecMap.ts:109` `TAG_SPEC_MAP` 은 child spec 미포함
- `implicitStyles.ts:95` `LOWERCASE_TAG_SPEC_MAP` 도 `TAG_SPEC_MAP` 에서 파생 → child spec 미포함
- `useLayoutAuxiliary.ts:25` Style Panel layout value 조회도 `TAG_SPEC_MAP` 기반
- "childSpecs 만으로 Skia/Taffy 가 child spec 읽는다" 는 ADR 전제가 **거짓**

### 누적 debt 범위

- **ADR-078** ListBoxItem.spec — Skia 축 미공급 (test 선언)
- **ADR-090** GridListItem.spec — 동일 debt 추정
- **ADR-092** (Proposed, Card slot) — 동일 debt 반복 예정
- **ADR-093** (Proposed, Synthetic-merge) — 동일 debt 반복 예정

즉 childSpecs 패턴을 쓰는 모든 ADR 이 Skia 축에서 **사실상 no-op** 상태. CSS 축만 작동 = D3 symmetric 원칙 미준수.

### D3 domain 판정 ([ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

**D3 (시각 스타일) 대칭 복구 인프라**. 본 ADR 자체는 시각 스타일 값 변경 없음 — registry 경로 확장으로 child spec 이 **Skia 축 (layout + sprite + style panel) 에서도 읽히도록** 인프라 정비. 후속 ADR (091/092/093 재정정 포함) 이 이 인프라 위에서 실질 SSOT 복구.

### Hard Constraints

1. **기존 `TAG_SPEC_MAP` 호환 유지** — 수동 등록된 62 spec 영향 0
2. **ListBoxItem 회귀 방지** — 자동 등록 후 ListBoxItem containerStyles 주입 시작 → `implicitStyles.ts:775-789` ListBoxItem 분기와 **값 일치** 필수 (display:flex, flexDirection:column, alignItems:flex-start, justifyContent:center). 검증 후 분기 해체 가능성 평가
3. **Phase 1 검증**: `resolveContainerStylesFallback.test.ts:92-102` 선언적 debt 테스트를 **"ListBoxItem containerStyles 읽힘"** PASS 로 전환
4. `pnpm type-check` 3/3 + specs 166/166 + builder 217/217 PASS
5. **Skia 축 registry 소비처 3곳 일관 확장**: `TAG_SPEC_MAP` / `LOWERCASE_TAG_SPEC_MAP` / `useLayoutAuxiliary` — 일부만 확장 시 consumer 간 drift 발생

### Soft Constraints

- ADR-078/090 retroactive 검증 (Addendum 1 대상) — 자동 등록 후 실제 SSOT 복구 증거 확보
- Inspector (style panel) 는 ADR-082 작업 기반, child spec 편집 UX 확장 별도 ADR

## Alternatives Considered

### 대안 A: `LOWERCASE_TAG_SPEC_MAP` 생성 시 `childSpecs` 자동 전개 (선정)

- 설명: `implicitStyles.ts:95` `LOWERCASE_TAG_SPEC_MAP = new Map(Object.entries(TAG_SPEC_MAP).flatMap(...))` 로 확장. 각 spec 순회 시 `spec.childSpecs?.forEach(child => entries.push([child.name.toLowerCase(), child]))` 추가. `tagSpecMap.ts` 도 유사 확장 (선택). `TAG_SPEC_MAP` 본체는 불변
- 근거: build-time 1회 변환 (성능 비용 0) + 기존 수동 등록 관행 유지. ADR-078/090/092/093 모두 즉시 자동 적용
- 위험:
  - 기술: LOW — Map 확장 단순 로직
  - 성능: LOW
  - 유지보수: LOW — 중앙 집중, consumer 는 변경 없음
  - 마이그레이션: MED — ListBoxItem.containerStyles (`display:flex, flexDirection:column, alignItems:flex-start, justifyContent:center`) 가 `resolveContainerStylesFallback` 으로 주입 시작 → **기존 `implicitStyles.ts:775-789` ListBoxItem 분기와 동일 값이라 no-op 예상**, 그러나 실측 검증 필수

### 대안 B: 각 child spec 을 `TAG_SPEC_MAP` 에 수동 등록

- 설명: `ListBoxItem: ListBoxItemSpec`, `GridListItem: GridListItemSpec` 등 수동 entry 추가
- 근거: 명시적, registry 가 truth
- 위험:
  - 기술: LOW
  - 성능: LOW
  - 유지보수: **MED** — childSpecs 패턴 쓰는 ADR 마다 registry entry 추가 요구 (ADR-092/093 도 manual 작업) → DRY 위반
  - 마이그레이션: LOW

### 대안 C: `resolveContainerStylesFallback` 에 child lookup 로직 추가

- 설명: registry 미등록 시 모든 spec 의 `childSpecs` 배열 순회하여 이름 매칭
- 근거: registry 불변, lookup 만 확장
- 위험:
  - 기술: LOW
  - 성능: **MED** — 매 lookup 마다 O(spec 수 × childSpecs) 순회 (캐시 없음)
  - 유지보수: MED — `useLayoutAuxiliary` / `specSizeField` 등 다른 consumer 가 동일 로직 중복 구현 필요
  - 마이그레이션: LOW

### Risk Threshold Check

| 대안                    | HIGH+ 수 | 판정                      |
| ----------------------- | :------: | ------------------------- |
| A: build-time 자동 전개 |    0     | PASS                      |
| B: 수동 등록            |    1     | (DRY 위반 → 기각)         |
| C: lookup 로직          |    2     | (성능 + 중복 구현 → 기각) |

대안 A HIGH+ 0 — pass.

## Decision

**대안 A 채택**. `LOWERCASE_TAG_SPEC_MAP` build-time 생성 시 `childSpecs` 자동 전개. `TAG_SPEC_MAP` 본체는 불변 유지 (PascalCase 수동 등록 관행 보존).

### Phase 구성

- **Phase 1 (1세션)**: `implicitStyles.ts:95` `LOWERCASE_TAG_SPEC_MAP` 생성 로직 확장 — 각 spec 의 `childSpecs` 를 lowercase 키로 추가. `resolveContainerStylesFallback.test.ts` 에서 ListBoxItem 선언 테스트를 **PASS 로 전환** (fb 가 ListBoxItem.containerStyles 값 반환). 기존 ListBoxItem 분기 (`implicitStyles.ts:775-789`) 값 일치 확인 — no-op 또는 drift 감지
- **Phase 2 (0.5세션)**: `tagSpecMap.ts:109` `TAG_SPEC_MAP` 의 PascalCase 키도 childSpecs 자동 전개 여부 결정 (Sprite/Skia consumer 가 직접 사용하는 경로). 미필요 시 skip — `LOWERCASE_TAG_SPEC_MAP` 만으로 implicitStyles 경로 커버. Inspector (`useLayoutAuxiliary.ts:25`) 가 어느 것 쓰는지 확인
- **Phase 3 (retroactive 검증)**: ADR-078 ListBoxItem + ADR-090 GridListItem 실제 SSOT 복구 증거 확보. `specSizeField("listboxitem", "md", "paddingX")` 같은 호출이 이제 유효값 반환하는지 test 작성
- **검증**: type-check + specs + builder + Chrome MCP ListBox/GridList 실측 (시각 변동 없음 확인)

### Addendum 후속 ADR 의존

- **ADR-091 재정정**: ICON_SIZE_MAP Class A 재분류 시 IconSpec.sizes 참조 경로는 `specSizeField` 사용 — ADR-094 인프라 불필요 (Icon 은 부모 spec)
- **ADR-092 재정정**: CardHeader/CardContent/CardFooter childSpecs 등록 → ADR-094 자동 등록 → Skia 축 소비 확보
- **ADR-093 재정정**: TagList/RadioItems/CheckboxItems childSpecs 등록 → 동일

## Risks

| ID  | 위험                                                                              | 심각도 | 대응                                                                                                                                       |
| --- | --------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | ListBoxItem 자동 등록 후 실제 layout 변경 발생                                    |  MED   | Phase 1 에서 implicitStyles.ts:775-789 값과 ListBoxItemSpec.containerStyles 값 사전 대조. 일치 시 no-op. 불일치 시 해당 ADR 재검토 후 진행 |
| R2  | `tagSpecMap.ts` PascalCase 확장 시 Sprite consumer 경로에 영향                    |  MED   | Phase 2 에서 별도 평가. 필요 없으면 skip                                                                                                   |
| R3  | `useLayoutAuxiliary` Inspector 가 child spec 을 읽기 시작하면 Style Panel UX 변화 |  LOW   | Inspector 는 ADR-082 scope. 본 ADR 은 registry 만 확장, UX 영향 검증                                                                       |

잔존 HIGH 위험 없음.

## Gates

잔존 HIGH 위험 없음. 검증 기준:

- type-check 3/3 PASS
- specs 166/166 PASS
- builder 217/217 PASS (특히 `resolveContainerStylesFallback.test.ts` ListBoxItem 케이스 PASS 전환)
- `rg "childSpecs 전용 spec 은 lookup 미작동" apps/builder` = 0 (test 주석 제거)
- Chrome MCP ListBox/GridList 시각 변동 없음 (no-op 확증)

## Consequences

### Positive

- **D3 symmetric 원칙 복구** — Skia ↔ CSS 양축 대칭 공급
- ADR-078/090 누적 debt 해소 (retroactive)
- ADR-092/093 구현 시 자동 적용 — 개별 ADR 이 registry 등록 scope 를 걱정할 필요 없음
- 향후 childSpecs 패턴 쓰는 ADR 일괄 혜택
- 중앙 집중 인프라 — consumer 파일 변경 없음

### Negative

- 기존 `implicitStyles.ts` child tag 분기 (ListBoxItem `:775-789`, GridListItem `:758-773`, CardHeader `:1841-1854` 등) 가 **중복 주입 경로** 가 됨 (fallback + 분기). R1 검증 후 분기 해체 여부 결정 필요 — 별도 sweep ADR 가능
- `LOWERCASE_TAG_SPEC_MAP` 엔트리 수 증가 → 디버깅 시 매핑 확인 복잡도 소폭 증가

## 참조

- [ADR-078](078-listboxitem-spec-and-generator-child-selector.md) — 첫 childSpecs 패턴 (Skia 축 debt 시작)
- [ADR-090](090-gridlistitem-spec-and-skia-metric-ssot.md) — 2번째 childSpecs 패턴
- [ADR-063](063-ssot-chain-charter.md) — SSOT 체인 D3 symmetric 원칙 정본
- [ADR-083](083-archetype-base-styles-lifting.md) — `LOWERCASE_TAG_SPEC_MAP` Phase 0 인프라
- [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md) — D3 consumer 정의
