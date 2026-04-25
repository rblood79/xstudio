# ADR-903 P3-D-1 + P3-D-2 인벤토리

> **목적**: GREEN phase agent 진입 전 사전 분석 자료.
> factory ownership ref 전수 위치 + elementCreation.ts call-site 상세.
>
> **측정일**: 2026-04-26 | **총 ownerFields ref**: 287 (const 선언 60 + ...spread 227)
>
> 참조: [903-phase3d-runtime-breakdown.md](903-phase3d-runtime-breakdown.md) §2.1 §2.2 §4.1 §4.2

---

## §A. Factory ownership 위치 인벤토리

### Signature 패턴 (전수)

10개 파일(TableComponents 포함) 모두 **동일 패턴**:

```ts
// context destructure
const { parentElement, pageId, elements, layoutId } = context;

// ownerFields 선언
const ownerFields = layoutId
  ? { page_id: null, layout_id: layoutId }
  : { page_id: pageId, layout_id: null };

// element 생성 시 spread
const element = { ..., ...ownerFields, ... };
```

**예외**: TableComponents.ts 의 `createTable` / `createColumnGroup` 는 `ComponentDefinition` 반환이 아닌 `Promise<ComponentCreationResult>` 반환 (async). 변환 전략 §C 참조.

---

### A.1 DisplayComponents.ts (14 const + 47 spread = 61)

| factory 함수                         | const ownerFields 선언 L# | ...spread L# (parent + children)            |
| ------------------------------------ | ------------------------- | ------------------------------------------- |
| `createAvatarDefinition`             | 18                        | 37                                          |
| `createAvatarGroupDefinition`        | 61                        | 79, 94, 109, 123                            |
| `createStatusLightDefinition`        | 142                       | 161                                         |
| `createInlineAlertDefinition`        | 184                       | 195, 207, 218                               |
| `createButtonGroupDefinition`        | 239                       | 259, 271, 283                               |
| `createAccordionDefinition`          | 304                       | 322, 334, 343, 350, 363, 372, 379           |
| `createProgressBarDefinition`        | 406                       | 434, 456, 473, 487                          |
| `createMeterDefinition`              | 511                       | 539, 558, 574, 587                          |
| `createProgressCircleDefinition`     | 610                       | 628                                         |
| `createImageDefinition`              | 649                       | 668                                         |
| `createRangeCalendarDefinition`      | 690                       | 713, 724, 735                               |
| `createIllustratedMessageDefinition` | 757                       | 779                                         |
| `createCardViewDefinition`           | 804                       | 831, 854, 868                               |
| `createTableViewDefinition`          | 890                       | 909, 932, 941, 953, 963, 973, 980, 988, 998 |

**변환 후 예상 signature**:

```ts
export function createAvatarDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, elements } = context;
  // parentId는 외부(call-site)에서 canonical tree 조회 후 전달
  // ownerFields spread 제거 → parent_id만 유지
}
```

---

### A.2 DataComponents.ts (2 const + 2 spread = 4)

| factory 함수                | const ownerFields 선언 L# | ...spread L# |
| --------------------------- | ------------------------- | ------------ |
| `createDataTableDefinition` | 29                        | 59           |
| `createSlotDefinition`      | 87                        | 100          |

---

### A.3 DateColorComponents.ts (8 const + 33 spread = 41)

| factory 함수                        | const ownerFields 선언 L# | ...spread L#                 |
| ----------------------------------- | ------------------------- | ---------------------------- |
| `createDatePickerDefinition`        | 39                        | 61, 76, 84, 94, 102, 113     |
| `createDateRangePickerDefinition`   | 140                       | 162, 177, 185, 195, 203, 214 |
| `createCalendarDefinition`          | 242                       | 261, 271, 282                |
| `createDateFieldDefinition`         | 306                       | 327, 342, 350, 359           |
| `createTimeFieldDefinition`         | 383                       | 405, 420, 428, 437           |
| `createColorFieldDefinition`        | 460                       | 479, 494, 507, 520           |
| `createColorPickerDefinition`       | 544                       | 559, 572, 584, 595           |
| `createColorSwatchPickerDefinition` | 621                       | 647, 660                     |

---

### A.4 FormComponents.ts (8 const + 45 spread = 53)

| factory 함수                  | const ownerFields 선언 L# | ...spread L#                                |
| ----------------------------- | ------------------------- | ------------------------------------------- |
| `createTextFieldDefinition`   | 22                        | 48, 63, 75, 87                              |
| `createTextAreaDefinition`    | 111                       | 136, 151, 164, 176                          |
| `createFormDefinition`        | 208                       | 225, 241, 253, 266, 274, 288, 303, 311, 325 |
| `createToastDefinition`       | 350                       | 368, 384, 396                               |
| `createNumberFieldDefinition` | 432                       | 457, 472, 482, 493, 502, 511, 525           |
| `createSearchFieldDefinition` | 559                       | 580, 595, 605, 615, 625, 635                |
| `createSliderDefinition`      | 665                       | (여러 children)                             |
| `createToolbarDefinition`     | 771                       | (여러 children)                             |

---

### A.5 GroupComponents.ts (10 const + 34 spread = 44)

| factory 함수                        | const ownerFields 선언 L# | ...spread L#                      |
| ----------------------------------- | ------------------------- | --------------------------------- |
| `createGroupDefinition`             | 18                        | 33                                |
| `createToggleButtonGroupDefinition` | 52                        | 67, 79, 89                        |
| `createSwitcherDefinition`          | 112                       | 132, 149, 164                     |
| `createCheckboxGroupDefinition`     | 182                       | 202, 217, 223, 233, 246, 258, 271 |
| `createRadioGroupDefinition`        | 293                       | 311, 326, 332, 342, 354, 366, 378 |
| `createTagGroupDefinition`          | 409                       | 437, 450, 456                     |
| `createBreadcrumbsDefinition`       | 478                       | 491, 502, 511, 520                |
| `createCheckboxDefinition`          | 541                       | 561, 571                          |
| `createRadioDefinition`             | 592                       | 607, 617                          |
| `createSwitchDefinition`            | 638                       | 654, 664                          |

---

### A.6 LayoutComponents.ts (3 const + 16 spread = 19)

| factory 함수           | const ownerFields 선언 L# | ...spread L#                           |
| ---------------------- | ------------------------- | -------------------------------------- |
| `createTabsDefinition` | 25                        | 42, 50, 56, 64, 72                     |
| `createCardDefinition` | 96                        | 119, 135, 149, 160, 178, 188, 204, 220 |
| `createTreeDefinition` | 238                       | 251, 262, 271                          |

---

### A.7 NavigationComponents.ts (5 const + 21 spread = 26)

| factory 함수                      | const ownerFields 선언 L# | ...spread L#                      |
| --------------------------------- | ------------------------- | --------------------------------- |
| `createMenuDefinition`            | 20                        | 46                                |
| `createNavDefinition`             | 70                        | 84, 96, 106, 116                  |
| `createPaginationDefinition`      | 141                       | 159, 172, 182, 193, 204, 215      |
| `createDisclosureDefinition`      | 238                       | 251, 262, 270                     |
| `createDisclosureGroupDefinition` | 299                       | 312, 324, 333, 341, 353, 362, 370 |

---

### A.8 OverlayComponents.ts (3 const + 9 spread = 12)

| factory 함수              | const ownerFields 선언 L# | ...spread L#   |
| ------------------------- | ------------------------- | -------------- |
| `createDialogDefinition`  | 22                        | 42, 58, 71, 83 |
| `createPopoverDefinition` | 106                       | 125, 141, 154  |
| `createTooltipDefinition` | 176                       | 193, 208       |

---

### A.9 SelectionComponents.ts (5 const + 16 spread = 21)

| factory 함수               | const ownerFields 선언 L# | ...spread L#            |
| -------------------------- | ------------------------- | ----------------------- |
| `createSelectDefinition`   | 26                        | 56, 71, 81, 90, 99      |
| `createComboBoxDefinition` | 123                       | 155, 170, 180, 190, 199 |
| `createListBoxDefinition`  | 224                       | 266                     |
| `createGridListDefinition` | 288                       | 326                     |
| `createListDefinition`     | 344                       | 359, 369, 377, 385      |

---

### A.10 TableComponents.ts (2 const + 4 spread = 6) — async 변종

| factory 함수        | 반환 타입                          | const ownerFields 선언 L# | ...spread L# |
| ------------------- | ---------------------------------- | ------------------------- | ------------ |
| `createTable`       | `Promise<ComponentCreationResult>` | 34                        | 44, 58, 71   |
| `createColumnGroup` | `Promise<ComponentCreationResult>` | 110                       | 120          |

> **주의**: TableComponents는 async factory. P3-D-1 변환 시 call-site가 다름 — GREEN agent가 `ComponentFactory.ts` 비동기 호출 경로 별도 확인 필수.

---

## §B. elementCreation.ts call-site 인벤토리

**위치**: `apps/builder/src/builder/stores/utils/elementCreation.ts`

### B.1 히스토리 조건 (L71, L191)

**현재 코드 (L71-79)**:

```ts
// TODO(P3-D): layout_id 조건은 P3-D canonical context 기반으로 대체 예정.
if (state.currentPageId || elementToAdd.layout_id) {
  historyManager.addEntry({
    type: "add",
    elementId: elementToAdd.id,
    data: { element: { ...elementToAdd } },
  });
}
```

**현재 코드 (L191-199)**:

```ts
// TODO(P3-D): layout_id 조건은 P3-D canonical context 기반으로 대체 예정.
if (state.currentPageId || parentToAdd.layout_id) {
  historyManager.addEntry({
    type: "add",
    elementId: parentToAdd.id,
    data: {
      element: { ...parentToAdd },
      childElements: normalizedChildren.map((child) => ({ ...child })),
    },
  });
}
```

**breakdown §4.2 변환 후**:

```ts
// P3-D: canonical parent context 기반 조건
const parentNode = canonicalDoc.children.find(n => n.id === element.parent_id);
const isPageContext = parentNode?.metadata?.type === "page";
const isReusableContext = parentNode?.reusable === true;
if (isPageContext || isReusableContext) {
  historyManager.addEntry({...});
}
```

**영향 범위**: 두 함수 `createAddElementAction` (L74) + `createAddComplexElementAction` (L191) 동시 변환 필수.

---

### B.2 order_num 재정렬 (L108-126)

**현재 코드**:

```ts
else if (elementToAdd.layout_id) {
  queueMicrotask(() => {
    const { elements, elementsMap, batchUpdateElementOrders } = get();
    let hasLayoutElements = false;
    elementsMap.forEach((el) => {
      if (el.layout_id === elementToAdd.layout_id) {
        hasLayoutElements = true;
      }
    });
    if (hasLayoutElements) {
      reorderElements(elements, elementToAdd.layout_id!, batchUpdateElementOrders);
    }
  });
}
```

**breakdown §4.2 변환 후**:

```ts
// P3-D: canonical document 내 reusable frame children 조회
const reusableParent = canonicalDoc.getReusableFrame(element.parent_id);
if (reusableParent?.type === "frame" && reusableParent.reusable) {
  // reusable frame 자식만 대상으로 재정렬
  queueMicrotask(() => {
    const { batchUpdateElementOrders } = get();
    batchUpdateElementOrders(reusableParent.id, ...);
  });
}
```

**영향 범위**: `reorderElements` 호출 경로 축소. layout elements 인덱스 제거.

---

### B.3 factory 호출 사이트 (L38-66)

`createAddElementAction` 의 `element` 파라미터는 `ComponentFactory.ts:191` 에서 이미 factory 결과물이다. factory ownership 필드 (`page_id`/`layout_id`) 는 element 객체에 spread된 채로 이 함수에 도달.

**P3-D-1 이후**: factory 결과물에 ownership 필드 없음 → `elementToAdd.layout_id` 조건 항상 falsy → L108 분기 dead code → P3-D-2에서 제거.

---

## §C. Signature 변형 분류

| 분류                                                                                     | 해당 파일                                                                                                                                                               | 비율       | 변환 전략                                                                |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| **표준 sync** `(context: ComponentCreationContext): ComponentDefinition`                 | DisplayComponents, DataComponents, DateColorComponents, FormComponents, GroupComponents, LayoutComponents, NavigationComponents, OverlayComponents, SelectionComponents | 9/10 (90%) | ownerFields 제거 + parentId passthrough                                  |
| **비동기 async** `(context: ComponentCreationContext): Promise<ComponentCreationResult>` | TableComponents                                                                                                                                                         | 1/10 (10%) | 동일 패턴이나 call-site가 `ComponentFactory.ts` 비동기 경로 → await 보존 |

**90%가 동일 패턴** — batch sweep 가능. `TableComponents.ts` 2개 함수만 별도 검증 필요.

---

## §D. 위험 + 의존성 매트릭스

### D.1 HIGH 위험 5개 — 영향 line list

| #   | 위험                                              | 영향 코드 경로                                                                      |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| R1  | 히스토리 조건 제거 → Undo 불가                    | `elementCreation.ts:74` (addElement) + `elementCreation.ts:191` (addComplexElement) |
| R2  | canonical tree에서 Slot 0건 반환                  | `layoutActions.ts:340-355` createGetLayoutSlotsAction (P3-D-3 범위, 별도)           |
| R3  | layout elements 로드 누락 → blank layout          | `usePageManager.ts:513-527` initializeProject (P3-D-4 범위, 별도)                   |
| R4  | postMessage schema 불일치 → preview render broken | `useIframeMessenger.ts:196-209` (P3-D-4 범위, 별도)                                 |
| R5  | ownership 제거 누락 → orphan element              | 10파일 × 모든 ...ownerFields spread (287 위치 전수 — §A 목록)                       |

### D.2 외부 의존성

| 의존성                                      | 상태             | P3-D-1/2 진입 차단 여부                                                                |
| ------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `getCanonicalParentId` (Team 2 storeBridge) | 진행 중          | **P3-D-2 이후** 히스토리 조건 교체 시 필요. P3-D-1 (ownerFields 제거)은 독립 진행 가능 |
| `selectedReusableFrameId` selector          | 이미 land (P3-B) | P3-D-1/2 독립                                                                          |
| `resolveCanonicalDocument`                  | 이미 land (P3-C) | P3-D-1/2 독립                                                                          |
| `legacyOwnershipToCanonicalParent()` (P3-A) | 이미 land        | P3-D-1/2 진입 가능 조건 충족                                                           |

### D.3 P3-D-1/2 진입 가능 조건 확인

P3-A adapter (`legacyOwnershipToCanonicalParent`) 및 `selectedReusableFrameId` 가 모두 land된 상태이므로 **P3-D-1 + P3-D-2 진입 차단 없음**.

단, P3-D-2의 `getCanonicalParentId` 호출은 Team 2 storeBridge 완료 후 활성화 필요 → P3-D-2 초안에는 TODO 마커 유지 권장.

---

## §E. GREEN agent 활용 가이드

1. **P3-D-1 작업 순서**: §A 파일 순서대로 sweep (90% 동일 패턴) → TableComponents 별도 마지막 처리
2. **sweep 검증**: `grep -rnE "ownerFields" apps/builder/src/builder/factories/` → 0 확인
3. **P3-D-2 작업**: §B.1 L71+L191 교체 + §B.2 L108-126 교체
4. **완료 게이트**: type-check 0 errors + factoryOwnership.test.ts todo → assertion 채우기
