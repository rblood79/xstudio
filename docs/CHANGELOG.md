# Changelog

All notable changes to XStudio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - WebGL Canvas Selection System (2025-12-14)

#### 라쏘 선택 좌표 수정
- **문제**: Shift+드래그 라쏘 선택 시 마우스 위치와 선택 영역 불일치
- **원인**: 화면 좌표를 줌/팬 변환 없이 직접 사용
- **해결**: `screenToCanvas()` 좌표 변환 함수 추가

```typescript
// BuilderCanvas.tsx - ClickableBackground
const screenToCanvas = useCallback((screenX: number, screenY: number) => {
  return {
    x: (screenX - panOffset.x) / zoom,
    y: (screenY - panOffset.y) / zoom,
  };
}, [zoom, panOffset]);
```

#### Cmd+클릭 다중 선택 지원
- **문제**: PixiJS 이벤트에서 modifier 키(metaKey, ctrlKey, shiftKey) 전달 안됨
- **해결**: PixiJS v8 FederatedPointerEvent 구조에 맞춰 modifier 키 추출

```typescript
// 모든 Sprite 컴포넌트에 적용된 패턴
const handleClick = useCallback((e: unknown) => {
  const pixiEvent = e as {
    metaKey?: boolean;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    nativeEvent?: MouseEvent | PointerEvent;
  };

  // PixiJS v8: 직접 속성 우선, nativeEvent 폴백
  const metaKey = pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
  const shiftKey = pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
  const ctrlKey = pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

  onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
}, [element.id, onClick]);
```

#### PixiButton 이벤트 처리 개선
- **문제**: `FancyButton.onPress.connect()`가 modifier 키를 제공하지 않음
- **해결**: `FancyButton.eventMode = 'none'` 설정 + 투명 히트 영역으로 클릭 처리

**수정된 파일:**
- `BuilderCanvas.tsx` - 라쏘 좌표 변환
- `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx` - modifier 키 지원
- `PixiButton.tsx` - 투명 히트 영역 + eventMode 설정
- `BodyLayer.tsx` - modifier 키 지원

---

### Updated - WebGL Canvas Phase 12 (2025-12-12)

- **레이아웃 안전성**: `MAX_LAYOUT_DEPTH`와 `visited` 가드로 순환 트리 무한 재귀 방지, 페이지 단위 레이아웃 캐싱으로 Elements/Selection 중복 계산 제거.
- **선택/정렬 성능**: 깊이 맵 메모이즈로 O(n²) 정렬 제거, SelectionLayer가 전달 레이아웃을 재사용.
- **팬/줌 입력 최적화**: 팬 드래그를 `requestAnimationFrame`으로 스로틀링 후 종료 시 플러시, 휠 줌 로그 스팸 제거.

### Added - WebGL Canvas Phase 12 (2025-12-12)

#### B3.1 DOM-like Layout Calculator
Canvas에서 DOM 레이아웃 방식 재현:

- **Block Layout**: 수직 스택, margin/padding, position: relative/absolute
- **Flexbox Layout**: flexDirection, justifyContent, alignItems, gap
- 안전 기능: MAX_LAYOUT_DEPTH, 순환 참조 감지

**파일:** `src/builder/workspace/canvas/layout/layoutCalculator.ts`

#### B3.2 Canvas Resize Handler (Figma-style)
패널 열기/닫기 시 캔버스 깜빡임 문제 해결:

| 방식 | 깜빡임 | 성능 |
|------|--------|------|
| key prop remount | ❌ 검은 화면 | 느림 |
| 직접 resize | ❌ 깜빡임 | 빠름 |
| CSS Transform + Debounce | ✅ 없음 | 빠름 |

```typescript
// 애니메이션 중: CSS transform scale (즉시)
canvas.style.transform = `scale(${scaleX}, ${scaleY})`;

// 150ms debounce 후: 실제 WebGL resize
app.renderer.resize(width, height);
```

**파일:** `src/builder/workspace/canvas/BuilderCanvas.tsx:77-146`

#### B3.3 Selection System 개선
- SelectionBox: 컨테이너 요소도 테두리 표시
- Transform 핸들: 단일 선택 시 항상 표시 (컨테이너 포함)
- Move 영역: 컨테이너는 비활성화 (자식 클릭 허용)

**파일:** `src/builder/workspace/canvas/selection/SelectionLayer.tsx`

---

### Added - Performance Optimization Track A/B/C Complete (2025-12-11)

엔터프라이즈급 10,000개+ 요소, 24시간+ 안정 사용을 위한 성능 최적화 완료.

#### Track A: 즉시 실행 ✅

**A1. Panel Gateway 패턴 적용**
- 비활성 패널에서 훅 실행 방지로 CPU 최소화
- 적용 위치: `PropertiesPanel.tsx:241-247`, `StylesPanel.tsx:44-50`, `ComponentsPanel.tsx:27-33`

```typescript
export function Panel({ isActive }: PanelProps) {
  if (!isActive) {
    return null;  // ✅ Gateway 패턴
  }
  return <PanelContent />;
}
```

**A2. React Query 네트워크 최적화**
- Request Deduplication (내장 기능)
- 캐시 관리 (staleTime: 5분, gcTime: 30분)
- 설정 위치: `src/main.tsx`, `src/builder/hooks/useDataQueries.ts`

#### Track B: WebGL Builder ✅

**B1. WebGL Canvas 구축**
- 메인 캔버스: `src/builder/workspace/canvas/BuilderCanvas.tsx`
- Sprite 시스템: `sprites/` (BoxSprite, TextSprite, ImageSprite)
- Selection 시스템: `selection/` (SelectionBox, TransformHandle, LassoSelection)
- Grid/Zoom/Pan: `grid/` (GridLayer, useZoomPan)

**B2. Publish App 분리**
- 모노레포: `pnpm-workspace.yaml`
- 공통 코드: `packages/shared/src/`
- Publish App: `packages/publish/src/`

#### Track C: 검증 및 CI ✅

- Seed Generator: `scripts/lib/seedRandom.ts` (Mulberry32 PRNG)
- Long Session Test: `scripts/long-session-test.ts`
- GitHub Actions: `.github/workflows/performance-test.yml`
- SLO Verification: `scripts/verify-slo.ts`

#### 폐기된 항목

| 항목 | 이유 |
|------|------|
| Phase 4 Delta Sync | WebGL에서 postMessage 제거됨 |
| requestDeduplication.ts | React Query로 대체 |
| QueryPersister.ts | React Query 메모리 캐시로 충분 |

#### 관련 문서
- [docs/performance/README.md](performance/README.md)
- [docs/performance/task.md](performance/task.md)
- [docs/performance/10-webgl-builder-architecture.md](performance/10-webgl-builder-architecture.md)

---

### Added - DATA_SYNC_ARCHITECTURE Phase 8-10 (2025-12-07)

#### Phase 8: Auto Refresh 기능
PropertyDataBinding에 자동 갱신 기능 추가

**새 타입:**
```typescript
export type RefreshMode = 'manual' | 'onMount' | 'interval';

export interface DataBindingValue {
  source: 'dataTable' | 'api' | 'variable' | 'route';
  name: string;
  path?: string;
  defaultValue?: unknown;
  refreshMode?: RefreshMode;      // 새로 추가
  refreshInterval?: number;        // 새로 추가 (ms)
}
```

**UI 추가:**
- 갱신 모드 선택 (수동/마운트 시/주기적)
- 주기적 갱신 시 간격 설정 입력

**파일 수정:**
- `src/builder/panels/common/PropertyDataBinding.tsx`
- `src/builder/panels/common/PropertyDataBinding.css`
- `src/builder/hooks/useCollectionData.ts`

#### Phase 9: Error Handling UI 개선
Collection 컴포넌트용 로딩/에러/빈 상태 UI 컴포넌트 추가

**새 컴포넌트:**
- `CollectionLoadingState` - 로딩 스피너
- `CollectionErrorDisplay` - 에러 메시지 + 재시도 버튼
- `CollectionEmptyState` - 빈 데이터 표시
- `CollectionState` - 통합 상태 컴포넌트

**파일 추가:**
- `src/shared/components/CollectionErrorState.tsx`
- `src/shared/components/CollectionErrorState.css`

**ListBox 업데이트:**
- 가상화 렌더링에 로딩/에러 상태 통합
- 재시도 버튼 연동

#### Phase 10: Cache System 구현
API 호출 결과 캐싱으로 중복 요청 방지 및 성능 향상

**새 파일:** `src/builder/hooks/useCollectionDataCache.ts`

**기능:**
- TTL(Time-to-Live) 기반 자동 만료 (기본 5분)
- LRU(Least Recently Used) 정리
- 최대 100개 캐시 항목 제한
- 캐시 키 생성 (`createCacheKey`)
- 수동 캐시 무효화 (`invalidate`, `invalidateMatching`, `clear`)

**API:**
```typescript
const cache = new CollectionDataCache({ ttl: 60000, maxEntries: 100 });
cache.set('key', data);
cache.get<T>('key');
cache.invalidate('key');
cache.invalidateMatching(/pattern/);
cache.clear();
```

**useCollectionData 통합:**
- API 요청 전 캐시 확인
- 응답 데이터 캐시 저장
- `reload()` 시 캐시 무효화
- `clearCache()` 함수 제공

---

### Fixed - useCollectionData 과다 로깅 및 Hooks 순서 오류 (2025-12-07)

#### 문제 1: 과다 콘솔 로깅
**증상:** 컴포넌트 렌더링마다 수백 개의 `🔍 [ComponentName] useCollectionData 실행:` 로그 출력

**원인:** `useMemo` 내부의 디버그 로그가 의존성 변경 시마다 실행

**해결:** 모든 불필요한 `console.log` 제거

**정리된 파일:**
- `src/builder/hooks/useCollectionData.ts` - 15개+ 로그 제거
- `src/builder/hooks/useCollectionDataCache.ts` - 8개 로그 제거
- `src/shared/components/ListBox.tsx` - 6개 로그 제거

#### 문제 2: React Hooks 순서 오류
**증상:** Hot reload 시 "React has detected a change in the order of Hooks" 에러

**원인:** `clearCache` useCallback 추가로 인한 hooks 개수 변경

**해결:**
- `isCanvasContext`를 useMemo 의존성 배열에 추가
- 불필요한 `componentName` 의존성 제거

---

### Fixed - ListBox DataTable 데이터 미표시 버그 (2025-12-07)

#### 문제
DataTable 바인딩된 ListBox에서 데이터가 표시되지 않음

**증상:**
```
[DEBUG] DataTable found: poke {useMockData: false, mockDataLength: 20, runtimeDataLength: 0, resolvedDataLength: 0}
```

#### 원인
`runtimeData`가 빈 배열 `[]`일 때 `mockData`로 fallback되지 않음

```typescript
// 문제 코드
const data = table.useMockData ? table.mockData : (table.runtimeData || table.mockData);
// [] || mockData = [] (빈 배열은 JavaScript에서 truthy)
```

#### 해결
빈 배열 체크 로직 추가

```typescript
// 수정된 코드
const hasRuntimeData = table.runtimeData && table.runtimeData.length > 0;
const data = table.useMockData
  ? table.mockData
  : (hasRuntimeData ? table.runtimeData : table.mockData);
```

**파일:** `src/builder/hooks/useCollectionData.ts:327-333`

---

### Changed - DatasetEditorPanel Tab Management Refactoring (2025-12-03)

#### State Lifting Pattern
DatasetEditorPanel에서 탭 상태를 관리하도록 변경 (이전: 각 에디터 내부에서 관리)

**변경 사항:**
- **DatasetEditorPanel.tsx** - 모든 에디터 탭 상태 관리 (tableTab, apiTab, variableTab, creatorMode)
- **DataTableEditor.tsx** - 내부 탭 상태 제거, `activeTab` prop 수신
- **ApiEndpointEditor.tsx** - 내부 탭 상태 제거, `activeTab` prop 수신 (initialTab 제거)
- **VariableEditor.tsx** - 내부 탭 상태 제거, `activeTab` prop 수신
- **DataTableCreator.tsx** - 내부 mode 상태 제거, `mode` prop 수신

**새 타입 추가 (editorTypes.ts):**
```typescript
export type TableEditorTab = "schema" | "data" | "settings";
export type ApiEditorTab = "basic" | "headers" | "body" | "response" | "test";
export type VariableEditorTab = "basic" | "validation" | "transform";
```

**최종 구조:**
```
DatasetEditorPanel
├── PanelHeader (동적 타이틀)
├── panel-tabs 또는 creator-mode-selection (renderTabs)
└── panel-contents
    └── Editor 컴포넌트 (activeTab prop으로 탭 전달)
```

**관련 문서:** docs/features/DATA_PANEL_SYSTEM.md Section 18

---

### Changed - Dataset Panel Standardization (2025-12-02)

#### Panel Structure Refactoring
- **DatasetPanel** - `panel > panel-contents > section` 표준 구조로 변경
- **DataTableList** - `section > SectionHeader + section-content` 패턴 적용
- **ApiEndpointList** - 동일한 section 패턴 적용
- **VariableList** - section 패턴 + `dataset-subgroup`으로 Global/Page 구분
- **TransformerList** - 동일한 section 패턴 적용

#### Class Naming Standardization
- `dataset-tabs` → `panel-tabs` (일관된 패널 탭 클래스)
- `dataset-tab` → `panel-tab`
- `editor-tabs` → `panel-tabs` (DataTableEditor)
- `editor-tab` → `panel-tab`

#### Component Updates
- **DataTableEditor** - PanelHeader 컴포넌트 사용, 테이블명 편집은 Settings 탭으로 이동
- **DataTableCreator** - PanelHeader 컴포넌트 사용, 패널 형식으로 변경 (기존 popover에서)
- **SectionHeader** - 모든 리스트 컴포넌트에서 공통 SectionHeader 사용

#### Files Modified
- `src/builder/panels/dataset/DatasetPanel.tsx`
- `src/builder/panels/dataset/DatasetPanel.css`
- `src/builder/panels/dataset/components/DataTableList.tsx`
- `src/builder/panels/dataset/components/ApiEndpointList.tsx`
- `src/builder/panels/dataset/components/VariableList.tsx`
- `src/builder/panels/dataset/components/TransformerList.tsx`
- `src/builder/panels/dataset/editors/DataTableEditor.tsx`
- `src/builder/panels/dataset/editors/DataTableEditor.css`
- `src/builder/panels/dataset/editors/DataTableCreator.tsx`
- `src/builder/panels/dataset/editors/DataTableCreator.css`

#### New CSS Classes
- `.dataset-subgroup` - Variables 탭에서 Global/Page 그룹 구분
- `.dataset-subgroup-header` - 서브그룹 헤더
- `.dataset-subgroup-title` - 서브그룹 제목

---

### Fixed - Layout Preset System Critical Bugs (2025-11-28)

#### Same Preset Reapply Bug
- **문제**: 동일한 프리셋(예: 전체화면) 적용 후 다시 같은 프리셋 클릭 시 덮어쓰기 다이얼로그가 표시됨
- **원인**: `sidebar-left`와 `sidebar-right`가 동일한 Slot 이름(`sidebar`, `content`)을 가져 Set 비교로 구분 불가
- **해결**: Slot 이름 비교 대신 `appliedPreset` 키를 body element props에 저장하여 감지
- **파일**: `usePresetApply.ts`, `LayoutPresetSelector/index.tsx`, `styles.css`

```typescript
// body element props에서 직접 읽기
const currentPresetKey = useMemo((): string | null => {
  const body = elements.find((el) => el.id === bodyElementId);
  const appliedPreset = (body?.props as { appliedPreset?: string })?.appliedPreset;
  // appliedPreset이 있고 slot 구성이 일치하면 유효
  if (appliedPreset && LAYOUT_PRESETS[appliedPreset]) {
    // ... slot 검증 로직
    return appliedPreset;
  }
  return null;
}, [elements, bodyElementId, existingSlots]);
```

#### LayoutsTab Body Auto-Select Bug
- **문제**: Layout 모드에서 Slot 선택 시 자동으로 body가 선택되어 버림
- **원인**: body 자동 선택 useEffect가 layout 변경 시뿐 아니라 `layoutElements` 변경 시마다 실행됨
- **해결**: `bodyAutoSelectedRef`를 추가하여 layout 당 한 번만 body 자동 선택 실행
- **파일**: `LayoutsTab.tsx`

```typescript
const bodyAutoSelectedRef = React.useRef<boolean>(false);

useEffect(() => {
  if (layoutChanged) {
    bodyAutoSelectedRef.current = false; // 레이아웃 변경 시 리셋
  }

  // 한 번만 실행
  if (!bodyAutoSelectedRef.current && bodyElement) {
    setSelectedElement(bodyElement.id, ...);
    bodyAutoSelectedRef.current = true;
  }
}, [currentLayout?.id, layoutElements, ...]);
```

#### Critical: Layout Slot Content Duplication Bug
- **문제**: Layout 프리셋 적용 시 Page body 내부의 모든 컴포넌트가 모든 Slot에 복제됨
- **원인**: `renderLayoutElement`에서 Slot 렌더링 시 `slot_name` 필터링 없이 모든 body 자식을 삽입
- **해결**: `slot_name` 매칭 필터 추가 - 각 Slot에는 해당 `slot_name`을 가진 요소만 삽입

**Before (Bug)**:
```typescript
slotContent = pageElements
  .filter((pe) => pe.parent_id === pageBody.id)  // 모든 body 자식
  .sort(...);
```

**After (Fix)**:
```typescript
slotContent = pageElements
  .filter((pe) => {
    if (pe.parent_id !== pageBody.id) return false;
    const peSlotName = (pe.props as { slot_name?: string })?.slot_name || 'content';
    return peSlotName === slotName;  // slot_name 매칭
  })
  .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
```

- **파일**: `PreviewApp.tsx`

---

### Added - Style Panel Improvements (2025-11-24)

#### PropertyUnitInput Shorthand Parsing
- **Shorthand Value Support** - CSS shorthand 값 (예: `"8px 12px"`) 파싱 시 첫 번째 값 추출
- **Smart Change Detection** - 문자열 비교 대신 파싱된 숫자값/단위 비교로 불필요한 onChange 방지
- **Focus Bug Fix** - Mixed 값에서 포커스 인/아웃만 해도 값이 변경되던 버그 수정

#### LayoutSection Figma-style Expandable Spacing
- **Expandable Spacing UI** - Figma 스타일 단일 값 ↔ 4방향 개별 입력 토글
- **Mixed Value Detection** - 4방향 값이 다를 때 "(Mixed)" 라벨 표시
- **4-Direction Grid** - T/R/B/L 개별 입력 그리드 레이아웃
- **Bulk Update** - 축소 모드에서 4방향 동시 업데이트

#### Files Modified
- `src/builder/panels/common/PropertyUnitInput.tsx` - Shorthand 파싱 및 변경 감지 로직
- `src/builder/panels/styles/sections/LayoutSection.tsx` - 확장형 Spacing UI
- `src/builder/panels/common/index.css` - `.layout-spacing`, `.spacing-4way-grid` 스타일

---

### Added - Layout/Slot System Implementation (2025-11-21)

#### Phase 1: Core Infrastructure ✅
- **Database Schema** - `layouts` and `slots` tables with RLS policies
- **Type Definitions** - Layout, Slot, LayoutSlot types in `unified.types.ts`
- **Zustand Store** - `layoutStore.ts` with layouts/slots management
- **API Service** - `LayoutsApiService.ts` for CRUD operations

#### Phase 2: Builder UI ✅
- **Nodes Panel Layouts Tab** - Layout 생성/삭제/선택 UI
- **Slot Component** - 드래그 가능한 Slot 컴포넌트 with React Aria
- **Slot Editor** - Inspector에서 Slot name/required 설정

#### Phase 3: Page-Layout Integration ✅
- **BodyEditor 업데이트** - Page에 Layout 할당 UI (Select 컴포넌트)
- **Element Inspector 업데이트** - Element에 slot_name 지정 UI
- **Preview Rendering** - Layout + Page 합성 렌더링 엔진

#### Phase 4: Complex Component Support ✅ (Bug Fix)
- **ComponentCreationContext 확장** - `layoutId` 필드 추가
- **ComponentFactory 업데이트** - `createComplexComponent()`에 `layoutId` 파라미터 전달
- **Definition 파일 업데이트** - 11개 컴포넌트 정의 함수에 `ownerFields` 패턴 적용
  - `SelectionComponents.ts`: Select, ComboBox, ListBox, GridList
  - `GroupComponents.ts`: Group, ToggleButtonGroup, CheckboxGroup, RadioGroup, TagGroup, Breadcrumbs
  - `LayoutComponents.ts`: Tabs, Tree
  - `FormComponents.ts`: TextField
  - `TableComponents.ts`: Table, ColumnGroup

#### Key Architecture Decisions
- **ownerFields Pattern** - Layout/Page 모드 구분하여 `layout_id` 또는 `page_id` 설정
  ```typescript
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };
  ```
- **Element 소유권** - Element는 `page_id` 또는 `layout_id` 중 하나만 가짐 (상호 배타적)
- **Slot 렌더링** - Preview에서 Slot 위치에 해당 `slot_name` Element들 삽입

#### Files Modified
- `src/builder/factories/types/index.ts`
- `src/builder/factories/ComponentFactory.ts`
- `src/builder/hooks/useElementCreator.ts`
- `src/builder/factories/definitions/SelectionComponents.ts`
- `src/builder/factories/definitions/GroupComponents.ts`
- `src/builder/factories/definitions/LayoutComponents.ts`
- `src/builder/factories/definitions/FormComponents.ts`
- `src/builder/factories/definitions/TableComponents.ts`

#### Related Documentation
- [Layout/Slot System Plan V2](./LAYOUT_SLOT_SYSTEM_PLAN_V2.md) - 전체 구현 계획

---

### Fixed - Theme System & iframe Communication (2025-11-14)

#### Theme Cross-Selection Bug Fix
- **Fixed theme switching between different themes** not applying to Preview
  - Root cause: Hash calculation used string interpolation on objects (incorrect serialization)
  - Solution: Serialize full token structure with `JSON.stringify({ name, value, scope })`
  - Implementation: `useThemeMessenger.ts:33-39`
  - Status: ✅ Cross-theme switching now works correctly

#### Theme Refresh Application Fix
- **Fixed theme not applying after page refresh**
  - Root cause: Zustand subscribe selector pattern had timing issues
  - Solution: Changed from selector subscribe to full store subscribe with length comparison
  - Implementation: `BuilderCore.tsx:263-286`
  - Added automatic token transmission when iframe ready
  - Status: ✅ Theme now applies correctly on refresh

#### iframe Stale Reference Detection
- **Fixed elements not appearing after dashboard → builder re-entry**
  - Root cause: MessageService cached stale iframe references (contentWindow = null)
  - Solution: Automatic stale detection and re-fetch when contentWindow is null
  - Implementation: `messaging.ts:6-16`
  - Added `clearIframeCache()` on BuilderCore unmount
  - Status: ✅ Elements now appear correctly on re-entry

#### Debug Logging Cleanup
- **Removed unnecessary console.log statements**
  - Cleaned 6 files: `useThemeMessenger.ts`, `SettingsPanel.tsx`, `messageHandlers.ts`, `BuilderCore.tsx`, `themeStore.ts`, `messaging.ts`
  - Kept essential warning and error logs
  - Improved console readability for debugging

### Added - Collection Components Data Binding (2025-10-27)

#### ComboBox Filtering Enhancement
- **Added textValue support for auto-complete filtering** in ComboBox with Field-based rendering
  - Calculates searchable text from all visible Field values
  - Concatenates field values with spaces for partial matching
  - Enables searching across multiple fields (e.g., "John" matches name OR email)
  - Implementation: `SelectionRenderers.tsx:719-741`

#### TagGroup ColumnMapping Support
- **Added columnMapping support** for dynamic data rendering in TagGroup
  - Renders Tag for each data item with Field children
  - Supports REST API, MOCK_DATA, and Supabase data sources
  - Consistent pattern with ListBox, GridList, Select, ComboBox
  - Implementation: `CollectionRenderers.tsx:174-384`

#### TagGroup Item Removal System
- **Added non-destructive item removal** with `removedItemIds` tracking
  - Tracks removed item IDs without modifying source data (REST API/MOCK_DATA)
  - Items filtered out before rendering
  - Persisted to database, survives page refresh
  - Integrated with history system for undo/redo
  - Implementation: `TagGroup.tsx:131-151`, `CollectionRenderers.tsx:321-365`

#### TagGroup Restore Functionality
- **Added Inspector UI for restoring removed items**
  - Visual indicator showing count of removed items
  - "♻️ Restore All Removed Items" button
  - One-click restoration of all hidden items
  - Implementation: `TagGroupEditor.tsx:197-214`

#### Initial Component Creation Pattern
- **Standardized initial child items** for all Collection components
  - All components now create only **1 child item** as template for dynamic data
  - **Select**: Changed from 3 SelectItems → 1 SelectItem
  - **ComboBox**: Changed from 2 ComboBoxItems → 1 ComboBoxItem
  - **GridList**: 1 GridListItem
  - **ListBox**: 1 ListBoxItem
  - Consistent template pattern for columnMapping mode
  - Implementation: `SelectionComponents.ts`

#### Collection Components Status Update
- ✅ **ListBox + ListBoxItem**: columnMapping implemented
- ✅ **GridList + GridListItem**: columnMapping implemented
- ✅ **Select + SelectItem**: columnMapping implemented
- ✅ **ComboBox + ComboBoxItem**: columnMapping + textValue filtering implemented
- ✅ **TagGroup + Tag**: columnMapping + removedItemIds implemented
- 🔄 **Menu + MenuItem**: pending
- 🔄 **Tree + TreeItem**: hierarchical data supported, columnMapping pending
- 🔄 **CheckboxGroup + Checkbox**: pending
- 🔄 **RadioGroup + Radio**: pending
- 🔄 **ToggleButtonGroup + ToggleButton**: pending

### Added - Inspector UI/UX Improvements (2025-10)

#### Compact Layout
- **One-line layouts** for related controls to improve space efficiency
  - Font Size + Line Height in a single row with action button
  - Text Align + Vertical Align in a single row
  - Text Decoration + Font Style in a single row
  - Font Weight + Letter Spacing in a single row
  - All layouts follow consistent pattern with `.fieldset-actions`

#### Icon-based Controls
- **Replaced text buttons with icons** for better visual consistency
  - Text Align: `AlignLeft`, `AlignCenter`, `AlignRight`
  - Vertical Align: `AlignVerticalJustifyStart`, `AlignVerticalJustifyCenter`, `AlignVerticalJustifyEnd`
  - Text Decoration: `RemoveFormatting`, `Underline`, `Strikethrough`
  - Font Style: `RemoveFormatting`, `Italic`, `Type` (with skew for oblique)
  - Text Transform: `RemoveFormatting`, `CaseUpper`, `CaseLower`, `CaseSensitive`
- All icon-based controls use `indicator` attribute for consistent visual feedback

#### Auto Option for Style Reset
- **Added "auto" option** to all style properties for inline style removal
  - Properties with auto: Width, Height, Left, Top, Gap, Padding, Margin
  - Properties with auto: Border Width, Border Radius, Border Style
  - Properties with auto: Font Size, Line Height, Font Family, Font Weight, Letter Spacing
- Selecting "auto" removes inline style and falls back to class-defined styles
- Implemented in both `PropertyUnitInput` and `PropertySelect` components

### Changed

#### Input Control Improvements
- **Separated immediate input from blur input** in `PropertyUnitInput`
  - Input changes only update local state during typing
  - Style changes apply on blur or Enter key press
  - Prevents value accumulation issues (e.g., "16" becoming "116")
  - Added Enter key support for immediate value application

#### PropertySelect Enhancements
- **Ellipsis handling** for long option labels
  - Added `text-overflow: ellipsis` with `overflow: hidden`
  - Fixed width constraints with `min-width: 0` throughout component hierarchy
  - Prevents Font Weight from expanding and squeezing Letter Spacing
  - Flex layout with proper width constraints in `.react-aria-Button`

### Fixed

#### Synchronization Issues
- **Element switching now properly updates styles**
  - Added `style` and `computedStyle` comparison in Inspector component
  - Previous elements' style values no longer persist when selecting new elements
  - Fixed `mapElementToSelected` to initialize style as empty object instead of undefined
  - Fixed `mapSelectedToElementUpdate` to always include style property (even empty object)

#### Style Application
- **Inline style changes now properly sync to Builder**
  - Empty style objects now transmitted to Builder for style removal
  - Fixed conditional check to use `!== undefined` instead of truthy check
  - Style deletions via "auto" option now properly reflected in preview

## Related Documentation

- [Inspector Style System](./features/INSPECTOR_STYLE_SYSTEM.md) - Comprehensive guide to style management
- [ToggleButtonGroup Indicator](./features/TOGGLEBUTTONGROUP_INDICATOR.md) - Indicator implementation details
- [CLAUDE.md](../CLAUDE.md) - Development guidelines and architecture

## Breaking Changes

None in this release.

## Migration Guide

No migration needed for this release. All changes are backward compatible.
