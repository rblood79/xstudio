# ADR-073: Select/ComboBox items SSOT + `renderMenu` wiring 정리

> **SSOT domain**: D2 (Props/API) **정렬** + D3 (시각 스타일) **보완**. ADR-066(Tabs items SSOT) / ADR-068(Menu items SSOT + MenuItem Spec) 패턴을 Select/ComboBox 로 확장. 정본: [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md), charter: [ADR-063](063-ssot-chain-charter.md), 선례: [ADR-066](completed/066-tabs-items-ssot-migration.md), [ADR-068](completed/068-menu-items-ssot-and-menuitem-spec.md), 연관: [ADR-071](completed/071-generator-container-styles-menu-restore.md) Menu 정방향 복원.

## Status

Proposed — 2026-04-17

## Context

composition 은 RAC collection 패턴을 따르는 컴포넌트 3군(Menu/Tabs/Select/ComboBox/ListBox) 에 대해 **items SSOT 정렬** 을 순차 진행해왔다:

| 컴포넌트           | items 필드                                                        | 상태                   |
| ------------------ | ----------------------------------------------------------------- | ---------------------- |
| **Tabs** (ADR-066) | `items?: TabItem[]` (풀 인터페이스)                               | Implemented 2026-04-15 |
| **Menu** (ADR-068) | `items?: StoredMenuItem[]` (풀 인터페이스) + MenuItem Spec 신설   | Implemented 2026-04-17 |
| **Select**         | `items?: string[]` (primitive) + SelectItem element tree          | **미정렬**             |
| **ComboBox**       | `items?: string[]` (primitive) + ComboBoxItem element tree        | **미정렬**             |
| **ListBox**        | `items?: string[]` + ListBoxItem element tree + skipCSSGeneration | 미정렬 (ADR-074 scope) |

Select/ComboBox 는 items 필드가 **이미 존재하나** primitive 수준(`string[]`)에 머물러 있어 label/value/description/icon/isDisabled/onActionId 등 per-item 속성을 element tree 의 SelectItem/ComboBoxItem child 에 저장하는 이중 구조를 유지하고 있다. 이는 다음 문제를 야기한다:

1. **D2 RAC divergence**: RAC `<Select items>{item => <SelectItem/>}` render function 패턴이 primitive 배열로는 표현 불가 (per-item 속성 없음). 현재는 element tree 기반으로 우회.
2. **SSOT 이중화**: 동일 컴포넌트 내 "items primitive + SelectItem element" 두 경로 공존.
3. **Editor 이질성**: Tabs/Menu 는 `ItemsManagerField` 통합 에디터, Select/ComboBox 는 `SelectItemEditor`/`ComboBoxItemEditor` 개별 element 에디터 — Property Panel UX 비일관.
4. **ADR-070 Negative 연관**: `CollectionRenderers.tsx:751` `renderMenu` 가 `element.props.selectionMode/selectedKeys/onSelectionChange` 를 `<MenuButton>` 에 미전달. items SSOT 정리 세션에 함께 해소 가능.

> **파일 경로 정정**: `renderSelect`/`renderComboBox` 는 `packages/shared/src/renderers/SelectionRenderers.tsx:619/882` 에 정의. `renderMenu` 만 `packages/shared/src/renderers/CollectionRenderers.tsx:751` 에 있음. 본 ADR 전체에서 이 구분을 준수.

본 ADR 은 Select/ComboBox 를 ADR-066/068 패턴으로 정렬하고, 관련 wiring 이슈를 청산한다.

### Hard Constraints

1. `pnpm type-check` 3 tasks 통과.
2. `pnpm -F @composition/specs test` 전체 PASS. 기존 snapshot 무회귀.
3. Chrome MCP 실측: Select/ComboBox dropdown 옵션 목록 표시 + 선택 동작 + placeholder + disabled 시각 불변.
4. **기존 사용자 데이터 호환성** — 저장된 element tree 의 SelectItem/ComboBoxItem children 을 Select.items/ComboBox.items[] 로 마이그레이션. 마이그레이션 없이 element tree 소멸 금지.
5. ADR-063 D2 정렬 — RAC `<Select items>` / `<ComboBox items>` render function 패턴 채택.

### Soft Constraints

- scope α: Select + ComboBox 한정. ListBox 는 `[data-orientation]`/`--lb-*` 표현 한계 실측 선행 후 ADR-074 에서 처리.
- `renderMenu` wiring fix (ADR-070 Negative 기록) 포함 여부 Decision 에서 확정.
- SelectItemEditor/ComboBoxItemEditor 제거는 마이그레이션 안정화 이후 선택적 후속 Phase.

## Alternatives Considered

### 대안 A: items SSOT 전환 + SelectItem/ComboBoxItem element 소멸 (ADR-066/068 직접 적용)

- **설명**: Select.spec/ComboBox.spec items 타입을 `StoredSelectItem[]`/`StoredComboBoxItem[]` 으로 전환. element tree 에서 SelectItem/ComboBoxItem child 제거. `SelectionRenderers.tsx` 의 `renderSelect`/`renderComboBox` 가 RAC render function 경로로 전환. Property Panel `ItemsManagerField`(type 인터페이스) / `ItemsManager`(React 컴포넌트) 통합. 기존 데이터는 마이그레이션 유틸로 items[] 로 변환.
- **근거**: ADR-066 Tabs / ADR-068 Menu 선례 완결. composition 전체 items SSOT 컨벤션 단일화. RAC 공식 API (`<Select items>` render function) 정합.
- **위험**:
  - 기술: **M** — ADR-066/068 선례 있어 패턴 검증됨. 단 마이그레이션 로직이 새로 설계.
  - 성능: **L** — items 배열 렌더링 성능은 기존 element tree 와 근사.
  - 유지보수: **L** — 3 컴포넌트(Menu/Tabs/Select·ComboBox) items 패턴 단일화로 향후 패턴 결정 비용 0.
  - 마이그레이션: **H** — 기존 저장된 프로젝트 내 Select/ComboBox element 마이그레이션 실패 시 사용자 데이터 손실.

### 대안 B: items[] primitive 풀 인터페이스 확장 + SelectItem/ComboBoxItem element 유지 (이중 구조 온존)

- **설명**: `items?: string[]` → `items?: StoredSelectItem[]` 타입만 전환. element tree 의 SelectItem/ComboBoxItem 유지. 사용자가 둘 중 하나 선택 가능.
- **근거**: 기존 데이터 호환성 즉시 보장 (마이그레이션 0).
- **위험**:
  - 기술: **L** — 타입만 변경.
  - 성능: **L**.
  - 유지보수: **H** — "items 배열" vs "element tree" 이중 경로 영구화. CollectionRenderers 가 둘 다 처리. 향후 신규 기능마다 어느 경로 따를지 결정 비용.
  - 마이그레이션: **L**.

### 대안 C: 현 상태 유지 (do nothing)

- **설명**: Select/ComboBox 를 items SSOT 에 정렬하지 않음. RAC divergence + Editor 이질성 영구.
- **근거**: 즉시 변경 0.
- **위험**:
  - 기술: **L** — 변경 0.
  - 성능: **L**.
  - 유지보수: **H** — ADR-063 D2 정렬 미완성 상태 영구화. 신규 컴포넌트 추가 시 패턴 결정 비용 재발.
  - 마이그레이션: **L**.

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | M    | L    | L        | **H**        |     1      |
| B    | L    | L    | **H**    | L            |     1      |
| C    | L    | L    | **H**    | L            |     1      |

루프 판정: 대안 A/B/C 모두 HIGH 1건. 대안 A의 HIGH는 **일회성 마이그레이션 리스크** (실행 1회 성공 시 해소), 대안 B/C의 HIGH는 **영구 유지보수 부담**. 일회성 리스크 ≻ 영구 부담 원칙에서 대안 A 우위. 추가 대안 필요성 낮음 (B/C는 근본 해결 아님, D로 분할 진행하면 A의 P5 마이그레이션만 분리).

## Decision

**대안 A: items SSOT 전환 + element 소멸 (ADR-066/068 직접 적용)** 을 선택한다.

선택 근거:

1. **ADR-063 D2 정렬 완성** — Tabs/Menu/Select/ComboBox 4개 컴포넌트 items 패턴 단일화. RAC 공식 API 정합.
2. **ADR-066/068 선례 검증** — items SSOT 전환 + element 소멸 패턴이 이미 2회 성공 (Tabs 2026-04-15 / Menu 2026-04-17). 설계 리스크 최소.
3. **마이그레이션 리스크 한정** — 일회성 실행. 실패 케이스 로깅 + rollback 가능. Phase 분할(P5 마이그레이션)로 격리.
4. **Property Panel UX 일관** — ItemsManagerField 통합으로 Menu/Tabs 와 동일 편집 경험.

기각 사유:

- **대안 B 기각**: 이중 경로 영구화는 ADR-063 charter 위배. 향후 RAC 업데이트 추적 + 신규 기능 결정 비용 재발.
- **대안 C 기각**: 현 상태 유지는 ADR-063 D2 정렬 미완성 상태 영구화. ADR-066/068 세션에서 "Select/ComboBox 후속" 이 이미 로드맵화됨 (ADR-068 후속 섹션).

**`renderMenu` wiring fix (ADR-070 Negative) 포함 여부**: 본 ADR scope **포함**. `CollectionRenderers.tsx:751` `renderMenu` 에 `selectionMode/selectedKeys/onSelectionChange` 전달 로직을 함께 정리. `SelectionRenderers.tsx` 수정 세션과 논리적 인접. 별도 commit 으로 분리 (scope 추적 용이).

> 구현 상세: [073-select-combobox-items-ssot-breakdown.md](../design/073-select-combobox-items-ssot-breakdown.md)

## Gates

| Gate           | 시점                       | 통과 조건                                                                                                                                                                                                                                                                                              | 실패 시 대안                                                                                     |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **G1**         | P1~P2 완료 후              | `pnpm type-check` 3/3. `pnpm -F @composition/specs test` 전체 PASS. 기존 snapshot 무회귀 (Select/ComboBox spec 자체 변경은 타입 전환 + properties 확장 범위)                                                                                                                                           | 타입 미스 / snapshot 충돌 지점 식별 후 재조정                                                    |
| **G2**         | P3 완료 후                 | Chrome MCP 실측: Select/ComboBox dropdown 옵션 목록 표시 + 선택 동작 + placeholder + disabled 시각 ADR-073 이전과 동등. **Skia trigger button** 시각 불변 (`render.shapes` 출력이 items 전환에 영향 없음 확인). **ComboBox `allowsCustomValue`** 동작 보존 (items 외 user input 값 허용 RAC 동작 유지) | RAC `<Select items>` render function API 사용 재확인, toRuntime 변환 디버깅                      |
| **G3**         | P4 완료 후                 | Property Panel `ItemsManager` UX 정합 (Menu/Tabs 와 동일 패턴). SelectItemEditor/ComboBoxItemEditor 구 에디터 코드 제거                                                                                                                                                                                | `ItemsManager` 재사용성 확인, `ItemsManagerField` 타입 확장 필요성 재평가                        |
| **G4**         | P5 완료 후                 | 기존 저장 프로젝트의 Select/ComboBox element tree → items[] 마이그레이션 로직 단위 테스트 통과 + rollback 경로 검증. **Supabase elements 테이블 schema** 영향 평가 (parent_id 관계 유지 / child 삭제 cascade / `props.items` 저장 경로) + ADR-068 선례 참조                                            | 마이그레이션 실패 케이스 사용자 데이터 복구 절차 명시. DB-level backfill migration 스크립트 신설 |
| **G5**         | P6 완료 후                 | metadata.ts 에서 SelectItem/ComboBoxItem 제거. store 가 element tree 의 해당 entry 허용 중단. 기존 사용자 프로젝트 로딩 시 자동 마이그레이션 또는 경고                                                                                                                                                 | 마이그레이션 미수행 프로젝트 보호 경로                                                           |
| **G6** (Bonus) | renderMenu fix commit 완료 | Menu 의 `selectionMode`/`selectedKeys` Inspector 변경이 inner Menu 에 정상 반영                                                                                                                                                                                                                        | `<MenuButton>` props wiring 재확인                                                               |

## Residual Risks (의식적 수용 대상)

ADR 승인 시 다음 잔존 위험을 **명시적으로 수용**. 모두 LOW~MEDIUM 수준이며 Phase 분할 / Gate 검증으로 격리됨.

| 위험                                                               | 심각도 | 발생 경로                                                                                                                                                                                                                                      | 처리 계획                                                                                                                                                  |
| ------------------------------------------------------------------ | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **기존 데이터 마이그레이션 실패**                                  |   H    | P5 런타임 element tree → items[] 변환 + P5 DB-level Supabase schema backfill. 사용자 프로젝트 option 유실 가능                                                                                                                                 | Phase 분할 격리 + rollback 경로 + 마이그레이션 단위 테스트 + Chrome MCP 실사용자 프로젝트 검증                                                             |
| **Skia trigger render 회귀**                                       |   M    | Select/ComboBox spec 의 `render.shapes(props, size, state)` 가 trigger button 렌더링. `element.props.items` 타입이 `string[]` → `StoredSelectItem[]` 로 변경되면 shape 생성 로직이 items 길이/label 접근 시 타입 미스 가능성                   | G1 type-check + G2 Chrome MCP Skia trigger 시각 불변 확증. P2 수행 시 `render.shapes` 내부 `props.items` 참조 전수 grep 후 호환                            |
| **ComboBox `allowsCustomValue` 동작 붕괴**                         |   M    | ComboBox 는 `allowsCustomValue: true` 시 user input 이 items 목록 외 값 허용. items SSOT 전환 후 RAC `<ComboBox items>` render function + allowsCustomValue 조합이 기존 동작 보존하는지 불확실                                                 | G2 Chrome MCP 에 ComboBox `allowsCustomValue` 토글 케이스 추가. RAC 공식 예제 (`react-aria.adobe.com/ComboBox`) 참조 필수                                  |
| **Supabase DB 스키마 영향 미평가**                                 |   M    | 현재 SelectItem/ComboBoxItem 이 `elements` 테이블의 `parent_id` 관계로 저장됨. items[] 로 전환 시 `props.items` JSON 컬럼에 흡수되어 `parent_id` 자식 entry 가 orphan 이 됨. cascade delete / cleanup 전략 필요                                | ADR-068 Menu 선례 참조. P5 에 Supabase migration SQL 작성 (`DELETE FROM elements WHERE tag IN ('SelectItem','ComboBoxItem') AND migrated_at IS NOT NULL`)  |
| **`renderSelect` columnMapping/dataBinding 경로 호환**             |   L    | `SelectionRenderers.tsx:630-644` 에 columnMapping / PropertyDataBinding 분기 + SelectItem template-based render function 로직 존재. items[] 전환 후에도 이 경로 유지되어야 dataTable binding 기능 불변                                         | P3 wiring 단계에서 columnMapping/dataBinding 경로 명시적 보존. 기존 template-based render 는 items[] 있으면 items 우선, 없으면 dataBinding 경로 fallback   |
| **Select sub-element (Label/SelectTrigger/SelectValue) 공존 관계** |   L    | `SelectionRenderers.tsx:649-665` 가 Select 의 child element tree 에서 Label/SelectTrigger/SelectValue 를 읽어 label/placeholder 구성. 이들은 SelectItem 과 별개로 유지 필요. items SSOT 전환이 이 sub-element 와의 관계를 훼손하지 않음을 명시 | P3 에서 SelectItem children 만 items 로 흡수, Label/SelectTrigger/SelectValue sub-element 는 element tree 유지 명시. P6 에서 metadata 정리 시 이 구분 보존 |
| **`ItemsManagerField` vs `ItemsManager` 명칭 혼용**                |   L    | ADR-068 도입 시 `ItemsManagerField` 는 `spec.types.ts` 의 properties field type 인터페이스, `ItemsManager` 는 `apps/builder/.../ItemsManager.tsx` 의 React 컴포넌트. 본 ADR 에서 두 이름 혼용 가능                                             | breakdown P4 섹션에 "type: ItemsManagerField / component: ItemsManager" 명시적 분리                                                                        |

## Consequences

### Positive

- **D2 RAC 정렬 완성** — Menu/Tabs/Select/ComboBox 4개 컴포넌트 items SSOT 단일 패턴.
- **SSOT 이중화 해소** — Select/ComboBox 내 primitive + element tree 이중 경로 제거.
- **Property Panel UX 일관성** — ItemsManagerField 통합으로 Menu/Tabs 편집 경험 동일화.
- **ADR-070 Negative 해소** — renderMenu wiring 이슈(selectionMode/selectedKeys 미전달) 동시 청산.
- **ADR-066/068 후속 로드맵 완결** — "Select/ComboBox items SSOT" 후속 과제 해소.

### Negative

- **기존 사용자 데이터 마이그레이션 의존** — Phase 5 마이그레이션 실패 시 사용자 프로젝트 Select/ComboBox option 유실 가능. rollback 경로 설계 필수.
- **SelectItemEditor/ComboBoxItemEditor 제거** — 기존 에디터 UI 익숙한 사용자에게 재학습 비용.
- **ListBox 잔존** — 본 ADR scope α 준수로 ListBox(+ Popover variants.background 교정)는 ADR-074로 분리. 4 컴포넌트군 중 1 개 미완성 상태.
- **metadata.ts / store / runtime 연쇄 변경** — Phase 6 실행 시 기존 코드 경로 대규모 정리 필요.

## 후속 ADR 로드맵

| ADR          | 내용                                                                                             | 본 ADR과의 관계                                            |
| ------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **ADR-074**  | ListBoxItem.spec 신설 + ListBox `skipCSSGeneration` 해체 + Popover.spec variants.background 교정 | ADR-071 containerStyles 인프라 + ADR-073 items 패턴 재사용 |
| ADR-D (선택) | `spec.composition.containerStyles`(legacy, 19 Composite spec) 전수 마이그레이션                  | ADR-071 후속, 우선순위 낮음                                |
