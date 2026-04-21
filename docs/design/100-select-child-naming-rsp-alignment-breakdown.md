# ADR-100 구현 상세 — Select 자식 네이밍 RSP 정합 (ADR-098-a 슬롯)

> ADR-100 본문: [100-select-child-naming-rsp-alignment.md](../adr/100-select-child-naming-rsp-alignment.md)
>
> 본 문서는 ADR-100 Decision (대안 C — SelectItem 내부 개념 정리 + SelectTrigger composition 고유 유지 정당화) 의 Phase 단위 실행 상세. ADR-098 감사 Charter 의 "098-a 슬롯" 구현.

## BC 영향 재평가 (ADR-098 breakdown 정정)

ADR-098 breakdown 의 후보 #1 은 SelectItem/SelectTrigger 를 **일괄 HIGH BC** 로 분류했으나, 2026-04-21 현장 재조사 결과 두 식별자의 BC 영향이 **비대칭** 함을 확인. 본 ADR 은 이 비대칭을 반영한 분할 결정.

### SelectItem BC 재평가 — **실질 0%**

ADR-073 (`docs/adr/completed/073-select-combobox-items-ssot.md`) 에서 Select items 를 `StoredSelectItem[]` SSOT 로 이관 완료. 저장 데이터에 `element.tag === "SelectItem"` 이 **더 이상 존재하지 않음** (items 배열 내부 객체는 `{ id, label, value, ... }` 구조, `tag` 필드 없음).

- `rg "\"SelectItem\"" --type ts` = 26 occurrences / 11 files
- 11 files 내역: docs 2 + migration 테스트 4 + SelectionRenderers 1 + elementRemoval 1 + runtime 3
- **저장 데이터 migration 불필요** — 모든 occurrence 는 runtime 변환 / 테스트 / 문서. SSOT migration 오케스트레이터(`applyCollectionItemsMigration`) 확장 없음
- 리네이밍 시 변경 범위: runtime 식별자 상수 "SelectItem" → "ListBoxItem" (또는 "SelectItem" alias 유지) + SelectionRenderers 내부 분기 명칭 + 문서/주석

### SelectTrigger BC 재평가 — **실질 HIGH**

SelectTrigger 는 ADR-073 이후에도 **Compositional Architecture 유지** — Select 의 자식 Element 로 저장 데이터에 `element.tag === "SelectTrigger"` 직렬화.

- `rg "\"SelectTrigger\"" --type ts` = 23 occurrences / 14 files
- 14 files 내역: spec 2 + factory 1 + runtime 4 (utils/implicitStyles/buildSpecNodeData/HierarchyManager) + SelectionRenderers 1 + docs 3 + 기타
- **저장 데이터 migration 필수** — 모든 Select 사용 프로젝트의 element tree 에 `tag: "SelectTrigger"` 노드 존재. 리네이밍 시 `applyCollectionItemsMigration` 확장 또는 새 migration path 필요
- 재직렬화 영향: Select element 1개 당 자식 SelectTrigger 1개 → **100% 영향** (composition 기반 모든 프로젝트)

### 수식화 결론

| 식별자        | occurrence | files |      저장 데이터 영향       | migration 필요 | BC 등급 |
| ------------- | :--------: | :---: | :-------------------------: | :------------: | :-----: |
| SelectItem    |     26     |  11   |       0% (items SSOT)       |       ❌       |   LOW   |
| SelectTrigger |     23     |  14   | 100% (모든 Select 프로젝트) |       ✅       |  HIGH   |

## 핵심 설계 문제

RAC 공식 Select 구조:

```tsx
<Select>
  <Label />
  <Button>
    {/* ← composition 의 SelectTrigger */}
    <SelectValue />
  </Button>
  <Popover>
    <ListBox>
      <ListBoxItem />
      {/* ← composition 의 SelectItem */}
    </ListBox>
  </Popover>
</Select>
```

### SelectItem 처리 옵션

- **옵션 α**: 내부 식별자를 "ListBoxItem" 으로 통일 (RAC 공식 정합)
- **옵션 β**: "SelectItem" alias 유지 + runtime 에서 ListBoxItem 으로 매핑
- **옵션 γ**: "SelectItem" 명칭 유지 + 098-e 에서 정당화

### SelectTrigger 처리 옵션

- **옵션 α**: "Button" (RAC 공식 Button slot="trigger") 으로 완전 리네이밍 + migration
  - **문제 1**: composition 의 다른 Button element 와 저장 tag 중복 → runtime discrimination 필요 (`slot="trigger"` 속성으로 구분)
  - **문제 2**: 기존 Button factory/spec 과 혼용 → factory 분기 복잡도↑
  - **문제 3**: LayerTree 에서 사용자가 Select 내부 Button 과 일반 Button 을 시각적으로 구분하기 어려움
- **옵션 β**: "SelectTrigger" 유지 + composition 고유 네이밍 정당화 문서 (098-e 연계)
  - **근거**: Compositional Architecture 에서 각 tag 가 고유 editor/factory/layout 분기를 가짐. Button 중복 시 discriminator 분기 비용↑
  - **근거 2**: ADR-063 D2 도메인 원칙 — "RSP 에 없는 커스텀 prop 임의 도입 금지" 에 적용되나, **composition 고유 tag 네이밍은 D2 의 scope 밖** (tag 는 D2 props 가 아닌 element 식별자, D1 DOM 구조 내 분류)
  - **근거 3**: RAC 는 runtime 에서 `slot="trigger"` 를 Button 에 주입하는 방식 → composition 의 element tree 는 디자인 시점 표현이므로 tag 수준의 명시적 구분이 UX 에 더 적합
- **옵션 γ**: 부분 리네이밍 — `SelectTrigger` 를 `Trigger` 로 단축 (Select 전용 수식어 제거)
  - Button 충돌 없음 + 명칭 간결
  - 여전히 HIGH BC migration 필요

## Phase 구조

### Phase 0 — 현장 데이터 재조사 + 설계 확정 (Completed 2026-04-21)

- [x] `rg "SelectItem"` / `rg "SelectTrigger"` occurrence count 수집
- [x] 저장 데이터 `element.tag` 존재 여부 확인 (items SSOT vs compositional)
- [x] BC 영향 비대칭 확증 — SelectItem 0% vs SelectTrigger HIGH
- [x] RAC 공식 Button slot="trigger" 패턴 vs composition Compositional Architecture 비교
- [x] 3 옵션 × 2 식별자 = 6 조합 평가 → Decision 대안 3건 압축

### Phase 1 — SelectItem 내부 식별자 정리 (BC 0%)

- [ ] `packages/specs/src/types/select-items.ts` 문서 주석 갱신 — RAC `ListBoxItem` 정합 명시 + composition "SelectItem" 용어 일관성
- [ ] `packages/shared/src/renderers/SelectionRenderers.tsx` 내부 변수명 `SelectItem` → `SelectListBoxItem` 또는 유지 결정 (runtime behavior 무변경)
- [ ] `SelectionComponents.ts` factory 에서 runtime render 시 RAC `<ListBoxItem>` 컴포넌트 사용 (이미 사용 중일 가능성 — 확인 필요)
- [ ] 문서/주석 용어 일관성 sweep: "SelectItem" 언급 11 files 중 docs/주석 스캔 후 "ListBoxItem (alias SelectItem)" 형식 통일

### Phase 2 — SelectTrigger composition 고유 유지 정당화 (ADR-098-e 연계)

- [ ] `SelectTrigger.spec.ts` 상단 주석에 RSP 정합 판정 근거 3건 명시 (Compositional Architecture / LayerTree UX / D2 scope 외 tag 분류)
- [ ] ADR-098-e (SelectIcon/CheckboxItems/RadioItems 정당화 문서) 에 SelectTrigger 항목 추가 — 098-e 와 본 ADR-100 의 cross-reference
- [ ] factory SelectTrigger 생성 경로 (`SelectionComponents.ts`) 에 RAC `<Button slot="trigger">` 매핑 확증 (runtime DOM 은 Button, element tag 는 SelectTrigger)
- [ ] LayerTree 아이콘/라벨에 "Select Trigger" (Button) 형태로 부가 설명 표시 — 사용자 혼선 방지

### Phase 3 — Runtime DOM 정합 검증

- [ ] Chrome MCP 실측 — Select element 의 DOM 출력이 RAC 공식 구조 (`<button><SelectValue /></button>` inside Select) 와 정합함을 확인
- [ ] SelectTrigger factory 가 RAC `<Button slot="trigger">` 를 실제 렌더하는지 확인 (Preview DOM 검사)
- [ ] `/cross-check` skill — Skia Select 렌더와 Preview DOM 렌더 시각 정합

### Phase 4 — 문서/ADR 갱신

- [ ] ADR-098 본문에 BC 재평가 Addendum 추가 (breakdown #1 후보 정정 — SelectItem LOW / SelectTrigger HIGH 비대칭)
- [ ] ADR-098-e (정당화 문서 ADR) 미발행 상태라면 본 ADR-100 Phase 2 가 selfcontained 되도록 정당화 섹션 ADR-100 본문에 포함
- [ ] README.md ADR-100 Implemented 전환 + 최상위 요약

### Phase 5 — Status 전환

- [ ] type-check 3/3 + specs 166/166 + builder 227/227 + shared 52/52 PASS
- [ ] ADR-100 Status: Proposed → Implemented
- [ ] ADR-098 Charter Implemented 전환 검토 (본 ADR 이 첫 완결 분할 ADR)

## 반복 패턴 선차단 체크

- ✅ **#1 코드 경로 인용**:
  - `packages/specs/src/components/SelectTrigger.spec.ts` (L1-60 현재 구조)
  - `packages/specs/src/components/Select.spec.ts` (L64 items SSOT)
  - `packages/specs/src/types/select-items.ts` (StoredSelectItem 정의)
  - `apps/builder/src/builder/factories/definitions/SelectionComponents.ts` (SelectTrigger factory)
  - `packages/shared/src/renderers/SelectionRenderers.tsx` (RAC 매핑)
  - `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` + `implicitStyles.ts` + `skia/buildSpecNodeData.ts` (runtime 분기)
- ✅ **#2 Generator 확장 여부**: Phase 1/2 모두 문서 + 주석 + runtime 내부 정리. `CSSGenerator` 확장 **불필요** (spec 파일 자체 유지).
- ✅ **#3 BC 훼손 수식화**:
  - SelectItem: **0% / 0 파일 재직렬화** (items SSOT 내부 구조, `tag` 필드 없음)
  - SelectTrigger: **100% Select 프로젝트 영향, 평균 N 개 element (N = 프로젝트 내 Select 개수)** — 단 본 ADR 은 SelectTrigger **유지** 결정 → 실제 migration 0건
  - 대안 A (완전 리네이밍) 기각 근거 = BC HIGH 회피
- ✅ **#4 Phase 분리 가능성**: 5 Phase. Phase 1 (SelectItem) + Phase 2 (SelectTrigger 정당화) 는 독립 → 필요 시 별도 ADR 로 재분리 가능하나 본 ADR 에서는 Select 자식 전체를 한 결정으로 묶는 것이 감사 charter 의도에 부합.

## 2026-04-21 기준선 (sanity)

```bash
pnpm -w type-check                                # 3/3 PASS (38ms FULL TURBO cached)
cd packages/specs && pnpm exec vitest run         # 166/166 PASS
cd apps/builder && pnpm test -- --run             # 227/227 PASS
cd packages/shared && pnpm exec vitest run        # 52/52 PASS
```

## 검증 체크리스트 (본 ADR 완료 기준)

- [x] Phase 0 BC 재평가 + 3 대안 평가 완료
- [ ] Phase 1 SelectItem 내부 정리 + 문서 용어 일관성
- [ ] Phase 2 SelectTrigger 정당화 문서 + factory Button slot 매핑 확증
- [ ] Phase 3 Chrome MCP runtime DOM 검증
- [ ] Phase 4 ADR-098 Addendum + README 갱신
- [ ] Phase 5 Status Implemented

## 잠재 후속 ADR

- **100-a (필요 시)**: SelectTrigger 를 "Trigger" (옵션 γ) 로 단축 리네이밍 — BC HIGH, Select 프로젝트 migration 필요. 본 ADR 에서 기각했으나 향후 컴포넌트 라이브러리 일관성 재검토 시 후보
- **098-e 연계**: SelectIcon + CheckboxItems + RadioItems + SelectTrigger 정당화 문서 ADR (composition 고유 네이밍 유지 근거 통합 문서)
