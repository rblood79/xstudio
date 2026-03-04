# CSS 토큰 규칙 — M3 사용 금지 (ADR-017) + Tint System

## 금지된 M3 토큰

아래 CSS 변수는 ADR-017에 의해 제거됨. 새 코드에서 사용 금지:

```
--primary, --on-primary, --primary-container, --on-primary-container
--secondary, --on-secondary, --secondary-container, --on-secondary-container
--tertiary, --on-tertiary, --tertiary-container, --on-tertiary-container
--error, --on-error, --error-container, --on-error-container
--surface, --on-surface, --on-surface-variant
--surface-container, --surface-container-low, --surface-container-high
--surface-container-lowest, --surface-container-highest
--outline, --outline-variant
--inverse-surface, --inverse-on-surface, --inverse-primary
--scrim, --background, --on-background
--primary-hover, --primary-pressed
--secondary-hover, --secondary-pressed
--tertiary-hover, --tertiary-pressed
--error-hover, --error-pressed
```

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

## 시맨틱 토큰 사용

| 용도             | 시맨틱 토큰                      | tint fallback                      |
| ---------------- | -------------------------------- | ---------------------------------- |
| 주요 강조 배경   | `--highlight-background`         | `oklch(from var(--tint) 55% c h)`  |
| 주요 강조 텍스트 | `--highlight-foreground`         | `white`                            |
| 포커스 링        | `--focus-ring-color`             | `var(--tint-1000)`                 |
| 링크 색상        | `--link-color`                   | `var(--tint-1200)`                 |
| 일반 텍스트      | `--text-color`                   | `var(--color-neutral-900)`         |
| 비활성 텍스트    | `--text-color-disabled`          | `var(--color-neutral-500)`         |
| 플레이스홀더     | `--text-color-placeholder`       | `var(--color-neutral-700)`         |
| 테두리           | `--border-color`                 | `var(--color-neutral-300)`         |
| 테두리 hover     | `--border-color-hover`           | `var(--color-neutral-400)`         |
| 입력 배경        | `--field-background`             | `var(--color-neutral-50)`          |
| 오버레이 배경    | `--overlay-background`           | `var(--color-neutral-50)`          |
| 버튼 배경        | `--button-background`            | `var(--color-neutral-50)`          |
| 에러             | `--invalid-color`                | `var(--color-error-400)`           |
| 흰색/검정        | `--color-white`, `--color-black` | `#fff`, `#000` (shared-tokens.css) |

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
