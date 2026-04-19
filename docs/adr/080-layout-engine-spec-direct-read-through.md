# ADR-080: Layout engine containerStyles Spec direct read-through — implicitStyles 하드코딩 해체

## Status

Proposed — 2026-04-20

## Context

### D3 domain 판정 (ADR-063 SSOT 체인)

본 ADR 은 **D3 (시각 스타일)** 에 해당한다. `implicitStyles.ts` 의 containerTag 분기에서 주입하는 `display / flexDirection / gap / padding` 은 전적으로 시각 스타일 범주이며, DOM 구조(D1) 나 Props API(D2) 와 무관하다. Spec 이 D3 SSOT 이므로, 동일 값을 layout engine 이 **별도 하드코딩으로 중복 소유**하는 것은 ADR-063 "중복 기록 금지" 위반이다.

### 배경 — ADR-079 P3.2 에서 남긴 debt

ADR-079 는 ListBoxItem `align-items / justify-content` 를 `ContainerStylesSchema` 로 리프팅하고, Style Panel Spec defaults read-through 를 달성했다. 그러나 **P3.2** 에서 `implicitStyles.ts:668-676` 의 ListBox 분기는 scope 분리로 유지 결정하고, `implicitStyles-listbox.test.ts` 3-test drift 감지로만 보호했다.

**잔존 코드** (`apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:668-676`):

```ts
if (containerTag === "listbox") {
  effectiveParent = withParentStyle(containerEl, {
    ...parentStyle,
    display: parentStyle.display ?? "flex",
    flexDirection: parentStyle.flexDirection ?? "column",
    gap: parentStyle.gap ?? 2, // {spacing.2xs} resolved
    padding: parentStyle.padding ?? 4, // {spacing.xs} resolved
  });
}
```

이 패턴은 `ListBoxSpec.containerStyles` 가 이미 동일 값을 선언하고 있음에도, layout engine 이 하드코딩 fallback 을 **독자적으로 소유**하는 이원화다.

### 현재 하드코딩 분기 전체 감사 결과

`applyImplicitStyles()` 함수(`implicitStyles.ts:440`) 내 containerTag 분기 중 **Spec 과 직접 중복될 수 있는 분기**:

| 분기 (containerTag)  | 파일 위치                   | 하드코딩 값                                                                                      | 대응 Spec.containerStyles                                                                                              |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `"listbox"`          | `implicitStyles.ts:668-676` | `display:"flex"`, `flexDirection:"column"`, `gap:2`, `padding:4`                                 | `ListBoxSpec.containerStyles` — display/flexDirection/gap({spacing.2xs})/padding({spacing.xs}) **완전 중복**           |
| `"gridlist"` (stack) | `implicitStyles.ts:693-700` | `display:"flex"`, `flexDirection:"column"`, `gap:12`                                             | `containerStyles` 미보유 — 현재 scope 밖                                                                               |
| `"gridlist"` (grid)  | `implicitStyles.ts:685-692` | `display:"grid"`, `gridTemplateColumns`, `gap:12`                                                | `containerStyles` 미보유 — 현재 scope 밖                                                                               |
| `"gridlistitem"`     | `implicitStyles.ts:707-722` | `display:"flex"`, `flexDirection:"column"`, `gap:2`, paddingTop/Bottom/Left/Right 4-way          | `ListBoxItemSpec`(list) 과 다른 padding(12/16) 체계 — 별도 감사 필요                                                   |
| `"listboxitem"`      | `implicitStyles.ts:726-738` | `display:"flex"`, `flexDirection:"column"`, `gap:2`, paddingTop/Bottom(4), paddingLeft/Right(12) | `ListBoxItemSpec.containerStyles` 에는 display/flexDirection/alignItems/justifyContent 만 보유 — padding 은 `sizes.md` |
| `"menu"`             | `implicitStyles.ts:462-465` | 자식 필터링만 (`filteredChildren = []`) — 스타일 주입 없음                                       | `MenuSpec.containerStyles` 보유이나 menu 분기는 스타일 주입 대상 아님                                                  |

**핵심 중복**: `"listbox"` 분기의 `display/flexDirection/gap/padding` 4속성이 `ListBoxSpec.containerStyles` 와 1:1 중복. 이것이 ADR-079 P3.2 drift test 가 보호하는 대상이며, 본 ADR 의 주요 해체 대상이다.

### Hard Constraints

1. **시각 회귀 0** — 기존 element instance 렌더 결과 불변. store 에 `style.display / flexDirection` 이 저장된 element (사용자가 Style Panel 에서 편집한 경우) 와 미저장 element 양쪽 동일 결과 보장
2. **TokenRef resolved 값 일치** — `{spacing.xs}` = 4, `{spacing.2xs}` = 2 (tokenResolver.test.ts 검증됨). resolver read-through 결과가 현재 하드코딩 값과 수치 동일해야 함
3. **layoutVersion 계약 유지** — `LAYOUT_AFFECTING_PROPS` + `LAYOUT_PROP_KEYS` 양쪽 등록 (layout-engine.md CRITICAL 규칙)
4. **type-check 3/3 PASS + vitest 회귀 0**
5. **ADR-081 scope 비침범** — TokenRef resolved 값 drift 검증 infra 는 ADR-081 담당. 본 ADR 은 TokenRef 를 `resolveToken()` 으로 경유할 뿐이며, drift 검증 자동화는 포함하지 않는다

### Spec Generator 지원 상태 (ContainerStylesSchema)

`CSSGenerator.ts` 는 `containerStyles` 필드 전체를 CSS emit 한다. `display / flexDirection / gap / padding` 은 ADR-078/079 에서 이미 Generator 경유 CSS 경로에 포함되어 있다. 본 ADR 은 **Generator 확장 없이** layout engine 의 read-through 경로만 수정한다.

### BC(Breaking Change) 영향 수식화

`"listbox"` containerTag 분기 수정 시 영향 범위:

- **100% 기존 ListBox element 에 적용** (특정 props 조건 없음 — `containerTag === "listbox"` 가 유일 조건)
- 각 element 에서 `resolveToken()` 호출 1회 추가 (gap) + 1회 추가 (padding) = **평균 2회 추가 resolveToken 호출**
- `resolveToken` 은 순수 함수, WASM 미포함, 수십 μs 수준. 60fps (16ms budget) 에서 무시 가능
- 시각 결과 변화: `{spacing.xs}` → 4, `{spacing.2xs}` → 2 — 현재 하드코딩 `4` / `2` 와 수치 동일 → **시각 회귀 0**

## Alternatives Considered

### 대안 A: 공통 resolver 추출 + Spec direct read-through (추천)

`implicitStyles.ts` 에 `resolveContainerStylesFallback(tag: string, parentStyle: Record<string, unknown>): Record<string, unknown>` 함수를 추출한다. 이 함수는 해당 tag 의 Spec 을 TAG_SPEC_MAP(또는 직접 import) 에서 조회하고, `containerStyles` 필드의 `display / flexDirection / gap / padding` 을 `resolveToken()` 으로 숫자로 변환한 뒤 fallback 으로 주입한다.

적용 시:

```ts
// 현재 (하드코딩)
if (containerTag === "listbox") {
  effectiveParent = withParentStyle(containerEl, {
    ...parentStyle,
    display: parentStyle.display ?? "flex",
    flexDirection: parentStyle.flexDirection ?? "column",
    gap: parentStyle.gap ?? 2,
    padding: parentStyle.padding ?? 4,
  });
}

// 대안 A (read-through)
const specFallback = resolveContainerStylesFallback("listbox", parentStyle);
if (Object.keys(specFallback).length > 0) {
  effectiveParent = withParentStyle(containerEl, {
    ...parentStyle,
    ...specFallback,
  });
}
```

drift test `implicitStyles-listbox.test.ts` 는 **구조적 해소 후 삭제** 또는 resolver 단위 test 로 대체.

- 위험: **기술 LOW** (resolveToken 은 검증된 순수 함수, TAG_SPEC_MAP 조회 O(1)) / **성능 LOW** (resolveToken μs 수준, 60fps budget 무관) / **유지보수 LOW** (Spec 수정 시 layout 자동 반영, drift 불가) / **마이그레이션 LOW** (resolved 수치 동일 보장, 시각 회귀 없음)

### 대안 B: implicitStyles 분기 현상 유지 + drift test 로만 감지 (ADR-079 결정)

현재 상태 유지. `implicitStyles-listbox.test.ts` 3/3 이 Spec 값 변경 시 test 실패로 개발자에게 알린다.

- 위험: **기술 LOW** (변경 없음) / **성능 LOW** (변경 없음) / **유지보수 HIGH** (Spec 에 containerStyles 보유 Spec 이 추가될수록 drift test 추가 부담. test 실패 → 수동 동기화 반복. D3 SSOT 정본 위반 구조 영구화) / **마이그레이션 LOW** (변경 없음)

### 대안 C: Taffy 입력 자체를 Spec containerStyles 로 대체 (layout engine 근본 재설계)

`fullTreeLayout.ts` 의 DFS 에서 `applyImplicitStyles` 를 호출하는 대신, Spec `containerStyles` 를 Taffy 노드 스타일의 직접 소스로 사용. layout engine 의 전처리 계층 자체를 Spec 구동 방식으로 재설계.

- 위험: **기술 HIGH** (fullTreeLayout DFS 와 Taffy WASM 인터페이스 대규모 변경. containerStyles 에 없는 flex 속성(alignItems/justifyContent/wrapping/overflow 등) 처리 전략 미정) / **성능 MEDIUM** (Taffy 재계산 경로 변경 가능성) / **유지보수 MEDIUM** (장기적으로 우아하나 현재 아키텍처와 불연속 비용) / **마이그레이션 HIGH** (모든 containerTag 분기를 한번에 재설계해야 함. 롤백 어려움)

### 대안 D: 각 containerTag 분기 내부에 개별 Spec import (부분적 해결)

`"listbox"` 분기에 `ListBoxSpec` 을 직접 import 하여 `containerStyles` 를 읽되, 공통 resolver 추출 없이 분기별 개별 처리.

```ts
import { ListBoxSpec } from "@composition/specs";
if (containerTag === "listbox") {
  const cs = ListBoxSpec.containerStyles!;
  effectiveParent = withParentStyle(containerEl, {
    ...parentStyle,
    display: parentStyle.display ?? cs.display ?? "flex",
    flexDirection: parentStyle.flexDirection ?? cs.flexDirection ?? "column",
    gap: parentStyle.gap ?? resolveToken(cs.gap as TokenRef) ?? 2,
    padding: parentStyle.padding ?? resolveToken(cs.padding as TokenRef) ?? 4,
  });
}
```

- 위험: **기술 LOW** (단순, 직접적) / **성능 LOW** / **유지보수 MEDIUM** (containerStyles 보유 Spec 이 추가될 때마다 분기 추가. 공통 패턴 없음 → 복붙 발산) / **마이그레이션 LOW** (listbox 에만 적용, 영향 최소)

### Risk Threshold Check

| 대안              | 기술 | 성능   | 유지보수 | 마이그레이션 | HIGH+ 존재             |
| ----------------- | ---- | ------ | -------- | ------------ | ---------------------- |
| A (공통 resolver) | LOW  | LOW    | LOW      | LOW          | 없음                   |
| B (현상 유지)     | LOW  | LOW    | HIGH     | LOW          | 유지보수 HIGH          |
| C (근본 재설계)   | HIGH | MEDIUM | MEDIUM   | HIGH         | 기술/마이그레이션 HIGH |
| D (개별 import)   | LOW  | LOW    | MEDIUM   | LOW          | 없음                   |

**루프 판정**:

- 대안 B: 유지보수 HIGH — drift test 누적 부담과 D3 SSOT 구조적 위반이 지속됨. HIGH threshold 초과이므로 개선 필요.
- 대안 C: 기술/마이그레이션 HIGH → 위험 회피 대안으로 대안 A (공통 resolver) 이미 확보. 추가 루프 불필요.
- 대안 A, D: HIGH 없음 — threshold 통과. D 는 유지보수 MEDIUM 으로 A 보다 열위.
- **최종 판정**: 대안 A 선정, 대안 B 기각, 대안 C 기각, 대안 D 기각.

## Decision

**대안 A (공통 resolver 추출 + Spec direct read-through) 선정.**

위험 수용 근거: 모든 4축에서 LOW 위험. `resolveToken()` 은 WASM 없는 순수 함수로 성능 영향 무시 가능하며, resolved 수치가 현재 하드코딩 값과 동일함이 `tokenResolver.test.ts` 에서 검증되어 시각 회귀가 구조적으로 불가능하다.

**기각된 대안 기각 사유**:

- **대안 B**: 유지보수 HIGH (drift test 누적 = 수동 동기화 반복). ADR-063 D3 "단일 소스" 원칙의 지속적 위반 구조이며, containerStyles 보유 Spec 증가 시 부담이 선형으로 증가한다.
- **대안 C**: 기술/마이그레이션 HIGH. `implicitStyles.ts` 는 containerStyles 이외에도 DFS injection, font 주입, Label 크기 위임 등 Taffy 입력과 독립적인 전처리를 다수 포함한다. 이를 Spec 구동으로 전면 재설계하는 것은 본 ADR scope 를 초과하며, 별도 ADR 로 다루어야 한다.
- **대안 D**: 유지보수 MEDIUM. 공통 resolver 없이 분기별 개별 처리하면 containerStyles 보유 Spec 추가 시마다 복붙이 발생한다. 대안 A 와 초기 구현 비용 차이가 없으면서 확장성이 열위다.

**구현 범위 (Phase 분리)**:

- **P1**: `resolveContainerStylesFallback` 함수 추출 — `implicitStyles.ts` 내 private helper로 추가. `listbox` 분기 하드코딩 → resolver 경유로 전환.
- **P2**: drift test 교체 — `implicitStyles-listbox.test.ts` 를 resolver 단위 test 로 대체 (또는 삭제 후 resolver 자체의 인라인 test 통합).
- **P3**: `/cross-check` + `/sweep` 컬렉션 family 시각 회귀 확인. Gate 종결.

> 구현 상세: [080-layout-engine-spec-direct-read-through-breakdown.md](../design/080-layout-engine-spec-direct-read-through-breakdown.md)

## Gates

| Gate   | 시점       | 통과 조건                                                                                                                                                                                                                                                                                                                                                         | 실패 시 대안                    |
| ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **G0** | P1 착수 전 | `implicitStyles.ts` 전체 containerTag 분기 중 Spec.containerStyles 와 교차 중복되는 분기 enumeration 완료. 본 ADR Context 의 감사 테이블이 코드와 1:1 대응 확인                                                                                                                                                                                                   | 감사 테이블 재작성 후 재착수    |
| **G1** | P1 완료 후 | `resolveContainerStylesFallback("listbox", {})` 호출 시 `{ display:"flex", flexDirection:"column", gap:2, padding:4 }` 반환. `resolveToken("{spacing.xs}") === 4` 및 `resolveToken("{spacing.2xs}") === 2` unit test PASS                                                                                                                                         | tokenResolver 매핑 확인 후 수정 |
| **G2** | P2 완료 후 | **권장 전략 A**: `implicitStyles-listbox.test.ts` 삭제 + `resolveContainerStylesFallback` 반환값 unit test (`display/flexDirection/gap/padding` 4속성) 신설로 교체. **판정 기준**: resolver unit test 가 동일한 drift 시나리오(primitives `{spacing.xs}` 값 변경) 를 커버하면 기존 test 중복. 중복 확증 시 삭제, 불충분 시 병존 유지 (전략 B). vitest 전체 회귀 0 | 기존 test 유지 또는 범위 재조정 |
| **G3** | P3 완료 후 | `/cross-check` ListBox(CSS ↔ Skia) 시각 회귀 없음. `/sweep` 컬렉션 family(ListBox/Menu/Select/ComboBox) 회귀 없음. `type-check 3/3 PASS`                                                                                                                                                                                                                          | 회귀 분기 특정 후 rollback      |

**잔존 HIGH 위험 없음.**

## Consequences

### Positive

- `implicitStyles.ts` ListBox 분기의 하드코딩 fallback 값 제거 → ADR-063 D3 SSOT "단일 소스" 원칙 충족. Spec 값 수정 시 layout engine 이 자동 반영 (drift 불가 구조).
- `implicitStyles-listbox.test.ts` drift test 제거 → 유지보수 부담 감소. 향후 containerStyles 보유 Spec 추가 시 drift test 추가 불필요.
- `resolveContainerStylesFallback` 함수는 다른 containerTag 분기 (GridList, GridListItem 등 containerStyles 미보유 Spec 이 containerStyles 를 추가할 경우) 에 즉시 재사용 가능.

### Negative

- `implicitStyles.ts` 에 `@composition/specs` 신규 의존성이 도입됨. 현재 파일은 specs 패키지를 직접 import 하지 않으므로 (builder 내부 TAG_SPEC_MAP 또는 타입 참조만) 첫 진입점이며, 향후 추가 분기 read-through 확장 시 Spec 집합 import 패턴이 형성된다. 순환 의존 위험은 P0 감사 시 TAG_SPEC_MAP 참조 경로로 해소 가능성 검토.
- `resolveToken()` 호출이 ListBox element 렌더 경로에 추가됨 (gap + padding = 2회). 성능 영향은 μs 수준으로 무시 가능하나, 향후 containerStyles 보유 Spec 전체로 read-through 범위가 확대되면 합산 비용 재평가 필요.
- 해체 범위가 `"listbox"` 분기 1개에 한정 (P1). `"gridlistitem"` / `"listboxitem"` 의 4-way padding 하드코딩은 containerStyles 와 의미론이 다르므로 (sizes.md.paddingX/Y vs containerStyles.padding shorthand 이원화) 별도 ADR 대상으로 남는다.

## References

- ADR-063: SSOT 체인 charter (D3 domain 정의)
- ADR-078: ListBox Spec containerStyles 도입 (display/flexDirection 첫 선언)
- ADR-079: ContainerStylesSchema alignItems/justifyContent 확장 + P3.2 drift test 도입
- ADR-071: MenuSpec containerStyles 도입 (containerStyles 패턴 선례)
- ADR-081: Token system build-time drift 검증 — TokenRef resolved 값 drift 검증 infra 제공 (본 ADR 은 ADR-081 infra 를 전제하지 않으나, ADR-081 이 TokenRef 값 불일치를 build-time 에 감지하면 G1 보조 안전망이 된다)
