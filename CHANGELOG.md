# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed - Phase 2 라이브러리 업데이트 (2026-02-27)

#### 개요
Phase 1에 이어 중간 위험도 마이너 업데이트 대상 라이브러리 9개를 업데이트했습니다.

#### 업데이트된 패키지 (9개)

| 패키지 | 이전 | 이후 | 사용처 |
|--------|------|------|--------|
| @storybook/addon-onboarding | 10.1.10 | 10.2.13 | builder |
| @storybook/react | 10.1.10 | 10.2.13 | builder |
| @storybook/react-vite | 10.1.10 | 10.2.13 | builder |
| eslint-plugin-storybook | 10.1.10 | 10.2.13 | builder |
| storybook | 10.1.10 | 10.2.13 | builder |
| @tailwindcss/postcss | 4.1.18 | 4.2.1 | builder |
| tailwindcss | 4.1.18 | 4.2.1 | builder |
| zod | 4.2.1 | 4.3.6 | builder, shared |
| @supabase/supabase-js | 2.89.0 | 2.98.0 | builder |

#### 주요 변경 사항

- **Storybook 10.2**: Viewport/Zoom UI 리뉴얼, CSF Factories 확장, ESLint 10 호환성 추가. Breaking change 없음
- **Tailwind CSS 4.2**: 새 색상 팔레트 4개(mauve, olive, mist, taupe), Logical property 유틸리티 추가. `start-*`/`end-*` deprecated (프로젝트 미사용)
- **Zod 4.3**: `.pick()`/`.omit()` + `.refine()` 조합 시 에러 throw 정책 변경 (프로젝트 미사용 패턴), `z.fromJSONSchema()`, `z.xor()` 등 신규 API 추가
- **Supabase 2.98**: `from()` 타입 안전성 강화, orphaned navigator lock 복구, Auth signOut 시 로컬 스토리지 정리 개선

#### 검증 결과

- `pnpm build-storybook` — 성공
- `pnpm -F @xstudio/shared type-check` — 성공
- `vite build` — 성공

### Changed - Phase 1 라이브러리 업데이트 (2026-02-27)

#### 개요
저위험 패치/마이너 업데이트 대상 라이브러리 35개를 업데이트했습니다.

#### 업데이트된 패키지 (35개)

| 패키지 | 이전 | 이후 | 사용처 |
|--------|------|------|--------|
| @playwright/test | 1.58.0 | 1.58.2 | @xstudio/specs |
| @react-aria/focus | 3.21.3 | 3.21.4 | builder, shared |
| @react-aria/i18n | 3.12.14 | 3.12.15 | builder |
| @react-aria/utils | 3.32.0 | 3.33.0 | builder, shared |
| @internationalized/date | 3.10.1 | 3.11.0 | builder, shared |
| @tanstack/react-query | 5.90.12 | 5.90.21 | builder |
| @tanstack/react-query-devtools | 5.91.1 | 5.91.3 | builder |
| @tanstack/react-virtual | 3.13.13 | 3.13.19 | builder, shared |
| @types/lodash | 4.17.21 | 4.17.24 | builder |
| @types/react | 19.2.7 | 19.2.14 | builder, publish, shared |
| @vitejs/plugin-react-swc | 4.2.2 | 4.2.3 | builder, publish |
| @vitest/browser | 4.0.16 | 4.0.18 | builder |
| @vitest/coverage-v8 | 4.0.16 | 4.0.18 | builder |
| @vitest/ui | 4.0.16 | 4.0.18 | builder |
| autoprefixer | 10.4.23 | 10.4.27 | builder |
| lodash | 4.17.21 | 4.17.23 | builder |
| react | 19.2.3 | 19.2.4 | builder, publish |
| react-dom | 19.2.3 | 19.2.4 | builder, publish |
| react-aria-components | 1.14.0 | 1.15.1 | builder, publish, shared |
| react-stately | 3.43.0 | 3.44.0 | builder, shared |
| react-router | 7.11.0 | 7.13.1 | builder |
| react-router-dom | 7.11.0 | 7.13.1 | builder |
| vite | 7.3.0 | 7.3.1 | builder, publish |
| vitest | 4.0.16 | 4.0.18 | builder |
| zustand | 5.0.9 | 5.0.11 | builder |
| jotai | 2.16.0 | 2.18.0 | builder |
| pixi.js | 8.14.3 | 8.16.0 | builder |
| puppeteer | 24.34.0 | 24.37.5 | builder |
| tailwind-merge | 3.4.0 | 3.5.0 | builder, shared |
| lucide-react | 0.562.0 | 0.575.0 | builder, shared |
| @types/three | 0.182.0 | 0.183.1 | builder |
| three | 0.182.0 | 0.183.1 | builder |
| eslint-plugin-react-refresh | 0.4.26 | 0.5.2 | config |
| typescript-eslint | 8.50.1 | 8.56.1 | config |

#### pixi.js 업데이트 보완 조치
- **문제**: specs 패키지의 peerDependency가 `^8.0.0`으로 넓어 pixi.js 버전이 이중 resolve되어 Bounds 타입 충돌 발생
- **해결**: `packages/specs/package.json`의 pixi.js peerDependency를 `^8.16.0`으로 범위 조정하여 단일 버전 resolve 유도
- **결과**: pnpm override 없이 pixi.js 8.16.0 단일 버전 사용, elementRegistry.ts Bounds 에러 해소

#### 검증 결과
- type-check: 통과 (전체 패키지)
- build: @xstudio/builder 실패 (기존 이슈 — Element.project_id, TaffyStyle, CSSStyle, canvaskit, rustWasm 등)
- build: @xstudio/publish, @xstudio/specs 성공

---

### Refactored - Child Composition Pattern: Property Editor 리팩터링 (2026-02-25)

#### 개요
Property Editor에서 부모-자식 props 동기화 로직을 커스텀 훅으로 추출하고,
히스토리를 단일 batch 엔트리로 통합하여 Undo/Redo 원자성을 확보했습니다.

#### 신규 파일
- `builder/hooks/useSyncChildProp.ts` — 직계 자식 동기화 BatchPropsUpdate 빌더 훅
- `builder/hooks/useSyncGrandchildProp.ts` — 손자 동기화 훅 (Select, ComboBox 전용)

#### 수정 파일 (12개)
- `builder/stores/inspectorActions.ts` — `updateSelectedPropertiesWithChildren` 메서드 추가
- `builder/hooks/index.ts` — barrel export 추가
- 10개 에디터: TextFieldEditor, NumberFieldEditor, SearchFieldEditor, CheckboxEditor,
  RadioEditor, SwitchEditor, SelectEditor, ComboBoxEditor, CardEditor, SliderEditor

#### 변경 내용
- **DRY**: 10개 파일의 중복 syncChildProp 코드(각 8~26줄) → 2개 훅으로 통합
- **히스토리 단일화**: 부모+자식 변경이 1개 batch 히스토리로 기록, Ctrl+Z 1회로 동시 원복
- **API**: `updateSelectedPropertiesWithChildren(parentProps, childUpdates)` — `batchUpdateElementProps` 기반

#### 마이그레이션
- Before: `onUpdate(props)` + `syncChildProp('Label', 'children', value)` (2개 히스토리)
- After: `updateSelectedPropertiesWithChildren(props, buildChildUpdates([...]))` (1개 히스토리)

---

### Fixed - Dynamic Flex Property Changes Not Reflected Without Refresh (2026-02-05)

#### Body 요소의 justify-content/align-items 동적 변경 시 Skia 캔버스 미갱신 수정

**문제**
- Body에 `display: flex; flex-direction: column;` 적용 후 `justify-content: flex-start; align-items: flex-start;` 추가 시 시각적 변화 없음
- 페이지 새로고침 후에만 정상 렌더링됨
- 부모의 flex 정렬 속성(alignItems, justifyContent, alignContent) 변경이 자식 요소 위치에 즉시 반영되지 않는 일반적 문제

**근본 원인**
- `@pixi/layout`의 `updateLayout()` 내부에서 `container.emit('layout')`이 `container._onUpdate()`보다 **먼저** 호출됨
- 'layout' 이벤트 핸들러(`syncLayoutData`)에서 `getBounds()`를 호출할 때, `_localTransformChangeId`가 아직 갱신되지 않아 `updateTransform()`이 새 위치를 반영하지 않음
- `updateElementBounds()`의 epsilon check(0.01 오차)가 stale bounds와 이전 bounds를 동일하게 판단 → `notifyLayoutChange()` 미호출
- `registryVersion` 미증가 → Skia 렌더 트리 캐시 재사용 → 이전 위치로 렌더링

```
@pixi/layout updateLayout() 실행 순서:
1. layout._computedPixiLayout = yogaNode.getComputedLayout()  ← 새 값 설정
2. container.emit('layout')  ← syncLayoutData 실행 (getBounds는 stale)
3. container._onUpdate()     ← 이후에야 transform 변경 시그널
```

**해결**
- LayoutContainer의 'layout' 이벤트 핸들러에서 `notifyLayoutChange()` **무조건 호출**
- `hasNewLayout()`이 true인 경우에만 이벤트가 발생하므로, 불필요한 호출 없이 안전
- Skia renderFrame은 PixiJS ticker priority -50 (Application.render() 이후)에 실행되어, 이 시점에서 `worldTransform`은 이미 갱신됨
- 기존 double-RAF 방식(`useEffect` + `requestAnimationFrame` 2중)은 rAF 타이밍 불확실성으로 실패 → 제거

**추가 수정: Block 요소 레이아웃**
- `containerLayout` 스프레드에 `...blockWidthOverride`가 누락되어 flex column 부모의 block 자식이 `width: 100%`를 받지 못하는 문제 수정
- `blockWidthOverride`는 `effectiveLayout` 이후에 스프레드되어야 `width: 'auto'` 기본값을 올바르게 덮어씀

**수정된 파일**
1. `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`
   - LayoutContainer `syncLayoutData`: 'layout' 이벤트에서 `notifyLayoutChange()` 무조건 호출
   - double-RAF useEffect 제거 (불필요)
   - containerLayout 스프레드에 `...blockWidthOverride` 추가

**결과**
- ✅ justify-content, align-items 변경 즉시 캔버스에 반영
- ✅ alignContent, flexWrap 등 모든 부모 flex 속성 동적 변경 지원
- ✅ Block 요소(Card, Panel, Form 등)가 flex column 부모에서 정확한 너비
- ✅ 새로고침 없이 스타일 패널 변경 즉시 반영
- ✅ TypeScript 에러 없음

### Fixed - Canvas Keyboard Shortcut (Backspace/Delete) Not Working (2026-02-05)

#### 캔버스에서 선택된 요소를 Backspace/Delete 키로 삭제 가능하도록 수정

**문제**
- 캔버스에서 요소를 선택한 후 Backspace/Delete 키를 눌러도 요소가 삭제되지 않음
- 삭제는 왼쪽 트리(레이어 패널)의 휴지통 아이콘으로만 가능했음
- Figma, Pencil App 등 디자인 도구의 기본 UX와 불일치

**근본 원인**
- `canvas-container` div에 `tabIndex`가 없어서 DOM 포커스를 받을 수 없었음
- WebGL 캔버스 클릭 시 `document.activeElement`가 캔버스 영역 밖(`document.body`)에 머물러 `useActiveScope`가 `canvas-focused` 스코프를 반환하지 않음
- Delete/Backspace 단축키 스코프가 `['canvas-focused', 'panel:events']`로 정의되어 있어, 활성 우측 패널 스코프(`panel:properties`, `panel:styles` 등)에서는 동작하지 않음
- 단축키 정의(`keyboardShortcuts.ts`)와 핸들러(`useGlobalKeyboardShortcuts.ts`)는 이미 올바르게 구현되어 있었으나, DOM 포커스 문제로 스코프 매칭이 실패

**해결**
- `canvas-container` div에 `tabIndex={-1}` 추가 (프로그래밍적으로 포커스 가능하되 Tab 탐색에는 포함되지 않음)
- `onPointerDown` 핸들러 추가: 캔버스 영역 클릭 시 컨테이너에 포커스 이동 → `activeScope`가 `canvas-focused`로 전환
- 텍스트 입력 요소(`input`, `textarea`, `contenteditable`) 클릭 시에는 포커스를 가져오지 않아 텍스트 편집에 영향 없음
- 포커스 시 불필요한 outline 표시 방지를 위해 CSS에 `outline: none` 추가

**수정된 파일**
1. `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` — `tabIndex={-1}` + `onPointerDown` 포커스 핸들러
2. `apps/builder/src/builder/workspace/Workspace.css` — `.canvas-container`에 `outline: none`

**결과**
- ✅ 캔버스에서 요소 선택 후 Backspace/Delete 키로 삭제 가능
- ✅ 라쏘 선택 후에도 Backspace/Delete 동작
- ✅ 텍스트 편집 중 Backspace는 정상적으로 텍스트 입력에 사용
- ✅ 기존 Copy(⌘C), Paste(⌘V), Escape 등 캔버스 스코프 단축키도 함께 활성화

### Fixed - Pencil-Style 2-Pass Skia Renderer (2026-02-04)

#### Phase 6 Fix: 컨텐츠 캐시 + 오버레이 분리로 렌더 파이프라인 교체

**배경**
- Skia 단일 패스(컨텐츠+오버레이 동시 렌더) + dirty rect/clip 기반 최적화는 좌표계/클리핑 이슈로 잔상·미반영 버그를 유발할 수 있음

**해결**
- **컨텐츠(contentSurface)**: 디자인 노드만 렌더링하여 `contentSnapshot` 캐시 생성
- **표시(mainSurface)**: 스냅샷 blit(카메라 델타는 아핀 변환) 후 **Selection/AI/PageTitle 오버레이를 별도 패스로 덧그리기**
- contentSurface에 **padding(기본 512px)** 을 추가하여 camera-only 아핀 blit의 가장자리 클리핑을 방지하고, `canBlitWithCameraTransform()` 가드로 안전성 확보
- Dirty rect 기반 부분 렌더링 경로는 제거(보류)하고, 컨텐츠 invalidation은 registryVersion 기반 full rerender로 단순화

**수정된 파일**
- `apps/builder/src/builder/workspace/canvas/skia/SkiaRenderer.ts`
- `apps/builder/src/builder/workspace/canvas/skia/SkiaOverlay.tsx`
- `apps/builder/src/builder/workspace/canvas/skia/useSkiaNode.ts`
- `apps/builder/src/builder/workspace/canvas/elementRegistry.ts`
- `docs/WASM.md`, `docs/PENCIL_APP_ANALYSIS.md`

### Fixed - Pencil 2-Pass Renderer Stabilization & Profiling (2026-02-05)

#### Phase 6 후속: 고배율 줌/리사이즈 안정화 + 관측 + 스타일 변경 Long Task 저감

**추가 개선**
- **contentSurface 백엔드 정합**: offscreen surface를 `mainSurface.makeSurface()`로 생성하여 메인과 동일 백엔드(GPU/SW) 사용 (`ck.MakeSurface()` raster-direct 경로 제거).
- **줌 스냅샷 보간**: zoomRatio != 1이면 `drawImageCubic` 우선 적용(미지원 환경 `drawImage` 폴백)으로 확대/축소 품질 개선.
- **Paragraph LRU 캐시**: 텍스트 `Paragraph`를 (내용+스타일+maxWidth) 키로 캐시(최대 500), 폰트 교체/페이지 전환/HMR에서 무효화.
- **리사이즈/DPR/컨텍스트 복원 안정화**: surface 재생성 직후 `invalidateContent()+clearFrame()`로 1-frame stale/잔상 방지.
- **Dev 관측(오버레이)**: `GPUDebugOverlay` 추가 — `RAF FPS`와 `Present/s`, `Content/s`, `Registry/s`, `Idle%`를 분리 관측.
- **스타일 변경 Long Task 저감**: `updateElementProps`/`batchUpdateElementProps`에서 `_rebuildIndexes()` 제거, IndexedDB 저장 백그라운드화, 멀티 선택은 batch 경로로 통합.

**수정된 파일**
- `apps/builder/src/builder/workspace/canvas/skia/SkiaRenderer.ts`
- `apps/builder/src/builder/workspace/canvas/skia/SkiaOverlay.tsx`
- `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`
- `apps/builder/src/builder/workspace/canvas/utils/GPUDebugOverlay.tsx`
- `apps/builder/src/builder/stores/utils/elementUpdate.ts`
- `apps/builder/src/builder/panels/properties/PropertiesPanel.tsx`

### Fixed - Flex Layout CSS Parity & Style Reactivity (2026-02-02)

#### Phase 12 Fix: Flex 자식의 percentage width 오버플로우 및 스타일 즉시 반영

**문제 1: flex 부모에서 `width:100%` 자식이 오버플로우**
- `display:flex, flex-direction:row` 부모에 `width:100%` 버튼 2개 배치 시 body를 벗어남
- CSS 브라우저에서는 정상 동작하지만 WebGL(@pixi/layout)에서는 겹침 발생

**근본 원인:**
- CSS: `flex-shrink` 기본값 = 1 (축소 허용), `min-width` 기본값 = auto
- Yoga: `flex-shrink` 기본값 = 0 (축소 안 함), `min-width` 기본값 = 0
- 기존 코드에서 모든 요소에 `flexShrink: 0` 강제 적용

**해결:**
- 조건부 flexShrink 기본값: 퍼센트 width → `flexShrink: 1`, 고정 width → `flexShrink: 0`
- 사용자가 명시적 flexShrink 설정 시 그 값이 우선

```typescript
const hasPercentSize =
  (typeof effectiveLayout.width === 'string' && effectiveLayout.width.endsWith('%')) ||
  (typeof effectiveLayout.flexBasis === 'string' && String(effectiveLayout.flexBasis).endsWith('%'));
const flexShrinkDefault = effectiveLayout.flexShrink !== undefined
  ? {}
  : { flexShrink: hasPercentSize ? 1 : 0 };
```

**문제 2: 퍼센트 width가 시각적으로 반영되지 않음**
- Yoga가 올바른 위치를 계산하지만 BoxSprite/PixiButton이 raw CSS `width:'100%'`를 직접 사용
- `parseCSSSize('100%', undefined, 100)` → 100px으로 해석

**해결:**
- `LayoutComputedSizeContext` (React Context) 생성하여 Yoga 계산 결과를 자식에 전달
- `ElementSprite`에서 Context를 소비하여 퍼센트 width/height를 정확한 픽셀로 변환
- `container._layout.computedLayout`에서 Yoga 결과 직접 읽기 (`getBounds()`는 콘텐츠 bounding box)

**문제 3: 스타일 패널 변경 후 즉시 반영되지 않음**
- 스타일 변경 후 캔버스를 팬(이동)해야 반영됨

**근본 원인 (복합):**

1. **LayoutContainer 타이밍**: `requestAnimationFrame` 콜백이 @pixi/layout의 `prerender`보다 먼저 실행, rAF는 1회만 실행
2. **Skia Dirty Rect 좌표계 불일치** (주 원인): `registerSkiaNode()`이 dirty rect를 CSS 로컬 좌표(`data.x/y`)로 계산하지만, 실제 Skia 렌더링은 카메라 변환(`translate+scale`) 후 스크린 좌표에서 수행. `renderContent()`의 `clipRect`이 실제 렌더 위치와 불일치하여 변경 사항이 클립 밖에 그려짐. 팬(이동) 시 `camera-only` 프레임이 전체 렌더링을 수행하여 비로소 변경 표시.

**해결:**

1. LayoutContainer: `container.on('layout', handler)` 이벤트 리스너로 교체
2. SkiaRenderer: `content` 프레임에서 dirty rect 부분 렌더링 대신 전체 렌더링 수행

```typescript
// LayoutContainer: @pixi/layout 'layout' 이벤트 구독
container.on('layout', syncLayoutData);
const rafId = requestAnimationFrame(syncLayoutData); // 최초 마운트 시 fallback

// SkiaRenderer: dirty rect 좌표 불일치 → 전체 렌더링으로 안전 처리
case 'content':
  this.renderContent(cullingBounds); // dirtyRects 미전달 → 전체 렌더링
  this.blitToMain();
  break;

// SkiaOverlay: ticker priority 분리 (Yoga 레이아웃 후 렌더링)
app.ticker.add(syncPixiVisibility, undefined, 25);  // HIGH: before Application.render()
app.ticker.add(renderFrame, undefined, -50);         // UTILITY: after Application.render()
```

**수정된 파일:**

1. `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`
   - LayoutContainer: 조건부 flexShrink, layout 이벤트 구독
2. `apps/builder/src/builder/workspace/canvas/layoutContext.ts` (신규)
   - `LayoutComputedSizeContext` — 순환 참조 방지용 별도 파일
3. `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx`
   - Context 소비, 퍼센트 width/height를 Yoga 계산 결과 기반으로 해석
4. `apps/builder/src/builder/workspace/canvas/skia/SkiaRenderer.ts`
   - `content` 프레임: dirty rect 부분 렌더링 → 전체 렌더링으로 변경
5. `apps/builder/src/builder/workspace/canvas/skia/SkiaOverlay.tsx`
   - renderFrame: NORMAL(0) → UTILITY(-50) priority (Yoga 레이아웃 후 실행)
   - syncPixiVisibility: HIGH(25) priority로 분리 (alpha=0 설정)

**결과:**
- ✅ flex 부모에서 `width:100%` 자식이 CSS처럼 비례 축소
- ✅ 퍼센트 기반 width/height가 정확한 픽셀로 변환
- ✅ 스타일 패널 변경 즉시 캔버스에 반영
- ✅ display: block ↔ flex 전환 시 플리커 없음
- ✅ TypeScript 에러 없음

---

### Fixed - Hybrid Layout Engine CSS/WebGL Parity (2026-01-28)

#### Phase 9: display: flex 지원 및 CSS/WebGL 레이아웃 정합성 개선

**문제 1: Button 크기 불일치**
- WebGL에서 버튼들이 겹치거나 잘못된 위치에 렌더링됨
- BUTTON_SIZE_CONFIG 값이 @xstudio/specs ButtonSpec과 일치하지 않음

**해결:**
- `utils.ts`의 BUTTON_SIZE_CONFIG를 ButtonSpec 값으로 동기화
- padding 구조를 `paddingLeft`/`paddingRight`로 분리하여 유연성 확보

```typescript
const BUTTON_SIZE_CONFIG = {
  xs: { paddingLeft: 8, paddingRight: 8, fontSize: 12, height: 24 },
  sm: { paddingLeft: 12, paddingRight: 12, fontSize: 14, height: 32 },
  md: { paddingLeft: 16, paddingRight: 16, fontSize: 16, height: 40 },
  lg: { paddingLeft: 24, paddingRight: 24, fontSize: 18, height: 48 },
  xl: { paddingLeft: 32, paddingRight: 32, fontSize: 20, height: 56 },
};
```

**문제 2: StylesPanel에서 width가 0으로 표시됨**
- `fit-content` 등 CSS intrinsic sizing 키워드가 KEYWORDS에 없어서 파싱 실패

**해결:**
- `PropertyUnitInput.tsx`의 KEYWORDS에 intrinsic sizing 키워드 추가

```typescript
const KEYWORDS = [
  "reset", "auto", "inherit", "initial", "unset", "normal",
  "fit-content", "min-content", "max-content",  // CSS intrinsic sizing
];
```

**문제 3: Page padding이 WebGL에 적용되지 않음**
- CSS에서는 page padding이 적용되지만 WebGL에서는 무시됨

**해결:**
- `BuilderCanvas.tsx`의 `renderWithCustomEngine`에 padding 처리 추가
- 부모의 padding을 파싱하여 자식 요소의 사용 가능 공간 계산
- 자식 위치에 padding offset 적용

```typescript
const parentPadding = parsePadding(parentStyle);
const availableWidth = pageWidth - parentPadding.left - parentPadding.right;
const availableHeight = pageHeight - parentPadding.top - parentPadding.bottom;
// 자식 위치에 padding offset 적용
left: layout.x + parentPadding.left,
top: layout.y + parentPadding.top,
```

**문제 4: display: flex가 WebGL에서 작동하지 않음**
- page나 component에 `display: flex`를 적용해도 시각적 변화 없음
- `rootLayout`에 `display: 'flex'`가 기본값으로 없어서 @pixi/layout이 flex 컨테이너로 인식하지 못함

**해결:**
- `rootLayout` 기본값에 `display: 'flex'` 명시적 추가
- `styleToLayout`에서 `display: 'flex'`와 `flexDirection` 처리 추가

```typescript
// rootLayout 기본값
const result = {
  display: 'flex' as const,  // 🚀 Phase 9: 명시적 추가
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  // ...bodyLayout으로 덮어쓰기
  ...bodyLayout,
};

// styleToLayout에서 display: flex 처리
if (style.display === 'flex' || style.display === 'inline-flex') {
  layout.display = 'flex';
  layout.flexDirection = (style.flexDirection as LayoutStyle['flexDirection']) ?? 'row';
}
```

**수정된 파일:**

1. `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`
   - BUTTON_SIZE_CONFIG를 @xstudio/specs ButtonSpec과 동기화
   - padding → paddingLeft/paddingRight 구조 변경

2. `apps/builder/src/builder/components/property/PropertyUnitInput.tsx`
   - KEYWORDS에 `fit-content`, `min-content`, `max-content` 추가

3. `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`
   - `renderWithCustomEngine`에 부모 padding 처리 추가
   - `rootLayout`에 `display: 'flex'` 기본값 추가

4. `apps/builder/src/builder/workspace/canvas/layout/styleToLayout.ts`
   - `display: 'flex'` 및 `inline-flex` 처리 추가

**결과:**
- ✅ Button 크기가 CSS와 WebGL에서 일치
- ✅ StylesPanel에서 fit-content 등 intrinsic sizing 값 정상 표시
- ✅ Page/Component padding이 WebGL에 정상 적용
- ✅ display: flex, flexDirection이 WebGL에서 정상 동작
- ✅ TypeScript 에러 없음

---

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
