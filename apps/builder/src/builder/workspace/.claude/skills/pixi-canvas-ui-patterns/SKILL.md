# Pixi Canvas UI Patterns

## Description
canvas/ui 디렉토리의 Pixi.js 기반 마이그레이션 UI 컴포넌트들의 일관된 패턴을 강제합니다.
네이밍, props 구조, 이벤트 핸들링, 스타일 적용, @pixi/react 통합을 최적화하여
코드 가독성과 유지보수성을 극대화합니다.

## Negative Rules (절대 하지 말아야 할 것)

### 레이아웃/좌표 (PIXI_LAYOUT.md 기준)
- **x, y prop 직접 사용 금지** - 모든 위치는 layout prop으로 설정
- **flexGrow: 1 + height 미지정 패턴 금지** - 세로 확장 문제 발생
- PixiJS Application 생성 전에 `import "@pixi/layout"` 누락 금지
- 불필요한 Graphics나 Sprite 중첩으로 레이아웃 구성 금지 (@pixi/layout 사용)

### 타입/코드 품질
- `any` 타입 사용 금지 - strict typing 필수

### 스타일/네이밍
- Pixi 컴포넌트에 DOM 스타일 클래스나 Tailwind 문자열 직접 적용 금지
- 색상 값을 하드코딩 문자열로 사용 금지 (colord 또는 theme 변수 필수)
- 컴포넌트 파일명에 Pixi 접두사 생략 금지 (e.g., Button.tsx 대신 PixiButton.tsx)

### React/이벤트
- @pixi/react의 extend 없이 순수 Pixi 객체(Container, Sprite 등) 직접 export 금지
- 이벤트 핸들러에서 e.stopPropagation()이나 e.preventDefault() 직접 호출 금지 (React 방식 유지)
- Pixi 컴포넌트에 React state를 직접 setState로 업데이트 금지 (zustand/jotai 우선)
- Props 네이밍을 React-Aria 원본과 무관하게 임의로 변경 금지 (e.g., onPress → onClick 금지)

### Asset/리소스
- Texture나 Asset 로드 시 await 없이 동기적으로 사용 금지 (로딩 상태 관리 필수)
- @pixi/ui의 기본 컴포넌트(Button, Label 등)를 커스텀 없이 그대로 사용 금지

## Positive Rules (항상 해야 할 것)

### 레이아웃/좌표 (PIXI_LAYOUT.md 기준)
- **`import "@pixi/layout"` 최상단 실행** - PixiJS Application 생성 전에 import
- **모든 레이아웃 정보는 `layout` prop 안에** - 위치, 크기, 패딩, 갭 등 모두 포함
- 레이아웃은 반드시 @pixi/layout + Yoga-layout 조합으로 구성 (FlexLayout, GridLayout 등)
- **pixiText에 `layout={{ isLeaf: true }}`** 필수
- **hitArea는 `layout={{ position: 'absolute', top: 0, left: 0 }}`** 필수
- **배경 Graphics는 `position: 'absolute'`**로 레이아웃에서 제외
- **세로 확장 방지 패턴** 적용: `height: 'auto'`, `flexGrow: 0`, `flexShrink: 0`, `alignSelf: 'flex-start'`
- **Container 타입 (Card, Panel 등)은 children을 내부에서 렌더링**
- **Block 요소 (Card, Panel, Form)에 `flexBasis: '100%'`** 자동 적용

### 스타일/네이밍
- 파일명은 항상 Pixi 접두사 + PascalCase 사용 (PixiButton.tsx, PixiTable.tsx 등)
- 색상/스타일 적용 시 colord로 계산 후 Pixi 속성(tint, fill, stroke)에 적용

### React/이벤트
- 모든 UI 컴포넌트는 @pixi/react의 extend로 커스텀 컴포넌트 형태로 작성 (e.g., extend(Sprite))
- Props는 React-Aria 원본과 최대한 유사하게 유지 (onPointerDown, onFocus 등) + 주석으로 매핑 기록
- 이벤트는 @pixi/react의 pointer 이벤트 사용 (pointerdown, pointerup 등) + React-Aria 스타일 bubble up
- 컴포넌트는 React.memo 또는 useMemo로 불필요한 재렌더링 방지

### 접근성
- 모든 인터랙티브 컴포넌트에 포커스 링 시각화 추가 (focusRing 속성 또는 커스텀 Graphics)

### Asset/리소스
- Asset 로딩은 useAssets 훅이나 Suspense 패턴으로 관리

### 테스트/품질
- **새 컴포넌트는 .tsx + .stories.tsx + .test.tsx 함께 제공**
- 주석으로 "원본 React-Aria 컴포넌트: XXX"와 변환 이유 반드시 기록

## 레이아웃 패턴 예시

### 올바른 컴포넌트 구조

```tsx
// ✅ 올바른 방식
<pixiContainer layout={{ display: 'flex', flexDirection: 'column', padding: 16 }}>
  {/* 배경 - position absolute로 레이아웃에서 제외 */}
  <pixiGraphics
    draw={drawBackground}
    layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
  />

  {/* 콘텐츠 */}
  <pixiText text="Label" layout={{ isLeaf: true }} />

  {/* hitArea - position absolute 필수 */}
  <pixiGraphics
    draw={drawHitArea}
    layout={{ position: 'absolute', top: 0, left: 0 }}
    eventMode="static"
  />
</pixiContainer>

// ❌ 잘못된 방식
<pixiContainer x={posX} y={posY}>
  <pixiText text="Label" x={10} y={5} />
</pixiContainer>
```

### 세로 확장 방지 패턴

```tsx
// ✅ 콘텐츠 기반 높이
const rootLayout = {
  display: 'flex',
  flexDirection: 'column',
  height: 'auto',
  flexGrow: 0,
  flexShrink: 0,
  alignSelf: 'flex-start',
};
```
