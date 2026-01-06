# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Refactored - @pixi/layout Migration Phase 7-8: Percentage Unit Support (2026-01-06)

#### Phase 7: SelectionBox 좌표 변환 수정

**문제:**
- SelectionBox와 렌더링된 요소의 위치가 일치하지 않음
- `getBounds()`가 글로벌 좌표를 반환하지만, SelectionBox는 Camera Container 안에서 렌더링됨

**해결:**
- `SelectionLayer.tsx`에 `panOffset` prop 추가
- 글로벌 좌표 → Camera 로컬 좌표 변환 로직 추가

```typescript
// 글로벌 좌표 → Camera 로컬 좌표 변환
const localX = (bounds.x - panOffset.x) / zoom;
const localY = (bounds.y - panOffset.y) / zoom;
const localWidth = bounds.width / zoom;
const localHeight = bounds.height / zoom;
```

**수정된 파일:**
- `apps/builder/src/builder/workspace/canvas/selection/SelectionLayer.tsx`
- `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`

#### Phase 8: 퍼센트(%) 단위 지원 - parseCSSSize 제거

**문제:**
- 스타일 패널에서 `width: 100%`를 설정해도 픽셀 값으로만 계산됨
- `parseCSSSize(style?.width, undefined, 300)` 호출 시 `parentSize`가 `undefined`이므로 % 값이 무시됨
- @pixi/layout은 % 값을 자동으로 처리하지만, 수동 계산이 이를 덮어씀

**근본적인 해결책:**
- UI 컴포넌트에서 `parseCSSSize` 호출 제거
- `layout` prop에 `style?.width`를 문자열 그대로 전달
- @pixi/layout이 부모 크기 기준으로 % 값을 자동 계산하도록 위임

**적용된 패턴:**

```typescript
// 이전 (% 지원 안됨)
const tabsWidth = parseCSSSize(style?.width, undefined, 300);
const rootLayout = { width: tabsWidth };

// 이후 (@pixi/layout이 % 자동 처리)
const styleWidth = style?.width;
const fallbackWidth = 300;
const rootLayout = { width: styleWidth ?? fallbackWidth };
```

**핵심 원칙:**
1. **layout prop에 style 값 직접 전달** - `'100%'`, `'50%'` 등 문자열 그대로 전달
2. **자식 레이아웃은 `100%` 또는 flex 사용** - `width: '100%'`, `flexGrow: 1`
3. **Graphics는 fallback 값 사용** - 픽셀 값이 필요한 경우 기본값 사용
4. **@pixi/layout 내장 스타일 활용** - `backgroundColor`, `borderColor`, `borderRadius`

**수정된 파일 (3개):**

1. `apps/builder/src/builder/workspace/canvas/ui/PixiTabs.tsx`
   - `parseCSSSize` import 제거
   - `rootLayout.width`에 `style?.width` 직접 전달
   - `tabListLayout`, `panelLayout`을 flex 기반으로 변경
   - Graphics border를 @pixi/layout `backgroundColor`로 대체

2. `apps/builder/src/builder/workspace/canvas/ui/PixiPanel.tsx`
   - `parseCSSSize` import 제거
   - `panelLayout`에 `styleWidth ?? fallbackWidth` 전달
   - `titleLayout`, `contentLayout`을 `width: '100%'`, `flexGrow: 1`로 변경
   - Graphics 배경을 layout `backgroundColor`, `borderColor` 기반으로 대체
   - 히트 영역을 layout 기반 `position: 'absolute'`로 변경

3. `apps/builder/src/builder/workspace/canvas/ui/PixiInput.tsx`
   - `parseCSSSize` import 제거
   - `inputLayout.width`에 `styleWidth ?? fallbackWidth` 전달
   - Graphics `drawBackground`에서 `fallbackWidth` 사용

**남은 작업 (25개 파일):**
동일한 패턴으로 수정 필요:
- PixiButton, PixiCheckbox, PixiCard, PixiList, PixiListBox
- PixiSlider, PixiProgressBar, PixiMeter, PixiSeparator
- PixiSelect, PixiScrollBox, PixiMaskedFrame 등

**결과:**
- ✅ Tabs, Panel, Input 컴포넌트에서 `width: 100%` 정상 동작
- ✅ @pixi/layout이 부모 크기 기준으로 % 자동 계산
- ✅ SelectionBox와 요소 위치 일치
- ✅ TypeScript 에러 없음

---

### Added - Export/Import Phase 1-4 Complete & Static HTML Generation (2026-01-03)

#### Export/Import 기능 완성 (Phase 1-4)

**Phase 1: 데이터 검증 강화**

- Zod 스키마 기반 검증 (`packages/shared/src/schemas/project.schema.ts`)
- 보안 JSON 파싱 (Prototype Pollution 방지)
- 파일 크기 제한 (10MB)
- 상세 에러 메시지 및 에러 코드

**Phase 2: 멀티 페이지 네비게이션**

- `PageNav` 컴포넌트 (`apps/publish/src/components/PageNav.tsx`)
- URL 해시 기반 라우팅 (`#page-{pageId}`)
- 브라우저 뒤로/앞으로 버튼 지원
- 페이지 전환 시 상태 유지

**Phase 3: 이벤트 런타임**

- `ActionExecutor` 클래스 (`packages/shared/src/runtime/ActionExecutor.ts`)
- 지원 액션 타입:
  - `CONSOLE_LOG`: 콘솔 로그 출력
  - `SHOW_ALERT`: 알림 팝업 표시
  - `OPEN_URL`: 외부 URL 열기
  - `NAVIGATE_TO_PAGE`: 페이지 내 이동
- `ElementRenderer`에서 이벤트 바인딩 (`apps/publish/src/renderer/ElementRenderer.tsx`)

**Phase 4: 버전 마이그레이션**

- 마이그레이션 시스템 (`packages/shared/src/utils/migration.utils.ts`)
- v0.9.0 → v1.0.0 마이그레이션 지원
- 마이그레이션 발생 시 알림 배너 표시
- 버전 호환성 검사

**Static HTML Generation**

- `generateStaticHtml()`: standalone HTML 파일 생성
- `downloadStaticHtml()`: HTML 파일 다운로드
- 외부 의존성 없이 동작하는 단일 HTML 파일
- 프로젝트 데이터 인라인 임베딩
- 기본 CSS 스타일 및 JavaScript 렌더러 포함

**ComponentRegistry 업데이트**

- `body` 컴포넌트 등록 (div로 렌더링)
- `Text` 컴포넌트 등록 (span으로 렌더링)
- @xstudio/shared 컴포넌트 통합

**수정된 파일:**

1. `packages/shared/src/schemas/project.schema.ts` (신규)
2. `packages/shared/src/runtime/ActionExecutor.ts` (신규)
3. `packages/shared/src/runtime/index.ts` (신규)
4. `packages/shared/src/utils/migration.utils.ts` (신규)
5. `packages/shared/src/utils/export.utils.ts` (확장)
6. `packages/shared/src/types/export.types.ts` (확장)
7. `apps/publish/src/components/PageNav.tsx` (신규)
8. `apps/publish/src/hooks/usePageRouting.ts` (신규)
9. `apps/publish/src/renderer/ElementRenderer.tsx` (이벤트 바인딩 추가)
10. `apps/publish/src/registry/ComponentRegistry.tsx` (body, Text 추가)
11. `apps/publish/public/project.json` (이벤트 및 멀티 페이지 테스트)
12. `apps/publish/public/project-v09.json` (마이그레이션 테스트)

**결과:**
- ✅ Export/Import 기능 100% 완성
- ✅ 이벤트 동작 테스트 완료 (CONSOLE_LOG, SHOW_ALERT, OPEN_URL, NAVIGATE_TO_PAGE)
- ✅ 멀티 페이지 네비게이션 테스트 완료
- ✅ v0.9.0 → v1.0.0 마이그레이션 테스트 완료
- ✅ Static HTML 내보내기 구현
- ✅ TypeScript 에러 없음

---

### Added - Project Export/Import JSON Functionality (2026-01-02)

#### 프로젝트 데이터 내보내기/가져오기 기능

**목적:**
- Builder에서 작업한 프로젝트를 JSON 파일로 내보내기
- Publish 앱에서 JSON 파일을 로드하여 프로젝트 미리보기
- 로컬 파일 기반 프로젝트 공유 및 백업 지원

**구현된 기능:**

1. **Export Utilities (`packages/shared/src/utils/export.utils.ts`)**
   - `ExportedProjectData` 인터페이스: 내보내기 데이터 구조 정의
   - `downloadProjectAsJson()`: 프로젝트 데이터를 JSON 파일로 다운로드
   - `loadProjectFromUrl()`: URL에서 프로젝트 JSON 로드
   - `loadProjectFromFile()`: File 객체에서 프로젝트 JSON 로드
   - `ImportResult` 타입: 로드 결과 (success/error) 처리

   ```typescript
   export interface ExportedProjectData {
     version: string;
     exportedAt: string;
     project: { id: string; name: string; };
     pages: Page[];
     elements: Element[];
     currentPageId?: string | null;
   }
   ```

2. **Builder Export (`apps/builder/src/builder/main/BuilderCore.tsx`)**
   - `handlePublish` 함수 구현
   - Publish 버튼 클릭 시 프로젝트 JSON 다운로드
   - Store에서 elements, pages, currentPageId 추출
   - 프로젝트 ID와 이름 포함

   ```typescript
   const handlePublish = useCallback(() => {
     const state = useStore.getState();
     const { elements, pages, currentPageId } = state;
     downloadProjectAsJson(id, name, pages, elements, currentPageId);
   }, [projectId, projectInfo]);
   ```

3. **Publish App Rewrite (`apps/publish/src/App.tsx`)**
   - URL 파라미터에서 프로젝트 로드 (`?url=...`)
   - 기본 `/project.json` 파일 로드
   - 드래그 앤 드롭 파일 업로드 지원
   - 로딩/에러 상태 UI
   - Dropzone 스타일링

4. **Vite Alias Configuration (`apps/builder/vite.config.ts`)**
   - 객체 기반 alias에서 배열 + 정규식 패턴으로 변경
   - `@xstudio/shared/components/styles/*` 경로 지원
   - `@xstudio/shared/components/*` 경로 지원
   - 정규식 순서: 가장 구체적인 패턴부터 처리

   ```typescript
   resolve: {
     alias: [
       { find: "@", replacement: `${import.meta.dirname}/src` },
       { find: /^@xstudio\/shared\/components\/styles\/(.*)$/,
         replacement: `${import.meta.dirname}/../../packages/shared/src/components/styles/$1` },
       { find: /^@xstudio\/shared\/components\/(.*)$/,
         replacement: `${import.meta.dirname}/../../packages/shared/src/components/$1` },
       { find: "@xstudio/shared/components",
         replacement: `${import.meta.dirname}/../../packages/shared/src/components/index.tsx` },
       // ... more aliases
     ],
   },
   ```

**수정된 파일:**

1. `packages/shared/src/utils/export.utils.ts` (신규)
   - 프로젝트 내보내기/가져오기 유틸리티

2. `packages/shared/src/utils/index.ts`
   - export.utils 내보내기 추가

3. `apps/builder/src/builder/main/BuilderCore.tsx`
   - handlePublish 함수 구현

4. `apps/builder/vite.config.ts`
   - 정규식 기반 alias 패턴 추가

5. `apps/publish/src/App.tsx`
   - JSON 로딩 및 드롭존 UI로 완전 재작성

6. `apps/publish/src/styles/index.css`
   - `.publish-dropzone`, `.dropzone-content` 스타일 추가

7. `apps/publish/public/project.json`
   - 테스트용 샘플 프로젝트 JSON

**Export JSON 구조:**

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-01-02T07:35:52.219Z",
  "project": {
    "id": "db1e4339-e9d1-40e5-a268-8df9d4bfc49d",
    "name": "AAA"
  },
  "pages": [
    {
      "id": "336554c4-c9ba-48e1-a278-d389c7519b72",
      "title": "Home",
      "slug": "/",
      "project_id": "db1e4339-e9d1-40e5-a268-8df9d4bfc49d",
      "parent_id": null,
      "order_num": 0,
      "layout_id": null
    }
  ],
  "elements": [
    {
      "id": "element-id",
      "tag": "Button",
      "props": { "children": "Button", "variant": "primary" },
      "parent_id": "parent-id",
      "page_id": "page-id",
      "order_num": 0
    }
  ],
  "currentPageId": "336554c4-c9ba-48e1-a278-d389c7519b72"
}
```

**결과:**
- ✅ Builder에서 Publish 버튼으로 프로젝트 JSON 다운로드
- ✅ Publish 앱에서 JSON 파일 로드 및 렌더링
- ✅ Builder와 Publish 앱 동일한 콘텐츠 렌더링 확인
- ✅ 드래그 앤 드롭 파일 업로드 지원
- ✅ URL 파라미터로 외부 JSON 로드 지원
- ✅ TypeScript 에러 없음

**사용 방법:**

1. **내보내기 (Builder)**
   - Builder에서 프로젝트 편집
   - 우측 상단 "Publish" 버튼 클릭
   - `{프로젝트명}.json` 파일 다운로드

2. **가져오기 (Publish)**
   - `pnpm --filter publish dev` 실행
   - 방법 1: `public/project.json`에 파일 배치
   - 방법 2: URL 파라미터 사용 (`?url=https://...`)
   - 방법 3: 파일을 드롭존에 드래그 앤 드롭

---

### Refactored - Monorepo Structure Cleanup (2026-01-02)

#### 레거시 파일 정리 및 구조 개선

**삭제된 파일:**

1. **`docs/archive/`** (11개 파일, 7,266줄)
   - CSS_INSPECTOR_ANALYSIS.md
   - CSS_REFACTORING_SUMMARY.md
   - ELECTRON_PUBLISH_FEATURE.md
   - PR_DESCRIPTION.md
   - REACT_STATELY_PROGRESS.md
   - REALTIME_SAVE_FIX.md
   - REALTIME_SAVE.md
   - REFACTOR_EXECUTION_PLAN.md
   - REFACTORING_PLAN.md
   - REFACTORING_SUMMARY.md
   - SAVE_MODE.md

2. **`apps/builder/src/types/componentVariants.ts`** (345줄)
   - M3Variant, TextFieldVariant 타입 미사용
   - 활성 타입은 `types/builder/componentVariants.types.ts`에 있음

**이동된 파일:**

3. **`apps/builder/src/shared/`** → 적절한 위치로 이동
   - `ComponentList.tsx` → `apps/builder/src/builder/panels/components/`
   - `ComponentSearch.tsx` → `apps/builder/src/builder/panels/components/`
   - `src/shared/` 디렉토리 삭제

**현재 모노레포 구조:**

```
xstudio/
├── apps/
│   ├── builder/          # Builder 앱
│   │   └── src/
│   │       ├── builder/  # Builder 전용 로직
│   │       │   ├── components/  # Builder UI (PanelHeader 등)
│   │       │   └── panels/      # 패널 (ComponentList 등)
│   │       └── types/    # Builder 전용 타입
│   └── publish/          # Publish 앱
│
└── packages/
    ├── shared/           # 공유 패키지 (@xstudio/shared)
    │   └── src/
    │       ├── components/  # 공유 UI (Button, Badge 등)
    │       ├── renderers/   # PageRenderer
    │       ├── hooks/
    │       ├── types/
    │       └── utils/
    └── config/           # 공유 설정
```

**분리 원칙:**

| 위치 | 용도 |
|------|------|
| `packages/shared/` | 앱 간 공유 (Button, Badge, Element 타입) |
| `apps/builder/src/builder/` | Builder 전용 (PanelHeader, PropertySection) |

**결과:**
- ✅ 7,611줄 레거시 코드 삭제
- ✅ 혼란스러운 `src/shared/` 디렉토리 제거
- ✅ 모든 @xstudio/shared import 정상 동작 (74개 파일)
- ✅ TypeScript 에러 없음

---

### Fixed - WebGL Canvas Performance Optimization (2025-12-19)

#### Phase 20: INP Performance Fix for Panel Resize

**Problem:**
- WebGL 모드에서 패널 열고 닫을 때 INP가 1468ms로 극심한 프레임 드랍 발생
- iframe 모드는 100ms 초반대 유지하는 반면, WebGL은 400ms+ 초과
- 줌 비율이 패널 토글 시 재설정되는 문제

**Root Causes Identified:**
1. `SelectionLayer.tsx`의 `hasChildrenIdSet` useMemo가 O(n) 순회
2. `BoxSprite`, `TextSprite`, `ImageSprite`에 `memo` 누락
3. `Workspace.tsx`의 ResizeObserver가 매 프레임 상태 업데이트
4. `BuilderCanvas.tsx`의 `ClickableBackground`가 resize 이벤트마다 리렌더링

**Solutions Applied:**

1. **SelectionLayer.tsx - O(n) → O(selected) 최적화**
   - `elementsMap.forEach()` 대신 `childrenMap` 활용
   - 선택된 요소만 순회하여 성능 개선
   ```typescript
   // Before: O(n) - 모든 요소 순회
   elementsMap.forEach((element, id) => {
     if (selectedElementIds.includes(id) && element.children?.length > 0) {
       set.add(id);
     }
   });

   // After: O(selected) - 선택된 요소만 순회
   const childrenMap = getChildrenMap();
   for (const id of selectedElementIds) {
     const children = childrenMap.get(id);
     if (children && children.length > 0) {
       set.add(id);
     }
   }
   ```

2. **Sprite Components - memo 추가**
   - `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx`에 `memo()` 래퍼 적용
   - 불필요한 리렌더링 방지

3. **Workspace.tsx - ResizeObserver 최적화**
   - RAF 스로틀링 + 값 비교 추가
   - 패널 애니메이션 중 매 프레임 상태 업데이트 방지
   ```typescript
   const throttledUpdate = () => {
     if (rafId !== null) return;
     rafId = requestAnimationFrame(() => {
       rafId = null;
       updateSize();
     });
   };
   ```

4. **BuilderCanvas.tsx - CSS-First Resize Strategy**
   - `resizeTo={containerEl}` 제거
   - `CanvasSmoothResizeBridge`: requestIdleCallback 기반 리사이즈
   - debounce/setTimeout 대신 브라우저 유휴 시간 활용
   ```typescript
   const requestIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
   idleCallbackRef.current = requestIdle(() => {
     renderer.resize(width, height);
   });
   ```

5. **ClickableBackground - Resize Listener 제거**
   - `screenSize` state 제거 (리렌더링 원인)
   - `renderer.on("resize", update)` 리스너 제거
   - 고정 크기 사용: `-5000, -5000, 10000, 10000` (모든 뷰포트 커버)
   ```typescript
   // Before: resize마다 리렌더링
   const [screenSize, setScreenSize] = useState(...);
   renderer.on("resize", update); // setScreenSize 호출

   // After: 고정 크기, 리렌더링 없음
   const draw = useCallback((g) => {
     g.rect(-5000, -5000, 10000, 10000);
     g.fill({ color: 0xffffff, alpha: 0 });
   }, []); // 의존성 없음
   ```

6. **PixiButton.tsx - WebGL Destroy Error Fix**
   - 이미 파괴된 Graphics 객체 중복 destroy 방지
   ```typescript
   if (!buttonRef.current.destroyed) {
     buttonRef.current.destroy({ children: true });
   }
   ```

**Modified Files:**

1. `src/builder/workspace/canvas/selection/SelectionLayer.tsx`
   - hasChildrenIdSet: O(n) → O(selected) 최적화

2. `src/builder/workspace/canvas/sprites/BoxSprite.tsx`
   - memo() 래퍼 추가

3. `src/builder/workspace/canvas/sprites/TextSprite.tsx`
   - memo() 래퍼 추가

4. `src/builder/workspace/canvas/sprites/ImageSprite.tsx`
   - memo() 래퍼 추가

5. `src/builder/workspace/Workspace.tsx`
   - ResizeObserver에 RAF 스로틀링 + 값 비교 추가

6. `src/builder/workspace/canvas/BuilderCanvas.tsx`
   - CanvasSmoothResizeBridge: requestIdleCallback 기반 리사이즈
   - Application에서 resizeTo 제거
   - ClickableBackground: screenSize state 및 resize 리스너 제거

7. `src/builder/workspace/canvas/ui/PixiButton.tsx`
   - destroyed 체크 후 destroy 호출

**Results:**
- ✅ 패널 열고 닫을 때 프레임 드랍 대폭 감소
- ✅ 줌 비율 재설정 문제 해결
- ✅ requestIdleCallback 활용으로 시간 기반 debounce 제거
- ✅ WebGL destroy 에러 해결
- ✅ No TypeScript errors

**Research References:**
- Figma: CSS-First Resize Strategy (CSS 스트레치 → GPU 버퍼는 안정 시에만)
- PixiJS v8: requestIdleCallback 패턴
- WebGL Fundamentals: 리사이즈 최적화 가이드

---

### Added - WebGL Canvas Phase 19: hitArea Pattern (2025-12-18)

#### Phase 19: Click Selection Fix for WebGL Components

**Problem:**
- Form components (TextField, Input, RadioGroup, CheckboxGroup, Switch) couldn't be clicked/selected in WebGL canvas
- `pixiContainer` alone doesn't have hitArea, so events don't register
- Initial hitArea placement at beginning of render didn't work (z-order issue)

**Solution - hitArea Pattern:**
- Add transparent `pixiGraphics` with `alpha: 0` as hitArea
- **CRITICAL**: hitArea must be rendered LAST in container (PixiJS z-order: later children on top)
- Use `eventMode="static"` and `onPointerDown` for click detection

**Modified Files (8 components):**

1. `src/builder/workspace/canvas/ui/PixiInput.tsx`
   - Added drawHitArea with full input area coverage
   - Moved hitArea to render LAST in container

2. `src/builder/workspace/canvas/ui/PixiTextField.tsx`
   - Added drawHitArea covering label + input + description
   - Moved hitArea to render LAST

3. `src/builder/workspace/canvas/ui/PixiRadio.tsx`
   - Added groupDimensions calculation for hitArea sizing
   - Added drawHitArea covering entire RadioGroup
   - Fixed duplicate key error: `key={option.value}` → `key={`${option.value}-${index}`}`

4. `src/builder/workspace/canvas/ui/PixiCheckboxGroup.tsx`
   - Added groupDimensions calculation for hitArea sizing
   - Added drawHitArea covering entire CheckboxGroup
   - Fixed duplicate key error: `key={option.value}` → `key={`${option.value}-${index}`}`

5. `src/builder/workspace/canvas/ui/PixiSwitch.tsx`
   - Added missing position handling (posX, posY)
   - Added drawHitArea for switch + label area
   - Fixed `Text` → `pixiText` component name

6. `src/builder/workspace/canvas/ui/PixiBadge.tsx`
   - Added drawHitArea
   - Removed duplicate event handlers from individual elements

7. `src/builder/workspace/canvas/ui/PixiCard.tsx`
   - Added drawHitArea
   - Removed duplicate event handlers from individual elements

8. `src/builder/workspace/canvas/ui/PixiComboBox.tsx`
   - Added totalHeight calculation including dropdown
   - Added drawHitArea covering input + dropdown area

**hitArea Pattern Template:**
```tsx
// 🚀 Phase 19: 전체 크기 계산 (hitArea용)
const totalWidth = sizePreset.inputWidth;
const totalHeight = labelHeight + inputHeight;

// 🚀 Phase 19: 투명 히트 영역
const drawHitArea = useCallback(
  (g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, totalWidth, totalHeight);
    g.fill({ color: 0xffffff, alpha: 0 });
  },
  [totalWidth, totalHeight]
);

return (
  <pixiContainer x={posX} y={posY}>
    {/* Other content rendered first */}

    {/* 🚀 Phase 19: 투명 히트 영역 - 마지막에 렌더링하여 최상단 배치 */}
    <pixiGraphics
      draw={drawHitArea}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    />
  </pixiContainer>
);
```

**Bug Fixes:**
- Fixed TextField/Input not clickable in WebGL canvas
- Fixed RadioGroup/CheckboxGroup whole group not selectable (only child options were)
- Fixed Switch not selectable
- Fixed Badge/Card/ComboBox click detection
- Fixed React duplicate key warning in RadioGroup/CheckboxGroup

**Results:**
- ✅ All 8 form components now clickable/selectable in WebGL canvas
- ✅ hitArea pattern documented for future component implementations
- ✅ No TypeScript errors
- ✅ No React key warnings

### Added - Events Panel Block-Based UI (2025-12-08)

#### Phase 5: Block-Based UI Implementation

**New Block Components:**

- `src/builder/panels/events/blocks/WhenBlock.tsx`
  - Event trigger block (onClick, onChange, etc.)
  - Visual indicator with "WHEN" label
  - EventTypePicker integration for changing trigger

- `src/builder/panels/events/blocks/IfBlock.tsx`
  - Conditional execution block
  - ConditionGroup editor integration
  - Optional block (can be removed)

- `src/builder/panels/events/blocks/ThenElseBlock.tsx`
  - Action execution blocks
  - Action list with add/edit/delete
  - Toggle enabled/disabled per action

- `src/builder/panels/events/editors/BlockActionEditor.tsx`
  - Unified action config editor
  - Supports all 21 action types
  - Type-safe config handling

**Modified Files:**

- `src/builder/panels/events/EventsPanel.tsx`
  - Refactored to use block-based components
  - WHEN → IF → THEN/ELSE visual pattern
  - Added `enabled` safeguard (defaults to `true`)
  - Debug logging for action updates

- `src/builder/events/actions/NavigateActionEditor.tsx`
  - Added `normalizePath()` function
  - Auto-adds "/" prefix to all paths
  - Consistent URL path format

- `src/builder/main/BuilderCore.tsx`
  - Fixed NAVIGATE_TO_PAGE message handler
  - Bidirectional path/slug normalization
  - Handles both "/page" and "page" formats

- `src/utils/events/eventEngine.ts`
  - Added warning for disabled actions
  - `getActionConfig<T>()` helper function
  - Dual-field support (config/value)

**Bug Fixes:**

- Fixed navigate action not executing due to `enabled: false`
- Fixed page navigation failing due to slug mismatch
- Fixed path comparison without "/" prefix normalization

**Results:**
- ✅ Block-based visual event editor
- ✅ Navigate action works correctly
- ✅ Path format standardized with "/" prefix
- ✅ All 21 action types supported

### Added - Panel System Refactoring (2025-11-16)

#### Phase 1: Stability Improvements

**Created Reusable Hooks:**

- `src/builder/hooks/useInitialMountDetection.ts` (106 lines)
  - Generic hook for distinguishing initial mount from data changes
  - Prevents database data overwriting on component mount
  - Uses JSON comparison and resetKey pattern for reliability
  - Supports custom dependencies and update callbacks

**Modified Files:**

- `src/builder/panels/data/DataPanel.tsx`
  - Replaced hardcoded empty state HTML with `EmptyState` component
  - Improved consistency across panels

- `src/builder/panels/ai/AIPanel.tsx`
  - Replaced module-level singleton with `useMemo` for Groq service initialization
  - Better lifecycle management and error handling
  - Prevents stale service instances across remounts

- `src/builder/panels/events/EventsPanel.tsx`
  - Applied `useInitialMountDetection` hook to handler and action synchronization
  - **Reduced code: 62 lines → 16 lines (76% reduction)**
  - Fixed EventType import path conflict (`@/types/events/events.types`)
  - Removed unnecessary type assertions (`as unknown as`)

**Results:**
- ✅ Zero TypeScript errors
- ✅ Zero Lint errors
- ✅ No `any` types
- ✅ 76% code reduction in EventsPanel synchronization logic

#### Phase 2: Performance Improvements

**Created Reusable Hooks:**

- `src/builder/hooks/useKeyboardShortcutsRegistry.ts` (147 lines)
  - Centralized keyboard shortcut registration system
  - Declarative shortcut definitions with modifier support
  - Automatic cleanup and conflict prevention
  - Blocks shortcuts when user is typing in input fields

**Modified Files:**

- `src/builder/panels/properties/PropertiesPanel.tsx`
  - Applied `useKeyboardShortcutsRegistry` for copy/paste shortcuts
  - **Reduced code: 30 lines → 15 lines (50% reduction)**
  - Cleaner, more maintainable keyboard handling

- `src/builder/panels/styles/StylesPanel.tsx`
  - Applied `useKeyboardShortcutsRegistry` for copy/paste shortcuts
  - **Reduced code: 38 lines → 24 lines (37% reduction)**
  - Consistent with PropertiesPanel pattern

**Results:**
- ✅ Eliminated duplicate keyboard event listener code
- ✅ Declarative shortcut definitions
- ✅ 37-50% code reduction in keyboard handling

**Attempted (Reverted):**

- `src/builder/panels/settings/SettingsPanel.tsx`
  - **Attempted:** Group 19 individual `useStore` selectors into 2-4 grouped selectors
  - **Result:** Caused infinite loop due to Zustand object reference instability
  - **Resolution:** Reverted to original code with individual selectors
  - **Lesson:** Zustand grouped selectors with object returns are unsafe

#### Phase 3: Reusability Improvements

**Created Reusable Hooks:**

- `src/builder/hooks/useCopyPaste.ts` (95 lines)
  - Generic clipboard-based copy/paste for JSON-serializable data
  - Built-in validation and transformation support
  - Consistent error handling across use cases
  - Supports custom data validation callbacks

**Modified Files:**

- `src/builder/panels/properties/PropertiesPanel.tsx`
  - Applied `useCopyPaste` hook for property copy/paste
  - **Reduced code: 15 lines → 3 lines (80% reduction)**
  - Eliminated duplicate clipboard logic

- `src/builder/panels/styles/hooks/useStyleActions.ts`
  - Applied `useCopyPaste` hook for style copy/paste
  - **Reduced code: 38 lines → 7 lines (82% reduction)**
  - Added automatic type conversion for styles (all values → strings)

**Results:**
- ✅ Generic clipboard utilities reusable across all panels
- ✅ 80%+ code reduction in copy/paste implementations
- ✅ Consistent clipboard error handling

### Overall Statistics

**Code Reduction:**
- EventsPanel: 76% reduction (62→16 lines)
- PropertiesPanel keyboard: 50% reduction (30→15 lines)
- StylesPanel keyboard: 37% reduction (38→24 lines)
- PropertiesPanel copy/paste: 80% reduction (15→3 lines)
- useStyleActions copy/paste: 82% reduction (38→7 lines)

**Reusable Hooks Created:**
1. `useInitialMountDetection` - 106 lines
2. `useKeyboardShortcutsRegistry` - 147 lines
3. `useCopyPaste` - 95 lines

**Total Code Quality:**
- ✅ Zero TypeScript errors
- ✅ Zero Lint errors
- ✅ Zero `any` types
- ✅ 100% tested and validated

### Anti-Patterns Discovered & Documented

**1. Zustand Grouped Selectors with Object Returns**

❌ **WRONG - Causes Infinite Loop:**
```typescript
const settings = useStore((state) => ({
  showOverlay: state.showOverlay,
  showGrid: state.showGrid,
  // ... more fields
}));
```

**Problem:** Every render creates a new object with a new reference, triggering infinite re-renders.

✅ **CORRECT - Individual Selectors:**
```typescript
const showOverlay = useStore((state) => state.showOverlay);
const showGrid = useStore((state) => state.showGrid);
// ... individual selectors
```

**2. useShallow Wrapper Pattern**

❌ **WRONG - Also Causes Infinite Loop:**
```typescript
import { useShallow } from "zustand/react/shallow";

const settings = useStore(
  useShallow((state) => ({
    showOverlay: state.showOverlay,
    // ...
  }))
);
```

**Problem:** `useShallow` wrapper recreates the selector function every render.

✅ **CORRECT - Individual Selectors (Same as #1):**
```typescript
const showOverlay = useStore((state) => state.showOverlay);
```

**3. Manual Keyboard Event Listeners**

❌ **WRONG - Duplicate Code:**
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey && event.shiftKey && event.key === 'c') {
      handleCopy();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleCopy]);
```

✅ **CORRECT - Use Hook:**
```typescript
const shortcuts = useMemo(() => [
  { key: 'c', modifier: 'cmdShift', handler: handleCopy, description: 'Copy' },
], [handleCopy]);

useKeyboardShortcutsRegistry(shortcuts, [handleCopy]);
```

**4. Duplicate Clipboard Code**

❌ **WRONG - Duplicate Logic:**
```typescript
const handleCopy = useCallback(async () => {
  try {
    const json = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(json);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}, [data]);
```

✅ **CORRECT - Use Hook:**
```typescript
const { copy } = useCopyPaste({ onPaste: handlePaste, name: 'properties' });

const handleCopy = useCallback(async () => {
  await copy(data);
}, [data, copy]);
```

**5. EventType Import Path Conflicts**

❌ **WRONG - Legacy Path with Extra Types:**
```typescript
import type { EventType } from "../../events/types/eventTypes";
// This path includes 'onInput' not in registry
```

✅ **CORRECT - Registry Path:**
```typescript
import type { EventType } from "@/types/events/events.types";
// Official registry path with validated types
```

### Breaking Changes

None. All changes are internal refactoring with backward compatibility maintained.

### Migration Guide

**For developers using panels:**

No migration needed. All public APIs remain unchanged.

**For developers adding new panels:**

Consider using the new reusable hooks:

1. **Initial Mount Detection:**
   ```typescript
   import { useInitialMountDetection } from '../../hooks/useInitialMountDetection';

   useInitialMountDetection({
     data: myData,
     onUpdate: (updatedData) => saveToDatabase(updatedData),
     resetKey: selectedElement?.id, // Reset on element change
   });
   ```

2. **Keyboard Shortcuts:**
   ```typescript
   import { useKeyboardShortcutsRegistry } from '../../hooks/useKeyboardShortcutsRegistry';

   const shortcuts = useMemo(() => [
     { key: 'c', modifier: 'cmdShift', handler: handleCopy, description: 'Copy' },
     { key: 'v', modifier: 'cmdShift', handler: handlePaste, description: 'Paste' },
   ], [handleCopy, handlePaste]);

   useKeyboardShortcutsRegistry(shortcuts, [handleCopy, handlePaste]);
   ```

3. **Copy/Paste:**
   ```typescript
   import { useCopyPaste } from '../../hooks/useCopyPaste';

   const { copy, paste } = useCopyPaste({
     onPaste: (data) => updateState(data),
     validate: (data) => typeof data === 'object' && data !== null,
     name: 'myFeature',
   });
   ```

### References

- [Pull Request #XXX](link-to-pr)
- [Issue #XXX - Panel Refactoring](link-to-issue)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/performance)
