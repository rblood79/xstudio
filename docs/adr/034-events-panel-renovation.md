# ADR-034: Events Panel Renovation

## Status

Proposed

## Date

2026-03-12

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-032](032-events-data-integration.md): Events Platform 재설계 - Capability, Effect, Recipe 기반 데이터 통합

---

## Context

현재 `Events Panel`은 기능이 많지만 사용성이 낮다.

핵심 문제는 다음과 같다.

1. 사용자가 무엇부터 시작해야 하는지 알기 어렵다.
2. 추천, 핸들러 목록, 블록 편집, 액션 추가, 디버깅 정보가 한 화면에 섞여 있다.
3. 데이터가 연결된 상태와 연결되지 않은 상태의 UX 차이가 거의 드러나지 않는다.
4. 자동 생성된 핸들러와 수동 핸들러가 같은 무게로 보인다.
5. 깨진 바인딩, 잘못된 조건식, 지원되지 않는 액션 조합이 늦게 드러난다.
6. 초보자에게는 너무 복잡하고, 숙련자에게도 스캔 비용이 높다.

즉 현재 패널은 "이벤트를 설계하는 도구"라기보다
"이벤트 내부 자료구조를 직접 편집하는 화면"에 가깝다.

---

## Decision

`Events Panel`을 하나의 거대한 편집 화면에서,
목적별 섹션과 단계형 흐름을 가진 패널로 전면 개편한다.

새 패널은 다음 7개 영역으로 구성한다.

1. `PanelHeader`
2. `ConnectionStatusSection`
3. `RecommendedRecipesSection`
4. `HandlersListSection`
5. `HandlerEditorSection`
6. `DiagnosticsSection`
7. `PreviewSection`

핵심 원칙은 다음과 같다.

1. 초보자는 추천 recipe 적용부터 시작할 수 있어야 한다.
2. 숙련자는 바로 handler/effect 편집으로 내려갈 수 있어야 한다.
3. 데이터 연결 상태, 자동 생성 상태, 진단 상태가 항상 visible 해야 한다.
4. 패널은 기능 나열이 아니라 작업 흐름을 중심으로 구성되어야 한다.

---

## Detailed Design Summary

### 1. Connection First

패널 상단에서는 먼저 현재 데이터 연결과 recipe 적용 상태를 보여준다.

예:

- `No data connected`
- `Connected to Users table`
- `2 recipes applied`
- `1 broken binding`

### 2. Recipe Before Raw Events

추천의 기본 단위는 event가 아니라 recipe다.

예:

- `Selection sync`
- `Open detail modal`
- `Search filter binding`
- `Submit form to API`

### 3. List Before Editor

핸들러 목록을 먼저 보고,
선택한 핸들러에 대해서만 상세 블록 편집을 제공한다.

핸들러 상태는 다음 배지로 즉시 구분한다.

- `Manual`
- `Recipe`
- `Warning`
- `Broken`
- `Disabled`

### 4. Diagnostics Inside The Panel

broken binding, invalid condition, drift는
별도 로그나 외부 패널이 아니라 `DiagnosticsSection`에서 직접 보여준다.

### 5. Preview As Intent

프리뷰는 코드 출력보다
"무슨 이벤트/효과가 생성되거나 실행될 것인가"를 먼저 설명한다.

---

## Consequences

### Positive

1. 시작점이 명확해진다.
2. 추천과 편집의 위계가 정리된다.
3. 데이터 연결 상태가 패널 전반에 드러난다.
4. broken state를 조기에 노출할 수 있다.
5. 초보자와 숙련자 모두에게 더 적합한 UX가 된다.

### Negative

1. 기존 패널 구조를 크게 다시 나눠야 한다.
2. 상태 정의와 섹션 간 책임을 다시 정리해야 한다.
3. 초기 리그레션 점검 범위가 넓다.

---

## Follow-up Design Docs

세부 설계는 아래 문서에서 이어진다.

- [events-panel-wireframe.md](../design/events-panel-wireframe.md)
- [events-panel-state-model.md](../design/events-panel-state-model.md)
- [events-panel-recipe-system.md](../design/events-panel-recipe-system.md)
- [events-panel-binding-diagnostics.md](../design/events-panel-binding-diagnostics.md)
- [events-panel-review-checklist.md](../design/events-panel-review-checklist.md)

---

## Acceptance Criteria

1. 사용자는 패널을 열고 5초 안에 다음 행동을 이해할 수 있다.
2. 추천, 목록, 편집, 진단의 역할 구분이 명확하다.
3. manual / recipe / broken 상태 모델이 패널 전체에 일관되게 적용된다.
4. 데이터 연결 여부가 패널 흐름에 영향을 준다는 점이 드러난다.
