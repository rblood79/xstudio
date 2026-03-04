# CSS 토큰 규칙 — M3 사용 금지 (ADR-017)

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

## 시맨틱 토큰 사용

| 용도             | 시맨틱 토큰                      |
| ---------------- | -------------------------------- |
| 주요 강조 배경   | `--highlight-background`         |
| 주요 강조 텍스트 | `--highlight-foreground`         |
| 일반 텍스트      | `--text-color`                   |
| 보조 텍스트      | `--text-color-secondary`         |
| 비활성 텍스트    | `--text-color-disabled`          |
| 플레이스홀더     | `--text-color-placeholder`       |
| 테두리           | `--border-color`                 |
| 테두리 hover     | `--border-color-hover`           |
| 입력 배경        | `--field-background`             |
| 오버레이 배경    | `--overlay-background`           |
| 버튼 배경        | `--button-background`            |
| 에러             | `--invalid-color`                |
| 흰색/검정        | `--color-white`, `--color-black` |

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
