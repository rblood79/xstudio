# ADR-108 구현 상세 — Spec `derivedContainerStyles` Phase 계획

> 본 문서는 [ADR-108](../adr/108-container-runtime-derived-styles.md) 의 구현 상세 (Phase, 파일 변경표, 체크리스트, 코드 예시) 를 담는다. ADR 본문에는 Context/Alternatives/Decision/Risks/Gates 만 유지.

## Phase 구성

| Phase  | 목표                                                               | 출력                                                                                                           | 범위                                | Gate |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---- |
| **P0** | Spec registry + fallback resolver 를 `@composition/specs` 로 이관  | `packages/specs/src/registry/*` + `resolveContainerStylesFallback` packages 이동 + 8 consumer import 경로 갱신 | Registry layer                      | G0   |
| P1     | 스키마 + 헬퍼 구현 + TagGroup 시범 적용                            | `ComponentSpec.derivedContainerStyles` + `resolveContainerStyles` (packages/specs)                             | TagGroup 단일 (기존 동작 동치 검증) | G1   |
| P2     | Style Panel 경로 전환 — 본 이슈 핵심 해소                          | `useElementStyleContext` 확장 + `resolveLayoutSpecPreset` ctx-aware                                            | Panel 전체                          | G2   |
| P3     | 타 11 컨테이너 점진 이관 — 각 PR 당 분기 1개 제거 + spec 이관      | 11 spec 에 `derivedContainerStyles` 추가 + implicitStyles 분기 삭제                                            | 11 컨테이너                         | G3   |
| P4     | `resolveLabelFlexDir` 을 spec-side util 로 재배치                  | `@composition/specs/renderers/labelPositionFlex.ts` 신설                                                       | implicitStyles.ts 헬퍼 완전 삭제    | G4   |
| P5     | (follow-up ADR) CSSGenerator data-attr emit — CSS duplication 해소 | 별도 ADR proposal                                                                                              | CSS 11 컨테이너 data-attr 자동화    | —    |

## 영향 컨테이너 12 (confirmed)

| 컨테이너        | skipCSSGeneration | implicitStyles.ts 분기 라인                        | Phase |
| --------------- | :---------------: | -------------------------------------------------- | :---: |
| TagGroup        |      `true`       | L541-556                                           |  P1   |
| CheckboxGroup   |      `false`      | L739-747                                           |  P3   |
| RadioGroup      |      `false`      | L968-994 (+applySideLabelChildStyles L993 호출)    |  P3   |
| NumberField     |      `false`      | L1023-1052 (+applySideLabelChildStyles L1051 호출) |  P3   |
| TextField       |      `false`      | L1240-1242 (+applySideLabelChildStyles L1241 호출) |  P3   |
| TextArea        |      미설정       | (grep 필요 — P3 진입 전 sweep)                     |  P3   |
| DateField       |      `false`      | L1299-1300                                         |  P3   |
| TimeField       |      `false`      | (grep 필요 — P3 진입 전 sweep)                     |  P3   |
| DatePicker      |      `false`      | L1638-1650 (+applySideLabelChildStyles L1660 호출) |  P3   |
| DateRangePicker |      `false`      | (grep 필요 — P3 진입 전 sweep)                     |  P3   |
| ColorField      |      `false`      | (grep 필요 — P3 진입 전 sweep)                     |  P3   |
| ComboBox        |      `false`      | (grep 필요 — P3 진입 전 sweep)                     |  P3   |

## P0: Spec Registry + Fallback Resolver 이관 (신규)

### P0-1. 이관 대상 (실측 확증)

**tagSpecMap.ts split** (`apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts`, 278 줄):

| 심볼                | 현 위치 | 이관 대상 | 비고                                   |
| ------------------- | ------- | :-------: | -------------------------------------- |
| `BASE_TAG_SPEC_MAP` | L115    |   이관    | 기본 PascalCase → ComponentSpec 매핑   |
| `expandChildSpecs`  | L242    |   이관    | ADR-094 child spec 자동 확장 transform |
| `TAG_SPEC_MAP`      | L265    |   이관    | expanded registry                      |
| `getSpecForTag`     | L268    |   이관    | tag → spec lookup helper               |
| `IMAGE_TAGS`        | L278    | **잔존**  | Canvas sprite 전용 상수 (D3 Spec 아님) |

**LOWERCASE alias** (`apps/builder/src/builder/workspace/canvas/layout/engines/tagSpecLookup.ts`, 34 줄):

| 심볼                     | 현 위치 | 이관 대상 |
| ------------------------ | ------- | :-------: |
| `LOWERCASE_TAG_SPEC_MAP` | L26-30  |   이관    |

**Fallback resolver** (`apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts`):

| 심볼                             | 현 위치  |     이관 대상      |
| -------------------------------- | -------- | :----------------: |
| `resolveContainerStylesFallback` | L158-177 | 이관 (함수 정의만) |
| `CONTAINER_STYLES_FALLBACK_KEYS` | (인접)   |        이관        |

### P0-2. 이관 후 디렉토리 구조

```
packages/specs/src/
├── registry/                                  ← 신규
│   ├── index.ts
│   ├── tagSpecMap.ts                          ← BASE_TAG_SPEC_MAP + expandChildSpecs + TAG_SPEC_MAP + getSpecForTag
│   └── lowerCaseAlias.ts                      ← LOWERCASE_TAG_SPEC_MAP
└── renderers/
    ├── resolveContainerStylesFallback.ts      ← 신규 (이관)
    ├── resolveContainerStyles.ts              ← P1 신규
    ├── labelPositionFlex.ts                   ← P4 신규
    └── CSSGenerator.ts                         ← 기존
```

`apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts` 는 **`IMAGE_TAGS` 만 남기고** 나머지 export 는 `@composition/specs` re-export 또는 삭제.

### P0-3. Import cycle 사전 점검 (blocker 확인)

`expandChildSpecs` 는 각 spec 의 `childSpecs` 필드를 읽어 PascalCase 키로 flatten. 각 `childSpecs` 항목은 spec 객체 참조 (예: `TagGroupSpec.childSpecs = [TagListSpec]`).

**체크**:

- [ ] `TagGroupSpec` → `TagListSpec` 참조 체인에 순환 없음
- [ ] `DateFieldSpec` / `DatePickerSpec` / `DateRangePickerSpec` 계열 cross-reference 없음
- [ ] ESBuild/Vite 의 TS module graph 가 packages/specs 내부에서 self-contained

실행: `pnpm -F @composition/specs build` 성공 시 cycle 없음 확증.

### P0-4. 8 Consumer Import 경로 갱신

| #   | Consumer                                                                     | 현재 import                                                               | 신규 import                             |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts`        | `from "../../sprites/tagSpecMap"`                                         | `from "@composition/specs"`             |
| 2   | `apps/builder/src/builder/workspace/canvas/skia/buildSpecNodeData.ts`        | `from "../../sprites/tagSpecMap"`                                         | `from "@composition/specs"`             |
| 3   | `apps/builder/src/builder/workspace/canvas/layout/engines/tagSpecLookup.ts`  | (이관 대상, 삭제 가능)                                                    | —                                       |
| 4   | `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` | `from "../../sprites/tagSpecMap"` + 내부 `resolveContainerStylesFallback` | `from "@composition/specs"` (양쪽 모두) |
| 5   | `apps/builder/src/builder/workspace/canvas/layout/engines/fullTreeLayout.ts` | `from "./implicitStyles"` (resolveContainerStylesFallback)                | `from "@composition/specs"`             |
| 6   | `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts`         | `from "../../../workspace/canvas/sprites/tagSpecMap"`                     | `from "@composition/specs"`             |
| 7   | `apps/builder/src/builder/panels/styles/hooks/useLayoutAuxiliary.ts`         | (tagSpecMap import)                                                       | `from "@composition/specs"`             |
| 8   | `apps/builder/src/builder/panels/styles/hooks/useTransformAuxiliary.ts`      | (tagSpecMap import)                                                       | `from "@composition/specs"`             |

Test 파일 2건 (`tagSpecMap.test.ts`, `resolveContainerStylesFallback.test.ts`, `tokenConsumerDrift.test.ts`) 도 동시 갱신.

### P0-5. 체크리스트

- [ ] `packages/specs/src/registry/tagSpecMap.ts` 신규 — BASE_TAG_SPEC_MAP / expandChildSpecs / TAG_SPEC_MAP / getSpecForTag 이관
- [ ] `packages/specs/src/registry/lowerCaseAlias.ts` 신규 — LOWERCASE_TAG_SPEC_MAP 이관
- [ ] `packages/specs/src/renderers/resolveContainerStylesFallback.ts` 신규 — 함수 정의 이관 + CONTAINER_STYLES_FALLBACK_KEYS
- [ ] `packages/specs/src/index.ts` — 신규 export 3종 추가
- [ ] `apps/builder/.../sprites/tagSpecMap.ts` — `IMAGE_TAGS` 만 잔존, 나머지 삭제
- [ ] `apps/builder/.../layout/engines/tagSpecLookup.ts` — 삭제 (또는 `@composition/specs` re-export)
- [ ] `apps/builder/.../layout/engines/implicitStyles.ts` — L158-177 삭제 + `resolveContainerStylesFallback` import 추가
- [ ] 8 consumer import 경로 `@composition/specs` 로 일괄 갱신
- [ ] `pnpm -F @composition/specs build` PASS (cycle 없음 확증)
- [ ] `pnpm type-check` 전 영역 PASS
- [ ] `tagSpecMap.test.ts` / `resolveContainerStylesFallback.test.ts` / `tokenConsumerDrift.test.ts` PASS
- [ ] Canvas 렌더 spot-check 회귀 0 (Chrome MCP — Button/TagGroup/Tabs 등 3-5개)

## P1: 스키마 + 헬퍼 + TagGroup PoC

### P1-1. `ComponentSpec` 스키마 확장

**파일**: `packages/specs/src/types.ts`

```ts
export interface DerivedContainerCtx<P = unknown> {
  readonly props: Readonly<P>;
  readonly childTags: ReadonlySet<string>;
}

export type DerivedContainerStyles<P = unknown> = (
  ctx: DerivedContainerCtx<P>,
) => Record<string, string | number | undefined>;

export interface ComponentSpec<P = unknown> {
  // ... 기존 필드
  containerStyles?: StaticContainerStyles;
  derivedContainerStyles?: DerivedContainerStyles<P>;
}
```

**순수성 제약** (본 ADR 에 명문화, ESLint custom rule 승격 검토):

- 동일 입력 → 동일 출력
- DOM/file/store 접근 금지
- side-effect 금지
- `undefined` 반환값은 해당 키 삭제 의미

### P1-2. 공용 resolver 헬퍼 (P0 이관 기반)

**파일**: `packages/specs/src/renderers/resolveContainerStyles.ts` (신규)

```ts
import type { ComponentSpec, DerivedContainerCtx } from "../types";
import { resolveContainerStylesFallback } from "./resolveContainerStylesFallback";
// ^ P0 에서 이미 packages/specs 에 이관됨 — 의존성 방향 정상 (packages 내부)

export function resolveContainerStyles<P>(
  spec: ComponentSpec<P>,
  tag: string,
  parentStyle: Record<string, unknown>,
  ctx: DerivedContainerCtx<P>,
): Record<string, unknown> {
  const staticBase = resolveContainerStylesFallback(tag, parentStyle);
  const derived = spec.derivedContainerStyles?.(ctx) ?? {};
  return { ...staticBase, ...derived };
}
```

`@composition/specs` 에서 export.

### P1-3. TagGroup.spec.ts 도입

**파일**: `packages/specs/src/components/TagGroup.spec.ts`

```ts
export const TagGroupSpec: ComponentSpec<TagGroupProps> = {
  // ... 기존
  containerStyles: {
    display: "flex",
    gap: "{spacing.xs}",
  },
  derivedContainerStyles: ({ props, childTags }) => {
    const hasTagList = childTags.has("TagList");
    const labelSide = props.labelPosition === "side";
    return {
      flexDirection: labelSide ? "row" : "column",
      flexWrap: hasTagList && !labelSide ? undefined : "wrap",
    };
  },
};
```

### P1-4. Canvas implicitStyles.ts TagGroup 분기 제거

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts`

**변경 전** (L517-557):

```ts
if (containerTag === "taggroup") {
  const tgLabelPos = containerProps?.labelPosition as ...;
  const tgFlexDir = resolveLabelFlexDir(tgLabelPos, ..., tgDefaultDir);
  effectiveParent = withParentStyle(containerEl, { ...parentStyle, flexDirection: tgFlexDir, flexWrap: ... });
}
```

**변경 후**: 해당 분기 삭제. parentStyle 머지 파이프라인에 공용 resolver 삽입:

```ts
// implicitStyles 진입부 (L499 근처)
import { resolveContainerStyles } from "@composition/specs";

const derivedStyles = resolveContainerStyles(
  spec,
  containerTag,
  rawParentStyle,
  {
    props: containerEl.props ?? {},
    childTags: new Set(children.map((c) => c.tag)),
  },
);
const parentStyle: Record<string, unknown> = {
  ...derivedStyles, // static base (resolveContainerStylesFallback 내부) + derived 병합 이미 완료
  ...rawParentStyle, // user edits (최우선)
};
```

### P1-5. 체크리스트

- [ ] `packages/specs/src/types.ts` — DerivedContainerCtx, DerivedContainerStyles 타입 추가
- [ ] `packages/specs/src/renderers/resolveContainerStyles.ts` — 공용 resolver 신규 + index export
- [ ] `packages/specs/src/components/TagGroup.spec.ts` — derivedContainerStyles 추가
- [ ] `implicitStyles.ts` — taggroup 분기 삭제 + 공용 resolver 머지 파이프라인 삽입
- [ ] `pnpm build:specs && pnpm type-check` PASS
- [ ] TagGroup Skia 렌더 `labelPosition="top"`/`"side"` 시각 대칭 유지 (Chrome MCP)
- [ ] TagGroup children 없을 때 `flexWrap: "wrap"` 유지 (레거시 호환)
- [ ] 기존 동작 동치 검증: P1 전후 Skia 렌더 스크린샷 비교 — 회귀 0

## P2: Panel ctx 확장 + 캐시 재설계

### P2-1. `useElementStyleContext` 확장

**파일**: `apps/builder/src/builder/panels/styles/hooks/useElementStyleContext.ts`

```ts
import { useShallow } from "zustand/react/shallow";
// ^ Zustand v5+ 필수. pnpm-workspace catalog 의 zustand 실 버전 확증 — P2 착수 전 required.

export interface ElementStyleContext {
  style: Record<string, unknown> | undefined;
  type: string | undefined;
  size: string | undefined;
  props: Record<string, unknown> | undefined; // 신규
  childTags: ReadonlySet<string>; // 신규
}

export function useElementStyleContext(id: string | null): ElementStyleContext {
  const props = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id)?.props as Record<string, unknown> | undefined;
  });
  const childTags = useStore(
    useShallow((s) => {
      if (!id) return EMPTY_TAG_SET;
      const children = s.childrenMap.get(id) ?? [];
      return new Set(children.map((c) => c.tag));
    }),
  );
  // ... 기존 style/type/size
  return { style, type, size, props, childTags };
}

const EMPTY_TAG_SET: ReadonlySet<string> = new Set();
```

**주의**:

- `useShallow` import 경로 = `zustand/react/shallow` (Zustand v5+). 실 버전 catalog 확증 필요.
- 동일 태그 집합이면 새 Set 인스턴스 리턴해도 shallow 비교로 re-render 차단.

### P2-2. `resolveLayoutSpecPreset` ctx-aware 전환

**파일**: `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts`

**현재 시그니처**:

```ts
resolveLayoutSpecPreset(type, size): LayoutSpecPreset
```

**변경 후 시그니처**:

```ts
resolveLayoutSpecPreset(type, size, ctx?: DerivedContainerCtx): LayoutSpecPreset
```

**구현 변경**:

```ts
export const resolveLayoutSpecPreset = (type, size, ctx) => {
  const base = /* 기존 static tier chain */;
  if (!ctx || !type) return base;
  const spec = TAG_SPEC_MAP[type];  // P0 이관 이후: @composition/specs import
  const derived = spec?.derivedContainerStyles?.(ctx) ?? {};
  return { ...base, ...pickLayoutKeys(derived) };
};
```

**cache 정책**: ctx 인자가 있으면 cache skip (매 호출 재계산). ctx 없으면 기존 `type:size` 캐시 유지.

**근거**: childTags Set 직렬화로 cache key 생성하면 set size 변할 때마다 cache miss → 이득 적음. ctx-aware 경로는 Panel 소비자만이며 per-selection 1회 계산이면 충분.

### P2-3. `useLayoutValues` 호출 변경

**파일**: `apps/builder/src/builder/panels/styles/hooks/useLayoutValues.ts`

```ts
export function useLayoutValues(id: string | null): LayoutStyleValues | null {
  const { style, type, size, props, childTags } = useElementStyleContext(id);

  const specPreset = useMemo<LayoutSpecPreset>(
    () => resolveLayoutSpecPreset(type, size, props && { props, childTags }),
    [type, size, props, childTags],
  );

  // 이후 로직 동일 — firstDefined(s.flexDirection, specPreset.flexDirection, "row")
  // 이제 specPreset.flexDirection 이 Spec derivedContainerStyles 결과이므로
  // labelPosition="top" → "column" 정확 반영.
}
```

### P2-4. 체크리스트

- [ ] Zustand 실 버전 확증 (v5+ 여부 — pnpm-workspace catalog 참조)
- [ ] `useElementStyleContext.ts` — props + childTags 확장, `useShallow` 적용
- [ ] `specPresetResolver.ts` — `resolveLayoutSpecPreset` ctx 파라미터 추가
- [ ] `useLayoutValues.ts` — 확장 ctx 전달
- [ ] **Panel 4 section hook (Transform/Appearance/Typography/Layout) 전수 타입 호환 확증** — `useTransformValues.ts` / `useAppearanceValues.ts` / `useTypographyValues.ts` / `useLayoutValues.ts` 가 신규 `ElementStyleContext` 필드 destructure 에러 없이 통과
- [ ] TagGroup `labelPosition="top"` 선택 시 Panel Direction 필드 "column" 표시 (Chrome MCP 실측)
- [ ] TagGroup `labelPosition="side"` 선택 시 Panel Direction 필드 "row" 표시
- [ ] 기존 Panel 회귀 0 (Button/Text/Input 등 non-labelPosition 컨테이너 무영향)

## P3: 11 컨테이너 마이그레이션

### P3-1. 대상 컨테이너 (P1 TagGroup 제외 11개)

| #   | 컨테이너        | Spec 경로                 | 이관 규칙                                                                    |
| --- | --------------- | ------------------------- | ---------------------------------------------------------------------------- |
| 1   | CheckboxGroup   | `CheckboxGroup.spec.ts`   | labelPosition + orientation 복합 분기                                        |
| 2   | RadioGroup      | `RadioGroup.spec.ts`      | labelPosition + applySideLabelChildStyles 별도 처리                          |
| 3   | NumberField     | `NumberField.spec.ts`     | labelPosition + applySideLabelChildStyles                                    |
| 4   | TextField       | `TextField.spec.ts`       | labelPosition + applySideLabelChildStyles                                    |
| 5   | TextArea        | `TextArea.spec.ts`        | labelPosition 단순 (skipCSSGeneration 미설정)                                |
| 6   | DateField       | `DateField.spec.ts`       | labelPosition 단순                                                           |
| 7   | TimeField       | `TimeField.spec.ts`       | labelPosition 단순                                                           |
| 8   | DatePicker      | `DatePicker.spec.ts`      | labelPosition + flex column + gap (Label 필터링) + applySideLabelChildStyles |
| 9   | DateRangePicker | `DateRangePicker.spec.ts` | labelPosition + DatePicker 유사                                              |
| 10  | ColorField      | `ColorField.spec.ts`      | labelPosition 단순                                                           |
| 11  | ComboBox        | `ComboBox.spec.ts`        | labelPosition 단순                                                           |

### P3-2. 공통 `derivedContainerStyles` 패턴

11 컨테이너 중 대다수 (CheckboxGroup/RadioGroup 제외) 는 동일 규칙 (`labelPosition="side"` → row, 그 외 → column):

```ts
derivedContainerStyles: ({ props }) => ({
  flexDirection: props.labelPosition === "side" ? "row" : "column",
}),
```

복잡 분기 (CheckboxGroup/RadioGroup) 는 spec 별 개별 이관 + orientation/applySideLabelChildStyles 규칙 spec 내 표현.

### P3-3. 공유 헬퍼 도입 (P4 연결점)

공통 패턴이 9/11 이면 shared helper 도입:

```ts
// packages/specs/src/renderers/labelPositionFlex.ts (P4 에서 정식 배치)
export const labelPositionFlex = ({ props }): { flexDirection: string } => ({
  flexDirection: props.labelPosition === "side" ? "row" : "column",
});
```

spec 에서 `derivedContainerStyles: labelPositionFlex` 로 재사용.

### P3-4. sweep 전략 (PR 당 컨테이너 1개)

각 PR 당 다음 단계:

1. spec 에 `derivedContainerStyles` 추가
2. `implicitStyles.ts` 해당 컨테이너 분기 삭제 (+ `applySideLabelChildStyles` 호출 site 포함)
3. `resolveLabelFlexDir` 호출 카운트 1 감소
4. Chrome MCP `/cross-check` 통과
5. `pnpm type-check` + `pnpm build:specs` PASS

### P3-5. 검증

- [ ] 11 컨테이너 전수 개별 PR 이관 완료
- [ ] `grep -rn "resolveLabelFlexDir" apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` → 호출 수 12→1 (TagGroup P1 은 이미 제거, P3 **11** 컨테이너 마이그레이션 후 `resolveLabelFlexDir` 함수 정의 자체만 남음) → P4 에서 0 달성
- [ ] `grep -rn "applySideLabelChildStyles" implicitStyles.ts` → 호출 4곳 (L993/L1051/L1241/L1660) 전부 제거 + 함수 정의 자체만 남음 → P4 에서 0 달성
- [ ] 각 컨테이너 `parallel-verify` skill 5×5 통과
- [ ] Panel Direction 필드가 12 컨테이너 모두 실제 렌더와 일치

## P4: `resolveLabelFlexDir` spec-side util 재배치

### P4-1. 목표

P3 종료 시점에 `implicitStyles.ts` 내 `resolveLabelFlexDir` (L281-288) / `applySideLabelChildStyles` (L368) 헬퍼가 spec 으로부터 분리되어 존재할 이유가 없음. 이를 spec 계약의 일부로 재배치하여 **spec-runtime 경계 정리**.

### P4-2. 파일 이동

**이전**: `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` 내부

```ts
// L281-288
function resolveLabelFlexDir(labelPos, fallback, defaultDir) { ... }

// L368
function applySideLabelChildStyles(children, labelPos) { ... }
```

**이후**: `packages/specs/src/renderers/labelPositionFlex.ts` (P3-3 에서 선도 도입)

```ts
export const labelPositionFlex = ({ props }) => ({
  flexDirection: props.labelPosition === "side" ? "row" : "column",
});

export const sideLabelChildStyles = ({ props }) =>
  props.labelPosition === "side"
    ? { flex: 1, minWidth: 0, width: undefined }
    : {};
```

implicitStyles.ts 의 헬퍼 함수 정의 완전 삭제.

### P4-3. 체크리스트 (정밀 라인 참조)

- [ ] `packages/specs/src/renderers/labelPositionFlex.ts` — `labelPositionFlex`, `sideLabelChildStyles` export
- [ ] `implicitStyles.ts:281-288` — `resolveLabelFlexDir` 함수 정의 제거
- [ ] `implicitStyles.ts:368` — `applySideLabelChildStyles` 함수 정의 제거
- [ ] `implicitStyles.ts` 호출 site 전수 확인: L993 (RadioGroup) / L1051 (NumberField) / L1241 (TextField) / L1660 (DatePicker) — P3 에서 전부 제거되어야 P4 진입 가능
- [ ] `grep -rn "resolveLabelFlexDir\|applySideLabelChildStyles" apps/builder/src/builder/workspace` → **결과 0** (G4)
- [ ] 12 컨테이너 spec 중 9+ 가 `derivedContainerStyles: labelPositionFlex` shared helper 재사용
- [ ] `pnpm type-check` PASS
- [ ] Chrome MCP 12 컨테이너 spot-check 회귀 0

## P5: CSSGenerator data-attr emit (follow-up ADR)

### P5-1. scope 분리 사유

ADR-108 본문 Risk R3 참조. CSS duplication debt 해소는 별도 ADR 로 분리 — 함수 AST 분석 또는 DSL 전환은 독립 설계 트랙.

### P5-2. 진입 조건

- ADR-108 P0-P4 Implemented 완결
- 11 컨테이너의 수동 data-attr CSS 실태 audit (TagGroup 외 실제로 `data-label-position` 규칙 쓰는 컨테이너 몇 개인가)
- Babel AST / runtime probe / DSL 재평가 중 결정

### P5-3. 후속 ADR 템플릿

새 ADR 발행 시 본 ADR-108 을 precedent 로 참조. scope:

- CSSGenerator 가 `derivedContainerStyles` 함수를 정적 분석하여 `[data-prop="X"]` CSS selector 자동 emit
- 11 컨테이너 수동 CSS 의 `data-label-position` 규칙 자동 생성 대체
- `skipCSSGeneration: false` 유지하며 D3 symmetric debt 해소

## 전체 검증 매트릭스

| Gate | Phase | 통과 조건                                                                                                                    | Chrome MCP 필요 |
| ---- | ----- | ---------------------------------------------------------------------------------------------------------------------------- | :-------------: |
| G0   | P0    | type-check 전 영역 PASS + 8 consumer import 경로 갱신 + test 3건 PASS + Canvas 렌더 spot-check 회귀 0                        |      spot       |
| G1   | P1    | TagGroup 단일 Skia/Panel 대칭 확증                                                                                           |       ✅        |
| G2   | P2    | type-check 전 모듈 + Panel 4 section hook (Transform/Appearance/Typography/Layout) 호환 + Panel 12 컨테이너 Spec preset 반영 |       ✅        |
| G3   | P3    | 12 컨테이너 전수 `/cross-check` PASS + spec 에 `derivedContainerStyles` 이관 완료                                            |       ✅        |
| G4   | P4    | `grep` 으로 `resolveLabelFlexDir`/`applySideLabelChildStyles` 호출 0 확증 + util `@composition/specs` 로 이동                |      spot       |

## 성능 예산

- Panel derived 계산 per-selection 1회, < 1ms (함수 body 단순 조건 분기)
- Canvas implicitStyles 호출: element tree traversal 당 1회, 기존 분기 제거분과 상쇄 (net 0)
- childTags Set 재생성: Zustand childrenMap 변경 시 트리거, shallow 비교로 참조 안정성
- Phase 0 빌드 타임 영향: `@composition/specs` 패키지 크기 증가 (~500 줄 registry+resolver) — 빌드 시간 측정 < 2s 증가 예상

## 롤백 경로

- P0: Registry 이관 → git revert (단일 PR). 8 consumer import 경로 자동 복원. `IMAGE_TAGS` 잔존 상수 위치 유지로 Canvas 렌더 영향 0.
- P1: TagGroup 단일 → derivedContainerStyles 제거 + implicitStyles taggroup 분기 복원.
- P2: useElementStyleContext 필드 추가형 → props/childTags 무시 로직으로 롤백. 기존 Panel 동작 유지.
- P3: 각 컨테이너 개별 revert 가능. 마이그레이션 단위가 컨테이너 1개라 회귀 분리 용이.
- P4: spec-side util → implicitStyles 로 복귀 import. 함수 정의 자체는 동일하므로 경계만 조정.
- P5: follow-up ADR scope 이므로 본 ADR 영향 없음.
