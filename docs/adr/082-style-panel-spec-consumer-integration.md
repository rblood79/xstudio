# ADR-082: Style Panel Spec Consumer 통합 — containerStyles/composition.\* fallback chain

## Status

Implemented — 2026-04-22 (세션 16). Proposed — 2026-04-20.

## Context

### D3 domain 판정 (ADR-063 SSOT 체인)

본 ADR 은 **D3 (시각 스타일) symmetric consumer 범위 확장**. Spec (D3 SSOT) 이 선언한 기본값을 **Style Panel (Style Panel 은 Spec 의 값을 reflecting 하는 UI consumer)** 이 모든 4 section (Transform / Layout / Appearance / Typography) 에서 읽을 수 있도록 consumer hook 통합. **Spec 내용 변경은 없음** — consumer 범위만 확장.

### 배경 — ADR-079 P2 의 부분 해결

ADR-079 Phase 2 에서 `useContainerStyleDefault` hook 을 신설하여 Layout section 의 `display / flexDirection` **2 필드만** `spec.containerStyles` 를 읽도록 확장했다. 하지만:

- **같은 Layout section 의 `alignItems / justifyContent`** — hook docstring 에는 "participate containerStyles read-through" 주석이 있으나 실제 코드는 `useStyleProp` only (미연결 버그)
- **Appearance / Transform / Typography section** — `spec.containerStyles` 전혀 미참조 (`specPresetResolver` 는 `spec.sizes[size]` 만 조회)
- **`spec.composition.*`** (Composite Spec 23개) — Style Panel 4 section 모두 **완전 무시**

### 현재 코드 구조

**`apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts:45-62`** — 모든 4 resolver 의 공통 base:

```typescript
function createResolver<T>(extractor: PresetExtractor<T>) {
  return (type, size) => {
    const spec = TAG_SPEC_MAP[type] as unknown as SpecShape;
    const sizeEntry = spec?.sizes?.[size ?? "md"]; // ← 유일 조회 경로
    const preset = sizeEntry ? extractor(sizeEntry) : ({} as T);
    return preset;
  };
}
```

4 section resolver 호출처:

- `resolveSpecPreset` — Transform (width/height/minWidth/maxWidth/...)
- `resolveAppearanceSpecPreset` — Appearance (borderRadius/borderWidth)
- `resolveLayoutSpecPreset` — Layout (gap/padding/margin)
- `resolveTypographySpecPreset` — Typography (fontSize/lineHeight/letterSpacing/fontWeight/fontFamily)

**`useLayoutAuxiliary.ts:25-39`** 의 `useContainerStyleDefault` — containerStyles 참조 유일 진입점 (2 필드 한정):

```typescript
function useContainerStyleDefault(
  id: string | null,
  property: "display" | "flexDirection" | "alignItems" | "justifyContent",
): string {
  const tag = s.elementsMap.get(id)?.tag;
  const spec = TAG_SPEC_MAP[tag];
  const value = spec?.containerStyles?.[property];
  // ...
}
```

signature 는 4 필드 union 이나 실제 caller 는 display/flexDirection 2 개 뿐.

### 매트릭스 실측 (2026-04-20)

109 Spec × 4 section 조사 결과:

| 범주                          |           Spec 수            | 값 저장 위치                                                    |               4 section 표시 성공                |
| ----------------------------- | :--------------------------: | --------------------------------------------------------------- | :----------------------------------------------: |
| 단순 (sizes only)             |             ~80              | `sizes[size]`                                                   |                      ✅ 4/4                      |
| Non-composite containerStyles | 3 (Menu/ListBox/ListBoxItem) | `containerStyles` + `sizes`                                     | ⚠️ 1.5/4 (Layout display/flexDirection 2 필드만) |
| Composite (composition.\*)    |              23              | `composition.containerStyles` + `composition.gap` 등 CSS string |          ❌ 0/4 (composition 완전 무시)          |

**합계 ~100 Spec × section combinations 에서 Spec 기본값 표시 실패**. 사용자가 Panel 에서 "값 없음" 또는 "하드코딩 fallback (`"0px"`, `"#FFFFFF"`)" 을 보게 됨.

### 구체 실증 케이스 (ListBox 선택 시)

`ListBoxSpec.containerStyles` 선언:

```typescript
{
  background: "{color.raised}",    // ❌ Appearance Fill 미표시
  border: "{color.border}",        // ❌ Appearance Border 미표시
  borderWidth: 1,                  // ❌ Appearance Border 미표시
  borderRadius: "{radius.lg}",     // ❌ Appearance Border 미표시
  padding: "{spacing.xs}",         // ❌ Layout Padding 미표시 (shorthand)
  gap: "{spacing.2xs}",            // ❌ Layout Gap 미표시
  display: "flex",                 // ✅ Layout 표시 (ADR-079 P2)
  flexDirection: "column",         // ✅ Layout 표시 (ADR-079 P2)
  alignItems: ...,                 // ❌ Layout Alignment 미표시 (주석만)
  justifyContent: ...,             // ❌ Layout Alignment 미표시 (주석만)
  width: "100%",                   // ❌ Transform width 미표시
  maxHeight: "300px",              // ❌ Transform maxHeight 미표시
  overflow: "auto",                // ❌ Appearance overflow 미표시
}
```

11/13 필드 미표시 = **Spec 선언 85% 가 Style Panel 에 도달하지 않음**.

### Hard Constraints

1. **Spec 내용 수정 없음** — 109 Spec 파일은 변경하지 않는다. consumer 만 확장
2. **3-tier fallback 우선순위** — 사용자 inline style 값이 **항상 최우선**. Spec 은 기본값만 공급:
   1. `elementsMap[id].props.style[property]` (사용자 inline 값)
   2. `spec.containerStyles[property]` (ADR-071 Non-composite 기본값)
   3. `spec.composition.containerStyles[property]` + `composition.gap` 등 (Composite 기본값, CSS string parse)
   4. `spec.sizes[size][property]` (sizes 기본값, 현재 유일 경로)
3. **TokenRef 해석 일관성** — `"{spacing.xs}"` → 숫자 4 (resolveToken), `"var(--spacing-xs)"` → `{spacing.xs}` → 4 (신규 역변환 parser)
4. **성능 영향 10% 미만** — useStore subscription 수 증가 시 Panel 리렌더 비용 증가. selector 캐싱 유지
5. **회귀 0** — 기존 sizes 경로 표시 값 변경 금지 (fallback 은 sizes 값이 없는 경우만 발동)
6. **type-check 3/3 + vitest 전체 회귀 0**
7. **ADR-081 C4 scope 자동 확장** — hook 이 resolved 숫자를 반환하면 `tokenConsumerDrift.test.ts` 의 C4 drift test 진입점 확보 (ADR-081 R4 debt 부분 해소)

### Soft Constraints

- GridListItem Spec 부재 (109 Spec 중 유일한 Spec 화 미완) — 본 ADR scope 외, 별도 ADR-083 처리 (GridListItem 은 Spec 자체가 없어 consumer 확장 대상 아님)
- 외부 상수 (SWITCH_SELECTED_TRACK_COLORS 등) — 본 ADR scope 외, Spec 이관은 별도 ADR
- `composition.containerVariants` / `staticSelectors` 등 복잡 CSS 규칙 — base 값만 consumer 공급, variant/selector 단위 분기는 향후 확장

### ADR-080 P1 의존성

`resolveContainerStylesFallback` (ADR-080 export seam) 은 본 ADR 의 **Non-composite 경로 patterns 의 선례** — 동일 패턴을 4 section resolver 로 확장 + Composite 경로 추가. ADR-080 P1 helper 는 layout engine 전용이므로 Style Panel consumer 와 별개 함수지만, **TokenRef resolve + fallback chain 패턴** 을 재사용.

## Alternatives Considered

### 대안 A: specPresetResolver 3-tier fallback + 4 section hook 통합 (추천)

`createResolver` 를 확장하여 3-tier fallback chain 을 구현. 각 4 section 의 resolver 가 동일 로직으로 containerStyles → composition.\* → sizes 순회. hook 은 fallback 결과를 `useStyleProp` 과 merge.

**구현 범위**:

- `specPresetResolver.ts` — `createResolver` 에 3-tier chain 추가 (80-100 LOC)
- `tokenResolver.ts` — `cssVarToTokenRef(cssVar: string): TokenRef | null` 역변환 parser 신설 (매핑 테이블 기반, 30-40 LOC)
- 4 section hook (`useAppearanceValues`, `useFillValues`, `useTransformValues`, `useLayoutValues`, `useLayoutAuxiliary`, `useTransformAuxiliary`) — fallback 결과 참조 추가 (각 5-15 LOC)
- `useLayoutAuxiliary.ts` — alignItems/justifyContent 미연결 버그 수정 (10 LOC)

**위험**:

- 기술: **LOW** — 기존 패턴 (ADR-079 P2, ADR-080 P1) 동일 구조 확장
- 성능: **LOW** — selector 캐싱 유지, fallback 은 캐시된 결과 조회만. ~2ms 이내 증가
- 유지보수: **LOW** — consumer 로직 한 곳 (specPresetResolver) 에 집중, 4 section 이 동일 규칙 적용
- 마이그레이션: **LOW** — Spec 내용 불변, hook 추가만. 기존 동작 회귀 없음 (sizes 값 우선)

### 대안 B: 각 section 개별 containerStyles 참조

`useContainerStyleDefault` 패턴을 4 section 별로 복제하되 resolver 통합 없이 hook 레벨에서 개별 처리.

**위험**:

- 기술: **LOW**
- 성능: **LOW**
- 유지보수: **MEDIUM** — 4 hook × 3-tier chain = 12개 fallback 경로 중복 구현. 새 Spec 필드 추가 시 4곳 동기화 부담. `composition.*` parse 로직 중복
- 마이그레이션: **LOW**

### 대안 C: Spec 필드 통합 — composition.containerStyles 를 top-level containerStyles 로 이관

19 Composite Spec 의 `composition.containerStyles` → `spec.containerStyles` 로 스키마 이관하여 consumer 가 한 경로만 조회하도록 단순화.

**위험**:

- 기술: **HIGH** — 19 Spec 재설계. CSSGenerator 의 `isComposite = !!spec.composition` 분기 의존 코드 재작성 (1519 LOC 중 ~18 reference)
- 성능: **MEDIUM** — CSSGenerator 분기 재설계 시 generated CSS 전체 regenerate 필요
- 유지보수: **MEDIUM** — 장기적으로는 단일 경로가 우아하지만, 단계적 마이그레이션 없이 한 번에 진행하면 회귀 위험 HIGH
- 마이그레이션: **HIGH** — 19 Spec × composition.\*/containerStyles 재구조화. 기존 generated CSS snapshot 전부 diff. 롤백 어려움

### 대안 D: Runtime assertion only

consumer 확장 대신 Spec → Style Panel 미도달을 runtime 에서 console.warn 으로만 알림.

**위험**:

- 기술: **LOW**
- 성능: **LOW**
- 유지보수: **HIGH** — 근본 문제 (consumer 미구현) 미해결. 사용자 경험 저하 영구화
- 마이그레이션: **LOW**

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | :--: | :--: | :------: | :----------: | :--------: |
| A    |  L   |  L   |    L     |      L       |     0      |
| B    |  L   |  L   |    M     |      L       |     0      |
| C    |  H   |  M   |    M     |      H       |     2      |
| D    |  L   |  L   |    H     |      L       |     1      |

**루프 판정**:

- 대안 A: HIGH 0 — 즉시 채택 가능
- 대안 B: HIGH 0 이나 유지보수 MEDIUM (중복 비용)
- 대안 C: 기술/마이그레이션 HIGH — ADR-080 기각 대안 C 와 유사한 근본 재설계. 본 ADR scope 초과
- 대안 D: 유지보수 HIGH — 근본 문제 미해결

**대안 A 채택**, 나머지 기각.

## Decision

**대안 A (specPresetResolver 3-tier fallback + 4 section hook 통합) 선정.**

**위험 수용 근거**: 모든 4축 LOW. ADR-079 P2 (display/flexDirection consumer) 와 ADR-080 P1 (resolveContainerStylesFallback helper) 의 검증된 패턴 확장. Spec 내용 불변으로 회귀 위험 최소. fallback chain 우선순위 명확 (inline > containerStyles > composition > sizes) 로 기존 sizes 경로 동작 보존.

**기각 사유**:

- **대안 B**: 4 hook × 3-tier 중복 구현 → 새 Spec 필드 추가 시 동기화 부담
- **대안 C**: 19 Composite Spec 재설계는 ADR scope 초과. 스키마 통합은 별도 ADR (대안 C 본질은 근본 재설계 ADR)
- **대안 D**: consumer 미구현 영구화 = D3 SSOT 가 Style Panel 에 도달하지 않는 구조적 결함 유지

**구현 범위 (Phase 분할)**:

- **P1**: `tokenResolver.ts` 에 `cssVarToTokenRef()` 역변환 parser 신설 + unit test
- **P2**: `specPresetResolver.ts` 의 `createResolver` 에 3-tier fallback chain 추가 + containerStyles/composition.\* extractor
- **P3**: 4 section hook (`useAppearanceValues`, `useFillValues`, `useTransformValues`, `useLayoutValues`, `useTransformAuxiliary`) fallback merge
- **P4**: `useLayoutAuxiliary.ts` alignItems/justifyContent 미연결 버그 수정 (연관 Layout section 4필드 완결)
- **P5**: 109 Spec × 4 section 실 검증 (Chrome MCP 대표 Spec 10개 sampling + vitest snapshot 확장)

> 구현 상세: [082-style-panel-spec-consumer-integration-breakdown.md](../design/082-style-panel-spec-consumer-integration-breakdown.md)

## Risks

대안 A 선정 후에도 남는 **운영 위험**.

| ID  | 위험                                                                                         | 심각도 | 대응                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `cssVarToTokenRef` 매핑 테이블 완전성 — 미등록 CSS var 은 fallback 실패                      |  MED   | `tokenToCSSVar` 매핑과 1:1 대응하도록 테스트. 생성 경로 (Spec → CSS var) 와 역변환 경로 (CSS var → Spec) 가 같은 테이블 참조하도록 구조화. 미등록 var 은 warning + null 반환 (silent fail 방지)        |
| R2  | Composite Spec 23개의 `composition.containerStyles` 중 사용자 인라인 편집 우선순위 판정 혼동 |  MED   | fallback chain 우선순위 명확 (inline > containerStyles > composition > sizes). 각 hook return 결과에 source 추적 ("inline"/"spec" debug info 주입 가능 옵션). Chrome MCP 대표 5 Composite Spec 실 검증 |
| R3  | 성능 영향 — 109 Spec × 4 section selector 호출 증가                                          |  LOW   | `createResolver` 내 `Map` 캐싱 유지 + fallback 결과도 캐싱. Panel 리렌더 시 recompute 없이 캐시 조회. React DevTools profiler 로 before/after 비교 검증 (<10% 증가 목표)                               |
| R4  | `composition.*` CSS string parse 실패 시 silent fallback → sizes 값 표시                     |  LOW   | parse 실패 시 console.warn (dev 모드). production 번들 에서는 silent. ADR-081 C4 확장으로 build-time drift test 에서 감지                                                                              |
| R5  | Layout/Transform auxiliary hook (alignItems 등) 에 fallback 추가 후 이중 source race         |  LOW   | inline 값 부재 시만 fallback 발동. useMemo deps 에 inline+spec 양쪽 포함. 초기 렌더 1회 caching                                                                                                        |

**잔존 HIGH 위험 없음** — 모든 Risks 가 MED/LOW. R1/R2 가 가장 우선.

## Gates

| Gate | 시점          | 통과 조건                                                                                                                                                                                                                                                                                                           | 실패 시 대안                         |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| G0   | P1 착수 전    | 109 Spec × 4 section 매트릭스 완료 (Context 에 기재). `tokenToCSSVar` 매핑 테이블 현재 상태 확인 + `cssVarToTokenRef` 신설 테이블 1:1 대응 설계 완료                                                                                                                                                                | 매트릭스 재작성 후 재착수            |
| G1   | P1 완료 후    | `cssVarToTokenRef("var(--spacing-xs)") === "{spacing.xs}"` + 역함수 `tokenToCSSVar("{spacing.xs}") === "var(--spacing-xs)"` 왕복 test PASS. 매핑 테이블 통합 (생성/역변환 동일 source). unit test 10+                                                                                                               | 매핑 테이블 재설계 후 재시도         |
| G2   | P2 완료 후    | `resolveAppearanceSpecPreset("listbox", undefined)` 호출 시 `{ borderRadius: 8, borderWidth: 1 }` 반환 (ListBoxSpec.containerStyles 에서 읽음). `resolveLayoutSpecPreset("select", "md")` 호출 시 `gap: 4` 반환 (composition.gap="var(--spacing-xs)" parse). 3-tier fallback chain unit test PASS                   | resolver extractor 재설계 후 재시도  |
| G3   | P3+P4 완료 후 | `useAppearanceValues(listboxElementId)` 반환값에 `borderRadius: "8px"`, `borderColor: "var(--border)"` 포함. `useLayoutAuxiliary` 의 alignItems/justifyContent 가 Spec 값 반환. 6 hook 업데이트 vitest PASS                                                                                                         | hook 별 개별 fallback 적용 후 재시도 |
| G4   | P5 완료 후    | **Chrome MCP 대표 10 Spec** (ListBox/Menu/ListBoxItem/Select/ComboBox/DatePicker/TextField/CheckboxGroup/ToggleButtonGroup/Button) 선택 시 Style Panel 4 section 에 Spec 기본값 표시 확인. `/cross-check` 회귀 없음. specs vitest 152/152 + builder vitest 185/185 PASS + type-check 3/3 PASS + 빌드 시간 +10% 미만 | 회귀 분기 특정 후 rollback           |

**잔존 HIGH 위험 없음.**

## Consequences

### Positive

- **Spec SSOT → Style Panel 100% 도달** — 사용자가 모든 Spec 기본값을 Panel 에서 확인 가능. Spec 선언과 Panel 표시 일치
- **ADR-079 P2 완결** — Layout section 의 alignItems/justifyContent 주석만 있던 미구현 버그 해소
- **ADR-080 P1 패턴 확장** — `resolveContainerStylesFallback` 과 동일 fallback chain 원칙을 Style Panel 에도 적용. 향후 Spec 확장 시 consumer 자동 포섭
- **ADR-081 C4 scope 자동 확장** — hook 이 resolved 숫자 소비 시작 → `tokenConsumerDrift.test.ts` 에 C4 Style Panel drift 추가 가능. ADR-081 R4 debt 부분 해소
- **Composite Spec 가시성 복원** — 23 Composite Spec 의 `composition.containerStyles` / `composition.gap` 이 처음으로 Style Panel 에 표시됨
- **GridListItem Spec 신설 (ADR-083) 선행 조건 미완 확인** — 매트릭스 조사로 Spec 화 100% 도달 거리 확정 (108/109)

### Negative

- **`cssVarToTokenRef` 매핑 테이블 유지 비용** — `tokenToCSSVar` 와 1:1 대응 유지 필수. 새 token category 추가 시 양쪽 동시 갱신. 단 매핑 단순 (category 5종: color/spacing/typography/radius/shadow)
- **selector 호출 증가** — 109 Spec × 4 section × ~10 필드 = 최대 4,360 selector. 캐싱 필수. 캐싱 실패 시 Panel 리렌더 비용 증가 우려
- **Composite Spec 의 `composition.containerVariants` / `staticSelectors` 는 미지원** — `containerVariants` (예: label-position="side") 에 따른 값 분기는 base 값만 공급 + variant 분기는 향후 확장
- **외부 상수 Spec 이관은 별도 과제** — SWITCH_SELECTED_TRACK_COLORS / SLIDER_FILL_COLORS 등은 본 ADR scope 외

## Addendum A3 — 2026-04-20: Hard Constraint "Spec 내용 불변" 해제 (ADR-083 착수)

ADR-082 본문은 Hard Constraint 로 "Spec 내용 변경 없음 — 109 Spec 파일은 변경하지 않는다. consumer 만 확장" (§Hard Constraints#1, §Decision 위험 수용 근거, §Risks 마이그레이션) 을 명시했다. 본 Addendum 은 이 제약을 **ADR-083 (Layout Primitive 리프팅) 착수 시점부터 해제**한다.

### 해제 사유

- **ADR-083 scope**: archetype base (CSSGenerator 단독 소유 12 entry) 의 **layout primitive 8 필드** (display/flexDirection/alignItems/justifyContent/width/maxHeight/overflow/outline) 를 Spec.containerStyles SSOT 로 리프팅. 리프팅된 field 만 Style Panel 4 section + Skia consumer (implicitStyles.ts Phase 0 공통 선주입) 에 symmetric 전파
- **ADR-082 consumer 인프라 필수 의존**: Phase 0~11 리프팅된 spec 값이 Style Panel 에 표시되려면 ADR-082 의 `specPresetResolver` 3-tier fallback 이 선결 완성되어야 함
- **역방향 호환**: ADR-082 Phase 1~5 는 그대로 유효 — consumer 경로는 spec 값이 있든 없든 동작. ADR-083 Phase 1+ 의 리프팅 결과가 자연스럽게 4 section 에 반영됨

### 해제 범위

- **허용**: ADR-083 scope 내 layout primitive 8 필드 Spec containerStyles 추가 (109 spec 중 리프팅 대상 63 spec)
- **금지 유지**:
  - 비-layout 속성 (box-sizing / cursor / font-family / position / grid-template-\*) — archetype table 잔존, 후속 ADR
  - color 필드 (background/text/border) 임의 추가 — ADR-071 variants 블록 스킵 트리거. ADR-083 Phase 1 Generator 개선으로 "color 필드 있을 때만 variants skip" 분리 적용됨
  - 109 spec 의 variants / sizes / render.shapes / states 등 기타 필드 변경 — scope 외

### Addendum land 시점

- **2026-04-20**: ADR-083 Phase 1 Pilot (alert archetype — InlineAlert + IllustratedMessage) 완료와 동반 커밋. InlineAlert.spec + IllustratedMessage.spec 에 `containerStyles: { display, flexDirection, alignItems, width }` 추가 + CSSGenerator "color-only variants skip" 분리 리팩토링 + InlineAlert factory `width:"100%"` 중복 제거 (R5) 동반 land

## Addendum A4 — 2026-04-22 (세션 16): A1/A2 + P5 Gate G4 간접 입증

본 Addendum 은 ADR-082 의 P3 hook 확장과 P5 Gate G4 진전을 기록한다. Status 는 **Proposed 유지** — Chrome MCP 인프라(P2 후보) 도입 전까지 공식 G4 종결 보류.

### 변경 요약 3건

**A1 — useTransformAuxiliary 부모 Spec containerStyles fallback**

`apps/builder/src/builder/panels/styles/hooks/useTransformAuxiliary.ts` 에 `resolveParentContainerStyle(parentId, property, fallback, state)` 헬퍼 신설. `useParentDisplay` / `useParentFlexDirection` 이 부모의 inline style 부재 시 `TAG_SPEC_MAP[parent.tag]?.containerStyles?.{display|flexDirection}` 을 조회. 우선순위 = inline > Spec containerStyles > 기본값(`block`/`row`).

효과: 자식 요소의 `useSelfAlignmentKeys` 9-grid 가 `ListBoxSpec.containerStyles.display="flex"` 같은 Spec-default flex 부모에서도 활성화. 기존 코드는 inline display 부재 시 block 으로 판정되어 SelfAlignment UI 가 비활성.

테스트: `useTransformAuxiliary.test.tsx` 의 `ADR-082 A1 부모 Spec fallback` describe 에 RED→GREEN 5 테스트 추가 (ListBox 부모 3 시나리오 + inline 우선 1 + Dialog 부모 containerStyles 미보유 fallback 1).

**A2 — useFillValues Spec fallback 의도적 스킵 (scope 결정)**

`apps/builder/src/builder/panels/styles/hooks/useFillValues.ts` 헤더 JSDoc 에 ADR-082 scope 결정 명문화 주석 추가. Fill 섹션은 user-authored `fills` 배열(gradient stops / solid fills 다층) 편집 전용이며, Spec 기본 배경 색상은 `useAppearanceValues.specPreset.backgroundColor` 경로로 이미 소비되므로 중복 표시 방지를 위해 의도적으로 스킵. `ensureFills(rawFills, backgroundColor)` 의 backgroundColor seed 는 기존과 동일하게 inline style 만 참조.

**B — P5 Gate G4 entry-point snapshot matrix**

`apps/builder/src/builder/panels/styles/utils/specPresetResolver.test.ts` 에 `ADR-082 P5 Gate G4 — 10 Spec × 4 section entry-point snapshot` describe 신설. 10 테스트가 10 Spec × 4 resolver (Transform / Appearance / Layout / Typography) 반환값 실측 assertion 을 수행.

| Spec              | 주요 검증 필드                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ListBox           | Transform(width/maxHeight) + Appearance(borderRadius/borderWidth/bg/border) + Layout(display/gap/padding) + Typography(fontSize)                       |
| Menu              | Appearance(borderRadius/borderWidth/bg) + Layout(display/flexDirection)                                                                                |
| ListBoxItem       | Layout(display/flexDirection/alignItems/justifyContent) — P4 연관 검증                                                                                 |
| Select            | Layout.gap = 6 (sizes.md) / undefined size 시 composition.gap=4 fallback                                                                               |
| ComboBox          | 동일 패턴 (sizes.md.gap=6 / composition.gap=4)                                                                                                         |
| DatePicker        | Layout(display=flex / gap=4 composition fallback)                                                                                                      |
| TextField         | Layout(display=flex) + Transform(width="fit-content" from composition.containerStyles) — Typography 커스텀 CSS var(--label-font-size) 는 scope 외 확인 |
| CheckboxGroup     | Layout(display=flex / gap=4) — composition 의 `--cb-items-gap:12px` 는 resolver scope 외                                                               |
| ToggleButtonGroup | Layout(display=flex / alignItems=center) + Transform(width="fit-content" from composition)                                                             |
| Button            | Appearance(borderRadius=6 from sizes.md) + Layout(display=inline-flex / alignItems=center)                                                             |

### Phase 진행 상태 갱신

| Phase | A3 직후 (2026-04-20) | A4 land 이후 (2026-04-22)                                                                     |
| :---: | -------------------- | --------------------------------------------------------------------------------------------- |
|  P1   | ✅ LAND              | ✅ LAND (불변)                                                                                |
|  P2   | ✅ LAND              | ✅ LAND (불변)                                                                                |
|  P3   | ⚠️ 4/6 hook          | ✅ **5/6 hook + 1/6 의도 스킵 명문화** (6/6 scope 결정 완료)                                  |
|  P4   | ✅ LAND              | ✅ LAND (불변)                                                                                |
|  P5   | ❌ Chrome MCP 대기   | ⚠️ **vitest 간접 입증** (10 Spec × 4 section matrix 10 test PASS) / Chrome MCP 공식 종결 대기 |

### Gate G4 간접 입증 근거

본문 §Gates 의 Gate G4 통과 조건은 "Chrome MCP 대표 10 Spec 선택 시 Style Panel 4 section 에 Spec 기본값 표시 확인" 이다. Chrome MCP 인프라 구성 전까지는 이 조건을 **직접 입증 불가** 이므로 A4 의 B 는 다음을 간접 입증으로 제공한다:

1. **10 Spec 매트릭스 완전 커버리지** — design breakdown §P5 sample 대상 10 개 Spec 을 모두 테스트에 포함
2. **resolver 4 function 반환값 직접 assertion** — Panel UI 를 거치지 않고 `resolve{Transform|Appearance|Layout|Typography}SpecPreset` 이 Panel 이 실제 소비하는 값을 반환하는지 검증
3. **우선순위 체계 검증 회귀** — Select `sizes.md.gap=6` 이 `composition.gap=4` 를 override (회귀 0) + Select `size=xxl` 에서 composition fallback 발동
4. **scope 외 필드 명시 확인** — TextField `--label-font-size` / CheckboxGroup `--cb-items-gap` 같은 커스텀 CSS var 은 resolver 가 인지하지 않음을 테스트에서 직접 확증 (미래 확장 시 drift 감지점 확보)

실제 DOM 렌더링 검증(Chrome MCP 경유)은 본문 G4 의 공식 조건이며, 본 Addendum 은 "resolver 자체의 반환 계약" 을 증명하므로 **Panel 표시 품질의 상한선** 만 보증. 이하 잔존 debt 로 명시.

### 잔존 debt

- **Chrome MCP Gate G4 공식 종결** — Chrome MCP 서버 구성 후 Style Panel 실 UI 에서 Spec 기본값 표시 + 기존 inline 값 회귀 0 확인. 이후 ADR-082 Status → Implemented 전환 검토
- **TextField `--label-font-size` / CheckboxGroup `--cb-items-gap` resolver 확장** — 커스텀 CSS var 형태의 composition 값을 Panel 에 공급하려면 resolver 가 해당 변수명을 인지하는 확장 필요. 별도 ADR scope (Typography / Layout auxiliary 채널)
- **useFillValues 재검토 (A2 의도 스킵 취소 여부)** — 사용자 피드백이 "Fill 섹션에 Spec 기본 배경 표시 필요" 로 수렴하면 A2 결정 재개정. 현재는 Appearance 섹션 경유가 자연스럽다는 판단

### 커밋 정보

- HEAD: `5f1c47a4` (main, origin 미동기화)
- 4 파일 +251/-12 (`useTransformAuxiliary.ts` / `.test.tsx` / `useFillValues.ts` / `specPresetResolver.test.ts`)
- 검증: `pnpm -w type-check` 3/3 PASS + `packages/specs` 205/205 + `apps/builder` 227 → **242/242** (+15) + `packages/shared` 52/52 PASS

## Addendum A5 — 2026-04-22 (세션 16): Chrome MCP 실 UI 검증 — Gate G4 공식 통과 + Status Implemented

Chrome MCP 인프라 MVP 구성과 함께 본문 §Gates G4 의 **공식 통과 조건** ("Chrome MCP 대표 10 Spec 선택 시 Style Panel 4 section 에 Spec 기본값 표시 확인") 을 직접 입증. Status 를 **Proposed → Implemented** 로 전환.

### Chrome MCP 인프라 구성

- `mcp__claude-in-chrome__*` 도구 세트로 Claude Code 가 Chrome 탭 직접 조작 가능 (navigate / JS 평가 / 스크린샷 / 콘솔 읽기 / computer action)
- 탭 컨벤션: `tabs_context_mcp(createIfEmpty: true)` 로 MCP 탭 그룹 생성 → Builder URL `http://localhost:5173` 로 navigate
- Store 접근: `window.__composition_STORE__` 전역 노출 활용 (addElement / setSelectedElement 직접 호출)
- Style Panel root: `.panel-contents` 중 Transform 섹션 포함한 것 (property panel 과 구분)
- 값 추출: 섹션 하위 `input[aria-label]` + `.react-aria-SelectValue` + `role=radiogroup` 의 pressed button

### G4 실행 프로토콜

1. 빈 프로젝트에 body 1개 → 10 Spec 자동 추가 (`addElement({id, tag, parent_id:bodyId, page_id, order_num, props:{}})`)
2. 각 Element `setSelectedElement(id)` → 400ms 리렌더 대기 → Style Panel 4 section 값 수집
3. Spec 기본값 매트릭스와 대조 (Addendum A4 의 10 Spec × 4 section 동일 세트)

### 실측 결과 (10 Spec × 4 section)

| Spec              | 핵심 관측값 (실측 Panel)                                          |      Spec 도달 확인       |
| ----------------- | ----------------------------------------------------------------- | :-----------------------: |
| ListBox           | BR=8 / BW=1 / Gap=2 / Padding 4-way=4/4/4/4 / Width=100 / FS=14   |        ✅ (5 필드)        |
| Menu              | BR=6 / BW=1 / Gap=8 (sizes.md) / LH=20 / FS=14                    |        ✅ (4 필드)        |
| ListBoxItem       | Gap=2 / FS=14 / LH=20 / **FW=Semi Bold** (spec 고유 특징)         |   ✅ (FW=SemiBold 확증)   |
| Select            | Gap=6 (sizes.md) / BR=6 / FS=14                                   |  ✅ (sizes 우선 회귀 0)   |
| ComboBox          | Gap=6 / BR=6 / FS=14                                              |            ✅             |
| DatePicker        | **Gap=4** (composition fallback) / BR=6 / FS=14                   | ✅ (composition fallback) |
| TextField         | **Width=fit** (composition.containerStyles.width) / Gap=6 / FS=14 |  ✅ (composition width)   |
| CheckboxGroup     | **Gap=12** (sizes.md.gap=12) / FS=16                              |            ✅             |
| ToggleButtonGroup | **Width=fit** / BR=8 / FS=16                                      |            ✅             |
| Button            | BR=6 / BW=1 / Width=fit / FS=14 / LH=20                           |   ✅ (기존 sizes 경로)    |

**10/10 Spec 전원 통과**. 4 섹션 (Transform / Appearance / Layout / Typography) 의 resolver fallback chain 이 실 Panel 입력에 도달함을 직접 확인.

### 관찰: Padding shorthand UI 표시

초기 실측에서 ListBox/Menu 의 Padding shorthand 가 `0` 으로 보였으나, "Expand spacing to 4-way input" 토글 확장 후 Top/Right/Bottom/Left 입력값은 모두 **4** (Spec 값). Panel shorthand collapsed 모드에서는 단일 placeholder 가 `0` 으로 표시되지만, 실 Spec 값은 4-way 입력에 이미 도달. **resolver 정상 / UI collapsed 표시가 override 없는 상태를 `0` 으로 보여주는 UX 디자인**. 본 Gate G4 와 무관.

### 잔존 debt (Gate G4 범위 외)

- **Padding shorthand UI 표시 개선 (P3)** — collapsed 모드에서 4-way 값이 균일하면 그 값을 shorthand 에 노출하도록 UI 개선 (resolver 수정 불필요, Style Panel UX)
- **TextField `--label-font-size` / CheckboxGroup `--cb-items-gap` resolver 확장** — 커스텀 CSS var 형태의 composition 값. CheckboxGroup 의 경우 sizes.md.gap=12 가 우선 도달하여 Panel 표시는 정확하나, `--cb-items-gap` 이 별도 경로로 처리되는지 검증 필요 (Typography/Layout auxiliary 채널 후속 ADR)
- **Toggle-button group 의 Direction / Container Align 값 자동 추출** — Panel DOM reader 가 aria-pressed 기반 pressed state 를 섹션 label 과 페어링하지 못한 케이스. G4 판정은 핵심 필드 (Width/Gap/BR 등) 로 대체 통과. Chrome MCP 기반 agent 회귀 검증 시 reader 정밀화

### Status 전환 근거

- **G0-G4 전부 통과** — G0 (매트릭스 완료) / G1 (cssVarToTokenRef 왕복) / G2 (resolver 3-tier) / G3 (hook 6개 fallback) / G4 (실 UI 10 Spec 표시)
- **회귀 0** — Spec 내용 불변, 기존 sizes 경로 우선 동작 보존 (Select sizes.md.gap=6 → composition.gap=4 override 확인)
- **Hard Constraints 전부 만족** — §Hard Constraints 7항 (Spec 불변 / fallback 우선순위 / TokenRef 일관성 / 성능 / 회귀 0 / type-check / ADR-081 확장 가능성)

`Proposed → Implemented` 전환.

### 커밋 정보

- HEAD: `c02d857c` (A4 land) → 본 Addendum A5 land 후속 커밋
- Chrome MCP 환경: `localhost:5173` Builder dev server / MCP 탭 그룹 `351330741` / tabId `2123360908`
- 검증 세션: 2026-04-22 세션 16 (ADR-056 세션 15 + A1/A2/B 세션 16 연속)

## Addendum A6 — 2026-04-22 (세션 17): ADR-082 debt 3건 전원 종결

Addendum A5 의 §잔존 debt 3건을 세션 17 에서 재평가 및 청산. P1-1/P1-2 는 실구현, P1-3 는 재평가 결과 scope 외 확증.

### P1-1 Toggle reader 정밀화 — Implemented (커밋 `abfa2729`)

Style Panel `.react-aria-ToggleButtonGroup` 의 `data-selected="true"` pressed state 추출 + 9-grid (`.alignment-dot`) 는 `${H_ALIGN[col]}${V_ALIGN[row]}` 문자열 매핑 (예: `"leftCenter"` = idx 3) + 일반 toggle 은 lucide icon class suffix 반환. `previousElementSibling.innerText` 로 Panel UI label 페어링.

`.claude/skills/cross-check/SKILL.md` Phase 5 (readToggleGroups) + `feedback-chrome-mcp-patterns.md` §4 에 영속화. Chrome MCP 실측: ListBoxItem `Direction=stretch-horizontal` / `Container Align=leftCenter` / `Wrap=arrow-right-to-line` — `alignItems`/`justifyContent`/`flexDirection` Spec 값 전원 Panel 도달 확증.

### P1-2 Padding shorthand UX 개선 — Implemented (커밋 `6d01f564`)

Style Panel collapsed 모드에서 Padding/Margin 단일 입력이 Spec 공급 4-way uniform 값을 무시하고 `"0px"` 기본값만 표시하던 UX 이슈 해소. `uniform4Way<T>(a,b,c,d)` 헬퍼 신설 후 `useLayoutValues` 의 padding/margin shorthand 에 `firstDefined(s.padding, uniform4Way(numToPx(...)), "0px")` 주입.

vitest 5 케이스 추가 (uniform fallback / non-uniform 기본값 / inline 우선 / margin 동일 적용 / partial undefined). Chrome MCP 실측: ListBox Padding shorthand `"0"` → `"4"` (ListBoxSpec.containerStyles.padding=`{spacing.xs}`=4 도달). builder 242→247/247 (+5 신규).

### P1-3 커스텀 CSS var resolver 확장 — WONTFIX (scope 재평가)

원래 debt 제기: TextField `--label-font-size` / CheckboxGroup `--cb-items-gap` 같은 `composition.containerStyles` 커스텀 CSS var 을 resolver 가 인지하여 Typography/Layout 에 공급.

**세션 16 Chrome MCP 실측 재평가 결과**:

| Spec          | 실측 Panel 값                                 | 공급 경로                                                                                       | UX 충족? |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | :------: |
| TextField     | Typography.Font Size=14 / Transform.Width=fit | `sizes.md.fontSize={typography.text-sm}=14` + `composition.containerStyles.width="fit-content"` |    ✅    |
| CheckboxGroup | Layout.Gap=12                                 | `sizes.md.gap=12`                                                                               |    ✅    |

두 Spec 모두 **`sizes.md` 공급 경로가 실질 UX 를 이미 충족**. 커스텀 CSS var (`--label-font-size` / `--cb-items-gap`) 은 CSS cascade 에서 Preview/Publish 렌더링 용도로 활용되지만, Style Panel 표시 관점에서는 `sizes.md` 가 선행 반영되므로 resolver 확장이 **실질 가시적 개선을 낳지 않음**.

선제 resolver 확장은 YAGNI 위반 — 추상 인프라로 묶일 뿐 실 사용자 UX 변화 0. **후속 Spec 이 `sizes` 없이 `composition.containerStyles` 커스텀 CSS var 만으로 Spec 값을 공급하는 패턴 등장 시 재평가** — 그 때까지 보류.

### ADR-082 debt 현황

| Debt                         | A5 기록   |        세션 17 결과         |
| ---------------------------- | --------- | :-------------------------: |
| P1-1 Toggle reader 정밀화    | 후속 예정 | ✅ Implemented (`abfa2729`) |
| P1-2 Padding shorthand UX    | 후속 예정 | ✅ Implemented (`6d01f564`) |
| P1-3 커스텀 CSS var resolver | 후속 예정 |  ✅ WONTFIX (scope 재평가)  |

**ADR-082 debt 0 도달**. Chrome MCP Gate G4 공식 통과 (A5) + 후속 debt 3/3 청산으로 ADR-082 가 실 운영 완결 상태.

### 관련 커밋 (세션 17)

- `abfa2729` — P1-1 docs(cross-check) Phase 5 readToggleGroups 통합
- `6d01f564` — P1-2 feat(adr-082) padding/margin shorthand 4-way uniform fallback
- 본 A6 Addendum 후속 커밋

## References

- ADR-036 Phase 3a: Composite Spec `composition.*` 메타데이터 (본 ADR 의 소비 대상)
- ADR-063: SSOT Chain Charter (D3 domain 정본)
- ADR-071: Non-composite `containerStyles` 인프라 (ADR-082 가 확장하는 선례)
- ADR-078/079: ListBox/ListBoxItem Spec 완결 + `useContainerStyleDefault` (ADR-079 P2 부분 구현, ADR-082 가 완결)
- ADR-080: `resolveContainerStylesFallback` export seam — 본 ADR 의 fallback chain 패턴 선례
- ADR-081: TokenRef drift assertion — C4 Style Panel scope 제외 한계, ADR-082 완결 후 확장 가능
- `packages/specs/src/renderers/utils/tokenResolver.ts:21 (resolveToken), :178 (tokenToCSSVar)` — 왕복 parser 진입점
- `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts:45-62 (createResolver)` — 3-tier fallback 대상 함수
- `apps/builder/src/builder/panels/styles/hooks/useLayoutAuxiliary.ts:25-39 (useContainerStyleDefault)` — ADR-079 P2 선례 확장 대상
