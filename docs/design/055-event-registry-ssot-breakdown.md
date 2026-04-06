# ADR-055 구현 상세: 이벤트 레지스트리 SSOT 통합

## 핵심 전략: EVENT_REGISTRY 단일 객체

`EventType` = 모든 이벤트(구현+미구현), `ImplementedEventType` = 필터된 서브셋.
현재 빌더 패널의 넓은 `EventType` union과 `EVENT_METADATA`(미구현 포함) 구조를 그대로 수용.

---

## Phase 1: EVENT_REGISTRY 객체 도입 + 기존 파일 re-export

### 변경 파일

| 파일                                                         | 변경 내용                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `apps/builder/src/types/events/events.registry.ts`           | 전면 교체: `IMPLEMENTED_EVENT_TYPES` 배열 → `EVENT_REGISTRY` 객체. `EventType`/`ImplementedEventType`/`EVENT_TYPE_LABELS` 파생 |
| `apps/builder/src/builder/panels/events/types/eventTypes.ts` | `EventType` union 삭제 → registry re-export. `EVENT_TYPE_LABELS` 삭제 → registry re-export                                     |
| `apps/builder/src/types/events/events.types.ts`              | `EVENT_TYPE_LABELS` (Partial 버전) 삭제 → registry re-export                                                                   |

### 상세

1. `events.registry.ts` 전면 교체:

```typescript
interface EventDef {
  label: string;
  category: "mouse" | "form" | "keyboard" | "reactAria" | "other";
  implemented: boolean;
}

export const EVENT_REGISTRY = {
  // Mouse
  onClick: { label: "클릭", category: "mouse", implemented: true },
  onDoubleClick: { label: "더블클릭", category: "mouse", implemented: false },
  onMouseEnter: { label: "마우스 진입", category: "mouse", implemented: true },
  onMouseLeave: { label: "마우스 나감", category: "mouse", implemented: true },
  onMouseDown: { label: "마우스 다운", category: "mouse", implemented: false },
  onMouseUp: { label: "마우스 업", category: "mouse", implemented: false },

  // Form
  onChange: { label: "값 변경", category: "form", implemented: true },
  onInput: { label: "입력", category: "form", implemented: false },
  onSubmit: { label: "제출", category: "form", implemented: true },
  onFocus: { label: "포커스", category: "form", implemented: true },
  onBlur: { label: "포커스 해제", category: "form", implemented: true },

  // Keyboard
  onKeyDown: { label: "키 누름", category: "keyboard", implemented: true },
  onKeyUp: { label: "키 뗌", category: "keyboard", implemented: true },
  onKeyPress: { label: "키 입력", category: "keyboard", implemented: false },

  // React Aria
  onPress: { label: "프레스", category: "reactAria", implemented: true },
  onSelectionChange: {
    label: "선택 변경",
    category: "reactAria",
    implemented: true,
  },
  onAction: { label: "액션", category: "reactAria", implemented: true },
  onOpenChange: {
    label: "열림/닫힘",
    category: "reactAria",
    implemented: true,
  },
  onChangeEnd: {
    label: "값 변경 완료",
    category: "reactAria",
    implemented: true,
  },
  onExpandedChange: {
    label: "펼침/접힘 변경",
    category: "reactAria",
    implemented: true,
  },
  onRemove: { label: "항목 제거", category: "reactAria", implemented: true },

  // Other
  onScroll: { label: "스크롤", category: "other", implemented: false },
  onResize: { label: "크기 변경", category: "other", implemented: false },
  onLoad: { label: "로드", category: "other", implemented: false },
} as const satisfies Record<string, EventDef>;

// ── 파생 타입 ──
export type EventType = keyof typeof EVENT_REGISTRY;

export type ImplementedEventType = {
  [K in EventType]: (typeof EVENT_REGISTRY)[K]["implemented"] extends true
    ? K
    : never;
}[EventType];

// ── 파생 상수 ──
export const IMPLEMENTED_EVENT_TYPES = (
  Object.keys(EVENT_REGISTRY) as EventType[]
).filter((k) => EVENT_REGISTRY[k].implemented) as ImplementedEventType[];

export const EVENT_TYPE_LABELS = Object.fromEntries(
  Object.entries(EVENT_REGISTRY).map(([k, v]) => [k, v.label]),
) as Record<EventType, string>;

// ── 타입 가드 (유지) ──
export function isImplementedEventType(
  eventType: string,
): eventType is ImplementedEventType {
  return (
    eventType in EVENT_REGISTRY &&
    EVENT_REGISTRY[eventType as EventType].implemented
  );
}

// ── 카테고리별 이벤트 목록 파생 ──
export type EventCategoryId = (typeof EVENT_REGISTRY)[EventType]["category"];

export const EVENT_CATEGORIES = {
  /* registry에서 category별 자동 집계 */
};
```

2. `eventTypes.ts`에서 수동 union + labels 삭제 → re-export:

```typescript
// 기존: export type EventType = "onClick" | "onDoubleClick" | ... (수동 나열)
// 변경:
export type {
  EventType,
  ImplementedEventType,
} from "@/types/events/events.registry";
export { EVENT_TYPE_LABELS } from "@/types/events/events.registry";

// 나머지 인터페이스(EventHandler, EventAction, EventCategory 등)는 그대로 유지
```

3. `events.types.ts`에서 별도 `EVENT_TYPE_LABELS` 삭제 → re-export:

```typescript
// 기존: export const EVENT_TYPE_LABELS: Partial<Record<EventType, string>> = { ... }
// 변경:
export { EVENT_TYPE_LABELS } from "./events.registry";
// EventTypePicker.tsx의 import 경로(events.types.ts) 무변경
```

---

## Phase 2: eventCategories.ts Record 계약 강화

### 변경 파일

| 파일                                                             | 변경 내용                                                                                                               |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/builder/src/builder/panels/events/data/eventCategories.ts` | `EVENT_METADATA` 타입을 `Record<EventType, EventMetadata>`로 강화. `EVENT_CATEGORIES` 이벤트 목록을 registry에서 derive |

### 상세

1. `EVENT_METADATA: Record<EventType, EventMetadata>` — `EventType`이 모든 이벤트(구현+미구현)이므로 현재 메타데이터 구조와 자연스럽게 호환. 미구현 이벤트 분리 불필요.

2. `EVENT_CATEGORIES`의 events 배열을 registry `EVENTS_BY_CATEGORY`에서 derive하여 하드코딩 제거.

3. `COMPONENT_RECOMMENDED_EVENTS`는 컴포넌트별 설정이므로 이 파일에 유지. `EventType[]` 타입.

---

## Phase 3: EventsPanel 타입 어서션 제거 (선택)

### 변경 파일

| 파일                                                              | 변경 내용                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/builder/src/builder/panels/events/EventsPanel.tsx`          | `handler.event as EventTrigger['event']` 어서션 제거  |
| `apps/builder/src/builder/panels/events/types/eventBlockTypes.ts` | EventTrigger.event 타입을 registry EventType으로 통일 |

`EventType`이 단일 소스가 되면 `EventHandler.event`와 `EventTrigger.event`가 자연스럽게 호환.

---

## 검증

### 빌드 검증

```bash
pnpm type-check   # Record<EventType, ...> 계약으로 누락 감지 확인
```

### 기능 검증

1. 이벤트 패널에서 기존 이벤트 목록 동일 표시 확인
2. 새 이벤트를 `EVENT_REGISTRY`에만 추가 → `pnpm type-check`에서 `EVENT_METADATA` 누락 에러 확인
3. EventTypePicker UI 동작 확인 (events.types.ts re-export 경로)

### 마이그레이션 체크리스트

- [x] `events.registry.ts`를 `EVENT_REGISTRY` 객체 방식으로 전면 교체 (Phase 1, 4f6ecbe7)
- [x] `eventTypes.ts`에서 `EventType` union 수동 나열 제거 → registry re-export (Phase 1)
- [x] `eventTypes.ts`에서 `EVENT_TYPE_LABELS` 제거 → registry re-export (Phase 1)
- [x] `events.types.ts`에서 `EVENT_TYPE_LABELS` (Partial 버전) 제거 → registry re-export (Phase 1)
- [x] `EVENT_METADATA` 타입 `Record<EventType, EventMetadata>` 이미 적용 (Phase 2, 21e84c11)
- [x] `EVENT_CATEGORIES` 이벤트 목록을 registry `EVENT_CATEGORIES_BY_ID`에서 derive (Phase 2)
- [x] EventsPanel `RegistryEventType` alias + 타입 어서션 + string[] 캐스팅 제거 (Phase 3, 9c9ce7ee)
- [x] `pnpm type-check` 통과
- [ ] 이벤트 패널 UI 동작 확인 (EventTypePicker 포함) — 수동 검증 필요
