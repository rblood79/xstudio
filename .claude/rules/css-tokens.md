# CSS 토큰 규칙 — S2 + React Aria Hybrid Naming (ADR-022)

## 시맨틱 변수 네이밍 규칙 (CRITICAL)

S2 + React Aria 혼합 패턴. 모든 컴포넌트 CSS에서 시맨틱 변수만 사용 필수.

### 네이밍 패턴: `--{카테고리}[-{변형}]`

| 카테고리                          | 용도              | 예시                                                                     |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| `--bg-*`                          | Surface/배경      | `--bg`, `--bg-raised`, `--bg-overlay`, `--bg-muted`, `--bg-inset`        |
| `--fg-*`                          | Foreground/텍스트 | `--fg`, `--fg-emphasis`, `--fg-muted`, `--fg-disabled`, `--fg-on-accent` |
| `--border-*`                      | 테두리            | `--border`, `--border-hover`, `--border-pressed`, `--border-disabled`    |
| `--accent-*`                      | 강조/하이라이트   | `--accent`, `--accent-pressed`, `--accent-subtle`                        |
| `--focus-ring`                    | 포커스 인디케이터 |                                                                          |
| `--negative/positive/informative` | 상태 색상         | `--negative`, `--positive`, `--informative`, `--notice-subtle`           |

### Surface Elevation (배경 계층)

```
--bg          앱 전체 배경 (가장 낮은 레벨)
--bg-raised   패널 헤더, section-header (bg 위에 올라온 영역)
--bg-overlay  section-content, 모달, 카드 (가장 밝은/높은 레벨)
--bg-muted    중립 강조 배경 (swatch, hover row, 구분선 배경)
--bg-inset    입력필드, 검색바 (안으로 들어간 영역)
```

Light: `bg(gray-100) → raised(gray-100) → overlay(white) → muted(gray-200) → inset(gray-50)`
Dark: `bg(zinc-900) → raised(zinc-850) → overlay(zinc-800) → muted(zinc-700) → inset(zinc-900)`

### 금지 패턴 (CRITICAL)

```
❌ background: var(--border);        → 테두리 변수를 배경에 사용 금지
❌ color: var(--accent);             → accent를 일반 텍스트에 사용 금지
❌ var(--color-gray-200)             → 원시 토큰 직접 사용 금지 (theme/ 정의 파일 제외)
❌ var(--gray-100)                   → 구 alias 사용 금지
❌ background: #fff / #1a1a1a        → 하드코딩 금지

✅ background: var(--bg-muted);      → 시맨틱 변수 사용
✅ color: var(--fg);                 → 시맨틱 변수 사용
✅ border-color: var(--border);      → 카테고리와 속성 일치
```

### 카테고리-속성 대응 규칙

| CSS 속성                          | 사용 가능 변수 카테고리                          |
| --------------------------------- | ------------------------------------------------ |
| `background` / `background-color` | `--bg-*`, `--accent-*`, `--notice-subtle`        |
| `color`                           | `--fg-*`, `--accent`, `--negative`, `--positive` |
| `border-color` / `border`         | `--border-*`                                     |
| `outline` / `box-shadow (focus)`  | `--focus-ring`                                   |

## 금지된 M3 토큰

```
CSS 변수: --primary, --on-primary, --secondary, --on-secondary,
--tertiary, --on-tertiary, --error, --on-error, --surface, --on-surface,
--outline, --outline-variant 및 모든 -container, -hover, -pressed 파생

Spec TokenRef: {color.primary}, {color.secondary}, {color.tertiary},
{color.error}, {color.surface}, {color.on-surface} 및 모든 M3 파생 토큰
```

## 금지된 구 시맨틱 변수 (리네이밍 완료)

```
--background-color → --bg
--text-color → --fg                 --text-color-placeholder → --fg-muted
--text-color-disabled → --fg-disabled   --text-color-hover → --fg-emphasis
--border-color → --border           --border-color-hover → --border-hover
--highlight-background → --accent   --highlight-foreground → --fg-on-accent
--highlight-overlay → --accent-subtle
--overlay-background → --bg-overlay --field-background → --bg-raised
--button-background → --bg-inset    --focus-ring-color → --focus-ring
--invalid-color → --negative        --info → --informative
--warning-container → --notice-subtle  --on-warning-container → --fg-on-notice
--success → --positive
```

## S2 Spec TokenRef 체계 (ADR-022)

| S2 TokenRef                  | CSS 변수 매핑                      | 용도                 |
| ---------------------------- | ---------------------------------- | -------------------- |
| `{color.accent}`             | `--accent`                         | 주요 강조 배경       |
| `{color.accent-hover}`       | `color-mix(--accent 85%, black)`   | accent hover         |
| `{color.accent-pressed}`     | `color-mix(--accent 75%, black)`   | accent pressed       |
| `{color.on-accent}`          | `--fg-on-accent`                   | accent 위 텍스트     |
| `{color.accent-subtle}`      | `--color-primary-100`              | 연한 accent 배경     |
| `{color.neutral}`            | `--fg`                             | 기본 텍스트          |
| `{color.neutral-subdued}`    | `--fg-muted`                       | 보조 텍스트          |
| `{color.neutral-subtle}`     | `--bg-muted`                       | 연한 중립 배경       |
| `{color.neutral-hover}`      | `color-mix(--bg-muted 85%, black)` | neutral 배경 hover   |
| `{color.neutral-pressed}`    | `color-mix(--bg-muted 75%, black)` | neutral 배경 pressed |
| `{color.negative}`           | `--negative`                       | 에러/파괴적 행동     |
| `{color.negative-hover}`     | `color-mix(--negative 85%, black)` | negative hover       |
| `{color.negative-pressed}`   | `color-mix(--negative 75%, black)` | negative pressed     |
| `{color.on-negative}`        | `--color-white`                    | negative 위 텍스트   |
| `{color.negative-subtle}`    | `--color-error-100`                | 연한 에러 배경       |
| `{color.informative}`        | `--color-info-600`                 | 정보 상태            |
| `{color.informative-subtle}` | `--color-info-100`                 | 연한 정보 배경       |
| `{color.positive}`           | `--color-green-600`                | 성공 상태            |
| `{color.positive-subtle}`    | `--color-green-100`                | 연한 성공 배경       |
| `{color.notice}`             | `--color-warning-600`              | 경고 상태            |
| `{color.notice-subtle}`      | `--color-warning-100`              | 연한 경고 배경       |
| `{color.base}`               | `--bg`                             | 앱 배경              |
| `{color.layer-1}`            | `--bg-overlay`                     | 오버레이/모달        |
| `{color.layer-2}`            | `--bg-inset`                       | 입력 필드/카드       |
| `{color.elevated}`           | `--color-white`                    | 떠있는 요소          |
| `{color.disabled}`           | `--color-neutral-200`              | 비활성 배경          |
| `{color.border}`             | `--border`                         | 기본 테두리          |
| `{color.border-hover}`       | `--border-hover`                   | 테두리 hover         |
| `{color.border-disabled}`    | `--border-disabled`                | 비활성 테두리        |
| `{color.transparent}`        | `transparent`                      | 투명                 |
| `{color.white}`              | `--color-white`                    | 흰색                 |
| `{color.black}`              | `--color-black`                    | 검정                 |

### Named Color (글로벌 시맨틱 없는 색상)

| TokenRef                 | CSS 변수 매핑                              | 용도           |
| ------------------------ | ------------------------------------------ | -------------- |
| `{color.purple}`         | `--color-purple-600`                       | 보라 테마      |
| `{color.purple-hover}`   | `color-mix(--color-purple-600 85%, black)` | purple hover   |
| `{color.purple-pressed}` | `color-mix(--color-purple-600 75%, black)` | purple pressed |
| `{color.purple-subtle}`  | `--color-purple-100`                       | 연한 보라      |

## Tint Color System (preview-system.css)

`--tint` 변수 하나로 전체 accent 색상 전환 (React Aria starter 패턴):

```css
--tint: var(--blue); /* 기본: 파란 테마 */
--tint: var(--purple); /* 보라 테마로 전환 */
```

- 프리셋: `--red`, `--orange`, `--yellow`, `--green`, `--turquoise`, `--cyan`, `--blue`, `--indigo`, `--purple`, `--pink`
- 자동 생성: `--tint-100` ~ `--tint-1600` (oklch relative color)
- 다크모드: lightness 스케일 자동 반전
- ThemeStudio 오버라이드(`--color-highlight-background` 등)가 tint fallback보다 우선

## Hover/Pressed 파생

`color-mix()` 패턴 사용 (utilities.css `.button-base` 참조):

```css
/* hover: 85% base + 15% black */
background: color-mix(in srgb, var(--accent) 85%, black);
/* pressed: 75% base + 25% black */
background: color-mix(in srgb, var(--accent) 75%, black);
```

### Skia/Canvas 측 color-mix 처리

Skia는 CSS `color-mix()`를 네이티브 지원하지 않으므로 JS에서 동일 연산 수행:

- **`tintToSkiaColors.ts`의 `mixWithBlackSrgb()`**: srgb 채널별 선형 혼합 (CSS 정합)
  - `mixWithBlackSrgb(accentHex, 85)` = `color-mix(in srgb, accent 85%, black)`
  - oklch lightness 근사 사용 금지 (srgb 혼합과 수학적으로 다른 결과)
- light/dark 모드 무관하게 동일 연산 (CSS `color-mix`는 모드별 분기 없음)

## Utility 클래스 (ADR-018)

컴포넌트에서 variant/state 색상 블록 대신 utility 클래스 사용 권장:

- `.button-base` — `--button-color` 설정 시 hover/pressed/disabled 자동 파생
- `.indicator` — `--indicator-color` 설정 시 selected/hover 자동 파생
- `.inset` — `--inset-bg`/`--inset-border` 설정 시 focus/invalid 자동 파생

## Dark Mode — Skia/WebGL 적용 (ADR-021)

Skia 캔버스에서 dark mode를 반영하려면:

1. **`resolveSkiaTheme(darkMode)`**: `DarkModePreference` → `"light" | "dark"` 변환 ("system"은 OS 미디어 쿼리 기반)
2. **`specShapesToSkia(shapes, skiaTheme, ...)`**: 두 번째 인자에 `skiaTheme` 전달 (하드코딩 `"light"` 금지)
3. **`setDarkMode`**: 반드시 `themeVersion++` + `notifyLayoutChange()` 호출 (누락 시 Skia 무반응)
4. **BodyLayer**: 명시적 배경색 미지정 시 `lightColors.base`/`darkColors.base` fallback 전환
5. **lightColors/darkColors**: `@xstudio/specs` export, Object.freeze() 미적용 → mutation으로 Tint/Neutral 동적 갱신
