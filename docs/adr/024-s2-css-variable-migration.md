# ADR-024: CSS 변수명 S2 체계 전환

## Status

Proposed (2026-03-05)

## Context

### 문제 정의

ADR-022에서 Spec 색상 토큰을 S2로 전환했으나, CSS 변수명은 여전히 React Aria Starter 기반의 커스텀 네이밍을 사용:

| 현재 CSS 변수              | Spec S2 토큰              | 의미론적 괴리                               |
| -------------------------- | ------------------------- | ------------------------------------------- |
| `--highlight-background`   | `{color.accent}`          | "highlight"는 텍스트 하이라이트와 혼동 가능 |
| `--highlight-foreground`   | `{color.on-accent}`       | 동일                                        |
| `--text-color`             | `{color.neutral}`         | 너무 일반적, S2 `neutral`이 더 명확         |
| `--text-color-placeholder` | `{color.neutral-subdued}` | 길고 구체적                                 |
| `--invalid-color`          | `{color.negative}`        | S2 `negative`가 더 넓은 의미                |
| `--overlay-background`     | `{color.layer-1}`         | "overlay"는 modal overlay와 혼동            |
| `--field-background`       | `{color.layer-2}`         | field 전용으로 좁은 의미                    |
| `--button-background`      | (없음)                    | 버튼 전용, 시맨틱 토큰 부재                 |

**3중 매핑 문제**: 개발자가 "accent 색상"을 사용하려면 CSS에서 `--highlight-background`, Spec에서 `{color.accent}`, JS에서 `lightColors.accent`를 각각 기억해야 함.

### Hard Constraints

- ADR-022 Spec 토큰 체계(S2 ColorTokens)는 변경하지 않음 — 이미 `accent`/`neutral`/`negative`
- ADR-023 variant Props 전환과 독립적으로 실행 가능해야 함
- Tint Color System (`--tint` + oklch 스케일) 보존
- Light/Dark 모드 hex 값 유지 (이름만 변경)
- 전환 중 기존 CSS 변수도 deprecation 기간 동안 작동해야 함

## Alternatives Considered

### 대안 A: S2 style() 매크로 네이밍 완전 채택

- 설명: `--highlight-background` → `--s2-accent`, `--text-color` → `--s2-neutral` 등 S2 접두사 사용. `tokenResolver.ts`에서 `COLOR_TOKEN_TO_CSS`를 새 변수명으로 매핑
- 위험:
  - 기술: **L** — 단순 rename, 로직 변경 없음
  - 성능: **L** — CSS custom properties 이름만 변경
  - 유지보수: **L** — Spec↔CSS 1:1 매핑으로 인지 부하 최소
  - 마이그레이션: **H** — preview-system.css, builder-system.css, 컴포넌트 CSS 60+파일, ThemeStudio 오버라이드, tokenResolver.ts 전체 변경

### 대안 B: 점진적 alias 전환

- 설명: 새 S2 변수명을 alias로 추가 (`--s2-accent: var(--highlight-background)`), 점진적으로 컴포넌트 CSS에서 새 이름 사용, 일정 기간 후 구 이름 제거
- 위험:
  - 기술: **L** — alias로 양쪽 공존
  - 성능: **L** — CSS custom property chain 1단계 추가 (무시 가능)
  - 유지보수: **M** — 과도기에 두 이름 공존 → 어떤 이름을 써야 하는지 혼란
  - 마이그레이션: **L** — 단계별 전환, 롤백 용이

### 대안 C: 현상 유지

- 설명: CSS 변수명 변경하지 않음. Spec↔CSS 매핑은 `tokenResolver.ts`의 `COLOR_TOKEN_TO_CSS` 테이블이 중간 역할
- 위험:
  - 기술: **L** — 변경 없음
  - 성능: **L** — 변경 없음
  - 유지보수: **H** — 3중 매핑 영구화, 새 개발자 온보딩 비용 증가
  - 마이그레이션: **L** — 변경 없음

## Decision

**대안 B: 점진적 alias 전환** 채택

위험 수용 근거: 60+ CSS 파일 동시 변경은 ADR-017/018 규모의 대작업이므로 점진적 전환이 안전. alias 기간을 두면 ThemeStudio 오버라이드, 외부 커스텀 CSS 등도 자연스럽게 마이그레이션 가능.

### Phase 1: S2 alias 정의

**파일**: `packages/shared/src/components/styles/theme/shared-tokens.css`

```css
:root {
  /* S2 semantic aliases — 기존 변수의 새 이름 */
  --s2-accent: var(--highlight-background);
  --s2-accent-hover: color-mix(in srgb, var(--s2-accent) 85%, black);
  --s2-accent-pressed: color-mix(in srgb, var(--s2-accent) 75%, black);
  --s2-on-accent: var(--highlight-foreground);
  --s2-accent-subtle: var(--color-primary-100);

  --s2-neutral: var(--text-color);
  --s2-neutral-subdued: var(--text-color-placeholder);
  --s2-neutral-subtle: var(--color-neutral-200);

  --s2-negative: var(--invalid-color);
  --s2-on-negative: var(--color-white);
  --s2-negative-subtle: var(--color-error-100);

  --s2-base: var(--background-color);
  --s2-layer-1: var(--overlay-background);
  --s2-layer-2: var(--field-background);
  --s2-elevated: var(--color-white);

  --s2-border: var(--border-color);
  --s2-border-hover: var(--border-color-hover);

  --s2-focus-ring: var(--focus-ring-color);
}
```

### Phase 2: 컴포넌트 CSS를 새 alias로 점진 전환

- 파일 단위로 `--highlight-background` → `--s2-accent` 등 교체
- 컴포넌트 로컬 CSS 변수(`--field-accent` 등)도 S2 alias 참조로 전환
- ADR-018 유틸리티 클래스(`.button-base`, `.indicator`, `.inset`)도 S2 alias 사용

### Phase 3: 구 변수명 deprecation

- `shared-tokens.css`에서 구 변수명을 S2 alias 참조로 역전:
  ```css
  --highlight-background: var(--s2-accent); /* deprecated */
  ```
- `tokenResolver.ts`의 `COLOR_TOKEN_TO_CSS`를 S2 변수명으로 업데이트
- preview-system.css / builder-system.css의 값 정의를 S2 변수명으로 전환

### Phase 4: 구 변수명 제거

- grep으로 구 변수명 참조 확인 → 0건 확인 후 제거
- ThemeStudio 오버라이드 키도 S2 이름으로 전환

**영향 범위**:

| 파일                     | Phase | 변경 내용                        |
| ------------------------ | ----- | -------------------------------- |
| `shared-tokens.css`      | 1     | S2 alias 추가                    |
| `preview-system.css`     | 3     | 값 정의를 S2 변수명으로 전환     |
| `builder-system.css`     | 3     | 동일                             |
| `*.css` 컴포넌트 (~40개) | 2     | 점진적 참조 전환                 |
| `tokenResolver.ts`       | 3     | COLOR_TOKEN_TO_CSS 매핑 업데이트 |
| `css-tokens.md` 규칙     | 3     | S2 변수명 기준으로 재작성        |

## Gates

| Gate | 조건                                       | 확인 방법                                |
| ---- | ------------------------------------------ | ---------------------------------------- |
| G1   | Phase 1 alias 추가 후 기존 CSS 동작 무변경 | Preview 시각적 비교                      |
| G2   | Phase 2 컴포넌트 전환 후 시각적 동일       | 5개 대표 컴포넌트 비교                   |
| G3   | Phase 3 역전 후 구 변수 참조 정상          | `grep --count` 기존 변수명 사용처 0 확인 |
| G4   | Phase 4 제거 후 빌드 성공 + 시각적 동일    | `pnpm build && pnpm type-check`          |

## Consequences

### Positive

- Spec 토큰과 CSS 변수명 1:1 대응 → 3중 매핑 해소
- S2 문서 기반 온보딩 가능 ("accent = 강조 색상" 단일 개념)
- `--s2-` 접두사로 시스템 토큰 vs 사용자 커스텀 변수 구분 명확

### Negative

- 4 Phase 장기 전환 → 과도기 동안 두 변수명 공존
- 60+ CSS 파일 변경 (Phase 2) — ADR-018 규모에 준하는 대작업
- ThemeStudio 오버라이드 키 변경 시 기존 프로젝트 테마 깨질 수 있음
