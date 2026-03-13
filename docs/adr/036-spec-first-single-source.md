# ADR-036: Spec-First Single Source — 값 동기화 자동화 + 선택적 CSS 생성

## Status

Proposed

## Date

2026-03-13 (updated 2026-03-13)

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-017](completed/017-css-token-architecture.md): CSS 토큰 아키텍처
- [ADR-018](completed/018-css-utility-classes.md): CSS Utility 클래스 체계
- [ADR-021](021-theme-system-redesign.md): Theme System 재설계
- [ADR-022](completed/022-s2-color-token.md): S2 색상 토큰 전환
- [ADR-023](completed/023-s2-variant-props.md): S2 Variant Props
- [ADR-038](038-figma-import.md): Figma 디자인 임포트 시스템

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

Button의 padding을 12px → 16px로 바꾸려면 다음 세 곳을 모두 수정해야 한다.

1. `Button.css` — `--btn-padding` 값 수정
2. `Button.spec.ts` — `sizes.md.paddingX` 수정
3. `utils.ts` — `BUTTON_SIZE_CONFIG.md.paddingLeft` 수정

한 곳이라도 누락되면 Builder(Skia) ↔ Preview(DOM) 시각적 불일치가 발생한다.
현재 10개의 명시적 `@sync` 크로스 참조가 있으며, 나머지는 암묵적 의존 상태다.

### 문제 3. 테마 다양화 비용 급증

- 새 테마/variant 추가 시 CSS + Spec shapes 양쪽 동시 작업 필수
- 93개 Spec × 각 `shapes()` 함수에 variant 추가 = 대규모 수작업
- CSS가 Spec과 완전히 다른 형태(선언적 vs 좌표계)라 자동 검증 불가

### Hard Constraints (CRITICAL)

1. **Skia/WebGL 캔버스 렌더링은 유지해야 한다** — 대규모 편집 성능상 필수불가결 (Figma/Pencil 동일 선택)
2. **Preview/Publish는 실제 DOM + React Aria Components를 사용해야 한다** — 웹 표준 출력 필수
3. **기존 93개 Spec의 `shapes()` 함수는 보존한다** — Skia 렌더링 경로 변경 없음
4. **ComponentSpec 타입 시스템(`variants`/`sizes`/`states`)을 보존한다**
5. **ADR-022 S2 토큰 체계 + ADR-021 Theme System을 보존한다**

### 표현 범위의 근본적 한계

Spec metadata(variants/sizes/states)와 CSS는 **표현 범위가 다르다**. 이 한계는 Figma 디자인 파일도 동일하게 가진다 — Figma도 시각적 스냅샷이지 런타임 동작 명세가 아니기 때문이다.

```
┌───────────────────────────────────────────┐
│  Spec metadata = Figma가 표현할 수 있는 것  │
│  ─────────────────────────────────────    │
│  색상, 사이즈, spacing, border-radius,     │
│  typography, states (hover/pressed/disabled)│
│                                           │
│  → CSSGenerator가 자동 생성할 수 있는 범위   │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  CSS-only 영역 (Spec/Figma 표현 불가)       │
│  ─────────────────────────────────────    │
│  ::before/::after   — DOM pseudo-element  │
│  :focus-within      — 자식 focus 감지     │
│  @keyframes         — 런타임 애니메이션    │
│  @media (forced-colors) — 접근성 모드 감지 │
│  ::placeholder      — 입력 필드 pseudo     │
│  grid-template-areas — CSS Grid 구조      │
│  nested selectors   — CSS cascade 관계    │
│                                           │
│  → 수동 CSS로 유지해야 하는 영역            │
└───────────────────────────────────────────┘
```

이 근본적 한계로 인해 "Spec에서 CSS를 100% 자동 생성"은 원리적으로 불가능하다. 실제 88개 CSS 파일 분석 결과:

| 컴포넌트    | 자동 생성 가능 | 수동 유지 필수 | 커버율 | 수동 유지 사유                                           |
| ----------- | -------------- | -------------- | ------ | -------------------------------------------------------- |
| Badge       | 420줄          | 77줄           | 85%    | `@keyframes`, `white-space`, `@media(forced-colors)`     |
| Link        | 65줄           | 41줄           | 61%    | `text-decoration`, `text-underline-offset`               |
| TextField   | 85줄           | 61줄           | 58%    | `::placeholder`, `:focus-within`, `.inset` 위임          |
| Card        | 75줄           | 145줄          | 34%    | nested `.card-*`, grid layout, `object-fit`              |
| ProgressBar | 60줄           | 41줄           | 59%    | `@keyframes indeterminate`, `will-change`, `overflow`    |
| Tabs        | 100줄          | 211줄          | 32%    | `::before/after`, SelectionIndicator, orientation 조건부 |

**전체 88개 CSS 파일 기준 자동화율: 35–51%**

### 기회 신호

| 파일                                                  | 의미                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/specs/src/renderers/CSSGenerator.ts`        | 이미 존재하는 Spec→CSS 생성기 (276줄) — POC 수준으로 동작          |
| `packages/specs/src/renderers/utils/tokenResolver.ts` | `tokenToCSSVar()` 매핑 완비                                        |
| `apps/builder/.../canvas/skia/specTextStyle.ts`       | Spec에서 직접 font 속성 추출하는 선례                              |
| `apps/builder/.../engines/utils.ts`                   | SIZE_CONFIG 수동 중복 존재 — `specTextStyle.ts` 패턴으로 대체 가능 |

### 현재 CSSGenerator 지원 현황

| 기능                                                     | 상태       | 비고                                           |
| -------------------------------------------------------- | ---------- | ---------------------------------------------- |
| Base styles (display, cursor, transition)                | 지원       | `generateBaseStyles()`                         |
| Variant 색상 (background, color, border)                 | 지원       | `generateVariantStyles()` — hover/pressed 포함 |
| Size 물리 속성 (height, padding, fontSize, borderRadius) | 지원       | `generateSizeStyles()`                         |
| State 효과 (boxShadow, transform, opacity, outline)      | 지원       | `generateStateStyles()`                        |
| Token → CSS 변수 변환                                    | 지원       | `tokenToCSSVar()` 63색상 + 22 Named Color      |
| `gap`                                                    | 부분       | optional 처리, 일부 누락                       |
| `line-height`                                            | **미지원** | SizeSpec에 필드 자체 없음                      |
| `font-weight`                                            | **미지원** | SizeSpec에 필드 없음, TextShape에만 존재       |
| `letter-spacing`                                         | **미지원** | TextShape에만 존재                             |
| `border-width`                                           | **미지원** | 하드코딩(1px) 의존                             |
| `min-width` / `min-height`                               | **미지원** | 일부 컴포넌트 필요                             |
| `fillStyle` (outline 변형)                               | **미지원** | `[data-fill-style]` 셀렉터 미생성              |
| Gradient 배경 (genai)                                    | **미지원** | VariantSpec.background가 TokenRef만 지원       |
| Icon-only 모드                                           | **미지원** | `[data-icon-only]` 셀렉터 미생성               |

---

## Alternatives Considered

### 대안 A: 현행 유지 (CSS-first + 수동 동기화)

- 설명: 큰 구조 변경 없이 `@sync` 주석과 코드 리뷰에 의존하여 현행 유지
- 위험: 기술(L) / 성능(L) / 유지보수(H) / 마이그레이션(L)

장점:

- 변경 없음, 즉각적 안전
- 학습 비용 0

단점:

- 3중 동기화 영구 지속
- 테마 다양화 비용 선형 증가 (새 variant = 3곳 동시 수정)
- 불일치 버그 상존 — 감지도 어려움

### 대안 B: Spec shapes → CSS 역추론 (완전 역방향)

- 설명: `shapes()` 함수의 좌표 데이터를 파싱하여 CSS 선언으로 역변환
- 위험: 기술(H) / 성능(L) / 유지보수(M) / 마이그레이션(H)

장점:

- 이론상 완전한 single source

단점:

- `shapes()`는 정적 좌표 스냅샷 — transition, pseudo-elements, cascade, media queries, grid-template-areas 등을 역추론할 수 없음
- Switch(`::before` thumb), Slider(`grid-template-areas`), Checkbox(stroke-dashoffset 체크마크) 등 복합 컴포넌트 ~30개에서 구조적으로 불가
- 정보 손실 역변환 — 원본 CSS 의도를 shapes에서 복원하는 것은 원리적 한계

### 대안 C: Spec 메타데이터 기반 CSS 전면 자동 생성

- 설명: `shapes()`가 아닌 Spec의 `variants`/`sizes`/`states` 계층에서 모든 CSS를 자동 생성. 복합 컴포넌트는 structural.css(수동) + theme.css(자동) 2-layer 분리
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(M)

장점:

- `CSSGenerator.ts`가 이미 동작 중 (신규 개발이 아닌 확장)
- `specTextStyle.ts` 선례로 타당성 입증
- 대안 B의 역추론 위험 회피

단점:

- **SizeSpec이 CSS DSL로 팽창**: whiteSpace, overflow, textDecoration, textUnderlineOffset 등 CSS-only 속성을 Spec에 계속 추가해야 함 — 복잡성 이동이지 제거가 아님
- **실제 자동화율 35–51%**: 88개 CSS 중 절반 이상은 구조적 CSS로 수동 유지 필수
- **2-layer 분리의 한계**: Card(`.card-type` 변형이 구조+테마 혼합), Tabs(SelectionIndicator 동적 위치)처럼 깔끔한 분리가 불가능한 컴포넌트 존재
- CSS 디버깅 어려움, 빌드 파이프라인 증가

### 대안 D: Design Token 레지스트리 + 외부 코드젠

- 설명: Style Dictionary 등 업계 표준 도구로 토큰 정의 → CSS + Spec 양방향 생성
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(H)

장점:

- 업계 표준 도구 활용
- 독립적인 토큰 거버넌스

단점:

- 추가 빌드 파이프라인 및 외부 도구 의존성
- Spec shapes와의 통합 복잡 (shapes는 Skia 전용 개념)
- 기존 ADR-022 S2 토큰 체계와 이질적
- 마이그레이션 비용이 대안 C보다 큼

### 대안 E: CSS 유지 + 자동 Sync 검증 (신규)

- 설명: CSS를 수동으로 유지하되, 빌드 타임에 CSS 파싱 → Spec 값과 비교 → 불일치 자동 리포트. `@sync` 주석을 코드 기반 검증으로 대체
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)

장점:

- CSS 작성 경험 그대로 유지 (수동 CSS는 읽기/디버깅 자연스러움)
- SizeSpec 팽창 없음 — Spec은 Skia 렌더링에 필요한 속성만 유지
- 마이그레이션 비용 최소 (기존 CSS 무변경)
- CSS-only 패턴(pseudo-elements, @keyframes 등)에 대한 특별 처리 불필요

단점:

- 3중 소스 구조 자체는 유지 — 동기화를 자동 **감지**하지만 자동 **해결**하지 않음
- 능동적 동기화가 아닌 수동적 검증 — 불일치 발견 후 개발자가 수동 수정

### Risk Threshold Check

| 대안    | 기술  | 성능 | 유지보수 | 마이그레이션 | 판정           |
| ------- | ----- | ---- | -------- | ------------ | -------------- |
| A       | L     | L    | **H**    | L            | 장기 부적합    |
| B       | **H** | L    | M        | **H**        | 구조적 한계    |
| C       | M     | L    | L        | M            | SizeSpec DSL화 |
| D       | M     | L    | L        | **H**        | 과잉 의존성    |
| E       | L     | L    | M        | L            | 수동 해결 의존 |
| **C+E** | M     | L    | **L**    | M            | **채택**       |

**C+E 하이브리드가 최적이다:**

1. **Phase 0–1**: SIZE_CONFIG 제거 + 자동 Sync 검증 (E) — 위험 최소, 효과 최대
2. **Phase 2**: 등급 A 단순 컴포넌트만 CSS 자동 생성 (C) — 85%+ 커버 가능한 것만
3. **Phase 3+**: 등급 B/C 컴포넌트는 수동 CSS + Sync 검증 유지 (E) — 무리한 2-layer 분리 회피

---

## Decision

**대안 C+E 하이브리드: SIZE_CONFIG 제거 + 자동 Sync 검증을 기반으로, 고커버율 컴포넌트만 선택적으로 CSS 자동 생성한다.**

핵심 원칙:

- `shapes()`는 Skia 전용 산출물로 유지 — 역추론하지 않는다
- Spec의 `variants`/`sizes`/`states`가 **값의 원천 (Single Source of Values)** 이 된다
- **CSS 자동 생성은 85%+ 커버 가능한 단순 컴포넌트에만 적용** — 무리한 확대 금지
- **나머지 컴포넌트는 수동 CSS 유지 + `validate:sync`로 불일치 자동 감지**
- SizeSpec을 CSS DSL로 키우지 않는다 — Skia 렌더링에 필요한 속성만 유지

### Rationale

> **"100% CSS 자동 생성"은 목표가 아니다.** CSS-only 영역(pseudo-elements, @keyframes, cascade)은 Spec/Figma 표현 범위 밖이며, 이를 Spec에 욱여넣으면 SizeSpec이 CSS DSL로 팽창한다. 진짜 고통은 **값(색상, 사이즈, spacing)의 3중 동기화**이므로, 값 동기화 자동화에 집중한다.

**전략 2축:**

| 축                | 방법                               | 대상                | 효과                                |
| ----------------- | ---------------------------------- | ------------------- | ----------------------------------- |
| **값 동기화**     | SIZE_CONFIG 제거 + `validate:sync` | 전체 88개 컴포넌트  | 3중→2중 동기화, 불일치 자동 감지    |
| **CSS 자동 생성** | CSSGenerator (등급 A만)            | ~15개 단순 컴포넌트 | 2중→1중 동기화 (이 컴포넌트에 한해) |

업계 비교:

| 도구        | 렌더러                   | CSS 출력 | XStudio와의 차이                |
| ----------- | ------------------------ | -------- | ------------------------------- |
| Figma       | Skia 전용                | 없음     | 웹 런타임 불필요                |
| Framer      | React = Canvas = DOM     | 있음     | Skia 미사용                     |
| Webflow     | DOM iframe               | 있음     | 자체 렌더 엔진 없음             |
| **XStudio** | **Skia + DOM 이중 출력** | **필요** | **값 동기화 + 선택적 CSS 생성** |

---

## Gates

| 게이트 | 조건                                                                                    | 위험 등급 |
| ------ | --------------------------------------------------------------------------------------- | --------- |
| G0     | SizeSpec 타입 확장 후 `pnpm type-check` 통과 + 기존 Spec 빌드 정상                      | L         |
| G1     | SIZE_CONFIG 제거 후 Builder에서 Button/ToggleButton 5개 size 시각 비교 동일             | M         |
| G2     | `pnpm validate:sync` — 전체 컴포넌트 CSS↔Spec 값 차이 리포트 0건 (또는 known-diff 등록) | M         |
| G3     | 등급 A 컴포넌트 CSS 자동 생성 전환 후, 모든 variant × size 조합 시각 비교 통과          | M         |

잔존 HIGH 위험: 없음.

---

## Implementation

### Phase 의존성 그래프

```
Phase 0a (SizeSpec 타입 확장)
  ↓
Phase 0b (SIZE_CONFIG 제거 + DIMENSIONS 네이밍 정규화)
  ↓
Phase 1 (자동 Sync 검증 — validate:sync)   ← 전체 88개 CSS 대상
  ↓
Phase 2a (CSSGenerator 확장)  ←→  Phase 2b (fillStyle/gradient/icon-only)
  ↓
Phase 2c (등급 A 컴포넌트 CSS 자동 생성 전환, ~15개)
  ↓
Phase 3 (Spec-First 워크플로우 확립)
```

### Phase 0a: SizeSpec 타입 확장 (선행 필수)

현재 `SizeSpec` 인터페이스에 `lineHeight`, `fontWeight`가 없어 Sync 검증과 CSS 생성 모두에서 비교 대상이 누락된다.

**대상 파일:**

- `packages/specs/src/types/spec.types.ts` — SizeSpec 인터페이스 확장

**타입 변경:**

```typescript
// 확장 (Skia 렌더링에도 필요한 속성만)
interface SizeSpec {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: TokenRef;
  borderRadius: TokenRef;
  iconSize?: number;
  gap?: number;
  lineHeight?: TokenRef; // CSS line-height와 Skia strutStyle 양쪽에 필요
  fontWeight?: number; // CSS font-weight와 Skia TextStyle 양쪽에 필요
  borderWidth?: number; // CSS border-width와 Skia BorderShape 양쪽에 필요
  [key: string]: any;
}
```

**원칙:** `letterSpacing`, `whiteSpace`, `overflow`, `textDecoration` 등 CSS-only 속성은 추가하지 않는다. SizeSpec은 Skia+CSS 공통 속성만 포함한다.

검증:

- [ ] `pnpm type-check` 통과
- [ ] `pnpm build:specs` 정상 빌드
- [ ] 기존 Spec shapes() 동작 무영향 확인

### Phase 0b: SIZE_CONFIG 제거 + DIMENSIONS 네이밍 정규화

기존 `BUTTON_SIZE_CONFIG`, `TOGGLEBUTTON_SIZE_CONFIG` 등을 Spec의 `sizes`에서 직접 import하도록 변경한다. 동시에 DIMENSIONS 키 네이밍을 통일한다.

**SIZE_CONFIG 제거 대상:**

- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`
  - `BUTTON_SIZE_CONFIG` → `ButtonSpec.sizes` import
  - `TOGGLEBUTTON_SIZE_CONFIG` → `ToggleButtonSpec.sizes` import
  - 기타 SIZE_CONFIG → 해당 Spec의 `sizes` import

**DIMENSIONS 네이밍 정규화:**

현재 일부 Spec은 `S/M/L`, 다른 것은 `sm/md/lg/xl`을 사용한다. `[data-size="sm"]` 셀렉터와 일치시키기 위해 통일한다.

| 컴포넌트       | 현재 키                 | 정규화 후 |
| -------------- | ----------------------- | --------- |
| Button         | xs/sm/md/lg/xl          | 유지      |
| Switch         | S/M/L                   | sm/md/lg  |
| ProgressBar    | S/M/L + sm/md/lg (이중) | sm/md/lg  |
| ProgressCircle | sm/md/lg                | 유지      |

검증:

- [ ] `pnpm type-check` 통과
- [ ] Builder에서 Button/ToggleButton 5개 size 시각 비교 (전후 동일)
- [ ] Preview에서 동일 비교
- [ ] `BUTTON_SIZE_CONFIG` grep 결과 0건
- [ ] DIMENSIONS 키가 모두 소문자 (`sm/md/lg`) 통일 확인

### Phase 1: 자동 Sync 검증 (validate:sync)

**이 Phase가 전략의 핵심이다.** CSS를 건드리지 않고, Spec 값과 CSS 값의 불일치를 빌드 타임에 자동 감지한다.

**동작 방식:**

```bash
$ pnpm validate:sync

Button.css ↔ ButtonSpec
  ✅ sizes.md.height: 30 = --btn-height: 30px
  ✅ sizes.md.paddingX: 12 = --btn-padding-x: var(--spacing-md) → 12px
  ✅ sizes.md.fontSize: {typography.text-sm} = --btn-font-size: var(--text-sm)
  ✅ variants.accent.background: {color.accent} = --button-color: var(--accent)
  ⚠️  sizes.md.lineHeight: undefined — Spec에 미정의 (CSS: var(--text-sm--line-height))

Badge.css ↔ BadgeSpec
  ✅ 18/18 variant 색상 일치
  ✅ 5/5 size 수치 일치
  ⚠️  white-space: nowrap — CSS-only (Spec 대응 없음, known-diff 등록)

Summary: 2 warnings, 0 errors
```

**검증 범위 (Spec↔CSS 공통 속성만):**

| 비교 대상       | Spec 소스                    | CSS 소스                          |
| --------------- | ---------------------------- | --------------------------------- |
| 색상 (variant)  | `variants.*.background/text` | `[data-variant] background/color` |
| 사이즈 (height) | `sizes.*.height`             | `[data-size] height`              |
| 패딩            | `sizes.*.paddingX/paddingY`  | `[data-size] padding`             |
| 폰트 크기       | `sizes.*.fontSize`           | `[data-size] font-size`           |
| Border radius   | `sizes.*.borderRadius`       | `[data-size] border-radius`       |
| Gap             | `sizes.*.gap`                | `[data-size] gap`                 |
| Font weight     | `sizes.*.fontWeight`         | `[data-size] font-weight`         |
| Line height     | `sizes.*.lineHeight`         | `[data-size] line-height`         |

**비교하지 않는 것 (CSS-only 속성):**

`::before/after`, `:focus-within`, `@keyframes`, `@media`, `::placeholder`, `grid-template-areas`, `white-space`, `overflow`, `text-decoration`, nested selectors — 이들은 `known-diff.json`에 등록하여 warning 해제.

**대상 파일:**

- `packages/specs/scripts/validate-sync.ts` — Sync 검증 스크립트 신규
- `packages/specs/known-diff.json` — CSS-only 속성 예외 등록
- `packages/specs/package.json` — `validate:sync` 스크립트 추가

검증:

- [ ] `pnpm validate:sync` 실행 → 전체 컴포넌트 리포트 출력
- [ ] 기존 `@sync` 주석 기반 수동 검증과 동일한 불일치 감지 확인
- [ ] 의도적 CSS-only 속성은 `known-diff.json`으로 false positive 제거

### Phase 2a: CSSGenerator 확장

등급 A 컴포넌트 CSS 자동 생성을 위해 CSSGenerator를 확장한다.

**확장 대상 속성:**

| 속성           | 현재 상태       | 확장 방법                                 |
| -------------- | --------------- | ----------------------------------------- |
| `gap`          | optional 처리됨 | 항상 출력                                 |
| `line-height`  | 미지원          | `SizeSpec.lineHeight` → `tokenToCSSVar()` |
| `font-weight`  | 미지원          | `SizeSpec.fontWeight` → 숫자 직접 출력    |
| `border-width` | 미지원          | `SizeSpec.borderWidth` → px 출력          |
| `icon-size`    | 미지원          | `SizeSpec.iconSize` → CSS 변수 출력       |

**대상 파일:**

- `packages/specs/src/renderers/CSSGenerator.ts` — `generateSizeStyles()` 확장

### Phase 2b: fillStyle / Gradient / Icon-only 지원

등급 A 중 fillStyle/gradient를 사용하는 컴포넌트(Badge 등)를 위한 추가 패턴.

**1. fillStyle (outline 변형):**

```typescript
interface VariantSpec {
  // ... 기존
  outlineBackground?: TokenRef; // outline 모드 배경 (보통 {color.transparent})
  outlineText?: TokenRef; // outline 모드 텍스트 색상
  outlineBorder?: TokenRef; // outline 모드 테두리 색상
}
```

**2. Gradient 배경 (genai variant):**

```typescript
interface VariantSpec {
  background: TokenRef | string; // string으로 CSS gradient 직접 전달 허용
  // ...
}
```

**3. Icon-only 모드:**

```typescript
interface SizeSpec {
  // ...
  iconOnlyPadding?: number; // icon-only 모드 padding (미지정 시 paddingY 사용)
}
```

### Phase 2c: 등급 A 컴포넌트 CSS 자동 생성 전환

Spec만으로 85%+ CSS 생성 가능한 단순 컴포넌트만 전환한다. **무리한 확대 금지.**

**등급 A 대상 (~15개):**

Badge, Separator, StatusLight, Tooltip, Skeleton, Meter, IllustratedMessage, InlineAlert, ContextualHelp, ColorSwatch, Avatar, Divider

**등급 A 선정 기준:**

- pseudo-element 미사용
- `:focus-within`, nested selector 미사용
- `@keyframes` 미사용 (또는 states로 커버 가능)
- variant + size + state만으로 CSS 85%+ 커버 가능

**전환하지 않는 컴포넌트 (등급 B/C — 수동 CSS + validate:sync 유지):**

| 등급  | 대상                                                                                   | 이유                                                      |
| ----- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **B** | Button, ToggleButton, Link, TextField, Card, Panel, ProgressBar, Tab, Tag, Breadcrumbs | CSS-only 패턴(text-decoration, ::placeholder, @keyframes) |
| **C** | Switch, Checkbox, Radio, Slider, Calendar, Table, DatePicker, ColorPicker              | pseudo-elements, grid-template, complex cascade           |

**전환 패턴 (안전한 롤백):**

```
1. generated/Badge.css 생성 + 기존 Badge.css 유지 (양립)
2. import 경로를 generated/Badge.css로 변경
3. 시각 검증 통과 + validate:sync PASS → 기존 Badge.css 삭제
4. 실패 시 → import 경로만 되돌리면 즉시 롤백
```

**잔여 CSS-only 속성 처리:**

등급 A 컴포넌트에도 소량의 CSS-only 속성이 있을 수 있다 (예: Badge `white-space: nowrap`). 이는 `generated/Badge.supplement.css`에 수동 작성하여 자동 생성 CSS와 함께 import한다.

```css
/* Badge.supplement.css — 수동 유지, CSSGenerator 범위 밖 */
.react-aria-Badge { white-space: nowrap; }
@keyframes badge-pulse { ... }
@media (forced-colors: active) { ... }
```

검증:

- [ ] 각 컴포넌트 교체 후 Preview DOM 렌더링 시각 비교
- [ ] 모든 variant × size × fillStyle 조합 스크린샷 비교
- [ ] 다크모드 + Tint 변경 후 비교
- [ ] `pnpm validate:sync` 리포트 0 errors

### Phase 3: Spec-First 워크플로우 확립 (장기)

Phase 0–2 완료 후, 새 컴포넌트는 Spec-first로 설계한다.

**워크플로우:**

1. Spec 정의 (`variants`/`sizes`/`states`/`shapes`) 작성
2. 컴포넌트 복잡도 판단:
   - **등급 A (단순)**: `pnpm build:specs` → CSS 자동 생성 + supplement.css 수동 추가
   - **등급 B/C (복합)**: CSS 수동 작성 + `pnpm validate:sync`로 값 정합 확인
3. React Aria 컴포넌트에서 CSS import
4. `validate:sync`가 CI에서 자동 실행 → 불일치 PR 차단

**문서화:**

- SKILL.md에 Spec-First 워크플로우 + 등급 판단 기준 추가
- 새 컴포넌트 체크리스트 업데이트

---

## Execution Guardrails

1. **Phase별 1커밋 원칙** — 각 Phase 완료 후 `type-check` + 시각 검증 후 커밋
2. **시각 비교 필수** — CSS 교체 전후 Builder(Skia) + Preview(DOM) 스크린샷 비교
3. **SizeSpec 팽창 금지** — CSS-only 속성(whiteSpace, overflow, textDecoration 등)을 SizeSpec에 추가하지 않는다. supplement.css로 처리
4. **등급 A만 자동 생성** — 커버율 85% 미만 컴포넌트는 무리하게 전환하지 않는다
5. **validate:sync 우선** — CSS 자동 생성보다 Sync 검증이 전체 컴포넌트에 대한 안전망

---

## Metrics / Verification

### 정량 메트릭

| 메트릭             | 단위 | Baseline (현재) | Phase 0 후 | Phase 1 후          | Phase 2 후     |
| ------------------ | ---- | --------------- | ---------- | ------------------- | -------------- |
| 수동 동기화 포인트 | 개   | ~10 (`@sync`)   | ~7         | 0 (자동 검증 대체)  | 0              |
| 수동 SIZE_CONFIG   | 개   | 5+              | 0          | 0                   | 0              |
| 불일치 감지 방식   | -    | 수동 (@sync)    | 수동       | **자동** (validate) | 자동           |
| CSS 자동 생성      | 개   | 0               | 0          | 0                   | ~15 (등급 A만) |
| 불일치 버그 위험   | 등급 | H               | M          | **L** (자동 감지)   | L              |

### 자동 검증

- [ ] `pnpm validate:sync` — 전체 88개 CSS↔Spec 값 diff, 0 errors
- [ ] `pnpm type-check` — 타입 에러 0건
- [ ] 등급 A 전환 컴포넌트: `pnpm validate:sync` + 시각 비교

### 수동 검증 체크리스트

- [ ] Button: 5 sizes × 6 variants × 2 fillStyles × 4 states = 240 조합 시각 비교
- [ ] Badge: 22 variants × 2 fill styles = 44 조합
- [ ] Switch/Checkbox/Radio: 2 states × 3 sizes = 6 조합 구조 유지 확인
- [ ] 다크모드: 전체 컴포넌트 light/dark 전환 검증
- [ ] Tint 변경: 10 tint preset × 대표 컴포넌트 5개 = 50 조합

---

## Consequences

### Positive

1. **3중→2중 동기화**: SIZE_CONFIG 제거로 즉시 효과
2. **불일치 자동 감지**: `validate:sync`로 `@sync` 주석 의존 제거 — 전체 88개 컴포넌트 커버
3. **등급 A 2중→1중 동기화**: ~15개 단순 컴포넌트는 Spec 변경만으로 CSS 자동 갱신
4. **SizeSpec 팽창 방지**: CSS-only 속성을 Spec에 넣지 않으므로 타입 시스템 건강 유지
5. **점진적 확장 가능**: 향후 CSSGenerator가 성숙하면 등급 B 일부도 전환 가능

### Negative

1. **등급 B/C 컴포넌트 수동 CSS 유지**: ~70개 컴포넌트는 여전히 수동 CSS — 하지만 `validate:sync`로 불일치 감지
2. **supplement.css 관리**: 등급 A 컴포넌트의 CSS-only 속성을 별도 파일로 관리하는 오버헤드
3. **CSSGenerator 확장 투자**: Phase 2a-b에서 gap, lineHeight, fontWeight, fillStyle 등 확장 필요
4. **빌드 파이프라인 증가**: `validate:sync` + CSS 생성 단계 추가

---

## References

- `packages/specs/src/renderers/CSSGenerator.ts` — 기존 CSS 생성기 (POC)
- `packages/specs/src/renderers/utils/tokenResolver.ts` — `tokenToCSSVar()` 매핑
- `packages/specs/src/types/spec.types.ts` — SizeSpec, VariantSpec, StateStyles 타입 정의
- `apps/builder/src/builder/workspace/canvas/skia/specTextStyle.ts` — Spec 직접 읽기 선례
- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` — SIZE_CONFIG (Phase 0 제거 대상)
- `packages/shared/src/components/styles/Button.css` — 수동 CSS 대표 예시
- `packages/specs/src/components/Button.spec.ts` — Spec 정의 대표 예시
- `packages/specs/scripts/generate-css.ts` — CSS 생성 스크립트 (기존)
- [ADR-022](completed/022-s2-color-token.md) — S2 색상 토큰 (tokenToCSSVar 체계)
- [ADR-021](021-theme-system-redesign.md) — Theme System (tint/darkMode 통합)
