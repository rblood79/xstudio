# ADR-073 구현 상세 — Select/ComboBox items SSOT + wiring 정리

> **관련 ADR**: [073-select-combobox-items-ssot.md](../adr/073-select-combobox-items-ssot.md)
> **선례**: [ADR-066 Tabs items SSOT](../adr/completed/066-tabs-items-ssot-migration.md), [ADR-068 Menu items SSOT + MenuItem Spec](../adr/completed/068-menu-items-ssot-and-menuitem-spec.md)
> **SSOT 맥락**: [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md) D2(Props/API) 정렬 + D3(시각 스타일) 보완.

## 목표

ADR-066/068 패턴을 Select/ComboBox 로 확장. 현재 `items?: string[]` primitive 수준 + SelectItem/ComboBoxItem element tree 공존 구조를 **`items?: StoredSelectItem[]` / `StoredComboBoxItem[]` 풀 인터페이스 단일 SSOT** 로 전환.

Scope α: Select + ComboBox 한정. ListBox 는 `[data-orientation]`/`--lb-*` 표현 한계 실측이 선행되어야 하므로 후속 ADR (ADR-074 또는 연동) 에서 처리.

## 현재 상태 (main `8ed33889` 기준)

- **`Select.spec.ts:64`**: `items?: string[]`
- **`ComboBox.spec.ts:54`**: `items?: string[]`
- **element tree**: SelectItem / ComboBoxItem child element 가 store 에 물리적 존재 (metadata.ts:905/918 등록)
- **Editors**: `SelectItemEditor`, `ComboBoxItemEditor` (Property Panel 에서 개별 element 편집)
- **Renderer 파일 분리 (CRITICAL)**:
  - `packages/shared/src/renderers/SelectionRenderers.tsx:619` `renderSelect`
  - `packages/shared/src/renderers/SelectionRenderers.tsx:882` `renderComboBox`
  - `packages/shared/src/renderers/CollectionRenderers.tsx:751` `renderMenu` (Bonus 영역)
- `SelectionRenderers.renderSelect` 는 현재 `context.childrenMap.get(element.id).filter(c => c.tag === "SelectItem")` 경로로 element tree 의 SelectItem children 에서 options 정보를 가져옴. `element.props.items` (primitive string[]) 은 별도 부수적 용도.

## Phase 구조

### P1 — Types 신설 (`packages/specs/src/types/`)

- `select-items.ts` 신설: `StoredSelectItem` (직렬화) + `RuntimeSelectItem` (함수 변환)
- `combobox-items.ts` 신설: `StoredComboBoxItem` (직렬화) + `RuntimeComboBoxItem` (함수 변환)
- 필드: `id / label / value / textValue? / isDisabled? / icon? / description? / onActionId?`
- `types/index.ts` 에 re-export
- `toRuntimeSelectItem(stored, resolveActionId)` / `toRuntimeComboBoxItem(...)` 변환 함수 signature 준비 (구현은 P3)

### P2 — Select.spec.ts / ComboBox.spec.ts `items` 필드 타입 전환

- `items?: string[]` → `items?: StoredSelectItem[]` / `StoredComboBoxItem[]`
- properties 섹션에 `items-manager` field type 추가 (ADR-068 패턴)
- defaultItem + itemSchema 정의 (Menu.spec 의 itemSchema 참조)
- **`render.shapes` 무회귀 확증** — Select/ComboBox 는 trigger button 을 Skia 로 렌더. spec 내부 `render.shapes(props, size, state)` 가 `props.items` 배열 길이/label 참조하면 타입 변경 영향 가능 → P2 작업 시 grep 으로 전수 점검, 참조 없으면 변경 불필요, 참조 있으면 new type 에 맞게 재작성
- **`_hasChildren` 분기** (`items` 존재 시 trigger-only 렌더) 로직 유지

### P3 — SelectionRenderers `renderSelect` / `renderComboBox` wiring

**주의**: 파일은 `SelectionRenderers.tsx` (NOT `CollectionRenderers.tsx`).

변경 경로:

- `items` 배열 존재 시 RAC `<Select items={runtime}>{(item) => <SelectItem/>}` render function 경로 사용
- `toRuntimeSelectItem` / `toRuntimeComboBoxItem` 변환 (onActionId → onAction 함수)
- 기존 element tree 의 SelectItem/ComboBoxItem children 은 **fallback 경로**로 유지 (P6 에서 소멸)

**보존 필수 기능**:

- **Sub-element 관계**: `SelectionRenderers.tsx:649-665` 에서 Select 의 child element tree 에서 Label/SelectTrigger/SelectValue 읽어 label/placeholder 구성. items SSOT 전환 후에도 **이 sub-element 는 element tree 유지** (SelectItem/ComboBoxItem 만 items[] 로 흡수). P6 metadata 정리 시 Label/SelectTrigger/SelectValue entry 는 건드리지 않음.
- **columnMapping / PropertyDataBinding**: `SelectionRenderers.tsx:630-644` 의 dataTable binding 경로는 기존 동작 보존. items[] 있으면 items 우선, 없으면 dataBinding 경로 fallback. 이 분기 유지 필수.
- **ComboBox `allowsCustomValue`**: RAC `<ComboBox items allowsCustomValue>` 조합 시 user input 이 items 외 값 허용되는지 실측 필수 (Gate G2).

### P4 — Editors 전환

**명칭 구분 (CRITICAL)**:

- `ItemsManagerField` — `packages/specs/src/types/spec.types.ts` 의 properties field type **interface**
- `ItemsManager` — `apps/builder/src/builder/panels/properties/generic/ItemsManager.tsx` 의 React **component**
- Spec field type 문자열: `"items-manager"` (kebab-case)

변경:

- `SelectItemEditor` / `ComboBoxItemEditor` 제거
- Select.spec / ComboBox.spec 의 properties 섹션에 `type: "items-manager"` field 추가 → `SpecField.tsx` 가 자동으로 `ItemsManager` 컴포넌트 호출 (ADR-068 P2 선례)
- Property Panel UX 일관성 (Menu/Tabs 와 동일 편집 경험)

### P5 — Data migration (CRITICAL — 사용자 데이터 보호)

**런타임 레벨**:

- 기존 저장된 element tree 의 SelectItem/ComboBoxItem children → Select/ComboBox.items[] 로 변환
- `migrateSelectItemsToArray` / `migrateComboBoxItemsToArray` 유틸 신설 (`packages/shared/src/utils/migrateSelectComboBoxItems.ts`)
- 마이그레이션 실행 시점: 프로젝트 로드 시 자동 실행 + 1회 flag (`migrated_at` 기록)

**DB 스키마 레벨 (Supabase)**:

- `elements` 테이블의 SelectItem/ComboBoxItem row 들이 `parent_id` 관계로 저장됨. items[] JSON 흡수 후 orphan → cleanup 필요
- Supabase migration SQL 신설:
  ```sql
  -- 1. props.items JSON 에 child SelectItem/ComboBoxItem 필드 backfill
  --    (Select/ComboBox element 별로 child row 수집 → props.items JSON 업데이트)
  -- 2. child SelectItem/ComboBoxItem row 삭제 (backfill 완료 후)
  DELETE FROM elements
  WHERE tag IN ('SelectItem', 'ComboBoxItem')
    AND parent_id IN (
      SELECT id FROM elements
      WHERE tag IN ('Select', 'ComboBox')
        AND (props->>'migrated_at') IS NOT NULL
    );
  ```
- ADR-068 Menu 선례의 migration SQL 참조 필수 (MenuItem 동일 구조)
- **rollback 경로**: migration SQL 실행 전 Supabase backup snapshot + 실패 시 복구 절차 문서화

### P6 — SelectItem / ComboBoxItem element 소멸 (선택, P5 후속)

- `metadata.ts` 에서 SelectItem/ComboBoxItem entry 제거
- SelectItemEditor/ComboBoxItemEditor 파일 삭제
- store 에서 element tree 의 SelectItem/ComboBoxItem 허용 중단 (validation)
- **Label/SelectTrigger/SelectValue entry 는 유지** (P3 보존 필수 기능)

### Bonus — ADR-070 Negative 연관 이슈: `renderMenu` wiring

- `packages/shared/src/renderers/CollectionRenderers.tsx:751` (NOT :761) `renderMenu` 가 `element.props.selectionMode / selectedKeys / onSelectionChange` 를 `<MenuButton>` 에 미전달
- 본 ADR scope 포함 (별도 commit 으로 분리 — scope 추적 용이)
- 수정 내용: `<MenuButton>` 에 3 props 추가 + `onSelectionChange` 콜백이 `updateElementProps` 로 `selectedKeys` 동기화

## 영향 범위

| 영역              | 파일                                                                        | 변경                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Types             | `packages/specs/src/types/select-items.ts`                                  | 신설 (Stored/Runtime interface + toRuntime 함수)                                                                      |
| Types             | `packages/specs/src/types/combobox-items.ts`                                | 신설 (Stored/Runtime interface + toRuntime 함수)                                                                      |
| Types             | `packages/specs/src/types/index.ts`                                         | re-export 추가                                                                                                        |
| Spec              | `packages/specs/src/components/Select.spec.ts`                              | `items` 타입 전환 + properties `items-manager` + render.shapes 타입 호환 점검                                         |
| Spec              | `packages/specs/src/components/ComboBox.spec.ts`                            | 동일                                                                                                                  |
| **Renderer**      | **`packages/shared/src/renderers/SelectionRenderers.tsx`**                  | **renderSelect (line 619) / renderComboBox (line 882) wiring + toRuntime 변환 + sub-element 보존 + dataBinding 호환** |
| **Renderer**      | **`packages/shared/src/renderers/CollectionRenderers.tsx`**                 | **Bonus: renderMenu (line 751) 에 selectionMode/selectedKeys/onSelectionChange 전달 추가**                            |
| Editors           | `apps/builder/src/builder/panels/properties/editors/SelectItemEditor.tsx`   | 제거 (P4)                                                                                                             |
| Editors           | `apps/builder/src/builder/panels/properties/editors/ComboBoxItemEditor.tsx` | 제거 (P4)                                                                                                             |
| Migration runtime | `packages/shared/src/utils/migrateSelectComboBoxItems.ts`                   | 신설 (P5 runtime 레벨)                                                                                                |
| Migration SQL     | `supabase/migrations/{timestamp}_select_combobox_items_backfill.sql`        | 신설 (P5 DB 레벨)                                                                                                     |
| Metadata          | `packages/shared/src/components/metadata.ts`                                | P6 — SelectItem/ComboBoxItem entry 제거 (Label/SelectTrigger/SelectValue 유지)                                        |

## Gate 기준

| Gate           | 시점                         | 통과 조건                                                                                                                                                                                                                                                                          | 실패 시 대안                                                                                             |
| -------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **G1**         | P1~P2 완료 후                | `pnpm type-check` 3/3 + `CSSGenerator.snapshot` 무회귀 + Select/ComboBox spec `render.shapes(props, size, state)` 가 `props.items` 새 타입에 호환 (grep 전수 점검)                                                                                                                 | 타입 미스 / snapshot 충돌 지점 식별 후 재조정. render.shapes 내부 items 참조 수정                        |
| **G2**         | P3 완료 후                   | Chrome MCP 실측: Select/ComboBox dropdown 옵션 목록 표시 + 선택 동작 + placeholder + disabled 시각 ADR-073 이전과 동등. **Skia trigger button** 시각 불변. **ComboBox `allowsCustomValue`** user input 허용 동작 보존 (items 외 값 선택 가능). columnMapping/dataBinding 경로 불변 | RAC `<Select items>` / `<ComboBox items allowsCustomValue>` render function API 재확인. toRuntime 디버깅 |
| **G3**         | P4 완료 후                   | Property Panel `ItemsManager` UX 정합 (Menu/Tabs 와 동일 패턴). SelectItemEditor/ComboBoxItemEditor 구 에디터 코드 제거                                                                                                                                                            | `ItemsManager` 재사용성 확인, `ItemsManagerField` 타입 확장 필요성 재평가                                |
| **G4**         | P5 완료 후                   | 기존 저장 프로젝트의 Select/ComboBox element tree → items[] 마이그레이션 로직 단위 테스트 통과 + rollback 경로 검증. **Supabase migration SQL** dry-run 통과 + backup snapshot 생성 후 실행. orphan child row 0 확인                                                               | 마이그레이션 실패 케이스 사용자 데이터 복구 절차 명시. DB 복원 SQL 준비                                  |
| **G5**         | P6 완료 후                   | metadata.ts 에서 SelectItem/ComboBoxItem 제거. store 가 element tree 의 해당 entry 허용 중단. 기존 사용자 프로젝트 로딩 시 자동 마이그레이션 또는 경고. Label/SelectTrigger/SelectValue entry 유지 확증                                                                            | 마이그레이션 미수행 프로젝트 보호 경로 (legacy fallback 임시 유지)                                       |
| **G6** (Bonus) | `renderMenu` fix commit 완료 | Menu 의 `selectionMode` / `selectedKeys` Inspector 변경이 inner Menu 에 정상 반영. `onSelectionChange` 콜백이 store 로 propagate                                                                                                                                                   | `<MenuButton>` props wiring 재확인                                                                       |

## 금지 사항 (SSOT 보존)

- ❌ ListBox / ListBoxItem 수정 (ADR-074 scope)
- ❌ Menu/MenuItem 변경 (ADR-068 완료 영역)
- ❌ Tabs/Tab 변경 (ADR-066 완료 영역)
- ❌ 기존 Select/ComboBox 저장 데이터 호환성 파괴 (P5 마이그레이션 없이 P6 진행 금지)
- ❌ **`renderSelect`/`renderComboBox` 를 `CollectionRenderers.tsx` 에서 찾지 말 것** — 실제 위치는 `SelectionRenderers.tsx:619/882`
- ❌ Select 의 Label/SelectTrigger/SelectValue sub-element 를 items[] 에 흡수 (SelectItem/ComboBoxItem 만 흡수)
- ❌ ComboBox `allowsCustomValue: true` 동작 붕괴 (items 외 user input 값 허용 RAC 동작 보존 필수)

## 후속

- **ADR-074** (가칭): ListBoxItem.spec 신설 + ListBox skipCSSGeneration 해체 + Popover.spec variants.background 교정 (ADR-071 containerStyles 인프라 + ADR-073 items 패턴 재사용)
- **renderMenu wiring fix** (Bonus): 본 ADR scope 포함 (위 Bonus Phase 참조)
