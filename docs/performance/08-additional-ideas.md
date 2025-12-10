# 추가 성능 최적화 아이디어

> **작성일**: 2025-12-10
> **작성자**: Antigravity AI
> **리뷰**: 2025-12-10 (코드베이스 검토 반영)

기존 제안(가상화, 워커, 에셋 최적화) 외에 5,000개 요소 환경에서 성능을 극대화할 수 있는 추가 아이디어입니다.

---

## 1. CSS Containment (`content-visibility`) - P0 즉시 적용

### 현황 분석

브라우저는 DOM 요소가 변경될 때마다 전체 레이아웃을 다시 계산(Reflow)하려 합니다. 5,000개 요소가 있는 복잡한 DOM 트리에서는 이 비용이 매우 큽니다.

**현재 상태**: `src/shared/components/styles/ListBox.css`에서 이미 부분적으로 사용 중

```css
.react-aria-ListBoxSection {
  content-visibility: auto;
}
```

### 제안 내용

CSS의 `content-visibility: auto` 속성을 주요 컨테이너에 확대 적용하여, 화면 밖(Off-screen)에 있는 요소의 렌더링 작업을 브라우저가 건너뛰도록 합니다.

### 구현 방안

**파일**: `src/canvas/styles/containment.css` (신규) 또는 기존 컴포넌트 CSS에 추가

```css
/* 주요 컨테이너에 적용 */
.react-aria-Card,
.react-aria-Box,
.react-aria-Flex,
.react-aria-Grid {
  content-visibility: auto;
  contain-intrinsic-size: auto 100px; /* 예상 높이 힌트 */
}

/* 스크롤 영역 최적화 */
[data-scrollable="true"] > * {
  content-visibility: auto;
  contain-intrinsic-size: auto 50px;
}

/* 애니메이션 요소는 제외 */
[data-animated="true"] {
  content-visibility: visible;
}
```

### 기대 효과

- 초기 로딩 속도(LCP) 향상
- 스크롤 성능 개선
- 브라우저 네이티브 최적화 활용

### 브라우저 지원

| 브라우저 | 지원 버전 | 비고          |
| -------- | --------- | ------------- |
| Chrome   | ✅ 85+    | 완전 지원     |
| Firefox  | ✅ 109+   | 완전 지원     |
| Safari   | ✅ 16+    | 완전 지원     |
| Edge     | ✅ 85+    | Chromium 기반 |

### 리스크 및 완화

| 리스크          | 완화 방안                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| 레이아웃 점프   | `contain-intrinsic-size` 값을 실제 요소 높이에 맞게 설정                     |
| 애니메이션 영향 | `will-change` 또는 `data-animated` 요소는 **반드시 제외**                    |
| **실측 필요**   | 단순히 모든 곳에 적용하지 않고, 페인트 비용이 높은 컴포넌트 위주로 선별 적용 |
| 구버전 브라우저 | 점진적 향상 - 미지원 시 무시됨 (기능 손상 없음)                              |

---

## 2. 이벤트 위임 (Event Delegation) - P1 권장

### 보완 사항: 캡처링 및 포인터 이벤트

1.  **이벤트 커버리지**: `click` 외에도 `pointerdown`, `keydown` (onPress 대응) 등 React Aria가 사용하는 저수준 이벤트까지 위임해야 합니다.
2.  **stopPropagation 대응**: 하위 요소에서 이벤트 전파를 막는 경우(`e.stopPropagation()`)를 대비해, **캡처링 단계(useCapture: true)**에서 이벤트를 감지하거나 `composedPath()`를 사용하여 타겟을 추적해야 합니다.

### 현황 분석

**파일**: `src/canvas/utils/eventHandlers.ts`

현재 `createEventHandlerMap`은 각 요소마다 개별적인 이벤트 핸들러(클로저)를 생성하여 부착합니다.

```typescript
// 현재 구조: 요소별로 핸들러 클로저 생성
export const createEventHandlerMap = (element, eventEngine, projectId) => {
  const eventHandlers = {};
  [...new Set(enabledEventTypes)].forEach((eventType) => {
    const handler = createEventHandler(
      element,
      eventType,
      eventEngine,
      projectId
    );
    eventHandlers[eventType] = handler;
  });
  return eventHandlers;
};
```

- **문제**: 5,000개 요소 × 평균 2개 이벤트(onClick, onHover) = **10,000개의 이벤트 리스너**가 브라우저 메모리에 상주합니다. 이는 초기 렌더링 속도를 저하시키고 메모리 누수 위험을 높입니다.

### 제안 내용

Canvas 최상위(Root)에서 단 하나의 이벤트 리스너만 등록하고, `event.target`을 통해 이벤트를 처리하는 **이벤트 위임(Event Delegation)** 패턴으로 변경합니다.

### 구현 방안

**파일**: `src/canvas/utils/delegatedEventHandler.ts` (신규)

```typescript
import { EventEngine } from "../../../utils/events/eventEngine";
import { PreviewElement } from "../types";

export class DelegatedEventHandler {
  private eventEngine: EventEngine;
  private elementsMap: Map<string, PreviewElement>;
  private projectId: string;

  constructor(eventEngine: EventEngine, projectId: string) {
    this.eventEngine = eventEngine;
    this.projectId = projectId;
    this.elementsMap = new Map();
  }

  updateElements(elements: PreviewElement[]) {
    this.elementsMap.clear();
    elements.forEach((el) => this.elementsMap.set(el.id, el));
  }

  // Root에 한 번만 등록 (Capture Phase 활용)
  attachToRoot(root: HTMLElement) {
    root.addEventListener("click", this.handleEvent, { capture: true }); // 캡처링 사용
    root.addEventListener("mouseover", this.handleEvent);
    root.addEventListener("mouseout", this.handleEvent);
    root.addEventListener("focusin", this.handleEvent); // focus는 버블링 안됨
    root.addEventListener("focusout", this.handleEvent); // blur는 버블링 안됨
    root.addEventListener("change", this.handleEvent);
    root.addEventListener("input", this.handleEvent);
  }

  detachFromRoot(root: HTMLElement) {
    root.removeEventListener("click", this.handleEvent);
    root.removeEventListener("mouseover", this.handleEvent);
    root.removeEventListener("mouseout", this.handleEvent);
    root.removeEventListener("focusin", this.handleEvent);
    root.removeEventListener("focusout", this.handleEvent);
    root.removeEventListener("change", this.handleEvent);
    root.removeEventListener("input", this.handleEvent);
  }

  private handleEvent = async (event: Event) => {
    const target = (event.target as HTMLElement).closest("[data-element-id]");
    if (!target) return;

    const elementId = target.getAttribute("data-element-id");
    if (!elementId) return;

    const element = this.elementsMap.get(elementId);
    if (!element) return;

    // 이벤트 타입 매핑
    const eventTypeMap: Record<string, string> = {
      click: "onClick",
      mouseover: "onMouseEnter",
      mouseout: "onMouseLeave",
      focusin: "onFocus",
      focusout: "onBlur",
      change: "onChange",
      input: "onInput",
    };

    const eventType = eventTypeMap[event.type];
    if (!eventType) return;

    // 기존 EventEngine 활용
    const elementEvents =
      (element.props.events as unknown as Array<Record<string, unknown>>) || [];
    const matchingEvents = elementEvents.filter((e) => {
      const type = e.event_type || e.event;
      const enabled = e.enabled !== false;
      return type === eventType && enabled;
    });

    if (matchingEvents.length === 0) return;

    const context = {
      event,
      element: event.target as HTMLElement,
      elementId: element.id,
      pageId: element.page_id || "",
      projectId: this.projectId,
      state: this.eventEngine.getState(),
    };

    for (const elementEvent of matchingEvents) {
      try {
        await this.eventEngine.executeEvent(
          elementEvent as Record<string, unknown>,
          context
        );
      } catch (error) {
        console.error("이벤트 실행 오류:", error);
      }
    }
  };
}
```

### 기대 효과

- 리스너 수 10,000개 → **10개 내외**로 감소
- 메모리 사용량 대폭 절감
- 초기 렌더링 속도 향상

### 리스크 및 완화

| 리스크                    | 완화 방안                                           |
| ------------------------- | --------------------------------------------------- |
| React Aria `onPress` 호환 | `onPress`는 내부적으로 `click` 사용하므로 위임 가능 |
| `stopPropagation()` 호출  | 기존 컴포넌트 중 버블링 차단하는 것 확인 필요       |
| focus/blur 버블링         | `focusin`/`focusout` 사용 (버블링됨)                |
| 동적 요소 추가            | `updateElements()` 호출로 Map 갱신                  |

---

## 3. 선택(Selection) 렌더링 분리 - P2 추후

### 보완 사항: rAF 단일 플러시 & 가시성 최적화

1.  **rAF Batch**: 여러 요소가 동시에 선택되거나 이동할 때, `requestAnimationFrame`으로 위치 업데이트를 **단 한 번의 페인트**로 병합해야 합니다.
2.  **Observation 최적화**: 화면 밖(Off-screen)에 있는 선택된 요소는 `ResizeObserver` 로직을 일시 중지하여 연산 비용을 아껴야 합니다.

### 현황 분석

**Builder 측**: ✅ **이미 구현됨**

`src/builder/overlay/index.tsx`에서 `SelectionOverlay` 컴포넌트가 별도 레이어로 선택 테두리를 그립니다.

```typescript
// Builder - 이미 Overlay 패턴 적용됨
export default function SelectionOverlay() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectedElementIds = useStore(
    (state) => state.selectedElementIds || []
  );

  // iframe 내 요소 위치를 계산하여 Overlay 렌더링
  const updatePosition = useCallback(
    (immediate = false) => {
      const element = iframe.contentDocument.querySelector(
        `[data-element-id="${selectedElementId}"]`
      );
      // rect 계산 후 Overlay 그리기...
    },
    [selectedElementId]
  );
}
```

**Canvas/Preview 측**: ⚠️ **개선 필요**

`src/canvas/renderers/` 파일들에서 `isSelected` props가 각 요소에 전달되어 리렌더링 발생:

```typescript
// LayoutRenderers.tsx:195 - 현재 상태
isSelected={Boolean(element.props.isSelected)}
```

요소를 선택할 때마다 해당 요소의 `isSelected` props가 변경되어 리렌더링이 발생합니다. 다중 선택(Multi-select) 시 수백 개의 컴포넌트가 동시에 리렌더링될 수 있습니다.

### 현재 아키텍처

```
Builder (✅ 완료)                 Canvas/Preview (⚠️ 개선 필요)
┌─────────────────────┐          ┌─────────────────────┐
│  SelectionOverlay   │          │  각 요소에 isSelected │
│  (이미 분리됨)       │          │  props 전달 중       │
│                     │          │                     │
│  ┌───────────────┐  │          │  ┌───────────────┐  │
│  │  iframe       │  │          │  │ Component     │  │
│  │               │  │          │  │ isSelected={} │  │
│  │               │  │          │  │ → 리렌더링!   │  │
│  └───────────────┘  │          │  └───────────────┘  │
│  Overlay Layer ────►│          │                     │
└─────────────────────┘          └─────────────────────┘
```

### 제안 내용

Canvas/Preview 측에서도 선택 상태를 요소의 props가 아닌, 별도의 **Overlay Layer**에서 처리합니다.

### 구현 방안

**파일**: `src/canvas/components/PreviewSelectionOverlay.tsx` (신규)

```typescript
import { useState, useEffect, useCallback } from "react";
import { useRuntimeStore } from "../store/runtimeStore";

export function PreviewSelectionOverlay() {
  const selectedIds = useRuntimeStore(
    (state) => state.previewSelectedIds || []
  );
  const [rects, setRects] = useState<Map<string, DOMRect>>(new Map());

  const updateRects = useCallback(() => {
    const newRects = new Map<string, DOMRect>();
    selectedIds.forEach((id) => {
      const el = document.querySelector(`[data-element-id="${id}"]`);
      if (el) {
        newRects.set(id, el.getBoundingClientRect());
      }
    });
    setRects(newRects);
  }, [selectedIds]);

  useEffect(() => {
    updateRects();

    // 스크롤/리사이즈 시 위치 갱신
    window.addEventListener("scroll", updateRects, true);
    window.addEventListener("resize", updateRects);

    // ResizeObserver로 요소 크기 변경 감지
    const observer = new ResizeObserver(updateRects);
    selectedIds.forEach((id) => {
      const el = document.querySelector(`[data-element-id="${id}"]`);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", updateRects, true);
      window.removeEventListener("resize", updateRects);
      observer.disconnect();
    };
  }, [selectedIds, updateRects]);

  if (rects.size === 0) return null;

  return (
    <div
      className="preview-selection-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {Array.from(rects.entries()).map(([id, rect]) => (
        <div
          key={id}
          className="selection-border"
          style={{
            position: "absolute",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            border: "2px solid var(--color-primary-500)",
            borderRadius: "2px",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
```

**파일**: `src/canvas/App.tsx` 수정

```typescript
import { PreviewSelectionOverlay } from "./components/PreviewSelectionOverlay";

export default function App() {
  return (
    <>
      {/* 기존 렌더링 로직 */}
      <PreviewSelectionOverlay />
    </>
  );
}
```

**파일**: 각 Renderer에서 `isSelected` 제거

```typescript
// Before
isSelected={Boolean(element.props.isSelected)}

// After
// isSelected 제거 - Overlay에서 처리
```

### 기대 효과

- 선택 시 **0개의 요소 리렌더링**
- 오직 Overlay만 갱신되므로 즉각적인 반응성 확보
- Figma/VSCode와 동일한 방식

### 리스크 및 완화

| 리스크                 | 완화 방안                                      |
| ---------------------- | ---------------------------------------------- |
| 스크롤/리사이즈 동기화 | `ResizeObserver` + `scroll` 이벤트 (capture)   |
| z-index 관리           | Overlay를 항상 최상위에 유지 (`z-index: 9999`) |
| 포커스 링 처리         | CSS `:focus-visible`은 별도 유지               |
| 애니메이션 요소        | `requestAnimationFrame`으로 위치 갱신          |

---

## 요약

| 아이디어              | 우선순위 | 난이도 | 효과                  | 구현 파일                          |
| :-------------------- | :------- | :----- | :-------------------- | :--------------------------------- |
| **CSS Containment**   | **P0**   | 하     | 렌더링 성능 ↑         | 기존 CSS 파일에 추가               |
| **이벤트 위임**       | **P1**   | 중     | 메모리 ↓, 초기 로딩 ↑ | `delegatedEventHandler.ts` 신규    |
| **Selection Overlay** | **P2**   | 상     | 선택 반응성 ↑         | `PreviewSelectionOverlay.tsx` 신규 |

### 구현 우선순위 근거

1. **CSS Containment (P0)**: 코드 한 줄로 즉시 적용 가능, 리스크 최소, 이미 부분 사용 중
2. **이벤트 위임 (P1)**: 메모리 절감 효과가 크고, EventEngine 구조와 호환
3. **Selection Overlay (P2)**: Builder는 이미 완료, Preview만 추가 구현 필요

---

> **관련 문서**: [05-supplement.md](./05-supplement.md) | [06-implementation.md](./06-implementation.md)
