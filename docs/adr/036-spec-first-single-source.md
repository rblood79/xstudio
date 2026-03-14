# ADR-036: Spec-First Single Source — Spec shapes 기반 CSS 자동 생성

## Status

Proposed

## Date

2026-03-13 (2026-03-14 재검토 + 코드베이스 대조 검증 반영)

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-017](completed/017-css-token-architecture.md): CSS 토큰 아키텍처
- [ADR-018](completed/018-css-utility-classes.md): CSS Utility 클래스 체계
- [ADR-021](completed/021-theme-system-redesign.md): Theme System 재설계
- [ADR-022](completed/022-s2-color-token.md): S2 색상 토큰 전환
- [ADR-023](completed/023-s2-variant-props.md): S2 Variant Props
- [ADR-038](038-figma-import.md): Figma 디자인 임포트 시스템
- [ADR-033](completed/033-css-property-ssot-consolidation.md): CSS 속성 SSOT 통합 — 구조 변수화
- [ADR-041](041-spec-driven-property-editor.md): Spec 기반 프로퍼티 에디터 자동 생성

---

## Context

XStudio는 Skia/WebGL 캔버스 (빌더) + DOM (Preview/Publish) 이중 렌더링 아키텍처를 사용한다.
현재 컴포넌트 시각 정의가 3곳에 분산되어 있어 **3중 동기화 고통**이 존재한다.

### 문제 1. 스타일 정의 3중 분산

| 파일 그룹                                     | 역할                                       | 규모                           |
| --------------------------------------------- | ------------------------------------------ | ------------------------------ |
| `packages/shared/src/components/styles/*.css` | React Aria 컴포넌트용 CSS                  | 81개 파일, ~13,742줄           |
| `packages/specs/src/components/*.spec.ts`     | Skia 렌더링용 Spec shapes                  | 93개 파일, ~19,350줄           |
| `apps/builder/.../engines/utils.ts`           | `BUTTON_SIZE_CONFIG` 등 레이아웃 엔진 숫자 | 3,530줄 파일 내 5+ config 객체 |

합계 ~33,000줄 중 추정 40–50%가 거울/중복 정의이며, `// @sync` 주석에 의존하는 수동 동기화로 일치를 유지한다.

### 문제 2. 변경 시 3곳 수동 동기화 필요

Button의 padding을 12px → 16px로 바꾸려면:

1. `Button.css` — `--btn-padding` 값 수정
2. `Button.spec.ts` — `sizes.md.paddingX` 수정
3. `utils.ts` — `BUTTON_SIZE_CONFIG.md.paddingLeft` 수정

한 곳이라도 누락되면 Builder(Skia) ↔ Preview(DOM) 시각적 불일치가 발생한다.

### 문제 3. 테마 다양화 비용 급증

- 새 테마/variant 추가 시 CSS + Spec shapes 양쪽 동시 작업 필수
- CSS가 Spec과 완전히 다른 형태(선언적 vs 좌표계)라 자동 검증 불가

### Hard Constraints

1. **Skia/WebGL 캔버스 렌더링은 유지해야 한다** — 대규모 편집 성능상 필수 (Figma 동일 선택)
2. **Preview/Publish는 실제 DOM + React Aria Components를 사용해야 한다** — 웹 표준 출력 필수
3. **기존 93개 Spec의 `shapes()` 함수는 보존한다** — Skia 렌더링 경로 변경 없음
4. **ComponentSpec 타입 시스템(`variants`/`sizes`/`states`)을 보존한다**
5. **ADR-022 S2 토큰 체계 + ADR-021 Theme System을 보존한다**

---

## Alternatives Considered

### 대안 A: 현행 유지 (CSS-first + 수동 동기화)

- 위험: 기술(L) / 성능(L) / 유지보수(**H**) / 마이그레이션(L)
- 장점: 변경 없음, 학습 비용 0
- 단점: 3중 동기화 영구 지속, 테마 다양화 비용 선형 증가, 불일치 버그 상존

### 대안 B: Spec shapes → CSS 역추론 (완전 역방향)

- 위험: 기술(**H**) / 성능(L) / 유지보수(M) / 마이그레이션(**H**)
- 장점: 이론상 완전한 single source
- 단점: shapes 좌표에서 CSS 의도(transition, cascade, media query)를 복원하는 것은 원리적 한계

### 대안 C: Spec 메타데이터 + Archetype 템플릿 기반 CSS 생성 (채택)

- 위험: 기술(M) / 성능(L) / 유지보수(**L**) / 마이그레이션(M)
- `variants`/`sizes`/`states`에서 공통 CSS 생성(Level 1) + 컴포넌트 유형별 Archetype 템플릿으로 pseudo-element/animation 등 구조적 CSS 생성(Level 2)
- shapes()를 범용 역추론하지 않되, shapes()의 **데이터**를 Archetype 템플릿이 알고 있는 구조에 매핑
- 장점: 기존 CSSGenerator 확장, Archetype 수 유한(~10개), 자동화율 목표 90–95% (Archetype POC 결과에 따라 재평가)
- 단점: Archetype 템플릿 ~10개 개발 투자, Table만 수동 유지

### 대안 D: Design Token 레지스트리 + 외부 코드젠

- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(**H**)
- 단점: 외부 도구 의존성, Spec shapes 통합 복잡, ADR-022 체계와 이질적

### 대안 E: CSS 유지 + 자동 Sync 검증

- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)
- 장점: 마이그레이션 비용 최소
- 단점: 3중 소스 구조 유지, 능동적 동기화 아닌 수동적 검증

### Risk Threshold Check

| 대안  | 기술  | 성능 | 유지보수 | 마이그레이션 | 판정                 |
| ----- | ----- | ---- | -------- | ------------ | -------------------- |
| A     | L     | L    | **H**    | L            | 장기 부적합          |
| B     | **H** | L    | M        | **H**        | 범용 역추론 한계     |
| **C** | M     | L    | **L**    | M            | **채택 (주력)**      |
| D     | M     | L    | L        | **H**        | 과잉 의존성          |
| E     | L     | L    | M        | L            | 보조 안전망으로 활용 |

**채택: 대안 C(주력) + E(안전망)**

---

## Decision

**React Aria의 Primitive Composition 구조에 따라, Primitive(Tier 1) CSS를 Spec에서 자동 생성하고, Composite(Tier 2) CSS는 layout + 변수 위임으로 자동 생성한다.**

핵심 원칙:

- **Primitive-first**: CSS 생성의 단위는 "컴포넌트"가 아니라 React Aria **Primitive**. Button/Input/ListBox 등 Primitive CSS가 생성되면, 이를 조합하는 Select/ComboBox/DatePicker 등은 변수 위임만으로 완성
- `shapes()`를 범용적으로 역추론하지 않는다 — 유한한 Archetype 템플릿이 shapes()의 데이터를 CSS 구조에 매핑
- SizeSpec은 Skia+CSS **공통** 속성을 포함한다 (letterSpacing 등 Skia TextShape에도 존재하는 속성)
- **Composite의 CSS = layout(flex/grid) + CSS Variable Delegation** — 자식 Primitive의 `--btn-*`, `--input-*` 등을 size별로 override
- `@media` 접근성 패턴은 모든 컴포넌트에 자동 생성 (24개 파일 동일 패턴)

### Rationale

> **핵심 발견 1**: "CSS-only"로 분류했던 pseudo-element 패턴 대부분이 이미 Spec shapes()에 데이터가 존재한다. Switch thumb = `circle` shape, Radio dot = `circle` shape. CSS `::before`는 렌더링 메커니즘이지 데이터가 아니다. 단, Checkbox 체크마크는 CSS에서 SVG `stroke` 속성을 직접 스타일링하므로, `line` shape 데이터 → SVG stroke CSS 변환 로직이 Archetype 템플릿에 필요하다.

> **핵심 발견 2 (조합 모델)**: React Aria의 composition 패턴을 분석하면, **CSS 생성 대상이 "컴포넌트 수"가 아니라 "Primitive 수"로 극적으로 줄어든다.** XStudio의 모든 복합 컴포넌트(Select, ComboBox, DatePicker, NumberField 등)는 소수의 Primitive(Button, Input, ListBox, Popover, Calendar 등)를 조합한 것이다. **Primitive CSS만 생성하면, Composite CSS는 layout + 변수 위임으로 자동 완성된다.**

> **핵심 발견 3 (변수 위임)**: ADR-033의 **CSS 변수 위임 패턴(`--input-*`, `--btn-*`, `--label-*`)은 Composite CSS의 핵심 메커니즘**이다. 실제 코드베이스에서 Select.css는 `--btn-display`, `--btn-padding`, `--btn-font-size`를 override하고, DatePicker.css는 `--dp-input-padding`, `--dp-btn-width`를 override한다. 이 패턴은 Composite의 `composition` 메타데이터에서 자동 생성할 수 있다.

> **핵심 발견 4 (기하학적 한계)**: `translateX(100%)` (Switch thumb), `calc()` 표현식, SVG stroke 등 **기하학적 관계를 Spec 데이터에서 CSS로 매핑하는 방법은 Archetype POC(Gate G4-pre)에서 검증**이 필요하다. 이는 대안 B("shapes 좌표에서 CSS 의도 복원")와 경계가 모호하므로, 검증 실패 시 해당 Primitive는 수동 유지한다.

**React Aria Primitive Composition 구조 (코드베이스 실측):**

```
┌─ Primitive (Tier 1) ─ 자체 시각적 정체성, CSS 생성 대상 ──────────────────┐
│                                                                             │
│  Button  Input  ListBox/Item  Popover  Calendar/Cell  Checkbox  Radio      │
│  Switch  Tab    Slider/Track/Thumb  Badge  Tag  Separator  ProgressBar ... │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                     CSS Variable Delegation (--btn-*, --input-*, ...)
                                    │
┌─ Composite (Tier 2) ─ Primitive를 조합, CSS = layout + 변수 위임 ─────────┐
│                                                                             │
│  Select        = Button(trigger) + Popover + ListBox                        │
│  ComboBox      = Input + Button + Popover + ListBox                         │
│  DatePicker    = DateInput + Button + Popover + Dialog + Calendar            │
│  DateRangePicker = DateInput(×2) + Button + Popover + RangeCalendar         │
│  NumberField   = Input + Button(increment) + Button(decrement)              │
│  SearchField   = Input + Button(clear)                                      │
│  ColorPicker   = ColorSwatch + Button + Popover + ColorArea/Slider/Field    │
│  Menu          = MenuTrigger + Button + Popover + Menu/MenuItem             │
│  Tabs          = TabList + Tab[] + TabPanel[]                               │
│  TagGroup      = TagList + Tag[] + Button(remove)                           │
│  RadioGroup    = Radio[] (layout only)                                      │
│  CheckboxGroup = Checkbox[] (layout only)                                   │
│  Disclosure    = Button(trigger) + DisclosurePanel                          │
│  Card          = CardPreview + CardFooter (layout)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **핵심 통찰**: Select.css가 복잡해 보이는 이유는 "Select가 복잡해서"가 아니라, **Button + ListBox + Popover 3개 Primitive의 CSS를 size별로 override하기 때문**이다. Primitive CSS가 자동 생성되면, Select.css는 `{ display: flex; gap: ... }` + `[data-size="md"] .react-aria-Button { --btn-padding: ... }` 정도로 축소된다.

**Tier 기반 CSS 생성 아키텍처:**

```
┌──────────────────────────────────────────────────────────────┐
│  Tier 1: Primitive CSS 생성 (Spec → CSS)                      │
│                                                                │
│  Level 1: variant 색상, size 값, state 효과 (data-* 선택자)   │
│  Level 2: Archetype 템플릿 (~6개)                              │
│    toggle-indicator | progress | slider | tabs-indicator       │
│    @media(forced-colors, reduced-motion) | @keyframes          │
│  → ~20개 Primitive CSS 자동 생성                               │
└──────────────────────────────────────────────────────────────┘
                             +
┌──────────────────────────────────────────────────────────────┐
│  Tier 2: Composite CSS 생성 (Composition 메타데이터 → CSS)    │
│                                                                │
│  layout 규칙 (flex/grid) + CSS Variable Delegation             │
│  Select → --btn-*, --label-*  |  DatePicker → --dp-input-*    │
│  ComboBox → --input-*, --btn-* | NumberField → --nf-input-*   │
│  → ~15개 Composite CSS 자동 생성                               │
└──────────────────────────────────────────────────────────────┘
                             +
┌──────────────────────────────────────────────────────────────┐
│  Foundation: 공통 utility CSS (자동 생성 대상 아님)            │
│  utilities.css, base.css, foundation.css, animations.css,     │
│  forms.css, collections.css, overlays.css (~12개)             │
└──────────────────────────────────────────────────────────────┘
                             +
┌──────────────────────────────────────────────────────────────┐
│  Tier 3: 수동 CSS + validate:sync 안전망                      │
│  Table, GridList, Tree (~3–5개)                               │
└──────────────────────────────────────────────────────────────┘
```

**업계 비교:**

| 도구        | 렌더러                   | 편집 성능 | 퍼블리싱     | 단일 솔루션 |
| ----------- | ------------------------ | --------- | ------------ | ----------- |
| Figma       | Skia/WebGPU              | 최고      | **없음**     | **아님**    |
| Webflow     | DOM 직접                 | DOM 한계  | DOM 배포     | 성능 제한   |
| Framer      | React DOM                | DOM 한계  | React SSR    | 성능 제한   |
| Plasmic     | React DOM                | DOM 한계  | 코드젠       | 성능 제한   |
| Penpot      | SVG (DOM)                | 중간      | HTML/CSS     | 성능 제한   |
| **XStudio** | **Skia + DOM 이중 출력** | **최고**  | **DOM 배포** | **유일**    |

XStudio는 Mitosis의 IR(중간 표현) → 멀티 타겟 컴파일과 동일한 구조다. ComponentSpec이 Skia shapes와 CSS 양쪽의 단일 소스 역할을 한다. Figma가 "임의 벡터 → CSS"를 포기한 이유는 입력이 비구조적이었기 때문이지만, XStudio의 Spec은 `variants`/`sizes`/`states`/`shapes()` 타입 시스템으로 이미 구조화되어 있다.

> **XStudio는 고성능 캔버스 편집 + 프로덕션 웹 퍼블리싱을 단일 워크플로우로 제공하는 업계 유일의 도구**이며, ADR-036은 이 아키텍처의 핵심 비용(Spec↔CSS 이중 유지)을 자동화로 제거하는 인프라다.

---

## Gates

| 게이트      | 조건                                                                                                                                                                   | 위험 등급 | 시점                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------- |
| G0-pre      | **사전조사**: SizeSpec↔SIZE_CONFIG 필드 갭 매핑 완료 + 93개 Spec size 키 대소문자 혼재 현황 전수 조사 보고서                                                           | L         | Phase 0 전           |
| G0a         | SizeSpec 타입 확장 + `[key: string]: any` 인덱스 시그니처 **완전 제거** + `pnpm type-check` 통과 + 기존 Spec 빌드 정상                                                 | M         | Phase 0a 완료        |
| G0b         | `generate-css.ts` 첫 실행 성공 (generated/ 디렉토리에 최소 1개 CSS 출력 확인)                                                                                          | L         | Phase 0b 완료        |
| G1          | SIZE_CONFIG 제거 후 Builder에서 Button/ToggleButton 5개 size 시각 비교 동일                                                                                            | M         | Phase 0b 완료        |
| G2-pre      | `pnpm validate:sync` 스크립트 구현 + `package.json` scripts 등록 완료                                                                                                  | M         | Phase 1 착수전       |
| G2          | `pnpm validate:sync` — 전체 컴포넌트 CSS↔Spec 값 차이 리포트 0건                                                                                                       | M         | Phase 1 완료         |
| G2a-pre     | `generateBaseStyles()` Archetype 인식 분기 리팩토링 완료 (비-button 컴포넌트에 `cursor: pointer` 등 하드코딩 제거)                                                     | M         | Phase 2a 착수전      |
| G3          | Level 1: `generateCSS(ButtonSpec)` 출력과 현재 `Button.css` diff — 공통 속성 누락 0건                                                                                  | M         | Phase 2a 완료        |
| G4-pre      | **Archetype POC**: toggle-indicator 템플릿으로 Switch CSS 생성 → 현재 Switch.css와 시각 동일. 특히 `translateX(100%)`/`calc()` 패턴이 Spec 데이터로 표현 가능한지 검증 | **H**     | Phase 3a **착수 전** |
| G4-pre-결과 | G4-pre 실패 시: 해당 archetype 커버율 하향 조정 + 수동 CSS 잔존 범위 재평가 → Metrics 테이블 갱신                                                                      | —         | G4-pre 직후          |
| G5          | 등급 A+B 컴포넌트 전환 후 모든 variant × size 조합 스크린샷 비교 통과                                                                                                  | M         | Phase 3c 완료        |

### 잔존 HIGH 위험

- **G4-pre**: toggle-indicator archetype이 가장 불확실한 영역이므로 Phase 3a 착수 전에 독립 POC로 검증. 실패 시 등급 B 커버율과 전체 자동화율 목표를 하향 조정한다.

---

## Implementation

### Phase 의존성 그래프

```
Phase 0-pre (사전조사: SizeSpec↔SIZE_CONFIG 필드 갭 + Spec size 키 전수조사)  [Gate G0-pre]
  ↓
Phase 0a (SizeSpec 타입 확장 + [key: string]: any 제거)  [Gate G0a]
  ↓
Phase 0b (SIZE_CONFIG 제거 + DIMENSIONS 네이밍 정규화 + generate-css.ts 첫 실행)  [Gate G0b, G1]
  ↓
Phase 1 (validate:sync 스크립트 구현 + 안전망)  [Gate G2-pre → G2]
  ↓
Phase 2-pre (generateBaseStyles() Archetype 분기 리팩토링)  [Gate G2a-pre]
  ↓
Phase 2a (Level 1 확장)  ←→  Phase 2b (fillStyle/gradient/icon-only)  [Gate G3]
  ↓
Phase 2c (Tier 1 — Primitive CSS 전환, ~22개)
  ↓
★ G4-pre (toggle-indicator Archetype POC — Phase 3 착수 전 독립 검증)  [Gate G4-pre]
  ↓ (POC 통과 시)
Phase 3a (Tier 2 — Composite CSS 생성, ~17개)  ←→  Phase 3b (@media/@keyframes 공통 생성)
  ↓
Phase 3c (Tier 3 — 수동 CSS 안전망, Table/GridList/Tree)
  ↓
Phase 4 (Spec-First 워크플로우 확립)  [Gate G5]
```

> **분기점 (G4-pre 실패 시)**: toggle-indicator 등 기하학적 관계가 Spec 데이터로 표현 불가능하면, 해당 archetype은 수동 CSS 유지로 전환하고 등급 C 범위를 확대한다. 전체 자동화율 목표를 재평가한다.

### Phase 0-pre: 사전조사 (Gate G0-pre)

Phase 0 착수 전 코드베이스 현황을 정밀하게 파악한다. 이 조사 결과가 Phase 0a/0b의 실제 작업량을 결정한다.

**조사 1: SizeSpec↔SIZE_CONFIG 필드 갭 매핑**

`BUTTON_SIZE_CONFIG` 등 SIZE_CONFIG 객체가 사용하는 전체 필드 목록과 현재 `SizeSpec` 공식 필드의 교집합/차집합을 정밀하게 매핑한다. 특히:

- `paddingLeft`/`paddingRight` (비대칭 패딩) — 현재 SizeSpec에는 `paddingX`(대칭)만 존재
- `iconGap`, `lineHeight`, `fontWeight` — SIZE_CONFIG에 존재하나 SizeSpec 공식 필드에 미등록
- `utils.ts` 3,530줄 파일 내 SIZE_CONFIG → Spec 참조 전환 시 영향받는 함수 목록

**조사 2: 93개 Spec size 키 대소문자 혼재 현황 전수 조사**

현재 Spec 파일들의 `sizes` 키 네이밍이 혼재되어 있다 (`"M"` vs `"md"`, `"XS"` vs `"xs"` 등). Phase 0b의 정규화 작업량과 `generate-css.ts`가 생성할 CSS 선택자(`data-size="M"` vs `data-size="md"`)의 정합성을 사전에 확인한다.

**산출물**: 필드 갭 매핑 테이블 + size 키 정규화 대상 Spec 목록 + Phase 0a/0b 예상 영향 범위

### Phase 0a: SizeSpec 타입 확장 (Gate G0a)

Skia+CSS 공통 속성을 SizeSpec에 추가하고, **기존 `[key: string]: any` 인덱스 시그니처를 완전 제거**한다.

> **현황**: 현재 SizeSpec에 `[key: string]: any` 인덱스 시그니처가 존재하여 임의 필드가 타입 에러 없이 추가 가능하다. 이는 Phase 0-pre 조사에서 밝혀진 모든 필드를 명시적으로 선언한 뒤 제거해야 한다. 제거 시 기존 93개 Spec에서 타입 에러가 발생하는 파일을 사전에 파악하고 순차 수정한다.

```typescript
interface SizeSpec {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: TokenRef;
  borderRadius: TokenRef;
  iconSize?: number;
  gap?: number;
  lineHeight?: TokenRef; // CSS line-height + Skia strutStyle
  fontWeight?: number; // CSS font-weight + Skia TextStyle.fontWeight
  letterSpacing?: number; // CSS letter-spacing + Skia TextStyle.letterSpacing
  borderWidth?: number; // CSS border-width + Skia BorderShape.borderWidth
  minWidth?: number;
  minHeight?: number;
  paddingLeft?: number; // 비대칭 패딩 (SIZE_CONFIG 호환)
  paddingRight?: number; // 비대칭 패딩 (SIZE_CONFIG 호환)
  iconGap?: number; // 아이콘-텍스트 간격 (SIZE_CONFIG 호환)
  // [key: string]: any; ← Phase 0a에서 제거
}
```

원칙: Skia TextShape에도 존재하는 속성만 공통 속성으로 추가. `whiteSpace`, `overflow` 등 Skia 대응물이 없는 속성은 제외. Phase 0-pre 조사에서 발견된 SIZE_CONFIG 전용 필드(`paddingLeft`/`paddingRight`/`iconGap`)도 SizeSpec에 명시적으로 추가하여 `any` 제거 시 타입 안전성을 보장한다.

### Phase 0b: SIZE_CONFIG 제거 (Gate G0b, G1)

- `BUTTON_SIZE_CONFIG` → `ButtonSpec.sizes` import
- `TOGGLEBUTTON_SIZE_CONFIG` → `ToggleButtonSpec.sizes` import
- 기타 SIZE_CONFIG → 해당 Spec의 `sizes` import
- DIMENSIONS 키 정규화: `S/M/L` → `sm/md/lg` 통일 (Phase 0-pre 조사 결과에 따라 93개 Spec 전체 적용)
- `generate-css.ts` 첫 실행 성공 확인 (Gate G0b) — generated/ 디렉토리에 최소 1개 CSS 출력

> **주의**: `utils.ts`는 3,530줄 파일이며 SIZE_CONFIG가 `calculateContentHeight`, `enrichWithIntrinsicSize` 등 레이아웃 계산 함수에 깊이 내장되어 있다. 단순 import 변경이 아니라 함수 시그니처/의존성 변경이 수반될 수 있으므로, Phase 0-pre의 영향 범위 조사를 선행한다.

### Phase 1: validate:sync 안전망 (Gate G2-pre → G2)

수동 CSS 잔존 기간의 안전망. CSS↔Spec 값 불일치를 빌드 타임에 자동 감지.

> **전제조건 (Gate G2-pre)**: `pnpm validate:sync` 스크립트를 먼저 구현하고 `package.json` scripts에 등록한다. 현재 이 스크립트는 존재하지 않으므로 Phase 1의 첫 번째 작업은 스크립트 구현이다.

```bash
$ pnpm validate:sync
Button.css ↔ ButtonSpec
  ✅ sizes.md.height: 30 = --btn-height: 30px
  ✅ variants.accent.background: {color.accent} = --button-color: var(--accent)
Summary: 0 warnings, 0 errors
```

검증 범위: variant 색상, size 물리 속성(height/padding/font/border/gap).

### Phase 2-pre: generateBaseStyles() Archetype 분기 리팩토링 (Gate G2a-pre)

현재 `generateBaseStyles()`가 `display: inline-flex; cursor: pointer; justify-content: center`를 **모든 컴포넌트에 하드코딩**한다. Badge, Separator 등 비-button 컴포넌트에 이 스타일이 적용되면 잘못된 CSS가 생성되므로, Archetype별 base styles 분기를 먼저 구현한다.

- `ComponentSpec.archetype` 필드에 따라 base styles를 분기 (예: `simple` → `display: inline-flex`만, `button` → 현재 전체, `toggle-indicator` → `position: relative` 등)
- 무음 실패 방지: `spec.sizes`에 키가 없을 때 `console.warn` → 에러 throw로 변경

### Phase 2a: CSSGenerator Level 1 확장 (Gate G3)

현재 지원 중: base styles (Phase 2-pre에서 Archetype 분기 완료), variant 색상, size 물리 속성, state 효과, token→CSS 변수 변환.

확장 대상:

| 속성               | 확장 방법                                 |
| ------------------ | ----------------------------------------- |
| `line-height`      | `SizeSpec.lineHeight` → `tokenToCSSVar()` |
| `font-weight`      | `SizeSpec.fontWeight` → 숫자 직접 출력    |
| `letter-spacing`   | `SizeSpec.letterSpacing` → px 출력        |
| `border-width`     | `SizeSpec.borderWidth` → px 출력          |
| `min-width/height` | `SizeSpec.minWidth/minHeight` → px        |
| `icon-size`        | `SizeSpec.iconSize` → CSS 변수 출력       |

### Phase 2b: fillStyle / Gradient / Icon-only 지원

VariantSpec에 `outlineBackground`/`outlineText`/`outlineBorder` 추가 (fillStyle outline 변형).
VariantSpec.background를 `TokenRef | string`으로 확장 (CSS gradient 직접 전달).
SizeSpec에 `iconOnlyPadding` 추가.

### Phase 2c: Tier 1 — Primitive CSS 전환

React Aria Primitive 단위로 CSS를 생성한다. **Composite 내부에서 재사용되는 Primitive가 먼저 전환되어야** Tier 2(Composite) 전환이 가능하다.

전환 패턴 (안전한 롤백):

```
1. generated/Button.css 생성 + 기존 Button.css 유지 (양립)
2. import 경로를 generated/Button.css로 변경
3. 시각 검증 통과 → 기존 Button.css 삭제
4. 실패 시 → import 경로만 되돌리면 즉시 롤백
```

**Tier 1 Primitive 전체 목록 (코드베이스 실측 기반):**

| Primitive          | CSS 파일         |  Spec sizes   | size 키 | Archetype        | Composite에서 재사용                                                                  | 비고                                  |
| ------------------ | ---------------- | :-----------: | ------- | ---------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| **Button**         | Button.css       |       O       | xs–xl   | button           | Select, ComboBox, DatePicker, NumberField, SearchField, Menu, ColorPicker, Disclosure | 가장 많은 Composite가 의존            |
| **ToggleButton**   | ToggleButton.css |       O       | xs–xl   | button           | —                                                                                     |                                       |
| **Input**          | (Composite 내부) |       O       | xs–xl   | input-base       | ComboBox, NumberField, SearchField, ColorField                                        | 독립 CSS 없음 → `.inset` utility 기반 |
| **ListBox/Item**   | ListBox.css      | X (variant만) | —       | collection       | Select, ComboBox, Menu, ColorPicker                                                   | Popup cascade 핵심                    |
| **Popover**        | Popover.css      |       X       | —       | overlay          | Select, ComboBox, DatePicker, Menu, ColorPicker                                       | 모든 드롭다운 공유                    |
| **Calendar/Cell**  | Calendar.css     |       X       | —       | calendar         | DatePicker, DateRangePicker                                                           |                                       |
| **Checkbox**       | Checkbox.css     |       O       | sm–lg   | toggle-indicator | CheckboxGroup, GridList, Table, Tree                                                  | SVG stroke 변환 필요 (G4-pre)         |
| **Radio**          | Radio.css        |       O       | sm–lg   | toggle-indicator | RadioGroup                                                                            |                                       |
| **Switch**         | Switch.css       |       O       | sm–lg   | toggle-indicator | —                                                                                     | translateX 기하학 (G4-pre)            |
| **Tab**            | (Tabs.css 내부)  |       O       | S/M/L   | tabs-indicator   | Tabs                                                                                  | size 키 대문자 → 정규화 대상          |
| **Slider**         | Slider.css       |  O (부모만)   | sm–lg   | slider           | —                                                                                     | Track/Thumb에 sizes 없음              |
| **Badge**          | Badge.css        |       O       | xs–xl   | simple           | —                                                                                     |                                       |
| **Tag**            | (TagGroup 내부)  |       O       | sm–lg   | simple           | TagGroup                                                                              |                                       |
| **Link**           | Link.css         |       O       | xs–xl   | button           | Breadcrumbs                                                                           |                                       |
| **Separator**      | Separator.css    |       O       | S/M/L   | simple           | Menu (구분선)                                                                         | size 키 대문자                        |
| **Skeleton**       | Skeleton.css     |       O       | S/M/L   | simple           | —                                                                                     | size 키 대문자                        |
| **ColorSwatch**    | ColorSwatch.css  |       O       | xs–xl   | simple           | ColorPicker                                                                           |                                       |
| **Icon**           | Icon.css         |       O       | xs–xl   | simple           | —                                                                                     |                                       |
| **ProgressBar**    | ProgressBar.css  |       O       | S/M/L   | progress         | —                                                                                     | size 키 대문자                        |
| **ProgressCircle** | (별도 CSS 없음)  |       O       | S/M/L   | progress         | —                                                                                     | Spec만 존재 → 신규 생성               |
| **Meter**          | Meter.css        |       O       | S/M/L   | progress         | —                                                                                     | size 키 대문자, dual key              |
| **Tooltip**        | Tooltip.css      |       X       | —       | simple           | —                                                                                     | sizes 없음                            |
| **Dialog**         | Dialog.css       |       X       | —       | overlay          | DatePicker                                                                            |                                       |
| **Toast**          | Toast.css        |       X       | —       | overlay          | —                                                                                     | ADR 이전 버전에서 누락                |
| **Breadcrumbs**    | Breadcrumbs.css  | X (variant만) | —       | simple           | —                                                                                     |                                       |
| **Menu/Item**      | Menu.css         |   O (sm–lg)   | sm–lg   | collection       | —                                                                                     | ListBox와 유사하나 별도 스타일        |
| **Disclosure**     | Disclosure.css   |       X       | —       | simple           | DisclosureGroup                                                                       |                                       |

> **Primitive 총 ~25개 CSS** (기존 CSS 있는 것 ~20개 + 신규 생성 필요 ~3개 + Composite 내부 ~2개)

**Archetype별 Primitive 분류:**

| Archetype              | Primitive                                                                            | 생성 방식                                           | 비고                                              |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| **simple** (Level 1만) | Badge, Tag, Separator, Skeleton, ColorSwatch, Icon, Tooltip, Breadcrumbs, Disclosure | variant + size + state → `data-*` 선택자            | 가장 단순, 즉시 전환 가능                         |
| **button**             | Button, ToggleButton, Link                                                           | `.button-base` utility + fillStyle + `--btn-*` 변수 | ADR-018 기반, icon-only 포함                      |
| **input-base**         | Input (TextField, ColorField 등 내부)                                                | `.inset` utility + `--input-*` 변수                 | 독립 CSS 없음, Composite 내부에서 스타일          |
| **toggle-indicator**   | Switch, Checkbox, Radio                                                              | `::before` + Spec shapes 매핑                       | **G4-pre POC 필수**                               |
| **progress**           | ProgressBar, ProgressCircle, Meter                                                   | fill bar + `@keyframes`                             |                                                   |
| **slider**             | Slider (+ Track/Thumb 내부)                                                          | grid 컨테이너 + orientation                         | Track/Thumb에 sizes 없음 → 부모 Slider sizes 위임 |
| **tabs-indicator**     | Tab (+ indicator)                                                                    | orientation × size + SelectionIndicator             |                                                   |
| **collection**         | ListBox/Item, Menu/Item                                                              | variant + state + selection-mode                    | Popup cascade 핵심                                |
| **overlay**            | Popover, Dialog, Toast                                                               | 애니메이션 + placement                              | sizes 없이 variant/state 기반                     |
| **calendar**           | Calendar/Cell                                                                        | grid + date state                                   | sizes 없음, 상태 기반                             |

### G4-pre: toggle-indicator Archetype POC (Phase 3 착수 전 독립 검증)

Phase 3 착수 전에 가장 불확실한 archetype인 toggle-indicator의 실현 가능성을 검증한다.

**검증 항목:**

1. Switch.css의 `translateX(100%)` — thumb 이동 거리가 track 크기에 의존하는 기하학적 관계를 Spec 데이터로 표현 가능한가?
2. `calc(var(--text-4xl) + 4px)` — CSS 토큰 산술식을 Spec 메타데이터에서 생성 가능한가?
3. Checkbox.css의 SVG `stroke` 속성 — Spec `line` shape 데이터를 SVG stroke CSS로 변환하는 로직이 구현 가능한가?

**통과 기준**: Switch CSS를 toggle-indicator 템플릿으로 생성하여 현재 Switch.css와 시각적으로 동일한 결과를 얻는다.

**실패 시 조치**: 해당 archetype은 수동 CSS 유지로 전환. Tier 3을 확대하고 자동화율 목표를 하향 조정한다.

### Phase 3a: Tier 2 — Composite CSS 생성

Composite 컴포넌트의 CSS는 **layout(flex/grid) + CSS Variable Delegation**으로 구성된다. Tier 1 Primitive CSS가 완성된 상태에서, Composite는 자식 Primitive의 CSS 변수를 size별로 override하는 규칙만 생성하면 된다.

**Composite Composition 메타데이터:**

```typescript
interface CompositionSpec {
  // 이 Composite가 조합하는 Primitive 목록
  primitives: PrimitiveRef[];
  // layout 규칙
  layout: "flex-column" | "flex-row" | "grid" | "inline-flex";
  // CSS Variable Delegation — size별 자식 변수 override
  delegation: DelegationSpec[];
  // 애니메이션
  animations?: AnimationSpec[];
}

interface PrimitiveRef {
  selector: string; // '.react-aria-Button', '.react-aria-Input'
  role: string; // 'trigger', 'content', 'clear', 'increment'
  slot?: string; // React Aria slot 이름
}

interface DelegationSpec {
  childSelector: string; // '.react-aria-Button'
  variables: Record<string, Record<string, string>>; // size → { varName → value }
}
```

**Tier 2 Composite 전체 목록 (코드베이스 실측 기반):**

| Composite           | CSS 파일                              | 조합하는 Primitive                                                    | 위임하는 CSS 변수                                                                              | 비고                       |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------- |
| **Select**          | Select.css                            | Button + Popover + ListBox                                            | `--btn-display`, `--btn-justify`, `--btn-padding`, `--btn-font-size`, `--label-*`, `--error-*` | 5개 size × 5+ variant      |
| **ComboBox**        | ComboBox.css                          | Input + Button + Popover + ListBox                                    | `--input-padding`, `--input-font-size`, `--btn-display`, `--btn-radius`, `--label-*`           | `:has()` 상태 감지         |
| **DatePicker**      | DatePicker.css + DatePickerCommon.css | DateInput + Button + Popover + Dialog + Calendar                      | `--dp-input-padding`, `--dp-btn-width`, `--dp-btn-height`                                      | CSS 2파일                  |
| **DateRangePicker** | DateRangePicker.css                   | DateInput(×2) + Button + Popover + RangeCalendar                      | `--drp-group-padding`, `--drp-input-size`, `--drp-btn-width`                                   |                            |
| **NumberField**     | NumberField.css                       | Input + Button(×2)                                                    | `--nf-input-padding`, `--nf-input-size`, `--btn-display`, `--btn-font-size`, `--inset-border`  | slot="increment/decrement" |
| **SearchField**     | SearchField.css                       | Input + Button(clear)                                                 | `--input-padding`, `--input-font-size`, `--btn-radius`, `--inset-*`                            | grid layout                |
| **ColorPicker**     | ColorPicker.css                       | ColorSwatch + Button + Popover + ColorArea + ColorSlider + ColorField | `--cp-*`                                                                                       | 커스텀 class 다수          |
| **ColorField**      | ColorField.css                        | Input                                                                 | `--inset-*`                                                                                    |                            |
| **Tabs**            | Tabs.css                              | TabList + Tab[] + TabPanel + SelectionIndicator                       | `--tab-accent`                                                                                 | orientation 분기           |
| **TagGroup**        | (TagGroup CSS 없음)                   | TagList + Tag[] + Button(remove)                                      | `--tag-color`, `--tag-*`                                                                       | data-tag-variant/size      |
| **RadioGroup**      | RadioGroup.css                        | Radio[]                                                               | (layout만)                                                                                     | 최소 CSS                   |
| **CheckboxGroup**   | CheckboxGroup.css                     | Checkbox[]                                                            | (layout만)                                                                                     | 최소 CSS                   |
| **DisclosureGroup** | DisclosureGroup.css                   | Disclosure[]                                                          | (layout만)                                                                                     |                            |
| **Card**            | Card.css                              | (내부 layout)                                                         | —                                                                                              | CARD_SIZE_CONFIG 의존      |
| **Form**            | Form.css                              | (children)                                                            | —                                                                                              | layout만                   |

> **누락된 Composite** (이전 ADR에서 미분류):
>
> - **DateRangePicker** — DatePicker와 유사, 별도 CSS 존재
> - **ColorField** — Input primitive 조합
> - **RangeCalendar** — RangeCalendar.css 존재

**CSS Variable Delegation 생성 예시:**

```css
/* Tier 2 자동 생성 — SelectSpec.composition.delegation에서 추출 */
.react-aria-Select {
  display: flex;
  flex-direction: column;
  gap: var(--field-gap);
}
.react-aria-Select[data-size="sm"] .react-aria-Button {
  --btn-padding: 4px 8px;
  --btn-font-size: var(--text-xs);
  --btn-line-height: var(--text-xs--line-height);
}
.react-aria-Select[data-size="md"] .react-aria-Button {
  --btn-padding: 8px 12px;
  --btn-font-size: var(--text-sm);
  --btn-line-height: var(--text-sm--line-height);
}
```

### Phase 3b: @media / @keyframes 공통 생성

Tier 1 + Tier 2 모든 생성 CSS에 자동 추가되는 공통 패턴:

- `@media (forced-colors: active)` → `forced-color-adjust: auto` (24개 파일 동일)
- `@media (prefers-reduced-motion)` → `transition-duration: 0s` (transition 있는 컴포넌트)
- `@keyframes` → `ComponentSpec.animations` 필드에서 생성

### Phase 3c: Tier 3 — 수동 CSS + 안전망

**수동 유지 대상 (코드베이스 실측):**

| 컴포넌트     | CSS 파일     | 수동 유지 이유                                                                                       |
| ------------ | ------------ | ---------------------------------------------------------------------------------------------------- |
| **Table**    | Table.css    | 가상 스크롤, `:has()` 인접 행 상태, column resizer, Pagination 내장, Checkbox 통합                   |
| **GridList** | GridList.css | `:has()` 선택자 기반 selection joining, Checkbox 통합, drag handle, DropIndicator                    |
| **Tree**     | Tree.css     | 재귀적 nesting, `--tree-item-level` 기반 indentation, chevron Button + Checkbox + DropIndicator 복합 |

> **Tier 3 근거**: Table/GridList/Tree는 **CSS 선언만으로 표현 불가능한 런타임 동작**(가상 스크롤, 재귀 nesting, `:has()` 인접 상태)을 포함한다. 또한 내부에 Checkbox, Button, DropIndicator 등 다수의 Primitive를 별도 CSS 변수로 통합 스타일링하므로, Delegation 패턴으로 완전히 자동화하기 어렵다.

**Foundation CSS (자동 생성 대상 아님):**

| CSS 파일                         | 역할                                             |
| -------------------------------- | ------------------------------------------------ |
| utilities.css                    | `.button-base`, `.inset`, `.indicator` (ADR-018) |
| base.css                         | 전역 리셋 + 기본 스타일                          |
| foundation.css                   | 디자인 토큰 + 타이포그래피                       |
| animations.css                   | 공통 @keyframes                                  |
| forms.css                        | 폼 공통 스타일                                   |
| collections.css                  | 컬렉션 공통 스타일 (Checkbox, DropIndicator 등)  |
| overlays.css                     | 오버레이 공통 스타일                             |
| index.css                        | import 진입점                                    |
| Slot.css, Content.css, Field.css | 구조적 유틸리티                                  |
| Modal.css                        | 모달 백드롭 (Popover와 별도)                     |
| SortIcon.css                     | Table 부속                                       |

**빌더 전용 CSS (자동 생성 범위 밖):**

ActionList, ChatContainer, ChatInput, ChatMessage, ComponentList, ComponentSearch, EventHandlerManager, EventPalette, EventSection (~9개)

### CSS 파일 분류 총괄

| 분류               | 파일 수 | 자동 생성 | 비고                                         |
| ------------------ | :-----: | :-------: | -------------------------------------------- |
| Tier 1 Primitive   |   ~22   |     O     | Spec → CSS (Level 1 + Level 2 Archetype)     |
| Tier 2 Composite   |   ~17   |     O     | Composition 메타데이터 → layout + delegation |
| Tier 3 수동        |    3    |     X     | Table, GridList, Tree                        |
| Foundation/Utility |   ~12   |     X     | 기반 스타일, 자동 생성 불필요                |
| 빌더 전용          |   ~9    |     X     | 컴포넌트 라이브러리 범위 밖                  |
| **합계**           | **~63** |  **~39**  | 빌더 전용 + 중복 제외한 컴포넌트 CSS 대상    |

> **자동화율 재산정**: 컴포넌트 CSS 대상 ~42개(Tier 1+2+3) 중 자동 생성 ~39개 = **목표 ~93%** (G4-pre 통과 전제). G4-pre 실패 시 toggle-indicator 3개 Tier 3 이동 → ~36/42 = **~86%**.

### Phase 4: Spec-First 워크플로우 확립

1. **Primitive 추가**: Spec 정의 (`variants`/`sizes`/`states`/`shapes`/`archetype`) → `pnpm build:specs` → Tier 1 CSS 자동 생성
2. **Composite 추가**: Composition 메타데이터 (`primitives`/`layout`/`delegation`) → Tier 2 CSS 자동 생성
3. React Aria 컴포넌트에서 자동 생성 CSS import
4. Table/GridList/Tree만 수동 CSS + `validate:sync`
5. CI에서 `validate:sync` 자동 실행 → 불일치 PR 차단

---

## Metrics / Verification

| 메트릭             | Baseline      | Phase 0-pre | Phase 0 | Phase 1       | Phase 2c (Tier 1) | Phase 3a (Tier 2) G4-pre 통과 | Phase 3a (Tier 2) G4-pre 실패 |
| ------------------ | ------------- | ----------- | ------- | ------------- | ----------------- | ----------------------------- | ----------------------------- |
| 수동 동기화 포인트 | ~10 (`@sync`) | ~10         | ~7      | 0 (자동 검증) | 0                 | 0                             | 0                             |
| 수동 SIZE_CONFIG   | 5+            | 5+          | 0       | 0             | 0                 | 0                             | 0                             |
| CSS 자동 생성      | 0             | 0           | 0       | 0             | ~22 (Tier 1)      | ~**39** (Tier 1+2)            | ~**36** (toggle 제외)         |
| 수동 CSS 유지      | ~42 (대상)    | ~42         | ~42     | ~42           | ~20               | ~**3** (Table+GridList+Tree)  | ~**6** (+toggle×3)            |
| 자동화율           | 0%            | 0%          | 0%      | 0%            | ~52%              | **목표 ~93%**                 | **목표 ~86%**                 |

> **산정 기준 변경**: 81개 전체 CSS가 아닌, **컴포넌트 CSS 대상 ~42개**(Tier 1+2+3)를 분모로 사용. Foundation(~12개) + 빌더 전용(~9개)은 자동 생성 대상이 아니므로 제외.
>
> **주의**: Phase 3 자동화율은 G4-pre POC 결과에 따라 분기한다.

검증:

- [ ] `pnpm validate:sync` — CSS↔Spec 값 diff 0 errors
- [ ] `pnpm type-check` — 타입 에러 0건
- [ ] Archetype별: 생성 CSS vs 기존 CSS 시각 비교
- [ ] Button: 5 sizes × 6 variants × 2 fillStyles × 4 states
- [ ] Switch/Checkbox/Radio: 3 sizes × 2 states × emphasized
- [ ] 다크모드 + Tint 전환: 전체 컴포넌트

---

## Consequences

### Positive

1. **3중→1중 동기화**: SIZE_CONFIG 제거 + CSS 자동 생성으로 Spec이 유일한 소스
2. **자동화율 목표 ~93%** (G4-pre 통과 시): 컴포넌트 CSS 대상 ~42개 중 ~39개 자동 생성, Table/GridList/Tree 3개만 수동. G4-pre 실패 시 ~86%로 하향
3. **Primitive-first 아키텍처**: Button CSS 1개 생성 → Select/ComboBox/DatePicker/NumberField/Menu 등 8개 Composite에 cascade. 새 Composite 추가 시 Primitive 재사용으로 CSS 자동 완성
4. **Tier 분리로 복잡도 관리**: Tier 1(Primitive, ~22개) + Tier 2(Composite layout+delegation, ~17개)로 생성 책임을 명확히 분리
5. **기존 인프라 활용**: ADR-018 utility(`.button-base`, `.inset`, `.indicator`) + ADR-033 변수 위임(`--btn-*`, `--input-*`)이 Tier 1/2 자동 생성의 기반
6. **React Aria Composition 정합**: CSS 생성 구조가 React Aria Components의 Primitive composition 원칙과 정확히 일치
7. **Figma→XStudio 파이프라인 강화 (잠재적)**: ADR-038(Proposed) 구현 후 연계 가능

### Negative

1. **Archetype 템플릿 ~10개 + CompositionSpec 타입 시스템 개발 투자** — Tier 2 생성을 위한 Composition 메타데이터 체계 신규 구축
2. **Table/GridList/Tree 수동 CSS 유지** (3개 파일, G4-pre 실패 시 +3개로 확대)
3. **CSSGenerator 이원화**: Tier 1 (Spec→CSS, Level 1+2) + Tier 2 (Composition→CSS, layout+delegation) — 두 가지 생성 경로
4. **빌드 파이프라인 증가**: CSS 생성 + validate:sync 단계 추가
5. **사전조사 + POC 비용**: Phase 0-pre(필드 갭 매핑, size 키 전수조사) + G4-pre(Archetype POC)로 착수 전 투자 필요
6. **SizeSpec `any` 제거 파급**: `[key: string]: any` 제거 시 93개 Spec 전체에서 타입 에러 발생 가능 — 순차 수정 비용

---

## References

- `packages/specs/src/renderers/CSSGenerator.ts` — 기존 CSS 생성기 (POC, Level 1)
- `packages/specs/src/renderers/utils/tokenResolver.ts` — `tokenToCSSVar()` 매핑
- `packages/specs/src/types/spec.types.ts` — SizeSpec, VariantSpec, StateStyles 타입 정의
- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` — SIZE_CONFIG (Phase 0 제거 대상)
- `packages/specs/scripts/generate-css.ts` — CSS 생성 스크립트 (기존)
- `packages/shared/src/components/styles/utilities.css` — `.button-base`, `.inset`, `.indicator` utility (ADR-018)
- [ADR-022](completed/022-s2-color-token.md) — S2 색상 토큰 (tokenToCSSVar 체계)
- [ADR-021](completed/021-theme-system-redesign.md) — Theme System (tint/darkMode 통합)
- [ADR-033](completed/033-css-property-ssot-consolidation.md) — CSS 변수 위임 패턴 (`--input-*`, `--btn-*`, `--label-*`)
- [ADR-038](038-figma-import.md) — Figma 디자인 임포트 (Spec shapes ↔ Figma 레이어 매핑 연계)

---

## 2026-03-14 재검토 요약

### 1차 재검토 변경 사항

1. **핵심 발견 3, 4 추가** — 분해-조립 원칙 + CSS 변수 위임 패턴이 자동 생성을 촉진
2. **Level 3 (CSS Variable Delegation)** — 3-레벨 아키텍처로 확장, `DelegationSpec` 타입 추가
3. **Archetype 테이블에 "분해-조립 근거" 컬럼 추가** — 각 archetype의 자동 생성 가능성 논증
4. **등급 B 커버율 상향** — Slider 70→85%, Tabs 55→80%, Input 85→90% (분해 기반 재평가)
5. **전체 자동화율 95–99% → 90–95%** — Popover positioning/custom animation 반영한 현실적 조정
6. **등급 C(수동)가 Table 1개뿐인 근거 명시** — "복잡한 CSS"는 primitive 조합의 결과이지 단일 primitive가 복잡한 것이 아님

### React Aria Composition 기반 재설계 (2026-03-14)

기존 "등급 A(단순)/B(복잡)/C(수동)" 3단 분류를 **Tier 0(Foundation)/Tier 1(Primitive)/Tier 2(Composite)/Tier 3(Manual)** 4단 분류로 전면 재설계.

**핵심 변경:**

1. **분류 축 전환**: "컴포넌트 복잡도" → "React Aria Composition 역할(Primitive vs Composite)"
2. **Primitive 전체 목록 신설**: 코드베이스 실측 기반 ~25개 Primitive + Archetype 매핑 + Composite 재사용 관계
3. **Composite 전체 목록 신설**: ~17개 Composite + 조합하는 Primitive + 위임하는 CSS 변수 실측
4. **CompositionSpec 타입 신설**: `primitives`/`layout`/`delegation` 메타데이터로 Tier 2 CSS 자동 생성
5. **Tier 3 확대**: Table → Table + GridList + Tree (`:has()` 인접 상태 + 재귀 nesting + 다중 Primitive 통합)
6. **Foundation/빌더 전용 분리**: 자동화율 분모에서 제외하여 정확한 산정 (~42개 대상 중 ~39개 = ~93%)
7. **이전 등급 A에서 5개 CSS 미존재 + 3개 Spec 미존재 컴포넌트 정리**: Tier 1 테이블에서 실제 존재하는 파일만 포함
8. **ADR 미분류 CSS 10+개 포함**: DateRangePicker, ColorField, RangeCalendar, Toast 등 이전 누락분 반영

### 코드베이스 대조 검증 반영 (2026-03-14)

검토에서 발견된 이슈를 반영하여 문서를 보강했다.

**CRITICAL 수정:**

1. **SizeSpec `[key: string]: any` 제거 명시** — Phase 0a의 실제 목표를 "타입 확장"에서 "any 인덱스 시그니처 완전 제거"로 명확화. Gate G0a에 제거 조건 추가
2. **`generateBaseStyles()` 하드코딩 문제** — Phase 2-pre 신설. 비-button 컴포넌트에 `cursor: pointer` 등이 적용되는 문제를 Phase 2a 착수 전에 해결

**HIGH 수정:**

3. **Phase 0-pre (사전조사) 신설** — SizeSpec↔SIZE_CONFIG 필드 갭 매핑 + 93개 Spec size 키 대소문자 전수조사. Phase 0의 실제 작업량을 사전에 결정
4. **G4-pre (Archetype POC) 신설** — toggle-indicator의 `translateX(100%)`/`calc()` 기하학 + Checkbox SVG stroke 매핑을 Phase 3a 착수 전 독립 검증. 실패 시 자동화율 목표를 80–85%로 하향 조정하는 분기점 명시
5. **`generate-css.ts` 첫 실행** — Gate G0b에 추가. 현재 한 번도 실행된 적 없는 스크립트의 동작 확인
6. **`pnpm validate:sync` 구현 선행** — Gate G2-pre 신설. 스크립트 미존재 상태에서 Gate G2를 전제하는 순환 참조 해소
7. **CSS 파일 수 정정** — 88개 → 81개 (실측). Metrics/Consequences의 기준 수치 갱신

**MEDIUM 수정:**

8. **핵심 발견 1 보완** — Checkbox 체크마크가 SVG stroke 기반임을 명시. "`line` shape 2개" 단순화 표현 수정
9. **핵심 발견 3 보완** — 기하학적 관계(`translateX`, `calc()`)의 한계를 명시하고 G4-pre POC 참조 추가
10. **ADR-038 연계 표현 조정** — Proposed 상태를 반영하여 "파이프라인 강화" → "잠재적 강화"로 수정
11. **Metrics 테이블 이중 분기** — G4-pre 통과/실패에 따른 두 가지 시나리오 병기
12. **SIZE_CONFIG 규모 정정** — "~수백 줄" → "3,530줄 파일 내 5+ config 객체" (실측)

### 변경하지 않은 것

- 대안 분석 + Risk Threshold: 유효
- 등급 A 대상 (~20개): 유효
- 핵심 발견 2 (React Aria composition): 유효
- 핵심 발견 4 (CSS 변수 위임): 유효
