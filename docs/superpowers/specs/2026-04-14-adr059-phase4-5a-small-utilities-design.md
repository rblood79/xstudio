# ADR-059 Phase 4.5a: Small Utilities + rootSelectors Infra (0-D.10)

## Status

Design — 2026-04-14

## Context

ADR-059 v2 Phase 4-infra2 (PR #205) 머지 완료. 잔존 `skipCSSGeneration: true` 45개. Phase 4 첫 해체 batch 로 **소형 utility 6개**를 선정:

- DisclosureGroup (16L), FileTrigger (27L), Autocomplete (34L), Panel (45L), Toolbar (42L), Pagination (52L) = **216L**

CSS 패턴 스캔 결과, 6개 중 2개(Toolbar/Pagination)가 `:not()` pseudo 를 사용하여 CSSGenerator 재확장 필요. Phase 4-infra2 에서 YAGNI 로 drop 된 **0-D.10 (root `:not()`/`:where()`/`:has()`)** 가 실수요 2건 확인 — 본 batch 에서 도입.

**SSOT domain**: D3 (시각). Spec SSOT, Skia/CSS symmetric consumer 유지.

**Hard constraints**:

- 58-component snapshot byte diff 0 (인프라 추가만 한 상태)
- Spec=SSOT D3
- 6개 해체 후 snapshot 변경은 해당 컴포넌트에만 격리

## Alternatives Considered

### 0-D.10 API

#### 대안 A: `rootSelectors` 신규 top-level field + selector validation (채택)

- `Record<rawSelector, { styles?, nested? }>` — `sizeSelectors`/`staticSelectors` 와 동형 구조
- raw selector 에 `&` prefix 강제 + forbidden char 검증 (`{`, `}`, `;`, `@`)
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

#### 대안 B: `containerVariants` 확장 — pseudo class 별 sub-key

- 각 pseudo (`not`, `where`, `has`) 에 별 sub-field — `containerVariants.not.orientation.vertical`
- pseudo 종류마다 필드 증식
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)

#### 대안 C: positive-selector 재작성 (인프라 추가 회피)

- Toolbar `[data-orientation="horizontal"]` 명시, Pagination 로직 spec 레벨 invert
- 인프라 깨끗, 그러나 RAC idiom 과 mismatch + 복잡한 컴포넌트 등장 시 반복 불가
- 위험: 기술(M — RAC idiom 이탈) / 성능(L) / 유지보수(H — case-by-case 해결) / 마이그레이션(L)

### Descendant `:not()` 경로

#### 대안 X: `staticSelectors` selector key 에 `:not()` 허용 (채택)

- 기존 `staticSelectors` 는 `{ ".bar": {...} }` 구조. key 에 `:not()` 포함한 raw selector 허용.
- validation 만 relax — 신규 필드 없음
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

#### 대안 Y: `descendantSelectors` 신규 필드

- 별도 field, 명시적 descendant raw selector
- 필드 증식
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)

**Risk Threshold Check**: A/X 잔존 HIGH 0개 → Gate 불필요.

## Decision

- **0-D.10**: 대안 A 채택 (`rootSelectors` + validation). B 는 필드 증식, C 는 RAC idiom 이탈.
- **Descendant `:not()`**: 대안 X 채택 (selector key relax). Y 는 중복 필드.

### Spec API

```ts
interface CompositionSpec {
  // 기존 필드 유지

  /**
   * CSS 전용 root pseudo selector (0-D.10).
   *
   * raw selector fragment. `&` prefix 필수 (root `.react-aria-{Name}` 기준).
   * 허용: `:not()`, `:where()`, `:has()`, 속성 selector `[...]`, combinators
   * 금지: `{`, `}`, `;`, `@`
   *
   * emit: `.react-aria-{Name}{fragment-with-&-replaced} { ...styles; {nestedSelector} {...} }`
   */
  rootSelectors?: Record<
    string,
    {
      styles?: Record<string, string>;
      nested?: Record<string, Record<string, string>>;
    }
  >;
}
```

### Selector Validation

Build-time 검증 (emit 시 throw):

- `rootSelectors` key: `^&` 시작 필수, `/[{};@]/` 미포함
- `staticSelectors` key: `/[{};@]/` 미포함 (기존 없던 규칙, 상시 통과)
- `rootSelectors.*.nested` key / `staticSelectors` 내 nested: 동일 forbidden char

### Emit 구조

```css
@layer components {
  /* rootSelectors */
  .react-aria-Toolbar:not([aria-orientation="vertical"]) {
    /* styles */
    .toolbar-item {
      /* nested */
    }
  }

  /* staticSelectors (selector key 에 :not() 가능) */
  .react-aria-Pagination .react-aria-Button:not([data-current="true"]) {
    /* styles */
  }
}
```

### Cascade 순서

`@layer components` 내 emit 순서:

1. root base styles (generateBaseStyles)
2. containerVariants
3. delegation.states
4. staticSelectors
5. sizeSelectors
6. **rootSelectors** (신규) — root selector 를 기반으로 한 pseudo 이므로 static/size 보다 뒤
7. `@layer components` close

### 회귀 Gate

- 58-component snapshot byte diff 0 (rootSelectors 미선언 → 출력 불변)
- Task 3 후 단위 테스트 통과 (rootSelectors emit + validation + descendant `:not()`)
- 6 컴포넌트 해체 시 snapshot 변경 범위 격리 확인

### 실전 검증 (동일 PR)

6개 해체 — 각각 독립 commit:

| #   | Component       | 주요 필드                                         |
| --- | --------------- | ------------------------------------------------- |
| 1   | DisclosureGroup | `containerVariants.disabled`                      |
| 2   | FileTrigger     | `containerStyles` only                            |
| 3   | Autocomplete    | `containerVariants.empty`                         |
| 4   | Panel           | `containerStyles` + `staticSelectors`             |
| 5   | Toolbar         | `containerVariants.orientation` + `rootSelectors` |
| 6   | Pagination      | `staticSelectors` with `:not()` descendant        |

## Gates

잔존 HIGH 위험 없음. Snapshot + 단위 테스트 + selector validation 3중 감지.

## Consequences

### Positive

- 0-D.10 인프라 표준화 — 향후 RAC idiom (`:not()`, `:where()`) 컴포넌트 즉시 수용
- 6개 utility 컴포넌트 Spec SSOT 복구 (-216L 수동 CSS 제거 예상)
- staticSelectors selector key relax — descendant pseudo 자연스러운 지원

### Negative

- CSSGenerator +~60L (rootSelectors emit + validation)
- spec.types.ts +~15L
- Codex 리뷰 때 제기된 raw selector 위험 — validation 으로 mitigate

### Deferred

- Slider family / Overlay triad / Collection heavy — Phase 4.5b 이후
- primitives 추출 (/simplify 후보 6건) — Phase 4 후기 결정
