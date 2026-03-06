# ADR-029: Builder CSS Dead Code 정리 — 유령 변수, 미사용 토큰, 모놀리식 파일 분리

## Status

Complete (2026-03-07)

## Context

### 문제 정의

ADR-017(M3 토큰 제거)과 ADR-022(S2 토큰 전환)를 거치면서 CSS 변수 체계가 대폭 정리되었으나, 마이그레이션 과정에서 **정의가 삭제된 변수의 참조**와 **소비처 없는 변수 정의**가 잔존하고 있다. 또한 Builder 전용 CSS 일부가 단일 파일에 과도하게 집중되어 있다.

코드베이스 전수 조사(2026-03-06) 결과:

| 유형                                                      | 건수           | 심각도   | 설명                               |
| --------------------------------------------------------- | -------------- | -------- | ---------------------------------- |
| 유령 변수 참조 (`--color-surface-{N}`)                    | 120건 / 22파일 | **HIGH** | 정의 없는 변수 사용 → 빈 값 평가   |
| 유령 변수 참조 (`--builder-surface-bg`, `--builder-text`) | 3건 / 1파일    | LOW      | 정의 없는 변수 사용                |
| Dead 변수 정의 (`--oai-*`)                                | 21건 / 1파일   | LOW      | 정의만 존재, 소비처 0건            |
| 모놀리식 CSS (`components/styles/index.css`)              | 2,267줄        | MEDIUM   | Builder 공통 스타일 단일 파일 집중 |
| 모놀리식 CSS (`EventsPanel.css`)                          | 2,618줄        | MEDIUM   | 단일 패널 CSS 최대 크기            |

### `--color-surface-{N}` 유령 변수 상세

`shared-tokens.css`에 정의된 surface 변수:

```css
/* 정의됨 (5개) */
--color-surface: var(--gray-0);
--color-surface-secondary: var(--gray-50);
--color-surface-tertiary: var(--gray-75);
--color-surface-elevated: var(--gray-0);
--color-surface-elevated-secondary: var(--gray-50);
```

그러나 실제 사용되는 변수:

```css
/* 정의 없음 - 120건 사용 */
var(--color-surface-50)   /* → --color-surface-secondary로 교체 */
var(--color-surface-100)  /* → --color-surface-tertiary 또는 --gray-100 */
var(--color-surface-200)  /* → --gray-200 또는 시맨틱 변수 */
var(--color-surface-700)  /* → --gray-700 또는 시맨틱 변수 */
```

원인: M3 체계에서 `--color-surface-50` ~ `--color-surface-700` 팔레트가 존재했으나, ADR-017에서 정의를 삭제하면서 참조 치환이 누락됨.

영향: CSS `var()` fallback 없이 빈 값 → `background: ;` 로 평가되어 투명 배경 렌더링. 시각적으로 "동작하는 것처럼 보이지만" 의도된 색상이 아님.

### `--oai-*` Dead 변수

```css
/* shared-tokens.css에 21개 정의 — 소비처 0건 */
--oai-bg-primary: var(--gray-0);
--oai-bg-secondary: var(--gray-50);
--oai-text-primary: var(--gray-1000);
/* ... 등 */
```

외부 프레임워크(OpenAI 스타일 가이드 추정)에서 복사된 변수로, XStudio 어디에서도 참조하지 않는 완전한 dead code.

### `--builder-surface-bg`, `--builder-text` 미정의

```css
/* overlay/index.css:119-121 */
.overlay-stats {
  background: var(--builder-surface-bg); /* 미정의 */
  color: var(--builder-text); /* 미정의 */
  border: 1px solid var(--builder-border); /* forced-colors에서만 정의 */
}
```

`--builder-border`는 `builder-system.css`의 `@media (forced-colors: active)` 블록에만 정의. 정상 모드에서 3개 변수 모두 빈 값.

### 모놀리식 CSS 파일

| 파일                               | 줄 수 | 내용                                                          |
| ---------------------------------- | ----- | ------------------------------------------------------------- |
| `components/styles/index.css`      | 2,267 | Panel 시스템, 공통 컴포넌트, Inspector 레이아웃 혼재          |
| `panels/events/EventsPanel.css`    | 2,618 | 단일 패널 — block editor, condition, action, flow 스타일 혼재 |
| `panels/monitor/monitor-panel.css` | 1,138 | 단일 패널 — 분리 후보                                         |

`components/styles/index.css`는 `panel-btn`, `panel-wrapper`, `panel-header`, Inspector 레이아웃, 공통 폼 등 **역할이 다른 스타일**이 하나의 `@layer builder-system` 블록에 혼재.

### Hard Constraints

| 제약               | 설명                                                             |
| ------------------ | ---------------------------------------------------------------- |
| 시각 회귀 금지     | 유령 변수 교체 시 기존 렌더링 결과 유지 (빈 값 → 명시적 동일 값) |
| ADR-017/022 정합성 | S2 시맨틱 토큰 체계 준수                                         |
| ADR-028과 독립     | 스코프 격리와 병행 가능하되 의존 없음                            |
| 번들 < 500KB       | 파일 분리 시 중복 증가 없음                                      |

## Decision

3단계 점진적 정리: 유령 변수 치환 → Dead code 제거 → 모놀리식 파일 분리

### 위험 평가

| 축           | 수준 | 근거                                                    |
| ------------ | :--: | ------------------------------------------------------- |
| 기술         |  L   | CSS 변수 rename/삭제 — 검증된 작업                      |
| 성능         |  L   | 변수 감소 → CSS 파싱 미세 개선                          |
| 유지보수     |  L   | 유령 변수 제거로 인지 부하 감소                         |
| 마이그레이션 |  M   | Phase 1의 120건 치환은 자동화 스크립트 + 수동 검증 필요 |

### 채택 근거

1. **유령 변수 120건**은 "동작하지만 잘못된" 상태 — 향후 디자인 토큰 변경 시 의도치 않은 회귀 유발
2. Dead 변수 21건 제거로 `shared-tokens.css` 가독성 확보
3. 모놀리식 파일 분리는 ADR-018(utilities 패턴) 진행 시 병합 충돌 감소
4. ADR-017 마이그레이션의 잔여 작업 완결

## Implementation

### Phase 1: 유령 변수 치환 (HIGH)

`--color-surface-{N}` 120건을 정의된 시맨틱 변수 또는 gray 스케일로 교체.

#### 매핑 테이블

| 유령 변수             | 교체 대상                        | 근거                             |
| --------------------- | -------------------------------- | -------------------------------- |
| `--color-surface-0`   | `var(--color-surface)`           | `--gray-0` 기반, 정의 존재       |
| `--color-surface-50`  | `var(--color-surface-secondary)` | `--gray-50` 기반, 정의 존재      |
| `--color-surface-100` | `var(--gray-100)`                | 시맨틱 변수 없음, gray 직접 참조 |
| `--color-surface-200` | `var(--gray-200)`                | 시맨틱 변수 없음, gray 직접 참조 |
| `--color-surface-300` | `var(--gray-300)`                | 시맨틱 변수 없음, gray 직접 참조 |
| `--color-surface-700` | `var(--gray-700)`                | 시맨틱 변수 없음, gray 직접 참조 |

#### 대상 파일 (22파일, 120건)

**Builder (21파일, 111건)**:

- `components/styles/index.css` (14건)
- `panels/events/EventsPanel.css` (45건)
- `panels/datatable/` 하위 6파일 (39건)
- `panels/designKit/DesignKitPanel.css` (5건)
- 기타 5파일 (8건)

**Shared (4파일, 9건)**:

- `styles/Slot.css` (3건), `ColorArea.css` (1건), `ColorSlider.css` (1건), `ColorWheel.css` (1건)
- `CollectionErrorState.css` (3건)

#### 자동화

```bash
# 1차: 자동 치환
sed -i '' 's/--color-surface-50/--color-surface-secondary/g' <files>
sed -i '' 's/--color-surface-100/--gray-100/g' <files>
sed -i '' 's/--color-surface-200/--gray-200/g' <files>
sed -i '' 's/--color-surface-700/--gray-700/g' <files>

# 2차: 수동 검증 — 각 파일의 맥락에서 시맨틱 변수가 더 적절한지 확인
```

### Phase 2: Dead Code 제거 (LOW)

#### 2-1. `--oai-*` 변수 제거

`shared-tokens.css`에서 `--oai-` 접두사 변수 21개 정의 삭제.

```css
/* 삭제 대상 (shared-tokens.css) */
--oai-bg-primary: var(--gray-0);
--oai-bg-secondary: var(--gray-50);
--oai-bg-tertiary: var(--gray-100);
--oai-text-primary: var(--gray-1000);
--oai-text-secondary: var(--gray-500);
--oai-text-tertiary: var(--gray-400);
--oai-border: var(--gray-100);
--oai-border-light: var(--gray-75);
--oai-border-hover: var(--gray-200);
--oai-dark-bg-primary: var(--gray-800);
--oai-dark-bg-secondary: var(--gray-700);
/* ... 등 21개 */
```

#### 2-2. `--builder-surface-bg`, `--builder-text` 수정

`overlay/index.css`의 `.overlay-stats`에서 미정의 변수를 시맨틱 변수로 교체:

```css
/* Before */
background: var(--builder-surface-bg);
color: var(--builder-text);
border: 1px solid var(--builder-border);

/* After */
background: var(--overlay-background);
color: var(--text-color);
border: 1px solid var(--border-color);
```

### Phase 3: 모놀리식 CSS 분리 (MEDIUM)

#### 3-1. `components/styles/index.css` (2,267줄) 분리

| 분리 파일              | 내용                                                              | 추정 줄 수 |
| ---------------------- | ----------------------------------------------------------------- | ---------- |
| `panel-system.css`     | `.panel-wrapper`, `.panel-header`, `.panel-body`, `.panel-footer` | ~400       |
| `panel-btn.css`        | `.panel-btn` 변수 + 스타일                                        | ~40        |
| `inspector-layout.css` | Inspector 전용 레이아웃 (grid, sections)                          | ~600       |
| `form-controls.css`    | 공통 폼 요소 (input, select, checkbox 오버라이드)                 | ~400       |
| `index.css`            | 나머지 공통 + import 허브                                         | ~800       |

`index.ts`의 `import "./index.css"` 하나로 유지 — `index.css` 내부에서 `@import`로 분리 파일 로드.

#### 3-2. `EventsPanel.css` (2,618줄) 분리

| 분리 파일                     | 내용                             | 추정 줄 수 |
| ----------------------------- | -------------------------------- | ---------- |
| `events/block-editor.css`     | Block 에디터 (WHEN/IF/THEN/ELSE) | ~800       |
| `events/condition-editor.css` | 조건 편집기                      | ~600       |
| `events/action-editor.css`    | 액션 편집기                      | ~600       |
| `events/flow-canvas.css`      | 플로우 캔버스                    | ~400       |
| `EventsPanel.css`             | 나머지 공통 + import 허브        | ~200       |

## Gates

| Gate | 시점       | 통과 조건                                                                            | 실패 시 대안               |
| ---- | ---------- | ------------------------------------------------------------------------------------ | -------------------------- |
| G1   | Phase 1 후 | 유령 변수 0건 (`grep --color-surface-\d` 결과 없음) + Builder/Preview 시각 회귀 없음 | 매핑 테이블 수정 후 재치환 |
| G2   | Phase 2 후 | `--oai-` grep 결과 0건 + `overlay-stats` 정상 렌더링                                 | 변수 복원                  |
| G3   | Phase 3 후 | `pnpm type-check` 통과 + CSS import 체인 정상 + 번들 크기 변화 < 1KB                 | 분리 롤백                  |

## Consequences

### Positive

1. **유령 변수 120건 해소**: "동작하지만 잘못된" 상태 제거 — 빈 값 대신 의도된 색상 적용
2. **Dead code 21건 제거**: `shared-tokens.css` 가독성 향상
3. **파일 분리**: 2,000줄 이상 모놀리식 파일 해소 → 병합 충돌 감소, 코드 탐색 용이
4. **ADR-017 잔여 작업 완결**: M3→S2 마이그레이션의 누락 치환 마무리

### Negative

1. **Phase 1 수동 검증 필요**: 120건 중 일부는 맥락에 따라 `--gray-{N}` 대신 시맨틱 변수가 더 적절할 수 있음 — 자동화 후 수동 리뷰 필수
2. **Phase 3 파일 수 증가**: CSS 파일 ~8개 추가 — 단, Vite 번들링으로 production 영향 없음
3. **Phase 3는 ADR-018과 타이밍 조율 필요**: utilities 패턴 전환 중 동일 파일 수정 시 충돌 가능 — ADR-018 Phase 2 완료 후 진행 권장

## References

### Internal

- ADR-017: CSS Override SSOT (M3 토큰 제거 — Phase 1에서 정의 삭제)
- ADR-018: Component CSS Restructure (utilities 패턴 — Phase 3 타이밍 조율)
- ADR-022: S2 Color Token (시맨틱 토큰 체계)
- ADR-028: Builder CSS Scope Isolation (병행 가능, 의존 없음)
