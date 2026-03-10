# ADR-032: Events Panel + Data Binding 통합 설계 — Spec-Driven Event Automation

## Status

Proposed

## Date

2026-03-10

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-010](010-events-panel.md): Events Panel Smart Recommendations (P0/P1 완료, P1.5/P2 미구현)
- [ADR-013](013-quick-connect-data-binding.md): Quick Connect Data Binding (Proposed, 미구현)

---

## Executive Summary

ADR-010(이벤트 패널)과 ADR-013(데이터 바인딩)을 **Spec-Driven 단일 파이프라인**으로 통합한다.
React Aria Skill 레퍼런스(`.agents/skills/react-aria/references/components/`)에 정의된 컴포넌트별 이벤트 패턴을
**단일 소스(Single Source of Truth)**로 활용하여, 추천 이벤트/기본 스크립트/데이터 액션을 자동 생성한다.

### 핵심 변화

| 현재 (ADR-010 + ADR-013 분리)            | 통합 후 (ADR-032)                           |
| ---------------------------------------- | ------------------------------------------- |
| `COMPONENT_RECOMMENDED_EVENTS` 수동 관리 | React Aria Skill Spec에서 자동 파생         |
| 이벤트 추천과 데이터 바인딩 독립 동작    | Quick Connect 시 이벤트 핸들러 자동 생성    |
| 템플릿 18개 수동 정의                    | 컴포넌트 Spec + 데이터 컨텍스트로 동적 생성 |
| 이벤트 → 데이터 액션 연결 수동           | Collection 바인딩 시 이벤트+액션 자동 구성  |

---

## Context

### 문제 1: 이벤트 추천의 이중 정의

현재 `COMPONENT_RECOMMENDED_EVENTS`(eventCategories.ts:264)는 **수동으로 관리되는 정적 매핑**이다.
그러나 React Aria Skill 레퍼런스(`.agents/skills/react-aria/references/components/*.md`)에는
각 컴포넌트의 공식 이벤트 API가 이미 정의되어 있다.

```
현재: 수동 매핑 (eventCategories.ts) ← 개발자가 수동 동기화
진실: React Aria Skill Refs (Button.md, ListBox.md, ...) ← 공식 API
```

**결과**: 새 컴포넌트 추가 시 eventCategories.ts 동기화 누락 → 추천 이벤트 부재.

### 문제 2: 데이터 바인딩과 이벤트의 단절

ADR-013의 Quick Connect는 DataTable 생성 + dataBinding 설정만 수행한다.
그러나 Collection 컴포넌트에 데이터를 바인딩한 후 **반드시 필요한 이벤트 패턴**이 있다:

| 컴포넌트 | Quick Connect 후 필수 이벤트          | 필수 액션                           |
| -------- | ------------------------------------- | ----------------------------------- |
| ListBox  | `onSelectionChange`                   | `setState` (선택 아이템 저장)       |
| Select   | `onSelectionChange`                   | `setState` (선택 값 저장)           |
| ComboBox | `onSelectionChange` + `onInputChange` | `setState` + `filterCollection`     |
| GridList | `onSelectionChange` + `onAction`      | `setState` + `navigate`/`showModal` |
| Menu     | `onAction`                            | `navigate`/`setState`               |
| Table    | `onSelectionChange`                   | `setState` (선택 행 저장)           |

현재 사용자는 Quick Connect 후 Events Panel에서 수동으로 이벤트를 추가해야 한다.

### 문제 3: 기본 스크립트 부재

이벤트 핸들러 추가 후 THEN 블록은 비어있다. 사용자가 직접 액션을 구성해야 하며,
React Aria 컴포넌트의 표준 사용 패턴(예: Select의 `onSelectionChange` → 선택 값 저장)에 대한
**기본 스크립트(default script)**가 없다.

### Hard Constraints

1. 기존 P0/P1 구현 유지 — 이미 작동하는 추천 chips, 템플릿, 배지, 경고 UI 보존
2. React Aria 이벤트 API 정합성 — Skill 레퍼런스와 불일치 금지
3. 데이터 독립성 — 컴포넌트 삭제 시 DataTable 보존 (ADR-013 원칙)
4. 히스토리 기록 — 자동 생성된 이벤트 핸들러도 Undo/Redo 대상
5. 성능 — 컴포넌트 선택 시 추천 계산 < 16ms (60fps 보장)

---

## Alternatives Considered

### 대안 A: Spec-Driven 자동 파생 (선택됨)

React Aria Skill 레퍼런스에서 컴포넌트별 이벤트 Spec을 파싱하여 `COMPONENT_EVENT_SPEC` 레지스트리를 생성.
이 Spec이 추천 이벤트, 기본 스크립트, 데이터 연동 액션의 단일 소스가 된다.

- **위험**: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(M)
- 장점: 새 컴포넌트 추가 시 Spec만 정의하면 전체 파이프라인 자동 작동
- 단점: 초기 Spec 정의 작업량

### 대안 B: 기존 분리 유지 + 수동 연동 포인트 추가

ADR-010과 ADR-013을 그대로 두고, Quick Connect 후 "추천 이벤트 추가" 버튼만 노출.

- **위험**: 기술(L) / 성능(L) / 유지보수(H) / 마이그레이션(L)
- 장점: 기존 코드 변경 최소
- 단점: 유지보수 부담 (3곳 동기화: eventCategories.ts + eventTemplates.ts + Quick Connect)

### 대안 C: AI 기반 동적 생성 (P2에서 검토)

LLM이 컴포넌트 타입 + 데이터 스키마를 입력받아 이벤트+액션을 실시간 생성.

- **위험**: 기술(H) / 성능(H) / 유지보수(M) / 마이그레이션(H)
- 장점: 무한한 유연성
- 단점: 지연시간, 비용, 결과 일관성 문제

### Risk Threshold Check

- 대안 A: HIGH 없음 → 선택 가능
- 대안 B: 유지보수 HIGH → 추가 대안 탐색 필요 → 대안 A가 해결
- 대안 C: 기술+성능 HIGH → P2로 연기

---

## Decision

**대안 A: Spec-Driven 자동 파생** 채택.

React Aria Skill 레퍼런스 기반 `COMPONENT_EVENT_SPEC` 레지스트리를 생성하고,
이를 단일 소스로 활용하여 추천 이벤트 + 기본 스크립트 + 데이터 연동 액션을 통합한다.

---

## Part 1: Component Event Spec 레지스트리

### 1-A. COMPONENT_EVENT_SPEC 정의

React Aria Skill 레퍼런스의 컴포넌트별 이벤트 패턴을 구조화한 레지스트리.
기존 `COMPONENT_RECOMMENDED_EVENTS`를 **대체**한다.

```typescript
// data/componentEventSpec.ts

interface EventSpec {
  /** React Aria 공식 이벤트 이름 */
  event: EventType;
  /** 추천 우선순위 (1=가장 높음) */
  priority: number;
  /** 이 이벤트의 주 사용 패턴 설명 */
  pattern: string;
  /** 기본 스크립트: 이벤트 추가 시 자동 생성되는 액션 */
  defaultActions?: DefaultAction[];
  /** 데이터 바인딩 존재 시 추가되는 액션 */
  dataActions?: DefaultAction[];
  /** React Aria Skill 레퍼런스 경로 */
  skillRef: string;
}

interface DefaultAction {
  type: ActionType;
  config: Record<string, unknown>;
  /** 액션 설명 (UI 표시용) */
  description: string;
}

interface ComponentEventSpec {
  /** 컴포넌트 태그 */
  tag: string;
  /** React Aria 카테고리 */
  category:
    | "action"
    | "form"
    | "selection"
    | "collection"
    | "overlay"
    | "content"
    | "layout";
  /** 이벤트 Spec 목록 (priority 순) */
  events: EventSpec[];
  /** Quick Connect 시 자동 생성할 이벤트 (dataActions 포함 이벤트만) */
  quickConnectEvents?: string[];
  /** React Aria Skill 레퍼런스 파일 */
  skillRefPath: string;
}
```

### 1-B. 컴포넌트별 Event Spec 전체 매핑

React Aria Skill 레퍼런스(`.agents/skills/react-aria/references/components/`)에서 파생.

#### Action 컴포넌트

| 컴포넌트         | Skill Ref         | Primary Event   | Default Action             | Data Action |
| ---------------- | ----------------- | --------------- | -------------------------- | ----------- |
| **Button**       | `Button.md`       | `onPress` (P1)  | `navigate` \| `showModal`  | —           |
|                  |                   | `onClick` (P2)  | —                          | —           |
| **Link**         | `Link.md`         | `onPress` (P1)  | `navigate`                 | —           |
| **ToggleButton** | `ToggleButton.md` | `onChange` (P1) | `setState` (toggle값 저장) | —           |
|                  |                   | `onPress` (P2)  | —                          | —           |

**Button 기본 스크립트**:

```
WHEN: onPress
THEN: [navigate → {path: ""}]  // 사용자가 경로 입력
```

#### Form 컴포넌트

| 컴포넌트        | Skill Ref        | Primary Event    | Default Action                           | Data Action        |
| --------------- | ---------------- | ---------------- | ---------------------------------------- | ------------------ |
| **TextField**   | `TextField.md`   | `onChange` (P1)  | `setState` (값 저장)                     | `saveToDataTable`  |
|                 |                  | `onFocus` (P2)   | —                                        | —                  |
|                 |                  | `onBlur` (P3)    | `validateForm`                           | —                  |
| **SearchField** | `SearchField.md` | `onChange` (P1)  | `filterCollection`                       | `filterCollection` |
|                 |                  | `onInput` (P2)   | —                                        | —                  |
|                 |                  | `onKeyDown` (P3) | —                                        | —                  |
| **NumberField** | `NumberField.md` | `onChange` (P1)  | `setState`                               | `saveToDataTable`  |
|                 |                  | `onBlur` (P2)    | `validateForm`                           | —                  |
| **Checkbox**    | `Checkbox.md`    | `onChange` (P1)  | `setState`                               | —                  |
| **Switch**      | `Switch.md`      | `onChange` (P1)  | `setState` (toggle)                      | —                  |
| **RadioGroup**  | `RadioGroup.md`  | `onChange` (P1)  | `setState`                               | —                  |
| **Slider**      | `Slider.md`      | `onChange` (P1)  | `setState`                               | —                  |
| **Form**        | `Form.md`        | `onSubmit` (P1)  | `validateForm` → `apiCall` → `showToast` | `saveToDataTable`  |

**TextField 기본 스크립트**:

```
WHEN: onChange
THEN: [setState → {key: "{elementId}_value", value: "event.target.value"}]
```

**Form 기본 스크립트**:

```
WHEN: onSubmit
THEN: [validateForm → {}, apiCall → {url: ""}, showToast → {message: "제출 완료"}]
```

#### Selection / Collection 컴포넌트 (데이터 연동 핵심)

| 컴포넌트              | Skill Ref              | Primary Event            | Default Action            | Data Action (Quick Connect 시) |
| --------------------- | ---------------------- | ------------------------ | ------------------------- | ------------------------------ |
| **Select**            | `Select.md`            | `onSelectionChange` (P1) | `setState` (선택 key)     | `setState` (선택 아이템 전체)  |
|                       |                        | `onOpenChange` (P2)      | —                         | `loadDataTable` (lazy load)    |
| **ComboBox**          | `ComboBox.md`          | `onSelectionChange` (P1) | `setState` (선택 key)     | `setState` (선택 아이템 전체)  |
|                       |                        | `onInputChange` (P2)     | `filterCollection`        | `filterCollection` (서버 필터) |
|                       |                        | `onOpenChange` (P3)      | —                         | `loadDataTable`                |
| **ListBox**           | `ListBox.md`           | `onSelectionChange` (P1) | `setState` (선택 key)     | `setState` (선택 아이템 전체)  |
|                       |                        | `onAction` (P2)          | `navigate` \| `showModal` | `navigate` (상세 페이지)       |
| **GridList**          | `GridList.md`          | `onSelectionChange` (P1) | `setState` (선택 key)     | `setState` (선택 아이템 전체)  |
|                       |                        | `onAction` (P2)          | `showModal`               | `showModal` (편집 모달)        |
| **Menu**              | `Menu.md`              | `onAction` (P1)          | `navigate`                | `navigate`                     |
|                       |                        | `onOpenChange` (P2)      | —                         | —                              |
| **TagGroup**          | `TagGroup.md`          | `onSelectionChange` (P1) | `setState`                | `filterCollection` (태그 필터) |
| **Table**             | `Table.md`             | `onSelectionChange` (P1) | `setState` (선택 행)      | `setState` (선택 행 데이터)    |
| **Tree**              | `Tree.md`              | `onSelectionChange` (P1) | `setState` (선택 노드)    | `setState`                     |
|                       |                        | `onAction` (P2)          | `navigate`                | `navigate`                     |
| **ToggleButtonGroup** | `ToggleButtonGroup.md` | `onSelectionChange` (P1) | `setState`                | `filterCollection`             |
| **Tabs**              | `Tabs.md`              | `onSelectionChange` (P1) | `setState` (활성 탭)      | `loadDataTable` (탭별 데이터)  |

**ListBox + Quick Connect 기본 스크립트**:

```
WHEN: onSelectionChange
THEN: [setState → {key: "{elementId}_selected", value: "event.selectedKey"}]

WHEN: onAction
THEN: [navigate → {path: "/detail/{event.key}"}]
```

**Table + Quick Connect 기본 스크립트**:

```
WHEN: onSelectionChange
THEN: [setState → {key: "{elementId}_selectedRow", value: "event.selectedKey"}]
```

#### Overlay 컴포넌트

| 컴포넌트    | Skill Ref    | Primary Event       | Default Action      |
| ----------- | ------------ | ------------------- | ------------------- |
| **Dialog**  | `Modal.md`   | `onOpenChange` (P1) | `setState` (isOpen) |
| **Popover** | `Popover.md` | `onOpenChange` (P1) | `setState` (isOpen) |

#### Content 컴포넌트

| 컴포넌트  | Skill Ref | Primary Event       | Default Action            |
| --------- | --------- | ------------------- | ------------------------- |
| **Card**  | —         | `onClick` (P1)      | `navigate`                |
|           |           | `onMouseEnter` (P2) | —                         |
| **Image** | —         | `onClick` (P1)      | `showModal` (이미지 뷰어) |
|           |           | `onLoad` (P2)       | —                         |

### 1-C. `COMPONENT_RECOMMENDED_EVENTS` 파생 함수

기존 정적 매핑을 Spec에서 동적 파생하는 함수로 대체:

```typescript
// data/componentEventSpec.ts

/**
 * COMPONENT_EVENT_SPEC에서 추천 이벤트 목록을 파생
 * 기존 COMPONENT_RECOMMENDED_EVENTS와 동일한 인터페이스 유지
 */
export function getRecommendedEventsFromSpec(
  componentType: string,
): EventType[] {
  const spec = COMPONENT_EVENT_SPEC_MAP[componentType];
  if (!spec)
    return (
      COMPONENT_EVENT_SPEC_MAP["default"]?.events.map((e) => e.event) ?? [
        "onClick",
        "onPress",
      ]
    );
  return spec.events
    .sort((a, b) => a.priority - b.priority)
    .map((e) => e.event);
}

/**
 * 기본 스크립트 포함 추천 이벤트 (UI에서 프리뷰 표시용)
 */
export function getRecommendedEventsWithDefaults(
  componentType: string,
  hasDataBinding: boolean,
): EventSpecWithActions[] {
  const spec = COMPONENT_EVENT_SPEC_MAP[componentType];
  if (!spec) return [];
  return spec.events.map((event) => ({
    ...event,
    actions: hasDataBinding
      ? [...(event.defaultActions ?? []), ...(event.dataActions ?? [])]
      : (event.defaultActions ?? []),
  }));
}
```

---

## Part 2: Quick Connect + Event Auto-Generation 통합

### 2-A. Quick Connect 확장 — 이벤트 자동 생성

ADR-013의 `useQuickConnect` 훅을 확장하여 데이터 바인딩 후 이벤트 핸들러를 자동 생성한다.

```typescript
// hooks/useQuickConnect.ts (ADR-013 확장)

interface UseQuickConnectOptions {
  elementId: string;
  componentTag: string;
  currentDataBinding?: DataBindingValue | null;
  onDataBindingChange: (
    binding: DataBindingValue | null,
  ) => void | Promise<void>;
  /** 신규: 이벤트 자동 생성 옵션 */
  autoGenerateEvents?: boolean; // 기본값: true
}

interface UseQuickConnectResult {
  quickConnect: (preset: DataTablePreset | null) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  /** 신규: Quick Connect 시 자동 생성될 이벤트 프리뷰 */
  previewEvents: EventSpec[];
}
```

**Quick Connect 흐름 (확장)**:

```
Quick Connect 클릭 → Preset 선택
  ↓
Phase 1: DataTable 생성 + dataBinding 설정 (기존 ADR-013)
  ↓
Phase 2: (신규) Event Auto-Generation
  1. COMPONENT_EVENT_SPEC에서 quickConnectEvents 조회
  2. 각 이벤트에 대해 defaultActions + dataActions 병합
  3. 이벤트 핸들러 일괄 생성 (기존 handleAddEvent 경로 재사용)
  4. 히스토리 기록 (단일 트랜잭션)
  ↓
Phase 3: Events Panel 자동 갱신
  - 생성된 이벤트 핸들러가 리스트에 표시
  - THEN 블록에 기본 액션이 미리 채워진 상태
```

### 2-B. QuickConnectButton UI 확장

```
[Zap] Quick Connect (버튼)
  └── Popover (280px)
      ├── "빈 테이블" 옵션
      ├── 구분선
      ├── 카테고리별 Preset 목록 (PRESET_CATEGORIES 5개)
      ├── 구분선
      └── ☑ 기본 이벤트 자동 생성 (체크박스, 기본 ON)
           └── 프리뷰: "onSelectionChange → 선택 아이템 저장"
```

### 2-C. 컴포넌트별 Quick Connect + Event 통합 시나리오

#### 시나리오 1: ListBox + Quick Connect

```
사용자: ListBox 선택 → Property Editor → Quick Connect → "Users" Preset

자동 생성:
1. DataTable "Users" (name, email, role, status)
2. dataBinding: { source: 'dataTable', name: 'Users' }
3. 이벤트 핸들러:
   ├── onSelectionChange
   │   └── THEN: [setState → {key: "listbox_1_selected", value: "selectedKey"}]
   └── onAction
       └── THEN: [navigate → {path: ""}]  // 사용자가 경로 설정

Events Panel 표시:
┌─────────────────────────────────┐
│ ⬜ Events                    [+]│
├─────────────────────────────────┤
│ ✅ Quick Connect로 자동 생성됨    │  ← 안내 배너
├─────────────────────────────────┤
│ ▸ onSelectionChange  1 action  │  ← 자동 생성
│ ▸ onAction           1 action  │  ← 자동 생성
└─────────────────────────────────┘
```

#### 시나리오 2: Table + Quick Connect

```
사용자: Table 선택 → Quick Connect → "Products" Preset

자동 생성:
1. DataTable "Products" (name, price, category, stock)
2. dataBinding 설정
3. Column 자동 생성 (기존 ADD_COLUMN_ELEMENTS 파이프라인)
4. 이벤트 핸들러:
   └── onSelectionChange
       └── THEN: [setState → {key: "table_1_selectedRow", value: "selectedKey"}]
```

#### 시나리오 3: Select + Quick Connect

```
사용자: Select 선택 → Quick Connect → "Categories" Preset

자동 생성:
1. DataTable "Categories" (name, slug, description)
2. dataBinding 설정
3. 이벤트 핸들러:
   └── onSelectionChange
       └── THEN: [setState → {key: "select_1_value", value: "selectedKey"}]
```

#### 시나리오 4: ComboBox + Quick Connect

```
사용자: ComboBox 선택 → Quick Connect → "Users" Preset

자동 생성:
1. DataTable "Users" (name, email, role)
2. dataBinding 설정
3. 이벤트 핸들러:
   ├── onSelectionChange
   │   └── THEN: [setState → {key: "combobox_1_value", value: "selectedKey"}]
   └── onInputChange
       └── THEN: [filterCollection → {targetId: "{elementId}", filterMode: "text"}]
```

#### 시나리오 5: Form 컨텍스트 (Quick Connect 없이)

Form 컴포넌트의 `onSubmit` 이벤트 추가 시 기본 스크립트 자동 채움:

```
사용자: Form 선택 → Events Panel → "onSubmit" chip 클릭

자동 생성:
└── onSubmit 핸들러
    └── THEN:
        1. validateForm → {}
        2. apiCall → {url: "", method: "POST"}
        3. showToast → {message: "제출 완료", type: "success"}
```

---

## Part 3: Events Panel UI 통합

### 3-A. 데이터 컨텍스트 인식 추천

기존 추천 이벤트 chips에 **데이터 바인딩 상태**를 반영한다.

```
// 데이터 바인딩 없을 때
┌─────────────────────────────────┐
│ 추천: [onSelectionChange] [onAction] │
└─────────────────────────────────┘

// 데이터 바인딩 있을 때 (Quick Connect 후)
┌─────────────────────────────────────────────────────────┐
│ 추천: [onSelectionChange 📊] [onAction] [filterCollection 📊] │
│        ↑ 데이터 연동 마커                                     │
└─────────────────────────────────────────────────────────┘
```

### 3-B. 기본 스크립트 프리뷰

추천 이벤트 chip에 호버 시 기본 스크립트 프리뷰를 툴팁으로 표시:

```
┌──────────────────────────────────────┐
│ onSelectionChange                     │
│ ─────────────────                     │
│ 선택 변경 시 실행                     │
│                                       │
│ 📋 기본 스크립트:                     │
│ → setState: 선택 아이템 저장          │
│                                       │
│ 📊 데이터 연동:                       │
│ → 바인딩된 DataTable의 행 데이터 참조 │
│                                       │
│ 클릭하면 위 스크립트로 자동 생성됩니다  │
└──────────────────────────────────────┘
```

### 3-C. Dataset Panel ↔ Events Panel 양방향 연동

```
Dataset Panel                    Events Panel
┌────────────┐                  ┌────────────────────┐
│ DataTables │                  │ Event Handlers     │
│ ├─ Users   │ ──dataBinding──→│ ├─ onSelectionChange│
│ ├─ Products│                  │ ├─ onAction        │
│ └─ Orders  │                  │ └─ onSubmit        │
│            │                  │                    │
│ Variables  │                  │ Actions            │
│ ├─ selected│ ←──setState────→│ ├─ setState         │
│ └─ filter  │ ←─filterCol───→│ ├─ filterCollection │
│            │                  │ └─ loadDataTable   │
│ APIs       │                  │                    │
│ └─ /users  │ ←──apiCall────→│ └─ apiCall          │
└────────────┘                  └────────────────────┘
```

**연동 포인트**:

| Dataset 변경          | Events Panel 반응                                           |
| --------------------- | ----------------------------------------------------------- |
| DataTable 삭제        | 해당 바인딩의 dataActions 경고 표시 (⚠️ "데이터 소스 없음") |
| DataTable 스키마 변경 | filterCollection의 fieldName 유효성 재검증                  |
| Variable 삭제         | setState 참조 변수 경고 표시                                |
| API Endpoint 삭제     | apiCall 참조 URL 경고 표시                                  |
| Quick Connect 실행    | quickConnectEvents 기반 이벤트 자동 생성                    |

### 3-D. 통합 UX 상태별 화면

#### 상태 1: 요소 선택 + 데이터 미연결 + 핸들러 없음

```
┌────────────────────────────────────────┐
│ ⬜ Events                           [+]│
├────────────────────────────────────────┤
│ 추천: [onSelectionChange] [onAction]    │
├────────────────────────────────────────┤
│                                        │
│  ⚡ 이벤트 핸들러가 없습니다            │
│  추천 이벤트를 클릭하거나 + 로 추가     │
│                                        │
│  💡 Quick Connect로 데이터를            │
│     연결하면 이벤트가 자동 생성됩니다   │
│                                        │
├────────────────────────────────────────┤
│ 📋 Quick Start 레시피                   │
│ ┌─ 데이터 선택 + 상세 보기 ──────────┐ │
│ │ onSelectionChange → setState       │ │
│ │ onAction → navigate               │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

#### 상태 2: 요소 선택 + Quick Connect 완료 직후

```
┌────────────────────────────────────────┐
│ ⬜ Events                           [+]│
├────────────────────────────────────────┤
│ ✅ "Users" 데이터 연결 + 이벤트 생성   │  ← 성공 배너 (5초 후 자동 숨김)
├────────────────────────────────────────┤
│ ▸ onSelectionChange 📊   1 action     │  ← 자동 생성
│ ▸ onAction               1 action     │  ← 자동 생성
├────────────────────────────────────────┤
│ 추천: [onOpenChange]                   │  ← 미등록 이벤트만
└────────────────────────────────────────┘
```

#### 상태 3: 핸들러 디테일 (데이터 연동 액션)

```
┌────────────────────────────────────────┐
│ ← onSelectionChange 📊            [🗑] │
├────────────────────────────────────────┤
│ ┌─ WHEN ───────────────────────────┐  │
│ │ onSelectionChange                │  │
│ │ 📊 DataTable: Users              │  │  ← 바인딩 컨텍스트 표시
│ └──────────────────────────────────┘  │
│         │                              │
│ ┌─ THEN ───────────────── 1 action ┐  │
│ │ 1. 📦 setState                   │  │
│ │    key: "listbox_1_selected"     │  │  ← 자동 생성된 config
│ │    value: selectedKey            │  │
│ │                                  │  │
│ │ 추천: [showModal] [navigate] 📊  │  │  ← 데이터 컨텍스트 추천
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## Part 4: 기존 템플릿 시스템 통합

### 4-A. 정적 템플릿 → Spec 기반 동적 템플릿 전환

기존 18개 정적 템플릿(`eventTemplates.ts`)을 `COMPONENT_EVENT_SPEC`에서 동적으로 생성:

```typescript
// data/eventTemplates.ts (확장)

/**
 * Spec 기반 동적 템플릿 생성
 * 정적 템플릿과 공존 — 정적 템플릿이 우선, Spec 보충
 */
export function generateSpecTemplates(
  componentType: string,
  hasDataBinding: boolean,
): EventTemplate[] {
  const spec = COMPONENT_EVENT_SPEC_MAP[componentType];
  if (!spec) return [];

  const templates: EventTemplate[] = [];

  // Quick Connect 시나리오 템플릿
  if (hasDataBinding && spec.quickConnectEvents) {
    templates.push({
      id: `spec-${componentType.toLowerCase()}-data-selection`,
      name: `${componentType} 데이터 선택`,
      description: `${componentType}에서 아이템 선택 시 값을 저장합니다`,
      category: "DATA",
      events: spec.events
        .filter((e) => spec.quickConnectEvents?.includes(e.event))
        .map((e) => ({
          type: e.event,
          actions: [...(e.defaultActions ?? []), ...(e.dataActions ?? [])],
        })),
      componentTypes: [componentType],
      usage: 90,
    });
  }

  // 기본 인터랙션 템플릿
  const primaryEvent = spec.events[0];
  if (primaryEvent?.defaultActions?.length) {
    templates.push({
      id: `spec-${componentType.toLowerCase()}-primary`,
      name: `${componentType} 기본 인터랙션`,
      description: `${componentType}의 기본 이벤트 패턴`,
      category: spec.category === "form" ? "FORM" : "UI",
      events: [
        {
          type: primaryEvent.event,
          actions: primaryEvent.defaultActions,
        },
      ],
      componentTypes: [componentType],
      usage: 85,
    });
  }

  return templates;
}

/**
 * 통합 추천 템플릿 조회
 * 정적 + 동적 병합, 중복 제거, 사용률 정렬
 */
export function getIntegratedTemplates(
  componentType: string,
  hasDataBinding: boolean,
  maxCount: number = 5,
): EventTemplate[] {
  const staticTemplates = getRecommendedTemplates(componentType);
  const specTemplates = generateSpecTemplates(componentType, hasDataBinding);

  // 정적 우선, Spec 보충 (이벤트 타입 중복 제거)
  const usedEvents = new Set(
    staticTemplates.flatMap((t) => t.events.map((e) => e.type)),
  );
  const uniqueSpecTemplates = specTemplates.filter(
    (t) => !t.events.every((e) => usedEvents.has(e.type)),
  );

  return [...staticTemplates, ...uniqueSpecTemplates]
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
    .slice(0, maxCount);
}
```

### 4-B. 기존 18개 정적 템플릿 유지

정적 템플릿은 도메인 특화 시나리오(Form 유효성 검사, API 호출 체인 등)를 커버하므로 그대로 유지.
Spec 기반 동적 템플릿은 컴포넌트 기본 패턴(Selection, Action)을 보충한다.

| 출처               | 커버 영역          | 예시                                           |
| ------------------ | ------------------ | ---------------------------------------------- |
| 정적 템플릿 (18개) | 도메인 시나리오    | form-submit-api, nav-page, data-delete-confirm |
| 동적 템플릿 (Spec) | 컴포넌트 기본 패턴 | ListBox data selection, Table row select       |
| Quick Connect 자동 | 데이터 연동        | onSelectionChange + setState                   |

---

## Part 5: 데이터 흐름 통합 아키텍처

### 5-A. 전체 데이터 흐름

```
                         React Aria Skill References
                         (.agents/skills/react-aria/)
                                    │
                                    ▼
                        COMPONENT_EVENT_SPEC (SSOT)
                         (data/componentEventSpec.ts)
                        ┌───────────┼───────────┐
                        │           │           │
                        ▼           ▼           ▼
              추천 이벤트      기본 스크립트    Quick Connect
              (EventsPanel)  (ThenElseBlock)  (useQuickConnect)
                   │              │               │
                   ▼              ▼               ▼
           ┌──────────────────────────────────────────┐
           │           Event Handlers (Store)          │
           │  ┌─────────────────────────────────────┐  │
           │  │ WHEN: onSelectionChange             │  │
           │  │ THEN: [setState → {key, value}]     │  │
           │  │       [navigate → {path}]           │  │
           │  └─────────────────────────────────────┘  │
           └────────────┬─────────────────┬────────────┘
                        │                 │
                        ▼                 ▼
               Dataset Panel         Preview Runtime
              ┌──────────────┐     ┌──────────────────┐
              │ DataTables   │────▶│ useCollectionData │
              │ Variables    │◀────│ eventExecutor     │
              │ APIs         │     │ conditionEval     │
              │ Transformers │     └──────────────────┘
              └──────────────┘
```

### 5-B. 이벤트 실행 시 데이터 참조

```typescript
// execution/eventExecutor.ts (확장)

/**
 * 이벤트 액션 실행 시 데이터 컨텍스트 주입
 */
interface EventExecutionContext {
  /** 이벤트 대상 요소 */
  element: Element;
  /** 이벤트 페이로드 (React Aria 이벤트 객체) */
  event: unknown;
  /** 데이터 바인딩 컨텍스트 (Quick Connect 연동) */
  dataContext?: {
    /** 바인딩된 DataTable 이름 */
    dataTableName: string;
    /** 현재 로딩된 데이터 */
    data: Record<string, unknown>[];
    /** 스키마 */
    schema: DataField[];
    /** 선택된 아이템 (Collection 컴포넌트) */
    selectedItem?: Record<string, unknown>;
  };
  /** 전역 변수 컨텍스트 */
  variables: Record<string, unknown>;
}
```

### 5-C. 액션 → Dataset 양방향 연동

| 액션               | Dataset 영향                            | 이벤트 트리거               |
| ------------------ | --------------------------------------- | --------------------------- |
| `setState`         | Variable Store 업데이트                 | 바인딩된 UI 컴포넌트 리렌더 |
| `filterCollection` | DataTable 필터 적용                     | Collection 아이템 재렌더    |
| `loadDataTable`    | DataTable 데이터 리로드                 | Consumer 컴포넌트 업데이트  |
| `saveToDataTable`  | DataTable runtimeData 업데이트          | Consumer 컴포넌트 업데이트  |
| `apiCall`          | Response → DataTable/Variable 저장 가능 | 후속 액션 체이닝            |
| `setVariable`      | Variable Store 업데이트                 | 바인딩된 UI 리렌더          |

---

## Part 6: 구현 계획

### Phase 1: COMPONENT_EVENT_SPEC 레지스트리 (기반)

| #   | 항목                         | 파일                            | 작업                                                                   |
| --- | ---------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| 1   | Spec 타입 정의               | `types/eventTypes.ts`           | `EventSpec`, `ComponentEventSpec`, `DefaultAction` 타입 추가           |
| 2   | Spec 레지스트리 생성         | `data/componentEventSpec.ts`    | 신규 — 전체 컴포넌트 Spec 매핑 (Part 1-B 기준)                         |
| 3   | 파생 함수 구현               | `data/componentEventSpec.ts`    | `getRecommendedEventsFromSpec()`, `getRecommendedEventsWithDefaults()` |
| 4   | 기존 함수 대체               | `data/eventCategories.ts`       | `getRecommendedEvents()` → Spec 기반 파생 함수로 위임                  |
| 5   | useRecommendedEvents 훅 연동 | `hooks/useRecommendedEvents.ts` | dataBinding 상태 인자 추가, Spec 기반 추천 반환                        |

### Phase 2: 기본 스크립트 자동 채움

| #   | 항목                          | 파일                                      | 작업                                                   |
| --- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| 1   | 이벤트 추가 시 기본 액션 생성 | `state/useEventHandlers.ts`               | `handleAddEvent`에서 Spec의 `defaultActions` 자동 주입 |
| 2   | THEN 블록 프리뷰              | `blocks/ThenElseBlock.tsx`                | 기본 액션이 있으면 "자동 생성됨" 마커 표시             |
| 3   | 추천 chip 툴팁 확장           | `components/RecommendedEventsSection.tsx` | 기본 스크립트 프리뷰 추가                              |

### Phase 3: Quick Connect + Event 통합 (ADR-013 Phase 3 확장)

| #   | 항목                    | 파일                                         | 작업                                         |
| --- | ----------------------- | -------------------------------------------- | -------------------------------------------- |
| 1   | useQuickConnect 확장    | `hooks/useQuickConnect.ts`                   | `autoGenerateEvents` 옵션 + 이벤트 생성 로직 |
| 2   | QuickConnectButton 확장 | `components/property/QuickConnectButton.tsx` | 이벤트 생성 체크박스 + 프리뷰                |
| 3   | 성공 배너 UI            | `EventsPanel.tsx`                            | Quick Connect 완료 시 안내 배너              |

### Phase 4: Dataset ↔ Events 양방향 연동

| #   | 항목                  | 파일                         | 작업                                                   |
| --- | --------------------- | ---------------------------- | ------------------------------------------------------ |
| 1   | 데이터 소스 삭제 경고 | `blocks/ActionBlock.tsx`     | DataTable/Variable 삭제 시 참조 액션 경고              |
| 2   | 데이터 컨텍스트 주입  | `execution/eventExecutor.ts` | `EventExecutionContext` 확장                           |
| 3   | 동적 템플릿 통합      | `data/eventTemplates.ts`     | `generateSpecTemplates()` + `getIntegratedTemplates()` |

### Phase 5: P1.5 UX 폴리싱 (ADR-010 계승)

| #   | 항목                 | 설명                                       | 우선순위 |
| --- | -------------------- | ------------------------------------------ | -------- |
| 1   | 경고 즉시 수정       | ⚠️ 클릭 → 누락 필드 포커스 이동            | 1순위    |
| 2   | 인라인 액션 추가행   | THEN/ELSE 내부 오버레이 없는 추가          | 2순위    |
| 3   | 최근 사용 액션       | 프로젝트 내 최근 3~5개                     | 3순위    |
| 4   | 데이터 연동 마커     | 📊 아이콘으로 데이터 관련 이벤트/액션 구분 | 2순위    |
| 5   | 접근성 실시간 피드백 | `aria-live` 안내                           | 3순위    |

### Phase 6: AI 생성 (P2, ADR-010 계승 — 장기)

| #   | 항목               | 설명                                        |
| --- | ------------------ | ------------------------------------------- |
| 1   | 의도 기반 생성     | 자연어 → 이벤트+액션+데이터바인딩 초안      |
| 2   | 데이터 스키마 인식 | DataTable 스키마 기반 액션 config 자동 완성 |
| 3   | 시뮬레이션         | Mock 데이터로 이벤트 실행 테스트            |

### 의존 관계

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
(SSOT)    (스크립트)  (통합)    (연동)    (UX)      (AI)
               ↑
        ADR-013 Phase 1~4 (Factory + Quick Connect 기반)
```

**ADR-013 관계**: Phase 3은 ADR-013의 Phase 3(useQuickConnect) 구현을 전제로 한다.
ADR-013의 Phase 1-2(Factory 변경, Empty State)와 Phase 3-A(useQuickConnect 기본)를 먼저 구현한 뒤,
본 ADR의 Phase 3에서 이벤트 자동 생성을 확장하는 순서를 따른다.

---

## Gates

### G1: Spec-코드 정합성 (Phase 1 완료 시)

| 검증                          | 기준                                               |
| ----------------------------- | -------------------------------------------------- |
| COMPONENT_EVENT_SPEC 커버리지 | 모든 COMPONENT_RECOMMENDED_EVENTS 키가 Spec에 존재 |
| React Aria 이벤트 정합성      | Spec의 모든 이벤트가 해당 Skill Ref 문서에 존재    |
| 하위 호환성                   | `getRecommendedEvents()` 반환값이 기존과 동일      |

### G2: Quick Connect 이벤트 생성 (Phase 3 완료 시)

| 검증             | 기준                                                        |
| ---------------- | ----------------------------------------------------------- |
| 이벤트 자동 생성 | 6개 Collection 컴포넌트 Quick Connect 시 이벤트 핸들러 생성 |
| 히스토리 기록    | 자동 생성된 이벤트가 Undo/Redo 스택에 포함                  |
| 기존 경로 보존   | 수동 이벤트 추가/수정 경로 정상 작동                        |
| 성능             | 컴포넌트 선택 → 추천 표시 < 16ms                            |

### G3: Dataset 연동 (Phase 4 완료 시)

| 검증             | 기준                                               |
| ---------------- | -------------------------------------------------- |
| 데이터 삭제 경고 | DataTable 삭제 시 참조 액션에 ⚠️ 표시              |
| 데이터 컨텍스트  | 이벤트 실행 시 바인딩된 DataTable 데이터 접근 가능 |
| 동적 템플릿      | 데이터 바인딩 상태에 따라 템플릿 목록 변경         |

---

## Consequences

### Positive

1. **단일 소스(SSOT)**: React Aria Skill Ref → COMPONENT_EVENT_SPEC → 추천/스크립트/템플릿 자동 파생
2. **Quick Connect 완성**: 데이터 바인딩 + 이벤트 + 기본 액션이 1클릭으로 완성
3. **학습 곡선 감소**: 새 사용자도 Quick Connect만으로 작동하는 인터랙션 확보
4. **확장성**: 새 컴포넌트 추가 시 `COMPONENT_EVENT_SPEC`에 Spec만 추가하면 전체 파이프라인 작동
5. **기존 구현 보존**: P0/P1 추천 chips, 템플릿, 배지, 경고 UI 모두 유지

### Negative

1. **초기 Spec 정의 작업량**: 26+개 컴포넌트의 Event Spec 작성 필요
2. **복잡도 증가**: Quick Connect에 이벤트 생성이 추가되어 롤백 시나리오 복잡화
3. **동적 템플릿 혼재**: 정적 + 동적 템플릿 우선순위 관리 필요

---

## React Aria Skill Reference 매핑

본 ADR의 `COMPONENT_EVENT_SPEC`이 참조하는 React Aria Skill 레퍼런스 목록.
새 컴포넌트 추가 시 해당 Skill Ref를 먼저 확인한 뒤 Spec을 작성한다.

| 컴포넌트          | Skill Reference 경로                                                   | 주요 이벤트                                      |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Button            | `.agents/skills/react-aria/references/components/Button.md`            | onPress, onPressStart, onPressEnd, onFocusChange |
| ToggleButton      | `.agents/skills/react-aria/references/components/ToggleButton.md`      | onChange, onPress                                |
| Link              | `.agents/skills/react-aria/references/components/Link.md`              | onPress                                          |
| TextField         | `.agents/skills/react-aria/references/components/TextField.md`         | onChange, onInput, onFocus, onBlur               |
| SearchField       | `.agents/skills/react-aria/references/components/SearchField.md`       | onChange, onInput, onClear                       |
| NumberField       | `.agents/skills/react-aria/references/components/NumberField.md`       | onChange, onFocus, onBlur                        |
| Checkbox          | `.agents/skills/react-aria/references/components/Checkbox.md`          | onChange                                         |
| CheckboxGroup     | `.agents/skills/react-aria/references/components/CheckboxGroup.md`     | onChange                                         |
| Switch            | `.agents/skills/react-aria/references/components/Switch.md`            | onChange                                         |
| RadioGroup        | `.agents/skills/react-aria/references/components/RadioGroup.md`        | onChange                                         |
| Slider            | `.agents/skills/react-aria/references/components/Slider.md`            | onChange, onChangeEnd                            |
| Select            | `.agents/skills/react-aria/references/components/Select.md`            | onSelectionChange, onOpenChange                  |
| ComboBox          | `.agents/skills/react-aria/references/components/ComboBox.md`          | onSelectionChange, onInputChange, onOpenChange   |
| ListBox           | `.agents/skills/react-aria/references/components/ListBox.md`           | onSelectionChange, onAction                      |
| GridList          | `.agents/skills/react-aria/references/components/GridList.md`          | onSelectionChange, onAction                      |
| Menu              | `.agents/skills/react-aria/references/components/Menu.md`              | onAction, onOpenChange                           |
| TagGroup          | `.agents/skills/react-aria/references/components/TagGroup.md`          | onSelectionChange, onRemove                      |
| Table             | `.agents/skills/react-aria/references/components/Table.md`             | onSelectionChange, onSortChange                  |
| Tree              | `.agents/skills/react-aria/references/components/Tree.md`              | onSelectionChange, onAction, onExpandedChange    |
| Tabs              | `.agents/skills/react-aria/references/components/Tabs.md`              | onSelectionChange                                |
| ToggleButtonGroup | `.agents/skills/react-aria/references/components/ToggleButtonGroup.md` | onSelectionChange                                |
| Form              | `.agents/skills/react-aria/references/components/Form.md`              | onSubmit, onInvalid                              |
| Disclosure        | `.agents/skills/react-aria/references/components/Disclosure.md`        | onExpandedChange                                 |
| DisclosureGroup   | `.agents/skills/react-aria/references/components/DisclosureGroup.md`   | onExpandedChange                                 |
| Calendar          | `.agents/skills/react-aria/references/components/Calendar.md`          | onChange                                         |
| DatePicker        | `.agents/skills/react-aria/references/components/DatePicker.md`        | onChange, onOpenChange                           |
| ColorPicker       | `.agents/skills/react-aria/references/components/ColorPicker.md`       | onChange                                         |

---

## References

- [ADR-010: Events Panel Smart Recommendations](010-events-panel.md)
- [ADR-013: Quick Connect Data Binding](013-quick-connect-data-binding.md)
- [React Aria Skill References](.agents/skills/react-aria/references/components/)
- [React Aria Collections Guide](.agents/skills/react-aria/references/guides/collections.md)
- [React Aria Selection Guide](.agents/skills/react-aria/references/guides/selection.md)
- [React Aria Forms Guide](.agents/skills/react-aria/references/guides/forms.md)
- [XStudio Component Registry](.claude/skills/xstudio-patterns/reference/component-registry.md)
