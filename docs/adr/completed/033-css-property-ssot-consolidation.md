# ADR-033: CSS 속성 SSOT 통합 — 구조 속성 변수화 + 재선언 제거

## Status

Implemented

## Context

### 문제 정의

ADR-017(M3 토큰 제거), ADR-018(utilities.css 상태 스타일 변수화), ADR-028(builder ↔ preview 격리)이 완료되었음에도, **`@layer components` 내부에서 동일 CSS 속성이 컴포넌트마다 반복 재선언**되는 문제가 해결되지 않았다.

Chrome DevTools에서 Signin 페이지의 `.react-aria-Input`을 검사하면 **10개 이상의 CSS 규칙**이 동일 속성을 오버라이드하고 있다. `.react-aria-Button`은 15개 이상 파일에서 속성이 재선언된다.

**정량 분석 (코드베이스 전수 조사)**:

| 클래스                                       | 재선언 파일 수 | 속성 재선언 횟수 | 재선언율 | 비고                                                          |
| -------------------------------------------- | :------------: | :--------------: | :------: | ------------------------------------------------------------- |
| `.react-aria-Button`                         |      15+       |        36        |   ~35%   | Select, NumberField, ComboBox, SearchField이 구조 60%+ 재선언 |
| `.react-aria-Input` / `.react-aria-TextArea` |       12       |        27        |   ~33%   | base.css ↔ TextField.css 완전 중복                            |
| `.react-aria-Label`                          |       11       |        17        |   ~47%   | base.css ↔ 필드 컴포넌트 중복                                 |
| `.react-aria-FieldError`                     |       13       |        14        |   ~54%   | 대부분 불필요한 동일 값 재선언                                |

### 현재 구조의 문제점

#### 1. base.css ↔ 컴포넌트 CSS 완전 중복

```css
/* base.css — 7개 속성 */
.react-aria-Input {
  width: 100%;
  margin: 0;
  border: 1px solid;
  border-radius: var(--border-radius);
  padding: var(--spacing);
  font-size: var(--text-sm);
  line-height: var(--text-sm--line-height);
}

/* TextField.css — 동일 7개 + transition 추가 */
.react-aria-TextField .react-aria-Input {
  width: 100%;
  margin: 0;
  border: 1px solid; /* ← 완전 동일 */
  border-radius: var(--border-radius); /* ← 완전 동일 */
  padding: var(--tf-input-padding); /* ← 변수만 다름 */
  font-size: var(--tf-input-size); /* ← 변수만 다름 */
  line-height: var(--tf-input-line-height); /* ← 변수만 다름 */
  transition: all 200ms ease; /* ← 유일한 추가 */
}
```

NumberField, ComboBox, SearchField, ColorField 등도 동일 패턴으로 구조 속성을 재선언한다.

#### 2. Button 구조 속성 대량 재선언

```css
/* Button.css */
.react-aria-Button {
  display: inline-flex;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid;
  border-radius: var(--radius-md);
}

/* Select.css — 5개 구조 속성 재선언 */
.react-aria-Select .react-aria-Button {
  display: flex; /* inline-flex → flex */
  padding: var(--select-btn-padding); /* 다른 변수 */
  border: 1px solid var(--border); /* border-color 추가 */
  border-radius: var(--border-radius); /* 다른 변수 */
  justify-content: space-between; /* center → space-between */
}
/* NumberField, ComboBox, SearchField도 동일 패턴 */
```

#### 3. FieldError 불필요 재선언 (54%)

```css
/* base.css */
.react-aria-FieldError {
  font-size: var(--text-xs);
  color: var(--negative);
}

/* TextField.css — 완전히 동일한 값 */
.react-aria-TextField .react-aria-FieldError {
  font-size: var(--tf-hint-size); /* CSS 변수 md default = var(--text-xs) */
  color: var(--negative); /* ← 동일 */
}
/* SearchField, NumberField, DateField, ComboBox, Select, ColorField,
   RadioGroup, CheckboxGroup, DateRangePicker, DatePicker — 12개 파일이 동일 */
```

#### 4. ADR-018이 해결한 것과 해결하지 못한 것

| 영역                                                |            ADR-018 해결             |          현재 남은 문제           |
| --------------------------------------------------- | :---------------------------------: | :-------------------------------: |
| 상태 색상 (hover/focus/pressed)                     | `.button-base` / `.inset` 변수 위임 |                 -                 |
| 구조 속성 (padding/font-size/border-radius/display) |               미해결                |    각 컴포넌트에서 직접 재선언    |
| 불변 속성 (width:100%, margin:0, border:1px solid)  |               미해결                | base.css와 컴포넌트 CSS 이중 선언 |

### 부수 발견: M3 토큰 잔존

ADR-017에서 제거 완료로 마감했으나 일부 잔존:

| 파일         | 토큰                  | 수정 방향          |
| ------------ | --------------------- | ------------------ |
| Tree.css     | `--color-primary-900` | → `--fg-on-accent` |
| GridList.css | `--color-primary-900` | → `--fg-on-accent` |

### Hard Constraints

| 제약                           | 설명                                         |
| ------------------------------ | -------------------------------------------- |
| 번들 < 500KB                   | CSS 변수 추가로 인한 번들 증가 최소화        |
| `@layer` 순서 유지             | `components` < `utilities` cascade 순서 불변 |
| 기존 컴포넌트 시각적 변화 없음 | 1:1 등가 전환, 픽셀 단위 일치                |
| React Aria 클래스명 변경 불가  | `.react-aria-*` 자동 생성 클래스             |
| ADR-018 utilities 패턴 유지    | `.button-base`, `.inset`, `.indicator` 확장  |

## Alternatives Considered

### 대안 A: CSS 구조 변수화 (base.css SSOT + 부모 변수 위임)

base.css (또는 Button.css)를 구조 속성의 SSOT로 만들고, CSS Custom Properties의 fallback 기본값을 활용하여 부모 컴포넌트가 변수만 설정하는 패턴으로 전환한다. ADR-018 `.inset`이 상태를 변수화한 것과 동일한 접근을 구조에 적용.

```css
/* base.css — 구조 SSOT, 변수 fallback */
.react-aria-Input,
.react-aria-TextArea {
  width: 100%;
  margin: 0;
  border: 1px solid;
  border-radius: var(--border-radius);
  padding: var(--input-padding, var(--spacing));
  font-size: var(--input-font-size, var(--text-sm));
  line-height: var(--input-line-height, var(--text-sm--line-height));
  transition: all 200ms ease;
}

/* TextField.css — 속성 재선언 없이 변수만 설정 */
.react-aria-TextField {
  --input-padding: var(--tf-input-padding);
  --input-font-size: var(--tf-input-size);
  --input-line-height: var(--tf-input-line-height);
}
```

```css
/* Button.css — 구조 SSOT */
.react-aria-Button {
  display: var(--btn-display, inline-flex);
  align-items: center;
  justify-content: var(--btn-justify, center);
  padding: var(--btn-padding, var(--spacing-xs) var(--spacing-md));
  font-size: var(--btn-font-size, var(--text-sm));
  border: var(--btn-border, 1px solid);
  border-radius: var(--btn-radius, var(--radius-md));
  gap: var(--btn-gap, var(--spacing-sm));
  cursor: var(--btn-cursor, default);
}

/* Select.css — 변수만 설정 */
.react-aria-Select {
  --btn-display: flex;
  --btn-justify: space-between;
  --btn-padding: var(--select-btn-padding);
  --btn-border: 1px solid var(--border);
  --btn-radius: var(--border-radius);
  --btn-cursor: pointer;
}
```

- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(M)
- CSS Custom Properties fallback은 모든 브라우저에서 지원 (Baseline 2016)
- 마이그레이션: 82개 CSS 파일 중 재선언 존재하는 ~25개 파일 수정

### 대안 B: 불필요 재선언만 제거 (보수적 정리)

구조 변경 없이, 완전히 동일한 값을 재선언하는 CSS 규칙만 삭제한다. 변수가 다른 재선언(의도적 오버라이드)은 유지.

```css
/* Before: TextField.css */
.react-aria-TextField .react-aria-Input {
  width: 100%; /* ← 삭제 (base.css와 동일) */
  margin: 0; /* ← 삭제 */
  border: 1px solid; /* ← 삭제 */
  border-radius: var(--border-radius); /* ← 삭제 */
  padding: var(--tf-input-padding); /* ← 유지 (의도적 오버라이드) */
  font-size: var(--tf-input-size); /* ← 유지 */
  line-height: var(--tf-input-line-height); /* ← 유지 */
  transition: all 200ms ease; /* ← 유지 (추가 속성) */
}

/* After */
.react-aria-TextField .react-aria-Input {
  padding: var(--tf-input-padding);
  font-size: var(--tf-input-size);
  line-height: var(--tf-input-line-height);
  transition: all 200ms ease;
}
```

- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)
- 마이그레이션: 삭제만 수행, 새 인터페이스 도입 없음
- 유지보수 M: 의도적 오버라이드는 그대로 남아서, 향후 재선언이 다시 축적될 구조적 방지 장치 없음

### 대안 C: CSS `@scope` 기반 격리

ADR-028에서 향후 전환 옵션으로 언급한 CSS `@scope`를 사용하여 컴포넌트별 스타일 격리를 구현한다.

```css
@scope (.react-aria-TextField) {
  .react-aria-Input {
    padding: var(--tf-input-padding);
    font-size: var(--tf-input-size);
  }
}
```

- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(H)
- 기술 M: `@scope` Baseline 2024.10 — 대부분 브라우저 지원하나 일부 엣지 케이스 존재
- 마이그레이션 H: 전체 CSS 구조 `@scope` 전환 필요, `@layer`와의 상호작용 검증 필요

## Decision

**대안 A: CSS 구조 변수화** 채택 — 대안 B를 Phase 0으로 선행

### 채택 근거

1. **ADR-018 패턴 확장**: `.inset`이 상태를 `--inset-*` 변수로 위임한 것과 동일한 접근. 이미 검증된 패턴
2. **구조적 재발 방지**: 변수 위임 패턴이 SSOT를 강제하여 재선언 축적 방지 (대안 B는 방지 장치 없음)
3. **DevTools 가독성**: 속성 선언이 1곳(base/Button.css)에만 있어 디버깅 효율 증가
4. **번들 축소**: 재선언 제거 + 변수 위임으로 ~15% CSS 줄 수 감소 예상

### 위험 평가

| 축           | 수준 | 근거                                                                    |
| ------------ | :--: | ----------------------------------------------------------------------- |
| 기술         |  L   | CSS Custom Properties fallback은 Baseline 2016, 모든 주요 브라우저 지원 |
| 성능         |  L   | CSS 변수 참조 비용은 무시할 수준. 오히려 중복 제거로 파싱 부담 감소     |
| 유지보수     |  L   | 변수명 일관성으로 검색/수정 용이. ADR-018 패턴과 통합                   |
| 마이그레이션 |  M   | ~25개 파일 수정. 파일당 5~15분. Phase별 점진적 전환으로 위험 분산       |

잔존 HIGH 위험 없음.

## Implementation

### Phase 0: 불필요 재선언 제거 + M3 잔존 토큰 정리 (즉시)

동일한 값을 재선언하는 CSS 규칙을 제거한다. 시각적 변화 없는 순수 삭제 작업.

#### 0-1. FieldError 불필요 재선언 제거 (12개 파일)

base.css의 `.react-aria-FieldError { font-size: var(--text-xs); color: var(--negative); }`와 완전히 동일한 선언을 삭제한다. size 변수(`--tf-hint-size` 등)를 사용하는 경우 CSS 변수 기본값이 `--text-xs`이므로 동일한 효과.

대상 파일:

- TextField.css, SearchField.css, NumberField.css, DateField.css, TimeField.css
- ComboBox.css, Select.css, ColorField.css, RadioGroup.css, CheckboxGroup.css
- DateRangePicker.css, DatePicker.css

**예외**: `margin-top` 등 추가 속성이 있는 경우 추가 속성만 유지하고 동일 속성은 삭제.

#### 0-2. Input/TextArea 동일 값 재선언 제거

base.css와 완전히 동일한 `width: 100%`, `margin: 0`, `border: 1px solid`, `border-radius: var(--border-radius)` 선언을 각 컴포넌트 CSS에서 삭제한다.

대상: TextField.css, SearchField.css, ComboBox.css, NumberField.css, ColorField.css

#### 0-3. Label 동일 값 재선언 제거

base.css의 `.react-aria-Label { cursor: default; font-size: var(--text-sm); color: var(--fg); }`와 동일한 선언 제거.

#### 0-4. M3 토큰 잔존 정리

| 파일             | 현재                              | 수정                         |
| ---------------- | --------------------------------- | ---------------------------- |
| Tree.css:132     | `color: var(--color-primary-900)` | `color: var(--fg-on-accent)` |
| GridList.css:104 | `color: var(--color-primary-900)` | `color: var(--fg-on-accent)` |

### Phase 1: Input/TextArea 구조 변수화

#### 1-1. base.css — 변수 fallback 적용

```css
@layer components {
  .react-aria-Input,
  .react-aria-TextArea {
    width: 100%;
    margin: 0;
    border: var(--input-border, 1px solid);
    border-radius: var(--border-radius);
    padding: var(--input-padding, var(--spacing));
    font-size: var(--input-font-size, var(--text-sm));
    line-height: var(--input-line-height, var(--text-sm--line-height));
    transition: all 200ms ease;
  }
}
```

#### 1-2. 컴포넌트 CSS — 속성 재선언을 변수 설정으로 전환

```css
/* TextField.css */
.react-aria-TextField {
  --input-padding: var(--tf-input-padding);
  --input-font-size: var(--tf-input-size);
  --input-line-height: var(--tf-input-line-height);
}

/* NumberField.css */
.react-aria-NumberField {
  --input-padding: var(--spacing-3xs);
  --input-font-size: var(--text-xs);
  --input-line-height: var(--text-xs--line-height);
}

/* ComboBox.css */
.react-aria-ComboBox {
  --input-padding: var(--combo-input-padding);
  --input-font-size: var(--combo-input-size);
  --input-line-height: var(--combo-input-line-height);
}
```

#### 1-3. builder form-controls.css — 동일 패턴 적용

```css
@layer builder-system {
  .section {
    --input-border: 1px solid transparent;
    --input-padding: var(--spacing-3xs);
    --input-font-size: var(--text-xs);
    --input-line-height: var(--text-xs--line-height);
  }
}
```

### Phase 2: Button 구조 변수화

#### 2-1. Button.css — 변수 fallback 적용

```css
@layer components {
  .react-aria-Button {
    appearance: none;
    display: var(--btn-display, inline-flex);
    align-items: center;
    justify-content: var(--btn-justify, center);
    gap: var(--btn-gap, var(--spacing-sm));
    vertical-align: middle;
    text-align: center;
    margin: 0;
    outline: none;
    text-decoration: none;

    border: var(--btn-border, 1px solid);
    border-radius: var(--btn-radius, var(--radius-md));
    padding: var(--btn-padding, var(--spacing-xs) var(--spacing-md));
    font-size: var(--btn-font-size, var(--text-sm));
    cursor: var(--btn-cursor, default);
    transition: var(--btn-transition, none);

    /* Color 변수 (기존 유지) */
    --button-color: var(--fg);
    --button-text: var(--bg);
    --button-border: var(--fg);

    /* Size variants — 변수 오버라이드 */
    &[data-size="xs"] {
      --btn-padding: var(--spacing-3xs) var(--spacing-xs);
      --btn-font-size: var(--text-2xs);
      --btn-radius: var(--radius-sm);
      --btn-gap: var(--spacing-xs);
    }
    &[data-size="sm"] {
      --btn-padding: var(--spacing-2xs) var(--spacing-sm);
      --btn-font-size: var(--text-xs);
      --btn-radius: var(--radius-sm);
      --btn-gap: 6px;
    }
    &[data-size="md"] {
      --btn-padding: var(--spacing-xs) var(--spacing-md);
      --btn-font-size: var(--text-sm);
      --btn-radius: var(--radius-md);
      --btn-gap: var(--spacing-sm);
    }
    &[data-size="lg"] {
      --btn-padding: var(--spacing-sm) var(--spacing-lg);
      --btn-font-size: var(--text-base);
      --btn-radius: var(--radius-lg);
      --btn-gap: 10px;
    }
    &[data-size="xl"] {
      --btn-padding: var(--spacing-md) var(--spacing-xl);
      --btn-font-size: var(--text-lg);
      --btn-radius: var(--radius-xl);
      --btn-gap: var(--spacing-md);
    }
  }
}
```

#### 2-2. 컴포넌트 CSS — 변수 설정으로 전환

```css
/* Select.css */
.react-aria-Select {
  --btn-display: flex;
  --btn-justify: space-between;
  --btn-padding: var(--select-btn-padding);
  --btn-font-size: var(--select-btn-font-size);
  --btn-border: 1px solid var(--border);
  --btn-radius: var(--border-radius);
  --btn-cursor: pointer;
  --btn-transition: all 200ms ease;
}

/* NumberField.css */
.react-aria-NumberField {
  --btn-display: flex;
  --btn-padding: var(--nf-btn-padding);
  --btn-font-size: var(--nf-btn-size);
  --btn-border: 1px solid var(--border);
  --btn-cursor: pointer;
  --btn-transition: all 200ms ease;
}

/* ComboBox.css */
.react-aria-ComboBox {
  --btn-display: flex;
  --btn-padding: 0;
  --btn-border: none;
  --btn-radius: var(--radius-xs);
  --btn-cursor: pointer;
}

/* SearchField.css */
.react-aria-SearchField {
  --btn-padding: 0;
  --btn-border: none;
  --btn-radius: 50%;
  --btn-font-size: var(--sf-btn-size);
  --btn-cursor: pointer;
}
```

### Phase 3: Label/FieldError 변수화 + 최종 정리

#### 3-1. Label 변수화

```css
/* base.css */
.react-aria-Label {
  cursor: default;
  font-size: var(--label-font-size, var(--text-sm));
  font-weight: var(--label-font-weight, normal);
  color: var(--label-color, var(--fg));
  margin-bottom: var(--label-margin, 0);
}

/* TextField.css */
.react-aria-TextField {
  --label-font-size: var(--tf-label-size);
  --label-font-weight: 500;
  --label-margin: var(--tf-label-margin);
}
```

#### 3-2. FieldError 변수화

```css
/* base.css */
.react-aria-FieldError {
  font-size: var(--error-font-size, var(--text-xs));
  color: var(--negative);
  margin-top: var(--error-margin, 0);
}

/* SearchField.css — margin만 설정 */
.react-aria-SearchField {
  --error-margin: var(--spacing-xs);
}
```

#### 3-3. 최종 검증

- 전체 컴포넌트 Storybook 시각 대조
- DevTools에서 `.react-aria-Input` 오버라이드 횟수 < 3 확인
- DevTools에서 `.react-aria-Button` 오버라이드 횟수 < 3 확인

### 변수 네이밍 규칙

| 접두사      | 대상 요소                                   | 예시                                   |
| ----------- | ------------------------------------------- | -------------------------------------- |
| `--input-*` | `.react-aria-Input`, `.react-aria-TextArea` | `--input-padding`, `--input-font-size` |
| `--btn-*`   | `.react-aria-Button`                        | `--btn-padding`, `--btn-display`       |
| `--label-*` | `.react-aria-Label`                         | `--label-font-size`, `--label-margin`  |
| `--error-*` | `.react-aria-FieldError`                    | `--error-font-size`, `--error-margin`  |

이 변수들은 **부모 컴포넌트 스코프에서만 설정**한다 (CSS 변수 상속). 글로벌 `:root`에서 설정하지 않는다.

### 기존 컴포넌트 로컬 변수와의 관계

```
기존                          신규 (이 ADR)
--tf-input-padding     →    .react-aria-TextField { --input-padding: var(--tf-input-padding) }
--select-btn-padding   →    .react-aria-Select { --btn-padding: var(--select-btn-padding) }
```

기존 `--tf-*`, `--select-*`, `--nf-*` 등 로컬 변수는 **size variant 분기점으로 유지**한다. 새 `--input-*`, `--btn-*` 변수는 **base 선언과 컴포넌트 설정 간의 인터페이스** 역할을 한다.

### 최종 구조

```
Before:
  base.css          → .react-aria-Input { padding; font-size; ... }     ← 7개 속성
  TextField.css     → .react-aria-TextField .react-aria-Input { padding; font-size; ... }  ← 7개 재선언
  NumberField.css   → .react-aria-NumberField .react-aria-Input { padding; font-size; ... } ← 7개 재선언
  ComboBox.css      → .react-aria-ComboBox .react-aria-Input { padding; font-size; ... }   ← 6개 재선언
  form-controls.css → .section .react-aria-Input { padding; font-size; ... }               ← 8개 재선언

After:
  base.css          → .react-aria-Input { padding: var(--input-padding, ...); ... }  ← SSOT (1곳)
  TextField.css     → .react-aria-TextField { --input-padding: ...; }                ← 변수 3개
  NumberField.css   → .react-aria-NumberField { --input-padding: ...; }              ← 변수 3개
  ComboBox.css      → .react-aria-ComboBox { --input-padding: ...; }                ← 변수 3개
  form-controls.css → .section { --input-padding: ...; }                             ← 변수 4개

DevTools 결과:
  Before: padding 선언 5곳 (4곳 struck-through) → 속성 오버라이드 4회
  After:  padding 선언 1곳 (SSOT) + 변수 값 1곳 (부모에서 설정) → 속성 오버라이드 0회
         규칙 블록 2개 = 구조(.react-aria-Input) + 상태(.inset) — 서로 다른 속성이므로 충돌 없음
```

### 설계 원칙: 구조/상태 분리 유지

구조 속성(padding, font-size, border-radius)과 상태 속성(background, border-color, hover/focus)은 관심사가 다르므로 별도 규칙 블록으로 유지한다:

- `.react-aria-Input` (base.css) → 구조 SSOT: 크기, 간격, 타이포그래피
- `.inset` (utilities.css) → 상태 SSOT: 배경, 테두리 색상, hover/focus/invalid/disabled
- `.react-aria-Button` (Button.css) → 구조 SSOT: 레이아웃, 크기, 타이포그래피
- `.button-base` (utilities.css) → 상태 SSOT: 배경, 테두리 색상, hover/pressed/disabled

두 규칙 블록은 **서로 다른 CSS 속성**을 선언하므로 DevTools에서 struck-through가 발생하지 않는다. 이것이 관심사 분리의 최소 단위이며, 더 줄이려면 구조와 상태를 합쳐야 하므로 유지보수성이 저하된다.

**목표**: 속성 오버라이드(struck-through) 0회, 규칙 블록 2개 (구조/상태 분리)

## Gates

| Gate | 시점       | 통과 조건                                                                                                                 | 실패 시 대안                                   |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| G0   | Phase 0 후 | Storybook 전 컴포넌트 시각 변화 없음 + type-check 통과                                                                    | 삭제한 재선언 복원                             |
| G1   | Phase 1 후 | Signin Input DevTools에서 **속성 오버라이드(struck-through) 0건**, 규칙 블록 2개(구조+상태), builder inspector Input 정상 | 해당 컴포넌트 변수 위임 롤백, 기존 재선언 복원 |
| G2   | Phase 2 후 | Select/NumberField/ComboBox/SearchField 내부 Button 시각 1:1 일치, **속성 오버라이드 0건**, 규칙 블록 2개(구조+상태)      | 해당 컴포넌트 변수 위임 롤백                   |
| G3   | Phase 3 후 | 전체 CSS 파일에서 `.react-aria-Input {` / `.react-aria-Button {` 속성 재선언 0건 (변수 설정 제외)                         | 잔존 재선언 문서화 후 예외로 관리              |

잔존 HIGH 위험 없음.

## Consequences

### Positive

1. **DevTools 속성 오버라이드(struck-through) 10+ → 0**: 구조(base.css) + 상태(utilities.css) 2개 규칙 블록이 서로 다른 속성을 담당, 충돌 없음
2. **CSS 줄 수 ~15% 감소**: 재선언 제거 + 속성→변수 전환
3. **구조적 재발 방지**: 새 컴포넌트 추가 시 변수 설정만 작성 (속성 재선언 패턴이 사라짐)
4. **ADR-018 완성**: 상태 스타일(`.button-base`/`.inset`) + 구조 스타일(`--btn-*`/`--input-*`) 모두 변수 기반 SSOT
5. **M3 토큰 잔존 해소**: Tree.css, GridList.css의 `--color-primary-900` 정리

### Negative

1. **CSS 변수 간접 참조 1단계 추가**: `padding: var(--input-padding, var(--spacing))` → var() 해석 1회 추가. 성능 영향 무시할 수준 (브라우저 CSS 변수 해석은 O(1))
2. **변수명 학습 비용**: `--input-*`, `--btn-*`, `--label-*`, `--error-*` 4그룹 ~15개 변수. SKILL.md에 문서화 필요
3. **Phase 2(Button)는 복잡도 중**: Select/NumberField/ComboBox/SearchField 4개 컴포넌트의 Button 내장 패턴이 각기 달라서 변수 매핑 검증 필요

## References

### Internal

- ADR-017: React-Aria CSS Override SSOT (M3 토큰 제거)
- ADR-018: 컴포넌트 CSS 구조 재작성 (utilities.css, `.button-base`/`.inset`/`.indicator`)
- ADR-028: Builder CSS 스코프 격리 (`[data-context="builder"]`)
- ADR-029: Builder CSS Dead Code 정리

### External

- MDN: [CSS Custom Properties (var())](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) — Baseline 2016
- CSS Tricks: [A Complete Guide to Custom Properties](https://css-tricks.com/a-complete-guide-to-custom-properties/)
- React Aria Starter: [CSS Variable 기반 테마 패턴](https://react-spectrum.adobe.com/react-aria/getting-started.html)
