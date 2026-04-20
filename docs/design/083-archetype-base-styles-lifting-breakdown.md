# ADR-083 Breakdown — Layout Primitive 리프팅 구현 상세 (Revision 4)

> 본 문서는 ADR-083 (`docs/adr/083-archetype-base-styles-lifting.md`) 의 Decision 섹션에서 분리된 구현 상세. Phase 0 (Skia consumer 일반화 — 3 영역 수정) + Phase 1-11 (archetype 별 spec 리프팅). Revision 4 = Codex Round 4 HIGH+MED (Phase 0 호출 지점 구체화 + `LOWERCASE_TAG_SPEC_MAP` casing 정규화) 반영. Revision 5 = Codex Round 5 MED+LOW (`applyImplicitStyles` 실제 함수명 교체 + revision 표기 동기화) 반영.

## 배경 (요약)

- `packages/specs/src/renderers/CSSGenerator.ts:50-116` `ARCHETYPE_BASE_STYLES` 테이블 (12 entry, tabs-indicator 0 spec 제외 시 11 archetype) 이 layout base 를 CSSGenerator 단독 소유
- **3 consumer 비대칭 현황**:
  - CSSGenerator: archetype base + containerStyles 양쪽 emit
  - Style Panel (ADR-082): containerStyles 소비 경로 완성 — 단 spec 에 값이 선언돼야 표시
  - **Skia layout (ADR-080 `resolveContainerStylesFallback`)**: **`CONTAINER_STYLES_SPEC_MAP = { listbox: ListBoxSpec }` 단일 태그 + `CONTAINER_STYLES_FALLBACK_KEYS = 4 필드` (display/flexDirection/gap/padding). scope 8 필드 중 절반 + listbox 외 태그 아예 소비 없음** (`implicitStyles.ts:95-105`)
- 잠재 drift 가 개별 `containerTag === "inlinealert"` / `"gridlistitem"` / `"listboxitem"` / `"tabs"` / `"toolbar"` 하드코딩 분기로 임시 해결 — 2차 소스 파편화 (ADR-063 SSOT 위반)
- 리프팅된 spec = `ListBox.spec.ts:76-91` (ADR-078 Phase 5) + `ListBoxItem.spec.ts:49-57` (ADR-079 P1) **2 spec**. 잔여 63 spec 은 archetype table 의존

## 전체 영향 범위 (archetype × spec)

| archetype          | base 선언 요약 (layout primitive 부분만)                                             | 영향 spec 수                                                                                    | 권장 Phase 순서     |
| ------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------- |
| `alert`            | `display:flex; flex-direction:column; align-items:flex-start; width:100%`            | 2 (InlineAlert, IllustratedMessage)                                                             | **Phase 1 (Pilot)** |
| `input-base`       | `display:flex; align-items:center`                                                   | 2                                                                                               | Phase 2             |
| `toggle-indicator` | `display:inline-flex; align-items:center`                                            | 3                                                                                               | Phase 3             |
| `calendar`         | `display:grid`                                                                       | 3                                                                                               | Phase 4             |
| `slider`           | `display:grid`                                                                       | 3                                                                                               | Phase 5             |
| `collection`       | `display:flex; flex-direction:column`                                                | 5 (Autocomplete/ListBox/Menu/TabPanel/TabPanels; ListBox 만 기존 리프팅 완료 — **잔여 4 spec**) | Phase 6             |
| `text`             | `display:block; width:100%`                                                          | 4                                                                                               | Phase 7             |
| `button`           | `display:inline-flex; align-items:center; justify-content:center; width:fit-content` | 5                                                                                               | Phase 8             |
| `overlay`          | (`position:fixed` — scope 외)                                                        | 4 (layout primitive 속성이 schema 지원 범위에 없어 실질 변경 0)                                 | Phase 9             |
| `progress`         | (`display:grid` + grid-template-\* + nested — `display:grid` 만 scope 내)            | 7                                                                                               | Phase 10 (특수)     |
| `simple`           | `display:inline-flex; align-items:center`                                            | 27 (`ListBoxItem.spec` 은 이미 리프팅 완료 — **잔여 26 spec**)                                  | Phase 11 (대량)     |
| `tabs-indicator`   | `display:flex`                                                                       | **0** (현재 소비 spec 없음 — Generator 테이블 entry 만 존재)                                    | G5 검증 시 확인만   |
| **합계**           | —                                                                                    | **63 잔여 spec** (영향 11 archetype)                                                            | —                   |

**기존 리프팅 완료 spec (선례)**: `ListBox.spec.ts:76-91` (collection archetype, ADR-078 Phase 5) + `ListBoxItem.spec.ts:49-57` (simple archetype, ADR-079 P1) = **2 spec**.

## Phase 0 — Skia consumer 일반화 (신설, 선행 필수)

### 수정 대상 (3 영역)

1. `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:95-105` — lookup map + fallback keys 확장
2. `implicitStyles.ts:491-492` — `applyImplicitStyles` 진입부에 **공통 fallback 선주입 layer** 추가 (Codex Round 4 HIGH 반영)
3. `implicitStyles.ts:716` — 기존 listbox 분기의 `resolveContainerStylesFallback("listbox", parentStyle)` 중복 호출 제거 (공통 layer 로 흡수)

### 현재 상태

```typescript
// implicitStyles.ts:95-105
const CONTAINER_STYLES_SPEC_MAP: Record<string, ComponentSpec<any>> = {
  listbox: ListBoxSpec, // ← 소문자 키 (implicitStyles casing 정합용 수동 정의)
};

const CONTAINER_STYLES_FALLBACK_KEYS = [
  "display",
  "flexDirection",
  "gap",
  "padding", // ← 4 필드
] as const;

// implicitStyles.ts:716 (호출 지점 1곳, listbox 분기 안)
// if (containerTag === "listbox") {
//   effectiveParent = withParentStyle(containerEl, {
//     ...parentStyle,
//     ...resolveContainerStylesFallback("listbox", parentStyle),
//   });
// }
```

### Phase 0 변경 (3 영역)

#### 1. `CONTAINER_STYLES_SPEC_MAP` TAG_SPEC_MAP 기반 일반화 + casing 정규화

```typescript
import { TAG_SPEC_MAP } from "../../sprites/tagSpecMap";

// TAG_SPEC_MAP 은 PascalCase 키 (InlineAlert, ListBox, ...) — implicitStyles 는
// containerTag.toLowerCase() 를 사용하므로 lowercase Map 을 build-time 1 회 구축.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOWERCASE_TAG_SPEC_MAP: ReadonlyMap<string, ComponentSpec<any>> = new Map(
  Object.entries(TAG_SPEC_MAP).map(([k, v]) => [
    k.toLowerCase(),
    v as ComponentSpec<any>,
  ]),
);

const CONTAINER_STYLES_FALLBACK_KEYS = [
  "display",
  "flexDirection",
  "alignItems", // 신규
  "justifyContent", // 신규
  "width", // 신규
  "maxHeight", // 신규
  "overflow", // 신규
  "outline", // 신규
  "gap", // 기존
  "padding", // 기존
] as const;

export function resolveContainerStylesFallback(
  tag: string, // lowercase 전달 전제
  parentStyle: Record<string, unknown>,
): Record<string, unknown> {
  const spec = LOWERCASE_TAG_SPEC_MAP.get(tag);
  const cs = spec?.containerStyles;
  if (!cs) return {};
  // 이하 기존 로직 유지 (parentStyle 우선, TokenRef resolve, 10 필드 순회)
  // ...
}
```

#### 2. `applyImplicitStyles` 진입부에 공통 선주입 layer

```typescript
// implicitStyles.ts:491 부근 — containerTag 계산 직후
export function applyImplicitStyles(containerEl, ...): ImplicitStyleResult {
  const containerTag = (containerEl.tag ?? "").toLowerCase();
  const rawParentStyle = (containerEl.props?.style || {}) as Record<string, unknown>;

  // Phase 0: 모든 태그에 Spec containerStyles fallback 선주입.
  //   spec 미선언 태그 → resolveContainerStylesFallback 이 {} 반환 → 영향 없음.
  //   spec 선언 태그 (ListBox/ListBoxItem + Phase 1~11 로 리프팅된 spec) → 10 필드 중
  //   parentStyle 에 없는 것만 추가. 기존 inline 값은 parentStyle 우선 가드로 보존.
  const specFallback = resolveContainerStylesFallback(containerTag, rawParentStyle);
  const parentStyle: Record<string, unknown> = { ...specFallback, ...rawParentStyle };

  // 이하 기존 로직: containerTag === "..." 분기들이 이 parentStyle 을 spread 하여
  // 소비. 하드코딩 분기의 `parentStyle.display ?? "flex"` 패턴은 spec fallback 이
  // 이미 parentStyle 에 주입된 상태라 자연 override (parentStyle.display 가 spec 값
  // 또는 사용자 값으로 defined → `??` 우측 미사용).
  let effectiveParent = containerEl;
  // ...
}
```

#### 3. 기존 listbox 분기의 중복 호출 제거

```typescript
// implicitStyles.ts:716 기존
// if (containerTag === "listbox") {
//   effectiveParent = withParentStyle(containerEl, {
//     ...parentStyle,
//     ...resolveContainerStylesFallback("listbox", parentStyle),  // ← 제거
//   });
// }

// 변경: 공통 layer 가 이미 parentStyle 에 선주입. 분기는 parentStyle 만 spread.
if (containerTag === "listbox") {
  effectiveParent = withParentStyle(containerEl, { ...parentStyle });
  // 또는 listbox 고유 추가 로직만 남기고 fallback 호출은 제거
}
```

### 하드코딩 분기 감사 (R0 대응)

grep 대상: `containerTag === "` in `implicitStyles.ts`. 모든 분기를 전수 조사하여 **Phase 0 공통 선주입 이후 parentStyle 기반 동작**과 충돌 여부 확인.

| 태그 예시                  | 하드코딩 패턴                                                | Phase 0 후 동작 (공통 선주입 이후)                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inlinealert` (~line 2000) | `display: parentStyle.display ?? "flex"` 등 3 속성 `??` 패턴 | spec 미선언 → `??` 우측 하드코딩 값 사용. Phase 1 리프팅 후 공통 layer 가 parentStyle 에 spec 값 선주입 → `??` 좌측 defined → 자연 override                                  |
| `gridlistitem` (~line 749) | `display:"flex"; flexDirection:"column"` 직접 할당           | **`??` 없이 덮어쓰는 패턴** — spec 값이 parentStyle 에 있어도 하드코딩이 이김. 해결: spec 리프팅이 시점까지 whitelist 유지. spec 리프팅 후 하드코딩 제거 별도 ADR (R8)       |
| `listboxitem` (~line 768)  | 동일 `??` 없음                                               | 동일. 현재 ListBoxItem.spec 리프팅 완료 상태지만 하드코딩이 우선 → Phase 0 효과 무시됨. **Phase 0 에서 listboxitem 분기 정리 필요** (spec 값 사용하도록 `??` 도입 또는 제거) |
| `tabs` (~line 784)         | 확인 필요                                                    | grep 결과 전수 목록화                                                                                                                                                        |
| `toolbar` 등 기타          | 확인 필요                                                    | grep 결과 전수 목록화                                                                                                                                                        |

**감사 원칙**: `parentStyle.X ?? "값"` 패턴은 자연 호환. 직접 할당 패턴은 `?? parentStyle.X` 도입 또는 분기 제거. 분기 제거가 위험하면 whitelist 로 일시 제외하고 후속 ADR (R8).

### Gate G0 통과 조건

(a) `LOWERCASE_TAG_SPEC_MAP` build-time 구축 + `CONTAINER_STYLES_FALLBACK_KEYS` 10 필드 (8 신규 + gap/padding 기존) 확장
(b) `applyImplicitStyles` 진입부 공통 선주입 layer 추가 + `implicitStyles.ts:716` 기존 listbox 호출 제거
(c) 하드코딩 분기 전수 감사 목록화 + `??` 패턴/직접 할당 분류 + 직접 할당 분기 처리 방식 결정 (수정 or whitelist)
(d) Chrome MCP: **ListBox 외 최소 1 태그** 에서 spec 값이 Skia 에 반영 확증 (예: 임시로 Select.spec.containerStyles 에 `display:"flex"` 주입 → 배치 변화 → 원복). 기존 리프팅된 ListBoxItem 도 Phase 0 이후 Skia 에 반영되는지 확인 (직접 할당 분기 정리 효과 실측)
(e) `pnpm type-check` 3/3 + `pnpm --filter @composition/builder test` 회귀 0
(f) `resolveContainerStylesFallback.test.ts` (ADR-080 기존) + `tokenConsumerDrift.test.ts` (ADR-081) snap 재실행 — 10 필드로 확장됐으므로 snap update 불가피, 의도된 변화만 update

## Phase 1 (Pilot: `alert` archetype)

### 대상 Spec

- `packages/specs/src/components/InlineAlert.spec.ts`
- `packages/specs/src/components/IllustratedMessage.spec.ts`

### 변경

```typescript
// InlineAlert.spec.ts — variants 아래, sizes 위에 추가
// Scope: ContainerStylesSchema 현재 지원 필드만 (display/flexDirection/
// alignItems/justifyContent/width/maxHeight/overflow/outline). box-sizing,
// font-family 등은 schema 미지원 → archetype table 에 잔존 (Revision 2).
containerStyles: {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  width: "100%",
},
```

### 검증

- `pnpm build:specs` 성공 + `packages/shared/.../InlineAlert.css` regenerate 확인 (stale 방지)
- Factory 감사: `createDefaultInlineAlertProps` / `createDefaultIllustratedMessageProps` 중복 주입 없음 (R5)
- Generated CSS diff: double-emit 이지만 cascade 동일 (회귀 0)
- Chrome MCP 3 경로 샘플: Builder Skia = Preview DOM = Panel 표시 (R6)
- `implicitStyles.ts:~2000` InlineAlert 하드코딩 분기: Phase 0 일반화 이후 spec 값이 parentStyle 로 선주입되면 `??` 우측 사용 안 됨 → 하드코딩 제거 여부는 **본 ADR scope 외** (후속 R8)
- ADR-081 `tokenConsumerDrift.test.ts` 재실행 → drift 없음 또는 의도된 snap update

### Gate G1 통과 조건

- `pnpm type-check` 3/3 PASS
- `pnpm --filter @composition/builder test` 215+ PASS
- Generated CSS diff 수동 검토 "실질 변화 없음"
- **ADR-082 본문에 Hard Constraint "Spec 내용 불변" 해제 Addendum 작성 (R3)**
- alert archetype factory 감사 완료 (R5)

## Phase 2–11 공통 절차

1. 해당 archetype 대표 spec 1 개에 `containerStyles` 추가 (schema 지원 필드만)
2. **Factory 사전 감사** (`createDefault*Props`) — 중복 주입 grep, 발견 시 먼저 제거 (ADR-079 P3 계약)
3. `pnpm build:specs` → `packages/shared` regenerate 확인
4. 3 경로 검증:
   - Generator CSS diff "실질 변화 없음"
   - Skia Taffy: 실제 배치 반영 (Phase 0 일반화 경로 활용)
   - Panel: Layout/Transform section 값 표시 (ADR-082 A1/A2 경로)
5. `tokenConsumerDrift.test.ts` (ADR-081) 재실행 + 의도된 snap update
6. archetype 의 잔여 spec 일괄 적용 (batch script 또는 수동)
7. 단위 테스트 추가: `resolveLayoutSpecPreset(tag, size)` 반환값 확인
8. Preview/Publish cascade 샘플링 (Phase 2 이상부터)

**주의 archetype**:

- `progress`: grid-template-\* + nested selector 는 scope 외. `display: grid` 만 리프팅
- `overlay`: `position: fixed` scope 외. layout primitive 속성이 schema 지원 범위에 없어 실질 변경 0 (archetype table 유지로 CSS 소유)
- `collection`: 5 spec 중 ListBox 1개 기존 리프팅 완료 (`ListBox.spec.ts:76-91`). 잔여 **4 spec** (Autocomplete/Menu/TabPanel/TabPanels) 처리. Menu/Autocomplete 는 색상·간격 containerStyles 만 선언된 상태
- `simple`: 27 spec 중 `ListBoxItem.spec` 기존 리프팅 완료 → 잔여 26. batch script — `archetype==="simple"` + 기존 containerStyles 에 layout primitive 미선언 spec 에 `display="inline-flex"; alignItems="center"` 일괄 주입

## Generator 정리 (최종 Phase — Revision 2 축소 유지)

**본 ADR scope**: `ARCHETYPE_BASE_STYLES` 테이블 **유지**. layout primitive 는 spec containerStyles 와 archetype table 양쪽에 중복 상태 (cascade 동일). 비-layout 속성은 archetype table 단독 소유.

- `generateBaseStyles` 로직 **변경 없음** (2-block emit 유지)
- `DEFAULT_BASE_STYLES` 변경 없음
- `archetypeCssParity.test.ts` 신설 — layout primitive 가 archetype table / spec containerStyles 양쪽에 동일 값 선언 cross-ref

**후속 ADR (본 ADR scope 외)**:

- `ContainerStylesSchema` 확장 (box-sizing/cursor/user-select/transition/font-family/position/grid-template-\* + nested selector)
- `emitContainerStyles` 확장
- archetype table 완전 삭제
- 하드코딩 분기 (`containerTag === "..."`) 해체 (R8) — 각 태그 spec containerStyles 충분 공급 후 제거

## 본 ADR scope 에서 리프팅되는 layout primitive 필드

| 필드             | `ContainerStylesSchema` 타입 (`spec.types.ts:59-93`)                                            |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `display`        | `"flex" \| "inline-flex" \| "grid" \| "block" \| "inline-block"`                                |
| `flexDirection`  | `"row" \| "column" \| "row-reverse" \| "column-reverse"`                                        |
| `alignItems`     | `"stretch" \| "flex-start" \| "flex-end" \| "center" \| "baseline"`                             |
| `justifyContent` | `"flex-start" \| "flex-end" \| "center" \| "space-between" \| "space-around" \| "space-evenly"` |
| `width`          | `string`                                                                                        |
| `maxHeight`      | `string`                                                                                        |
| `overflow`       | `"auto" \| "scroll" \| "visible" \| "hidden"`                                                   |
| `outline`        | `string`                                                                                        |

**Phase 0 에서 추가하는 fallback keys** = 위 8 + 기존 `gap` / `padding` = **총 10 필드 lookup**.

**미지원 필드 (본 ADR 범위 외)**: `box-sizing` / `cursor` / `user-select` / `transition` / `font-family` / `position` / `grid-template-areas` / `grid-template-columns` / nested selector.

## 테스트 전략

### 단위 테스트

- `specPresetResolver.test.ts`: archetype별 최소 1 케이스 (11 archetype × 1 = 11 케이스)
- `resolveContainerStylesFallback.test.ts` (ADR-080 기존 파일): Phase 0 확장 범위 커버 (TAG_SPEC_MAP 다중 태그 + 8 필드)

### Regression 테스트 (drift 감지)

- `packages/specs/src/renderers/__tests__/archetypeCssParity.test.ts` **신설** — archetype base ↔ spec containerStyles cross-ref

### Chrome MCP E2E

- Phase 0 완료 후: 선별 태그 1-2 개에서 consumer 일반화 실증
- 각 Phase 완료 후: 대표 spec 1 개 × 3 경로 (Builder Skia / Preview DOM / Publish DOM)

## 롤백 전략

각 Phase 는 **독립 커밋**. 문제 발생 시 해당 Phase 만 revert. `ARCHETYPE_BASE_STYLES` 테이블은 최종까지 유지 → 부분 리프팅 상태에서도 CSS 생성 정상.

**Phase 0 롤백 특이사항**: consumer 일반화가 예상 외 충돌 유발 시 `CONTAINER_STYLES_SPEC_MAP` whitelist 방식으로 축소 (기존 listbox + 추가한 1-2 태그만). 나머지 태그는 후속 ADR 로 이관.

## 세션 분할 권장

| 세션  | 범위                                                                   | 예상 시간 |
| ----- | ---------------------------------------------------------------------- | :-------: |
| **0** | **Phase 0 (Skia consumer 일반화 + 하드코딩 분기 감사) + G0 통과**      |   2–3h    |
| A     | Phase 1 Pilot (alert) + G1 통과 (ADR-082 Addendum 포함)                |    2h     |
| B     | Phase 2–5 (input-base/toggle-indicator/calendar/slider)                |   2–3h    |
| C     | Phase 6–9 (collection 잔여 4 / text / button / overlay)                |   3–4h    |
| D     | Phase 10 (progress — display:grid 만 scope)                            |    1h     |
| E     | Phase 11 (simple 잔여 26 — batch script)                               |   3–4h    |
| F     | G5 최종 검증 (archetypeCssParity 전면 + 3 경로 sampling + 회귀 테스트) |   1–2h    |

**총 14–19h** (6–7 세션). ADR-082 P5 Chrome MCP 검증은 Phase 0 + Phase 1 이후 병렬 가능.

## 참조 파일 경로

- 테이블 위치: `packages/specs/src/renderers/CSSGenerator.ts:50-116`
- 선례: `packages/specs/src/components/ListBox.spec.ts:76-91` + `ListBoxItem.spec.ts:49-57`
- **Phase 0 수정 대상**: `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:95-105` (`CONTAINER_STYLES_SPEC_MAP` + `CONTAINER_STYLES_FALLBACK_KEYS`)
- **하드코딩 분기 감사**: `implicitStyles.ts` 내 `containerTag === "..."` grep
- Panel resolver: `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts`
- drift 인프라: `apps/builder/src/builder/workspace/canvas/layout/engines/tokenConsumerDrift.test.ts` (ADR-081)
- SSOT 원칙: `.claude/rules/ssot-hierarchy.md`
