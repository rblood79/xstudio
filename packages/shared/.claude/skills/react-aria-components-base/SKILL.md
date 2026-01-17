# React-Aria-Components 베이스 패턴

## Description
shared 패키지의 모든 React-Aria 기반 컴포넌트는 접근성, 상태 관리, Tailwind 통합을 엄격히 준수해야 합니다.  
TanStack Table/Virtual, Lucide 아이콘, 국제화 라이브러리와의 조합을 최적화합니다.

## Negative Rules (절대 하지 말아야 할 것)
- React-Aria 훅 없이 커스텀 포커스/키보드 이벤트 직접 구현하지 말 것
- TanStack React-Table에서 React-Aria Collection 컴포넌트 무시하고 수동 렌더링 금지
- Tailwind 클래스 문자열 직접 합치지 말 것 (tailwind-merge/clsx 필수)
- Lucide-React 아이콘을 React-Aria Button/Tooltip 없이 독립 사용 금지
- @internationalized/date, number 무시하고 직접 포맷팅 구현 금지
- React-Stately 훅 대신 useState로 상태 관리 금지
- 긴 리스트/테이블에서 TanStack Virtual 없이 전체 렌더링 금지
- ARIA 속성(aria-label 등)을 수동으로 직접 추가하지 말 것

## Positive Rules (항상 해야 할 것)
- 모든 인터랙티브 컴포넌트에 적절한 React-Aria 훅 사용 (useButton, useFocusRing 등)
- 테이블은 React-Aria Collection + TanStack React-Table 조합으로 구현
- 클래스명은 항상 clsx + twMerge로 병합
- Lucide 아이콘은 React-Aria Icon 또는 Button 내부에서만 사용
- 날짜/숫자 포맷팅은 반드시 @internationalized/date, number 사용
- 상태 관리는 React-Stately 훅 우선 (useToggleState, useListState 등)
- 긴 데이터 목록은 TanStack React-Virtual 필수 적용
- 국제화는 useMessageFormatter 등 React-Aria i18n 훅 사용
- 모든 컴포넌트 props에 Zod 스키마 검증 추가
- 테스트 코드에는 React-Aria의 키보드/포커스 시뮬레이션 포함