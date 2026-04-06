# ADR-055: 이벤트 레지스트리 SSOT 통합

## Status

Implemented — 2026-04-06

## Context

### 문제: 이벤트 정의의 정본(canonical source)이 없다

이벤트 하나를 추가할 때 수정 지점이 5곳에 분산되어 있지만, 이들은 성격이 다르다:

**이벤트 정의 (정본이 필요한 영역):**

1. `eventTypes.ts` — `EventType` union (수동 나열) + `EVENT_TYPE_LABELS`
2. `events.registry.ts` — `IMPLEMENTED_EVENT_TYPES` as const + `EVENT_CATEGORIES` + 타입 가드
3. `events.types.ts` — `EVENT_TYPE_LABELS` (별도 Partial 버전) — **EventTypePicker가 실제 참조하는 소스**

**컴포넌트 연결 (정본에서 파생되어야 하는 영역):** 4. `eventCategories.ts` — `EVENT_METADATA` + `COMPONENT_RECOMMENDED_EVENTS` (추천 정책) 5. `metadata.ts` — 컴포넌트별 `supportedEvents: string[]` (컴포넌트 연결)

핵심 문제는 1~3이 각각 독립적으로 이벤트를 정의하고 있어 **정본이 없다**는 것이다. `EVENT_TYPE_LABELS`만 해도 3곳에 별도 정의되어 있다. 4~5는 정본이 확립되면 자연스럽게 정본을 기반으로 유지/검증할 수 있다.

### 실제 분산 사례

- `onChangeEnd`/`onExpandedChange`/`onRemove` 추가 시 정의 3곳 + 연결 2곳 동시 수정 필요 — 실제로 `events.types.ts`의 `EVENT_TYPE_LABELS`에는 이 3개가 반영되지 않은 상태
- `eventTypes.ts`의 넓은 `EventType` union과 `events.registry.ts`의 좁은 `EventType`이 공존하여 `EventsPanel.tsx`에서 강제 타입 어서션 필요

### Hard Constraints

1. **TypeScript strict 타입 안전성**: `EventType` union → 반드시 단일 정본에서 derive
2. **기존 소비처 동작 변경 없음**: EventTypePicker, EventsPanel 등 소비처의 이벤트 목록 표시 동작 유지
3. **`packages/shared` 독립성**: 빌더 의존 없음 유지 — 정본 레지스트리는 shared에 넣을 수 없음
4. **shared `supportedEvents`는 정본보다 넓은 계층**: `onClose`, `onSelect`, `onDrop*`, `onReset`, `onInvalid`, `onError`, `onSortChange`, `onRefresh` 등 정본 레지스트리에 없는 이벤트가 `metadata.ts`에 다수 존재 — 정본의 `EventType`으로 강타입화 불가
5. **모든 소비 경로 포함**: `EventTypePicker.tsx`가 `events.types.ts`를 직접 참조 — 이 경로도 정본에서 파생되어야 함

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

### 대안 B: implemented 플래그 레지스트리 + Metadata 2-Layer (Figma 패턴)

"정의 레이어"와 "UI 메타데이터 레이어"를 명시적으로 분리한다. 핵심: **`EventType` = 모든 이벤트 (구현+미구현)**, `ImplementedEventType` = 필터된 서브셋. 현재 빌더 패널의 `EventType`이 미구현 이벤트까지 포함하는 구조를 그대로 수용한다.

```typescript
// Layer 1: events.registry.ts (타입 SSOT — implemented 플래그 기반)
export const EVENT_REGISTRY = {
  // 구현됨
  onClick:           { label: "클릭",           category: "mouse",     implemented: true },
  onMouseEnter:      { label: "마우스 진입",    category: "mouse",     implemented: true },
  onChange:           { label: "값 변경",        category: "form",      implemented: true },
  onPress:           { label: "프레스",          category: "reactAria", implemented: true },
  // ... 구현된 이벤트

  // 미구현 (현재 eventTypes.ts의 넓은 union에 포함된 항목)
  onDoubleClick:     { label: "더블클릭",        category: "mouse",     implemented: false },
  onScroll:          { label: "스크롤",          category: "other",     implemented: false },
  onLoad:            { label: "로드",            category: "other",     implemented: false },
  // ...
} as const satisfies Record<string, EventDef>;

// 모든 이벤트 타입 (현재 eventTypes.ts의 넓은 union 대체)
export type EventType = keyof typeof EVENT_REGISTRY;

// 구현된 이벤트만 (런타임 whitelist)
export type ImplementedEventType = {
  [K in EventType]: (typeof EVENT_REGISTRY)[K]["implemented"] extends true ? K : never;
}[EventType];

export const IMPLEMENTED_EVENT_TYPES = (Object.keys(EVENT_REGISTRY) as EventType[])
  .filter((k) => EVENT_REGISTRY[k].implemented) as ImplementedEventType[];

// 레이블은 레지스트리에서 파생 (별도 선언 불필요)
export const EVENT_TYPE_LABELS = Object.fromEntries(
  Object.entries(EVENT_REGISTRY).map(([k, v]) => [k, v.label])
) as Record<EventType, string>;

// Layer 2: eventCategories.ts (UI 메타데이터 — 변경 최소)
// EventType은 registry에서 import, 메타데이터 객체는 여기에 유지
import type { EventType } from "@/types/events/events.registry";

// Record<EventType>으로 모든 이벤트(구현+미구현) 커버 — 현재 구조와 동일
export const EVENT_METADATA: Record<EventType, EventMetadata> = { ... };
```

**이벤트 타입 3계층 정리:**

| 계층                   | 타입                   | 범위                                            | 소스                          |
| ---------------------- | ---------------------- | ----------------------------------------------- | ----------------------------- |
| `EventType`            | 모든 알려진 이벤트     | 구현 + 미구현 (onClick~onLoad)                  | `EVENT_REGISTRY` keys         |
| `ImplementedEventType` | 구현 완료 이벤트       | EventsPanel에서 실제 사용 가능                  | `implemented: true` 필터      |
| `string` (shared)      | 컴포넌트별 이벤트 명세 | 위 두 계층보다 넓음 (onClose, onDrop\* 등 포함) | `metadata.ts` supportedEvents |

`packages/shared`의 `supportedEvents: string[]`은 유지한다. shared의 이벤트 목록은 `EventType`보다도 **넓은 개념**이다 — `onClose`(Toast), `onSelect`(FileTrigger), `onDrop*`(DropZone), `onReset`/`onInvalid`(Form), `onSortChange`(TableView), `onError`/`onRefresh`(DataTable) 등이 포함되어 있으며, 이들은 `EVENT_REGISTRY`에도 없을 수 있다. `EventsPanel.tsx`의 `isImplementedEventType()` 필터가 런타임에 이를 걸러내므로, shared 측은 `string[]`로 유지하고 빌더 측에서 필터링하는 현재 패턴이 올바르다.

장점: 현재 빌더 패널의 `EventType`(미구현 포함) 구조를 그대로 수용하면서 단일 소스화. `eventTypes.ts`/`events.types.ts`의 독립 정의를 모두 제거. `implemented` 플래그로 구현/미구현 구분이 레지스트리 내에서 완결.

단점: `eventCategories.ts`는 여전히 별도 파일로 존재 (UI 아이콘 분리). `metadata.ts`의 `supportedEvents`는 string[]로 남음 (shared 독립성 + 더 넓은 이벤트 명세 계층).

- 위험: 기술(LOW) / 성능(LOW) / 유지보수(LOW) / 마이그레이션(LOW)
  - 기술(LOW): `satisfies` + conditional type은 TS 4.9+ 표준. XStudio가 TS 5 사용 중 — 문제없음.
  - 유지보수(LOW): 정본 이벤트 정의 추가는 registry 1곳만 수정. 컴포넌트 연결은 metadata.ts + eventCategories.ts에서 추가 수정 필요하지만, `Record<EventType>` 계약이 누락을 컴파일 타임에 감지.
  - 마이그레이션(LOW): `eventTypes.ts`의 수동 union을 registry re-export로 교체. `events.types.ts`의 `EVENT_TYPE_LABELS`도 re-export로 교체. 기존 컨슈머 import 경로는 re-export 레이어로 유지.

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

**대안 B: implemented 플래그 레지스트리 + Metadata 2-Layer 분리**를 채택한다.

### 정본화 전략 (확정)

`EVENT_REGISTRY`를 이벤트 정의의 **유일한 정본**으로 둔다.

**정본 (`EVENT_REGISTRY`):**

- 이벤트 정의 = label + category + implemented 플래그
- 새 이벤트 추가 시 **이 1곳만** 수정

**1차 파생물 (정본에서 자동 derive):**

- `EventType` = `keyof typeof EVENT_REGISTRY` (모든 이벤트)
- `ImplementedEventType` = conditional filter (구현된 이벤트만)
- `EVENT_TYPE_LABELS` = registry label 필드에서 derive
- `EVENT_CATEGORIES` = registry category 필드에서 집계

**2차 파생물 (정본을 기반으로 유지되는 컴포넌트 연결 정보):**

- `metadata.ts` `supportedEvents` — 컴포넌트별 이벤트 지원 목록
- `COMPONENT_RECOMMENDED_EVENTS` — 컴포넌트별 추천 이벤트

**소비처 (읽기만):**

- EventsPanel, EventTypePicker 등 — 정본의 파생값을 import하여 사용

2차 파생물은 정본 자체가 아니므로, 컴포넌트에 새 이벤트를 연결할 때 추가 수정이 필요하다. 이는 "이벤트 정의"가 아니라 "컴포넌트 설정"이므로 SSOT 범위 밖이다.

### 선택 근거 (위험 수용 근거)

1. **기술 LOW**: `satisfies` + conditional type은 TS 4.9+ 표준. 정본에서 `EventType`(전체)과 `ImplementedEventType`(서브셋)을 모두 derive하므로 현재 코드의 두 타입 계층을 자연스럽게 수용.

2. **마이그레이션 LOW**: `eventTypes.ts`/`events.types.ts`의 수동 정의를 정본 re-export로 교체. `eventCategories.ts`는 `Record<EventType, ...>` 계약만 추가. 기존 소비처 import 경로는 re-export 레이어로 유지.

3. **유지보수 LOW**: 정본 이벤트 정의 추가 = `EVENT_REGISTRY` 1곳. `Record<EventType>` 계약이 `EVENT_METADATA`/`EVENT_TYPE_LABELS` 누락을 컴파일 타임에 감지.

### 기각된 대안 기각 사유

**대안 A (Full Merge) 기각**: `EventCategory` 인터페이스가 `LucideIcon`을 포함한다. registry에 UI 라이브러리 의존성을 끌어오면 registry의 역할이 "타입/구현 진실 공급원"에서 "UI 설정 파일"로 오염된다. 현재 `events.registry.ts`는 builder의 특정 UI 라이브러리에 무관한 순수 타입 레이어다 — 이 특성을 보존해야 한다.

**대안 C (Plugin Registry) 기각**: `EventType`이 `string`으로 퇴화하여 TypeScript union 타입 안전성이 소실된다. Hard Constraint인 "TypeScript strict 타입 안전성 유지"를 직접 위반한다.

### 구체적 구현 구조

**Phase 1: EVENT_REGISTRY 단일 객체 + 기존 파일 re-export**

```typescript
// apps/builder/src/types/events/events.registry.ts (전면 교체)
export const EVENT_REGISTRY = {
  onClick:          { label: "클릭",           category: "mouse",     implemented: true },
  onDoubleClick:    { label: "더블클릭",       category: "mouse",     implemented: false },
  onMouseEnter:     { label: "마우스 진입",    category: "mouse",     implemented: true },
  onMouseLeave:     { label: "마우스 나감",    category: "mouse",     implemented: true },
  // ... 모든 이벤트 (구현+미구현)
} as const satisfies Record<string, EventDef>;

export type EventType = keyof typeof EVENT_REGISTRY;
export type ImplementedEventType = { /* conditional filter */ }[EventType];

export const IMPLEMENTED_EVENT_TYPES = /* filter implemented: true */;
export const EVENT_TYPE_LABELS = /* derive from registry.label */;
```

```typescript
// eventTypes.ts — 수동 union/labels 삭제, re-export만
export type {
  EventType,
  ImplementedEventType,
} from "@/types/events/events.registry";
export { EVENT_TYPE_LABELS } from "@/types/events/events.registry";
// 나머지 인터페이스(EventHandler, EventAction 등)는 유지
```

```typescript
// events.types.ts — EVENT_TYPE_LABELS 삭제, re-export만
export { EVENT_TYPE_LABELS } from "./events.registry";
// EventTypePicker.tsx의 import 경로 무변경
```

**Phase 2: eventCategories.ts Record 계약 강화**

`EVENT_METADATA: Record<EventType, EventMetadata>` — `EventType`이 모든 이벤트(구현+미구현)이므로 현재 메타데이터 구조와 자연스럽게 호환. 미구현 이벤트 분리 불필요.

**Phase 3: EventsPanel 타입 어서션 제거 (선택)**

`EventType`이 단일 소스가 되면 `handler.event as EventTrigger['event']` 강제 어서션이 불필요해진다.

> 구현 상세: [055-event-registry-ssot-breakdown.md](../design/055-event-registry-ssot-breakdown.md)

---

## Gates

잔존 HIGH 위험 없음.

---

## Consequences

### Positive

- **정본 확립**: 이벤트 정의 추가 = `EVENT_REGISTRY` 1곳만 수정. `EventType`/`ImplementedEventType`/`EVENT_TYPE_LABELS`는 정본에서 자동 derive
- **핵심 이벤트 정의의 수동 union/labels 제거**: `eventTypes.ts`의 `EventType` union과 `events.types.ts`/`eventTypes.ts`의 `EVENT_TYPE_LABELS` 수동 정의 제거. `eventCategories.ts`의 `EVENT_METADATA` 내부 표시용 label/category는 유지 (UI 메타데이터 레이어)
- **컴파일 타임 계약**: `Record<EventType, EventMetadata>` 계약으로 소비처의 누락을 컴파일 타임에 감지
- **타입 어서션 제거**: `EventType`이 단일 정본에서 나오므로 `EventsPanel`의 강제 타입 어서션 불필요
- **UI 의존성 격리**: 정본(registry)은 LucideIcon 등 UI 라이브러리 비의존 유지

### Negative

- **2차 파생물은 수동 유지**: `metadata.ts`(supportedEvents)와 `COMPONENT_RECOMMENDED_EVENTS`는 컴포넌트 연결 정보로서 별도 수정 필요 — 정본화 범위 밖
- **shared 계층 한계**: `packages/shared`의 `supportedEvents: string[]`은 정본 `EventType`보다 넓은 이벤트 명세(`onClose`, `onSelect`, `onDrop*`, `onReset`, `onInvalid`, `onError`, `onSortChange`, `onRefresh` 등)를 포함하므로 강타입화 불가 — 런타임 `isImplementedEventType()` 필터링 패턴 유지
- **registry 전면 교체**: `IMPLEMENTED_EVENT_TYPES` as const 배열 → `EVENT_REGISTRY` 객체로 구조 변경. re-export 레이어로 기존 소비처 import 경로 유지
