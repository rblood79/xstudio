# 추가 성능 최적화 아이디어

> **작성일**: 2025-12-10
> **작성자**: Antigravity AI

기존 제안(가상화, 워커, 에셋 최적화) 외에 5,000개 요소 환경에서 성능을 극대화할 수 있는 추가 아이디어입니다.

## 1. 이벤트 위임 (Event Delegation) 도입

### 현황 분석

현재 `src/canvas/utils/eventHandlers.ts`의 `createEventHandlerMap`은 각 요소마다 개별적인 이벤트 핸들러(클로저)를 생성하여 부착합니다.

- **문제**: 5,000개 요소 × 평균 2개 이벤트(onClick, onHover) = **10,000개의 이벤트 리스너**가 브라우저 메모리에 상주합니다. 이는 초기 렌더링 속도를 저하시키고 메모리 누수 위험을 높입니다.

### 제안 내용

Canvas 최상위(Root)에서 단 하나의 이벤트 리스너만 등록하고, `event.target`을 통해 이벤트를 처리하는 **이벤트 위임(Event Delegation)** 패턴으로 변경합니다.

- **구현 방안**:
  1. Canvas Root에 `onClick`, `onMouseOver` 등 전역 리스너 등록.
  2. 이벤트 발생 시 `event.target.closest('[data-element-id]')`로 대상 요소 식별.
  3. `EventEngine`을 통해 해당 요소의 액션 실행.
- **기대 효과**: 리스너 수 10,000개 → **10개 내외**로 감소. 메모리 사용량 대폭 절감.

## 2. CSS Containment (`content-visibility`)

### 현황 분석

브라우저는 DOM 요소가 변경될 때마다 전체 레이아웃을 다시 계산(Reflow)하려 합니다. 5,000개 요소가 있는 복잡한 DOM 트리에서는 이 비용이 매우 큽니다.

### 제안 내용

CSS의 `content-visibility: auto` 속성을 활용하여, 화면 밖(Off-screen)에 있는 요소의 렌더링 작업을 브라우저가 건너뛰도록 합니다.

- **구현 방안**:
  - 주요 컨테이너(Panel, Card, Section 등)의 스타일에 `content-visibility: auto` 및 `contain-intrinsic-size` 적용.
- **기대 효과**: 초기 로딩 속도(LCP) 향상 및 스크롤 성능 개선 (브라우저 네이티브 최적화 활용).

## 3. 선택(Selection) 렌더링 분리

### 현황 분석

요소를 선택할 때마다 해당 요소의 `isSelected` props가 변경되어 리렌더링이 발생합니다. 다중 선택(Multi-select) 시 수백 개의 컴포넌트가 동시에 리렌더링될 수 있습니다.

### 제안 내용

선택 상태를 요소의 props가 아닌, 별도의 **Overlay Layer**에서 처리합니다.

- **구현 방안**:
  - 요소 자체는 선택 상태를 모르게 함 (`isSelected` 제거).
  - 선택된 요소의 위치(Rect)를 계산하여, Canvas 위에 띄운 투명 SVG/Div 레이어에 "선택 테두리"만 별도로 그림.
- **기대 효과**: 선택 시 **0개의 요소 리렌더링**. 오직 Overlay만 갱신되므로 즉각적인 반응성 확보.

---

## 요약

| 아이디어              | 난이도 | 효과                  | 비고                   |
| :-------------------- | :----- | :-------------------- | :--------------------- |
| **이벤트 위임**       | 중     | 메모리 ↓, 초기 로딩 ↑ | 구조적 변경 필요       |
| **CSS Containment**   | 하     | 렌더링 성능 ↑         | 코드 한 줄로 적용 가능 |
| **Selection Overlay** | 상     | 선택 반응성 ↑         | Figma/VsCode 방식      |
