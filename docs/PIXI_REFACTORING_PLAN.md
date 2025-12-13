# Pixi.js 사용 개선 Phase Plan

> **생성일**: 2025-12-13
> **기반**: Pixi.js 생태계 라이브러리 사용 감사 보고서
> **목표**: 공식 레퍼런스 준수, 코드 품질 향상, 성능 최적화

---

## 개요

### 수정 대상 요약

| Phase | 우선순위 | 작업 내용 | 파일 수 | 예상 난이도 |
|-------|---------|----------|---------|------------|
| **P1** | Critical | 이벤트 핸들러 camelCase 수정 | 2 | 낮음 |
| **P2** | High | extend() 중복 제거 및 TextStyle 정리 | 2 | 낮음 |
| **P3** | Medium | Graphics fill() 순서 수정 | 2 | 낮음 |
| **P4** | Medium | useExtend 훅 도입 | 2 | 중간 |
| **P5** | Low | PixiButton layoutContainer 이슈 해결 | 2 | 높음 |
| **P6** | Future | 미사용 기능 활용 (선택적) | - | - |

---

## Phase 1: 이벤트 핸들러 camelCase 수정 (Critical)

### 목표
@pixi/react 공식 이벤트 핸들러 명명 규칙(camelCase) 준수

### 대상 파일

#### 1.1 TransformHandle.tsx
**경로**: `src/builder/workspace/canvas/selection/TransformHandle.tsx`

**변경 내용**:
```diff
// Line 99-109
  return (
    <pixiGraphics
      draw={draw}
      x={handleX}
      y={handleY}
      eventMode="static"
      cursor={config.cursor}
-     onpointerdown={handlePointerDown}
-     onpointerover={handlePointerOver}
-     onpointerout={handlePointerOut}
+     onPointerDown={handlePointerDown}
+     onPointerOver={handlePointerOver}
+     onPointerOut={handlePointerOut}
    />
  );
```

#### 1.2 SelectionBox.tsx
**경로**: `src/builder/workspace/canvas/selection/SelectionBox.tsx`

**변경 내용**:
```diff
// Line 116-124
      {enableMoveArea && (
        <pixiGraphics
          draw={drawMoveArea}
          eventMode="static"
          cursor="move"
-         onpointerdown={handleMovePointerDown}
-         onpointerover={handleMovePointerOver}
-         onpointerout={handleMovePointerOut}
+         onPointerDown={handleMovePointerDown}
+         onPointerOver={handleMovePointerOver}
+         onPointerOut={handleMovePointerOut}
        />
      )}
```

### 검증 방법
- [ ] 캔버스에서 요소 선택 시 Transform 핸들 호버/클릭 동작 확인
- [ ] 선택 박스 이동 영역 호버/드래그 동작 확인
- [ ] 콘솔 에러 없음 확인

### 커밋 메시지
```
fix(workspace): use camelCase event handlers for @pixi/react compliance

- TransformHandle: onpointerdown → onPointerDown
- SelectionBox: onpointerdown → onPointerDown
- Follows @pixi/react v8 official naming convention
```

---

## Phase 2: extend() 정리 및 TextStyle 제거 (High)

### 목표
- 중복 extend() 호출 제거
- DisplayObject가 아닌 TextStyle의 extend 등록 제거
- pixiSetup.ts를 단일 진입점으로 통합

### 대상 파일

#### 2.1 pixiSetup.ts
**경로**: `src/builder/workspace/canvas/pixiSetup.ts`

**변경 내용**:
```diff
  import { extend } from '@pixi/react';
  import {
    Container as PixiContainer,
    Graphics as PixiGraphics,
    Sprite as PixiSprite,
    Text as PixiText,
-   TextStyle as PixiTextStyle,
  } from 'pixi.js';
  import {
    LayoutContainer,
    LayoutText,
-   LayoutGraphics,
-   LayoutSprite,
  } from '@pixi/layout/components';

  extend({
    Container: PixiContainer,
    Graphics: PixiGraphics,
    Sprite: PixiSprite,
    Text: PixiText,
-   TextStyle: PixiTextStyle,
    LayoutContainer,
    LayoutText,
-   LayoutGraphics,
-   LayoutSprite,
  });
+
+ // Note: TextStyle은 DisplayObject가 아닌 스타일 객체이므로 extend 불필요
+ // Note: LayoutGraphics/LayoutSprite는 현재 미사용 (Phase 6에서 재검토)
```

#### 2.2 BuilderCanvas.tsx
**경로**: `src/builder/workspace/canvas/BuilderCanvas.tsx`

**변경 내용**:
```diff
- import { Application, extend, useApplication } from "@pixi/react";
- import {
-   Container as PixiContainer,
-   Graphics as PixiGraphics,
-   Text as PixiText,
-   TextStyle as PixiTextStyle,
- } from "pixi.js";
+ import { Application, useApplication } from "@pixi/react";
+ import { Graphics as PixiGraphics } from "pixi.js"; // 타입용만 유지

- // 기본 PixiJS 컴포넌트만 extend (layoutContainer 제외)
- extend({
-   Container: PixiContainer,
-   Graphics: PixiGraphics,
-   Text: PixiText,
-   TextStyle: PixiTextStyle,
- });
+ // pixiSetup.ts에서 모든 컴포넌트 extend 완료
+ import '../pixiSetup';
```

### 검증 방법
- [ ] `npm run type-check` 통과
- [ ] 캔버스 렌더링 정상 동작
- [ ] pixiContainer, pixiGraphics, pixiText JSX 태그 정상 인식
- [ ] layoutContainer, layoutText JSX 태그 정상 인식

### 커밋 메시지
```
refactor(workspace): consolidate extend() calls and remove TextStyle registration

- Remove duplicate extend() in BuilderCanvas.tsx
- Remove TextStyle from extend (not a DisplayObject)
- Remove unused LayoutGraphics/LayoutSprite registrations
- Centralize all extend() in pixiSetup.ts
```

---

## Phase 3: Graphics fill() 순서 수정 (Medium)

### 목표
Pixi.js v8 권장 패턴 준수: Shape 정의 → fill()/stroke() 호출

### 대상 파일

#### 3.1 TextSprite.tsx
**경로**: `src/builder/workspace/canvas/sprites/TextSprite.tsx`

**변경 내용**:
```diff
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (!style?.backgroundColor || style.backgroundColor === 'transparent') {
        return;
      }

-     g.fill({ color: fill.color, alpha: fill.alpha });
-
      if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, borderRadius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
-     g.fill();
+     g.fill({ color: fill.color, alpha: fill.alpha });

      // Stroke
      if (stroke) {
-       g.setStrokeStyle({
-         width: stroke.width,
-         color: stroke.color,
-         alpha: stroke.alpha,
-       });
        if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
          g.roundRect(0, 0, transform.width, transform.height, borderRadius);
        } else {
          g.rect(0, 0, transform.width, transform.height);
        }
-       g.stroke();
+       g.stroke({ width: stroke.width, color: stroke.color, alpha: stroke.alpha });
      }
```

#### 3.2 ImageSprite.tsx
**경로**: `src/builder/workspace/canvas/sprites/ImageSprite.tsx`

**변경 내용**:
```diff
  const drawPlaceholder = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
-     g.fill({ color: PLACEHOLDER_COLOR, alpha: 1 });
-
      if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, borderRadius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
-     g.fill();
+     g.fill({ color: PLACEHOLDER_COLOR, alpha: 1 });

      // Icon 영역도 동일하게 수정...
```

### 검증 방법
- [ ] TextSprite 배경색 렌더링 정상
- [ ] ImageSprite placeholder 렌더링 정상
- [ ] 테두리(stroke) 렌더링 정상

### 커밋 메시지
```
fix(sprites): correct Graphics fill/stroke order per Pixi.js v8 API

- Define shape before calling fill()
- Remove redundant fill() calls
- Use inline stroke style instead of setStrokeStyle()
```

---

## Phase 4: useExtend 훅 도입 (Medium)

### 목표
@pixi/react 권장 패턴인 useExtend 훅 도입으로 메모이제이션 최적화

### 대상 파일

#### 4.1 pixiSetup.ts 리팩토링
**경로**: `src/builder/workspace/canvas/pixiSetup.ts`

**변경 내용**:
```diff
- import { extend } from '@pixi/react';
+ // extend()는 더 이상 직접 호출하지 않음
+ // useExtend 훅을 통해 컴포넌트 내에서 호출
  import {
    Container as PixiContainer,
    Graphics as PixiGraphics,
    Sprite as PixiSprite,
    Text as PixiText,
  } from 'pixi.js';
  import {
    LayoutContainer,
    LayoutText,
  } from '@pixi/layout/components';

- extend({
-   Container: PixiContainer,
-   Graphics: PixiGraphics,
-   Sprite: PixiSprite,
-   Text: PixiText,
-   LayoutContainer,
-   LayoutText,
- });
+ // 컴포넌트 카탈로그 (useExtend에서 사용)
+ export const PIXI_COMPONENTS = {
+   Container: PixiContainer,
+   Graphics: PixiGraphics,
+   Sprite: PixiSprite,
+   Text: PixiText,
+   LayoutContainer,
+   LayoutText,
+ };
+
+ export { PixiContainer, PixiGraphics, PixiSprite, PixiText };
+ export { LayoutContainer, LayoutText };
```

#### 4.2 BuilderCanvas.tsx 리팩토링
**경로**: `src/builder/workspace/canvas/BuilderCanvas.tsx`

**변경 내용**:
```diff
- import { Application, useApplication } from "@pixi/react";
+ import { Application, useApplication, useExtend } from "@pixi/react";
+ import { PIXI_COMPONENTS } from './pixiSetup';

+ /**
+  * 캔버스 내부 컴포넌트 (Application 내부에서 useExtend 사용)
+  */
+ function BuilderCanvasContent({ ... }) {
+   // 메모이즈된 extend - 리렌더 시 재실행 방지
+   useExtend(PIXI_COMPONENTS);
+
+   return (
+     <>
+       <CanvasSmoothResizeBridge containerEl={containerEl} />
+       {/* ... 기존 JSX ... */}
+     </>
+   );
+ }
+
  export function BuilderCanvas({ ... }) {
    // ... 기존 로직 ...

    return (
      <div ref={setContainerNode} className="canvas-container">
        {containerEl && (
          <Application
            resizeTo={containerEl}
            background={backgroundColor}
            antialias={true}
            resolution={window.devicePixelRatio || 1}
            autoDensity={true}
          >
-           <CanvasSmoothResizeBridge containerEl={containerEl} />
-           {/* ... */}
+           <BuilderCanvasContent
+             containerEl={containerEl}
+             {/* props 전달 */}
+           />
          </Application>
        )}
      </div>
    );
  }
```

### 검증 방법
- [ ] useExtend 훅 정상 동작
- [ ] 컴포넌트 리렌더 시 extend 중복 호출 없음 (React DevTools Profiler)
- [ ] 모든 JSX 태그 정상 인식

### 커밋 메시지
```
refactor(workspace): adopt useExtend hook for memoized component registration

- Replace extend() with useExtend() hook
- Export PIXI_COMPONENTS catalog from pixiSetup.ts
- Wrap canvas content in BuilderCanvasContent for hook usage
```

---

## Phase 5: PixiButton layoutContainer 이슈 해결 (Low)

### 목표
@pixi/layout layoutContainer 이벤트 전파 이슈 해결 후 PixiButton 활성화

### 현재 상태
```tsx
// ElementSprite.tsx:154-162
// TODO: @pixi/layout layoutContainer 이벤트 문제로 임시 BoxSprite 사용
case 'button':
  return (
    <BoxSprite ... />  // PixiButton 대신 BoxSprite 사용 중
  );
```

### 조사 항목
- [ ] @pixi/layout GitHub Issues에서 이벤트 관련 이슈 확인
- [ ] layoutContainer eventMode 설정 테스트
- [ ] 이벤트 버블링/캡처링 동작 확인
- [ ] 최신 @pixi/layout 버전(v3.2.0+) 변경사항 확인

### 해결 방안 (예상)
1. **Option A**: layoutContainer에 적절한 eventMode 설정
2. **Option B**: PixiButton 내부에서 이벤트 수동 처리
3. **Option C**: @pixi/ui의 Button 컴포넌트 직접 사용

### 대상 파일
- `src/builder/workspace/canvas/ui/PixiButton.tsx`
- `src/builder/workspace/canvas/sprites/ElementSprite.tsx`

### 커밋 메시지 (해결 시)
```
fix(workspace): resolve layoutContainer event propagation for PixiButton

- Fix eventMode configuration for @pixi/layout
- Enable PixiButton in ElementSprite dispatcher
- Remove BoxSprite fallback for button type
```

---

## Phase 6: 미사용 기능 활용 (Future)

### 목표
감사에서 발견된 미사용 기능 중 활용 가치 높은 항목 도입

### 우선순위 높은 미사용 기능

| 기능 | 패키지 | 활용 시나리오 |
|------|--------|--------------|
| `cacheAsTexture()` | pixi.js | 정적 요소 성능 최적화 |
| `useTick()` | @pixi/react | 애니메이션/인터랙션 루프 |
| `mask` / `setMask()` | pixi.js | 뷰포트 클리핑, 이미지 마스킹 |
| `filters` | pixi.js | 그림자, 블러 등 시각 효과 |
| `svg()` | pixi.js | SVG 아이콘/벡터 import |
| `flexGrow/Shrink` | @pixi/layout | 반응형 레이아웃 |
| `Slider` | @pixi/ui | 슬라이더 컨트롤 |
| `Input` | @pixi/ui | 텍스트 입력 필드 |
| `ScrollBox` | @pixi/ui | 스크롤 가능 영역 |

### 구현 우선순위 제안
1. **cacheAsTexture** - 그리드, 배경 등 정적 요소에 적용
2. **useTick** - 드래그 애니메이션, 선택 효과 등
3. **mask** - 캔버스 뷰포트 영역 제한
4. **@pixi/ui 컴포넌트** - 속성 편집기 등 UI 요소

---

## 실행 계획

### 즉시 실행 (Day 1)
- [x] Phase Plan 문서 작성
- [ ] **Phase 1**: 이벤트 핸들러 camelCase 수정
- [ ] **Phase 2**: extend() 정리 및 TextStyle 제거

### 단기 (Week 1)
- [ ] **Phase 3**: Graphics fill() 순서 수정
- [ ] **Phase 4**: useExtend 훅 도입 (선택적)

### 중기 (Week 2-3)
- [ ] **Phase 5**: PixiButton layoutContainer 이슈 조사 및 해결

### 장기 (Backlog)
- [ ] **Phase 6**: 미사용 기능 활용 계획 수립

---

## 참조 문서

- [PixiJS v8 Migration Guide](https://pixijs.com/8.x/guides/migrations/v8)
- [@pixi/react Documentation](https://react.pixijs.io/)
- [@pixi/layout Documentation](https://layout.pixijs.io/)
- [@pixi/ui GitHub](https://github.com/pixijs/ui)
- [PixiJS Graphics API](https://pixijs.download/v8.14.3/docs/scene.Graphics.html)
