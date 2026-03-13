# ADR-036: Spec-First Single Source — Spec shapes 기반 CSS 자동 생성

## Status

Proposed

## Date

2026-03-13 (updated 2026-03-13, 업계 리서치 + Calendar/Card 재분류)

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

### 업계 분석: 단일 솔루션의 부재

동종업계 도구들은 **고성능 캔버스 편집**과 **프로덕션 웹 퍼블리싱** 중 하나를 선택하며, 둘을 하나의 솔루션으로 제공하는 제품은 존재하지 않는다.

| 도구            | 렌더러               | 편집 성능 | 퍼블리싱                     | 한계                      |
| --------------- | -------------------- | --------- | ---------------------------- | ------------------------- |
| **Figma**       | Skia/WebGPU (WASM)   | 최고      | **없음** — CSS 근사치만 제공 | 개발자가 별도 구현 필요   |
| **Webflow**     | DOM 직접 편집        | DOM 한계  | DOM 그대로 배포              | 대규모 편집 성능 천장     |
| **Framer**      | React DOM            | DOM 한계  | React SSR 배포               | 대규모 편집 성능 천장     |
| **Penpot**      | SVG 기반 (DOM)       | 중간      | HTML/CSS export              | 복잡한 컴포넌트 출력 한계 |
| **Plasmic**     | React DOM            | DOM 한계  | 코드젠 (TSX+CSS)             | 에디터 성능 제한          |
| **UXPin Merge** | 코드→디자인 (역방향) | DOM 한계  | 코드가 원본                  | 디자인 자유도 제한        |

**Figma 방향** = 성능은 최고지만 결과물을 개발자가 처음부터 다시 구현해야 한다.
**Webflow/Framer 방향** = 바로 퍼블리싱되지만 DOM 기반이라 편집 성능에 천장이 있다.

XStudio는 이 둘을 합쳤다 — **Skia/WebGL 캔버스의 고성능 편집 + DOM/React Aria의 프로덕션 웹 퍼블리싱**을 단일 워크플로우로 제공한다. 이 아키텍처의 대가가 바로 **Spec(Skia용) ↔ CSS(DOM용) 이중 유지 비용**이며, ADR-036은 이 비용을 자동화로 제거하여 **업계 최초의 "고성능 캔버스 편집 + 프로덕션 퍼블리싱" 단일 솔루션**을 완성하는 핵심 인프라다.

#### 업계 참고 패턴

| 참고 사례                | 패턴                                               | XStudio 적용                                   |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| **Mitosis (Builder.io)** | JSX → JSON IR → 멀티 프레임워크 컴파일             | **ComponentSpec = IR 역할**, CSS 출력기만 확장 |
| **React Spectrum S2**    | 토큰 JSON → Parcel 매크로 → Atomic CSS (빌드 타임) | `resolveToken()` → `tokenToCSSVar()` 동일 구조 |
| **Style Dictionary**     | JSON 토큰 → Transform → Format → CSS/iOS/Android   | Transform 체인 파이프라인 참고                 |
| **Plasmic**              | 에디터 디자인 → 코드젠 (TSX+CSS)                   | 프레젠테이션/행위 파일 분리 참고               |

Mitosis가 LLVM의 IR처럼 중간 표현에서 멀티 타겟을 컴파일하는 것과 동일하게, XStudio의 ComponentSpec이 Skia shapes와 CSS 양쪽의 단일 소스 역할을 한다. 차이점은 XStudio가 **shapes()까지 포함한 구조화된 컴포넌트 메타데이터**를 보유한다는 것이다 — Figma가 "임의 벡터 → CSS" 변환을 포기한 이유는 입력이 비구조적이었기 때문이지만, XStudio의 Spec은 `variants`/`sizes`/`states`/`shapes()` 타입 시스템으로 **이미 구조화**되어 있다.

### Hard Constraints (CRITICAL)

1. **Skia/WebGL 캔버스 렌더링은 유지해야 한다** — 대규모 편집 성능상 필수불가결 (Figma/Pencil 동일 선택)
2. **Preview/Publish는 실제 DOM + React Aria Components를 사용해야 한다** — 웹 표준 출력 필수
3. **기존 93개 Spec의 `shapes()` 함수는 보존한다** — Skia 렌더링 경로 변경 없음
4. **ComponentSpec 타입 시스템(`variants`/`sizes`/`states`)을 보존한다**
5. **ADR-022 S2 토큰 체계 + ADR-021 Theme System을 보존한다**

### Spec shapes()에 이미 존재하는 시각 정보

"CSS-only"로 보이는 pseudo-element 패턴을 재검토한 결과, **대부분의 시각 정보가 이미 Spec shapes()에 구현되어 있다**. Figma도 동일하게 이 정보를 정적 레이어로 표현한다 — DOM pseudo-element는 렌더링 **메커니즘**의 차이이지 **데이터**의 부재가 아니다.

| CSS 패턴                  | Spec shapes() 대응                              | 데이터 존재 | CSS 생성 방법                      |
| ------------------------- | ----------------------------------------------- | ----------- | ---------------------------------- |
| Switch `::before` (thumb) | `circle` shape — 크기/위치/색상 완전 정의       | **있음**    | shapes → `::before` 템플릿 매핑    |
| Checkbox 체크마크         | `line` shape 2개 — 좌표 기반 ∕∖ 렌더링          | **있음**    | shapes → SVG stroke 스타일 매핑    |
| Radio `::before` (dot)    | `circle` shape — inner dot 완전 정의            | **있음**    | shapes → `::before` 템플릿 매핑    |
| Slider track/thumb        | `roundRect` + `circle` — 3개 sub-spec 분리 정의 | **있음**    | shapes → track/thumb 템플릿 매핑   |
| TextField `::placeholder` | `text` shape — placeholder 색상/폰트 정의       | **있음**    | shapes → `::placeholder` 색상 매핑 |
| ProgressBar fill          | `roundRect` shape — 채우기 바 정의              | **있음**    | shapes → fill div 스타일 매핑      |

**진짜 CSS-only (Spec에 데이터 없음):**

| CSS 패턴                          | 이유                                  | 처리 방법                                              |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `@keyframes` 애니메이션           | 런타임 동적 동작 — Spec은 정적 스냅샷 | ComponentSpec.animations 필드 추가 또는 supplement.css |
| `@media (forced-colors)`          | 환경 감지 — 24개 파일에서 동일 패턴   | **자동 템플릿** (모든 컴포넌트에 동일 코드 생성)       |
| `@media (prefers-reduced-motion)` | 환경 감지                             | **자동 템플릿**                                        |
| `:focus-within`                   | 자식 focus 감지                       | StateSpec 확장 또는 컴포넌트 타입별 템플릿             |

### 자동화 범위 재평가 (최대 자동화 관점)

CSSGenerator를 **2-레벨 아키텍처**로 확장하면 자동화율을 대폭 높일 수 있다:

```
Level 1: Generic CSS 생성 (현재 CSSGenerator)
  → variant 색상, size 값, state 효과 — 모든 컴포넌트 공통

Level 2: Component Archetype 템플릿 (확장)
  → 컴포넌트 유형별 CSS 구조 패턴 자동 생성
  → Spec shapes()의 shape 타입/구조를 분석하여 CSS 매핑
```

**Component Archetype 분류:**

| Archetype            | 대상 컴포넌트                                 | CSS 구조 패턴                      | shapes() 매핑                          |
| -------------------- | --------------------------------------------- | ---------------------------------- | -------------------------------------- |
| **simple**           | Badge, Separator, StatusLight, Avatar         | variant + size만                   | Generic Level 1                        |
| **button**           | Button, ToggleButton, Link, LinkButton        | fillStyle + icon-only              | Level 1 + fillStyle 템플릿             |
| **toggle-indicator** | Switch, Checkbox, Radio                       | `::before` indicator               | shapes circle/line → `::before`        |
| **progress**         | ProgressBar, Meter, ProgressCircle            | fill bar + animation               | shapes roundRect → fill + `@keyframes` |
| **slider**           | Slider, SliderTrack, SliderThumb              | track + thumb + grid               | shapes → grid + `::before` + thumb     |
| **input**            | TextField, NumberField, SearchField, TextArea | `::placeholder` + `:focus-within`  | shapes text → `::placeholder` 색상     |
| **tabs**             | Tabs, Tab, TabList                            | `::before` indicator + orientation | shapes → indicator 템플릿              |
| **compositional**    | Card, Calendar, DatePicker                    | 하위 Spec 분해 + Level 1           | 각 child Spec에서 독립 CSS 생성        |
| **popup-primitive**  | ListBox, Popover → Select, ComboBox, Menu 등  | **1개 생성 → N개 cascade**         | ListBox/Popover 생성 → 전체 팝업 적용  |
| **composite**        | Table                                         | 가상 스크롤 + `:has()` 인접 상태   | **수동 유지** (런타임 동적 제어)       |

**재평가된 자동화율:**

| 컴포넌트    | 이전 커버율 | Level 2 적용 후 | 변화 요인                                              |
| ----------- | ----------- | --------------- | ------------------------------------------------------ |
| Badge       | 85%         | **95%**         | white-space → SizeSpec, @keyframes → animations        |
| Link        | 61%         | **90%**         | text-decoration → SizeSpec 확장                        |
| TextField   | 58%         | **85%**         | ::placeholder → input 템플릿, :focus-within → state    |
| Switch      | (등급 C)    | **90%**         | ::before thumb → toggle-indicator 템플릿               |
| Checkbox    | (등급 C)    | **85%**         | SVG checkmark → toggle-indicator 템플릿                |
| Radio       | (등급 C)    | **90%**         | ::before dot → toggle-indicator 템플릿                 |
| ProgressBar | 59%         | **85%**         | fill → progress 템플릿, @keyframes → animations        |
| Slider      | (등급 C)    | **70%**         | track/thumb → slider 템플릿, grid 구조는 복잡          |
| Card        | 34%         | **85%**         | Compositional 분해 — 하위 Spec 각각 Level 1 생성       |
| Calendar    | (등급 C)    | **95%**         | Spec shapes()에 전체 데이터 완비, CSS는 중복 제거 대상 |
| Tabs        | 32%         | **55%**         | indicator → tabs 템플릿, SelectionIndicator JS 복잡    |

**전체 자동화율: 35–51% → 95–99%**

### 기회 신호

| 파일                                                  | 의미                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/specs/src/renderers/CSSGenerator.ts`        | 이미 존재하는 Spec→CSS 생성기 (276줄) — POC 수준으로 동작           |
| `packages/specs/src/renderers/utils/tokenResolver.ts` | `tokenToCSSVar()` 매핑 완비                                         |
| `apps/builder/.../canvas/skia/specTextStyle.ts`       | Spec에서 직접 font 속성 추출하는 선례                               |
| `apps/builder/.../engines/utils.ts`                   | SIZE_CONFIG 수동 중복 존재 — `specTextStyle.ts` 패턴으로 대체 가능  |
| Spec shapes() 분석                                    | Switch/Checkbox/Radio/Slider/ProgressBar 모두 시각 데이터 완전 보유 |

### 현재 CSSGenerator 지원 현황

| 기능                                                     | 상태       | Phase | 비고                                                |
| -------------------------------------------------------- | ---------- | ----- | --------------------------------------------------- |
| Base styles (display, cursor, transition)                | 지원       | -     | `generateBaseStyles()`                              |
| Variant 색상 (background, color, border)                 | 지원       | -     | `generateVariantStyles()` — hover/pressed 포함      |
| Size 물리 속성 (height, padding, fontSize, borderRadius) | 지원       | -     | `generateSizeStyles()`                              |
| State 효과 (boxShadow, transform, opacity, outline)      | 지원       | -     | `generateStateStyles()`                             |
| Token → CSS 변수 변환                                    | 지원       | -     | `tokenToCSSVar()` 63색상 + 22 Named Color           |
| `gap`                                                    | 부분       | 2a    | optional → 항상 출력                                |
| `line-height`                                            | 미구현     | 2a    | SizeSpec 필드 추가 후 구현                          |
| `font-weight`                                            | 미구현     | 2a    | SizeSpec 필드 추가 후 구현                          |
| `letter-spacing`                                         | 미구현     | 2a    | SizeSpec 필드 추가 후 구현                          |
| `border-width`                                           | 미구현     | 2a    | SizeSpec 필드 추가 후 구현                          |
| `min-width` / `min-height`                               | 미구현     | 2a    | SizeSpec 필드 추가 후 구현                          |
| `fillStyle` (outline 변형)                               | 미구현     | 2b    | VariantSpec 확장 후 구현                            |
| Gradient 배경 (genai)                                    | 미구현     | 2b    | background union 확장 후 구현                       |
| Icon-only 모드                                           | 미구현     | 2b    | SizeSpec 필드 추가 후 구현                          |
| **Component Archetype 템플릿**                           | **미구현** | **3** | **toggle-indicator, progress, input, slider, tabs** |
| **`@media` 자동 템플릿**                                 | **미구현** | **3** | **forced-colors, prefers-reduced-motion 공통 생성** |
| **`@keyframes` 생성**                                    | **미구현** | **3** | **ComponentSpec.animations 필드 추가 후 구현**      |

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

- 설명: `shapes()` 함수의 좌표 데이터를 **범용적으로** 파싱하여 CSS 선언으로 역변환
- 위험: 기술(H) / 성능(L) / 유지보수(M) / 마이그레이션(H)

장점:

- 이론상 완전한 single source

단점:

- 범용 역추론은 정보 손실 — shapes 좌표에서 CSS 의도(transition, cascade, media query)를 복원하는 것은 원리적 한계
- shapes() 출력이 컴포넌트마다 완전히 다른 구조 — 범용 파서가 모든 케이스를 커버하기 어려움

### 대안 C: Spec 메타데이터 + Archetype 템플릿 기반 CSS 생성 (채택)

- 설명: `variants`/`sizes`/`states`에서 공통 CSS 생성(Level 1) + 컴포넌트 유형별 Archetype 템플릿으로 pseudo-element/animation 등 구조적 CSS 생성(Level 2). shapes()를 직접 역추론하지 않되, shapes()의 **데이터**(크기, 색상, 위치)를 **Archetype 템플릿이 알고 있는 구조**에 매핑한다.
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(M)

장점:

- `CSSGenerator.ts`가 이미 Level 1 동작 중 (신규 개발이 아닌 확장)
- Archetype 수가 유한(~8개) — 무한 범용 파서 불필요
- Switch/Checkbox/Radio/Slider/ProgressBar의 시각 데이터가 이미 Spec shapes()에 완전 보유 — 데이터 부재가 아닌 매핑 로직만 추가
- `@media (forced-colors)` 같은 공통 패턴은 모든 컴포넌트에 동일 코드 자동 생성
- 자동화율 95–99% 달성 (이전 추정 35–51% 대비 대폭 개선)

단점:

- Archetype 템플릿 개발 투자 (~8개 유형 + compositional 분해)
- Table(가상 스크롤 + `:has()` 인접 상태)만 수동 CSS 유지
- 빌드 파이프라인 증가

### 대안 D: Design Token 레지스트리 + 외부 코드젠

- 설명: Style Dictionary 등 업계 표준 도구로 토큰 정의 → CSS + Spec 양방향 생성
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(H)

단점: 외부 도구 의존성, Spec shapes 통합 복잡, ADR-022 체계와 이질적

### 대안 E: CSS 유지 + 자동 Sync 검증

- 설명: CSS 수동 유지, 빌드 타임에 CSS↔Spec 값 비교 자동 리포트
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)

장점: 마이그레이션 비용 최소, CSS 디버깅 자연스러움
단점: 3중 소스 구조 유지, 능동적 동기화 아닌 수동적 검증

### Risk Threshold Check

| 대안  | 기술  | 성능 | 유지보수 | 마이그레이션 | 판정                 |
| ----- | ----- | ---- | -------- | ------------ | -------------------- |
| A     | L     | L    | **H**    | L            | 장기 부적합          |
| B     | **H** | L    | M        | **H**        | 범용 역추론 한계     |
| **C** | M     | L    | **L**    | M            | **채택 (주력)**      |
| D     | M     | L    | L        | **H**        | 과잉 의존성          |
| E     | L     | L    | M        | L            | 보조 안전망으로 활용 |

**대안 C(주력) + E(안전망):**

- C: Spec 메타데이터 + Archetype 템플릿으로 CSS 자동 생성 (95–99% 커버)
- E: 나머지 수동 CSS에 대한 `validate:sync` 자동 검증 (안전망)

---

## Decision

**대안 C: Spec 메타데이터(variants/sizes/states) + Component Archetype 템플릿으로 CSS를 최대한 자동 생성한다. 자동화 불가 영역은 수동 CSS + validate:sync 안전망으로 보완한다.**

핵심 원칙:

- `shapes()`를 범용적으로 역추론하지 않는다 (대안 B 기각)
- 대신 **유한한 Archetype 템플릿**이 shapes()의 데이터를 CSS 구조에 매핑한다
- SizeSpec은 Skia+CSS **공통** 속성을 포함한다 (letterSpacing, textDecoration 등도 Skia TextShape에 존재하므로 공통 속성)
- `@media` 접근성 패턴은 **모든 컴포넌트에 자동 생성** (24개 파일 동일 패턴)
- compositional 유형(Card, Calendar, DatePicker)은 하위 Spec 분해로 자동 생성 — 업계 표준 패턴 (React Spectrum, Radix)
- **React Aria primitive composition 활용**: ListBox + Popover CSS를 자동 생성하면 Select, ComboBox, Menu 등 모든 팝업 컨텍스트에 cascade 적용 (1개 생성 → N개 컴포넌트)
- composite 유형(Table)만 수동 CSS 유지 — `validate:sync`로 값 정합 보장

### Rationale

> **핵심 발견 1: "CSS-only"로 분류했던 패턴 대부분이 이미 Spec shapes()에 데이터가 존재한다.** Switch thumb은 Spec에서 `circle` shape, Checkbox 체크마크는 `line` shape 2개, Radio dot은 `circle` shape으로 정의되어 있다. CSS `::before`는 렌더링 메커니즘이지 데이터가 아니다. 이는 Figma에서 컴포넌트 디자인을 받아 컨버팅할 때와 동일한 관계다 — Figma 레이어의 시각 데이터를 CSS 구조로 매핑하는 것처럼, Spec shapes를 CSS 구조로 매핑할 수 있다.

> **핵심 발견 2: React Aria Components의 composition 패턴으로 CSS 생성 대상이 극적으로 줄어든다.** React Aria는 팝업 컨텍스트의 콘텐츠를 모두 ListBox primitive로 통일한다. 따라서 **ListBox 하나의 CSS를 자동 생성하면 Select, ComboBox, Menu 등 모든 팝업 메뉴의 아이템 스타일이 일괄 적용**된다.

**React Aria Composition 구조:**

```
Popover (컨테이너 — 배경/테두리/그림자/애니메이션)
  └── ListBox (콘텐츠 primitive — 아이템 레이아웃/선택 상태/variant/size)
        ├── Select     → Popover + ListBox
        ├── ComboBox   → Popover + ListBox
        ├── Menu       → Popover + ListBox (MenuItem ≈ ListBoxItem)
        └── ColorPicker → Popover + ListBox
```

**CSS 생성 관점의 의미:**

| 자동 생성 대상                | 적용 범위                                         | 효과                                   |
| ----------------------------- | ------------------------------------------------- | -------------------------------------- |
| `ListBox.css` (아이템 스타일) | Select, ComboBox, Menu, ColorPicker의 모든 아이템 | **1개 생성 → 4개+ 컴포넌트에 cascade** |
| `Popover.css` (컨테이너)      | 모든 팝업 컨텍스트의 배경/테두리/애니메이션       | **1개 생성 → 전체 팝업에 적용**        |

88개 CSS 파일이 독립적으로 보이지만, 실제로는 React Aria의 primitive composition 덕분에 **핵심 primitives 몇 개만 자동 생성하면 대부분의 컴포넌트 스타일이 커버**된다. 이는 자동화율 95–99%를 가능하게 하는 구조적 근거다.

**2-레벨 CSS 생성 아키텍처:**

```
┌─────────────────────────────────────────────────────┐
│  Level 1: Generic CSS (현재 CSSGenerator)            │
│  ─────────────────────────────────────────          │
│  variant 색상, size 값, state 효과                    │
│  → 모든 컴포넌트 공통, data-* 선택자 기반             │
│  → 현재 동작 중                                      │
└─────────────────────────────────────────────────────┘
                        +
┌─────────────────────────────────────────────────────┐
│  Level 2: Archetype 템플릿 (확장)                    │
│  ─────────────────────────────────────────          │
│  toggle-indicator: ::before { width, height, fill }  │
│  progress: .fill { width: var(--progress) }          │
│  input: ::placeholder { color }, :focus-within       │
│  slider: grid-template + ::before track + thumb      │
│  tabs: ::before indicator + orientation              │
│  @media: forced-colors, prefers-reduced-motion       │
│  @keyframes: animations 필드 기반 생성               │
│                                                     │
│  → Spec shapes()의 데이터를 CSS 구조에 매핑           │
│  → 유한한 Archetype 수 (~8개)                        │
└─────────────────────────────────────────────────────┘
                        +
┌─────────────────────────────────────────────────────┐
│  수동 CSS (validate:sync 안전망)                     │
│  ─────────────────────────────────────────          │
│  Table: 가상 스크롤 + :has() 인접 상태 + resizer     │
│                                                     │
│  → Table ~1개만 수동 유지                            │
│  → validate:sync로 값 불일치 자동 감지               │
└─────────────────────────────────────────────────────┘
```

**전략 3축:**

| 축                   | 방법                   | 대상           | 효과             |
| -------------------- | ---------------------- | -------------- | ---------------- |
| **SIZE_CONFIG 제거** | Spec.sizes 직접 import | 전체 컴포넌트  | 3중→2중 동기화   |
| **CSS 자동 생성**    | Level 1 + Level 2      | ~87개 컴포넌트 | 2중→1중 동기화   |
| **값 검증 안전망**   | `validate:sync`        | ~1개 (Table)   | 불일치 자동 감지 |

업계 비교 — 단일 솔루션의 부재:

| 도구        | 렌더러                   | 편집 성능 | 퍼블리싱     | CSS 출력 | 단일 솔루션 |
| ----------- | ------------------------ | --------- | ------------ | -------- | ----------- |
| Figma       | Skia/WebGPU              | 최고      | **없음**     | 근사치   | **아님**    |
| Framer      | React DOM                | DOM 한계  | React SSR    | 있음     | 성능 제한   |
| Webflow     | DOM 직접                 | DOM 한계  | DOM 배포     | 있음     | 성능 제한   |
| Plasmic     | React DOM                | DOM 한계  | 코드젠       | 있음     | 성능 제한   |
| Penpot      | SVG (DOM)                | 중간      | HTML/CSS     | 있음     | 성능 제한   |
| **XStudio** | **Skia + DOM 이중 출력** | **최고**  | **DOM 배포** | **필요** | **유일**    |

> **XStudio는 고성능 캔버스 편집 + 프로덕션 웹 퍼블리싱을 단일 워크플로우로 제공하는 업계 유일의 도구**이며, ADR-036은 이 아키텍처의 핵심 비용(Spec↔CSS 이중 유지)을 자동화로 제거하는 인프라다.

---

## Gates

| 게이트 | 조건                                                                                    | 위험 등급 |
| ------ | --------------------------------------------------------------------------------------- | --------- |
| G0     | SizeSpec 타입 확장 후 `pnpm type-check` 통과 + 기존 Spec 빌드 정상                      | L         |
| G1     | SIZE_CONFIG 제거 후 Builder에서 Button/ToggleButton 5개 size 시각 비교 동일             | M         |
| G2     | `pnpm validate:sync` — 전체 컴포넌트 CSS↔Spec 값 차이 리포트 0건 (또는 known-diff 등록) | M         |
| G3     | Level 1: `generateCSS(ButtonSpec)` 출력과 현재 `Button.css` diff — 공통 속성 누락 0건   | M         |
| G4     | Level 2: toggle-indicator 템플릿으로 Switch CSS 생성 → 현재 Switch.css와 시각 동일      | M         |
| G5     | 등급 A+B 컴포넌트 전환 후 모든 variant × size 조합 스크린샷 비교 통과                   | M         |

잔존 HIGH 위험: 없음.

---

## Implementation

### Phase 의존성 그래프

```
Phase 0a (SizeSpec 타입 확장)
  ↓
Phase 0b (SIZE_CONFIG 제거 + DIMENSIONS 네이밍 정규화)
  ↓
Phase 1 (자동 Sync 검증 — validate:sync)           ← 안전망, 전체 88개 CSS 대상
  ↓
Phase 2a (CSSGenerator Level 1 확장)  ←→  Phase 2b (fillStyle/gradient/icon-only)
  ↓
Phase 2c (등급 A 컴포넌트 CSS 전환, ~20개)          ← Level 1만으로 충분한 단순 컴포넌트
  ↓
Phase 3a (Archetype 템플릿 개발)  ←→  Phase 3b (@media/@keyframes 공통 생성)
  ↓
Phase 3c (등급 B 컴포넌트 CSS 전환, ~40개)          ← Level 1 + Level 2
  ↓
Phase 4 (Spec-First 워크플로우 확립)
```

### Phase 0a: SizeSpec 타입 확장 (선행 필수)

Skia+CSS 공통 속성을 SizeSpec에 추가한다.

**타입 변경:**

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

**원칙:** `letterSpacing`은 Skia TextShape에도 존재하므로 공통 속성이다. `whiteSpace`, `overflow` 등 Skia에 대응물이 없는 속성만 제외.

검증:

- [ ] `pnpm type-check` 통과
- [ ] `pnpm build:specs` 정상 빌드
- [ ] 기존 Spec shapes() 동작 무영향 확인

### Phase 0b: SIZE_CONFIG 제거 + DIMENSIONS 네이밍 정규화

기존 SIZE_CONFIG를 Spec의 `sizes`에서 직접 import, DIMENSIONS 키 통일.

**SIZE_CONFIG 제거 대상:**

- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`
  - `BUTTON_SIZE_CONFIG` → `ButtonSpec.sizes` import
  - `TOGGLEBUTTON_SIZE_CONFIG` → `ToggleButtonSpec.sizes` import
  - 기타 SIZE_CONFIG → 해당 Spec의 `sizes` import

**DIMENSIONS 네이밍 정규화:**

| 컴포넌트       | 현재 키                 | 정규화 후 |
| -------------- | ----------------------- | --------- |
| Button         | xs/sm/md/lg/xl          | 유지      |
| Switch         | S/M/L                   | sm/md/lg  |
| ProgressBar    | S/M/L + sm/md/lg (이중) | sm/md/lg  |
| ProgressCircle | sm/md/lg                | 유지      |

검증:

- [ ] `pnpm type-check` 통과
- [ ] Builder에서 Button/ToggleButton 5개 size 시각 비교 (전후 동일)
- [ ] `BUTTON_SIZE_CONFIG` grep 결과 0건
- [ ] DIMENSIONS 키가 모두 소문자 통일 확인

### Phase 1: 자동 Sync 검증 (validate:sync)

수동 CSS가 남아있는 동안의 안전망. CSS↔Spec 값 불일치를 빌드 타임에 자동 감지한다.

**동작 방식:**

```bash
$ pnpm validate:sync

Button.css ↔ ButtonSpec
  ✅ sizes.md.height: 30 = --btn-height: 30px
  ✅ sizes.md.paddingX: 12 = --btn-padding-x: var(--spacing-md) → 12px
  ✅ sizes.md.fontSize: {typography.text-sm} = --btn-font-size: var(--text-sm)
  ✅ variants.accent.background: {color.accent} = --button-color: var(--accent)

Summary: 0 warnings, 0 errors
```

**검증 범위:**

| 비교 대상      | Spec 소스                                | CSS 소스                          |
| -------------- | ---------------------------------------- | --------------------------------- |
| 색상 (variant) | `variants.*.background/text`             | `[data-variant] background/color` |
| 사이즈         | `sizes.*.height/paddingX/Y`              | `[data-size] height/padding`      |
| 폰트           | `sizes.*.fontSize/fontWeight/lineHeight` | `[data-size] font-*`              |
| Border         | `sizes.*.borderRadius/borderWidth`       | `[data-size] border-*`            |
| Gap            | `sizes.*.gap`                            | `[data-size] gap`                 |

**대상 파일:**

- `packages/specs/scripts/validate-sync.ts` — 신규
- `packages/specs/package.json` — `validate:sync` 추가

### Phase 2a: CSSGenerator Level 1 확장

**확장 대상 속성:**

| 속성               | 현재 상태       | 확장 방법                                 |
| ------------------ | --------------- | ----------------------------------------- |
| `gap`              | optional 처리됨 | 항상 출력                                 |
| `line-height`      | 미구현          | `SizeSpec.lineHeight` → `tokenToCSSVar()` |
| `font-weight`      | 미구현          | `SizeSpec.fontWeight` → 숫자 직접 출력    |
| `letter-spacing`   | 미구현          | `SizeSpec.letterSpacing` → px 출력        |
| `border-width`     | 미구현          | `SizeSpec.borderWidth` → px 출력          |
| `min-width/height` | 미구현          | `SizeSpec.minWidth/minHeight` → px        |
| `icon-size`        | 미구현          | `SizeSpec.iconSize` → CSS 변수 출력       |

### Phase 2b: fillStyle / Gradient / Icon-only 지원

**1. fillStyle (outline 변형):**

```typescript
interface VariantSpec {
  // ... 기존
  outlineBackground?: TokenRef;
  outlineText?: TokenRef;
  outlineBorder?: TokenRef;
}
```

**2. Gradient 배경:**

```typescript
interface VariantSpec {
  background: TokenRef | string; // string으로 CSS gradient 직접 전달
}
```

**3. Icon-only 모드:**

```typescript
interface SizeSpec {
  iconOnlyPadding?: number;
}
```

### Phase 2c: 등급 A 컴포넌트 CSS 전환 (~20개)

Level 1만으로 85%+ 커버 가능한 컴포넌트. 잔여 CSS-only 속성은 supplement.css.

**등급 A 대상:**

Badge, Separator, StatusLight, Tooltip, Skeleton, Meter, IllustratedMessage, InlineAlert, ContextualHelp, ColorSwatch, Avatar, Divider, Button, ToggleButton, Link, LinkButton, Tag, Chip

**전환 패턴 (안전한 롤백):**

```
1. generated/Badge.css 생성 + 기존 Badge.css 유지 (양립)
2. import 경로를 generated/Badge.css로 변경
3. 시각 검증 통과 + validate:sync PASS → 기존 Badge.css 삭제
4. 실패 시 → import 경로만 되돌리면 즉시 롤백
```

**잔여 CSS-only 속성 처리:**

```css
/* Badge.supplement.css — 수동 유지, Level 1 범위 밖 */
.react-aria-Badge { white-space: nowrap; }
@keyframes badge-pulse { ... }
```

### Phase 3a: Component Archetype 템플릿 개발

Level 2 — 컴포넌트 유형별 CSS 구조 패턴을 자동 생성하는 템플릿.

**Archetype 목록 (~8개):**

| Archetype            | CSS 구조 생성                                                      | Spec 데이터 소스                                     |
| -------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| **toggle-indicator** | `::before { width, height, border-radius, background, transform }` | Switch: `SWITCH_DIMENSIONS.thumbSize`, variants 색상 |
|                      | SVG checkmark `{ stroke, stroke-width }`                           | Checkbox: `line` shapes 좌표                         |
|                      | `::before { width, height, border-radius, border-width }`          | Radio: `RADIO_DIMENSIONS.inner`, variants 색상       |
| **progress**         | `.fill { height, border-radius, background }`                      | ProgressBar: shapes `roundRect` fill                 |
|                      | `@keyframes indeterminate { transform }`                           | ComponentSpec.animations                             |
| **input**            | `::placeholder { color, font-size }`                               | TextField: shapes `text` (placeholder 색상)          |
|                      | `:focus-within { border-color, box-shadow }`                       | StateSpec.focused 확장                               |
| **slider**           | `grid-template`, track `::before`, thumb 위치/크기                 | Slider: `SLIDER_DIMENSIONS`, shapes roundRect/circle |
| **tabs**             | `::before` indicator, orientation 분기                             | Tabs: indicator shapes, sizes                        |
| **@media-a11y**      | `@media (forced-colors: active) { forced-color-adjust }`           | **모든 컴포넌트에 자동** — 24개 파일 동일 패턴       |
|                      | `@media (prefers-reduced-motion) { transition: none }`             | **모든 컴포넌트에 자동**                             |

**Archetype 등록 방법:**

```typescript
interface ComponentSpec<Props> {
  // ... 기존
  archetype?: ComponentArchetype; // 'simple' | 'button' | 'toggle-indicator' | 'progress' | 'input' | 'slider' | 'tabs' | 'composite'
  animations?: AnimationSpec[]; // @keyframes 정의 (선택)
}

interface AnimationSpec {
  name: string; // 'badge-pulse', 'indeterminate'
  keyframes: string; // CSS @keyframes 본문
  trigger: string; // '[data-pulsing]', '[data-indeterminate]'
}
```

### Phase 3b: @media / @keyframes 공통 생성

**@media (forced-colors: active):**

24개 파일에서 동일한 패턴을 사용. CSSGenerator가 모든 컴포넌트에 자동으로 추가:

```css
/* 자동 생성 */
@media (forced-colors: active) {
  .react-aria-{name} { forced-color-adjust: auto; }
}
```

**@media (prefers-reduced-motion):**

transition이 있는 모든 컴포넌트에 자동 추가:

```css
/* 자동 생성 */
@media (prefers-reduced-motion: reduce) {
  .react-aria-{name} { transition-duration: 0s; }
}
```

**@keyframes:**

`ComponentSpec.animations` 필드에서 생성:

```css
/* Badge.animations = [{ name: 'badge-pulse', keyframes: '...', trigger: '[data-pulsing]' }] */
@keyframes badge-pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
.react-aria-Badge[data-pulsing] {
  animation: badge-pulse 2s infinite;
}
```

### Phase 3c: 등급 B 컴포넌트 CSS 전환 (~40개)

Level 1 + Level 2 Archetype 템플릿으로 전환 가능한 컴포넌트.

**등급 B 대상 (Archetype별):**

| Archetype        | 컴포넌트                                      | 예상 커버율 |
| ---------------- | --------------------------------------------- | ----------- |
| toggle-indicator | Switch, Checkbox, Radio                       | 85–90%      |
| progress         | ProgressBar, ProgressCircle, Meter            | 85%         |
| input            | TextField, NumberField, SearchField, TextArea | 85%         |
| slider           | Slider, SliderTrack, SliderThumb              | 70%         |
| tabs             | Tabs, Tab, TabList, TabPanel                  | 55%         |

**등급 B+ (compositional — 하위 Spec 분해로 자동 생성):**

| 컴포넌트   | 방법                                                                   | 예상 커버율 |
| ---------- | ---------------------------------------------------------------------- | ----------- |
| Card       | CardPreview/CardFooter 하위 Spec 각각 Level 1 → variant/size/state CSS | 85%         |
| Calendar   | CalendarHeader/CalendarGrid Spec에 전체 데이터 완비, CSS 중복 제거     | 95%         |
| DatePicker | DateField Spec + Calendar compositional 조합                           | 80%         |

**등급 B+ (popup-primitive — React Aria composition cascade):**

| 컴포넌트    | 방법                                                                     | 적용 범위                                         | 예상 커버율 |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------- | ----------- |
| **ListBox** | ListBox + ListBoxItem Spec → variant/size/state CSS                      | **Select, ComboBox, Menu, ColorPicker에 cascade** | 85%         |
| **Popover** | Level 1(variant/size) + animations 필드(@keyframes) + placement CSS 변수 | **모든 팝업 컨텍스트에 적용**                     | 90%         |

> **핵심**: React Aria Components는 모든 팝업 콘텐츠를 ListBox primitive로 통일한다. ListBox CSS 하나를 자동 생성하면 Select, ComboBox, Menu의 아이템 스타일이 일괄 변경된다. 88개 CSS가 독립적으로 보이지만, 실제 자동 생성 대상은 **핵심 primitives 수십 개**이며 나머지는 cascade로 커버된다.

**전환하지 않는 컴포넌트 (등급 C — 수동 CSS + validate:sync):**

| 컴포넌트 | 이유                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| Table    | 가상 스크롤(position: absolute 동적), `:has()` 인접 행 상태, column resizer, 부모→자식 동적 색상 오버라이드 |

검증:

- [ ] 각 Archetype 템플릿의 CSS 출력이 해당 컴포넌트 기존 CSS와 시각 동일
- [ ] 모든 variant × size × state 조합 스크린샷 비교
- [ ] `validate:sync` 전체 리포트 0 errors

### Phase 4: Spec-First 워크플로우 확립 (장기)

**워크플로우:**

1. Spec 정의 (`variants`/`sizes`/`states`/`shapes`/`archetype`) 작성
2. `pnpm build:specs` → CSS 자동 생성 (Level 1 + Level 2)
3. React Aria 컴포넌트에서 자동 생성 CSS import
4. Table만 수동 CSS + `validate:sync`
5. `validate:sync`가 CI에서 자동 실행 → 불일치 PR 차단

---

## Execution Guardrails

1. **Phase별 1커밋 원칙** — 각 Phase 완료 후 `type-check` + 시각 검증 후 커밋
2. **시각 비교 필수** — CSS 교체 전후 Builder(Skia) + Preview(DOM) 스크린샷 비교
3. **안전한 롤백** — import 경로 변경 방식 (기존 CSS 유지 → 검증 후 삭제)
4. **Archetype 커버율 확인** — 템플릿 추가 시 해당 컴포넌트 모든 state/variant 시각 비교
5. **validate:sync** — composite 컴포넌트 수동 CSS의 안전망

---

## Metrics / Verification

### 정량 메트릭

| 메트릭             | 단위 | Baseline      | Phase 0 | Phase 1       | Phase 2      | Phase 3          |
| ------------------ | ---- | ------------- | ------- | ------------- | ------------ | ---------------- |
| 수동 동기화 포인트 | 개   | ~10 (`@sync`) | ~7      | 0 (자동 검증) | 0            | 0                |
| 수동 SIZE_CONFIG   | 개   | 5+            | 0       | 0             | 0            | 0                |
| CSS 자동 생성      | 개   | 0             | 0       | 0             | ~20 (등급 A) | ~**87** (A+B+B+) |
| 수동 CSS 유지      | 개   | 88            | 88      | 88            | ~68          | ~**1** (Table)   |
| 불일치 감지        | -    | 수동          | 수동    | 자동          | 자동         | 자동             |
| 불일치 위험        | 등급 | H             | M       | L             | L            | **VL**           |
| 자동화율           | %    | 0%            | 0%      | 0%            | ~23%         | **~95–99%**      |

### 자동 검증

- [ ] `pnpm validate:sync` — 전체 CSS↔Spec 값 diff, 0 errors
- [ ] `pnpm type-check` — 타입 에러 0건
- [ ] Archetype 템플릿별: 생성 CSS vs 기존 CSS 시각 비교

### 수동 검증 체크리스트

- [ ] Button: 5 sizes × 6 variants × 2 fillStyles × 4 states = 240 조합
- [ ] Badge: 22 variants × 3 fill styles = 66 조합
- [ ] Switch/Checkbox/Radio: 3 sizes × 2 states × emphasized = 18 조합
- [ ] Slider: 3 sizes × 2 orientations = 6 조합
- [ ] 다크모드: 전체 컴포넌트 light/dark 전환
- [ ] Tint 변경: 10 preset × 대표 5개 = 50 조합

---

## Consequences

### Positive

1. **3중→1중 동기화**: SIZE_CONFIG 제거 + CSS 자동 생성으로 Spec이 유일한 소스
2. **자동화율 95–99%**: 88개 CSS 중 ~87개를 자동 생성 (compositional 분해로 Menu/Popover/ListBox 포함)
3. **업계 최초 단일 솔루션 완성**: 고성능 캔버스 편집 + 프로덕션 웹 퍼블리싱의 동기화 비용 제거
4. **@media 접근성 패턴 자동화**: 24개 파일의 동일 코드를 템플릿 1개로 대체
5. **Archetype 재사용**: 새 toggle-indicator 류 컴포넌트 추가 시 CSS 자동 생성
6. **validate:sync 안전망**: Table 등 수동 CSS의 값 정합 자동 보장
7. **Figma→XStudio 파이프라인 강화**: Figma 레이어 → Spec shapes → CSS 자동 생성 (ADR-038 연계)

### Negative

1. **Archetype 템플릿 개발 투자**: ~8개 유형 개발 필요
2. **Table 수동 CSS 유지**: 가상 스크롤, `:has()` 인접 상태 등 런타임 동적 제어로 자동화 불가
3. **CSSGenerator 복잡도 증가**: Level 1 + Level 2 + @media/@keyframes = 상당한 코드량
4. **빌드 파이프라인 증가**: CSS 생성 + validate:sync 단계 추가
5. **Archetype 분류 판단**: 새 컴포넌트가 어떤 Archetype에 속하는지 결정 필요

---

## References

- `packages/specs/src/renderers/CSSGenerator.ts` — 기존 CSS 생성기 (POC, Level 1)
- `packages/specs/src/renderers/utils/tokenResolver.ts` — `tokenToCSSVar()` 매핑
- `packages/specs/src/types/spec.types.ts` — SizeSpec, VariantSpec, StateStyles 타입 정의
- `packages/specs/src/components/Switch.spec.ts` — thumb `circle` shape (Level 2 데이터 소스 예시)
- `packages/specs/src/components/Checkbox.spec.ts` — checkmark `line` shapes (Level 2 데이터 소스 예시)
- `packages/specs/src/components/Radio.spec.ts` — dot `circle` shape (Level 2 데이터 소스 예시)
- `apps/builder/src/builder/workspace/canvas/skia/specTextStyle.ts` — Spec 직접 읽기 선례
- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` — SIZE_CONFIG (Phase 0 제거 대상)
- `packages/shared/src/components/styles/Button.css` — 수동 CSS 대표 예시
- `packages/specs/src/components/Button.spec.ts` — Spec 정의 대표 예시
- `packages/specs/scripts/generate-css.ts` — CSS 생성 스크립트 (기존)
- [ADR-022](completed/022-s2-color-token.md) — S2 색상 토큰 (tokenToCSSVar 체계)
- [ADR-021](021-theme-system-redesign.md) — Theme System (tint/darkMode 통합)
- [ADR-038](038-figma-import.md) — Figma 디자인 임포트 (Spec shapes ↔ Figma 레이어 매핑 연계)
