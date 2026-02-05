# GitHub Actions TypeScript 빌드 오류 수정 계획

> **마지막 검토:** 2025-12-24
> **현재 상태:** ❌ 빌드 실패 (약 245개 TypeScript 에러)
> **검증 명령어:** `pnpm run build` (tsc -b && vite build)

## 결정 사항
1. **Page 타입:** `unified.types.ts`를 마스터로, 이름 필드는 `title`로 통일
2. **PixiJS 이벤트:** camelCase로 일괄 변환 (공식 권장 형식)
3. **Store 속성:** Store 타입에 필요한 속성 추가
4. **React Aria Components:** 타입 변경 대응 필요 (신규)

---

## 에러 분류 요약

| 카테고리 | 파일 수 | 우선순위 |
|----------|--------|----------|
| **React Aria Components 타입 변경** | 8개 | 🔴 높음 |
| **PixiJS UI 컴포넌트** | 50+개 | 🔴 높음 |
| **Canvas 렌더러** | 15개 | 🟡 중간 |
| **Builder Store/Hooks** | 25개 | 🟡 중간 |
| **Page 타입 불일치** | 5개 | 🟡 중간 |
| **Theme 서비스** | 6개 | 🟢 낮음 |
| **기타 유틸리티** | 10+개 | 🟢 낮음 |

---

## 1. React Aria Components 타입 변경 (신규 - 높음)

### 문제
`react-aria-components` 라이브러리 업데이트로 인해 타입 정의가 변경됨.

### 대상 파일 및 에러

#### 1.1 ClassNameOrFunction 타입 호환 문제
| 파일 | 에러 개수 |
|------|----------|
| `src/shared/components/ComboBox.tsx` | 8개 |
| `src/shared/components/GridList.tsx` | 8개 |
| `src/shared/components/Breadcrumbs.tsx` | 7개 |

**에러 패턴:**
```
Type 'ClassNameOrFunction<...>' is not assignable to parameter of type 'string | ((renderProps: unknown) => string) | undefined'.
```

**해결 방안:** `composeClassName` 유틸리티 함수의 타입 시그니처 수정 필요

#### 1.2 firstDayOfWeek 타입 변경
| 파일 | 에러 개수 |
|------|----------|
| `src/shared/components/DatePicker.tsx` | 2개 |
| `src/shared/components/DateRangePicker.tsx` | 2개 |

**에러 패턴:**
```
Type '0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined' is not assignable to type '"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | undefined'.
```

**해결 방안:** 숫자 → 문자열 변환 로직 추가

#### 1.3 기타
| 파일 | 문제 |
|------|------|
| `src/shared/components/Dialog.tsx` | className 타입 문제 |
| `src/shared/components/Menu.tsx` | MenuItem 타입 변환 문제 |
| `src/shared/components/Table.tsx` | keyof T 타입 문제 (3개) |
| `src/shared/components/ColorPicker.tsx` | 타입 호환 문제 (3개) |

---

## 2. PixiJS UI 컴포넌트 (높음)

### 2.1 이벤트 핸들러 (일괄 변환)

**현재 상태:** 38개 소문자 이벤트 핸들러 (27개 파일)

```
onpointertap → onPointerTap
onpointerdown → onPointerDown
onpointerenter → onPointerEnter
onpointerleave → onPointerLeave
```

**대상 파일 (27개):**
| 파일 | 개수 |
|------|------|
| `PixiDisclosureGroup.tsx` | 4 |
| `PixiDisclosure.tsx` | 3 |
| `PixiCalendar.tsx` | 3 |
| `PixiPopover.tsx` | 3 |
| `PixiDialog.tsx` | 3 |
| `PixiTooltip.tsx`, `PixiToolbar.tsx`, `PixiTextArea.tsx` | 각 1 |
| `PixiDropZone.tsx`, `PixiColorPicker.tsx`, `PixiColorArea.tsx` | 각 1 |
| `PixiDatePicker.tsx`, `PixiColorField.tsx`, `PixiColorSlider.tsx` | 각 1 |
| `PixiTimeField.tsx`, `PixiSkeleton.tsx`, `PixiDateField.tsx` | 각 1 |
| `PixiPagination.tsx`, `PixiFileTrigger.tsx`, `PixiForm.tsx` | 각 1 |
| `PixiToast.tsx`, `PixiDateRangePicker.tsx`, `PixiColorWheel.tsx` | 각 1 |
| `PixiGroup.tsx`, `PixiSlot.tsx`, `PixiColorSwatchPicker.tsx`, `PixiColorSwatch.tsx` | 각 1 |

**일괄 변환 명령어:**
```bash
find apps/builder/src/builder/workspace/canvas/ui -name "Pixi*.tsx" -exec sed -i '' \
  -e 's/onpointertap/onPointerTap/g' \
  -e 's/onpointerdown/onPointerDown/g' \
  -e 's/onpointerenter/onPointerEnter/g' \
  -e 's/onpointerleave/onPointerLeave/g' {} \;
```

### 2.2 PixiJS 타입 에러 (50+개)

주요 에러 파일:
- `PixiTree.tsx` (6개)
- `PixiTagGroup.tsx` (6개)
- `PixiTable.tsx` (5개)
- `PixiSwitcher.tsx` (6개)
- `PixiCalendar.tsx` (3개)
- `PixiTextField.tsx`, `PixiInput.tsx` (각 3개)
- 기타 30+개 파일

### 2.3 PixiJS 기타 수정
| 파일 | 수정 내용 |
|------|----------|
| `LayoutEngine.ts` | `fontWeight as TextStyleFontWeight` (4개) |
| `BuilderCanvas.tsx:726` | `stencil` 속성 제거 |
| `pixiSetup.ts` | 타입 에러 2개 |
| `ElementSprite.tsx:848` | 타입 에러 3개 |

---

## 3. Page 타입 통합 (중간)

### 문제: 3곳에서 서로 다르게 정의된 Page 타입

#### `src/types/builder/unified.types.ts` (마스터)
```typescript
export interface Page {
  id: string;
  title: string;         // ← 'title' 사용
  project_id: string;    // 필수
  slug: string;
  parent_id?: string | null;
  order_num?: number;
  created_at?: string;
  updated_at?: string;
  layout_id?: string | null;
}
```

#### `src/services/api/PagesApiService.ts` (API 반환 타입)
```typescript
export interface Page {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  order_num: number;     // ⚠️ 필수
  created_at: string;    // ⚠️ 필수
  updated_at: string;    // ⚠️ 필수
  // parent_id 없음 ❌
  // layout_id 없음 ❌
}
```

#### `src/builder/stores/elements.ts` (로컬 스토어 타입)
```typescript
interface Page {
  id: string;
  name: string;          // ⚠️ 'name' 사용 (다른 곳은 'title')
  slug: string;
  parent_id?: string | null;
  order_num?: number;
  project_id?: string;   // ⚠️ optional
  layout_id?: string | null;
}
```

### 핵심 불일치 요약

| 필드 | unified.types | PagesApiService | elements.ts |
|------|---------------|-----------------|-------------|
| **이름 필드** | `title` | `title` | `name` ⚠️ |
| **project_id** | 필수 | 필수 | optional |
| **order_num** | optional | **필수** ⚠️ | optional |
| **parent_id** | optional | **없음** ⚠️ | optional |
| **layout_id** | optional | **없음** ⚠️ | optional |

### 수정 대상 파일

| 파일 | 에러 개수 | 수정 내용 |
|------|----------|----------|
| `usePageManager.ts` | 10개 | Page 타입 호환 |
| `PageTreeRenderer.tsx` | 1개 | `page.name` → `page.title` |
| `PageParentSelector.tsx` | 7개 | `page.name` → `page.title` |
| `PageLayoutSelector.tsx` | 2개 | 타입 호환 |
| `PagesApiService.ts` | - | 타입 확장 필요 |
| `elements.ts` | - | Page 인터페이스 제거 → import |

---

## 4. Canvas 렌더러 (중간)

| 파일 | 에러 개수 |
|------|----------|
| `SelectionRenderers.tsx` | 11개 |
| `LayoutRenderers.tsx` | 9개 |
| `CollectionRenderers.tsx` | 6개 |
| `DateRenderers.tsx` | 2개 |
| `TableRenderer.tsx` | 2개 |
| `responsiveCSS.ts` | 4개 |
| `messageHandlers.ts` | 6개 |
| `layoutResolver.ts` | 4개 |

---

## 5. Builder Store/Hooks (중간)

| 파일 | 에러 개수 | 주요 문제 |
|------|----------|----------|
| `layoutActions.ts` | 2개 | setElements 호출 |
| `historyHelpers.ts` | 1개 | 타입 호환 |
| `elementUpdate.ts` | 2개 | 타입 호환 |
| `elementCreation.ts` | 3개 | 타입 호환 |
| `panelLayout.ts` | 6개 | 타입 에러 |
| `inspectorActions.ts` | 5개 | 타입 에러 |
| `index.ts` | 2개 | Store 타입 |
| `historyActions.ts` | 2개 | 타입 에러 |
| `elementLoader.ts` | 1개 | 타입 에러 |
| `useIframeMessenger.ts` | 2개 | `params` → `queryParams` |
| `useElementCreator.ts` | 1개 | 타입 에러 |
| `useCollectionData.ts` | 1개 | 타입 에러 |
| `useAsyncData.ts` | 1개 | 타입 에러 |

---

## 6. Theme 서비스 (낮음)

| 파일 | 에러 개수 |
|------|----------|
| `TokenService.ts` | 3개 |
| `ThemeGenerationService.ts` | 1개 |
| `HctThemeService.ts` | 1개 |
| `ExportService.ts` | 2개 |
| `DarkModeGenerator.tsx` | 2개 |
| `AIThemeGenerator.tsx` | 1개 |
| `TokenEditor.tsx` | 4개 |
| `TokenForm.tsx` | 1개 |
| `M3ColorSystemGuide.tsx` | 2개 |

---

## 7. 기타 파일

| 파일 | 에러 개수 | 문제 |
|------|----------|------|
| `src/lib/db/indexedDB/adapter.ts` | 1개 | 타입 에러 |
| `src/lib/db/index.ts` | 3개 | 타입 에러 |
| `src/i18n/LanguageSwitcher.tsx` | 1개 | 타입 에러 |
| `src/hooks/useFrameCallback.ts` | 2개 | 타입 에러 |
| `src/components/particle/SmokeCanvas.tsx` | 1개 | 타입 에러 |
| `EventsPanel.tsx`, `EventDebugger.tsx` 등 | 6개 | Events 관련 |
| `ModifiedStylesSection.tsx` | 3개 | readonly array spread |
| `useStyleSource.ts`, `useZustandJotaiBridge.ts` | 4개 | 타입 에러 |
| `ListBoxEditor.tsx` | 1개 | 타입 에러 |
| `VirtualizedLayerTree.tsx` | 1개 | 타입 에러 |
| `LayoutsTab.tsx` | 2개 | setElements 호출 |
| `BuilderCore.tsx` | 4개 | 타입 에러 |
| `canvasDeltaMessenger.ts` | 2개 | 타입 에러 |
| `useCacheOptimization.ts` | 1개 | 타입 에러 |
| `GridLayout.utils.ts` | 1개 | 타입 에러 |
| `useComponentMemory.ts`, `useMemoryStats.ts` | 3개 | 타입 에러 |
| `CodePreviewPanel.tsx` | 5개 | 타입 에러 |
| `BlockActionEditor.tsx`, `WhenBlock.tsx` | 2개 | 타입 에러 |
| `overlay/index.tsx` | 2개 | 타입 에러 |
| `factories/utils/elementCreation.ts` | 1개 | 타입 에러 |

---

## 실행 순서

### Phase 1: React Aria Components (긴급)
1. `composeClassName` 유틸리티 함수 타입 수정
2. `firstDayOfWeek` 숫자→문자열 변환 로직 추가
3. 기타 shared/components 수정

### Phase 2: PixiJS 일괄 수정
1. 이벤트 핸들러 camelCase 일괄 변환 (sed 명령어)
2. PixiJS 컴포넌트별 개별 타입 에러 수정

### Phase 3: Page 타입 통합
1. `PagesApiService.ts`에 `parent_id`, `layout_id` 추가
2. `elements.ts`에서 로컬 Page 인터페이스 제거
3. `PageTreeRenderer.tsx`, `PageParentSelector.tsx`에서 `name` → `title`
4. `usePageManager.ts` 타입 호환 수정

### Phase 4: 나머지 에러 수정
1. Canvas 렌더러 수정
2. Store/Hooks 수정
3. Theme 서비스 수정
4. 기타 파일 수정

### Phase 5: 검증
```bash
pnpm run build
```

---

## 우선순위 정리

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| 🔴 **높음** | React Aria Components | 빌드 차단, 라이브러리 타입 변경 대응 |
| 🔴 **높음** | PixiJS 이벤트 핸들러 | 일괄 수정 가능, 향후 호환성 |
| 🟡 **중간** | Page 타입 통합 | 런타임 불일치 가능성 |
| 🟡 **중간** | Canvas/Store 타입 | 빌드 차단 |
| 🟢 **낮음** | Theme 서비스 | 기능 동작에 직접적 영향 적음 |
