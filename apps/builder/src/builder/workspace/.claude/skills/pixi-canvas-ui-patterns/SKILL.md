# Pixi Canvas UI Patterns

## Description
canvas/ui 디렉토리의 Pixi.js 기반 마이그레이션 UI 컴포넌트들의 일관된 패턴을 강제합니다.  
네이밍, props 구조, 이벤트 핸들링, 스타일 적용, @pixi/react 통합을 최적화하여  
코드 가독성과 유지보수성을 극대화합니다.

## Negative Rules (절대 하지 말아야 할 것)
- Pixi 컴포넌트에 DOM 스타일 클래스나 Tailwind 문자열 직접 적용 금지
- @pixi/react의 extend 없이 순수 Pixi 객체(Container, Sprite 등) 직접 export 금지
- 이벤트 핸들러에서 e.stopPropagation()이나 e.preventDefault() 직접 호출 금지 (React 방식 유지)
- Texture나 Asset 로드 시 await 없이 동기적으로 사용 금지 (로딩 상태 관리 필수)
- Props 네이밍을 React-Aria 원본과 무관하게 임의로 변경 금지 (e.g., onPress → onClick 금지)
- 불필요한 Graphics나 Sprite 중첩으로 레이아웃 구성 금지 (@pixi/layout 사용)
- Pixi 컴포넌트에 React state를 직접 setState로 업데이트 금지 (zustand/jotai 우선)
- 색상 값을 하드코딩 문자열로 사용 금지 (colord 또는 theme 변수 필수)
- 컴포넌트 파일명에 Canvas 접미사 생략 금지 (e.g., Button.tsx 대신 ButtonCanvas.tsx)
- @pixi/ui의 기본 컴포넌트(Button, Label 등)를 커스텀 없이 그대로 사용 금지

## Positive Rules (항상 해야 할 것)
- 모든 UI 컴포넌트는 @pixi/react의 extend로 커스텀 컴포넌트 형태로 작성 (e.g., extend(Sprite))
- 파일명은 항상 PascalCase + Canvas 접미사 사용 (ButtonCanvas.tsx, TableCanvas.tsx 등)
- Props는 React-Aria 원본과 최대한 유사하게 유지 (onPointerDown, onFocus 등) + 주석으로 매핑 기록
- 색상/스타일 적용 시 colord로 계산 후 Pixi 속성(tint, fill, stroke)에 적용
- 이벤트는 @pixi/react의 pointer 이벤트 사용 (pointerdown, pointerup 등) + React-Aria 스타일 bubble up
- 레이아웃은 반드시 @pixi/layout + Yoga-layout 조합으로 구성 (FlexLayout, GridLayout 등)
- Asset 로딩은 useAssets 훅이나 Suspense 패턴으로 관리
- 컴포넌트는 React.memo 또는 useMemo로 불필요한 재렌더링 방지
- 모든 인터랙티브 컴포넌트에 포커스 링 시각화 추가 (focusRing 속성 또는 커스텀 Graphics)
- 주석으로 "원본 React-Aria 컴포넌트: XXX"와 변환 이유 반드시 기록