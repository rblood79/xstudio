# ADR-028: Builder CSS 스코프 격리 — `[data-context="builder"]` 단일 선택자 전환

## Status

Proposed (2026-03-06)

## Context

### 문제 정의

`builder-system.css`는 Builder UI 영역(header, sidebar, inspector 등)에만 적용되어야 할 CSS 변수를 **6+2개 선택자 나열**로 스코핑하고 있다:

```css
/* 현재: 영역별 선택자 나열 */
.inspector,
.sidebar,
.header,
.footer,
.overlay,
.bg,
.canvas,
body:not([data-preview="true"]) .react-aria-Popover,
body:not([data-preview="true"]) .react-aria-Modal,
.modal-panel { ... }
```

이 패턴에는 세 가지 구조적 결함이 있다:

1. **선택자 수동 관리**: 새 Builder UI 영역(e.g., BottomPanel, CommandPalette)을 추가할 때마다 선택자를 수동으로 추가해야 한다. 누락 시 해당 영역에서 preview-system의 tint 색상이 "새어나온다".

2. **Portal 누수**: React Aria의 Popover/Modal은 `document.body` 직하에 portal 렌더링된다. `body:not([data-preview="true"])` 패턴으로 우회하고 있으나, Builder body에 `data-preview`가 없으므로 **모든** Popover(Preview 포함)가 builder-system 변수를 상속받을 위험이 있다. `.modal-panel` 선택자는 이 누수를 수동으로 막기 위해 추가된 것이다.

3. **Dark mode 선택자 복제**: `[data-builder-theme="dark"]` 접두사와 모든 영역 선택자를 조합하여 dark mode 블록을 작성해야 한다. Light mode 선택자 목록이 변경되면 dark mode 블록도 동일하게 수정해야 하는 이중 유지보수 부담이 존재한다.

### 근본 원인

theme.css가 preview-system.css와 builder-system.css를 **같은 문서(Builder main document)**에 모두 로드한다:

```
theme.css
├── preview-system.css  → :root에 시맨틱 변수 정의 (tint 기반)
├── shared-tokens.css   → 공통 디자인 토큰
└── builder-system.css  → 특정 선택자 범위에서 시맨틱 변수 오버라이드 (gray 기반)
```

Preview iframe은 별도 document이므로 builder-system이 적용되지 않는다. 문제는 **Builder main document 내에서** preview-system의 `:root` 변수가 builder-system 선택자 범위 바깥의 Builder UI에 "새어나오는" 것이다.

현재는 `.inspector, .sidebar, .header, .footer, .overlay, .bg, .canvas`라는 **암묵적 DOM 구조 의존**으로 이를 방어하고 있다. 이것은 "구멍 뚫린 우산" 패턴 — 비가 오는 곳마다 수동으로 패치하는 구조다.

### Hard Constraints

| 제약                              | 설명                                                  |
| --------------------------------- | ----------------------------------------------------- |
| 번들 < 500KB                      | CSS 중복으로 인한 번들 증가 불가                      |
| Preview iframe 격리 유지          | ADR-004 결정 사항                                     |
| ADR-017/018 정합성                | 진행 중인 M3 제거 + utilities 패턴 도입과 충돌 불가   |
| 하위 호환                         | `data-variant`, `data-size` 등 기존 컴포넌트 API 유지 |
| React Aria `.react-aria-*` 클래스 | React Aria가 자동 생성하는 클래스명 변경 불가         |

### 업계 레퍼런스

| 제품        | CSS 격리 전략                                                     |
| ----------- | ----------------------------------------------------------------- |
| **Figma**   | 에디터 UI는 자체 디자인 시스템(C++/WebGL), 플러그인만 iframe 격리 |
| **Canva**   | Shadow DOM으로 에디터 UI와 사용자 콘텐츠 격리                     |
| **Webflow** | 에디터 CSS와 사이트 CSS 완전 분리 빌드                            |
| **Framer**  | 에디터 UI는 Radix + 자체 토큰, 프리뷰는 iframe 격리               |

## Alternatives Considered

### 대안 A: `[data-context="builder"]` 단일 선택자 전환

BuilderViewport(`.app`)에 `data-context="builder"` 속성을 추가하고, builder-system.css의 모든 영역별 선택자를 이 단일 속성 선택자로 교체한다.

```css
/* After */
[data-context="builder"] {
  --highlight-background: var(--gray-900);
  /* ...동일 변수... */
}
```

Portal로 렌더링되는 Popover/Modal은 `[data-context="builder"]` 바깥(`document.body` 직하)에 mount되므로, React Aria의 `UNSTABLE_portalContainer`를 활용하여 Builder 컨텍스트 내부에 portal container를 지정한다.

- 위험:
  - 기술: **L** — CSS 변수 scoping은 검증된 기술. `UNSTABLE_portalContainer` API는 React Aria 공식 제공
  - 성능: **L** — 번들 크기 변화 없음, 선택자 복잡도 오히려 감소
  - 유지보수: **L** — 새 Builder UI 영역 추가 시 선택자 수정 불필요. Dark mode 선택자도 `[data-builder-theme="dark"][data-context="builder"]` 하나로 통합
  - 마이그레이션: **L** — 선택자 교체 + BuilderViewport에 속성 1개 추가. 기존 CSS 변수명/값은 변경 없음

### 대안 B: 물리적 CSS 패키지 분리 (Builder CSS / User CSS)

`packages/shared/src/components/styles/`를 두 개로 분할:

- `styles/user/` — Preview/Publish용 (tint system, 사용자 커스터마이징)
- `styles/builder/` — Builder 에디터 UI 전용 (고정 gray 테마)

공통 구조(레이아웃, 크기)는 `styles/base/`에 유지. 시각적 스타일(색상, 테두리)만 분리.

- 위험:
  - 기술: **M** — CSS 파일 분할 시 공통 구조/시각 분리 경계 불명확. 일부 컴포넌트는 구조와 시각이 긴밀 결합
  - 성능: **M** — base CSS 중복 가능성. 두 패키지를 모두 로드하면 번들 증가
  - 유지보수: **H** — 컴포넌트 CSS 수정 시 두 곳을 동기화해야 함. React Aria 컴포넌트 업데이트 시 양쪽 반영 필요
  - 마이그레이션: **H** — 80개 파일을 분할 + 모든 import 경로 변경. ADR-017/018 진행 중인 상태에서 병행 위험

### 대안 C: CSS Variable 기본값 반전 (Builder-first defaults)

시맨틱 변수의 `:root` 기본값을 Builder 테마(gray)로 설정하고, Preview/Publish에서만 tint 기반 값으로 오버라이드한다. 현재 기본값 방향(preview-system이 `:root` 기본)을 뒤집는 것.

```css
/* :root에 Builder 값을 기본으로 */
:root {
  --highlight-background: var(--gray-900);
  --highlight-foreground: var(--gray-0);
}
/* Preview에서만 tint로 오버라이드 */
[data-preview="true"] {
  --highlight-background: oklch(from var(--tint) 55% c h);
}
```

- 위험:
  - 기술: **M** — Preview iframe은 별도 document이므로 `:root` 기본값이 Preview에도 적용됨. iframe 내에서 다시 오버라이드 필요
  - 성능: **L** — 변수 선언 위치만 변경, 번들 영향 없음
  - 유지보수: **M** — "기본값이 Builder"라는 멘탈 모델과 "사용자 커스터마이징 가능한 컴포넌트"라는 Preview 정체성이 충돌. 새 시맨틱 변수 추가 시 Builder 기본값과 Preview 오버라이드 양쪽에 추가해야 함
  - 마이그레이션: **M** — preview-system.css + builder-system.css 모두 리팩토링 필요. 기존 `:root` 기반 테마 커스터마이징(ThemeStudio `--color-*` 오버라이드)과의 호환성 검증 필요

### 대안 D: 하이브리드 — 대안 A + ADR-018 utilities 시너지

대안 A의 `[data-context="builder"]` 단일 선택자 전환을 즉시 적용하고, ADR-018 Phase 2~5 완료에 따라 builder-system.css의 변수 오버라이드를 점진적으로 축소한다.

ADR-018의 `.button-base`, `.indicator`, `.inset` utilities 패턴이 모든 컴포넌트에 적용되면, 개별 variant/state 색상이 **로컬 변수 1개**(`--button-color`, `--indicator-color`, `--inset-bg`)로 수렴한다. Builder에서는 이 로컬 변수의 기반이 되는 시맨틱 변수(`--highlight-background`, `--field-background` 등) ~10개만 오버라이드하면 모든 hover/pressed/disabled 파생이 `color-mix()`로 자동 계산된다.

**Phase 0** (즉시, ADR-018 무관): `[data-context="builder"]` 전환 — 선택자 나열 제거
**Phase 1** (ADR-018 Phase 2~5 이후): builder-system.css 변수 오버라이드 ~30개 → ~10개로 축소

- 위험:
  - 기술: **L** — 기존 기술 조합, 추가 도입 없음
  - 성능: **L** — CSS 오히려 감소 (선택자 단순화 + 변수 축소)
  - 유지보수: **L** — 오버라이드 포인트 ~10개로 축소, 단일 선택자, dark mode 선택자 통합
  - 마이그레이션: **L** — Phase 0은 독립 작업, Phase 1은 ADR-018에 편승

## Risk Threshold Check

| 대안                  | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH 수 |
| --------------------- | :--: | :--: | :------: | :----------: | :-----: |
| A: 단일 선택자 전환   |  L   |  L   |    L     |      L       |    0    |
| B: 물리적 패키지 분리 |  M   |  M   |  **H**   |    **H**     |  **2**  |
| C: 기본값 반전        |  M   |  L   |    M     |      M       |    0    |
| D: A + ADR-018 시너지 |  L   |  L   |    L     |      L       |    0    |

대안 B는 HIGH 2개 — 80개 CSS 파일 분할과 이중 동기화 부담이 치명적. ADR-017/018이 활발히 진행 중인 시점에서 CSS 파일 구조를 동시에 분할하면 충돌이 불가피하다.

대안 C는 HIGH 0개지만 MEDIUM 3개. `:root` 기본값 방향 전환은 개념적으로 깔끔하나, ThemeStudio의 `--color-*` 오버라이드 체인과의 호환성 검증이 필요하고, Preview iframe이 별도 document이므로 `:root` 기본값이 양쪽에 동시 적용되는 복잡성이 있다.

대안 A와 D는 모두 전축 LOW. D는 A의 상위 호환이므로, A를 당장 적용하고 ADR-018 완료 시 자연스럽게 D로 확장된다.

## Decision

**대안 D 채택**: `[data-context="builder"]` 단일 선택자 전환 + ADR-018 utilities 시너지

### 채택 근거

1. **모든 축 LOW** — 유일하게 4축 전부 LOW
2. **근본 원인 해결**: 영역별 선택자 나열을 구조적으로 제거. 새 Builder UI 영역 추가 시 CSS 수정 불필요
3. **ADR-018과 자연스러운 시너지**: utilities 패턴 완료 후 변수 오버라이드가 ~30개 → ~10개로 축소
4. **Dark mode 단순화**: `[data-builder-theme="dark"][data-context="builder"]` 단일 조합으로 통합
5. **점진적 마이그레이션**: Phase 0은 ADR-018과 독립적으로 즉시 적용 가능
6. **iframe 격리 활용**: Preview는 이미 iframe 격리(ADR-004). Builder 측 CSS만 scoping하면 충분

### 왜 물리적 분리(대안 B)가 아닌가

비유하자면, 대안 B는 "집을 두 채 짓는 것"이고 대안 D는 "한 집에 방문 잠금을 거는 것"이다. Preview가 **이미 iframe으로 격리**되어 있다는 점이 핵심이다. CSS가 같은 파일에서 정의되더라도, Builder main document와 Preview iframe document는 서로의 CSS를 공유하지 않는다. 실질적인 문제는 **Builder main document 내에서** preview-system 변수가 builder UI에 새어나오는 것뿐이며, 이것은 Variable Scope 하나로 해결된다.

## Implementation

### Phase 0: `[data-context="builder"]` 전환 (즉시, ADR-018 무관)

#### 0-1. BuilderViewport에 속성 추가

```tsx
// apps/builder/src/builder/main/BuilderViewport.tsx
export const BuilderViewport: React.FC<BuilderViewportProps> = ({
  children,
  className = "app",
}) => {
  return (
    <div className={className} data-context="builder">
      {children}
    </div>
  );
};
```

#### 0-2. builder-system.css 선택자 교체

```css
/* Before: 10개 선택자 */
.inspector, .sidebar, .header, .footer, .overlay,
.bg, .canvas,
body:not([data-preview="true"]) .react-aria-Popover,
body:not([data-preview="true"]) .react-aria-Modal,
.modal-panel { ... }

/* After: 1개 선택자 */
[data-context="builder"] { ... }
```

#### 0-3. Portal Container 설정

React Aria Popover/Modal이 `[data-context="builder"]` 범위 내에서 렌더링되도록 portal container를 지정한다:

```tsx
// Builder 최상위에 portal container ref 설정
const portalContainerRef = useRef<HTMLDivElement>(null);

<div data-context="builder" className="app">
  {/* ... builder content ... */}
  <div ref={portalContainerRef} id="builder-portal" />
</div>

// React Aria Provider에 전달
<OverlayProvider portalContainer={portalContainerRef.current}>
  ...
</OverlayProvider>
```

대안으로, `UNSTABLE_portalContainer`가 불안정하다면 builder-system.css에 `body > .react-aria-Popover` 등 fallback 선택자를 유지할 수 있다:

```css
/* Fallback: body 직하 portal에도 builder 변수 적용 */
[data-context="builder"],
body:not([data-preview="true"]) > .react-aria-Popover,
body:not([data-preview="true"]) > .react-aria-Modal {
  /* 기존 변수 동일 */
}
```

#### 0-4. Dark mode 선택자 통합

```css
/* Before: 10개 선택자 × [data-builder-theme="dark"] */
[data-builder-theme="dark"] .inspector,
[data-builder-theme="dark"] .sidebar,
[data-builder-theme="dark"] .header,
[data-builder-theme="dark"] .footer,
[data-builder-theme="dark"] .overlay,
[data-builder-theme="dark"] .bg,
[data-builder-theme="dark"] .canvas,
[data-builder-theme="dark"] body:not([data-preview="true"]) .react-aria-Popover,
[data-builder-theme="dark"] body:not([data-preview="true"]) .react-aria-Modal,
[data-builder-theme="dark"] .modal-panel { ... }

/* After: 1개 조합 */
[data-builder-theme="dark"] [data-context="builder"] { ... }
```

### Phase 1: ADR-018 완료 후 변수 축소

ADR-018 Phase 2~5가 완료되면 모든 컴포넌트가 `.button-base`/`.indicator`/`.inset` utilities를 사용한다. 이때 builder-system.css를 다음과 같이 축소한다:

```css
@layer builder-system {
  [data-context="builder"] {
    /* 기반 시맨틱 변수만 오버라이드 (~10개) */
    --background-color: var(--gray-0);
    --text-color: var(--gray-750);
    --text-color-disabled: var(--gray-400);
    --text-color-placeholder: var(--gray-500);
    --border-color: var(--gray-300);
    --highlight-background: var(--gray-900);
    --highlight-foreground: var(--gray-0);
    --field-background: var(--gray-0);
    --button-background: var(--gray-50);
    --focus-ring-color: var(--blue-300);
    --invalid-color: var(--red-500);

    /* utilities의 color-mix()가 hover/pressed/disabled를 자동 파생 */
  }
}
```

현재 ~30개 변수 오버라이드가 ~10개로 축소된다. `color-mix()` 기반 파생이 hover/pressed를 자동 계산하므로 `--button-background-hover`, `--highlight-background-pressed` 등 파생 변수가 불필요해진다.

### Publish 앱 영향

Publish 앱에는 `[data-context="builder"]` 속성이 존재하지 않으므로 builder-system.css의 모든 규칙이 **자동 비활성화**된다. 추가 작업 불필요.

현재 Publish 앱은 `packages/shared/src/components/index.css` → `styles/index.css` → `theme.css`를 통해 builder-system.css를 로드하지만, `[data-context="builder"]` 선택자가 매칭되는 요소가 없으므로 dead CSS다. builder-system.css는 ~186줄(~4KB)이므로 번들 영향 미미.

### 최종 아키텍처

```
                    ┌────────────────────────────────┐
                    │   packages/shared/styles/       │
                    │   ~80 component CSS files       │
                    │   + utilities.css (ADR-018)     │
                    │   → 시맨틱 변수 기반, 단일 소스  │
                    └──────┬──────────┬───────────────┘
                           │          │
              ┌────────────┘          └────────────┐
              │                                    │
    ┌─────────▼───────────────┐      ┌─────────────▼──────────┐
    │  Builder (main doc)      │      │  Preview (iframe doc)   │
    │  [data-context="builder"]│      │  data-preview="true"    │
    │  ↓                       │      │  ↓                      │
    │  builder-system.css      │      │  preview-system.css     │
    │  (~10 variable override) │      │  (tint + dark mode)     │
    │  자동 파생 by utilities  │      │  사용자 커스터마이징     │
    └──────────────────────────┘      └─────────────────────────┘

    ┌──────────────────────────┐
    │  Publish (app)            │
    │  No [data-context]        │
    │  → builder-system 비활성  │
    │  → preview-system 활성    │
    └──────────────────────────┘
```

## Gates

| Gate | 시점         | 통과 조건                                                                           | 실패 시 대안                                                                      |
| ---- | ------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| G0   | Phase 0-2 후 | Builder UI 모든 영역(inspector, sidebar, header, modal, popover)에서 시각 변화 없음 | 누락 영역에 `[data-context="builder"]` 범위 확인, 필요 시 추가 선택자 보완        |
| G1   | Phase 0-3 후 | Popover/Modal portal이 Builder 테마(gray)를 올바르게 적용. Preview tint 색상 미유입 | `UNSTABLE_portalContainer` 대신 `body:not([data-preview]) >` fallback 선택자 유지 |
| G2   | Phase 0-4 후 | Builder dark mode 전체 영역 정상 동작                                               | Dark mode 선택자에 기존 영역 선택자 복원                                          |
| G3   | Phase 1 후   | ADR-018 utilities 기반 hover/pressed 파생이 Builder gray 테마에서 정확한 색상 출력  | 해당 변수 오버라이드 복원                                                         |

잔존 HIGH 위험 없음.

## Consequences

### Positive

1. **선택자 관리 제거**: 10개 선택자 → 1개. 새 Builder UI 영역 추가 시 CSS 수정 불필요
2. **Dark mode 선택자 통합**: 10개 조합 → 1개 조합. 이중 유지보수 부담 해소
3. **ADR-018 시너지**: 변수 오버라이드 ~30개 → ~10개로 축소 가능
4. **Publish 앱 자동 정리**: `[data-context="builder"]` 부재 시 builder-system 자동 비활성
5. **Portal 누수 구조적 해결**: `body:not([data-preview])` 패턴 대신 명시적 portal container
6. **`!important` 불필요**: Variable Scope가 정확해지면 강제 오버라이드 불필요 (builder-system에 현재 `!important` 0건이나, 향후 추가 방지)

### Negative

1. **Portal container 설정 필요**: React Aria `UNSTABLE_portalContainer` 활용 또는 fallback 선택자 유지. API 안정화 전까지 모니터링 필요
2. **Phase 1(변수 축소)은 ADR-018 완료 의존**: Phase 2~5 미완료 시 변수 축소 불가. 단, Phase 0만으로도 핵심 문제(선택자 나열) 해결
3. **`[data-context="builder"]`가 CSS 변수 상속의 경계**: 이 속성 바깥에서 Builder 컴포넌트를 렌더링하면 preview-system 변수가 적용됨. Builder 컴포넌트는 반드시 이 속성 하위에서 렌더링해야 함

## References

- ADR-004: Preview iframe 격리
- ADR-017: CSS Override SSOT (M3 토큰 제거)
- ADR-018: Component CSS Restructure (utilities 패턴)
- ADR-021: Dark Mode
- ADR-022: S2 Color Token 체계
