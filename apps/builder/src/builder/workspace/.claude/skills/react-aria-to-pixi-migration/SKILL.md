# React-Aria → Pixi/WebGL 마이그레이션 패턴

## Description
React-Aria 기반 컴포넌트를 Pixi.js (WebGL) 기반으로 마이그레이션할 때의 표준 패턴입니다.
접근성 유지 + 성능 최적화 + @pixi/react/ui/layout/Yoga 통합을 최우선으로 합니다.

## Negative Rules (절대 하지 말아야 할 것)

### 레이아웃/좌표
- **x, y prop 직접 사용 금지** - 모든 위치는 layout prop으로 설정 (Phase 12 완료)
- Yoga-layout 무시하고 수동 position/x/y 계산 금지
- @pixi/layout 없이 복잡한 UI 레이아웃 구성 금지
- PixiJS Application 생성 전에 `import "@pixi/layout"` 누락 금지
- **flexGrow: 1 + height 미지정 패턴 금지** - 세로 확장 문제 발생

### 타입/코드 품질
- `any` 타입 사용 금지 - strict typing 필수

### React-Aria/접근성
- React-Aria의 ARIA 속성/역할을 Pixi 컴포넌트에서 삭제하지 말 것
- @pixi/react 없이 순수 Pixi.js 객체 직접 사용 금지
- Pixi 컴포넌트에 React-Aria 포커스 이벤트를 직접 바인딩 금지
- 마이그레이션 후 키보드/스크린리더 접근성 테스트 생략 금지
- Pixi 이벤트에 React-Aria i18n 적용을 무시하지 말 것

### 상태 관리
- React-Stately 상태를 Pixi 내부 상태로 분리해서 관리 금지

### 아이콘/라이브러리
- Lucide 아이콘을 Pixi 스프라이트로 변환할 때 크기/색상 변환 생략 금지

### 성능
- WebGL에서 TanStack Virtual 무시하고 전체 데이터 렌더링 금지

## Positive Rules (항상 해야 할 것)

### 레이아웃/좌표 (PIXI_LAYOUT.md 기준)
- **모든 레이아웃 정보는 `layout` prop 안에** - 위치, 크기, 패딩, 갭 등 모두 포함
- **`import "@pixi/layout"` 최상단 실행** - PixiJS Application 생성 전에 import
- 모든 레이아웃은 @pixi/layout + Yoga-layout 필수 적용 (FlexLayout 등)
- **pixiText에 `layout={{ isLeaf: true }}`** 필수
- **hitArea는 `layout={{ position: 'absolute', top: 0, left: 0 }}`** 필수
- **배경 Graphics는 `position: 'absolute'`**로 레이아웃에서 제외
- **세로 확장 방지 패턴** 적용: `height: 'auto'`, `flexGrow: 0`, `flexShrink: 0`, `alignSelf: 'flex-start'`
- **Container 타입 (Card, Panel 등)은 children을 내부에서 렌더링**
- **Block 요소 (Card, Panel, Form)에 `flexBasis: '100%'`** 자동 적용

### React-Aria/접근성
- React-Aria 컴포넌트를 @pixi/react Container/Sprite/Graphics로 매핑
- 포커스/키보드 관리는 React-Aria 훅 + Pixi pointer 이벤트 결합 사용
- 이벤트 전파는 React-Aria 스타일로 bubble up 구현

### 상태 관리
- 상태 관리는 React-Stately 유지하고 Pixi는 렌더링만 담당

### 아이콘/라이브러리
- Lucide 아이콘은 Pixi Texture 변환 후 React-Aria 스타일 유지
- 색상 적용 시 colord 라이브러리 사용 (tint, fill 등)
- 국제화는 @internationalized/* 를 Pixi Text 컴포넌트에 적용

### 성능
- 긴 리스트/그리드는 TanStack Virtual + Pixi VirtualScroller 조합

### 테스트/품질
- 마이그레이션 후 FPS/렌더링 성능 테스트 코드 반드시 추가
- **새 컴포넌트는 .tsx 파일과 해당 컴포넌트용 스토리/테스트 코드가 함께 제공** (현재 프로젝트에서 사용하는 패턴에 따름)
- 모든 마이그레이션 컴포넌트 props에 Zod 검증 필수
- 주석으로 "React-Aria 원본 → Pixi 변환 이유" 반드시 기록

## 레이아웃 변환 예시 (PIXI_LAYOUT.md 기준)

### 올바른 레이아웃 사용법

```tsx
// ✅ 올바른 방식: layout prop 사용
<Container
  layout={{
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 20,
    gap: 16,
  }}
>
  <pixiText text="Title" layout={{ isLeaf: true }} />
</Container>

// ❌ 잘못된 방식: x, y prop 직접 사용
<Container x={posX} y={posY}>
  <pixiText text="Title" x={10} y={5} />
</Container>
```

### hitArea 및 배경 Graphics 패턴

```tsx
<pixiContainer layout={{ ... }}>
  {/* 배경 - position absolute로 레이아웃에서 제외 */}
  <pixiGraphics
    draw={drawBackground}
    layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
  />

  {/* 콘텐츠 */}
  <pixiText text="Content" layout={{ isLeaf: true }} />

  {/* hitArea - position absolute 필수 */}
  <pixiGraphics
    draw={drawHitArea}
    layout={{ position: 'absolute', top: 0, left: 0 }}
    eventMode="static"
  />
</pixiContainer>
```

### 세로 확장 방지 패턴

```tsx
// ✅ 콘텐츠 기반 높이 (올바른 패턴)
const rootLayout = {
  display: 'flex',
  flexDirection: 'column',
  height: 'auto',           // 콘텐츠 기반
  flexGrow: 0,              // 남은 공간 차지 안함
  flexShrink: 0,            // 축소 안함
  alignSelf: 'flex-start',  // stretch 방지
};

// ❌ 세로 확장 (피해야 할 패턴)
const badLayout = {
  flexGrow: 1,              // 남은 공간 모두 차지
  height: undefined,        // 높이 미지정
};
```
