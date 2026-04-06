# ADR-055 구현 상세: 이벤트 레지스트리 SSOT 통합

## Phase 1: Registry에 레이블 통합 (eventTypes.ts + events.types.ts 삼중 정의 해소)

### 변경 파일

| 파일                                                         | 변경 내용                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `apps/builder/src/types/events/events.registry.ts`           | `EVENT_TYPE_LABELS` 추가 (`satisfies Record<EventType, string>`)                               |
| `apps/builder/src/builder/panels/events/types/eventTypes.ts` | `EventType` union 삭제 → registry re-export. `EVENT_TYPE_LABELS` 삭제 → registry re-export     |
| `apps/builder/src/types/events/events.types.ts`              | `EVENT_TYPE_LABELS` (Partial 버전) 삭제 → registry re-export. EventTypePicker import 경로 유지 |

### 상세

1. `events.registry.ts`에 `EVENT_TYPE_LABELS` 객체 추가:

   ```typescript
   export const EVENT_TYPE_LABELS = {
     onClick: "클릭",
     onMouseEnter: "마우스 진입",
     // ... IMPLEMENTED_EVENT_TYPES의 모든 항목
   } as const satisfies Record<EventType, string>;
   ```

2. `eventTypes.ts`에서 수동 `EventType` union 삭제 → registry re-export:

   ```typescript
   export type { EventType } from "@/types/events/events.registry";
   export { EVENT_TYPE_LABELS } from "@/types/events/events.registry";
   ```

3. `eventTypes.ts`의 나머지 타입(`EventHandler`, `EventAction`, `EventCategory` 인터페이스 등)은 그대로 유지

### 미구현 이벤트 처리

현재 `eventTypes.ts`의 `EventType` union은 미구현 이벤트(`onDoubleClick`, `onMouseDown`, `onMouseUp`, `onInput`, `onKeyPress`, `onScroll`, `onResize`, `onLoad`)를 포함한다. Registry의 `EventType`은 `IMPLEMENTED_EVENT_TYPES`에서 derive되므로 미구현 이벤트가 빠진다.

**처리 방안**: `IMPLEMENTED_EVENT_TYPES`를 `ALL_EVENT_TYPES`로 확장하거나, `implemented` 필드를 별도 객체로 관리. ADR 본문의 Phase 1 코드 예시에서 `IMPLEMENTED_EVENT_TYPES`와 별도로 `ALL_EVENT_TYPES`를 두는 방식 채택:

```typescript
// 모든 이벤트 (구현 + 미구현)
export const ALL_EVENT_TYPES = [
  ...IMPLEMENTED_EVENT_TYPES,
  ...PLANNED_EVENT_TYPES,
] as const;
export type EventType = (typeof ALL_EVENT_TYPES)[number];

// 구현된 이벤트만
export const PLANNED_EVENT_TYPES = [
  "onDoubleClick",
  "onMouseDown",
  "onMouseUp",
  "onInput",
  "onKeyPress",
  "onScroll",
  "onResize",
  "onLoad",
] as const;
```

또는 단일 객체 방식:

```typescript
export const EVENT_REGISTRY = {
  onClick: { label: "클릭", implemented: true },
  onDoubleClick: { label: "더블클릭", implemented: false },
  // ...
} as const;

export type EventType = keyof typeof EVENT_REGISTRY;
export type ImplementedEventType = /* conditional filter */;
```

**결정**: Phase 1에서는 단순 배열 방식 유지 (현재 구조와 동일). 단일 객체 방식은 Phase 2 이후 고려.

---

## Phase 2: eventCategories.ts에 Record 계약 추가

### 변경 파일

| 파일                                                             | 변경 내용                                                                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `apps/builder/src/builder/panels/events/data/eventCategories.ts` | `EVENT_METADATA` 타입을 `Record<EventType, EventMetadata>`로 강화. `EVENT_CATEGORIES` 이벤트 목록 중복 제거 → registry에서 derive |

### 상세

1. `EVENT_METADATA` 키 타입 강화:

   ```typescript
   import type { EventType } from "@/types/events/events.registry";

   export const EVENT_METADATA: Record<EventType, EventMetadata> = {
     onClick: { ... },
     // EventType에 있는 모든 키가 여기 있어야 컴파일 통과
   };
   ```

2. 미구현 이벤트 메타데이터 분리:

   ```typescript
   // 미구현 이벤트는 별도 객체
   export const PLANNED_EVENT_METADATA: Partial<Record<string, EventMetadata>> = {
     onDoubleClick: { ... },
     onScroll: { ... },
   };
   ```

3. `EVENT_CATEGORIES.reactAria.events` 등의 하드코딩 제거 → registry `EVENT_CATEGORIES`에서 import하거나, registry의 카테고리 필드에서 자동 집계

### COMPONENT_RECOMMENDED_EVENTS 유지

이 객체는 컴포넌트별 추천 이벤트이므로 eventCategories.ts에 유지. `EventType[]` 타입으로 타입 안전성 확보 (현재도 동일).

---

## Phase 3: EventsPanel 타입 어서션 제거 (선택)

### 변경 파일

| 파일                                                              | 변경 내용                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/builder/src/builder/panels/events/EventsPanel.tsx`          | `handler.event as EventTrigger['event']` 어서션 제거  |
| `apps/builder/src/builder/panels/events/types/eventBlockTypes.ts` | EventTrigger.event 타입을 registry EventType으로 통일 |

### 상세

`eventTypes.ts`의 `EventType`과 `events.registry.ts`의 `EventType`이 동일 소스가 되면, `EventHandler.event`와 `EventTrigger.event`가 자연스럽게 호환. 강제 어서션 불필요.

---

## 검증

### 빌드 검증

```bash
pnpm type-check   # Record<EventType, ...> 계약으로 누락 감지 확인
```

### 기능 검증

1. 이벤트 패널에서 기존 이벤트 목록 동일 표시 확인
2. 새 이벤트 추가 시 registry만 수정 → `pnpm type-check`에서 `EVENT_METADATA` 누락 에러 확인
3. EventTypePicker UI 동작 확인

### 마이그레이션 체크리스트

- [ ] `eventTypes.ts`에서 `EventType` union 수동 나열 제거
- [ ] `eventTypes.ts`에서 `EVENT_TYPE_LABELS` 제거
- [ ] `events.types.ts`에서 `EVENT_TYPE_LABELS` (Partial 버전) 제거
- [ ] `events.registry.ts`에 `EVENT_TYPE_LABELS` 추가 (satisfies 계약)
- [ ] `eventTypes.ts`에 registry re-export 추가
- [ ] `events.types.ts`에 registry re-export 추가 (EventTypePicker import 경로 유지)
- [ ] 미구현 이벤트 메타데이터 `PLANNED_EVENT_METADATA`로 분리
- [ ] `EVENT_METADATA` 타입을 `Record<EventType, EventMetadata>`로 강화
- [ ] EventsPanel 타입 어서션 제거 (optional)
- [ ] `pnpm type-check` 통과
- [ ] 이벤트 패널 UI 동작 확인
