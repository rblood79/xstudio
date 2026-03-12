# ADR-036: Spec-First Single Source — CSS 자동 생성 기반 이중 렌더링 통합

## Status

Proposed

## Date

2026-03-13

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-017](completed/017-css-token-architecture.md): CSS 토큰 아키텍처
- [ADR-018](completed/018-css-utility-classes.md): CSS Utility 클래스 체계
- [ADR-021](021-theme-system-redesign.md): Theme System 재설계
- [ADR-022](completed/022-s2-color-token.md): S2 색상 토큰 전환
- [ADR-023](completed/023-s2-variant-props.md): S2 Variant Props

---

## Context

XStudio는 Skia/WebGL 캔버스 (빌더) + DOM (Preview/Publish) 이중 렌더링 아키텍처를 사용한다.
현재 컴포넌트 시각 정의가 3곳에 분산되어 있어 **3중 동기화 고통**이 존재한다.

### 문제 1. 스타일 정의 3중 분산

| 파일 그룹                                     | 역할                                       | 규모                 |
| --------------------------------------------- | ------------------------------------------ | -------------------- |
| `packages/shared/src/components/styles/*.css` | React Aria 컴포넌트용 CSS                  | 68개 파일, ~13,742줄 |
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

### 기회 신호

| 파일                                                  | 의미                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/specs/src/renderers/CSSGenerator.ts`        | 이미 존재하는 Spec→CSS 생성기 (276줄) — POC 수준으로 동작          |
| `packages/specs/src/renderers/utils/tokenResolver.ts` | `tokenToCSSVar()` 매핑 완비                                        |
| `apps/builder/.../canvas/skia/specTextStyle.ts`       | Spec에서 직접 font 속성 추출하는 선례                              |
| `apps/builder/.../engines/utils.ts`                   | SIZE_CONFIG 수동 중복 존재 — `specTextStyle.ts` 패턴으로 대체 가능 |

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

### 대안 C: Spec 선언적 메타데이터 기반 CSS 자동 생성 (하이브리드)

- 설명: `shapes()`가 아닌 Spec의 `variants`/`sizes`/`states` 계층에서 CSS 자동 생성. 복합 컴포넌트는 structural.css(수동) + theme.css(자동) 2-layer로 분리
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(M)

장점:

- `CSSGenerator.ts`가 이미 동작 중 (신규 개발이 아닌 확장)
- `specTextStyle.ts` 선례로 Phase 0의 타당성 입증
- 대안 B의 역추론 위험 회피
- 복합 컴포넌트 ~30개의 구조적 CSS는 수동 유지, 테마 CSS만 자동화

단점:

- CSSGenerator 확장 투자 필요 (gap, line-height, icon-size 등)
- 자동 생성 CSS 디버깅이 수동 CSS보다 어려울 수 있음
- 빌드 파이프라인에 CSS 생성 단계 추가

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

### Risk Threshold Check

| 대안 | 기술  | 성능 | 유지보수 | 마이그레이션 | 판정        |
| ---- | ----- | ---- | -------- | ------------ | ----------- |
| A    | L     | L    | **H**    | L            | 장기 부적합 |
| B    | **H** | L    | M        | **H**        | 구조적 한계 |
| C    | M     | L    | L        | M            | **채택**    |
| D    | M     | L    | L        | **H**        | 과잉 의존성 |

대안 C가 최적이다:

1. `CSSGenerator.ts`가 이미 POC 수준으로 동작 (신규 개발 아닌 확장)
2. `specTextStyle.ts`의 "Spec에서 직접 읽기" 선례가 Phase 0의 타당성 입증
3. 대안 B의 "shapes → CSS" 역추론의 원리적 한계를 회피
4. 대안 D의 외부 도구 의존성 없이 내부 인프라만으로 해결

---

## Decision

**대안 C: Spec 선언적 메타데이터(`variants`/`sizes`/`states`)를 Single Source로 승격하고, CSS를 자동 생성하는 하이브리드 접근을 채택한다.**

핵심 원칙:

- `shapes()`는 Skia 전용 산출물로 유지 — 역추론하지 않는다
- Spec의 `variants`/`sizes`/`states`가 CSS와 shapes **양쪽**의 원천이 된다
- 복합 컴포넌트의 구조적 CSS (layout, pseudo-elements, transitions)는 수동 유지한다
- 복합 컴포넌트의 테마 CSS (colors, sizes, border-radius)는 Spec에서 자동 생성한다

### Rationale

> **`shapes()`는 CSS의 source가 될 수 없다.** shapes는 정적 좌표 스냅샷이고, CSS는 선언적 스타일 시스템이다. 하지만 **Spec의 `variants`/`sizes`/`states`** 는 shapes보다 한 단계 추상적이어서, CSS와 shapes **양쪽으로** 변환 가능하다. 이것이 `CSSGenerator.ts`가 이미 동작하는 이유다.

업계 비교:

| 도구        | 렌더러                   | CSS 출력 | XStudio와의 차이                    |
| ----------- | ------------------------ | -------- | ----------------------------------- |
| Figma       | Skia 전용                | 없음     | 웹 런타임 불필요                    |
| Framer      | React = Canvas = DOM     | 있음     | Skia 미사용                         |
| Webflow     | DOM iframe               | 있음     | 자체 렌더 엔진 없음                 |
| **XStudio** | **Skia + DOM 이중 출력** | **필요** | **추상 메타데이터가 single source** |

XStudio는 Skia + DOM 이중 출력이 필요한 고유한 케이스다. 업계 표준이 없으므로 Spec 추상 메타데이터를 single source로 삼는 것이 현실적인 선택이다.

---

## Gates

| 게이트 | 조건                                                                             | 위험 등급 |
| ------ | -------------------------------------------------------------------------------- | --------- |
| G0     | `generateCSS(ButtonSpec)` 출력과 현재 `Button.css` diff — 누락 속성 0건          | M         |
| G1     | `pnpm type-check` 통과 + Builder에서 Button/ToggleButton 5개 size 시각 비교 동일 | M         |
| G2     | 단순 컴포넌트 교체 후 모든 variant × size 조합 스크린샷 비교 통과                | M         |
| G3     | 복합 컴포넌트 structural + theme 합산이 원본 CSS와 시각적 동일                   | M         |

잔존 HIGH 위험: 없음.

---

## Implementation

### Phase 0: SIZE_CONFIG 제거 (즉시, 저위험)

기존 `BUTTON_SIZE_CONFIG`, `TOGGLEBUTTON_SIZE_CONFIG` 등을 Spec의 `sizes`에서 직접 import하도록 변경한다.

**대상 파일:**

- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`
  - `BUTTON_SIZE_CONFIG` → `ButtonSpec.sizes` import
  - `TOGGLEBUTTON_SIZE_CONFIG` → `ToggleButtonSpec.sizes` import
  - 기타 SIZE_CONFIG → 해당 Spec의 `sizes` import

**선례:** `specTextStyle.ts`가 이미 Spec에서 직접 font 속성을 추출하는 패턴을 사용 중이다.

검증:

- [ ] `pnpm type-check` 통과
- [ ] Builder에서 Button/ToggleButton 5개 size 시각 비교 (전후 동일)
- [ ] Preview에서 동일 비교
- [ ] `BUTTON_SIZE_CONFIG` grep 결과 0건

### Phase 1: CSSGenerator 확장 + 빌드 통합

기존 `CSSGenerator.ts` (276줄)를 실제 컴포넌트 CSS와 동등한 수준으로 확장한다.

**확장 대상 속성:**

| 속성                       | 현재 상태       | 확장 방법                    |
| -------------------------- | --------------- | ---------------------------- |
| `gap`                      | optional 처리됨 | 항상 출력                    |
| `line-height`              | 미지원          | `--text-*--line-height` 참조 |
| `icon-size`                | 미지원          | `Spec.sizes.iconSize`        |
| `font-weight`              | 미지원          | Spec 메타데이터에서 추출     |
| `border-width`             | 미지원          | `Spec.sizes.borderWidth`     |
| `min-width` / `min-height` | 미지원          | 일부 컴포넌트                |

**빌드 통합:**

- `pnpm build:specs` 시 CSS 파일도 자동 생성
- 출력 경로: `packages/shared/src/components/styles/generated/[Component].css`
- `package.json` scripts에 `generate:css` 추가

**대상 파일:**

- `packages/specs/src/renderers/CSSGenerator.ts` — 확장
- `packages/specs/package.json` — `generate:css` 스크립트 추가

검증:

- [ ] `generateCSS(ButtonSpec)` 출력과 현재 `Button.css` diff — 누락 속성 0건
- [ ] Badge, Link, ToggleButton 동일 검증

### Phase 2: 단순 컴포넌트 CSS 자동 생성 전환 (~40개)

pseudo-element가 없는 단순 컴포넌트의 수동 CSS를 자동 생성 CSS로 교체한다.

**1차 대상 (가장 단순한 컴포넌트):**

- Button, Badge, Link, ToggleButton, Separator, Tooltip

**2차 대상:**

- TextField, NumberField, SearchField, TextArea
- Select, ComboBox (trigger 부분)
- Card, Panel (기본 스타일)

**3차 대상:**

- ProgressBar, Meter, Skeleton
- Tab, Tag, Breadcrumbs
- Dialog, Modal (기본 스타일)

검증:

- [ ] 각 컴포넌트 교체 후 Preview DOM 렌더링 시각 비교
- [ ] 모든 variant × size 조합 스크린샷 비교
- [ ] 다크모드 + Tint 변경 후 비교

### Phase 3: 복합 컴포넌트 2-layer CSS 분리 (~30개)

Switch, Slider, Checkbox 등 pseudo-element/transition이 필수인 복합 컴포넌트의 CSS를 두 레이어로 분리한다.

**분리 구조:**

```
Switch.css (현재, 수동)
  ↓ 분리
Switch.structural.css  — 수동 유지 (layout, pseudo-elements, transitions)
Switch.theme.css       — 자동 생성 (colors, sizes, border-radius from Spec)
```

**대상 컴포넌트 (pseudo-elements 사용):**

| 컴포넌트 | pseudo-element / 복합 패턴              |
| -------- | --------------------------------------- |
| Switch   | `::before` thumb                        |
| Checkbox | 체크마크 SVG 경로                       |
| Radio    | `::before` dot                          |
| Slider   | `::before` track, `grid-template-areas` |
| Calendar | grid layout                             |
| Table    | 복합 레이아웃                           |

검증:

- [ ] structural + theme 합산이 원본 CSS와 시각적 동일
- [ ] theme.css만 교체해도 구조 유지 확인
- [ ] variant/size 변경 시 theme만 자동 생성으로 커버 가능 확인

### Phase 4: Spec-First 워크플로우 확립 (장기)

Phase 0–3 완료 후, 새 컴포넌트는 Spec-first로 설계한다.

**워크플로우:**

1. Spec 정의 (`variants`/`sizes`/`states`/`shapes`) 작성
2. `pnpm build:specs` → CSS 자동 생성 + Spec shapes Skia 반영
3. React Aria 컴포넌트에서 자동 생성 CSS import
4. 복합 컴포넌트만 `structural.css` 수동 추가

**문서화:**

- SKILL.md에 Spec-First 워크플로우 추가
- 새 컴포넌트 체크리스트 업데이트

---

## Execution Guardrails

1. **Phase별 1커밋 원칙** — 각 Phase 완료 후 `type-check` + 시각 검증 후 커밋
2. **시각 비교 필수** — CSS 교체 전후 Builder(Skia) + Preview(DOM) 스크린샷 비교
3. **점진적 전환** — 한 번에 전체 교체하지 않고 컴포넌트별 단계적 전환
4. **롤백 가능** — 기존 수동 CSS는 `.manual-backup/` 보관 (전환 완료 후 삭제)

---

## Metrics / Verification

### 정량 메트릭

| 메트릭             | 단위 | Baseline (현재) | Phase 0 후 | Phase 2 후 | Phase 3 후 |
| ------------------ | ---- | --------------- | ---------- | ---------- | ---------- |
| 수동 동기화 포인트 | 개   | ~10 (`@sync`)   | ~7         | ~3         | 0          |
| CSS 중복 라인      | 줄   | ~13,000 (추정)  | ~12,500    | ~5,000     | ~3,000     |
| 수동 SIZE_CONFIG   | 개   | 5+              | 0          | 0          | 0          |
| 불일치 버그 위험   | 등급 | H               | M          | L          | L          |

### 수동 검증 체크리스트

- [ ] Button: 5 sizes × 6 variants × 4 states = 120 조합 시각 비교
- [ ] Badge: 22 variants × 2 fill styles = 44 조합
- [ ] Switch/Checkbox/Radio: 2 states × 3 sizes = 6 조합 structural 유지 확인
- [ ] 다크모드: 전체 컴포넌트 light/dark 전환 검증
- [ ] Tint 변경: 10 tint preset × 대표 컴포넌트 5개 = 50 조합

---

## Consequences

### Positive

1. **3중 → 1중 동기화**: Spec 변경만으로 CSS + Skia 양쪽 반영
2. **테마 다양화 비용 대폭 감소**: Spec variants만 수정하면 CSS 자동 갱신
3. **SIZE_CONFIG 수동 중복 제거**: 레이아웃 엔진과 CSS 간 불일치 버그 근절
4. **새 컴포넌트 추가 비용 절감**: 단순 컴포넌트는 CSS 수동 작성 불필요
5. **`// @sync` 주석 의존 제거**: 암묵적 동기화 계약이 명시적 생성 관계로 전환

### Negative

1. **자동 생성 CSS 디버깅 난이도**: 수동 CSS보다 추적이 어려울 수 있음 (헤더 주석 `DO NOT EDIT MANUALLY`로 완화)
2. **복합 컴포넌트 분리 작업**: structural/theme 분리가 일회성 작업이지만 초기 비용 존재
3. **CSSGenerator 확장 투자**: gap, line-height, icon-size 등 추가 속성 지원 필요
4. **빌드 파이프라인 증가**: `pnpm build:specs`에 CSS 생성 단계 추가

---

## References

- `packages/specs/src/renderers/CSSGenerator.ts` — 기존 CSS 생성기 (POC)
- `packages/specs/src/renderers/utils/tokenResolver.ts` — `tokenToCSSVar()` 매핑
- `apps/builder/src/builder/workspace/canvas/skia/specTextStyle.ts` — Spec 직접 읽기 선례
- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` — SIZE_CONFIG (Phase 0 제거 대상)
- `packages/shared/src/components/styles/Button.css` — 수동 CSS 대표 예시
- `packages/specs/src/components/Button.spec.ts` — Spec 정의 대표 예시
- [ADR-022](completed/022-s2-color-token.md) — S2 색상 토큰 (tokenToCSSVar 체계)
- [ADR-021](021-theme-system-redesign.md) — Theme System (tint/darkMode 통합)
