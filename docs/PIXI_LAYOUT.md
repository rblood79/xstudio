# LayoutEngine → @pixi/layout 마이그레이션

> 목표: LayoutEngine.ts (1,804줄) 완전 삭제, @pixi/layout 선언적 flexbox 전환

## 🎯 진행 상태 (2026-01-07 업데이트)

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 0 | @pixi/layout 동작 검증 | ✅ 완료 |
| Phase 1 | ElementRegistry 구축 | ✅ 완료 |
| Phase 2 | SelectionLayer getBounds() | ✅ 완료 |
| Phase 3 | useViewportCulling getBounds() | ✅ 완료 |
| Phase 4 | renderElementTree layout prop | ✅ 완료 |
| Phase 5 | UI 컴포넌트 x/y 제거 | ✅ 완료 |
| Phase 6 | calculateLayout() 제거 | ✅ 완료 |
| Phase 7 | LayoutEngine.ts 삭제 | ✅ 완료 |
| Phase 7+ | SelectionBox 좌표 변환 수정 | ✅ 완료 |
| Phase 8 | % 단위 지원 - parseCSSSize 제거 | ✅ 완료 |
| Phase 9 | children 기본 flex 레이아웃 + UI layout prop | ✅ 완료 |
| Phase 10 | Container 타입 children 내부 렌더링 | ✅ 완료 |
| Phase 11 | CSS block/inline-block 동기화 | ✅ 완료 |
| Phase 12 | UI 컴포넌트 수동 좌표(x, y) 제거 | 🔄 진행중 |

---

## @pixi/layout 올바른 사용법 (필독)

### 기본 원칙

**@pixi/layout은 flexbox 기반 레이아웃 시스템입니다.**

1. **x, y prop을 직접 지정하지 않음** - 부모 컨테이너의 레이아웃 스타일에 따라 자식이 자동 배치
2. **모든 레이아웃 정보는 `layout` prop 안에** - 위치, 크기, 패딩, 갭 등 모두 포함
3. **`import "@pixi/layout"`이 먼저 실행되어야 함** - PixiJS Application 생성 전에 import

### 초기화 방법

```tsx
// BuilderCanvas.tsx 또는 앱 진입점 최상단
import "@pixi/layout";  // ← 이 한 줄이 모든 마법을 시작합니다!
import { Application, Container, Text, Sprite } from "@pixi/react";
```

### 올바른 사용 예시 (권장)

```tsx
<Container
  layout={{
    width: "100%",
    height: "100%",
    flexDirection: "column",   // 또는 "row"
    padding: 20,
    gap: 16,
    justifyContent: "flex-start",
    alignItems: "stretch",
  }}
>
  {/* Panel 1 */}
  <Container
    layout={{
      width: "100%",
      minHeight: 200,
      padding: 24,
    }}
  >
    <Text text="Panel Title" layout={{ isLeaf: true }} />
  </Container>

  {/* Panel 2 – 자동으로 아래에 배치됨 */}
  <Container
    layout={{
      width: "100%",
      flexGrow: 1,  // 남은 공간 모두 차지
      padding: 24,
    }}
  >
    {/* 내용 */}
  </Container>
</Container>
```

### 핵심 변화 요약

| 기존 방식 (잘못된 예) | 올바른 @pixi/layout 방식 |
|----------------------|-------------------------|
| `<pixiContainer x={posX} y={posY}>` | `<Container layout={{ ... }}>` |
| 부모에서 자식 위치를 수동 계산 | `flexDirection`, `gap` 등으로 자동 배치 |
| LayoutEngine에서 `calculateLayout` | @pixi/layout이 자동으로 계산 |
| 크기 변경 시 수동 재계산 | 부모 크기 바뀌면 자동 재배치 |

### 특별한 경우: absolute 위치

**99%의 경우는 flexbox로 충분합니다.** 예외적으로만 사용:

```tsx
<Container layout={{ position: "relative", width: "100%", height: "100%" }}>
  <Container
    layout={{
      position: "absolute",
      left: 20,
      top: 20,
      width: 300,
      height: 200,
    }}
  >
    {/* 오버레이 패널 등 */}
  </Container>
</Container>
```

**주의**: `style.left/top` 값이 있어도 자동으로 absolute가 되지 않음!
- `position: 'absolute'`는 **명시적으로 지정된 경우에만** 적용
- 그 외에는 모두 flexbox 아이템으로 자동 배치

### 주요 layout 속성

| 속성 | 설명 | 예시 |
|------|------|------|
| `width`, `height` | 크기 | `200`, `"50%"` |
| `minWidth`, `minHeight` | 최소 크기 | `100` |
| `padding` | 내부 여백 | `16` |
| `gap` | 자식 간 간격 | `12` |
| `flexDirection` | 배치 방향 | `"row"`, `"column"` |
| `justifyContent` | 주축 정렬 | `"flex-start"`, `"center"` |
| `alignItems` | 교차축 정렬 | `"flex-start"`, `"stretch"` |
| `flexGrow` | 남은 공간 비율 | `1` |
| `position` | 위치 방식 | `"relative"`, `"absolute"` |
| `isLeaf` | 리프 노드 (Text) | `true` |

---

## 현재 상태 분석

### 의존성 구조

```
BuilderCanvas.tsx
├── calculateLayout() ← LayoutEngine.ts (1,804줄)
├── layoutResult.positions.get() ← 요소 위치 조회
└── ElementsLayer
    └── <pixiContainer x={localX} y={localY}> ← 수동 위치 설정

SelectionLayer.tsx
└── layoutResult.positions.get() ← 선택 박스 위치

useViewportCulling.ts
└── layoutResult.positions.get() ← 뷰포트 컬링
```

### layoutResult 사용처 (제거 대상)

| 파일 | 라인 | 용도 | 제거 방법 |
|------|------|------|----------|
| `BuilderCanvas.tsx` | 409-415 | renderElementTree 위치 | `layout` prop |
| `BuilderCanvas.tsx` | 516-517 | calculateLayout 호출 | 제거 |
| `BuilderCanvas.tsx` | 566-580 | 라쏘 선택 위치 | `getBounds()` |
| `BuilderCanvas.tsx` | 609-617 | getElementBounds | `getBounds()` |
| `BuilderCanvas.tsx` | 1095 | 텍스트 편집 위치 | `getBounds()` |
| `SelectionLayer.tsx` | 142-145 | 선택 박스 위치 | `getBounds()` |
| `useViewportCulling.ts` | 210 | 뷰포트 컬링 | `getBounds()` |

---

## Phase 설계

### 전체 흐름

```
Phase 0: @pixi/layout 동작 검증          🟢 낮음
    ↓
Phase 1: ElementRegistry 구축           🟢 낮음
    ↓
Phase 2: SelectionLayer getBounds()     🟡 중간
    ↓
Phase 3: useViewportCulling getBounds()  🟡 중간
    ↓
Phase 4: renderElementTree layout prop   🔴 높음 ← 핵심!
    ↓
Phase 5: UI 컴포넌트 x/y 제거           🟡 중간
    ↓
Phase 6: calculateLayout() 제거         🔴 높음
    ↓
Phase 7: LayoutEngine.ts 삭제           🟢 낮음
```

---

## Phase 0: @pixi/layout 동작 검증 (테스트)

### 목표
Body 컴포넌트에 `layout` prop을 적용하여 @pixi/layout이 정상 동작하는지 확인

### 작업 내용
1. `BodyLayer.tsx` 수정
   - `<pixiGraphics>` → `<pixiContainer layout={{...}}>` + 내부 Graphics
   - Body의 width/height를 layout prop으로 설정

2. 동작 확인
   - Body가 올바른 크기로 렌더링되는지
   - @pixi/layout의 Yoga가 정상 초기화되는지
   - 콘솔 에러 없는지

### 테스트 코드 예시
```tsx
// BodyLayer.tsx
<pixiContainer
  label="BodyLayer"
  layout={{
    width: pageWidth,
    height: pageHeight,
    flexDirection: 'column',
  }}
>
  <pixiGraphics draw={draw} />
</pixiContainer>
```

### 검증 방법
- 빌드 성공
- 캔버스에 Body 영역이 정상 표시
- 콘솔에 Yoga/layout 관련 에러 없음

### 위험도: 🟢 낮음

---

## Phase 1: ElementRegistry 시스템 구축

### 목표
DisplayObject 참조를 저장하여 `getBounds()` 호출 가능하게 함

### 작업 내용
1. `elementRegistryStore.ts` 생성
   ```tsx
   const elementRegistry = new Map<string, Container>();

   export function registerElement(id: string, container: Container): void
   export function unregisterElement(id: string): void
   export function getElementContainer(id: string): Container | undefined
   export function getElementBounds(id: string): Rectangle | null
   ```

2. `ElementSprite.tsx` 수정
   - 렌더링 시 자신을 registry에 등록
   - unmount 시 등록 해제

### 영향 파일
- `stores/elementRegistryStore.ts` (신규)
- `sprites/ElementSprite.tsx` (수정)

### 검증 방법
- 요소 선택 시 registry에서 bounds 조회 가능
- 메모리 누수 없음 (unmount 시 정리)

### 위험도: 🟢 낮음

---

## Phase 2: SelectionLayer - getBounds() 전환

### 목표
SelectionLayer가 `layoutResult` 대신 `getBounds()`를 사용하도록 전환

### 작업 내용
1. `SelectionLayer.tsx` 수정
   ```tsx
   // Before
   const layoutPos = layoutResult.positions.get(el.id);
   return { x: layoutPos.x, y: layoutPos.y, ... };

   // After
   const container = getElementContainer(el.id);
   const bounds = container?.getBounds();
   return bounds ? { x: bounds.x, y: bounds.y, ... } : fallback;
   ```

2. `layoutResult` prop 제거

### 영향 파일
- `selection/SelectionLayer.tsx`
- `BuilderCanvas.tsx` (layoutResult prop 전달 제거)

### 검증 방법
- 요소 선택 시 SelectionBox가 올바른 위치에 표시
- 다중 선택 시 combined bounds 정상

### 위험도: 🟡 중간

---

## Phase 3: useViewportCulling - getBounds() 전환

### 목표
뷰포트 컬링이 `layoutResult` 대신 `getBounds()`를 사용하도록 전환

### 작업 내용
1. `useViewportCulling.ts` 수정
   ```tsx
   // Before
   const layoutPosition = layoutResult.positions.get(element.id);
   const bounds = getElementBounds(element, layoutPosition);

   // After
   const container = getElementContainer(element.id);
   const bounds = container?.getBounds() ?? getDefaultBounds(element);
   ```

2. `layoutResult` 파라미터 제거

### 영향 파일
- `hooks/useViewportCulling.ts`
- `BuilderCanvas.tsx` (layoutResult 전달 제거)

### 검증 방법
- 줌아웃 시 뷰포트 외 요소 컬링 정상
- 패닝 시 요소가 올바르게 표시/숨김

### 위험도: 🟡 중간

---

## Phase 4: renderElementTree - layout prop 전환

### 목표
ElementsLayer의 `renderElementTree()`가 수동 `x`, `y` 대신 `layout` prop 사용

### 작업 내용
1. `styleToLayout.ts` 생성 (CSS style → @pixi/layout 변환)
   ```tsx
   export function convertStyleToLayout(element: Element): LayoutProps {
     const style = element.props?.style;
     return {
       width: style?.width,
       height: style?.height,
       padding: style?.padding,
       flexDirection: style?.flexDirection ?? 'column',
       gap: style?.gap,
       ...(style?.position === 'absolute' && {
         position: 'absolute',
         left: style?.left,
         top: style?.top,
       }),
     };
   }
   ```

2. `BuilderCanvas.tsx` 수정
   ```tsx
   // Before
   const localX = layoutPos ? layoutPos.x - (parentPos?.x ?? 0) : 0;
   const localY = layoutPos ? layoutPos.y - (parentPos?.y ?? 0) : 0;
   <pixiContainer key={child.id} x={localX} y={localY}>

   // After
   const childLayout = convertStyleToLayout(child);
   <pixiContainer key={child.id} layout={childLayout}>
   ```

3. Body 컨테이너에 root layout 설정
   ```tsx
   <pixiContainer
     label="ElementsLayer"
     layout={{
       width: pageWidth,
       height: pageHeight,
       flexDirection: 'column',
     }}
   >
     {renderElementTree(bodyElement?.id ?? null)}
   </pixiContainer>
   ```

### 영향 파일
- `layout/styleToLayout.ts` (신규)
- `BuilderCanvas.tsx` (renderElementTree 수정)

### 검증 방법
- 모든 요소가 기존과 동일한 위치에 표시
- flexbox 레이아웃 (row, column, gap 등) 정상 동작
- absolute positioned 요소 정상

### 위험도: 🔴 높음 (핵심 렌더링 파이프라인)

---

## Phase 5: UI 컴포넌트 x/y 제거

### 목표
각 UI 컴포넌트에서 `x={posX} y={posY}` 패턴 제거

### 작업 내용
약 20개 UI 컴포넌트 수정:
```tsx
// Before
const posX = parseCSSSize(style?.left, undefined, 0);
const posY = parseCSSSize(style?.top, undefined, 0);
return <pixiContainer x={posX} y={posY}>...</pixiContainer>;

// After
// posX, posY 변수 삭제
// x, y prop 제거 (부모의 layout이 배치)
return <pixiContainer>...</pixiContainer>;
```

### 대상 컴포넌트
- PixiPanel, PixiCard, PixiButton, PixiBadge
- PixiCheckbox, PixiCheckboxGroup, PixiRadio
- PixiTextField, PixiInput, PixiSelect
- PixiTabs, PixiSeparator, PixiLink
- 기타 모든 Pixi* 컴포넌트

### 검증 방법
- 각 컴포넌트 타입별 렌더링 확인
- flexbox 내에서 올바르게 배치되는지 확인

### 위험도: 🟡 중간

---

## Phase 6: calculateLayout() 제거

### 목표
BuilderCanvas에서 `calculateLayout()` 호출 완전 제거

### 작업 내용
1. `BuilderCanvas.tsx` 수정
   ```tsx
   // 제거
   import { initYoga, calculateLayout, type LayoutResult } from "./layout";
   const layoutResult = useMemo(() => calculateLayout(...), [...]);

   // 유지
   import "@pixi/layout";  // @pixi/layout이 자동으로 Yoga 관리
   ```

2. `initYoga()` 호출 제거 (또는 @pixi/layout에 위임)

3. 나머지 `layoutResult` 참조 제거
   - `findElementsInLassoArea` - getBounds() 사용
   - `getElementBounds` - getBounds() 사용
   - `handleElementDoubleClick` - getBounds() 사용

### 영향 파일
- `BuilderCanvas.tsx`

### 검증 방법
- `calculateLayout` import 없이 빌드 성공
- 모든 기능 정상 동작

### 위험도: 🔴 높음

---

## Phase 7: LayoutEngine.ts 삭제

### 목표
LayoutEngine.ts 완전 삭제 (1,804줄)

### 작업 내용
1. `layout/LayoutEngine.ts` 삭제

2. `layout/index.ts` 수정
   ```tsx
   // 제거
   export { initYoga, calculateLayout, ... } from './LayoutEngine';

   // 유지
   export { GridLayout } from './GridLayout';
   export { isGridContainer, ... } from './GridLayout.utils';
   ```

3. 타입 이동
   - `LayoutPosition` 타입이 필요하면 별도 파일로 이동

### 영향 파일
- `layout/LayoutEngine.ts` (삭제)
- `layout/index.ts` (수정)

### 검증 방법
- 빌드 성공
- 타입 체크 통과
- 모든 기능 정상

### 위험도: 🟢 낮음

---

## 예상 결과

| 항목 | Before | After |
|------|--------|-------|
| LayoutEngine.ts | 1,804줄 | **0줄** |
| 수동 x/y 설정 | 모든 요소 | **0개** |
| layoutResult 사용 | 7곳 | **0곳** |

---

## 주의사항

1. **@pixi/layout import 순서**
   - `import "@pixi/layout"`은 PixiJS Application 생성 전에 실행
   - 현재 BuilderCanvas.tsx 상단에 있음 ✅

2. **getBounds() 타이밍**
   - @pixi/layout은 렌더링 후 bounds 결정
   - Selection/Culling은 렌더링 완료 후 bounds 읽어야 함

3. **flexbox 기본값**
   - `flexDirection: 'column'`이 기본 (block 레이아웃 유사)
   - `position: 'absolute'`는 명시적일 때만 적용

4. **롤백 전략**
   - 각 Phase별로 별도 커밋
   - 문제 발생 시 해당 Phase만 롤백 가능

---

## Phase 7+: SelectionBox 좌표 변환 수정 ✅

### 문제
- SelectionBox와 렌더링된 요소의 위치가 일치하지 않음
- `getBounds()`가 글로벌 좌표를 반환하지만, SelectionBox는 Camera Container 안에서 렌더링됨

### 해결
`SelectionLayer.tsx`에 `panOffset` prop 추가하여 글로벌 → Camera 로컬 좌표 변환

```typescript
// SelectionLayer.tsx - computeSelectionBounds()
if (bounds) {
  // 글로벌 좌표 → Camera 로컬 좌표 변환
  const localX = (bounds.x - panOffset.x) / zoom;
  const localY = (bounds.y - panOffset.y) / zoom;
  const localWidth = bounds.width / zoom;
  const localHeight = bounds.height / zoom;
  return { x: localX, y: localY, width: localWidth, height: localHeight };
}
```

### 수정된 파일
- `apps/builder/src/builder/workspace/canvas/selection/SelectionLayer.tsx`
- `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`

---

## Phase 8: 퍼센트(%) 단위 지원 - parseCSSSize 제거 ✅

### 문제
- 스타일 패널에서 `width: 100%`를 설정해도 픽셀 값으로만 계산됨
- `parseCSSSize(style?.width, undefined, 300)` 호출 시 `parentSize`가 `undefined`이므로 % 값이 무시됨
- @pixi/layout은 % 값을 자동으로 처리하지만, 수동 계산이 이를 덮어씀

### 근본적인 해결책
- UI 컴포넌트에서 `parseCSSSize` 호출 제거
- `layout` prop에 `style?.width`를 문자열 그대로 전달
- @pixi/layout이 부모 크기 기준으로 % 값을 자동 계산하도록 위임

### 적용 패턴

```typescript
// ❌ 이전 (% 지원 안됨)
const tabsWidth = parseCSSSize(style?.width, undefined, 300);
const rootLayout = { width: tabsWidth };

// ✅ 이후 (@pixi/layout이 % 자동 처리)
const styleWidth = style?.width;
const fallbackWidth = 300;
const rootLayout = { width: styleWidth ?? fallbackWidth };
```

### 핵심 원칙

1. **layout prop에 style 값 직접 전달** - `'100%'`, `'50%'` 등 문자열 그대로 전달
2. **자식 레이아웃은 `100%` 또는 flex 사용** - `width: '100%'`, `flexGrow: 1`
3. **Graphics는 fallback 값 사용** - 픽셀 값이 필요한 경우 기본값 사용
4. **@pixi/layout 내장 스타일 활용** - `backgroundColor`, `borderColor`, `borderRadius`

### 수정 완료 파일 (23개 UI 컴포넌트)

모든 UI 컴포넌트에서 `parseCSSSize` import 및 호출 제거 완료:

```
PixiButton, PixiCheckbox, PixiCard, PixiList, PixiListBox,
PixiSlider, PixiProgressBar, PixiMeter, PixiSeparator,
PixiSelect, PixiScrollBox, PixiMaskedFrame, PixiToggleButton,
PixiFancyButton, PixiSwitcher, PixiRadio, PixiRadioItem,
PixiCheckboxItem, PixiCheckboxGroup, PixiToggleButtonGroup,
PixiTabs, PixiPanel, PixiInput
```

### 유틸리티 파일 (유지)

다음 파일들은 padding/border 파싱 등 다른 용도로 `parseCSSSize` 사용 (제거 불필요):

| 파일 | 용도 |
|------|------|
| `paddingUtils.ts` | padding shorthand 파싱 (`padding: "10px 20px"`) |
| `borderUtils.ts` | border width 파싱 |
| `styleConverter.ts` | 범용 CSS 크기 변환 유틸리티 (함수 정의) |
| `BodyLayer.tsx` | Body 요소 borderRadius 파싱 |

### 작업 템플릿

각 컴포넌트에서 다음 패턴 적용:

```typescript
// 1. import 제거
- import { parseCSSSize } from "../sprites/styleConverter";

// 2. 변수 변경
- const width = parseCSSSize(style?.width, undefined, 200);
+ const styleWidth = style?.width;
+ const fallbackWidth = 200;

// 3. layout에 직접 전달
- const layout = { width };
+ const layout = { width: styleWidth ?? fallbackWidth };

// 4. Graphics에서는 fallback 사용
- g.roundRect(0, 0, width, height, radius);
+ g.roundRect(0, 0, fallbackWidth, fallbackHeight, radius);
```

---

## Phase 9: children 기본 flex 레이아웃 + UI layout prop ✅

### 문제

1. **children이 0,0에 쌓임**: 부모 요소에 `flexDirection`이 없으면 children이 모두 0,0 위치에 겹쳐서 렌더링됨
2. **UI 컴포넌트 크기 누락**: PixiButton 등 UI 컴포넌트가 `layout` prop 없이 `pixiContainer`를 반환하여 @pixi/layout이 크기를 알 수 없음

### 해결 1: children 기본 flex 레이아웃

`BuilderCanvas.tsx`의 `renderTree`에서 children이 있는 요소에 기본 flex 레이아웃 적용:

```typescript
// BuilderCanvas.tsx - renderTree()
const hasChildren = (pageChildrenMap.get(child.id)?.length ?? 0) > 0;
const containerLayout = hasChildren && !baseLayout.flexDirection
  ? { display: 'flex' as const, flexDirection: 'column' as const, ...baseLayout }
  : baseLayout;
```

### 해결 2: UI 컴포넌트 layout prop 추가

`PixiButton.tsx`에 계산된 크기를 `layout` prop으로 전달:

```typescript
// PixiButton.tsx
const buttonLayout = useMemo(() => ({
  width: layout.width,
  height: layout.height,
}), [layout.width, layout.height]);

return (
  <pixiContainer layout={buttonLayout}>
    ...
  </pixiContainer>
);
```

### 수정된 파일

| 파일 | 수정 내용 |
|------|----------|
| `BuilderCanvas.tsx` | children이 있는 요소에 기본 `display: flex, flexDirection: column` 적용 |
| `styleToLayout.ts` | `LayoutStyle` 타입에 `display` 속성 추가 |
| `PixiButton.tsx` | `layout` prop 추가하여 계산된 width/height 전달 |

### 남은 작업

47개 UI 컴포넌트에 동일하게 `layout` prop 추가 필요:
- PixiBadge, PixiBreadcrumbs, PixiCheckbox, PixiComboBox, PixiDialog 등

---

## Phase 10: Container 타입 children 내부 렌더링 ✅

### 문제

- Card에 Button children을 추가해도 Card 배경에 Button이 포함되지 않음
- children이 Card의 **형제**로 렌더링되어 Card 배경 바깥에 표시됨

#### 이전 구조 (문제)

```
<LayoutContainer>  // Card 래퍼
  <PixiCard>       // Card 배경 + 제목 + 설명만 렌더링
    배경, 제목, 설명...
  </PixiCard>
  <Button1 />      // Card 바깥, 형제로 렌더링 ❌
  <Button2 />      // Card 바깥, 형제로 렌더링 ❌
</LayoutContainer>
```

### 해결

Container 타입 컴포넌트(Card, Panel 등)는 children을 **내부에서 렌더링**:

#### 새로운 구조 (해결)

```
<LayoutContainer>  // Card 래퍼
  <PixiCard>
    <pixiGraphics />     // 배경
    <pixiText />         // 제목
    <pixiText />         // 설명
    <LayoutContainer>    // Button1 (내부 렌더링!) ✅
      <PixiButton />
    </LayoutContainer>
    <LayoutContainer>    // Button2 (내부 렌더링!) ✅
      <PixiButton />
    </LayoutContainer>
    <pixiGraphics />     // 히트 영역
  </PixiCard>
</LayoutContainer>
```

### 구현

#### 1. Container 타입 정의

```typescript
// BuilderCanvas.tsx
const CONTAINER_TAGS = useMemo(() => new Set([
  'Card', 'Box', 'Panel', 'Form', 'Group', 'Dialog', 'Modal',
  'Disclosure', 'DisclosureGroup', 'Accordion',
]), []);
```

#### 2. renderTree에서 Container 타입 처리

```typescript
// BuilderCanvas.tsx - renderTree()
const isContainerType = CONTAINER_TAGS.has(child.tag);
const childElements = isContainerType ? (pageChildrenMap.get(child.id) ?? []) : [];

return (
  <LayoutContainer key={child.id} elementId={child.id} layout={containerLayout}>
    <ElementSprite
      element={child}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      childElements={isContainerType ? childElements : undefined}
      renderChildElement={isContainerType ? (childEl) => {
        // 재귀적으로 children 렌더링
        return (
          <LayoutContainer key={childEl.id} elementId={childEl.id} layout={childContainerLayout}>
            <ElementSprite element={childEl} onClick={onClick} onDoubleClick={onDoubleClick} />
            {renderTree(childEl.id)}
          </LayoutContainer>
        );
      } : undefined}
    />
    {/* Container 타입이 아닌 경우에만 children을 형제로 렌더링 */}
    {!isContainerType && renderTree(child.id)}
  </LayoutContainer>
);
```

#### 3. ElementSprite에 새 props 추가

```typescript
// ElementSprite.tsx
export interface ElementSpriteProps {
  // ... 기존 props
  childElements?: Element[];
  renderChildElement?: (element: Element) => React.ReactNode;
}
```

#### 4. Container 컴포넌트에서 children 렌더링

```typescript
// PixiCard.tsx
export const PixiCard = memo(function PixiCard({
  element,
  onClick,
  childElements,
  renderChildElement,
}: PixiCardProps) {
  return (
    <pixiContainer layout={cardLayout} onLayout={handleLayout}>
      {/* 카드 배경 */}
      <pixiGraphics draw={drawCard} />
      {/* 카드 제목 */}
      {cardTitle && <pixiText ... />}
      {/* 카드 설명 */}
      {cardDescription && <pixiText ... />}

      {/* 🚀 Phase 10: Container children 렌더링 */}
      {childElements?.map((childEl) => renderChildElement?.(childEl))}

      {/* 히트 영역 */}
      <pixiGraphics draw={drawHitArea} ... />
    </pixiContainer>
  );
});
```

### 수정된 파일

| 파일 | 수정 내용 |
|------|----------|
| `BuilderCanvas.tsx` | `CONTAINER_TAGS` 정의, Container 타입에 `childElements`/`renderChildElement` 전달 |
| `ElementSprite.tsx` | `childElements`, `renderChildElement` props 추가, Card/Panel에 전달 |
| `PixiCard.tsx` | `childElements`, `renderChildElement` 수락, children 내부 렌더링 |
| `PixiPanel.tsx` | 동일 패턴 적용 |

### 효과

- Card/Panel에 children 추가 시 **배경이 자동 확장**
- children이 **배경 안에서 렌더링**
- SelectionBox도 children 포함하여 올바르게 표시
- @pixi/layout의 flex 레이아웃으로 children 자동 배치

---

## Phase 11: CSS block/inline-block 동기화 ✅

### 문제

CSS에서 body는 `display: block`이고:
- **block 요소** (Card, Panel): 자동으로 `width: 100%`, 세로 배치
- **inline-block 요소** (Button, Badge): 콘텐츠 너비만 차지, 가로 배치

그러나 @pixi/layout(Yoga)에서는:
- 기본 `flexDirection`이 `column` (CSS와 다름)
- width 미지정 시 콘텐츠에 맞춤 (block 동작과 다름)

### 해결 1: body 레이아웃 설정

body를 `flexDirection: 'row'`, `flexWrap: 'wrap'`으로 설정하여 CSS inline-block 동작 재현:

```typescript
// BuilderCanvas.tsx - rootLayout
const rootLayout = useMemo(() => {
  const bodyLayout = bodyElement ? styleToLayout(bodyElement) : {};
  return {
    flexDirection: 'row' as const,      // inline-block 가로 배치
    flexWrap: 'wrap' as const,          // 줄바꿈
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-start' as const,
    alignContent: 'flex-start' as const,
    ...bodyLayout,
    width: pageWidth,
    height: pageHeight,
    position: 'relative' as const,
  };
}, [pageWidth, pageHeight, bodyElement]);
```

### 해결 2: block 요소에 flexBasis: '100%' 적용

CSS `display: block` 요소가 `flexDirection: 'row'` 부모에서 한 줄 전체를 차지하도록:

```typescript
// BuilderCanvas.tsx
// CSS display: block 요소 목록
const BLOCK_TAGS = useMemo(() => new Set([
  'Card', 'Panel', 'Form', 'Disclosure', 'DisclosureGroup', 'Accordion',
  'Dialog', 'Modal', 'Box',
]), []);

// renderTree에서 block 요소에 flexBasis: '100%' 자동 적용
const isBlockElement = BLOCK_TAGS.has(child.tag);
const blockLayout = isBlockElement && !baseLayout.width
  ? { flexBasis: '100%' as const }
  : {};

const containerLayout = hasChildren && !baseLayout.flexDirection
  ? { display: 'flex' as const, flexDirection: 'column' as const, ...blockLayout, ...baseLayout }
  : { ...blockLayout, ...baseLayout };
```

### CSS와 @pixi/layout 동작 비교

| CSS 속성 | CSS 동작 | @pixi/layout 재현 |
|---------|---------|------------------|
| `display: block` | 한 줄 전체 차지, 세로 배치 | `flexBasis: '100%'` |
| `display: inline-block` | 콘텐츠 너비, 가로 배치 | 기본 동작 (flexBasis 없음) |
| body 기본 | block, 세로 배치 | `flexDirection: 'row'`, `flexWrap: 'wrap'` |

### UI 컴포넌트 layout 동기화

각 UI 컴포넌트가 iframe CSS와 동일하게 동작하도록 layout 설정:

```typescript
// PixiCard.tsx - CSS .react-aria-Card와 동기화
const cardLayout = useMemo(() => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  padding: sizePreset.padding,
  minHeight: 60,
  flexGrow: 0,
  flexShrink: 0,
  alignSelf: 'flex-start',  // 세로 늘어남 방지
}), [sizePreset.padding]);
```

### 수정된 파일

| 파일 | 수정 내용 |
|------|----------|
| `BuilderCanvas.tsx` | `BLOCK_TAGS` 추가, block 요소에 `flexBasis: '100%'` 자동 적용 |
| `BuilderCanvas.tsx` | body rootLayout을 `flexDirection: 'row'`, `flexWrap: 'wrap'`으로 변경 |
| 23개 UI 컴포넌트 | iframe CSS와 동기화된 layout 설정 추가 |

### 동기화된 UI 컴포넌트

다음 컴포넌트들의 layout이 iframe CSS와 동기화됨:

```
PixiCard, PixiPanel, PixiDisclosure, PixiForm,
PixiCheckboxGroup, PixiRadio, PixiListBox, PixiMenu,
PixiToolbar, PixiDialog, PixiPopover, PixiButton,
PixiFancyButton, PixiCheckbox, PixiToggleButton,
PixiSlider, PixiProgressBar, PixiMeter, PixiSeparator,
PixiSelect, PixiScrollBox, PixiList, PixiMaskedFrame
```

### 효과

- **Block 요소** (Card, Panel): body에서 한 줄 전체 차지 → 세로 배치
- **Inline-block 요소** (Button): 콘텐츠 너비만 차지 → 가로 배치
- CSS의 자연스러운 레이아웃 동작이 @pixi/layout에서 재현됨

---

## Phase 12: UI 컴포넌트 수동 좌표(x, y) 제거 🔄 진행중

### 문제

@pixi/layout 사용 시 수동 좌표(`x`, `y` prop)가 레이아웃과 충돌:

1. **x, y prop이 layout과 충돌** - `x={0} y={labelHeight}` 같은 수동 좌표 설정이 @pixi/layout 자동 배치와 충돌
2. **pixiText에 layout 누락** - `isLeaf: true` 없이 텍스트 렌더링 시 크기 계산 오류
3. **hitArea가 레이아웃 공간 차지** - 투명 hitArea가 flex 아이템으로 포함되어 추가 공간 차지

### 해결 원칙

| 요소 | 잘못된 방식 | 올바른 방식 |
|------|------------|------------|
| 텍스트 위치 | `<pixiText x={10} y={5} />` | 부모에 `padding`, 자식에 `layout={{ isLeaf: true }}` |
| 배경 Graphics | 암묵적 (0,0) | `layout={{ position: 'absolute', ... }}` |
| hitArea | flex 아이템으로 포함 | `layout={{ position: 'absolute', top: 0, left: 0 }}` |
| 인디케이터 | `x={indicatorX} y={indicatorY}` | `layout={{ position: 'absolute', bottom: 0 }}` |

### 수정 패턴

#### 1. pixiText: x, y 제거 → 부모 padding + isLeaf

```tsx
// ❌ 기존: 수동 좌표
<pixiContainer layout={{ width: 100, height: 40 }}>
  <pixiText text="Tab" x={12} y={8} />
</pixiContainer>

// ✅ 수정: 부모 padding + isLeaf
<pixiContainer layout={{
  width: 100,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 8,
  paddingBottom: 8,
}}>
  <pixiText text="Tab" layout={{ isLeaf: true }} />
</pixiContainer>
```

#### 2. 배경 Graphics: position absolute로 레이아웃에서 제외

```tsx
// ❌ 기존: 레이아웃 흐름에 포함됨
<pixiContainer layout={{ ... }}>
  <pixiGraphics draw={drawBackground} />
  <pixiText ... />
</pixiContainer>

// ✅ 수정: position absolute로 제외
<pixiContainer layout={{ ... }}>
  <pixiGraphics
    draw={drawBackground}
    layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
  />
  <pixiText layout={{ isLeaf: true }} />
</pixiContainer>
```

#### 3. hitArea: position absolute 필수

```tsx
// ❌ 기존: 레이아웃 공간 차지
<pixiGraphics draw={drawHitArea} eventMode="static" />

// ✅ 수정: position absolute로 레이아웃에서 제외
<pixiGraphics
  draw={drawHitArea}
  layout={{ position: 'absolute', top: 0, left: 0 }}
  eventMode="static"
/>
```

### 수정 완료 파일 (2026-01-09 업데이트)

**Phase 12 진행 상황: 48개 → flexbox 변환 가능 컴포넌트 대부분 완료**

| 파일 | 수정 내용 |
|------|----------|
| `PixiRadio.tsx` | pixiText `isLeaf`, hitArea `position: absolute` |
| `PixiCheckboxGroup.tsx` | pixiText `isLeaf`, hitArea `position: absolute` |
| `PixiBreadcrumbs.tsx` | pixiText `isLeaf` |
| `PixiTabs.tsx` | 인디케이터 `position: absolute`, hover 배경 제거 |
| `PixiDisclosure.tsx` | 전체 레이아웃 재설계, flexbox + padding 사용 |
| `PixiDialog.tsx` | 다이얼로그 내부 구조 flexbox로 변환 |
| `PixiMenu.tsx` | 메뉴 아이템 flexbox 배치 |
| `PixiListBox.tsx` | 리스트 아이템 flexbox 배치, x/y prop 제거 |
| `PixiToggleButtonGroup.tsx` | 버튼 그룹 flexbox 배치 |
| `PixiMeter.tsx` | 라벨/바 flexbox 배치 |
| `PixiSwitch.tsx` | 트랙+썸+라벨 flexbox 배치 |
| `PixiTextField.tsx` | 라벨+인풋+설명 flexbox 배치 |
| `PixiSearchField.tsx` | 검색창 flexbox 배치 |
| `PixiNumberField.tsx` | +/- 버튼+인풋 flexbox 배치 |
| `PixiTextArea.tsx` | 라벨+텍스트에어리어+설명 flexbox 배치 |
| `PixiColorField.tsx` | 스와치+값 flexbox 배치 |
| `PixiToast.tsx` | 아이콘+메시지+닫기버튼 flexbox 배치 |
| `PixiComboBox.tsx` | 입력+드롭다운+아이템 flexbox 배치 |
| `PixiTable.tsx` | 헤더/행/셀 flexbox row 배치 |
| `PixiColorPicker.tsx` | 메인 구조 flexbox (thumbs는 동적 위치) |
| `PixiDateRangePicker.tsx` | 필드 영역 flexbox (캘린더는 그리드) |
| `PixiDatePicker.tsx` | 필드 영역 flexbox (캘린더는 그리드) |
| `PixiSlot.tsx` | 중앙 정렬 콘텐츠 flexbox |
| `PixiFileTrigger.tsx` | 아이콘+라벨 flexbox row 배치 |

### 수동 좌표가 필수인 컴포넌트 (21개 파일)

다음 컴포넌트들은 **동적 위치 계산**이나 **그리드 레이아웃**으로 인해 수동 좌표가 필수:

```
# 그리드/플로우 레이아웃 (자동 줄바꿈, 날짜 셀 등)
PixiCalendar, PixiDatePicker, PixiDateRangePicker, PixiTagGroup,
PixiColorSwatchPicker, PixiGridList, PixiTree, PixiDisclosureGroup,
PixiPagination

# 동적 값 기반 위치 (슬라이더 thumbs, 색상 선택기 등)
PixiColorPicker, PixiColorWheel, PixiColorArea, PixiColorSlider

# 세그먼트 기반 (날짜/시간 입력)
PixiDateField, PixiTimeField

# 특수 레이아웃 (중앙 정렬, 라벨 배지 등)
PixiDropZone, PixiForm, PixiGroup, PixiPopover, PixiTooltip, PixiInput
```

### 검증 방법

1. 타입 체크 통과: `pnpm run type-check`
2. 각 컴포넌트 렌더링 확인
3. 선택 시 SelectionBox 위치 정확성 확인
4. hover/click 이벤트 정상 동작 확인
