---
name: pointerdown violation 설명
overview: Canvas 상호작용 관련 Chrome Violation은 (1) pointerdown task 안의 히트 테스트·동기 store write·구독 fan-out, (2) SkiaCanvas RAF 루프 한 프레임 안의 build/render 작업이 각각 ~50ms를 넘을 때 발생한다. 전자는 same-turn 입력 경로와 구독 폭, 후자는 프레임당 build 비용과 invalidation 설계가 핵심 레버다.
todos: []
isProject: false
---

# pointerdown Violation 주된 이유

## 메시지가 의미하는 것

- Chrome은 **입력 이벤트 핸들러가 메인 스레드를 오래 붙잡으면** (대략 **50ms** 넘을 때) 경고를 냅니다.
- 실제 경고 시간은 **해당 input task 안에서 handler가 유발한 동기 작업**까지 길어질 수 있습니다. 즉, 네이티브 핸들러, React 합성 이벤트 dispatch, store notify, 같은 턴의 commit이 연쇄되면 하나의 긴 입력 task로 보일 수 있습니다.

## 왜 `react-dom-client.development.js`로 보이나

- [`BuilderCanvas.tsx`](apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx) 최상위 `div.canvas-container`에 React **`onPointerDown`**이 있습니다 (포커스 이동). 자식(예: Skia `canvas`)에서 눌린 포인터가 버블링되면 이 경로가 React 합성 이벤트 파이프라인을 탑니다.
- DevTools는 종종 **가장 바깥에 보이는 프레임**을 `react-dom`으로 표시합니다. 따라서 스택이 `react-dom`이라 해도 실제 지배 비용이 React 합성 이벤트 dispatch인지, 같은 task 안의 store notify/구독 fan-out인지, 뒤이은 commit인지 프로파일로 분리해 봐야 합니다.
- **개발 모드**(`development.js`)는 프로덕션보다 느려 Violation이 더 잘 납니다.

## 이 코드베이스에서 클릭 시 동기로 무거워질 수 있는 일

1. **네이티브 중앙 핸들러** [`useCentralCanvasPointerHandlers.ts`](apps/builder/src/builder/workspace/canvas/hooks/useCentralCanvasPointerHandlers.ts)
   - `computeSelectionBoundsForHitTest()` (선택/바운드 관련 계산)
   - `hitTestPoint()` → WASM 공간 인덱스 [`spatialIndex.ts`](apps/builder/src/builder/workspace/canvas/wasm-bindings/spatialIndex.ts)
   - 히트 후 **`computeSelectionBoundsForHitTest()`를 다시 호출**하는 분기 (pending drag). 이는 새 selection 기준 bounds가 정말 same-turn에 필요한지 검증이 필요한 후보이지, 자동으로 “불필요한 중복”이라고 단정할 수는 없습니다.
   - `handleElementClickRef` → [`useCanvasElementSelectionHandlers.ts`](apps/builder/src/builder/workspace/canvas/hooks/useCanvasElementSelectionHandlers.ts)에서 다른 페이지 요소 클릭 시 **`clearSelection()` / `setCurrentPageId()`가 동기 실행**됩니다. `setSelectedElement()`는 일부 경로에서 `startTransition`으로 감싸져 있지만, 외부 store write와 notify 비용까지 자동으로 해결되지는 않습니다.
   - 빈 영역 클릭 분기에서도 `setCurrentPageId()`, `setSelectedElement()`, `setSelectedElements()`가 동기 실행됩니다. 즉 병목은 “요소 클릭”뿐 아니라 “body/page 전환” 경로까지 포함합니다.

2. **Workflow 캡처 단계** [`useWorkflowInteraction.ts`](apps/builder/src/builder/workspace/canvas/hooks/useWorkflowInteraction.ts)
   - `containerEl`에 `pointerdown` **capture** 리스너가 있고, workflow overlay가 켜진 경우 미니맵/엣지/페이지 프레임 처리와 `setWorkflowFocusedPageId()`, `setCurrentPageId()`, 카메라 애니메이션 시작이 같은 입력 경로에 겹칠 수 있습니다.

3. **선택 변경 → 구독자 리렌더**
   - 인스펙터·패널·캔버스 브리지뿐 아니라 [`BuilderCanvas.tsx`](apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx) 상위 엔트리 자체도 store를 넓게 구독하고 있어, **한 번의 선택/페이지 전환**이 상위 재평가와 파생 `useMemo` 재실행으로 번질 수 있습니다.

4. (참고) 스토어 쪽에서 **pointerdown을 짧게 유지하려고** `selectedElementProps` hydrate를 백그라운드로 미룬 흔적이 있습니다 ([`elements.ts`](apps/builder/src/builder/stores/elements.ts) 주석: WebGL pointerdown task 단축 목적) — 즉 팀도 이미 “클릭 경로가 무거워지기 쉽다”는 문제의식이 있습니다.

## 한 줄 요약

**주된 이유**: 클릭 한 번에 **히트 테스트 + same-turn store write + 그에 따른 구독 fan-out/commit**가 같은 input task에 몰려 50ms를 넘기기 쉽기 때문입니다. 스택이 `react-dom`으로 보이더라도 원인은 React 자체라기보다 **그 task 안에서 연쇄된 store/commit 작업**일 가능성이 큽니다.

## 확인 방법 (구현 없이)

- Performance 패널에서 해당 `pointerdown` 구간의 **Bottom-Up / Call Tree**로 `computeSelectionBounds`, `hitTestPoint`, store action, selector fan-out, React commit 중 무엇이 지배적인지 확인.
- 프로덕션 빌드에서 동일 조작 시 경고 감소 여부 확인.

## 먼저 계측할 항목

- 클릭 1회당 `computeSelectionBoundsForHitTest()` 호출 횟수
- 클릭 1회당 store action 수 (`setCurrentPageId`, `setSelectedElement`, `setSelectedElements`, `clearSelection`)
- 클릭 직후 React commit 시간과 commit 횟수
- 클릭 직후 `BuilderCanvas` 상위 재평가 여부
- workflow overlay ON/OFF에 따른 `pointerdown` 비용 차이

---

## 근본적인 원인 해결 방법 (아키텍처 관점)

**근본 원인**은 “입력 이벤트 한 턴에 **동기로** 처리하는 store write와 파생 계산이 많고, 그 fan-out이 넓다”는 점입니다. 해결도 **same-turn 경로를 줄이고**, 선택 하이라이트에 꼭 필요 없는 일은 다음 단계로 미루는 쪽이 본질적입니다.

### 1. 클릭 경로의 same-turn store write 줄이기 (1순위)

- [`useCanvasElementSelectionHandlers.ts`](apps/builder/src/builder/workspace/canvas/hooks/useCanvasElementSelectionHandlers.ts): 다른 페이지 요소 클릭 시 `clearSelection()` / `setCurrentPageId()` / `setSelectedElement()`가 서로 다른 타이밍으로 섞여 있습니다. 우선순위는 “전부 transition으로 감싼다”보다, **selection highlight에 꼭 필요한 write와 아닌 write를 분리**하는 것입니다.
- [`useCentralCanvasPointerHandlers.ts`](apps/builder/src/builder/workspace/canvas/hooks/useCentralCanvasPointerHandlers.ts): body/page 전환 분기까지 포함해 **클릭 종류별 동기 action 조합**을 표로 정리하고, 같은 결과를 내기 위해 꼭 필요한 최소 action만 남기는 것이 먼저입니다.
- `elements.ts`의 `setSelectedElement()`는 이미 **즉시 highlight + 다음 프레임 props hydrate**로 쪼개져 있으므로, 개선 방향은 이 패턴을 다른 선택 경로에도 확장하는 쪽이 더 현실적입니다.
- `startTransition`은 React commit 완화에는 도움이 될 수 있지만, **외부 store notify 비용을 직접 없애는 도구는 아니라는 점**을 전제로 써야 합니다.

### 2. 선택 변경의 “리렌더 폭” 줄이기 (2순위, 효과가 가장 클 때 많음)

- Zustand 구독을 **넓게** 잡은 컴포넌트(인스펙터·패널·캔버스 상위)가 선택 시 **전부 동기 재평가**되면 Violation이 길어질 수 있습니다.
- 대응: **얕은 셀렉터**, 선택 ID만 구독, 상세 props는 하위에서 지연 hydrate, 상위 엔트리의 광범위 store 구독 축소가 우선입니다.

### 3. 입력 상태 머신 / 단일 Selection 모델 (구조적 정리)

- [ADR-037 `037-workspace-scene-runtime-rearchitecture.md`](docs/adr/completed/037-workspace-scene-runtime-rearchitecture.md)에 정리된 것처럼 **SelectionModel**로 바운드·핸들 히트를 한곳에 모으고, **PointerSession**으로 `pointerdown` 이후 `move/up`과 **drag threshold**를 분리하면, “한 번의 down에 모든 것을 처리”하는 결합이 줄어듦.

### 4. Workflow 캡처 경로

- [`useWorkflowInteraction.ts`](apps/builder/src/builder/workspace/canvas/hooks/useWorkflowInteraction.ts)의 capture `pointerdown`은 workflow overlay가 켜졌을 때만 겹치므로, 먼저 ON/OFF 비용 차이를 계측해야 합니다.
- 여기서는 무조건 지연시키기보다, **히트 판정**, **focus store write**, **camera animation start** 중 무엇이 실제 비용을 먹는지 분해한 뒤 비핵심 작업만 늦추는 편이 안전합니다.

### 5. React 합성 이벤트와의 겹침 완화 (보조)

- [`BuilderCanvas.tsx`](apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx)의 `onPointerDown`은 현재 사실상 `focus()` 한 줄이므로, 주범이라기보다 **디버깅 노이즈 후보**에 가깝습니다.
- 따라서 React 합성 이벤트 자체를 없애는 것은 **보조 최적화**로만 다루고, 먼저 중앙 pointerdown/store 경로를 줄이는 것이 우선입니다.

### 6. 검증 기준

- 수정 후 **Performance**에서 `pointerdown` 구간 총 시간, **Long Task** 개수, **INP**(필드 데이터가 있으면)를 비교.
- **프로덕션 빌드**에서 Violation이 사라지거나 임계값 이하로 내려가는지 확인 (dev 전용 오버헤드 제거).

### 우선순위 요약

| 순서 | 방향                                              | 기대 효과                          |
| ---- | ------------------------------------------------- | ---------------------------------- |
| 1    | 클릭 경로의 same-turn store write 축소            | input task 자체 단축               |
| 2    | 구독 fan-out 및 상위 재평가 폭 감소               | handler 이후 commit/long task 완화 |
| 3    | SelectionModel / PointerSession (ADR-037)         | 장기적으로 입력·레이아웃 결합 완화 |

---

## `requestAnimationFrame` Violation (`SkiaCanvas.tsx` ~370행)

### 메시지가 가리키는 코드

- [`SkiaCanvas.tsx`](apps/builder/src/builder/workspace/canvas/skia/SkiaCanvas.tsx)에서 `renderFrame`(약 370행)이 **`requestAnimationFrame`으로 매 프레임 재스케줄**되는 메인 렌더 루프다.
- Chrome은 **이 콜백 전체가 끝날 때까지** 걸린 시간을 재며, 약 **50ms**를 넘기면 `[Violation] 'requestAnimationFrame' handler took …ms`를 낸다. 스택이 370행으로 찍히는 이유는 **콜백 진입 지점**이 그 줄이기 때문이고, 시간은 **함수 안 전체**에 소요된다.

### 한 프레임 안에서 하는 일 (요지)

`renderFrame` 내부는 대략 다음을 **같은 틱에서 연속 실행**한다.

- 카메라·무효화 패킷·오버레이 버전(`overlayVersion`) 등 **상태 시그니처 비교**와 `recordInvalidation` 호출
- [`buildSkiaFrameContent`](apps/builder/src/builder/workspace/canvas/skia/skiaFramePipeline.ts) — 콘텐츠 트리/커맨드 스트림 조립
- [`createFrameInputSnapshot`](apps/builder/src/builder/workspace/canvas/skia/skiaFramePlan.ts) + [`buildFrameRenderPlan`](apps/builder/src/builder/workspace/canvas/skia/skiaFramePlan.ts) — 오버레이·워크플로·미니맵 등 **프레임 플랜** 생성
- `renderer.render(...)` — **CanvasKit/Skia**로 실제 그리기

현재 구현에서 중요한 점은, rAF 루프 자체보다도 **루프 안에서 `buildSkiaFrameContent`와 `buildFrameRenderPlan`이 사실상 매 프레임 경로에 놓여 있다**는 것입니다. 따라서 병목은 “rAF를 돈다”보다 “각 프레임에서 무엇을 다시 build하느냐”에 더 가깝습니다.

요소 수·워크플로 오버레이·이미지/폰트·카메라 이동에 따른 전체 무효화가 크면 **한 RAF에서 200ms+**가 나올 수 있다. `pointerdown` Violation과 **별개 경고**지만, 클릭 직후 **store/scene invalidation**이 커지면 다음 프레임 build/render 비용이 같이 커져 같은 사용자 액션에서 연속 long task가 생길 수 있습니다.

### 근본에 가까운 대응 방향

1. **프레임당 작업량 줄이기**
   - 핵심은 “rAF를 멈추는가”보다 **content build / frame plan build를 언제 재사용하거나 생략할 수 있는가**입니다.
   - “변경 없음”일 때 **content build / frame plan build / render 중 무엇을 각각 건너뛸 수 있는지**를 분리해서 설계한다.
   - **컬링**(`framePlan.cullingBounds`)이 실제로 그리기 명령을 줄이는지 프로파일로 확인.

2. **무효화 범위 좁히기**
   - `overlayVersion`·`invalidateContent`가 **자주** 올라가면 매 프레임 풀 빌드로 이어질 수 있음 → 시그니처 설계로 **불필요한 오버레이 무효화** 감소.
   - 특히 overlay 변경만 있었는데 content build까지 재실행되는지, viewport/page position 변화가 불필요하게 전체 rebuild로 번지는지 분리해서 본다.

3. **프로파일링으로 병목 확정**
   - Performance에서 한 RAF 구간의 **Self Time**이 `buildSkiaFrameContent`, `buildFrameRenderPlan`, `renderer.render`, WASM 레이아웃 중 어디인지 분리해 측정 후 그 구간만 최적화.
   - 한 사용자 액션 뒤 첫 3프레임 정도를 묶어서 보고, “click 직후 첫 프레임만 비싼지” vs “애니메이션/overlay 때문에 연속으로 비싼지”를 구분한다.

4. **극단적 분할 (장기)**
   - 레이아웃/트리 빌드의 일부를 **Worker**로 옮기거나, 무거운 프레임을 **2프레임에 나누는** time-slicing(첫 틱 빌드·둘째 틱 draw 등)은 복잡도가 크므로 1–3으로 병목 확인 후 검토.

### pointerdown Violation과의 관계

| 구분        | pointerdown                                                                           | rAF (`renderFrame`)             |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| 트리거      | 입력 이벤트 한 턴                                                                     | 매 프레임(또는 연속 애니메이션) |
| 전형적 병목 | 히트 테스트, same-turn store write, 구독 fan-out/commit                              | frame build + Skia 그리기       |
| 연동        | 클릭 → 스토어 변경 → `rendererInput`/무효화 갱신 → **다음 rAF가 더 무거워질 수 있음** | 동일                            |

두 Violation을 함께 줄이려면 **선택/페이지 변경 시 same-turn store 비용과 fan-out을 줄이고**, 동시에 **Skia 쪽은 frame build 재실행 범위를 줄이는** 조합이 효과적이다.

## 권장 실험 순서

1. **프로덕션 빌드로 재현**해 dev-only 오버헤드를 먼저 분리한다.
2. `pointerdown` 프로파일에서 **hit test / store action / commit** 비중을 분리한다.
3. 같은 사용자 액션 직후 rAF 1~3프레임을 보고 **content build / frame plan build / render** 비중을 분리한다.
4. workflow overlay ON/OFF, 다른 페이지 요소 클릭, body 빈 영역 클릭을 나눠서 각각의 비용을 비교한다.
