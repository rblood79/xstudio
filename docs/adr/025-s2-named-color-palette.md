# ADR-025: S2 Named Color Palette 확장

## Status

Accepted (2026-03-08) — Phase 1~3 구현 완료, Phase 4 (Inspector UI) 미구현

## Context

### 문제 정의

ADR-022에서 시맨틱 색상 토큰(accent, neutral, negative 등)을 S2 체계로 전환했으나, **Named Color Palette**(Badge, Tag, Status 등에 사용되는 개별 색상)는 제한적:

| 현재 지원                                        | S2 Named Colors (22색)                                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purple` (ADR-022에서 추가)                      | `red`, `orange`, `yellow`, `green`, `seafoam`, `cyan`, `blue`, `indigo`, `purple`, `fuchsia`, `magenta`, `pink`, `turquoise`, `cinnamon`, `brown`, `silver`, `charcoal` + 각각 `-subtle` |
| Tailwind 팔레트 직접 참조 (`--color-red-600` 등) | 토큰화된 시맨틱 이름 (`{color.red}`, `{color.red-subtle}`)                                                                                                                               |

**문제점**:

1. Badge/Tag에서 다양한 색상이 필요하지만 `{color.purple}` 외에는 Spec 토큰이 없음
2. `--color-red-600` 같은 팔레트 직접 참조는 Light/Dark 모드 대응 불가
3. S2 `style()` 매크로의 `backgroundColor` 타입과 불일치 → 향후 호환성 문제

### Hard Constraints

- ADR-022 시맨틱 토큰 (accent, neutral, negative, informative, positive, notice) 유지
- 팔레트 색상은 Tailwind CSS v4 기본 팔레트 hex 값 사용 (디자인 일관성)
- Light/Dark 모드 양쪽에 대응하는 값 쌍 필수
- `tokenResolver.ts`의 기존 구조(COLOR_TOKEN_TO_CSS + resolveToken) 유지

## Alternatives Considered

### 대안 A: S2 22색 전체 도입

- 설명: S2 `style()` 매크로가 지원하는 22색 전체 + 각 `-subtle` variant = 44개 토큰 추가. ColorTokens 인터페이스에 전부 포함
- 위험:
  - 기술: **L** — 단순 색상값 추가
  - 성능: **L** — 토큰 테이블 크기만 증가
  - 유지보수: **M** — 44개 토큰 × Light/Dark = 88개 값 관리
  - 마이그레이션: **L** — 추가만, 기존 코드 변경 없음

### 대안 B: 핵심 12색 + subtle 선별 도입

- 설명: 실제 XStudio에서 사용 빈도가 높은 12색만 도입. S2의 `seafoam`, `cinnamon`, `brown`, `silver`, `charcoal` 등 특수 색상은 제외
- 위험:
  - 기술: **L** — 단순 색상값 추가
  - 성능: **L** — 토큰 테이블 크기만 증가
  - 유지보수: **L** — 24개 토큰 × Light/Dark = 48개 값 관리 (적정 규모)
  - 마이그레이션: **L** — 추가만, 기존 코드 변경 없음

### 대안 C: Tailwind 팔레트 직접 참조 유지

- 설명: Named color가 필요한 곳에서 `--color-red-600` 같은 Tailwind CSS 변수를 직접 사용. Spec 토큰화하지 않음
- 위험:
  - 기술: **L** — 변경 없음
  - 성능: **L** — 변경 없음
  - 유지보수: **H** — Dark 모드 대응 불가, Spec shapes에서 CSS 변수 직접 참조 불가 (Skia 렌더링)
  - 마이그레이션: **L** — 변경 없음

## Decision

**대안 B: 핵심 12색 + subtle 선별 도입** 채택

위험 수용 근거: 22색 전체는 관리 부담 대비 사용 빈도 낮음. 핵심 12색으로 Badge/Tag/Status 사용 사례 95% 이상 커버 가능. 필요 시 점진 추가.

### 도입 색상 (12색 × 2 = 24 토큰)

| Named Color      | Light hex | Dark hex  | CSS 변수                   | 용도         |
| ---------------- | --------- | --------- | -------------------------- | ------------ |
| `red`            | `#ef4444` | `#f87171` | `var(--color-red-500)`     | 삭제, 위험   |
| `red-subtle`     | `#fee2e2` | `#450a0a` | `var(--color-red-100)`     | 배경         |
| `orange`         | `#f97316` | `#fb923c` | `var(--color-orange-500)`  | 경고, 주의   |
| `orange-subtle`  | `#ffedd5` | `#431407` | `var(--color-orange-100)`  | 배경         |
| `yellow`         | `#eab308` | `#facc15` | `var(--color-yellow-500)`  | 알림         |
| `yellow-subtle`  | `#fef9c3` | `#422006` | `var(--color-yellow-100)`  | 배경         |
| `green`          | `#22c55e` | `#4ade80` | `var(--color-green-500)`   | 성공, 완료   |
| `green-subtle`   | `#dcfce7` | `#052e16` | `var(--color-green-100)`   | 배경         |
| `cyan`           | `#06b6d4` | `#22d3ee` | `var(--color-cyan-500)`    | 정보         |
| `cyan-subtle`    | `#cffafe` | `#083344` | `var(--color-cyan-100)`    | 배경         |
| `blue`           | `#3b82f6` | `#60a5fa` | `var(--color-blue-500)`    | 링크, 정보   |
| `blue-subtle`    | `#dbeafe` | `#172554` | `var(--color-blue-100)`    | 배경         |
| `indigo`         | `#6366f1` | `#818cf8` | `var(--color-indigo-500)`  | 보라-파랑    |
| `indigo-subtle`  | `#e0e7ff` | `#1e1b4b` | `var(--color-indigo-100)`  | 배경         |
| `purple`         | `#9333ea` | `#a855f7` | `var(--color-purple-600)`  | 프리미엄, AI |
| `purple-subtle`  | `#f3e8ff` | `#3b0764` | `var(--color-purple-100)`  | 배경         |
| `pink`           | `#ec4899` | `#f472b6` | `var(--color-pink-500)`    | 감성, 하트   |
| `pink-subtle`    | `#fce7f3` | `#500724` | `var(--color-pink-100)`    | 배경         |
| `magenta`        | `#d946ef` | `#e879f9` | `var(--color-fuchsia-500)` | 강조         |
| `magenta-subtle` | `#fae8ff` | `#4a044e` | `var(--color-fuchsia-100)` | 배경         |
| `brown`          | `#92400e` | `#b45309` | `var(--color-amber-800)`   | 토양, 자연   |
| `brown-subtle`   | `#fef3c7` | `#451a03` | `var(--color-amber-100)`   | 배경         |
| `gray`           | `#6b7280` | `#9ca3af` | `var(--color-gray-500)`    | 비활성, 보조 |
| `gray-subtle`    | `#f3f4f6` | `#1f2937` | `var(--color-gray-100)`    | 배경         |

### 구현 계획

#### Phase 1: ColorTokens 확장 + colors.ts 추가

**파일**: `packages/specs/src/types/token.types.ts`, `packages/specs/src/primitives/colors.ts`

- `ColorTokens` 인터페이스에 12색 × 2(base + subtle) = 24개 optional 속성 추가
- `lightColors` / `darkColors`에 hex 값 추가

#### Phase 2: tokenResolver.ts 매핑 추가

**파일**: `packages/specs/src/renderers/utils/tokenResolver.ts`

- `NAMED_COLOR_TO_CSS` 테이블에 12색 × 2 = 24개 항목 추가
- 기존 `purple` / `purple-subtle` 항목과 동일 패턴

#### Phase 3: Badge Spec 확장

**파일**: `packages/specs/src/components/Badge.spec.ts`

- Badge variants에 named color 기반 variant 추가 또는 `fillColor` prop으로 확장
- S2 Badge 패턴: `<Badge variant="blue">New</Badge>` — variant로 named color 직접 지정

#### Phase 4: Inspector UI

- Badge/Tag 편집 시 색상 팔레트 피커 제공
- 12색 프리셋 그리드 UI

## Gates

| Gate | 조건                                        | 확인 방법                             |
| ---- | ------------------------------------------- | ------------------------------------- |
| G1   | Phase 1~2 추가 후 기존 Spec 빌드 성공       | `pnpm build:specs && pnpm type-check` |
| G2   | resolveToken으로 12색 모두 정상 resolve     | 단위 테스트 또는 수동 확인            |
| G3   | Light/Dark 모드에서 subtle 색상 가독성 확인 | 시각적 비교                           |

## Consequences

### Positive

- Badge/Tag에서 12색 즉시 사용 가능 → 디자인 표현력 대폭 확장
- Light/Dark 모드 자동 대응 (colors.ts에 양쪽 값 정의)
- S2 named color 패턴과 호환 → 향후 S2 컴포넌트 도입 시 재사용
- Skia Canvas에서도 동일 색상 렌더링 (resolveToken 경유)

### Negative

- ColorTokens 인터페이스 24개 속성 추가 → 타입 크기 증가
- 향후 S2 22색 전체 도입 시 10개 추가 작업 필요
- Dark 모드 subtle 색상(어두운 배경) 가독성 개별 검증 필요
