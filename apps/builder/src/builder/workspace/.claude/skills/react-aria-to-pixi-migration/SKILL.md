# React-Aria → Pixi/WebGL 마이그레이션 패턴

## Description
React-Aria 기반 컴포넌트를 Pixi.js (WebGL) 기반으로 마이그레이션할 때의 표준 패턴입니다.  
접근성 유지 + 성능 최적화 + @pixi/react/ui/layout/Yoga 통합을 최우선으로 합니다.

## Negative Rules (절대 하지 말아야 할 것)
- React-Aria의 ARIA 속성/역할을 Pixi 컴포넌트에서 삭제하지 말 것
- @pixi/react 없이 순수 Pixi.js 객체 직접 사용 금지
- Yoga-layout 무시하고 수동 position/x/y 계산 금지
- Pixi 컴포넌트에 React-Aria 포커스 이벤트를 직접 바인딩 금지
- WebGL에서 TanStack Virtual 무시하고 전체 데이터 렌더링 금지
- React-Stately 상태를 Pixi 내부 상태로 분리해서 관리 금지
- Lucide 아이콘을 Pixi 스프라이트로 변환할 때 크기/색상 변환 생략 금지
- @pixi/layout 없이 복잡한 UI 레이아웃 구성 금지
- 마이그레이션 후 키보드/스크린리더 접근성 테스트 생략 금지
- Pixi 이벤트에 React-Aria i18n 적용을 무시하지 말 것

## Positive Rules (항상 해야 할 것)
- React-Aria 컴포넌트를 @pixi/react Container/Sprite/Graphics로 매핑
- 포커스/키보드 관리는 React-Aria 훅 + Pixi pointer 이벤트 결합 사용
- 모든 레이아웃은 @pixi/layout + Yoga-layout 필수 적용 (FlexLayout 등)
- 상태 관리는 React-Stately 유지하고 Pixi는 렌더링만 담당
- 긴 리스트/그리드는 TanStack Virtual + Pixi VirtualScroller 조합
- 색상 적용 시 colord 라이브러리 사용 (tint, fill 등)
- 마이그레이션 후 FPS/렌더링 성능 테스트 코드 반드시 추가
- Lucide 아이콘은 Pixi Texture 변환 후 React-Aria 스타일 유지
- 국제화는 @internationalized/* 를 Pixi Text 컴포넌트에 적용
- 모든 마이그레이션 컴포넌트 props에 Zod 검증 필수
- 이벤트 전파는 React-Aria 스타일로 bubble up 구현
- 주석으로 "React-Aria 원본 → Pixi 변환 이유" 반드시 기록