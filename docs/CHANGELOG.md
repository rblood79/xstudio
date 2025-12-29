# Changelog

All notable changes to XStudio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed - Save Mode, Preview & Overlay, Element Visualization 설정 제거 (2025-12-29)

#### 개요
WebGL Canvas 전환 및 로컬 우선(Local-first) 아키텍처 변경에 따라 더 이상 필요 없어진 설정 항목들을 제거

#### 제거된 설정
1. **Save Mode** - Supabase 실시간 동기화 제거로 불필요
2. **Preview & Overlay** - WebGL Canvas에서 오버레이 불투명도 설정 불필요
3. **Element Visualization** - iframe 기반 테두리/라벨 표시 WebGL 전환으로 불필요

#### 변경된 파일

**SettingsPanel 정리:**
- `src/builder/panels/settings/SettingsPanel.tsx` - 3개 섹션 제거, Grid & Guides와 Theme & Appearance만 유지

**SaveService 단순화:**
- `src/services/save/saveService.ts` - 항상 IndexedDB에 즉시 저장하도록 단순화
- 삭제: `isRealtimeMode`, `pendingChanges`, `saveAllPendingChanges`, `syncToCloud` 로직

**Store 상태 정리:**
- `src/builder/stores/saveMode.ts` - **파일 삭제**
- `src/builder/stores/canvasSettings.ts` - `showOverlay`, `overlayOpacity`, `showElementBorders`, `showElementLabels` 제거
- `src/builder/stores/index.ts` - `SaveModeState` 슬라이스 제거

**레거시 컴포넌트 정리:**
- `src/builder/main/BuilderCore.tsx` - `showOverlay` 조건부 렌더링 제거
- `src/builder/main/BuilderCanvas.tsx` - element visualization 로직 제거 + `@deprecated` 표시
- `src/builder/overlay/index.tsx` - `overlayOpacity` 참조 제거

#### 아키텍처 변경 배경
- **WebGL Canvas 전환**: iframe 기반 Preview에서 WebGL 기반 캔버스로 전환
- **로컬 우선 저장**: Supabase 실시간 동기화에서 IndexedDB 로컬 저장으로 변경
- **선택 시스템 통합**: WebGL SelectionLayer가 요소 테두리/라벨 표시 담당

---

### Optimized - History Panel 배치 점프 최적화 (2025-12-29)

#### 개요
History Panel에서 복구 포인트 선택 시 중간 과정이 보이는 문제 해결

#### 문제
- 히스토리 항목 클릭 시 `for` 루프로 undo/redo를 한 단계씩 호출
- 각 단계마다 UI가 업데이트되어 중간 상태가 눈에 보임

#### 해결

**1. History Manager 확장**
```typescript
// src/builder/stores/history.ts
goToIndex(targetIndex: number): { entries: HistoryEntry[]; direction: 'undo' | 'redo' } | null {
  // 현재 인덱스와 타겟 사이의 모든 엔트리를 한 번에 반환
  // 인덱스는 원자적으로 업데이트 (중간 렌더링 없음)
}
```

**2. 배치 히스토리 액션**
```typescript
// src/builder/stores/history/historyActions.ts
createGoToHistoryIndexAction() {
  // 모든 엔트리를 한 번에 적용
  // Set 기반 중복 방지로 duplicate key 에러 해결
  // Supabase 에러 try-catch 처리
}
```

**3. HistoryPanel 업데이트**
```typescript
// src/builder/panels/history/HistoryPanel.tsx
const handleJumpToIndex = useCallback(async (targetIndex: number) => {
  // 기존: for 루프로 undo/redo 반복
  // 변경: goToHistoryIndex(targetIndex) 단일 호출
  await goToHistoryIndex(targetIndex);
}, [goToHistoryIndex]);
```

#### 수정된 파일
- `src/builder/stores/history.ts` - `goToIndex` 메서드 추가
- `src/builder/stores/history/historyActions.ts` - `createGoToHistoryIndexAction` 추가
- `src/builder/stores/elements.ts` - `goToHistoryIndex` 액션 export
- `src/builder/panels/history/HistoryPanel.tsx` - 배치 점프 사용

#### 성능 개선

| 시나리오 | 이전 | 이후 |
|---------|------|------|
| 10단계 점프 | 10회 렌더링 | 1회 렌더링 |
| 중간 상태 노출 | 눈에 보임 | 즉시 전환 |
| 사용자 경험 | 깜빡임 | 부드러움 |

---

### Fixed - PanelRegistry 중복 등록 경고 (2025-12-29)

#### 문제
HMR 또는 React StrictMode에서 패널이 중복 등록되어 콘솔 경고 발생

#### 해결
```typescript
// src/builder/panels/core/panelConfigs.ts
export function registerAllPanels() {
  if (PanelRegistry.isInitialized) {
    return; // 이미 등록된 경우 스킵
  }
  PANEL_CONFIGS.forEach((config) => {
    PanelRegistry.register(config);
  });
  PanelRegistry.markInitialized();
}
```

---

### Refactored - Keyboard Shortcuts 시스템 전면 재설계 (2025-12-29)

#### 개요
22개 파일에 분산되어 있던 키보드 단축키 시스템을 5개 핵심 파일로 통합하고, 중앙 집중식 레지스트리 패턴 적용

#### 구현 내용

**1. 중앙 설정 파일 생성**
- `src/builder/config/keyboardShortcuts.ts` - 51개 단축키 정의
- `src/builder/types/keyboard.ts` - 타입 정의

**2. 통합 레지스트리 확장**
```typescript
// src/builder/hooks/useKeyboardShortcutsRegistry.ts
// 기존 기능 + capture phase, priority, scope-aware 필터링 추가
registerShortcut({
  id: 'undo',
  key: 'z',
  modifiers: ['meta'],
  handler: handleUndo,
  scope: 'global',
  priority: 100,
  capture: true,
  allowInInput: false,
});
```

**3. 통합 훅 생성**
- `src/builder/hooks/useGlobalKeyboardShortcuts.ts` - Undo/Redo/Zoom 통합
- `src/builder/hooks/useActiveScope.ts` - 7개 스코프 감지

**4. 개발자 도구**
- `src/builder/devtools/ShortcutDebugger.tsx` - 실시간 디버거 (개발 환경 전용)
- `src/builder/utils/detectShortcutConflicts.ts` - 충돌 감지 유틸리티

**5. 삭제된 파일**
- `src/builder/hooks/useKeyboardShortcuts.ts` → useGlobalKeyboardShortcuts.ts로 통합
- `src/builder/workspace/useZoomShortcuts.ts` → useGlobalKeyboardShortcuts.ts로 통합

#### 성능 개선

| Metric | Before | After | 변화 |
|--------|--------|-------|------|
| 단축키 관련 파일 | 22개 | 5개 | -77% |
| 이벤트 리스너 | 17개 | 2개 | -88% |
| 중앙화 비율 | 45% | 95%+ | ⬆️ |
| 스코프 시스템 | ❌ | 7개 스코프 | ✅ |
| 충돌 감지 | ❌ | ✅ 개발 시점 경고 | ✅ |

#### 관련 문서
- `docs/reference/components/KEYBOARD_SHORTCUTS.md` - 상세 설계 문서

---

### Refactored - Events Panel CSS 통합 (2025-12-29)

#### 개요
Events 패널의 3개 CSS 파일을 1개로 통합하여 중복 제거 및 유지보수성 향상

#### 구현 내용

**1. 병합된 파일**
- `events-legacy.css` (272줄) - 삭제됨
- `events.css` (1127줄) - 삭제됨
- `EventsPanel.css` (2118줄 → 2304줄) - 필수 스타일 추가

**2. 추가된 스타일 (events.css에서 이동)**
- Form Field (`.field`, `.field-label`, `.field-input`, `.field-textarea`)
- Checkbox/Switch (`.checkbox-field`, `.switch-label`)
- Select (`.select-trigger`, `.select-popover`, `.select-listbox`)
- Helper/Error (`.helper-text`, `.error-message`)
- Action Editor 전용 스타일

**3. 수정된 import**
```typescript
// src/builder/panels/events/index.ts
// 제거: import './events.css';
// 제거: import './events-legacy.css';
// EventsPanel.tsx에서 직접 import
```

#### 결과
- 파일 수: 3개 → 1개
- 총 라인: 3517줄 → 2304줄 (약 35% 감소)

---

### Refactored - Color Utilities 통합 (2025-12-29)

#### 개요
2개 위치에 분산된 색상 유틸리티를 1개 파일로 통합

#### 구현 내용

**1. 통합 파일**
- `src/utils/color/colorUtils.ts` - colord 기반 + 레거시 호환 함수

**2. 추가된 레거시 호환 함수 (12개)**
```typescript
export function hslToRgb(hsl: ColorValueHSL): ColorValueRGB;
export function rgbToHsl(rgb: ColorValueRGB): ColorValueHSL;
export function hexToRgb(hex: string): ColorValueRGB | null;
export function rgbToHex(rgb: ColorValueRGB): string;
export function hslToHex(hsl: ColorValueHSL): string;
export function hexToHsl(hex: string): ColorValueHSL | null;
export function hslToString(hsl: ColorValueHSL): string;
export function rgbToString(rgb: ColorValueRGB): string;
export function generateDarkVariant(hsl: ColorValueHSL): ColorValueHSL;
export function parseColorString(colorString: string): ColorValueHSL | null;
export function adjustLightness(hsl: ColorValueHSL, amount: number): ColorValueHSL;
export function adjustSaturationHsl(hsl: ColorValueHSL, amount: number): ColorValueHSL;
export function getSplitComplementaryColors(hsl: ColorValueHSL): [...];
```

**3. 삭제된 파일**
- `src/utils/theme/colorUtils.ts`

**4. 수정된 import (8개 파일)**
- `services/theme/FigmaService.ts`
- `services/theme/ThemeGenerationService.ts`
- `services/theme/HctThemeService.ts`
- `services/theme/ExportService.ts`
- `services/theme/FigmaPluginService.ts`
- `builder/panels/themes/components/TokenEditor.tsx`
- `utils/theme/tokenToCss.ts`
- `utils/theme/hctUtils.ts`

---

### Added - Builder Hooks Barrel Export (2025-12-29)

#### 개요
35개 builder hooks에 대한 barrel export 파일 생성

#### 구현 내용
- `src/builder/hooks/index.ts` 생성
- 카테고리별 그룹핑: Async Operations, Data Management, UI State, Keyboard & Input, Messaging, Theme, Performance, Error Handling, Utilities

---

### Optimized - StylesPanel Jotai 마이그레이션 및 성능 최적화 (2025-12-21)

#### 개요
StylesPanel의 요소 선택 시 발생하던 150-200ms handler violation을 해결하기 위한 Jotai 기반 상태 관리 마이그레이션

#### Phase 3: Jotai 기반 Fine-grained Reactivity

**1. Jotai Atoms 구현 (`atoms/styleAtoms.ts`)**
```typescript
// 35개 이상의 selectAtom 정의 (equality 체크 포함)
export const widthAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.width ?? 'auto',
  (a, b) => a === b  // equality 체크로 불필요한 리렌더 방지
);

// 그룹 atoms (섹션별 값 묶음)
export const transformValuesAtom = selectAtom(
  selectedElementAtom,
  (element) => ({
    width: String(element?.style?.width ?? 'auto'),
    height: String(element?.style?.height ?? 'auto'),
    top: String(element?.style?.top ?? 'auto'),
    left: String(element?.style?.left ?? 'auto'),
  }),
  (a, b) => a?.width === b?.width && a?.height === b?.height && ...
);

// StylesPanel용 atoms
export const hasSelectedElementAtom = selectAtom(...);
export const modifiedCountAtom = selectAtom(...);
export const isCopyDisabledAtom = selectAtom(...);
```

**2. Zustand-Jotai 브릿지 (`hooks/useZustandJotaiBridge.ts`)**
```typescript
export function useZustandJotaiBridge(): void {
  const setSelectedElement = useSetAtom(selectedElementAtom);
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (state.selectedElementId !== prevState.selectedElementId) {
        setSelectedElement(buildSelectedElement(state));
      }
    });
    return unsubscribe;
  }, [setSelectedElement]);
}
```

**3. 섹션별 Jotai 훅**
- `useTransformValuesJotai.ts` - Transform 섹션용
- `useLayoutValuesJotai.ts` - Layout 섹션용
- `useAppearanceValuesJotai.ts` - Appearance 섹션용
- `useTypographyValuesJotai.ts` - Typography 섹션용

**4. StylesPanel 최적화**
```typescript
// 이전: useSelectedElementData() 직접 사용 → 매번 리렌더
// 이후: Jotai atoms 사용 → 값이 동일하면 리렌더 없음

function StylesPanelContent() {
  const hasSelectedElement = useAtomValue(hasSelectedElementAtom);
  const modifiedCount = useAtomValue(modifiedCountAtom);
  const isCopyDisabled = useAtomValue(isCopyDisabledAtom);
  // ...
}

// AllSections, ModifiedSectionsWrapper 분리로 리렌더 격리
const AllSections = memo(function AllSections() { ... });
const ModifiedSectionsWrapper = memo(function ModifiedSectionsWrapper() { ... });
```

#### Phase 4: PropertyColor 최적화

**key={value} 패턴 유지 + Jotai 시너지**
- `key={value}` 패턴: 값 변경 시 재마운트로 상태 동기화
- Jotai selectAtom equality 체크: 동일한 값이면 리렌더 없음 → key 변경 없음 → 재마운트 없음

#### 수정된 파일

**신규 파일:**
- `src/builder/panels/styles/atoms/styleAtoms.ts` - 35+ Jotai atoms
- `src/builder/panels/styles/atoms/index.ts` - exports
- `src/builder/panels/styles/hooks/useZustandJotaiBridge.ts`
- `src/builder/panels/styles/hooks/useTransformValuesJotai.ts`
- `src/builder/panels/styles/hooks/useLayoutValuesJotai.ts`
- `src/builder/panels/styles/hooks/useAppearanceValuesJotai.ts`
- `src/builder/panels/styles/hooks/useTypographyValuesJotai.ts`

**수정된 파일:**
- `src/builder/panels/styles/StylesPanel.tsx` - Jotai atoms 사용, 컴포넌트 분리
- `src/builder/panels/styles/sections/TransformSection.tsx` - Jotai 마이그레이션
- `src/builder/panels/styles/sections/LayoutSection.tsx` - Jotai 마이그레이션
- `src/builder/panels/styles/sections/AppearanceSection.tsx` - Jotai 마이그레이션
- `src/builder/panels/styles/sections/TypographySection.tsx` - Jotai 마이그레이션
- `src/builder/panels/common/PropertyColor.tsx` - key 패턴 문서화
- `src/shared/components/ComboBox.tsx` - ClassNameOrFunction 타입 지원

#### 성능 개선

| 시나리오 | 이전 | 이후 |
|---------|------|------|
| 동일 스타일 요소 간 교차 선택 | 매번 리렌더 (150-200ms) | 리렌더 없음 (0ms) |
| 스타일 값 변경 | 전체 섹션 리렌더 | 해당 섹션만 리렌더 |
| filter="all" 모드 | Zustand 구독 | Zustand 구독 완전 제거 |

---

### Added - Viewport Culling 최적화 (2025-12-20)

#### 개요
뷰포트 외부 요소를 렌더링에서 제외하여 GPU 부하를 20-40% 감소시키는 최적화 구현

#### 구현 내용

**1. useViewportCulling 훅 생성**
```typescript
// src/builder/workspace/canvas/hooks/useViewportCulling.ts
export function useViewportCulling({
  elements,
  layoutResult,
  zoom,
  panOffset,
  enabled = true,
}: UseViewportCullingOptions): CullingResult {
  // AABB 충돌 검사로 뷰포트 내 요소만 필터링
  const viewport = calculateViewportBounds(screenWidth, screenHeight, zoom, panOffset);
  const visibleElements = elements.filter(el => isElementInViewport(el, viewport));
  return { visibleElements, culledCount, totalCount, cullingRatio };
}
```

**2. ElementsLayer에 적용**
```typescript
// src/builder/workspace/canvas/BuilderCanvas.tsx
const { visibleElements } = useViewportCulling({
  elements: sortedElements,
  layoutResult,
  zoom,
  panOffset,
  enabled: true,
});

// visibleElements만 렌더링
{visibleElements.map((element) => (
  <ElementSprite key={element.id} element={element} ... />
))}
```

#### 성능 효과

| 시나리오 | GPU 부하 감소 |
|---------|-------------|
| 화면 밖 요소 50%+ | 20-40% |
| 줌아웃 (10% 이하) | 30-50% |
| 대형 캔버스 (4000x4000+) | 40-60% |

#### 특징
- **100px 마진**: 스크롤/팬 시 깜빡임 방지
- **성능 오버헤드 최소**: 단순 AABB 검사 (O(n))
- **비활성화 가능**: `enabled: false`로 끌 수 있음
- **PixiJS v8 Culler API 대신 수동 방식**: 더 간단하고 예측 가능한 동작

#### 관련 문서
- [11-canvas-resize-optimization.md](./performance/11-canvas-resize-optimization.md)

---

### Fixed - @pixi/react v8 컴포넌트 등록 및 TextField 위치 동기화 (2025-12-17)

#### 개요
@pixi/react v8 공식 패턴으로 컴포넌트 등록 방식을 개선하고, CheckboxGroup/RadioGroup의 orientation 속성 및 TextField의 레이아웃 동기화 문제를 해결

#### 문제
1. **Graphics namespace 오류**: "Graphics is not part of the PIXI namespace" 런타임 오류 발생
2. **Orientation 미작동**: CheckboxGroup/RadioGroup의 orientation (vertical/horizontal) 속성이 동작하지 않음
3. **RadioGroup 너비 불일치**: 세로 모드에서 RadioGroup의 selection 영역 너비가 PixiRadio와 다름
4. **가로 모드 너비 과대 계산**: 가로 모드에서 selection 영역이 실제 렌더링보다 넓게 설정됨
5. **TextField 위치 불일치**: TextField의 input 컨테이너가 TextField 컴포넌트와 위치가 다름
6. **TextField 크기 미측정**: LayoutEngine에 TextField용 크기 측정 함수 부재

#### 해결

**1. pixiSetup.ts - 컴포넌트 등록 개선**
```typescript
export const PIXI_COMPONENTS = {
  // pixi 접두사 컴포넌트 (JSX용)
  pixiContainer: PixiContainer,
  pixiGraphics: PixiGraphics,
  pixiSprite: PixiSprite,
  pixiText: PixiText,
  // 클래스 이름으로도 등록 (@pixi/react 내부 lookup 지원)
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  // ... other components
};

// 모듈 로드 시점에 즉시 등록 (렌더링 전 보장)
extend(PIXI_COMPONENTS);
```

**2. PixiCheckboxGroup/PixiRadio - Orientation 지원**
```typescript
// props.orientation 우선 체크, style.flexDirection fallback
const isHorizontal = useMemo(() => {
  const orientation = props?.orientation;
  if (orientation === 'horizontal') return true;
  if (orientation === 'vertical') return false;
  const flexDirection = (style as Record<string, unknown>)?.flexDirection;
  return flexDirection === 'row';
}, [props?.orientation, style]);
```

**3. LayoutEngine - Orientation 및 크기 계산 동기화**
```typescript
// measureCheckboxGroupSize(), measureRadioSize() - orientation 지원 추가
// calculateRadioItemPositions(), calculateCheckboxItemPositions() - orientation 지원 추가

// RadioGroup: PixiRadio와 동일한 getRadioSizePreset() 사용
const sizeKey = (groupProps?.size as string) || 'md';
const radioPreset = getRadioSizePreset(sizeKey);
const boxSize = radioPreset.radioSize;
const OPTION_GAP = radioPreset.gap;

// 가로 모드 너비: 마지막 아이템 위치 + 너비로 정확히 계산
if (isHorizontal) {
  const lastIndex = itemSizes.length - 1;
  const lastItemX = lastIndex * HORIZONTAL_ITEM_WIDTH;
  const lastItemWidth = itemSizes[lastIndex]?.width || boxSize;
  const optionsWidth = lastItemX + lastItemWidth;
  // ...
}
```

**4. PixiTextField - pixi 접두사 컴포넌트 사용 및 위치 수정**
```typescript
// 잘못된 사용 (수정 전)
<Text text={label} ... />

// 올바른 사용 (수정 후)
<pixiText text={label} style={labelStyle} x={0} y={0} />

// 위치 계산 추가
const posX = parseCSSSize(style?.left, undefined, 0);
const posY = parseCSSSize(style?.top, undefined, 0);

// 루트 컨테이너에 위치 적용
<pixiContainer x={posX} y={posY} ... >
```

**5. LayoutEngine - TextField 크기 측정 함수 추가**
```typescript
const TEXT_FIELD_TAGS = new Set(['TextField', 'TextInput']);

function isTextFieldElement(element: Element): boolean {
  return TEXT_FIELD_TAGS.has(element.tag);
}

function measureTextFieldSize(element, _style): { width, height } | null {
  const preset = getTextFieldSizePreset(sizeKey);
  const width = (props?.width as number) || 240;
  const labelHeight = label ? preset.labelFontSize + preset.gap : 0;
  const descriptionHeight = hasDescription ? preset.descriptionFontSize + preset.gap : 0;
  const totalHeight = labelHeight + preset.height + descriptionHeight;
  return { width, height: totalHeight };
}

// createYogaNode에서 호출
if (isTextFieldElement(element) && (!hasExplicitWidth || !hasExplicitHeight)) {
  const measuredSize = measureTextFieldSize(element, style);
  // ...
}
```

#### 수정된 파일
- `src/builder/workspace/canvas/pixiSetup.ts` - 클래스 이름 등록 + 모듈 레벨 extend()
- `src/builder/workspace/canvas/ui/PixiCheckboxGroup.tsx` - orientation 지원
- `src/builder/workspace/canvas/ui/PixiRadio.tsx` - orientation 지원
- `src/builder/workspace/canvas/ui/PixiTextField.tsx` - pixi 접두사 컴포넌트 + 위치 수정
- `src/builder/workspace/canvas/layout/LayoutEngine.ts` - orientation 동기화 + TextField 측정

---

### Added - CheckboxGroup/RadioGroup Selection Area 및 Label 지원 (2025-12-16)

#### 개요
CheckboxGroup 및 RadioGroup 컴포넌트의 선택 영역과 그룹 라벨을 지원하여 선택/편집 UX 개선

#### 문제
1. **RadioGroup 크기 미측정**: RadioGroup이 width/height 값이 없어 선택 영역이 표시되지 않음
2. **CheckboxGroup 라벨 미지원**: RadioGroup은 그룹 라벨을 지원하지만 CheckboxGroup은 미지원
3. **렌더링 중복**: CheckboxGroup과 자식 Checkbox가 각각 별도로 렌더링되어 겹침 발생
4. **자식 아이템 선택 영역 불일치**: CheckboxGroup/RadioGroup 내부 자식 아이템의 위치/크기가 정상적이지 않음
5. **Selected 상태 미반영**: 자식 아이템의 `isSelected` 프로퍼티 변경 시 시각적 상태가 업데이트되지 않음

#### 해결

**1. LayoutEngine 확장**
```typescript
// CHECKBOX_RADIO_TAGS 수정: Radio → RadioGroup
const CHECKBOX_RADIO_TAGS = new Set(['Checkbox', 'CheckboxGroup', 'RadioGroup']);

// 새 함수 추가
function isCheckboxItemElement(element, elements): boolean  // CheckboxGroup 자식 판별
function measureCheckboxItemSize(element, elements): { width, height }  // 자식 아이템 크기 측정
function measureCheckboxGroupSize(element, elements): { width, height }  // 그룹 크기 측정 (라벨 포함)
function calculateCheckboxItemPositions(pageElements, positions): void  // 자식 위치 계산
```

**2. PixiCheckboxGroup 신규 생성**
- PixiRadio 패턴 기반으로 전체 구현
- 그룹 라벨 지원 (상단에 bold 텍스트)
- props.options 또는 자식 Checkbox 요소에서 옵션 파싱
- 선택된 값 배열 관리

**3. PixiCheckboxItem 신규 생성**
- CheckboxGroup 자식 Checkbox용 투명 hit area 컴포넌트
- 시각적 렌더링은 부모 CheckboxGroup이 담당
- 선택을 위한 이벤트 영역만 제공 (`eventMode="static"`, `alpha: 0`)

**4. ElementSprite 분기 처리**
```typescript
// 태그 분리
const UI_CHECKBOX_GROUP_TAGS = new Set(['CheckboxGroup']);
const UI_CHECKBOX_ITEM_TAGS = new Set(['Checkbox', 'CheckBox', 'Switch', 'Toggle']);

// 조건부 렌더링
case 'checkboxItem':
  if (isCheckboxInGroup) {
    return <PixiCheckboxItem ... />;  // 투명 hit area
  }
  return <PixiCheckbox ... />;  // 독립 체크박스
```

**5. Selected 상태 연동**
```typescript
// PixiRadio.tsx - 자식 Radio의 isSelected 확인
const selectedChild = childRadios.find((radio) => {
  const radioProps = radio.props as Record<string, unknown> | undefined;
  return Boolean(radioProps?.isSelected || radioProps?.checked || radioProps?.defaultSelected);
});

// PixiCheckboxGroup.tsx - 자식 Checkbox의 isSelected 확인
const selectedFromChildren = childCheckboxes
  .filter((checkbox) => {
    const checkboxProps = checkbox.props as Record<string, unknown> | undefined;
    return Boolean(checkboxProps?.isSelected || checkboxProps?.checked || checkboxProps?.defaultSelected);
  })
  .map((checkbox) => String(checkboxProps?.value || checkbox.id));
```

#### 아키텍처 패턴

**투명 Hit Area 패턴:**
- 부모 컴포넌트(CheckboxGroup/RadioGroup)가 시각적 렌더링 담당
- 자식 아이템(PixiCheckboxItem/PixiRadioItem)은 투명 hit area만 제공
- 레이아웃 엔진이 자식 위치 계산하여 `layoutPosition` 전달

**Selected 상태 우선순위:**
1. 그룹 props의 `value`/`selectedValue`/`selectedValues`
2. 자식 아이템의 `isSelected`/`checked`/`defaultSelected`
3. options 배열의 `checked` 필드

**신규/수정 파일:**
- `src/builder/workspace/canvas/ui/PixiCheckboxGroup.tsx` - 신규 생성
- `src/builder/workspace/canvas/ui/PixiCheckboxItem.tsx` - 신규 생성
- `src/builder/workspace/canvas/ui/PixiRadio.tsx` - selectedValue 로직 수정
- `src/builder/workspace/canvas/ui/index.ts` - export 추가
- `src/builder/workspace/canvas/sprites/ElementSprite.tsx` - 분기 처리 추가
- `src/builder/workspace/canvas/layout/LayoutEngine.ts` - 크기/위치 계산 함수 추가
- `src/builder/workspace/canvas/BuilderCanvas.tsx` - 필터 로직 수정

---

### Added - Zoom ComboBox 컨트롤러 (2025-12-15)

#### 개요
줌 컨트롤러의 `<span>비율%</span>`을 React Aria ComboBox로 변경하여 프리셋 선택 및 커스텀 입력 지원

#### 변경 내용
- **ZOOM_PRESETS**: 25%, 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%, 500%
- **ComboBox 기능**:
  - 프리셋 선택 (드롭다운)
  - 커스텀 값 입력 (숫자 직접 입력)
  - Enter 키로 적용
  - Blur 시 자동 적용

**수정된 파일:**
- `src/builder/workspace/Workspace.tsx` - Zoom ComboBox 구현
- `src/builder/workspace/Workspace.css` - ComboBox 스타일

---

### Changed - 캔버스 페이지 경계선 개선 (2025-12-15)

#### 개요
캔버스 페이지 외곽선을 iframe Preview와 동일한 스타일로 통일

#### 변경 내용
- **선 두께**: 2px → 1px
- **색상**: 하드코딩 → `--outline-variant` CSS 변수 사용
- **테마 연동**: MutationObserver로 테마 변경 시 실시간 반영

**신규 함수:**
- `getOutlineVariantColor()` in `cssVariableReader.ts`

**수정된 파일:**
- `src/builder/workspace/canvas/BuilderCanvas.tsx` - CanvasBounds 컴포넌트
- `src/builder/workspace/canvas/utils/cssVariableReader.ts` - 색상 함수 추가

---

### Refactored - 선택 테두리 통합 (SelectionBox) (2025-12-15)

#### 개요
14개 UI 컴포넌트에서 중복된 선택 테두리 코드를 제거하고 공통 SelectionBox로 통합

#### 문제
- 각 컴포넌트가 자체 선택 테두리 구현 (스타일 불일치)
- Button: roundRect, width 2, offset -2
- SelectionBox: rect, width 1, offset 0

#### 해결
모든 컴포넌트에서 자체 선택 테두리 코드 제거, SelectionBox 단일 사용

**제거된 코드 (14개 파일):**
- `PixiButton.tsx` - drawSelection 콜백 및 JSX
- `PixiFancyButton.tsx` - selection useEffect
- `PixiInput.tsx` - selection useEffect
- `PixiList.tsx` - selection useEffect
- `PixiMaskedFrame.tsx` - selection useEffect
- `PixiProgressBar.tsx` - selection useEffect
- `PixiScrollBox.tsx` - selection useEffect
- `PixiSelect.tsx` - selection useEffect
- `PixiSlider.tsx` - selection useEffect
- `PixiSwitcher.tsx` - selection useEffect
- `PixiCheckbox.tsx` - selection layoutContainer
- `PixiRadio.tsx` - selection layoutContainer
- `TextSprite.tsx` - isSelected from drawBackground
- `ImageSprite.tsx` - isSelected from drawBackground/drawOverlay

---

### Added - Figma 스타일 줌 독립적 UI (2025-12-15)

#### 개요
Figma처럼 줌에 관계없이 선택 박스, 핸들, 라쏘, 경계선이 화면상 일정한 크기 유지

#### 문제
- 줌 200%: 선택 테두리가 2px로 보임 (두꺼움)
- 줌 50%: 선택 테두리가 0.5px로 보임 (희미함)
- Transform 핸들도 줌에 따라 크기 변동

#### 해결
역-스케일링 방식 적용 (`1/zoom`)

```typescript
// 줌 200%일 때: 캔버스 단위 0.5px → 화면상 1px
// 줌 50%일 때: 캔버스 단위 2px → 화면상 1px
const strokeWidth = 1 / zoom;

// 핸들 크기도 동일하게 적용
const adjustedSize = HANDLE_SIZE / zoom;  // HANDLE_SIZE = 6px
```

#### pixelLine vs 역-스케일링

| 방식 | 장점 | 단점 |
|------|------|------|
| **pixelLine** (v8.6.0+) | 내장 옵션 | 모든 상황에서 완벽하지 않음 |
| **역-스케일링** | 수학적 정확, 핸들 크기에도 적용 가능 | 수동 계산 필요 |

→ 역-스케일링 방식 채택

**적용 대상:**
| 요소 | 줌 50% | 줌 100% | 줌 200% |
|------|--------|---------|---------|
| 선택 테두리 | 1px | 1px | 1px |
| Transform 핸들 | 6px | 6px | 6px |
| 라쏘 테두리 | 1px | 1px | 1px |
| 페이지 경계 | 1px | 1px | 1px |

**수정된 파일:**
- `src/builder/workspace/canvas/selection/SelectionLayer.tsx` - zoom prop 추가
- `src/builder/workspace/canvas/selection/SelectionBox.tsx` - zoom prop, strokeWidth 계산
- `src/builder/workspace/canvas/selection/TransformHandle.tsx` - zoom prop, adjustedSize 계산
- `src/builder/workspace/canvas/selection/LassoSelection.tsx` - zoom prop, strokeWidth 계산
- `src/builder/workspace/canvas/BuilderCanvas.tsx` - CanvasBounds, SelectionLayer에 zoom 전달

---

### Refactored - PixiCheckbox Graphics 기반 (2025-12-15)

#### 개요
`@pixi/layout` 기반에서 Graphics 직접 렌더링으로 변경

#### 문제
- `layoutContainer`의 `borderWidth`, `borderColor` 등 CSS 속성이 제대로 렌더링되지 않음
- 체크박스가 사각형만 보이고 체크마크가 표시되지 않음

#### 해결
Graphics로 직접 그리기 (PixiButton 패턴 적용)

```typescript
// 체크마크 - 선으로 직접 그리기
g.setStrokeStyle({ width: 2.5, color: 0xffffff, cap: 'round', join: 'round' });
g.moveTo(checkStartX, checkStartY);
g.lineTo(checkMidX, checkMidY);
g.lineTo(checkEndX, checkEndY);
g.stroke();
```

**개선사항:**
- 체크마크를 "✓" 텍스트 대신 선으로 직접 그리기 (더 선명)
- 테두리, 배경색, 체크마크 모두 Graphics로 렌더링
- 라벨 텍스트는 pixiText 사용

**수정된 파일:**
- `src/builder/workspace/canvas/ui/PixiCheckbox.tsx` - 전체 리팩토링

---

### Refactored - PixiRadio Graphics 기반 (2025-12-15)

#### 개요
`@pixi/layout` 기반에서 Graphics 직접 렌더링으로 변경

#### 문제
- `props.options` 배열이 없으면 아무것도 렌더링되지 않음
- `layoutContainer` 렌더링 이슈

#### 해결
Graphics로 직접 그리기 + 기본 옵션 추가

```typescript
// 기본 옵션 (options가 없을 때 placeholder)
const DEFAULT_OPTIONS: RadioOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];
```

**개선사항:**
- Graphics로 라디오 원 직접 그리기
- 선택 시 내부 dot 표시
- RadioItem 서브컴포넌트로 분리 (메모이제이션 최적화)
- 기본 옵션으로 항상 무언가 표시됨

**수정된 파일:**
- `src/builder/workspace/canvas/ui/PixiRadio.tsx` - 전체 리팩토링

---

### Added - WebGL Canvas 텍스트 선명도 개선 (2025-12-15)

#### 개요
Figma와 유사하게 줌 레벨에 따라 텍스트를 재래스터라이즈하여 선명도 개선

#### 문제
- PixiJS Canvas 텍스트가 Figma 대비 흐릿하게 렌더링됨
- 줌 인 시 텍스트가 스케일되어 픽셀화 발생
- `roundPixels`, `resolution` 설정만으로는 부족

#### 해결 (다층 접근)

**1. Application 설정 개선**
```typescript
<Application
  resolution={Math.max(window.devicePixelRatio || 1, 2)}  // 최소 2배
  roundPixels={true}  // 서브픽셀 흐림 방지
  // ...
/>
```

**2. 동적 폰트 크기 조절 (Figma 방식)**
```typescript
// useCrispText.ts - 줌 레벨에 따른 해상도 배율
function calculateMultiplier(zoom: number): number {
  if (zoom <= 1) return 1;
  if (zoom <= 2) return 2;
  if (zoom <= 3) return 3;
  return 4; // 최대 4x
}

// TextSprite/PixiButton에서 사용
const { textScale, multiplier } = useCrispText(baseFontSize);

// fontSize를 높이고, scale을 낮춰 시각적 크기 유지
const scaledFontSize = baseFontSize * multiplier;
textView.scale.set(textScale); // 1 / multiplier
```

#### 동작 원리

```
┌─────────────────────────────────────────────────────────────┐
│                    동적 폰트 크기 조절                        │
├─────────────────────────────────────────────────────────────┤
│  줌 1x: fontSize 16px × 1 = 16px, scale 1.0                 │
│  줌 2x: fontSize 16px × 2 = 32px, scale 0.5                 │
│  줌 3x: fontSize 16px × 3 = 48px, scale 0.33                │
├─────────────────────────────────────────────────────────────┤
│  결과: 텍스트가 항상 현재 줌에 맞는 해상도로 렌더링            │
│  → 확대해도 픽셀화 없이 선명함                               │
└─────────────────────────────────────────────────────────────┘
```

#### PixiJS 공식 권장 사항 준수

| 권장 | 적용 |
|------|------|
| `roundPixels={true}` | ✅ |
| `resolution` 2배 이상 | ✅ |
| 스케일 업 금지, fontSize 조절 | ✅ |
| BitmapText + SDF | 미적용 (필요시 추가 가능) |

**신규 파일:**
- `src/builder/workspace/canvas/hooks/useCrispText.ts`

**수정된 파일:**
- `src/builder/workspace/canvas/BuilderCanvas.tsx` - resolution, roundPixels 설정
- `src/builder/workspace/canvas/sprites/TextSprite.tsx` - 동적 폰트 크기
- `src/builder/workspace/canvas/ui/PixiButton.tsx` - 동적 폰트 크기

---

### Added - WebGL Canvas 동적 테마 색상 지원 (2025-12-15)

#### 개요
WebGL Canvas의 PixiButton이 테마 변경에 실시간으로 반응하도록 개선

#### 문제
- 기존 PixiButton은 하드코딩된 색상 사용 (`VARIANT_COLORS` 상수)
- 테마 변경 시 (Light ↔ Dark) WebGL 버튼 색상이 변하지 않음
- iframe Preview는 CSS 변수로 테마 변경 적용되지만 WebGL은 불변

#### 해결
CSS 변수를 런타임에 읽어 PixiJS hex 값으로 변환하는 시스템 구현

**1. cssVariableReader.ts (신규)**
```typescript
// CSS 변수에서 M3 토큰 읽기
export function getM3ButtonColors(): M3ButtonColors {
  const primary = cssColorToHex(getCSSVariable('--primary'), FALLBACK_COLORS.primary);
  // ... 모든 M3 색상 토큰 읽기
  return {
    primaryBg: primary,
    primaryBgHover: mixWithBlack(primary, 92),  // M3 hover = 92% original + 8% black
    primaryBgPressed: mixWithBlack(primary, 88), // M3 pressed = 88% original + 12% black
    // ...
  };
}

// variant별 색상 매핑
export function getVariantColors(variant: string, colors: M3ButtonColors) {
  switch (variant) {
    case 'primary': return { bg: colors.primaryBg, bgHover: colors.primaryBgHover, ... };
    // outline/ghost는 bgAlpha: 0 (투명 배경)
  }
}
```

**2. useThemeColors.ts (신규)**
```typescript
// MutationObserver로 테마 변경 감지
export function useThemeColors(): M3ButtonColors {
  const [colors, setColors] = useState(() => getM3ButtonColors());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => setColors(getM3ButtonColors()));
    });

    // data-theme, data-builder-theme, class 속성 감시
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-builder-theme', 'class'],
    });

    // prefers-color-scheme 미디어 쿼리도 감시
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => { observer.disconnect(); mediaQuery.removeEventListener(...); };
  }, []);

  return colors;
}
```

**3. PixiButton.tsx 수정**
```typescript
// 기존: 하드코딩된 색상
const VARIANT_COLORS = { primary: { bg: 0x6750a4, ... }, ... }; // 제거

// 변경: 동적 테마 색상
const themeColors = useThemeColors();
const variantColors = useMemo(() => {
  return getVariantColors(props?.variant || 'default', themeColors);
}, [props?.variant, themeColors]);
```

#### 동작 방식

```
┌─────────────────────────────────────────────────────────────┐
│                    테마 변경 플로우                           │
├─────────────────────────────────────────────────────────────┤
│  1. 테마 토글 클릭                                           │
│     ↓                                                       │
│  2. document.documentElement에 data-theme="dark" 설정       │
│     ↓                                                       │
│  3. MutationObserver 감지 (useThemeColors)                  │
│     ↓                                                       │
│  4. getM3ButtonColors() 호출 → CSS 변수 다시 읽기            │
│     ↓                                                       │
│  5. React state 업데이트 → PixiButton 리렌더링               │
│     ↓                                                       │
│  6. FancyButton Graphics 재생성 (새 색상 적용)               │
└─────────────────────────────────────────────────────────────┘
```

#### M3 Hover/Pressed 색상 계산

```typescript
// M3 Design System 표준
// Hover: 원본 색상 92% + black 8%
function mixWithBlack(color: number, percent: number): number {
  const ratio = percent / 100;
  const r = Math.round(((color >> 16) & 0xff) * ratio);
  const g = Math.round(((color >> 8) & 0xff) * ratio);
  const b = Math.round((color & 0xff) * ratio);
  return (r << 16) | (g << 8) | b;
}

// Outline/Ghost Hover: primary 8% + white 92%
function mixWithWhite(color: number, percent: number): number {
  const whiteRatio = 1 - (percent / 100);
  // ...
}
```

**신규 파일:**
- `src/builder/workspace/canvas/utils/cssVariableReader.ts`
- `src/builder/workspace/canvas/hooks/useThemeColors.ts`

**수정된 파일:**
- `src/builder/workspace/canvas/ui/PixiButton.tsx`

---

### Fixed - WebGL Canvas Button Size Props (2025-12-15)

#### 문제
- Button 컴포넌트의 `size` prop (xs, sm, md, lg, xl)이 WebGL Canvas에서 적용되지 않음
- 폰트 크기는 변경되지만 버튼 크기(패딩)가 변하지 않음
- Text 컴포넌트는 정상 작동

#### 원인 분석
**아키텍처 설계**: XStudio는 `variant`/`size`로 일관성을, `style:{}`로 커스터마이징을 담당

```
┌─────────────────────────────────────────────────────────────┐
│                    XStudio 스타일 시스템                      │
├──────────────────────┬──────────────────────────────────────┤
│   일관성 (Semantic)   │   커스터마이징 (Inline)               │
│   variant, size      │   style: { ... }                     │
├──────────────────────┼──────────────────────────────────────┤
│   디자인 시스템 준수    │   개별 요소 세부 조정                 │
│   브랜드 일관성 유지    │   특수 케이스 대응                    │
├──────────────────────┴──────────────────────────────────────┤
│              우선순위: style > variant/size                  │
└─────────────────────────────────────────────────────────────┘
```

**문제 흐름:**
1. `LayoutEngine`이 Button 크기 계산 시 `parsePadding(style)`만 사용
2. `style`에 padding이 없으면 (size prop으로 결정되기 때문) 0으로 계산
3. `layoutPosition`이 ElementSprite로 전달되어 `style.width/height` 오버라이드
4. PixiButton의 auto 크기 계산이 무시됨

**결론:** 라이브러리 버그 아님, **우리 코드의 semantic props 미처리**

#### 해결

**LayoutEngine.ts 수정:**

```typescript
// 1. Button Size Presets 추가 (Button.css와 동기화)
const BUTTON_SIZE_PRESETS: Record<string, ButtonSizePreset> = {
  xs: { fontSize: 10, paddingX: 8,  paddingY: 2 },
  sm: { fontSize: 14, paddingX: 12, paddingY: 4 },
  md: { fontSize: 16, paddingX: 24, paddingY: 8 },
  lg: { fontSize: 18, paddingX: 32, paddingY: 12 },
  xl: { fontSize: 20, paddingX: 40, paddingY: 16 },
};

// 2. measureTextSize() 함수에서 Button size prop 처리
function measureTextSize(element, style) {
  const isButton = element.tag === 'Button' || element.tag === 'SubmitButton';
  const buttonSize = isButton ? getButtonSizePadding(element) : null;

  // fontSize: inline style > size preset > 기본값
  const fontSize = parseCSSValue(style?.fontSize, buttonSize?.fontSize ?? 16);

  // padding: inline style 있으면 우선, 없으면 size preset 사용
  if (buttonSize && !hasInlinePadding) {
    paddingLeft = buttonSize.paddingX;
    paddingRight = buttonSize.paddingX;
    paddingTop = buttonSize.paddingY;
    paddingBottom = buttonSize.paddingY;
  }
}
```

#### 우선순위 동작

| 설정 | 적용되는 패딩 | 담당 |
|------|-------------|------|
| `size="md"` | 8px 24px | 일관성 (semantic) |
| `size="md"` + `style: { padding: '20px' }` | 20px | 커스터마이징 (inline) |
| `size="lg"` | 12px 32px | 일관성 (semantic) |

**수정된 파일:**
- `src/builder/workspace/canvas/layout/LayoutEngine.ts` - Button size prop 지원

---

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

#### GridLayer 렌더 순서 수정
- **문제**: 그리드가 표시되지 않음 (showGrid: true 상태에서도)
- **원인**: GridLayer가 BodyLayer보다 먼저 렌더링되어 불투명 배경에 가려짐
- **해결**: 렌더 순서 변경 - BodyLayer → GridLayer (그리드가 배경 위에 표시)

```typescript
// BuilderCanvas.tsx - Camera Container 렌더 순서
<pixiContainer label="Camera">
  <BodyLayer ... />      {/* 1. Body 배경 (최하단) */}
  <GridLayer ... />      {/* 2. 그리드 (배경 위) */}
  <CanvasBounds ... />   {/* 3. 경계선 */}
  <ElementsLayer ... />  {/* 4. 요소들 */}
  <SelectionLayer ... /> {/* 5. 선택 (최상단) */}
</pixiContainer>
```

**수정된 파일:**
- `BuilderCanvas.tsx` - 라쏘 좌표 변환, GridLayer/BodyLayer 렌더 순서 변경
- `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx` - modifier 키 지원
- `PixiButton.tsx` - 투명 히트 영역 + eventMode 설정
- `BodyLayer.tsx` - modifier 키 지원
- `GridLayer.tsx` - PixiJS v8 rect+fill 방식으로 그리드 렌더링

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
