# ADR-082 Breakdown — Style Panel Spec Consumer 통합 구현 상세

> 본 문서는 ADR-082 (`docs/adr/082-style-panel-spec-consumer-integration.md`) 의 Decision 섹션에서 분리된 구현 상세. Phase 별 파일 변경, 계약, 체크리스트.

## Phase 개요

| Phase | 대상 파일                                                            | 작업                                                                                                                   | 예상 시간 | Gate |
| :---: | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | :-------: | :--: |
|  P1   | `packages/specs/src/renderers/utils/tokenResolver.ts`                | `cssVarToTokenRef()` 역변환 parser 신설 + 왕복 test                                                                    |  1.5-2h   |  G1  |
|  P2   | `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts` | `createResolver` 3-tier fallback chain (containerStyles → composition.\* → sizes) + extractor 확장                     |   2-3h    |  G2  |
|  P3   | `apps/builder/src/builder/panels/styles/hooks/` (6 hooks)            | `useAppearanceValues`, `useFillValues`, `useTransformValues`, `useLayoutValues`, `useTransformAuxiliary` fallback 적용 |   2-3h    |  G3  |
|  P4   | `apps/builder/src/builder/panels/styles/hooks/useLayoutAuxiliary.ts` | alignItems/justifyContent hook 연결 (주석만 있던 ADR-079 P2 미완결 버그 fix)                                           |  0.5-1h   |  G3  |
|  P5   | Chrome MCP 대표 10 Spec × 4 section 실 검증                          | ListBox/Menu/ListBoxItem/Select/ComboBox/DatePicker/TextField/CheckboxGroup/ToggleButtonGroup/Button sampling          |   3-4h    |  G4  |

**총 예상**: 9-13h (P1+P2 이번 세션, P3-P5 후속 세션 분할)

## P1 — cssVarToTokenRef 역변환 parser

### 신설 함수 (tokenResolver.ts)

```typescript
/**
 * ADR-082 P1: CSS var 문자열 → TokenRef 역변환.
 *
 * `tokenToCSSVar()` 의 역함수. Composite Spec 의 `composition.gap = "var(--spacing-xs)"`
 * 같은 CSS string 값을 TokenRef 로 변환하여 `resolveToken()` 소비 가능하게 함.
 *
 * 매핑 테이블은 `tokenToCSSVar` 의 category 분기와 1:1 대응 (동일 규칙의 왕복).
 * 미등록 CSS var (예: `var(--btn-radius)` 같은 파생 var) 은 `null` 반환 + dev 모드 warn.
 */
export function cssVarToTokenRef(cssVar: string): TokenRef | null {
  const match = cssVar.match(/^var\(--([a-z][a-z0-9-]*)\)$/);
  if (!match) return null;
  const name = match[1];

  // typography 특례 — text-base 는 typography.text-base 또는 typography.text-md (ADR-022 alias)
  if (name.startsWith("text-")) return `{typography.${name}}` as TokenRef;
  if (name.startsWith("spacing-"))
    return `{spacing.${name.slice(8)}}` as TokenRef;
  if (name.startsWith("radius-"))
    return `{radius.${name.slice(7)}}` as TokenRef;
  if (name.startsWith("shadow-"))
    return `{shadow.${name.slice(7)}}` as TokenRef;

  // color — COLOR_TOKEN_TO_CSS / NAMED_COLOR_TO_CSS 역조회 (매핑 직접 lookup 필요)
  const colorName = reverseLookupColorCSSVar(name);
  if (colorName) return `{color.${colorName}}` as TokenRef;

  return null;
}
```

### 매핑 테이블 통합 (tokenToCSSVar 와 1:1 대응)

`tokenToCSSVar` 의 매핑 테이블 구조를 분리하여 `cssVarToTokenRef` 와 공유:

```typescript
const SPACING_PREFIX = "spacing-";
const RADIUS_PREFIX = "radius-";
const SHADOW_PREFIX = "shadow-";
const TYPOGRAPHY_PREFIX = "text-";

// COLOR_TOKEN_TO_CSS / NAMED_COLOR_TO_CSS 는 복잡 — 역방향 Map 생성
const CSS_VAR_TO_COLOR_TOKEN: Map<string, string> = /* lazy init from COLOR_TOKEN_TO_CSS */;
```

### Unit test (신설)

`packages/specs/src/renderers/utils/__tests__/cssVarToTokenRef.test.ts`:

```typescript
describe("ADR-082 G1 — cssVarToTokenRef (tokenToCSSVar 역함수)", () => {
  describe("왕복 매핑 일관성", () => {
    it("spacing: tokenToCSSVar(cssVarToTokenRef(x)) === x", () => {
      for (const name of Object.keys(spacing)) {
        const cssVar = `var(--spacing-${name})`;
        expect(tokenToCSSVar(cssVarToTokenRef(cssVar)!)).toBe(cssVar);
      }
    });
    it("radius / typography / shadow / color 동일 왕복 검증", () => {
      /* ... */
    });
  });

  describe("미등록 CSS var", () => {
    it("null 반환 + dev warn (btn-radius, 사용자 정의 var 등)", () => {
      expect(cssVarToTokenRef("var(--btn-radius)")).toBeNull();
      expect(cssVarToTokenRef("var(--custom-unknown)")).toBeNull();
    });
    it("CSS 값이 아닌 문자열 → null", () => {
      expect(cssVarToTokenRef("10px")).toBeNull();
      expect(cssVarToTokenRef("#FFFFFF")).toBeNull();
    });
  });
});
```

### Gate G1 통과 조건

- `cssVarToTokenRef("var(--spacing-xs)") === "{spacing.xs}"` ✓
- `tokenToCSSVar(cssVarToTokenRef("var(--spacing-xs)")!) === "var(--spacing-xs)"` (왕복) ✓
- spacing 7 + radius 6 + typography 21 + color 30+ 전체 왕복 PASS
- 미등록 var 은 null + dev warn (production silent)
- type-check + packages/specs vitest 회귀 0

## P2 — specPresetResolver 3-tier fallback chain

### `createResolver` 확장

```typescript
function createResolver<T extends object>(
  extractor: PresetExtractor<T>,
  containerStylesExtractor?: PresetExtractor<T>, // ADR-082 신설
  compositionExtractor?: PresetExtractor<T>, // ADR-082 신설
): (type: string | undefined, size: string | undefined) => T {
  const cache = new Map<string, T>();
  allCaches.push(cache as Map<string, unknown>);
  const empty = Object.freeze({}) as T;
  return (type, size) => {
    if (!type) return empty;
    const key = `${type}:${size ?? "md"}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const spec = TAG_SPEC_MAP[type] as unknown as SpecShapeFull;

    // ADR-082 3-tier fallback chain — 우선순위: sizes > containerStyles > composition
    // (기본값 표시용. inline 값은 hook 에서 별도 우선순위 처리)
    const sizeEntry = spec?.sizes?.[size ?? "md"];
    const sizesPreset = sizeEntry ? extractor(sizeEntry) : ({} as T);

    const containerStyles = spec?.containerStyles;
    const csPreset =
      containerStylesExtractor && containerStyles
        ? containerStylesExtractor(containerStyles)
        : ({} as T);

    const composition = spec?.composition;
    const compPreset =
      compositionExtractor && composition
        ? compositionExtractor(composition)
        : ({} as T);

    // merge — 낮은 우선순위부터 (composition < containerStyles < sizes)
    // sizes 값이 있으면 우선 (기존 동작 보존)
    const preset = { ...compPreset, ...csPreset, ...sizesPreset } as T;
    cache.set(key, preset);
    return preset;
  };
}
```

### Extractor 확장 — Appearance 예시

```typescript
// Appearance containerStyles extractor
function appearanceFromContainerStyles(
  cs: ContainerStylesSchema,
): AppearanceSpecPreset {
  const out: AppearanceSpecPreset = {};
  if (typeof cs.borderWidth === "number") out.borderWidth = cs.borderWidth;
  if (cs.borderRadius !== undefined) {
    const resolved = resolveValue(cs.borderRadius); // TokenRef → number
    if (typeof resolved === "number") out.borderRadius = resolved;
  }
  return out;
}

// Appearance composition extractor
function appearanceFromComposition(
  comp: CompositionSpec,
): AppearanceSpecPreset {
  const out: AppearanceSpecPreset = {};
  const cs = comp.containerStyles;
  if (!cs) return out;
  // composition.containerStyles 는 Record<string,string> (CSS 값)
  const br = cs["border-radius"] ?? cs.borderRadius;
  if (typeof br === "string") {
    const token = cssVarToTokenRef(br);
    if (token) {
      const resolved = resolveToken(token);
      if (typeof resolved === "number") out.borderRadius = resolved;
    }
  }
  // borderWidth 동일 패턴
  return out;
}

export const resolveAppearanceSpecPreset = createResolver<AppearanceSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, APPEARANCE_KEYS),
  appearanceFromContainerStyles,
  appearanceFromComposition,
);
```

### Transform / Layout / Typography extractor 대응

각 section 의 필드 매핑:

| Section    | containerStyles 필드                          | composition.\* 필드                                                   | sizes 필드                     |
| ---------- | --------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| Transform  | width (string), maxHeight                     | composition.containerStyles.width / max-height                        | width/height/minWidth/maxWidth |
| Layout     | gap (TokenRef), padding (TokenRef)            | composition.gap / composition.containerStyles.padding                 | gap/paddingX/paddingY/margin   |
| Appearance | background, border, borderWidth, borderRadius | composition.containerStyles.background / border-color / border-radius | borderRadius / borderWidth     |
| Typography | (해당 필드 없음)                              | composition.containerStyles 에 `--label-font-size` 등 CSS 변수        | fontSize / lineHeight 등       |

### Gate G2 통과 조건

- `resolveAppearanceSpecPreset("listbox", undefined)` → `{ borderRadius: 8, borderWidth: 1 }` (ListBoxSpec.containerStyles 에서 resolve)
- `resolveLayoutSpecPreset("select", "md")` → `{ gap: 4 }` (SelectSpec.composition.gap = "var(--spacing-xs)" parse)
- 기존 sizes 경로 기존 값 유지 (Button/Badge/etc — 회귀 0)
- 3-tier merge 순서 test (composition < containerStyles < sizes)
- unit test 15+ PASS

## P3 — 4 section hook fallback 적용

### useAppearanceValues.ts 변경 예시

```typescript
// Before (ADR-082 이전)
return {
  backgroundColor: firstDefined(s.backgroundColor, undefined, "#FFFFFF"),
  borderColor: firstDefined(s.borderColor, undefined, "#000000"),
  // ...
};

// After (ADR-082)
return {
  backgroundColor: firstDefined(
    s.backgroundColor,
    specPreset.backgroundColor, // ← 신규 fallback
    "#FFFFFF",
  ),
  borderColor: firstDefined(s.borderColor, specPreset.borderColor, "#000000"),
  // borderRadius, borderWidth 기존 사용 유지
};
```

### 6 hook 업데이트 대상

1. `useAppearanceValues.ts` — backgroundColor, borderColor, borderStyle, boxShadow, overflow 추가 fallback
2. `useFillValues.ts` — backgroundColor fallback
3. `useTransformValues.ts` — width (string), maxHeight, aspectRatio 추가
4. `useLayoutValues.ts` — gap, padding, margin 전부 확인
5. `useTransformAuxiliary.ts` — alignSelf, justifySelf (parent containerStyles 참조 추가)
6. `useLayoutAuxiliary.ts` — P4 에서 별도 처리

### Gate G3 통과 조건

- 6 hook 각각 fallback 적용 후 vitest 회귀 0
- `useAppearanceValues(listboxElementId)` 반환값에 borderRadius/borderColor 포함 확인

## P4 — useLayoutAuxiliary alignItems/justifyContent 연결

### 현재 버그 (ADR-079 P2 미완결)

`useLayoutAuxiliary.ts:84-102` 의 `useFlexAlignmentKeys`:

```typescript
export function useFlexAlignmentKeys(id: string | null): string[] {
  const display = useDisplay(id);
  const flexDirection = useFlexDirection(id);
  const alignItems = useStyleProp(id, "alignItems"); // ← Spec fallback 미적용!
  const justifyContent = useStyleProp(id, "justifyContent"); // ← 동일
  // ...
}
```

### 수정

```typescript
function useAlignItems(id: string | null): string {
  const inline = useStyleProp(id, "alignItems");
  const specDefault = useContainerStyleDefault(id, "alignItems");
  return inline || specDefault || "";
}

function useJustifyContent(id: string | null): string {
  const inline = useStyleProp(id, "justifyContent");
  const specDefault = useContainerStyleDefault(id, "justifyContent");
  return inline || specDefault || "";
}

export function useFlexAlignmentKeys(id: string | null): string[] {
  const display = useDisplay(id);
  const flexDirection = useFlexDirection(id);
  const alignItems = useAlignItems(id);
  const justifyContent = useJustifyContent(id);
  // ...
}
```

### Gate G3 통과 조건 (연관)

- ListBoxItem 선택 시 Flex alignment 9-grid 에서 "flex-start" / "center" 하이라이트 (ListBoxItemSpec.containerStyles.alignItems = "flex-start", justifyContent = "center")

## P5 — Chrome MCP 검증 (대표 10 Spec)

### Sample 대상

| Spec              | Section 초점 | 기대값                                                                          |
| ----------------- | ------------ | ------------------------------------------------------------------------------- |
| ListBox           | Appearance   | borderRadius 8px / borderColor var(--border) / backgroundColor var(--bg-raised) |
| Menu              | Appearance   | borderRadius 6px / padding 4px / gap 2px                                        |
| ListBoxItem       | Layout       | alignItems flex-start / justifyContent center (P4 수정 검증)                    |
| Select            | Layout       | gap 4px (composition.gap="var(--spacing-xs)" 역변환 검증)                       |
| ComboBox          | Layout       | gap 4px                                                                         |
| DatePicker        | Layout       | gap 4px                                                                         |
| TextField         | Appearance   | composition 의 `--label-font-size` 등 (향후 확장 — 현재 scope 외)               |
| CheckboxGroup     | Layout       | `--cb-items-gap: 12px` 역변환 (12)                                              |
| ToggleButtonGroup | Transform    | containerStyles.width = "fit-content" 적용                                      |
| Button            | Appearance   | 기존 sizes 경로 유지 (회귀 없음)                                                |

### Gate G4 통과 조건

- 10 Spec × 4 section 중 대상 조합에서 Spec 기본값 표시 확인
- 기존 instance (store.props.style 이 있는 element) 는 inline 값 우선 유지 (회귀 0)
- specs vitest 152/152 + builder vitest 185/185 PASS + type-check 3/3 PASS
- 빌드 시간 증가 <10% (동일 cache 상태 3회 평균)

## 위험 완화 체크리스트

### R1 (매핑 테이블 완전성)

- [ ] `cssVarToTokenRef` 매핑이 `tokenToCSSVar` 의 category 분기 5종 (color/spacing/typography/radius/shadow) 전부 커버
- [ ] `spacing` 7 + `radius` 6 + `typography` 21 + `color` 30+ = 60+ token 왕복 test 100% PASS
- [ ] 미등록 var (사용자 정의 / 파생 var) → null 반환 + dev warn
- [ ] COLOR_TOKEN_TO_CSS / NAMED_COLOR_TO_CSS 역방향 Map 구성 (lazy init)

### R2 (우선순위 판정)

- [ ] fallback chain 순서: inline → sizes → containerStyles → composition (Spec 기본값 중 sizes 우선, 기존 동작 보존)
- [ ] 각 hook return 에서 inline 값이 있으면 Spec 기본값 무시
- [ ] Chrome MCP 실 검증: ListBox 에 inline style 주입 후 Panel 이 inline 값 표시 (Spec fallback 무시)

### R3 (성능)

- [ ] `createResolver` 내 Map 캐싱 유지 (tier 별 결과 memo)
- [ ] React DevTools profiler — ListBox 선택 시 Panel 리렌더 전/후 비교 (<10% 증가)
- [ ] hook return 결과에 useMemo 적용, deps 는 inline+spec 만 포함

### R4 (silent fallback)

- [ ] composition CSS string parse 실패 시 console.warn (dev 모드)
- [ ] production 번들 tree-shaking 검증 (dev warn 코드 제거)

### R5 (auxiliary hook race)

- [ ] alignItems/justifyContent fallback 우선순위 test (inline 우선)
- [ ] useMemo deps 에 inline+spec 양쪽 포함

## 세션 분할 권장

- **세션 A** (이번 세션): P1 + P2 + 초기 vitest unit test
- **세션 B** (다음 세션): P3 — 6 hook fallback 적용
- **세션 C** (그 다음): P4 — alignItems/justifyContent hook 연결 + unit test
- **세션 D** (검증): P5 — Chrome MCP sampling + 회귀 검증 + Gate G4 종결

**이번 세션 범위**: P1 + P2 만 (약 4h). P3-P5 는 분할.

## 참조 파일 경로

- `packages/specs/src/renderers/utils/tokenResolver.ts:21 (resolveToken) / :178 (tokenToCSSVar)`
- `packages/specs/src/renderers/utils/__tests__/cssVarToTokenRef.test.ts` (신설)
- `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts:45-62 (createResolver)`
- `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.ts` / `useFillValues.ts` / `useTransformValues.ts` / `useLayoutValues.ts` / `useLayoutAuxiliary.ts` / `useTransformAuxiliary.ts`
- `packages/specs/src/components/ListBox.spec.ts:76-91 (containerStyles 참조)`
- `packages/specs/src/components/Select.spec.ts:343-459 (composition 참조)`
