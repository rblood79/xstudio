# ADR-022: React Spectrum S2 색상 토큰 체계 전환

## Status

Accepted (2026-03-05) — Phase 1~4 구현 완료

## Context

### 문제 정의

ADR-017(M3 제거 + Tint System)과 ADR-018(CSS 구조 재작성) 완료 후, CSS Preview와 Skia Canvas 간 색상 불일치가 다수 발견됨:

| 컴포넌트                             | 불일치 항목                                                    | 심각도   |
| ------------------------------------ | -------------------------------------------------------------- | -------- |
| Label (TextField/Select/ComboBox 내) | CSS `--field-accent` cascade vs Spec 고정 `{color.on-surface}` | CRITICAL |
| Tabs                                 | 배경 `{color.surface}` vs CSS `transparent`, 선택 텍스트 색상  | HIGH     |
| Badge                                | defaultVariant `primary`(파란) vs CSS 기본 neutral(회색)       | HIGH     |
| Switch                               | 미선택 track 토큰 불일치                                       | MEDIUM   |
| Checkbox                             | 미체크 border 토큰 불일치                                      | MEDIUM   |

**근본 원인**: Spec의 `ColorTokens` 인터페이스가 Material Design 3 네이밍(`primary`, `on-surface`, `error` 등)을 사용하며, CSS 시맨틱 토큰(`--highlight-background`, `--text-color`, `--invalid-color`)과 의미론적으로 불일치.

### 왜 React Spectrum S2인가

1. **XStudio는 React Aria Components 기반** — S2는 동일 기반 위에 구축된 검증된 색상 체계
2. **역할 기반 네이밍** — S2의 `accent`/`neutral`/`negative`가 M3의 `primary`/`secondary`/`error`보다 직관적
3. **레이어 시스템** — `base` > `layer-1` > `layer-2` > `elevated`가 CSS 변수 계층과 자연스럽게 매핑
4. **상태색 확장** — `informative`, `positive`, `notice` 시맨틱 토큰이 현재 누락된 색상 역할을 채움
5. **향후 컴포넌트 Props 전환 기반** — S2의 `fillStyle`, `isEmphasized` 패턴 채택 시 색상 토큰이 이미 준비됨

### Hard Constraints

- CSS 변수명(`--highlight-background`, `--text-color` 등)은 변경하지 않음 (ADR-017/018 완료 직후)
- Tint Color System(`--tint` + oklch 자동 스케일) 보존
- Light/Dark 모드 hex 값 유지 (색상 변경 아닌 이름 변경)
- 기존 Spec 렌더링 결과물이 달라지지 않아야 함 (rename only)

## S2 색상 토큰 시스템 분석

### S2 style() 매크로 색상 토큰

**배경색 (backgroundColor)**:

| 분류   | 토큰                                                                                    | 용도                    |
| ------ | --------------------------------------------------------------------------------------- | ----------------------- |
| 강조   | `accent`, `accent-subtle`                                                               | 주요 강조 배경          |
| 중립   | `neutral`, `neutral-subdued`, `neutral-subtle`                                          | 중립 배경 (어두운→밝은) |
| 상태   | `negative`/`-subtle`, `informative`/`-subtle`, `positive`/`-subtle`, `notice`/`-subtle` | 상태별 배경             |
| 시스템 | `base`, `layer-1`, `layer-2`, `pasteboard`, `elevated`, `disabled`                      | 레이어 배경             |
| 명시색 | `gray`, `red`, `orange`, `blue`, `purple`, `pink` 등 22색 + `-subtle`                   | Badge 등                |

**텍스트색 (color)**: `accent`, `neutral`, `neutral-subdued`, `negative`, `disabled`, `heading`, `title`, `body`, `detail`, `code`

**테두리색 (borderColor)**: `negative`, `disabled`

**포커스 (outlineColor)**: `focus-ring`

### S2 vs 현재 XStudio 매핑

| S2 토큰           | 현재 XStudio CSS 변수                           | 현재 Spec TokenRef (M3)             |
| ----------------- | ----------------------------------------------- | ----------------------------------- |
| `accent`          | `--highlight-background`                        | `{color.primary}`                   |
| `accent-subtle`   | `--highlight-overlay` / tint-300                | `{color.primary-container}`         |
| `neutral`         | `--text-color`                                  | `{color.on-surface}`                |
| `neutral-subdued` | `--text-color-placeholder`                      | `{color.on-surface-variant}`        |
| `neutral-subtle`  | `--color-neutral-200`                           | `{color.surface-container-highest}` |
| `negative`        | `--invalid-color`                               | `{color.error}`                     |
| `negative-subtle` | `--color-error-100`                             | `{color.error-container}`           |
| `informative`     | `--color-info-600`                              | (없음)                              |
| `positive`        | `--color-green-600`                             | (없음)                              |
| `notice`          | `--color-warning-600`                           | (없음)                              |
| `disabled`        | `--color-neutral-200` / `--text-color-disabled` | (없음)                              |
| `base`            | `--background-color`                            | `{color.surface}`                   |
| `layer-1`         | `--overlay-background`                          | `{color.surface-container-high}`    |
| `layer-2`         | `--field-background`                            | `{color.surface-container}`         |
| `elevated`        | `--color-white`                                 | `{color.surface}`                   |
| `focus-ring`      | `--focus-ring-color`                            | (없음)                              |

### 핵심 차이점

1. **네이밍**: S2는 역할 기반(`accent`, `neutral`, `negative`), M3는 순서 기반(`primary`, `secondary`, `tertiary`)
2. **레이어**: S2 `base` > `layer-1` > `layer-2` > `elevated` vs M3 `surface` > `surface-container` > `surface-container-high`
3. **Subtle 패턴**: S2 `-subtle` (연한 배경) vs M3 `-container`
4. **상태색**: S2 `informative`/`positive`/`notice` 시맨틱 vs XStudio `--color-info-*` 팔레트 직접 참조
5. **on-\* 범위**: S2는 `on-accent`/`on-negative`만 명시, 나머지는 CSS에 위임

### ⚠️ 주의사항

1. **`primary`/`secondary`/`tertiary`는 S2에서 컴포넌트별 variant 이름** — 글로벌 색상이 아님
   - S2 Button: `variant: "accent" | "negative" | "primary" | "secondary" | "premium" | "genai"` (스타일 강조도)
   - S2 Card: `variant: "primary" | "secondary" | "tertiary" | "quiet"` (시각적 강조 레벨, 모두 neutral 색상)
   - **매핑 결정**:
     - M3 `{color.secondary}` (#fafafa 회색) → `{color.neutral-subtle}` (17개+ Spec에서 neutral 배경으로 사용)
     - M3 `{color.tertiary}` (#9333ea 보라) → S2에 글로벌 시맨틱 없음. 별도 named color로 유지 필요

2. **`fillStyle` 개념** — S2 Badge `"bold" | "subtle" | "outline"`, Button `"outline" | "fill"`
   - 같은 variant 색상이라도 fill에 따라 표현 변경 → 향후 Props 전환에서 반영

3. **`isEmphasized` boolean** — S2 Checkbox/Switch/Slider에서 accent 강조 토글
   - 색상 토큰에 `accent` + `neutral` 양쪽 포함으로 준비됨

## S2 컴포넌트별 색상 패턴 분석

S2 컴포넌트가 색상을 사용하는 3가지 패턴:

### 패턴 1: `isEmphasized` boolean (accent vs neutral 토글)

| 컴포넌트                | isEmphasized=false | isEmphasized=true |
| ----------------------- | ------------------ | ----------------- |
| Checkbox (checked)      | neutral 배경       | accent 배경       |
| Switch (selected)       | neutral 배경       | accent 배경       |
| Slider (fill/handle)    | neutral 채움       | accent 채움       |
| ToggleButton (selected) | neutral 배경       | accent 배경       |
| TagGroup                | neutral 배경       | accent 배경       |

→ Spec에 `accent` + `neutral-subtle` 양쪽 토큰 필요

### 패턴 2: Semantic `variant` (상태색)

| 컴포넌트    | variant 값                                                                                   | 용도          |
| ----------- | -------------------------------------------------------------------------------------------- | ------------- |
| Meter       | `informative`(기본), `positive`, `notice`, `negative`                                        | 게이지 채움색 |
| InlineAlert | `neutral`(기본), `informative`, `positive`, `notice`, `negative`                             | 알림 배경     |
| StatusLight | `neutral` + `informative`/`positive`/`notice`/`negative` + 15개 named color                  | 상태 표시등   |
| Badge       | `neutral`(기본) + `accent` + `informative`/`positive`/`notice`/`negative` + 22개 named color | 라벨 배경     |

→ `informative`, `positive`, `notice`, `negative` 4개 상태 시맨틱 + `neutral` 필요

### 패턴 3: `fillStyle` (동일 색상의 강도 변환)

| 컴포넌트    | fillStyle 값                             | 효과                                       |
| ----------- | ---------------------------------------- | ------------------------------------------ |
| Badge       | `bold`(기본), `subtle`, `outline`        | 같은 variant 색상을 진하게/연하게/외곽선만 |
| Button      | `fill`(기본), `outline`                  | 같은 variant 색상을 채움/외곽선만          |
| InlineAlert | `border`(기본), `subtleFill`, `boldFill` | 같은 variant 색상의 강도 변환              |

→ 각 시맨틱 색상에 **`-subtle` 변형** 필요 (fillStyle=subtle 용)

### 패턴 4: Button `variant` (스타일 강조도)

| variant     | S2 의미          | 색상              |
| ----------- | ---------------- | ----------------- |
| `accent`    | 가장 강한 CTA    | accent 배경       |
| `negative`  | 파괴적 행동      | negative 배경     |
| `primary`   | 기본 filled 버튼 | neutral 진한 배경 |
| `secondary` | outlined 버튼    | neutral 외곽선    |

→ Button의 `primary`/`secondary`는 **색상이 아닌 스타일 강도** (neutral 계열)

---

## Decision

### Phase 1: ColorTokens 인터페이스 S2 체계 전환

**파일**: `packages/specs/src/types/token.types.ts`

S2 컴포넌트 패턴 분석에 기반한 완전한 토큰 세트:

```typescript
export interface ColorTokens {
  // =============================================
  // S2 Core Semantic Colors
  // =============================================

  // --- Accent (기존 primary) ---
  // S2: Button accent, isEmphasized=true 상태, Badge accent
  accent: string; // --highlight-background
  "accent-hover": string; // color-mix 85%
  "accent-pressed": string; // color-mix 75%
  "on-accent": string; // --highlight-foreground (accent 배경 위 텍스트)
  "accent-subtle": string; // 연한 accent 배경 (fillStyle=subtle, Badge subtle)

  // --- Neutral (기존 on-surface 계열 + secondary) ---
  // S2: 기본 텍스트, isEmphasized=false 상태, Button primary/secondary
  neutral: string; // --text-color (가장 진한 중립색)
  "neutral-subdued": string; // --text-color-placeholder (보조 텍스트)
  "neutral-subtle": string; // --color-neutral-200 (연한 중립 배경)
  "neutral-hover": string; // neutral 배경 hover (color-mix)
  "neutral-pressed": string; // neutral 배경 pressed (color-mix)

  // --- Negative (기존 error) ---
  // S2: Meter negative, InlineAlert negative, Badge negative, Button negative
  negative: string; // --invalid-color
  "negative-hover": string;
  "negative-pressed": string;
  "on-negative": string; // white (negative 배경 위 텍스트)
  "negative-subtle": string; // --color-error-100 (fillStyle=subtle)

  // --- Informative (신규, S2 Meter/InlineAlert/StatusLight) ---
  informative: string; // --color-info-600
  "informative-subtle": string; // --color-info-100

  // --- Positive (신규, S2 Meter/InlineAlert/StatusLight) ---
  positive: string; // --color-green-600
  "positive-subtle": string; // --color-green-100

  // --- Notice (신규, S2 Meter/InlineAlert/StatusLight) ---
  notice: string; // --color-warning-600
  "notice-subtle": string; // --color-warning-100

  // =============================================
  // Surface / Layer System
  // =============================================
  // S2: base > layer-1 > layer-2 > elevated (깊이 순서)
  base: string; // --background-color (앱 배경)
  "layer-1": string; // --overlay-background (오버레이/모달)
  "layer-2": string; // --field-background (입력 필드/카드)
  elevated: string; // --color-white (떠있는 요소)
  disabled: string; // --color-neutral-200 (비활성 배경)

  // =============================================
  // Border
  // =============================================
  border: string; // --border-color (기본 테두리)
  "border-hover": string; // --border-color-hover
  "border-disabled": string; // --border-color-disabled

  // =============================================
  // Special
  // =============================================
  transparent: string;
  white: string;
  black: string;
}
```

**기존 M3 대비 변경 요약** (38 → 33 토큰):

| 제거된 M3 토큰 (12)                                                 | 이유                                             |
| ------------------------------------------------------------------- | ------------------------------------------------ |
| `secondary`, `secondary-hover`, `secondary-pressed`, `on-secondary` | → `neutral-subtle` + hover/pressed 파생으로 통합 |
| `tertiary`, `tertiary-hover`, `tertiary-pressed`, `on-tertiary`     | → Spec variants에서 S2 named color 직접 사용     |
| `secondary-container`, `on-secondary-container`                     | → `neutral-subtle` + `neutral`로 통합            |
| `tertiary-container`, `on-tertiary-container`                       | → S2 named color subtle 변형                     |

| 추가된 S2 토큰 (7)                  | 이유                                       |
| ----------------------------------- | ------------------------------------------ |
| `neutral-hover`, `neutral-pressed`  | S2 isEmphasized=false 상태의 hover/pressed |
| `informative`, `informative-subtle` | S2 Meter/InlineAlert/StatusLight           |
| `positive`, `positive-subtle`       | S2 Meter/InlineAlert/StatusLight           |
| `notice`, `notice-subtle`           | S2 Meter/InlineAlert/StatusLight           |

### Phase 2: colors.ts 값 업데이트

**파일**: `packages/specs/src/primitives/colors.ts`

```typescript
export const lightColors: ColorTokens = {
  // --- Accent (기존 primary) ---
  accent: "#2563eb", // blue-600
  "accent-hover": "#1f54c8",
  "accent-pressed": "#1d4ed8",
  "on-accent": "#ffffff",
  "accent-subtle": "#dbeafe", // blue-100

  // --- Neutral ---
  neutral: "#171717", // neutral-900 (기존 on-surface)
  "neutral-subdued": "#404040", // neutral-700 (기존 on-surface-variant)
  "neutral-subtle": "#e5e5e5", // neutral-200 (기존 surface-container-highest)
  "neutral-hover": "#c3c3c3", // color-mix neutral-subtle 85% black
  "neutral-pressed": "#a8a8a8", // color-mix neutral-subtle 75% black

  // --- Negative ---
  negative: "#ef4444", // error-400
  "negative-hover": "#cb3a3a",
  "negative-pressed": "#b33333",
  "on-negative": "#ffffff",
  "negative-subtle": "#fee2e2", // error-100

  // --- Informative ---
  informative: "#2563eb", // info-600 (= blue-600)
  "informative-subtle": "#dbeafe",
  // --- Positive ---
  positive: "#16a34a", // green-600
  "positive-subtle": "#dcfce7",
  // --- Notice ---
  notice: "#ea580c", // warning-600 (= orange-600)
  "notice-subtle": "#ffedd5",

  // --- Surface / Layer ---
  base: "#ffffff",
  "layer-1": "#fafafa", // neutral-50
  "layer-2": "#fafafa", // neutral-50
  elevated: "#ffffff",
  disabled: "#e5e5e5", // neutral-200

  // --- Border ---
  border: "#d4d4d4", // neutral-300
  "border-hover": "#a3a3a3", // neutral-400
  "border-disabled": "#f5f5f5", // neutral-100

  // --- Special ---
  transparent: "transparent",
  white: "#ffffff",
  black: "#000000",
};
```

### Phase 3: COLOR_TOKEN_TO_CSS 매핑 업데이트

**파일**: `packages/specs/src/renderers/utils/tokenResolver.ts`

```typescript
const COLOR_TOKEN_TO_CSS: Record<string, string> = {
  // --- Accent ---
  accent: "var(--highlight-background)",
  "accent-hover": "color-mix(in srgb, var(--highlight-background) 85%, black)",
  "accent-pressed":
    "color-mix(in srgb, var(--highlight-background) 75%, black)",
  "on-accent": "var(--highlight-foreground)",
  "accent-subtle": "var(--color-primary-100)",

  // --- Neutral ---
  neutral: "var(--text-color)",
  "neutral-subdued": "var(--text-color-placeholder)",
  "neutral-subtle": "var(--color-neutral-200)",
  "neutral-hover": "color-mix(in srgb, var(--color-neutral-200) 85%, black)",
  "neutral-pressed": "color-mix(in srgb, var(--color-neutral-200) 75%, black)",

  // --- Negative ---
  negative: "var(--invalid-color)",
  "negative-hover": "color-mix(in srgb, var(--invalid-color) 85%, black)",
  "negative-pressed": "color-mix(in srgb, var(--invalid-color) 75%, black)",
  "on-negative": "var(--color-white)",
  "negative-subtle": "var(--color-error-100)",

  // --- Informative / Positive / Notice ---
  informative: "var(--color-info-600)",
  "informative-subtle": "var(--color-info-100)",
  positive: "var(--color-green-600)",
  "positive-subtle": "var(--color-green-100)",
  notice: "var(--color-warning-600)",
  "notice-subtle": "var(--color-warning-100)",

  // --- Surface / Layer ---
  base: "var(--background-color)",
  "layer-1": "var(--overlay-background)",
  "layer-2": "var(--field-background)",
  elevated: "var(--color-white)",
  disabled: "var(--color-neutral-200)",

  // --- Border ---
  border: "var(--border-color)",
  "border-hover": "var(--border-color-hover)",
  "border-disabled": "var(--border-color-disabled)",

  // --- Special ---
  transparent: "transparent",
  white: "var(--color-white)",
  black: "var(--color-black)",
};
```

### Phase 4: 모든 Spec 파일 TokenRef 일괄 변환

#### 4A: 1:1 매핑 변환 (자동화 가능)

| 기존 M3 TokenRef                    | 신규 S2 TokenRef           |
| ----------------------------------- | -------------------------- |
| `{color.primary}`                   | `{color.accent}`           |
| `{color.primary-hover}`             | `{color.accent-hover}`     |
| `{color.primary-pressed}`           | `{color.accent-pressed}`   |
| `{color.on-primary}`                | `{color.on-accent}`        |
| `{color.primary-container}`         | `{color.accent-subtle}`    |
| `{color.on-primary-container}`      | `{color.neutral}`          |
| `{color.error}`                     | `{color.negative}`         |
| `{color.error-hover}`               | `{color.negative-hover}`   |
| `{color.error-pressed}`             | `{color.negative-pressed}` |
| `{color.on-error}`                  | `{color.on-negative}`      |
| `{color.error-container}`           | `{color.negative-subtle}`  |
| `{color.on-error-container}`        | `{color.neutral}`          |
| `{color.surface}`                   | `{color.base}`             |
| `{color.surface-container}`         | `{color.layer-2}`          |
| `{color.surface-container-high}`    | `{color.layer-1}`          |
| `{color.surface-container-highest}` | `{color.neutral-subtle}`   |
| `{color.on-surface}`                | `{color.neutral}`          |
| `{color.on-surface-variant}`        | `{color.neutral-subdued}`  |
| `{color.outline}`                   | `{color.border-hover}`     |
| `{color.outline-variant}`           | `{color.border}`           |
| `{color.transparent}`               | `{color.transparent}`      |

#### 4B: Secondary 계열 → S2 패턴 변환 (컴포넌트별 판단 필요)

M3 `secondary` (#fafafa 회색)는 S2에서 **두 가지 패턴**으로 분리:

**패턴 a) `isEmphasized=false` 상태 → `neutral-subtle` 사용**:
Checkbox, Switch, Radio, Slider, SliderThumb, ToggleButton의 selected/active 상태

```
{color.secondary} → {color.neutral-subtle}    (unemphasized selected bg)
{color.secondary} → {color.neutral-hover}     (unemphasized hover)
{color.on-secondary} → {color.white}          (unemphasized selected text)
```

**패턴 b) Button/Badge secondary variant → `neutral-subtle` + `neutral` 조합**:

```
Button secondary bg: {color.secondary} → {color.neutral-subtle}
Button secondary text: {color.on-secondary} → {color.neutral}  (회색 배경 위 어두운 텍스트)
Badge secondary: {color.secondary} → {color.neutral-subtle}
```

**패턴 c) Container 배경 → `neutral-subtle`**:

```
{color.secondary-container} → {color.neutral-subtle}
{color.on-secondary-container} → {color.neutral}
```

#### 4C: Tertiary 계열 → S2 named color 처리

M3 `tertiary` (#9333ea 보라)는 S2에서 named color `purple` 계열로 처리.

**S2에는 글로벌 시맨틱으로 tertiary가 없으므로**, ColorTokens에 포함하지 않고 **Spec에서 hex 직접 참조** 또는 별도 확장:

```typescript
// tokenResolver.ts에 named color fallback 추가
const NAMED_COLOR_TO_CSS: Record<string, string> = {
  purple: "var(--color-purple-600)",
  "purple-hover": "color-mix(in srgb, var(--color-purple-600) 85%, black)",
  "purple-pressed": "color-mix(in srgb, var(--color-purple-600) 75%, black)",
  "purple-subtle": "var(--color-purple-100)",
};
```

Spec 변환:

```
{color.tertiary} → {color.purple}
{color.tertiary-hover} → {color.purple-hover}
{color.tertiary-pressed} → {color.purple-pressed}
{color.on-tertiary} → {color.white}
{color.tertiary-container} → {color.purple-subtle}
{color.on-tertiary-container} → {color.neutral}
```

**대상 파일** (~20개): `packages/specs/src/components/*.spec.ts` 전체

**대상 파일**: `packages/specs/src/components/*.spec.ts` 전체 (~20개)

### Phase 5: CSS ↔ Skia 불일치 패치

새 토큰 체계에서 개별 불일치 수정:

1. **Label variant 상속** — ElementSprite에서 child element 렌더 시 parent variant를 조회하여 override
2. **Tabs 배경** — `{color.base}` → `{color.transparent}` (CSS와 일치)
3. **Badge defaultVariant** — `'accent'` → `'default'` (neutral 배경으로 변경)
4. **Switch/Checkbox** — 새 S2 토큰으로 정확한 매칭

## 영향 범위

| 파일                                                  | 변경 내용                         |
| ----------------------------------------------------- | --------------------------------- |
| `packages/specs/src/types/token.types.ts`             | ColorTokens 인터페이스 전환       |
| `packages/specs/src/primitives/colors.ts`             | lightColors/darkColors 키 변환    |
| `packages/specs/src/renderers/utils/tokenResolver.ts` | COLOR_TOKEN_TO_CSS + resolveToken |
| `packages/specs/src/components/*.spec.ts` (~20개)     | TokenRef S2 이름 변환             |
| `apps/builder/.../ElementSprite.tsx`                  | child variant 상속 메커니즘       |
| `.claude/rules/css-tokens.md`                         | S2 토큰 규칙 업데이트             |

## 검증

1. `pnpm build:specs` 성공
2. `cd apps/builder && pnpm exec tsc --noEmit` 통과
3. 개발 서버에서 **모든 컴포넌트 Skia 색상이 CSS Preview와 일치** 확인
4. Light/Dark 모드 양쪽 확인
5. `resolveToken()` 출력값이 기존과 동일한 hex 반환 확인

## 범위 외 (후속 단계)

- 컴포넌트 Props 변경 (variant → S2 variant/isEmphasized/fillStyle)
- CSS 변수명 자체의 S2 전환 (현재 `--highlight-background` 유지)
- S2 named color palette 전체 도입 (22색 × subtle)
- S2 typography color tokens (heading, title, body)
