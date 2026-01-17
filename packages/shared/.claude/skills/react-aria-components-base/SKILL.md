# React-Aria-Components 베이스 패턴

## Description
shared 패키지의 모든 React-Aria 기반 컴포넌트는 접근성, 상태 관리, Tailwind 통합을 엄격히 준수해야 합니다.
TanStack Table/Virtual, Lucide 아이콘, 국제화 라이브러리와의 조합을 최적화합니다.

## Negative Rules (절대 하지 말아야 할 것)

### 스타일/CSS
- .tsx 파일에서 inline Tailwind 클래스 사용 금지 (semantic classes + CSS 변수 기반 표준 CSS 사용)
- 새 CSS 파일 생성 지양 - 기존 CSS 패턴 재사용 우선

### 타입/코드 품질
- `any` 타입 사용 금지 - strict typing 필수
- React-Stately 훅 대신 useState로 상태 관리 금지

### React-Aria/접근성
- React-Aria 훅 없이 커스텀 포커스/키보드 이벤트 직접 구현하지 말 것
- TanStack React-Table에서 React-Aria Collection 컴포넌트 무시하고 수동 렌더링 금지
- ARIA 속성(aria-label 등)을 수동으로 직접 추가하지 말 것 (React-Aria 컴포넌트가 자동 처리)

### 아이콘/라이브러리
- Lucide-React 아이콘을 React-Aria Button/Tooltip 없이 독립 사용 금지
- @internationalized/date, number 무시하고 직접 포맷팅 구현 금지

### 성능
- 긴 리스트/테이블에서 TanStack Virtual 없이 전체 렌더링 금지

## Positive Rules (항상 해야 할 것)

### 스타일/CSS
- CSS 클래스명은 `react-aria-*` prefix 사용 (예: react-aria-Button, react-aria-ComboBox)
- 스타일 변형은 `data-variant`, `data-size` 등 data 속성으로 제어
- CSS 파일은 표준 CSS 속성과 CSS 변수 사용 (예: `var(--primary)`, `var(--spacing-md)`)
- 기존 CSS 클래스 재사용 (combobox-container, control-label 등)
- Runtime 커스터마이징은 props.className으로 허용

### React-Aria/접근성
- 모든 인터랙티브 컴포넌트에 적절한 React-Aria 훅 사용 (useButton, useFocusRing 등)
- 테이블은 React-Aria Collection + TanStack React-Table 조합으로 구현

### 상태 관리
- 상태 관리는 React-Stately 훅 우선 (useToggleState, useListState 등)

### 아이콘/라이브러리
- Lucide 아이콘은 React-Aria Icon 또는 Button 내부에서만 사용
- 날짜/숫자 포맷팅은 반드시 @internationalized/date, number 사용
- 국제화는 useMessageFormatter 등 React-Aria i18n 훅 사용

### 성능
- 긴 데이터 목록은 TanStack React-Virtual 필수 적용

### 테스트/품질
- 새 컴포넌트는 구현(.tsx)과 함께 스토리북 스토리 및 테스트 코드를 작성할 것 (파일 패턴은 팀 컨벤션에 따름)
- 모든 컴포넌트 props에 Zod 스키마 검증 추가
- 테스트 코드에는 React-Aria의 키보드/포커스 시뮬레이션 포함
