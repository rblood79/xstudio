# ADR-068: Menu items SSOT + MenuItem Spec 신설 (D2 + D3 동시 정합)

> **SSOT domain**: D2 (Props/API) **정렬** + D3 (시각 스타일) **누락 보완**. ADR-066(Tabs items SSOT) 패턴 직접 적용 + MenuItem Spec 신설로 D3 SSOT 완전 정합. 정본: [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md), charter: [ADR-063](063-ssot-chain-charter.md), 선례: [ADR-066](066-tabs-items-ssot-migration.md).

## Status

Proposed — 2026-04-16

## Context

### 배경

composition Menu 컴포넌트는 Skia Builder Canvas에서 **0-height** 렌더링 버그를 보인다. 2026-04-15 MCP 브라우저 직접 검증으로 근본 원인이 식별되었다:

1. `NavigationComponents.ts:14-65`의 `createMenuDefinition`이 Menu 드롭 시 MenuItem 자식 element 3개를 store에 생성
2. **MenuItem은 Spec 파일이 없음** (`packages/specs/src/components/MenuItem.spec.ts` 미존재)
3. MenuItem element는 Skia에서 0-height 렌더 (Spec 없으면 intrinsic size 0)
4. Menu의 layout이 자식(MenuItem) 합산 기반 → 자식 모두 0 → Menu 전체 0
5. `buildSpecNodeData.ts:488` `if (w <= 0 && h <= 0) return null` guard로 Skia 렌더 스킵
6. CSS Preview는 RAC가 padding 기반 fallback height 제공 → 정상 표시 (대칭 깨짐)

### 동일 패턴 잠재 위험

`children-manager` 필드를 사용하는 Spec은 8개(Menu, Tree, Select, ComboBox, RadioGroup, CheckboxGroup, TagGroup, ToggleButtonGroup). 이 중 자식 Item이 Spec 없는 컴포넌트:

- **MenuItem** ❌ (본 ADR 대상)
- **SelectItem** ❌ (Select가 trigger Label 등 다른 자식 Spec으로 height 보완 → 우연히 정상)
- **ComboBoxItem** ❌ (동일)
- Radio/Checkbox/ToggleButton/Tab은 Spec 보유 → 정상 동작

→ 본 ADR은 MenuItem만 다루나, **동일 패턴(items SSOT + Item Spec 신설)이 Select/ComboBox에도 확장 가능**하다. 후속 ADR로 분리 (Q4 결정).

### SSOT 체인 내 위상 (D1/D2/D3)

- **D1 (DOM/접근성)**: 변경 없음 — RAC `<MenuTrigger><Button/><Popover><Menu><MenuItem/></Menu></Popover></MenuTrigger>` DOM 구조 그대로 사용
- **D2 (Props/API)**: **정렬 대상** — RAC `Menu items` + render function 패턴 채택. ADR-066 Tabs와 동일 정렬
- **D3 (시각 스타일)**: **SSOT 누락 보완** — MenuItem Spec 신설로 CSS↔Skia 대칭 회복

본 ADR은 D2 + D3 **동시 정합**을 목표로 한다. D2만 정렬하면(대안 A) D3 미해결로 Skia 0-height 잔존, D3만 보완하면(대안 B) D2 RAC divergence 잔존.

### Hard Constraints

1. `pnpm type-check` 3 tasks 통과
2. `pnpm build:specs` 정상 (107 → 108 CSS, MenuItem.css 신규 추가)
3. Menu trigger 시각: Skia ↔ CSS 대칭 (height/padding/text 동일)
4. RAC `<Menu items>{item => <MenuItem/>}` API 호환 (Preview/Publish가 RAC 호출하므로 필수)
5. ADR-066 Tabs 데이터 모델 패턴과 일관 (composition 내 items SSOT 컨벤션 단일화)

### Soft Constraints

- 개발 단계 — 기존 저장된 Menu 프로젝트의 MenuItem element는 broken 수용 (마이그레이션 미수행, ADR-066 선례 일관)
- per-MenuItem 개별 스타일/icon/disabled 편집 기능 보류 (Q1=a 최소 props 채택)
- Menu는 popover 컴포넌트라 Builder Canvas에는 trigger만 표시 (Q5=i — popover 닫힘 보존)

## Alternatives Considered

### 대안 A: items SSOT만 (MenuItem element 소멸)

- 설명: Menu.props.items 신설, MenuItem element tree에서 제거. MenuItem Spec 신설 안 함. ADR-066 Tabs 패턴 동일 적용.
- 근거: ADR-066 선례. RAC dynamic collection items 패턴(`https://react-aria.adobe.com/Menu`).
- 위험:
  - 기술: **M** — 가상 MenuItem 렌더 경로 신설 시 Spec 없으면 Skia에서 어차피 0-height. 즉 Skia 0-height 잔존.
  - 성능: L — element 수 절감
  - 유지보수: **M** — D3 SSOT 미해결 잔존. CSS는 RAC fallback으로 표시되나 Skia는 미해결. 두 렌더 경로 비대칭 영구화.
  - 마이그레이션: L
- 기각 사유: **사용자 핵심 요구("근본 + SSOT + Spec 모두 만족") 미달성**. D2만 정렬, D3 미해결. Skia 0-height 잔존. 대안 E의 부분집합으로 대체.

### 대안 B: MenuItem Spec만 신설 (element tree 유지)

- 설명: MenuItem.spec.ts 신설, sizes/render.shapes 정의. MenuItem element는 store에 그대로 유지. Menu.props.items 미도입.
- 근거: 최소 침습 (D3 SSOT만 해결).
- 위험:
  - 기술: **M** — Spec 신설 자체는 LOW이나 element tree 패턴 유지로 RAC API divergence 잔존
  - 성능: L
  - 유지보수: **M** — D2 RAC divergence 고착. composition의 다른 items SSOT 패턴(ADR-066 Tabs)과 비일관. 향후 RAC 업데이트 추적 비용
  - 마이그레이션: L
- 기각 사유: D2 RAC divergence가 ADR-063 charter 위배. 하나의 컴포넌트군에서 두 패턴(Tabs=items, Menu=element tree)이 공존하면 신규 컴포넌트 추가 시 어느 패턴 따를지 결정 비용 발생.

### 대안 C: 하이브리드 (items 메타 + MenuItem element 자동 sync)

- 설명: items SSOT 도입하되 store reducer가 MenuItem element도 자동 sync로 유지. MenuItem Spec 신설.
- 근거: 점진 마이그레이션 시도.
- 위험:
  - 기술: M — 두 표현 동기화 코드 복잡
  - 성능: L
  - 유지보수: **H** — "어느 쪽이 SSOT인가" 모호. ADR-066에서 동일 패턴(대안 B)을 명시적으로 기각함
  - 마이그레이션: M
- 기각 사유: SSOT 이중 진실 (charter 위배). ADR-066 기각 패턴 그대로 적용 — 일관 기각.

### 대안 D: trigger/overlay element 분리 (Menu 자체 + Popover overlay 별도 element)

- 설명: Menu element는 trigger만 담당. Popover overlay는 별도 element 트리로 분리. MenuItem은 Popover overlay 자식.
- 근거: 시각/논리 분리.
- 위험:
  - 기술: **H** — 신규 element 타입(PopoverOverlay) + popover-trigger 참조 메커니즘 신설 필요
  - 성능: L
  - 유지보수: M — overlay-trigger 참조 체계 유지비
  - 마이그레이션: **H** — 기존 Menu 데이터 모델 전면 변경
- 기각 사유: HIGH 2축. trigger/overlay 분리 자체가 RAC `<MenuTrigger>` 단일 컴포넌트 모델과 어긋나 D1 침범 위험.

### 대안 E: items SSOT + MenuItem Spec 신설 (선택)

- 설명: A + B 결합. Menu.props.items 신설(D2 정렬) + MenuItem Spec 신설(D3 SSOT). MenuItem element는 store에서 소멸. Skia 트리거만 자체 shapes로 정상 height 렌더(popover 닫힘이 기본).
- 근거: ADR-066 패턴 + composition 내 모든 컴포넌트의 D3 Spec SSOT 일관 원칙. 사용자 핵심 요구("근본 원인 + SSOT + Spec 모두 만족") 직접 충족.
- 위험:
  - 기술: **M** — MenuItem Spec 신설(LOW) + items reducer(LOW) + factory 변경(LOW) + Skia 가상 렌더(보류, Q5=i로 미적용 → LOW). 종합 M.
  - 성능: L — element 수 절감 + 가상 렌더 경로 미사용으로 추가 부담 없음
  - 유지보수: L — D2 + D3 동시 SSOT 정합. 다른 items SSOT 컴포넌트(Tabs)와 일관 패턴
  - 마이그레이션: L — 개발 단계 broken 수용 (ADR-066 선례)
- 선택: 4축 모두 LOW/MEDIUM, HIGH+ 0개. ADR-066 선례 정합. D2+D3 동시 해결.

### Risk Threshold Check

| 대안                                     | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---------------------------------------- | ----- | ---- | -------- | ------------ | :--------: |
| A (items SSOT만)                         | M     | L    | M        | L            |     0      |
| B (Spec만 신설)                          | M     | L    | M        | L            |     0      |
| C (하이브리드)                           | M     | L    | **H**    | M            |     1      |
| D (trigger/overlay 분리)                 | **H** | L    | M        | **H**        |     2      |
| **E (items SSOT + MenuItem Spec, 선택)** | M     | L    | L        | L            |     0      |

**판정**: HIGH+ 0인 대안은 A/B/E 3개. A는 D3 미해결로 사용자 요구 미달성, B는 D2 미정렬로 charter 위배. E가 D2+D3 동시 정합으로 유일한 근본 해결안. 추가 루프 불필요.

## Decision

**대안 E: items SSOT + MenuItem Spec 신설**을 선택한다.

선택 근거:

1. **HIGH+ 위험 0** — 4축 모두 LOW/MEDIUM
2. **사용자 핵심 요구 충족** — D2(Props/API) 정렬 + D3(시각) SSOT 동시 만족. 근본 원인(MenuItem Spec 부재 + RAC API divergence) 동시 해결
3. **ADR-066 일관** — composition 내 items SSOT 패턴 단일화
4. **확장 여지** — 동일 패턴을 Select/ComboBox(SelectItem/ComboBoxItem 부재 동일 문제)에 후속 ADR로 적용 가능

기각 사유:

- **대안 A 기각**: D3 미해결로 Skia 0-height 잔존. 사용자 핵심 요구 미달성
- **대안 B 기각**: D2 RAC divergence 고착, charter 위배 + Tabs와 비일관
- **대안 C 기각**: SSOT 이중 진실 (ADR-066 기각 패턴, 일관 기각)
- **대안 D 기각**: 기술/마이그레이션 HIGH 2축 + RAC 단일 `<MenuTrigger>` 모델과 충돌

### Q 결정사항 (2026-04-16 사용자 확정)

| Q                                      | 옵션                                                                             | 선택              | 근거                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Q1. items 항목 props 범위**          | (a) `{id, children}` 최소 / (b) `{id, children, textValue, isDisabled, icon}` 풀 | **(a) 최소**      | YAGNI. 풀 props는 사용 케이스 발생 시 후속 ADR로 확장. 본 ADR 범위 통제.                                                          |
| **Q2. Item Management UI**             | (α) children-manager 인스펙터 / (β) DOM 오버레이 +/- (Tabs 패턴)                 | **(α) 인스펙터**  | Menu는 popover 컴포넌트 — trigger와 items가 시각적으로 분리되므로 trigger 주변 +/- 오버레이가 부자연. 인스펙터 편집이 자연스러움. |
| **Q3. 최소 가드**                      | 1개 가드 / 빈 메뉴 허용                                                          | **빈 메뉴 허용**  | Menu는 비활성/빈 상태가 정당한 UX (Tabs는 항상 활성 1개 필요와 다름). 가드 미적용.                                                |
| **Q4. Select/ComboBox 등 후속 처리**   | 본 ADR 범위 / 별도 ADR                                                           | **별도 ADR**      | 본 ADR 범위 통제. Menu 패턴 검증 후 동일 패턴을 SelectItem/ComboBoxItem에 확장.                                                   |
| **Q5. Builder Canvas popover preview** | (i) 항상 닫힘 (trigger만) / (ii) 선택 시 자동 open / (iii) 인스펙터 toggle 버튼  | **(i) 항상 닫힘** | popover 본질 보존. items 편집은 인스펙터로 충분. (iii) toggle 버튼은 후속 UX ADR로 분리 가능.                                     |

### 데이터 모델

**Before (현재)**:

```
Menu (element) — props.size
├── MenuItem (element) — props.children="Menu Item 1"
├── MenuItem (element) — props.children="Menu Item 2"
└── MenuItem (element) — props.children="Menu Item 3"
```

**After**:

```
Menu (element) — props.size, props.items: [
  { id: "abc", children: "Menu Item 1" },
  { id: "def", children: "Menu Item 2" },
  { id: "ghi", children: "Menu Item 3" }
]
(자식 element 없음)
```

### Skia 렌더 경로 (Q5=i 결정)

- Menu trigger만 자체 `MenuSpec.render.shapes`로 정상 height 렌더 (자식 부재 → 자체 padding/fontSize 기반 intrinsic size)
- popover 닫힘이 기본 → MenuItem 가상 렌더 경로 본 ADR 범위 외
- 후속: popover preview 옵션은 별도 UX ADR

### React/Preview 렌더 경로

```tsx
<MenuTrigger>
  <Button>{props.children ?? "Menu"}</Button>
  <Popover>
    <Menu items={props.items}>
      {(item) => <MenuItem id={item.id}>{item.children}</MenuItem>}
    </Menu>
  </Popover>
</MenuTrigger>
```

MenuItem CSS는 `MenuItem.spec.ts`에서 자동 생성된 `MenuItem.css` 적용 (RAC가 styled-component 아님 → 외부 CSS 필요).

> 구현 상세: [068-menu-items-ssot-and-menuitem-spec-breakdown.md](../design/068-menu-items-ssot-and-menuitem-spec-breakdown.md)

## Gates

**잔존 HIGH 위험 없음** — Gate 표는 구현 완료 판정 기준 명시용.

| #   | 검증 항목                     | 통과 조건                                                          |
| --- | ----------------------------- | ------------------------------------------------------------------ |
| 1   | `pnpm build:specs`            | 107 → **108** CSS (MenuItem.css 신규 생성)                         |
| 2   | `pnpm type-check`             | 3/3 successful                                                     |
| 3   | 신규 Menu 요소 삽입           | items=[3개] 기본 + Menu trigger Skia 정상 height (CSS와 시각 동일) |
| 4   | Inspector Item Management     | items add/remove/edit → Skia/Preview 동기 반영                     |
| 5   | Preview popover 동작          | Menu 클릭 → popover 열림 → MenuItem 3개 정상 표시 (RAC 동작)       |
| 6   | Skia 시각 (popover 닫힘 상태) | Menu trigger 정상 (0-height 버그 해소 — `/cross-check` 통과)       |
| 7   | 마이그레이션 미수행 확인      | 기존 저장된 Menu element 자식 broken 수용 명시 (개발 단계 결정)    |

## Consequences

### Positive

- **Skia 0-height 버그 근본 해소** (사용자 핵심 요구 충족)
- **D2 + D3 SSOT 동시 정합** — RAC API + Spec 단일 소스 양쪽 만족
- **ADR-066 Tabs 패턴과 일관** — composition 내 items SSOT 컨벤션 단일화
- **Store element 수 절감** — Menu당 4 → 1 (75% 절감)
- **MenuItem CSS 자동 생성** (`MenuItem.css`) — 수동 CSS 부재 → SSOT 단일화
- **후속 확장 경로 확보** — 동일 패턴을 SelectItem/ComboBoxItem에 적용 가능 (별도 ADR)
- **Inspector items 편집 단순화** — 배열 mutation 1회로 add/remove

### Negative

- **per-MenuItem 개별 스타일 편집 기능 보류** (Q1=a 최소 props) — 후속 ADR로 확장 시 도입
- **개발 단계 저장된 Menu 프로젝트는 broken 수용** (마이그레이션 미수행, ADR-066 선례 일관)
- **MenuItem element 기반 기존 코드 정리 필요** — `NavigationComponents.ts` factory, propagation rule(`size → MenuItem`), Inspector children-manager의 element add/remove 로직
- **Layer panel에서 MenuItem 노드 소멸** — Menu element 자식 0 표시 (정상이나 사용자 시각적 적응 필요)
- **Builder Canvas에서 popover content 미리보기 불가** (Q5=i) — 편집은 인스펙터로 한정. 후속 UX ADR 가능
