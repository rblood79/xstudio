# CSS 토큰 규칙 — S2 체계 (ADR-022) + Tint System

## 금지된 M3 토큰

아래 CSS 변수 및 Spec TokenRef는 ADR-017/022에 의해 제거됨. 새 코드에서 사용 금지:

```
CSS 변수: --primary, --on-primary, --secondary, --on-secondary,
--tertiary, --on-tertiary, --error, --on-error, --surface, --on-surface,
--outline, --outline-variant 및 모든 -container, -hover, -pressed 파생

Spec TokenRef: {color.primary}, {color.secondary}, {color.tertiary},
{color.error}, {color.surface}, {color.on-surface} 및 모든 M3 파생 토큰
```

## S2 Spec TokenRef 체계 (ADR-022)

| S2 TokenRef                  | CSS 변수 매핑                                  | 용도                 |
| ---------------------------- | ---------------------------------------------- | -------------------- |
| `{color.accent}`             | `--highlight-background`                       | 주요 강조 배경       |
| `{color.accent-hover}`       | `color-mix(--highlight-background 85%, black)` | accent hover         |
| `{color.accent-pressed}`     | `color-mix(--highlight-background 75%, black)` | accent pressed       |
| `{color.on-accent}`          | `--highlight-foreground`                       | accent 위 텍스트     |
| `{color.accent-subtle}`      | `--color-primary-100`                          | 연한 accent 배경     |
| `{color.neutral}`            | `--text-color`                                 | 기본 텍스트          |
| `{color.neutral-subdued}`    | `--text-color-placeholder`                     | 보조 텍스트          |
| `{color.neutral-subtle}`     | `--color-neutral-200`                          | 연한 중립 배경       |
| `{color.neutral-hover}`      | `color-mix(--color-neutral-200 85%, black)`    | neutral 배경 hover   |
| `{color.neutral-pressed}`    | `color-mix(--color-neutral-200 75%, black)`    | neutral 배경 pressed |
| `{color.negative}`           | `--invalid-color`                              | 에러/파괴적 행동     |
| `{color.negative-hover}`     | `color-mix(--invalid-color 85%, black)`        | negative hover       |
| `{color.negative-pressed}`   | `color-mix(--invalid-color 75%, black)`        | negative pressed     |
| `{color.on-negative}`        | `--color-white`                                | negative 위 텍스트   |
| `{color.negative-subtle}`    | `--color-error-100`                            | 연한 에러 배경       |
| `{color.informative}`        | `--color-info-600`                             | 정보 상태            |
| `{color.informative-subtle}` | `--color-info-100`                             | 연한 정보 배경       |
| `{color.positive}`           | `--color-green-600`                            | 성공 상태            |
| `{color.positive-subtle}`    | `--color-green-100`                            | 연한 성공 배경       |
| `{color.notice}`             | `--color-warning-600`                          | 경고 상태            |
| `{color.notice-subtle}`      | `--color-warning-100`                          | 연한 경고 배경       |
| `{color.base}`               | `--background-color`                           | 앱 배경              |
| `{color.layer-1}`            | `--overlay-background`                         | 오버레이/모달        |
| `{color.layer-2}`            | `--field-background`                           | 입력 필드/카드       |
| `{color.elevated}`           | `--color-white`                                | 떠있는 요소          |
| `{color.disabled}`           | `--color-neutral-200`                          | 비활성 배경          |
| `{color.border}`             | `--border-color`                               | 기본 테두리          |
| `{color.border-hover}`       | `--border-color-hover`                         | 테두리 hover         |
| `{color.border-disabled}`    | `--border-color-disabled`                      | 비활성 테두리        |
| `{color.transparent}`        | `transparent`                                  | 투명                 |
| `{color.white}`              | `--color-white`                                | 흰색                 |
| `{color.black}`              | `--color-black`                                | 검정                 |

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
--tint: var(--indigo); /* 남색 테마로 전환 */
```

- 프리셋: `--red`, `--orange`, `--yellow`, `--green`, `--turquoise`, `--cyan`, `--blue`, `--indigo`, `--purple`, `--pink`
- 자동 생성: `--tint-100` ~ `--tint-1600` (oklch relative color)
- 다크모드: lightness 스케일 자동 반전
- ThemeStudio 오버라이드(`--color-highlight-background` 등)가 tint fallback보다 우선

## 시맨틱 CSS 변수 (변경 없음)

| 용도             | 시맨틱 토큰                      | tint fallback                           |
| ---------------- | -------------------------------- | --------------------------------------- |
| 주요 강조 배경   | `--highlight-background`         | `oklch(from var(--tint) 55% c h)`       |
| 주요 강조 텍스트 | `--highlight-foreground`         | `white`                                 |
| 포커스 링        | `--focus-ring-color`             | `var(--tint-1000)`                      |
| 링크 색상        | `--link-color`                   | `var(--tint-1200)`                      |
| 일반 텍스트      | `--text-color`                   | `var(--color-neutral-900)`              |
| 비활성 텍스트    | `--text-color-disabled`          | `var(--color-neutral-500)`              |
| 플레이스홀더     | `--text-color-placeholder`       | `var(--color-neutral-700)`              |
| 테두리           | `--border-color`                 | `var(--color-neutral-300)`              |
| 테두리 hover     | `--border-color-hover`           | `var(--color-neutral-400)`              |
| 입력 배경        | `--field-background`             | `var(--color-neutral-50)`               |
| 오버레이 배경    | `--overlay-background`           | `var(--color-neutral-50)`               |
| 버튼 배경        | `--button-background`            | `var(--color-neutral-50)`               |
| 에러             | `--invalid-color`                | `var(--color-error-400)`                |
| 흰색/검정        | `--color-white`, `--color-black` | `#fff`, `#000` (shared-tokens.css)      |
| 투명             | `transparent`                    | Spec TokenRef용 (`{color.transparent}`) |

## Spec TokenRef ↔ CSS 변수 매핑 주의

Spec의 `{color.*}` TokenRef 키는 `colors.ts`의 `ColorTokens` 인터페이스에 정의된 이름만 사용 가능.
CSS 변수명을 TokenRef 키로 직접 사용하면 Skia 렌더링에서 `undefined` → 검정색 버그 발생.

| CSS 변수 (사용 금지)       | 올바른 TokenRef 키        |
| -------------------------- | ------------------------- |
| `{color.field-background}` | `{color.layer-2}`         |
| `{color.text-color}`       | `{color.neutral-subdued}` |

## Hover/Pressed 파생

`color-mix()` 패턴 사용 (utilities.css `.button-base` 참조):

```css
/* hover: 85% base + 15% black */
background: color-mix(in srgb, var(--highlight-background) 85%, black);
/* pressed: 75% base + 25% black */
background: color-mix(in srgb, var(--highlight-background) 75%, black);
```

## Utility 클래스 (ADR-018)

컴포넌트에서 variant/state 색상 블록 대신 utility 클래스 사용 권장:

- `.button-base` — `--button-color` 설정 시 hover/pressed/disabled 자동 파생
- `.indicator` — `--indicator-color` 설정 시 selected/hover 자동 파생
- `.inset` — `--inset-bg`/`--inset-border` 설정 시 focus/invalid 자동 파생
