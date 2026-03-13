# ADR-036: Spec-First Single Source — Spec shapes 기반 CSS 자동 생성

## Status

Proposed

## Date

2026-03-13

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-017](completed/017-css-token-architecture.md): CSS 토큰 아키텍처
- [ADR-018](completed/018-css-utility-classes.md): CSS Utility 클래스 체계
- [ADR-021](021-theme-system-redesign.md): Theme System 재설계
- [ADR-022](completed/022-s2-color-token.md): S2 색상 토큰 전환
- [ADR-023](completed/023-s2-variant-props.md): S2 Variant Props
- [ADR-038](038-figma-import.md): Figma 디자인 임포트 시스템
- [ADR-041](041-spec-driven-property-editor.md): Spec 기반 프로퍼티 에디터 자동 생성

---

## Context

XStudio는 Skia/WebGL 캔버스 (빌더) + DOM (Preview/Publish) 이중 렌더링 아키텍처를 사용한다.
현재 컴포넌트 시각 정의가 3곳에 분산되어 있어 **3중 동기화 고통**이 존재한다.

### 문제 1. 스타일 정의 3중 분산

| 파일 그룹                                     | 역할                                       | 규모                 |
| --------------------------------------------- | ------------------------------------------ | -------------------- |
| `packages/shared/src/components/styles/*.css` | React Aria 컴포넌트용 CSS                  | 88개 파일, ~13,742줄 |
| `packages/specs/src/components/*.spec.ts`     | Skia 렌더링용 Spec shapes                  | 93개 파일, ~19,350줄 |
| `apps/builder/.../engines/utils.ts`           | `BUTTON_SIZE_CONFIG` 등 레이아웃 엔진 숫자 | ~수백 줄             |

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
- 장점: 기존 CSSGenerator 확장, Archetype 수 유한(~10개), 자동화율 95–99%
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

**Spec 메타데이터(variants/sizes/states) + Component Archetype 템플릿으로 CSS를 자동 생성한다. Table만 수동 CSS + validate:sync 안전망으로 보완한다.**

핵심 원칙:

- `shapes()`를 범용적으로 역추론하지 않는다 — 유한한 Archetype 템플릿이 shapes()의 데이터를 CSS 구조에 매핑
- SizeSpec은 Skia+CSS **공통** 속성을 포함한다 (letterSpacing 등 Skia TextShape에도 존재하는 속성)
- compositional 유형(Card, Calendar, DatePicker)은 하위 Spec 분해로 각각 자동 생성
- **React Aria primitive composition 활용**: ListBox + Popover CSS 생성 → Select, ComboBox, Menu 등 전체 팝업에 cascade
- `@media` 접근성 패턴은 모든 컴포넌트에 자동 생성 (24개 파일 동일 패턴)

### Rationale

> **핵심 발견 1**: "CSS-only"로 분류했던 pseudo-element 패턴 대부분이 이미 Spec shapes()에 데이터가 존재한다. Switch thumb = `circle` shape, Checkbox 체크마크 = `line` shape 2개, Radio dot = `circle` shape. CSS `::before`는 렌더링 메커니즘이지 데이터가 아니다.

> **핵심 발견 2**: React Aria의 composition 패턴으로 CSS 생성 대상이 극적으로 줄어든다. 모든 팝업 콘텐츠가 ListBox primitive를 공유하므로, **ListBox 1개 CSS → Select, ComboBox, Menu 등 전체 cascade**.

**React Aria Composition:**

```
Popover (컨테이너 — 배경/테두리/그림자/애니메이션)
  └── ListBox (콘텐츠 primitive — 아이템 스타일/선택 상태)
        ├── Select     → Popover + ListBox
        ├── ComboBox   → Popover + ListBox
        ├── Menu       → Popover + ListBox (MenuItem ≈ ListBoxItem)
        └── ColorPicker → Popover + ListBox
```

**2-레벨 CSS 생성 아키텍처:**

```
┌─────────────────────────────────────────────────────┐
│  Level 1: Generic CSS (현재 CSSGenerator 확장)       │
│  variant 색상, size 값, state 효과                    │
│  → 모든 컴포넌트 공통, data-* 선택자 기반             │
└─────────────────────────────────────────────────────┘
                        +
┌─────────────────────────────────────────────────────┐
│  Level 2: Archetype 템플릿 (~10개)                   │
│  toggle-indicator: ::before { width, height, fill }  │
│  progress: .fill { width: var(--progress) }          │
│  input: ::placeholder { color }, :focus-within       │
│  slider: grid-template + track + thumb               │
│  tabs: ::before indicator + orientation              │
│  @media: forced-colors, prefers-reduced-motion       │
│  @keyframes: animations 필드 기반 생성               │
└─────────────────────────────────────────────────────┘
                        +
┌─────────────────────────────────────────────────────┐
│  수동 CSS + validate:sync 안전망                     │
│  Table ~1개만 수동 유지                              │
└─────────────────────────────────────────────────────┘
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

| 게이트 | 조건                                                                                  | 위험 등급 |
| ------ | ------------------------------------------------------------------------------------- | --------- |
| G0     | SizeSpec 타입 확장 후 `pnpm type-check` 통과 + 기존 Spec 빌드 정상                    | L         |
| G1     | SIZE_CONFIG 제거 후 Builder에서 Button/ToggleButton 5개 size 시각 비교 동일           | M         |
| G2     | `pnpm validate:sync` — 전체 컴포넌트 CSS↔Spec 값 차이 리포트 0건                      | M         |
| G3     | Level 1: `generateCSS(ButtonSpec)` 출력과 현재 `Button.css` diff — 공통 속성 누락 0건 | M         |
| G4     | Level 2: toggle-indicator 템플릿으로 Switch CSS 생성 → 현재 Switch.css와 시각 동일    | M         |
| G5     | 등급 A+B 컴포넌트 전환 후 모든 variant × size 조합 스크린샷 비교 통과                 | M         |

잔존 HIGH 위험: 없음.

---

## Implementation

### Phase 의존성 그래프

```
Phase 0a (SizeSpec 타입 확장)
  ↓
Phase 0b (SIZE_CONFIG 제거 + DIMENSIONS 네이밍 정규화)
  ↓
Phase 1 (validate:sync 안전망)
  ↓
Phase 2a (Level 1 확장)  ←→  Phase 2b (fillStyle/gradient/icon-only)
  ↓
Phase 2c (등급 A CSS 전환, ~20개)
  ↓
Phase 3a (Archetype 템플릿)  ←→  Phase 3b (@media/@keyframes 공통 생성)
  ↓
Phase 3c (등급 B CSS 전환, ~40개)
  ↓
Phase 4 (Spec-First 워크플로우 확립)
```

### Phase 0a: SizeSpec 타입 확장

Skia+CSS 공통 속성을 SizeSpec에 추가한다.

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
  [key: string]: any;
}
```

원칙: Skia TextShape에도 존재하는 속성만 공통 속성으로 추가. `whiteSpace`, `overflow` 등 Skia 대응물이 없는 속성은 제외.

### Phase 0b: SIZE_CONFIG 제거

- `BUTTON_SIZE_CONFIG` → `ButtonSpec.sizes` import
- `TOGGLEBUTTON_SIZE_CONFIG` → `ToggleButtonSpec.sizes` import
- 기타 SIZE_CONFIG → 해당 Spec의 `sizes` import
- DIMENSIONS 키 정규화: `S/M/L` → `sm/md/lg` 통일

### Phase 1: validate:sync 안전망

수동 CSS 잔존 기간의 안전망. CSS↔Spec 값 불일치를 빌드 타임에 자동 감지.

```bash
$ pnpm validate:sync
Button.css ↔ ButtonSpec
  ✅ sizes.md.height: 30 = --btn-height: 30px
  ✅ variants.accent.background: {color.accent} = --button-color: var(--accent)
Summary: 0 warnings, 0 errors
```

검증 범위: variant 색상, size 물리 속성(height/padding/font/border/gap).

### Phase 2a: CSSGenerator Level 1 확장

현재 지원 중: base styles, variant 색상, size 물리 속성, state 효과, token→CSS 변수 변환.

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

### Phase 2c: 등급 A 컴포넌트 CSS 전환 (~20개)

Level 1만으로 85%+ 커버 가능한 단순 컴포넌트.

대상: Badge, Separator, StatusLight, Tooltip, Skeleton, Meter, IllustratedMessage, InlineAlert, ContextualHelp, ColorSwatch, Avatar, Divider, Button, ToggleButton, Link, LinkButton, Tag, Chip

전환 패턴 (안전한 롤백):

```
1. generated/Badge.css 생성 + 기존 Badge.css 유지 (양립)
2. import 경로를 generated/Badge.css로 변경
3. 시각 검증 통과 → 기존 Badge.css 삭제
4. 실패 시 → import 경로만 되돌리면 즉시 롤백
```

### Phase 3a: Component Archetype 템플릿

Level 2 — 컴포넌트 유형별 CSS 구조 패턴 자동 생성.

**Component Archetype 분류:**

| Archetype            | 대상 컴포넌트                                 | CSS 구조 패턴                      |
| -------------------- | --------------------------------------------- | ---------------------------------- |
| **simple**           | Badge, Separator, StatusLight, Avatar         | Level 1만 (variant + size)         |
| **button**           | Button, ToggleButton, Link, LinkButton        | fillStyle + icon-only              |
| **toggle-indicator** | Switch, Checkbox, Radio                       | `::before` indicator               |
| **progress**         | ProgressBar, Meter, ProgressCircle            | fill bar + `@keyframes`            |
| **input**            | TextField, NumberField, SearchField, TextArea | `::placeholder` + `:focus-within`  |
| **slider**           | Slider, SliderTrack, SliderThumb              | grid + track + thumb               |
| **tabs**             | Tabs, Tab, TabList                            | `::before` indicator + orientation |
| **compositional**    | Card, Calendar, DatePicker                    | 하위 Spec 분해 + Level 1           |
| **popup-primitive**  | ListBox, Popover                              | **1개 생성 → N개 cascade**         |
| **composite**        | Table                                         | **수동 유지**                      |

Archetype 등록:

```typescript
interface ComponentSpec<Props> {
  // ... 기존
  archetype?: ComponentArchetype;
  animations?: AnimationSpec[]; // @keyframes 정의
}

interface AnimationSpec {
  name: string; // 'badge-pulse', 'indeterminate'
  keyframes: string; // CSS @keyframes 본문
  trigger: string; // '[data-pulsing]', '[data-indeterminate]'
}
```

### Phase 3b: @media / @keyframes 공통 생성

모든 컴포넌트에 자동 추가되는 공통 패턴:

- `@media (forced-colors: active)` → `forced-color-adjust: auto` (24개 파일 동일)
- `@media (prefers-reduced-motion)` → `transition-duration: 0s` (transition 있는 컴포넌트)
- `@keyframes` → `ComponentSpec.animations` 필드에서 생성

### Phase 3c: 등급 B 컴포넌트 CSS 전환 (~40개)

**Archetype별:**

| Archetype        | 컴포넌트                                      | 예상 커버율 |
| ---------------- | --------------------------------------------- | ----------- |
| toggle-indicator | Switch, Checkbox, Radio                       | 85–90%      |
| progress         | ProgressBar, ProgressCircle, Meter            | 85%         |
| input            | TextField, NumberField, SearchField, TextArea | 85%         |
| slider           | Slider, SliderTrack, SliderThumb              | 70%         |
| tabs             | Tabs, Tab, TabList, TabPanel                  | 55%         |

**Compositional (하위 Spec 분해):**

| 컴포넌트   | 방법                                                | 예상 커버율 |
| ---------- | --------------------------------------------------- | ----------- |
| Card       | CardPreview/CardFooter 각각 Level 1 생성            | 85%         |
| Calendar   | CalendarHeader/CalendarGrid Spec에 전체 데이터 완비 | 95%         |
| DatePicker | DateField + Calendar compositional 조합             | 80%         |

**Popup-primitive (React Aria cascade):**

| 컴포넌트    | 적용 범위                                         | 예상 커버율 |
| ----------- | ------------------------------------------------- | ----------- |
| **ListBox** | **Select, ComboBox, Menu, ColorPicker에 cascade** | 85%         |
| **Popover** | **모든 팝업 컨텍스트에 적용**                     | 90%         |

**수동 유지 (등급 C):**

| 컴포넌트 | 이유                                                            |
| -------- | --------------------------------------------------------------- |
| Table    | 가상 스크롤, `:has()` 인접 행 상태, resizer, 동적 색상 override |

### Phase 4: Spec-First 워크플로우 확립

1. Spec 정의 (`variants`/`sizes`/`states`/`shapes`/`archetype`) 작성
2. `pnpm build:specs` → CSS 자동 생성 (Level 1 + Level 2)
3. React Aria 컴포넌트에서 자동 생성 CSS import
4. Table만 수동 CSS + `validate:sync`
5. CI에서 `validate:sync` 자동 실행 → 불일치 PR 차단

---

## Metrics / Verification

| 메트릭             | Baseline      | Phase 0 | Phase 1       | Phase 2      | Phase 3          |
| ------------------ | ------------- | ------- | ------------- | ------------ | ---------------- |
| 수동 동기화 포인트 | ~10 (`@sync`) | ~7      | 0 (자동 검증) | 0            | 0                |
| 수동 SIZE_CONFIG   | 5+            | 0       | 0             | 0            | 0                |
| CSS 자동 생성      | 0             | 0       | 0             | ~20 (등급 A) | ~**87** (A+B+B+) |
| 수동 CSS 유지      | 88            | 88      | 88            | ~68          | ~**1** (Table)   |
| 자동화율           | 0%            | 0%      | 0%            | ~23%         | **~95–99%**      |

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
2. **자동화율 95–99%**: 88개 CSS 중 ~87개 자동 생성
3. **업계 최초 단일 솔루션 완성**: 고성능 캔버스 편집 + 프로덕션 웹 퍼블리싱의 동기화 비용 제거
4. **Archetype 재사용**: 새 컴포넌트 추가 시 CSS 자동 생성
5. **Figma→XStudio 파이프라인 강화**: Figma 레이어 → Spec shapes → CSS 자동 생성 (ADR-038 연계)

### Negative

1. **Archetype 템플릿 ~10개 개발 투자**
2. **Table 수동 CSS 유지** (가상 스크롤 + 동적 제어)
3. **CSSGenerator 복잡도 증가**: Level 1 + Level 2 + @media/@keyframes
4. **빌드 파이프라인 증가**: CSS 생성 + validate:sync 단계 추가

---

## References

- `packages/specs/src/renderers/CSSGenerator.ts` — 기존 CSS 생성기 (POC, Level 1)
- `packages/specs/src/renderers/utils/tokenResolver.ts` — `tokenToCSSVar()` 매핑
- `packages/specs/src/types/spec.types.ts` — SizeSpec, VariantSpec, StateStyles 타입 정의
- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` — SIZE_CONFIG (Phase 0 제거 대상)
- `packages/specs/scripts/generate-css.ts` — CSS 생성 스크립트 (기존)
- [ADR-022](completed/022-s2-color-token.md) — S2 색상 토큰 (tokenToCSSVar 체계)
- [ADR-021](021-theme-system-redesign.md) — Theme System (tint/darkMode 통합)
- [ADR-038](038-figma-import.md) — Figma 디자인 임포트 (Spec shapes ↔ Figma 레이어 매핑 연계)
