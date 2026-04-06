# ADR-055: 이벤트 레지스트리 SSOT 통합

## Status

Proposed — 2026-04-06

## Context

### 문제

이벤트 하나를 추가하려면 현재 **5곳**을 수정해야 한다:

1. `apps/builder/src/builder/panels/events/types/eventTypes.ts` — `EventType` union (수동 나열) + `EVENT_TYPE_LABELS`
2. `apps/builder/src/types/events/events.registry.ts` — `IMPLEMENTED_EVENT_TYPES` as const + `EVENT_CATEGORIES` + 타입 가드
3. `apps/builder/src/types/events/events.types.ts` — `EVENT_TYPE_LABELS` (별도 Partial 버전) + `EVENT_CATEGORIES` — **EventTypePicker가 실제로 참조하는 소스**
4. `apps/builder/src/builder/panels/events/data/eventCategories.ts` — `EVENT_CATEGORIES` (UI 아이콘 포함) + `EVENT_METADATA` + `COMPONENT_RECOMMENDED_EVENTS`
5. `packages/shared/src/components/metadata.ts` — 각 컴포넌트의 `supportedEvents: string[]`

`EVENT_TYPE_LABELS`만 해도 3곳에 별도 정의되어 있다 (`eventTypes.ts`, `events.types.ts`, `eventCategories.ts`의 EVENT_METADATA.label).

### 실제 분산 사례

- `onChangeEnd`/`onExpandedChange`/`onRemove` 추가 시 5파일 동시 수정 필요 — 실제로 `events.types.ts`의 `EVENT_TYPE_LABELS`에는 이 3개가 반영되지 않은 상태 (이벤트 피커 UI에 레이블 미표시 가능성)
- `metadata.ts`의 `supportedEvents`에 `onClose`(Toast), `onSelect`(FileTrigger), `onDrop*`(DropZone), `onReset`/`onInvalid`(Form), `onSortChange`(TableView), `onError`/`onRefresh`(DataTable) 등 registry에 없는 이벤트가 다수 존재

### 현재 타입 불일치 (코드 확인 결과)

`eventTypes.ts`는 미구현 이벤트(`onDoubleClick`, `onScroll`, `onResize`, `onLoad` 등)를 포함한 **넓은** `EventType` union을 독립 정의한다. 반면 `events.registry.ts`는 `IMPLEMENTED_EVENT_TYPES`에서 derive한 **좁은** `EventType`을 별도로 export한다. 이 두 타입이 공존하여 `EventsPanel.tsx`에서 강제 타입 어서션(`handler.event as EventTrigger['event']`)이 필요한 상황이다.

추가로 `events.types.ts`가 **제3의 `EVENT_TYPE_LABELS`**를 독립 정의하고 있으며, `EventTypePicker.tsx`가 이 파일에서 직접 import한다 (`events.types.ts:260`, `EventTypePicker.tsx:22`). 즉 registry를 수정해도 실제 UI에 반영되지 않는 경로가 존재한다.

### Hard Constraints

- **기존 UI 동작 변경 없음**: EventTypePicker, EventsPanel의 이벤트 목록 표시 동작 유지
- **`isImplementedEventType()` 필터링 메커니즘 유지**: `EventsPanel.tsx` 330, 369번 줄 패턴 보존
- **`packages/shared` 독립성**: 빌더 의존 없음 유지 — 이벤트 레지스트리를 shared에 넣을 수 없음
- **`packages/shared`의 `supportedEvents`는 registry보다 넓은 개념**: `onClose`, `onSelect`, `onDrop*`, `onReset`, `onInvalid`, `onError`, `onSortChange`, `onRefresh` 등 registry `IMPLEMENTED_EVENT_TYPES`에 없는 이벤트가 `metadata.ts`에 다수 존재. 이들은 "향후 구현 예정" 또는 "react-aria 자동 처리" 이벤트로, `ImplementedEventType`과 별도 계층(`SupportedEventName`)이 필요
- **`events.types.ts` 소비 경로 포함**: `EventTypePicker.tsx`가 `events.types.ts`의 `EVENT_TYPE_LABELS`/`EVENT_CATEGORIES`를 직접 사용 — 마이그레이션 범위에 반드시 포함
- **TypeScript strict 타입 안전성**: `EventType` union → 반드시 단일 소스에서 derive

### Soft Constraints

- 단계적 마이그레이션 가능 (big bang 아님)
- 기존 컨슈머 import 경로 변경 최소화
- `metadata.ts`의 `supportedEvents`는 컴포넌트 메타데이터의 일부 — 분리 가능하나 함께 있는 게 자연스러울 수 있음

---

## Alternatives Considered

### 대안 A: as const 단일 레지스트리 객체 (Full Merge)

`events.registry.ts`를 유일한 SSOT로 확장한다. 각 이벤트 항목을 객체 레코드로 정의하고, 타입/레이블/카테고리/메타데이터를 모두 한 곳에서 derive한다.

```typescript
// events.registry.ts (확장)
export const EVENT_REGISTRY = {
  onClick: {
    label: "클릭",
    category: "mouse",
    implemented: true,
    usage: "95%",
    compatibleWith: ["Button", "Link", "Card"],
    description: "요소를 클릭했을 때 발생",
    example: "버튼 클릭 → 페이지 이동",
  },
  onDoubleClick: {
    label: "더블클릭",
    category: "mouse",
    implemented: false, // 미구현 이벤트도 같은 레코드에 존재
    usage: "15%",
    compatibleWith: ["Button", "Card"],
    description: "요소를 빠르게 두 번 클릭했을 때 발생",
    example: "카드 더블클릭 → 상세 보기",
  },
  // ... 모든 이벤트
} as const satisfies Record<string, EventDef>;

// Type derives
export type EventType = keyof typeof EVENT_REGISTRY;
export type ImplementedEventType = {
  [K in EventType]: (typeof EVENT_REGISTRY)[K]["implemented"] extends true
    ? K
    : never;
}[EventType];

export const IMPLEMENTED_EVENT_TYPES = (
  Object.keys(EVENT_REGISTRY) as EventType[]
).filter((k) => EVENT_REGISTRY[k].implemented) as ImplementedEventType[];

// 카테고리는 레지스트리에서 자동 집계
export type EventCategory = (typeof EVENT_REGISTRY)[EventType]["category"];
```

장점: 진정한 단일 소스, 새 이벤트 추가 = 레지스트리 1곳만 수정.

단점: `eventCategories.ts`의 `EventCategory` 인터페이스(LucideIcon 포함)를 registry로 끌어와야 하므로 `lucide-react` 의존성이 registry에 추가된다. Registry는 현재 UI 라이브러리 무관 — 의존성 오염.

- 위험: 기술(MEDIUM) / 성능(LOW) / 유지보수(LOW) / 마이그레이션(MEDIUM)
  - 기술(MEDIUM): `satisfies` 연산자 + conditional type derive가 복잡. `EventCategory` 인터페이스(LucideIcon)를 registry에 포함 시 UI 의존성 오염.
  - 마이그레이션(MEDIUM): `eventTypes.ts`의 넓은 union → 좁은 derive로 전환 시 `eventCategories.ts`의 `EVENT_METADATA` 키가 구현된 이벤트만 커버하도록 변경 필요.

### 대안 B: Registry + Metadata 2-Layer 분리 (Figma 패턴)

"구현 레이어"와 "UI 메타데이터 레이어"를 명시적으로 분리한다. Registry는 타입과 구현 여부만, UI 메타데이터(icon, description, usage 등)는 별도 파일에 유지한다. 단 `EventType`은 registry에서만 derive.

```typescript
// Layer 1: events.registry.ts (타입 SSOT — 현재 구조 유지 + 레이블 추가)
export const IMPLEMENTED_EVENT_TYPES = [
  "onClick",
  "onChange",
  // ...
] as const;

export type EventType = (typeof IMPLEMENTED_EVENT_TYPES)[number];

// 레이블을 registry로 통합 (eventTypes.ts의 EVENT_TYPE_LABELS 제거)
export const EVENT_TYPE_LABELS = {
  onClick: "클릭",
  onChange: "값 변경",
  // ...
} as const satisfies Record<EventType, string>;
// ← 컴파일 타임에 IMPLEMENTED_EVENT_TYPES와 완전 일치 보장

// Layer 2: eventCategories.ts (UI 메타데이터 — 변경 최소)
// EventType은 registry에서 import, 메타데이터 객체는 여기에 유지
import type { EventType } from "@/types/events/events.registry";

export const EVENT_METADATA: Record<EventType, EventMetadata> = { ... };
// ← Record<EventType, ...> 이므로 새 이벤트 추가 시 TypeScript가 누락 감지
```

`packages/shared`의 `supportedEvents: string[]`은 유지한다. shared의 이벤트 목록은 registry의 `ImplementedEventType`보다 **넓은 개념**이다 — `onClose`(Toast), `onSelect`(FileTrigger), `onDrop*`(DropZone), `onReset`/`onInvalid`(Form), `onSortChange`(TableView), `onError`/`onRefresh`(DataTable) 등이 포함되어 있으며, 이들은 `IMPLEMENTED_EVENT_TYPES`에 아직 없다. `EventsPanel.tsx`의 `isImplementedEventType()` 필터가 런타임에 이를 걸러내므로, shared 측은 `string[]`로 유지하고 빌더 측에서 필터링하는 현재 패턴이 올바르다.

장점: 최소 변경으로 최대 효과. Registry → 타입 + 레이블 SSOT, UI 레이어는 Record<EventType> 계약으로 컴파일 타임 누락 감지. `eventTypes.ts`의 독립 `EventType` union과 `EVENT_TYPE_LABELS` 제거로 이중 정의 해소.

단점: `eventCategories.ts`는 여전히 별도 파일로 존재 (완전한 1파일 단일화는 아님). `metadata.ts`의 `supportedEvents`는 string[]로 남음 (shared 독립성 제약).

- 위험: 기술(LOW) / 성능(LOW) / 유지보수(LOW) / 마이그레이션(LOW)
  - 기술(LOW): `satisfies` 연산자 사용은 TS 4.9+ 표준. XStudio가 TS 5 사용 중 — 문제없음.
  - 유지보수(LOW): 이벤트 추가 시 registry 1곳 + `EVENT_METADATA` 1곳 (2파일) → 현재 4파일 대비 개선. `Record<EventType>` 계약으로 컴파일 타임 누락 감지.
  - 마이그레이션(LOW): `eventTypes.ts`의 `EventType` union을 registry derive로 교체 + `EVENT_TYPE_LABELS`를 registry로 이동. 기존 컨슈머 import 경로는 `events.types.ts` re-export 레이어를 통해 유지 가능.

### 대안 C: Plugin Registry (확장 가능한 동적 레지스트리)

이벤트 정의를 런타임 등록 방식으로 전환한다. 각 이벤트가 `registerEvent()` 함수로 자기 자신을 등록하고, 레지스트리는 Map으로 관리된다. Storybook의 addon 레지스트리, VS Code의 extension contribution 패턴과 유사.

```typescript
// events.registry.ts
const _registry = new Map<string, EventDefinition>();

export function registerEvent(def: EventDefinition) {
  _registry.set(def.id, def);
}

export function getEventType(): string[] {
  return Array.from(_registry.keys());
}

// mouse-events.ts
registerEvent({ id: "onClick", label: "클릭", category: "mouse", ... });
registerEvent({ id: "onDoubleClick", label: "더블클릭", category: "mouse", ... });
```

장점: 새 이벤트 = 새 파일 1개만 추가. 트리 쉐이킹 친화적. 플러그인 확장 가능.

단점: `EventType`이 `string`으로 퇴화 — TypeScript union 타입 안전성 소실. 타입 가드 `isImplementedEventType()`이 런타임 Map 조회로 변경되어 타입 체계 약화. 현재 `metadata.ts`의 `supportedEvents: string[]` 확장이지 TypeScript 타입 강화가 아님. Hard Constraint (TypeScript strict 타입 안전성) 위반.

- 위험: 기술(HIGH) / 성능(LOW) / 유지보수(MEDIUM) / 마이그레이션(HIGH)
  - 기술(HIGH): TypeScript union 타입 안전성 소실 → Hard Constraint 위반.
  - 마이그레이션(HIGH): 기존 모든 `EventType` 타입 참조를 string으로 교체 또는 제거 필요.

### Risk Threshold Check

| 대안               | 기술     | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ------------------ | -------- | ---- | -------- | ------------ | ---------- |
| A: Full Merge      | MEDIUM   | LOW  | LOW      | MEDIUM       | 0          |
| B: 2-Layer 분리    | LOW      | LOW  | LOW      | LOW          | 0          |
| C: Plugin Registry | **HIGH** | LOW  | MEDIUM   | **HIGH**     | 2          |

**루프 판정**: 대안 C가 CRITICAL은 없으나 HIGH 2개 (TypeScript 타입 안전성 소실 = Hard Constraint 위반). 대안 C 제외. 나머지 대안 A, B는 모두 HIGH 없음 → 추가 대안 불필요. Step 5로 진행.

---

## Decision

**대안 B: Registry + Metadata 2-Layer 분리**를 채택한다.

### 선택 근거 (위험 수용 근거)

대안 B의 잔존 위험이 모두 LOW인 이유:

1. **기술 LOW**: `satisfies` 연산자는 TS 4.9+ 표준 기능. XStudio는 TS 5를 사용한다. `Record<EventType, EventMetadata>` 계약이 컴파일 타임에 새 이벤트 추가 시 `EVENT_METADATA` 누락을 감지해준다.

2. **마이그레이션 LOW**: 변경 범위가 명확히 제한된다.
   - `eventTypes.ts`에서 `EventType` union 제거 → registry derived type re-export로 교체
   - `EVENT_TYPE_LABELS`를 registry로 이동
   - `events.types.ts` re-export 레이어 유지 → 기존 컨슈머 import 경로 무변경
   - `eventCategories.ts`는 `Record<EventType, ...>` 계약만 추가 — 내용 변경 없음

3. **유지보수 LOW**: 이벤트 추가 시 수정 파일 5개 → 2개 (registry + eventCategories). TypeScript가 `EVENT_METADATA`와 `EVENT_TYPE_LABELS` 누락을 컴파일 타임에 강제. `events.types.ts`의 별도 `EVENT_TYPE_LABELS`는 registry re-export로 교체하여 제거.

### 기각된 대안 기각 사유

**대안 A (Full Merge) 기각**: `EventCategory` 인터페이스가 `LucideIcon`을 포함한다. registry에 UI 라이브러리 의존성을 끌어오면 registry의 역할이 "타입/구현 진실 공급원"에서 "UI 설정 파일"로 오염된다. 현재 `events.registry.ts`는 builder의 특정 UI 라이브러리에 무관한 순수 타입 레이어다 — 이 특성을 보존해야 한다.

**대안 C (Plugin Registry) 기각**: `EventType`이 `string`으로 퇴화하여 TypeScript union 타입 안전성이 소실된다. Hard Constraint인 "TypeScript strict 타입 안전성 유지"를 직접 위반한다.

### 구체적 구현 구조

**Phase 1: Registry에 레이블 통합 (eventTypes.ts + events.types.ts 이중/삼중 정의 해소)**

```typescript
// apps/builder/src/types/events/events.registry.ts에 추가

// EVENT_TYPE_LABELS를 registry로 이동
// satisfies: IMPLEMENTED_EVENT_TYPES의 모든 항목을 커버해야 컴파일 통과
export const EVENT_TYPE_LABELS = {
  onClick: "클릭",
  onMouseEnter: "마우스 진입",
  onMouseLeave: "마우스 나감",
  onChange: "값 변경",
  onSubmit: "제출",
  onFocus: "포커스",
  onBlur: "포커스 해제",
  onKeyDown: "키 누름",
  onKeyUp: "키 뗌",
  onPress: "프레스",
  onSelectionChange: "선택 변경",
  onAction: "액션",
  onOpenChange: "열림/닫힘",
  onChangeEnd: "값 변경 완료",
  onExpandedChange: "펼침/접힘 변경",
  onRemove: "항목 제거",
} as const satisfies Record<EventType, string>;
// ← IMPLEMENTED_EVENT_TYPES에서 derive된 EventType과 키가 불일치하면 컴파일 에러
```

```typescript
// apps/builder/src/builder/panels/events/types/eventTypes.ts에서 제거
// - EventType union 수동 나열 삭제
// - EVENT_TYPE_LABELS 삭제
// + registry에서 re-export로 교체
export type { EventType } from "@/types/events/events.registry";
export { EVENT_TYPE_LABELS } from "@/types/events/events.registry";
```

```typescript
// apps/builder/src/types/events/events.types.ts에서 제거
// - EVENT_TYPE_LABELS (Partial 버전) 삭제 → registry re-export
// - EventTypePicker.tsx는 import 경로 유지 (events.types.ts가 re-export)
export { EVENT_TYPE_LABELS } from "./events.registry";
```

**Phase 2: eventCategories.ts에 Record 계약 추가**

```typescript
// apps/builder/src/builder/panels/events/data/eventCategories.ts
import type { EventType } from "@/types/events/events.registry";

// Record<EventType, ...>로 변경 — 새 이벤트 추가 시 누락되면 컴파일 에러
export const EVENT_METADATA: Record<EventType, EventMetadata> = {
  onClick: { ... },
  // 이 객체의 키 집합 = IMPLEMENTED_EVENT_TYPES 집합과 정확히 일치해야 함
};
```

현재 `EVENT_METADATA`는 미구현 이벤트(`onDoubleClick`, `onScroll` 등)의 메타데이터도 포함한다. Phase 2에서 미구현 이벤트의 메타데이터를 `PLANNED_EVENT_METADATA`로 분리하거나 조건부로 처리한다.

**Phase 3: EventsPanel 타입 어서션 제거 (선택)**

`eventTypes.ts`의 `EventType`이 registry derived type으로 교체되면 `EventHandler.event`와 `RegistryEventType`이 동일 타입이 된다. `handler.event as EventTrigger['event']` 강제 어서션이 불필요해진다.

> 구현 상세: [055-event-registry-ssot-breakdown.md](../design/055-event-registry-ssot-breakdown.md)

---

## Gates

잔존 HIGH 위험 없음.

현재 `EVENT_METADATA`가 미구현 이벤트를 포함하는 문제는 `satisfies Record<EventType, ...>` 계약 추가 시 컴파일 에러로 즉시 드러난다. 이것은 위험이 아니라 **의도된 컴파일 타임 감지** — 마이그레이션 시 수동으로 해결한다.

---

## Consequences

### Positive

- 이벤트 추가 시 수정 파일: **5개 → 2개** (registry + eventCategories). `events.types.ts`/`eventTypes.ts`의 별도 레이블/유니온 제거
- `satisfies Record<EventType, string>` 계약으로 레이블 누락을 컴파일 타임에 감지
- `satisfies Record<EventType, EventMetadata>` 계약으로 메타데이터 누락을 컴파일 타임에 감지
- `EventType`이 단일 소스(registry derived)에서 나오므로 두 타입 간 강제 어서션 제거 가능
- Registry의 UI 라이브러리 무관성(LucideIcon 비의존) 유지

### Negative

- `eventTypes.ts`의 `EventType` union이 registry re-export로 교체되면, 미구현 이벤트 타입(`onDoubleClick`, `onScroll` 등)을 참조하는 코드가 있으면 컴파일 에러 발생 (의도된 결과이나 마이그레이션 시 주의)
- `packages/shared`의 `supportedEvents: string[]`은 shared 독립성 제약과 함께, registry `ImplementedEventType`보다 넓은 이벤트 명세(`onClose`, `onSelect`, `onDrop*`, `onReset`, `onInvalid`, `onError`, `onSortChange`, `onRefresh` 등)를 포함하므로 `EventType[]` 강타입화 불가 — 런타임 `isImplementedEventType()` 필터링 패턴은 유지 필요
- `EVENT_METADATA`가 현재 미구현 이벤트를 포함하므로, `Record<EventType, EventMetadata>` 계약 적용 시 미구현 이벤트 메타데이터를 `PLANNED_EVENT_METADATA`로 분리하는 추가 작업 필요
