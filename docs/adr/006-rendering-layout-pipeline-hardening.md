# ADR-006: 렌더링/레이아웃 파이프라인 하드닝 실행계획

## Status
Proposed

## Date
2026-03-01

## Decision Makers
XStudio Team

---

## Executive Summary

ADR-005 Foundation(Dropflow 제거 + Taffy 단일 엔진 전환) 완료 후, 엔터프라이즈 CMS 빌더 수준(1,500~5,000 요소)에서의 안정성·성능·보안을 확보하기 위한 **하드닝 실행계획**.

심층 감사를 통해 발견된 이슈를 **4단계 우선순위(P0~P3)**로 분류하고, 각 단계별 구체적인 수정 방안·파일 위치·검증 기준을 정의한다.

### 감사 결과 요약

| 심각도 | 확인됨 | 미확인/해당없음 | 총 발견 |
|--------|--------|-----------------|---------|
| CRITICAL | 2 | 1 (Paint/Path 누수 없음 확인) | 3 |
| HIGH | 6 | 1 (EventBoundary는 PixiJS 내부) | 7 |
| MEDIUM | 5 | - | 5 |
| LOW | 3 | - | 3 |
| **합계** | **16** | **2** | **18** |

### 문서 검토 반영 정정 (2026-03-01 1차)

- `removeTabPair` 예시 코드의 `historyManager.recordState`는 현재 코드베이스 API와 불일치한다. (`historyManager.addEntry` 기반으로 정정)
- `collectElementsToRemove` 최적화 제안의 `childrenMap` 타입은 `Map<string, string[]>`가 아니라 현재 store 정의(`Map<string, Element[]>`)를 기준으로 정정한다.
- `postMessage` 보안 강화는 `origin === 'null'` 허용이 아니라 `event.source` + 메시지 타입 화이트리스트 검증으로 정정한다.
- ~~`CSS order`는 JS 경로에 상당 부분 구현되어 있으므로, 핵심 작업은 Rust bridge 누락 보완으로 정정한다.~~ → **2차 정정에서 대체됨**: Taffy 0.9.2 Style에 `order` 필드 미존재 확인. Rust bridge 방안 삭제, TS 레벨 sort 단일 방안으로 최종 결정.

### 코드 대조 검증 반영 (2026-03-01 2차)

- **P1-1 (CRITICAL)**: Taffy 0.9.2 `Style` struct에 `order` 필드 자체가 미존재 확인 → Rust bridge 방안(A) 삭제, TS 레벨 sort 단일 방안으로 변경. `childIds`가 `const` 선언(라인 444)이므로 `sortedChildIds` 새 변수로 교체.
- **P2-2 (HIGH)**: `PREVIEW_READY` 부트스트랩 레이스 위험 확인 → `isValidPreviewMessage` 단일 함수에서 `isValidBootstrapMessage`/`isValidPreviewMessage` 2단계 검증으로 분리. srcdoc 재로드/HMR 시 `contentWindow` 교체 타이밍에서 PREVIEW_READY 드롭 방지.
- **P1-2 (MEDIUM)**: 5초 하드 컷오프 → 지수 백오프(200ms~3.2s) + 5초 시점 WASM 재초기화 시도 + 15초 총 타임아웃으로 변경. 느린 네트워크 환경에서 실패 오탐 방지.
- **P1-1 (LOW)**: `const childIds` 재할당 불가 → `sortedChildIds` 새 배열로 수정.

### 다중 리스너 검증 반영 (2026-03-01 3차)

- **P2-2 (HIGH)**: ~~`isValidBootstrapMessage` 내부의 전역 `_bootstrapCompleted` one-shot 가드 삭제. 3개 핸들러(useIframeMessenger, useDeltaMessenger, IframeMessenger)가 동일 PREVIEW_READY 이벤트를 독립 수신해야 하므로 전역 상태 토글은 첫 번째 핸들러만 통과시키고 나머지를 차단하여 초기화 누락을 유발.~~ → **5차·6차에서 대체됨**: nonce 기반 검증 전환 + IframeMessenger가 미사용 레거시임을 확인하여 활성 핸들러 2개(useIframeMessenger, useDeltaMessenger)로 정정.

### 코드 순서 및 성능 가드 검증 반영 (2026-03-01 4차)

- **P2-2 (HIGH)**: `IframeMessenger.initMessageListener()`(iframeMessenger.ts:50-82)에서 `id` 검증(라인 61-64)이 `type === 'PREVIEW_READY'` 검사(라인 67)보다 선행. Preview의 `sendReady()`는 `{ type: 'PREVIEW_READY' }` 단일 필드만 전송하므로 `id` 미존재 → 라인 67은 dead code. 부트스트랩 검사를 id 검증 이전으로 이동하는 코드 순서 변경을 명시.
- **P2-2 (MEDIUM)**: "가짜 PREVIEW_READY는 멱등성으로 무해"라는 가정이 과도 → `sendInitialData()`는 layouts/dataTables/elements 전체 재전송으로 비용이 큼. 각 핸들러에 자체 ready 상태 기반 중복 가드 추가 (`iframeReadyStateRef === 'ready'` 이면 스킵, `isReadyRef.current` 이면 스킵, `this.isReady` 이면 스킵).

### nonce 기반 부트스트랩 검증 전환 (2026-03-01 5차)

- **P2-2 (HIGH)**: origin+type만으로 검증하는 `isValidBootstrapMessage`에 `expectedNonce` 파라미터 추가. 빌더가 iframe 생성 시 `crypto.randomUUID()`를 srcdoc에 주입하고, Preview `sendReady()`가 nonce를 포함하여 전송. 빌더 측에서 nonce 일치 여부로 실제 preview iframe 식별. same-origin 다른 윈도우의 선행 PREVIEW_READY가 정식 초기화를 오염시키는 문제 해소. 소비자 레벨 ready-state 중복 가드 제거 (nonce 갱신으로 이전 iframe 자동 무효화).
- **P2-2 (MEDIUM)**: 테스트 항목 #3이 "6개 핸들러 모두 event.source/event.origin 검증"으로 되어 있었으나, 부트스트랩 메시지는 source 대신 nonce 검증. 2단계 검증(부트스트랩=nonce, 일반=source+origin)을 반영하여 테스트 항목 분리.

### 적용 범위 및 용어 정합성 검증 반영 (2026-03-01 6차)

- **P2-2 (MEDIUM)**: IframeMessenger(utils/dom/iframeMessenger.ts)가 어디서도 import되지 않는 미사용 레거시 코드임을 확인. "3개 핸들러" → "2개 활성 핸들러"(useIframeMessenger, useDeltaMessenger)로 수정. IframeMessenger 관련 nonce 적용 코드·검증 항목 제거, 레거시 정리 권장으로 대체.
- **P2-2 (LOW)**: Risks 섹션의 `BOOTSTRAP_MESSAGE_TYPES 갱신 필요` 문구를 nonce 기반 설계에 맞게 갱신 (시그니처 변경·레거시 정리로 교체).
- **P2-2 (LOW)**: `generatePreviewSrcdoc`/`generateDevSrcdoc`/`generateProdSrcdoc` 시그니처 변경(`bootstrapNonce` 파라미터 추가)을 설계 근거에 명시. 현재 코드 시그니처가 단일 인자이므로 구현 누락 방지.

---

## Context: 현재 파이프라인 상태

ADR-005 Foundation 완료로 레이아웃 엔진이 단일 Taffy WASM 경로로 통합되었다:

```
[사용자 편집]
  → Zustand State Update (elementsMap, childrenMap)
  → React useMemo (BuilderCanvas)
  → calculateFullTreeLayout():
      → traversePostOrder() DFS: enrichment + CSS resolve + buildNodeStyle
      → PersistentTaffyTree: incrementalUpdate() (JSON.stringify 해시 비교)
      → WASM: computeLayout() → getLayoutsBatch()
  → publishLayoutMap() → SkiaOverlay 접근
  → SkiaRenderer: getCachedCommandStream() → executeRenderCommands()
```

### 확인된 위험 영역

1. **데이터 무결성**: removeTabPair 인덱스 미갱신 → stale 조회
2. **안정성**: DFS depth guard 없음, NaN/Infinity 전파, WASM 실패 시 빈 캔버스
3. **성능**: O(N) viewport culling, 매 변경 시 전체 DFS, JSON.stringify 해시 비용
4. **CSS 정합성**: `order` 속성 fullTreeLayout 미반영 (Taffy 0.9.2 미지원), inline-block alignItems 하드코딩
5. **보안**: srcdoc 통신 경로의 수신 검증(source/type) 강화 필요

---

## Decision

4단계 우선순위 기반 점진적 하드닝을 수행한다. 각 Phase는 독립 배포 가능하며, P0은 즉시 수정이 필요한 데이터 무결성/안정성 이슈이다.

---

## P0: 즉시 수정 (데이터 무결성 + 안정성 가드)

> 목표: 데이터 손실 방지 + 런타임 크래시 방어
> 예상 소요: 1~2일

### P0-1. removeTabPair 데드코드 제거

**파일**: `apps/builder/src/builder/stores/elements.ts` (라인 114, 495-512)

**현상**: `removeTabPair`가 `_rebuildIndexes()`, history 기록, DB persist를 모두 누락한 불완전 구현이며, **코드베이스 전수 조사 결과 호출처가 0건인 데드코드로 확정됨**.

- 인터페이스 선언: 라인 114 (`removeTabPair: (elementId: string) => void;`)
- 구현체: 라인 495-512
- 호출처: `.ts`/`.tsx` 전체 검색 → **없음** (ADR 문서 참조만 존재)

**수정 방안**: 인터페이스 선언 + 구현체 동시 제거.

```typescript
// elements.ts 라인 114: 인터페이스에서 제거
// removeTabPair: (elementId: string) => void;  ← 삭제

// elements.ts 라인 495-512: 구현체 제거
// removeTabPair: (elementId) => { ... }  ← 삭제
```

**검증**:
- `pnpm exec tsc --noEmit` 타입체크 통과 (호출처 없으므로 컴파일 에러 0건)
- `grep -r "removeTabPair" apps/ --include="*.ts" --include="*.tsx"` → 0건 (문서 제외)

---

### P0-2. NaN/Infinity 레이아웃 결과 가드

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/fullTreeLayout.ts` (라인 791-815)

**현상**: WASM `computeLayout()` 결과에 NaN/Infinity 검사 없음. 잘못된 입력(0 나누기, NaN 크기)이 Taffy를 거쳐 CanvasKit/Skia에 전파되면 렌더링 이상 또는 크래시 발생.

**수정 방안**:
```typescript
// fullTreeLayout.ts 결과 수집 루프 (라인 791-815)에 가드 추가
const sanitizeStats = { count: 0 };
function sanitizeLayoutValue(v: number, fallback: number = 0): number {
  if (Number.isFinite(v)) return v;
  sanitizeStats.count++;
  return fallback;
}

// result.set() 내부:
result.set(node.elementId, {
  elementId: node.elementId,
  x: sanitizeLayoutValue(layoutResult.x),
  y: sanitizeLayoutValue(layoutResult.y),
  width: sanitizeLayoutValue(layoutResult.width),
  height: sanitizeLayoutValue(layoutResult.height),
  margin: {
    top: sanitizeLayoutValue(margin.top),
    right: sanitizeLayoutValue(margin.right),
    bottom: sanitizeLayoutValue(margin.bottom),
    left: sanitizeLayoutValue(margin.left),
  },
});

// 루프 종료 후 (DEV/모니터링)
if (sanitizeStats.count > 0 && import.meta.env.DEV) {
  console.warn(`[fullTreeLayout] Sanitized non-finite values: ${sanitizeStats.count}`);
}
```

**검증**:
- `Number.isNaN()` 또는 `Infinity` 입력 시 0으로 폴백 확인
- sanitize 카운트가 로그/모니터링 지표로 집계되는지 확인
- 정상 레이아웃 값은 변경 없이 통과

---

### P0-3. _sharedLayoutMap resetPersistentTree 시 초기화

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/fullTreeLayout.ts` (라인 48-51)

**현상**: `resetPersistentTree()` 호출 시 `_sharedLayoutMap`이 초기화되지 않아, SkiaOverlay가 stale 레이아웃 데이터를 읽을 수 있음.

**수정 방안**:
```typescript
export function resetPersistentTree(): void {
  persistentTree?.reset();
  persistentTree = null;
  // stale 레이아웃 데이터 방지
  publishLayoutMap(null);
}
```

**검증**:
- `resetPersistentTree()` 호출 후 `getSharedLayoutMap()` === null
- SkiaOverlay가 null 수신 시 렌더링 스킵 확인

---

### P0-4. DFS 재귀 depth guard 추가

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/fullTreeLayout.ts` (라인 412-625)

**현상**: `traversePostOrder`에 depth 제한 없음. 순환 참조 데이터나 극단적 깊이(>100)에서 스택 오버플로우 발생 가능.

**수정 방안**:

> **중요**: `visiting`/`visited` Set은 반드시 `calculateFullTreeLayout()` **내부(per-call 로컬)**에서 생성하여 인자로 전달해야 한다. 모듈 레벨 전역으로 선언하면 다음 호출 시 이전 노드가 `visited`에 남아 전체 트리가 스킵된다.

> **참고**: 기존 `indexMap`(post-order 완료 후 등록)은 "방문 완료(closed)" 상태만 추적하므로, "방문 중(gray)" 사이클 감지에는 별도 `visiting` Set이 필요하다. 단, 재귀 진입부에 `indexMap.has(childId)` 가드를 추가하면 중복 방문 방지는 가능하다.

```typescript
// calculateFullTreeLayout() 내부에서 생성 (per-call)
const visiting = new Set<string>();
const MAX_TREE_DEPTH = 100;

// traversePostOrder에 인자로 전달
function traversePostOrder(
  elementId: string,
  // ... 기존 파라미터 ...
  visiting: Set<string>,  // 추가: 사이클 감지용
  depth: number = 0,      // 추가: 깊이 제한용
): void {
  // 1. 중복 방문 방지 (이미 post-order 완료된 노드)
  if (indexMap.has(elementId)) return;

  // 2. 순환 참조 감지 (A -> ... -> A, gray 상태)
  if (visiting.has(elementId)) {
    if (import.meta.env.DEV) {
      console.warn(`[fullTreeLayout] Cycle detected at ${elementId}`);
    }
    return;
  }

  // 3. 깊이 제한
  if (depth > MAX_TREE_DEPTH) {
    if (import.meta.env.DEV) {
      console.warn(`[fullTreeLayout] Max depth ${MAX_TREE_DEPTH} exceeded for ${elementId}`);
    }
    return;
  }

  visiting.add(elementId);
  // ... 기존 로직 ...
  for (const childId of childIds) {
    traversePostOrder(childId, ..., visiting, depth + 1);
  }
  visiting.delete(elementId);
  // indexMap.set(elementId, ...) 는 기존 라인 624에서 처리
}
```

**검증**:
- 순환 참조(A→B→A) 데이터에서 무한 재귀 없이 경고 출력
- 깊이 100 초과 트리에서 크래시 없이 경고 출력
- 정상 트리(~20 레벨)에서 동작 변경 없음

---

## P1: 단기 개선 (CSS 정합성 + WASM 안정성)

> 목표: CSS 스펙 준수 + WASM 실패 대응
> 예상 소요: 3~5일

### P1-1. CSS `order` 속성 — fullTreeLayout TS 레벨 sort 추가

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/fullTreeLayout.ts` (traversePostOrder, 라인 444 부근)

**현상**: JS 레이어는 `order`를 인식하고 JSON에 포함하지만, **Taffy 0.9.2의 `Style` struct에 `order` 필드 자체가 존재하지 않음** (Rust 소스 확인 완료: `taffy-0.9.2/src/style/mod.rs`). 따라서 Rust bridge 수정으로는 해결 불가.

레거시 `TaffyFlexEngine._runTaffyPassRaw()`에는 WASM 호출 전 TS 레벨 자식 배열 stable sort가 있었으나(라인 369-384), `fullTreeLayout.traversePostOrder()`에는 이 sort가 **없음**. Dropflow 제거 후 `fullTreeLayout`이 유일한 경로이므로 `order`가 사실상 완전 무효.

> **Rust 방안 불가 사유**: Taffy 0.9.2 `Style` struct에 CSS `order` 필드가 미구현됨. `Layout.order: u32`는 렌더링 페인트 순서(삽입 인덱스)이며 CSS `order`와 무관. Taffy 업스트림에서 `order` 지원이 추가될 때까지 TS 레벨 sort가 유일한 방법.

**수정 방안**: `traversePostOrder` 내부에서 `TaffyFlexEngine`과 동일한 패턴의 stable sort 적용.

```typescript
// traversePostOrder 내부, childIds 순회 전 (라인 485 부근)
// 주의: childIds는 const 선언(라인 444)이므로 새 배열로 교체
const getOrder = (id: string): number => {
  const s = (elementsMap.get(id)?.props?.style ?? {}) as Record<string, unknown>;
  const o = parseInt(String(s.order ?? '0'), 10);
  return isNaN(o) ? 0 : o;
};
const sortedChildIds = childIds.some(id => getOrder(id) !== 0)
  ? [...childIds].sort((a, b) => getOrder(a) - getOrder(b))  // stable sort (CSS spec)
  : childIds;  // order 미사용 시 복사 비용 회피

// 이후 재귀 및 childIndices 구성에서 sortedChildIds 사용
for (const childId of sortedChildIds) {
  traversePostOrder(childId, ...);
}
```

> **참고**: Taffy에 전달하는 children 배열의 순서도 sort 결과를 반영해야 한다. `batch[parentIdx].children`에 들어가는 인덱스 순서가 Taffy의 레이아웃 계산에서 자식 배치 순서를 결정하므로, `childIndices` 구성(라인 609-615)도 `sortedChildIds` 기준으로 변경해야 한다.

**장기 로드맵**: Taffy 업스트림에서 CSS `order` 지원 시 Rust bridge에 필드 추가 + TS sort 제거.

**검증**:
- `order: 2` 설정된 flex 아이템이 올바른 위치에 렌더링
- `order: 0` (기본값) 요소들은 DOM 순서 유지 확인
- `pnpm exec tsc --noEmit` → 타입체크 통과

---

### P1-2. WASM 실패 시 지수 백오프 + 재시도 + 사용자 알림

**파일**: `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` (라인 1139-1148)
**관련**: `apps/builder/src/builder/workspace/canvas/wasm-bindings/rustWasm.ts` (initRustWasm)

**현상**: WASM 초기화 실패 시 `wasmModule = null`로 설정되지만 재시도 로직 없음. BuilderCanvas의 `setInterval(200ms)` 폴링은 `isRustWasmReady()`를 무한 반복 체크하지만, 모듈이 영구 null이면 영원히 실패 상태.

**리스크**: 5초 하드 컷오프만 두면, 느린 네트워크(CDN 지연 등)에서 정상 로드 중인데도 "실패 오탐 → 고착" 가능.

**수정 방안**: 3단계 전략 — 지수 백오프 폴링 + WASM 재초기화 시도 + 사용자 알림.

```typescript
const [wasmLayoutFailed, setWasmLayoutFailed] = useState(false);

useEffect(() => {
  if (wasmLayoutReady) return;

  let attempts = 0;
  let delay = 200;  // 초기 200ms → 400ms → 800ms → 1600ms → 3200ms
  const MAX_TOTAL_WAIT = 15_000; // 총 15초 대기
  let totalWait = 0;
  let retried = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  const poll = () => {
    if (isRustWasmReady()) {
      setWasmLayoutReady(true);
      return;
    }

    totalWait += delay;
    attempts++;

    // 5초 경과 시 WASM 재초기화 1회 시도
    if (!retried && totalWait >= 5_000) {
      retried = true;
      initRustWasm(); // 재시도 (비동기, 다음 폴링에서 결과 확인)
    }

    if (totalWait >= MAX_TOTAL_WAIT) {
      setWasmLayoutFailed(true);
      console.error('[BuilderCanvas] WASM 로드 실패 (15초 타임아웃)');
      return;
    }

    delay = Math.min(delay * 2, 3200); // 지수 백오프, 최대 3.2초
    timeoutId = setTimeout(poll, delay);
  };

  timeoutId = setTimeout(poll, delay);
  return () => clearTimeout(timeoutId);
}, [wasmLayoutReady]);

// 사용자 가시 알림
{wasmLayoutFailed && (
  <CanvasErrorBanner
    message="레이아웃 엔진 로드에 실패했습니다."
    action={{ label: "새로고침", onClick: () => window.location.reload() }}
  />
)}
```

**검증**:
- 정상 로드(< 5초): 기존 동작 유지
- 느린 로드(5~15초): 재초기화 시도 후 성공 시 정상 전환
- 영구 실패(> 15초): 폴링 중단 + 사용자 알림 + 새로고침 버튼
- 폴링 로그: DEV에서 `attempts`/`totalWait` 출력하여 디버깅 지원

---

### P1-3. collectElementsToRemove childrenMap 활용

**파일**: `apps/builder/src/builder/stores/utils/elementRemoval.ts` (라인 35-52)

**현상**: `findChildren`이 `elements.filter(el => el.parent_id === parentId)` O(N) 반복. 깊은 트리에서 O(N×D) 복잡도.

**수정 방안**:
```typescript
function collectElementsToRemove(
  elementId: string,
  elements: Element[],
  elementsMap: Map<string, Element>,
  childrenMap: Map<string, Element[]>,  // store 타입과 일치
): { rootElement: Element; allElements: Element[] } | null {
  // ...
  const findChildren = (parentId: string): Element[] => {
    const directChildren = childrenMap.get(parentId) ?? [];
    const allChildren: Element[] = [];
    for (const child of directChildren) {
      allChildren.push(child);
      allChildren.push(...findChildren(child.id));
    }
    return allChildren;
  };
  // ...
}
```

**호출부 수정** (라인 297):
```typescript
const result = collectElementsToRemove(elementId, state.elements, state.elementsMap, state.childrenMap);
```

**검증**:
- 요소 삭제 시 자식 요소 완전 제거 확인
- 타입체크 통과

---

## P2: 중기 개선 (캐시 + 안정성 보강)

> 목표: 대규모 캔버스 안정성 + 캐시 최적화
> 예상 소요: 3~5일

### P2-1. Paragraph 캐시 크기 동적 조정

**파일**: `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts` (라인 27-28)

**현상**: `MAX_PARAGRAPH_CACHE_SIZE = 500` 하드코딩. 2,500+ 텍스트 요소 시 캐시 스래싱 발생 가능. 각 Paragraph는 CanvasKit 네이티브 객체로 GPU 메모리 점유.

**수정 방안**:
```typescript
// 환경변수 기반 설정 + 합리적 기본값
const MAX_PARAGRAPH_CACHE_SIZE = (() => {
  const env = import.meta.env.VITE_PARAGRAPH_CACHE_SIZE;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1000; // 기본값 500 → 1000으로 상향
})();
```

**관련 캐시도 동일 패턴 적용 검토**:
- `textMeasure.ts`: `MAX_FONT_METRICS_CACHE_SIZE = 256`
- `imageCache.ts`: `MAX_CACHE_SIZE = 100`

**검증**:
- 환경변수 설정 시 해당 크기 적용 확인
- 기본값 사용 시 1000 적용 확인
- 메모리 프로파일링: 1000개 캐시 엔트리 GPU 메모리 측정

---

### P2-2. Builder 측 postMessage 수신 검증 일원화

**대상 파일 (6개 핸들러)**:

| 파일 | 라인 | origin 검증 | source 검증 | 상태 |
|------|------|-------------|-------------|------|
| `builder/hooks/useIframeMessenger.ts` | 387 | `event.origin !== window.location.origin` | 없음 | **source 보강** |
| `builder/overlay/index.tsx` | 270 | `event.origin !== window.location.origin` | 없음 | **source 보강** |
| `builder/hooks/useDeltaMessenger.ts` | 126 | `event.origin !== window.location.origin` | 없음 | **source 보강** |
| **`builder/main/BuilderCore.tsx`** | **397** | **없음** | **없음** | **origin+source 추가 필수** |
| **`builder/main/BuilderCore.tsx`** | **437** | **없음** | **없음** | **origin+source 추가 필수** |
| **`builder/panels/monitor/hooks/useWebVitals.ts`** | **44** | **없음** | **없음** | **origin+source 추가 필수** |

**현상**:
- `useIframeMessenger`, `overlay`, `useDeltaMessenger`는 origin 검증이 있으나 source 검증 없음
- **`BuilderCore.tsx`의 2개 핸들러와 `useWebVitals.ts`는 origin/source 검증이 전혀 없어 임의 출처 메시지를 처리함**
- `sandbox="allow-same-origin"` 설정으로 srcdoc iframe의 origin이 부모와 동일 → 현재 origin 검증이 정상 동작

**레이스 컨디션 주의**: `PREVIEW_READY`는 iframe 부트스트랩 메시지로, srcdoc 재로드/HMR 시 `contentWindow`가 교체되는 타이밍에 `event.source !== iframe.contentWindow` 체크가 실패할 수 있음. `PREVIEW_READY`는 1회 전송 구조이며(`App.tsx` useEffect), 수신 측(`useIframeMessenger`)이 이 이벤트에 초기화(`processMessageQueue`, `sendInitialData`)를 걸고 있으므로 드롭 시 빌더가 초기화 불능 상태에 빠짐.

**수정 방안**: **nonce 기반 2단계 검증** — 부트스트랩 메시지(PREVIEW_READY)와 일반 메시지를 분리하되, nonce로 실제 iframe 출처를 보증.

**핵심 원리**: 빌더가 iframe 생성 시 `crypto.randomUUID()`를 생성하여 srcdoc에 주입. Preview는 `sendReady()` 시 이 nonce를 포함. 빌더는 nonce 일치 여부로 실제 preview iframe의 PREVIEW_READY를 식별. same-origin 다른 윈도우는 nonce를 모르므로 가짜 PREVIEW_READY 차단.

**1단계: srcdoc에 nonce 주입**

```typescript
// builder/main/previewSrcdoc.ts
export function generateDevSrcdoc(projectId: string, bootstrapNonce: string): string {
  // ... 기존 코드 ...
  return `
<!DOCTYPE html>
<html lang="ko">
<head>...</head>
<body data-preview="true" data-project-id="${projectId}">
  <script>window.__bootstrapNonce = '${bootstrapNonce}';</script>
  <!-- 이하 기존 스크립트 -->
</body></html>`;
}

// builder/main/BuilderCanvas.tsx (srcdoc 생성 시점)
const bootstrapNonceRef = useRef(crypto.randomUUID());

// iframe 재생성 시 nonce 갱신
const srcdocContent = useMemo(() => {
  if (!useSrcdoc || !projectId) return null;
  bootstrapNonceRef.current = crypto.randomUUID(); // 새 iframe = 새 nonce
  return generatePreviewSrcdoc(projectId, bootstrapNonceRef.current);
}, [useSrcdoc, projectId]);
```

**2단계: Preview에서 nonce 포함 전송**

```typescript
// preview/messaging/messageHandler.ts
sendReady(): void {
  const targetOrigin = getTargetOrigin(); // same-origin 보장, '*' 미사용
  window.parent.postMessage({
    type: 'PREVIEW_READY',
    nonce: (window as any).__bootstrapNonce ?? null,
  }, targetOrigin);
},

// getTargetOrigin(): srcdoc의 경우 document.baseURI에서 origin 추출,
// src 모드의 경우 window.location.origin 반환.
```

**3단계: 검증 함수**

```typescript
// utils/messageValidation.ts (신규)
import { MessageService } from './messaging';

/**
 * 부트스트랩 메시지 검증 (순수 함수, 상태 없음)
 *
 * nonce 기반으로 실제 preview iframe에서 보낸 PREVIEW_READY만 통과.
 * 2개 활성 핸들러가 동시에 수신하여 각자의 초기화를 수행:
 *   1) useIframeMessenger — iframeReadyState + 초기 데이터 전송
 *   2) useDeltaMessenger  — isReadyRef + canvasDeltaMessenger 참조
 *
 * 참고: IframeMessenger(utils/dom/iframeMessenger.ts)는 싱글톤이 생성되나
 * 어디서도 import되지 않는 미사용 레거시 코드. nonce 적용 대상이 아님.
 * 별도 정리(삭제 또는 리팩토링)를 권장.
 *
 * source 체크 대신 nonce를 사용하는 이유:
 *   - srcdoc 재로드/HMR 시 contentWindow가 교체되어 source 비교 실패
 *   - origin만으로는 same-origin 다른 윈도우를 구분 불가
 *   - nonce는 빌더가 생성한 값이므로 외부에서 추측 불가
 */
export function isValidBootstrapMessage(
  event: MessageEvent,
  expectedNonce: string,
): boolean {
  if (event.origin !== window.location.origin) return false;
  if (event.data?.type !== 'PREVIEW_READY') return false;
  // nonce 불일치 → 다른 윈도우 또는 이전 iframe의 메시지
  return event.data?.nonce === expectedNonce;
}

/** 일반 메시지 — iframe 참조 확보 후 source + origin 이중 검증 */
export function isValidPreviewMessage(event: MessageEvent): boolean {
  const iframe = MessageService.getIframe();
  if (!iframe?.contentWindow) return false;

  // 1) source 고정: 현재 preview iframe에서 온 메시지만 허용
  if (event.source !== iframe.contentWindow) return false;
  // 2) origin 검증: same-origin만 허용
  if (event.origin !== window.location.origin) return false;

  return true;
}
```

**4단계: 각 핸들러에 적용** (2개 활성 핸들러가 동일 PREVIEW_READY 이벤트를 독립 수신):
```typescript
// 1) useIframeMessenger.ts (라인 387) — 상태 + 초기 데이터 전송
//    bootstrapNonceRef는 BuilderCanvas에서 prop/context로 전달
const handleMessage = useCallback((event: MessageEvent) => {
  if (isValidBootstrapMessage(event, bootstrapNonceRef.current)) {
    iframeReadyStateRef.current = 'ready';
    setIframeReadyState('ready');
    const iframe = MessageService.getIframe();
    if (iframe) canvasDeltaMessenger.setIframe(iframe);
    processMessageQueue();
    sendInitialData(); // layouts, dataTables, elements 등
    return;
  }
  // 일반 메시지는 iframe source 검증
  if (!isValidPreviewMessage(event)) return;
  // ... 나머지 메시지 처리
}, []);

// 2) useDeltaMessenger.ts (라인 128) — Delta 메신저 준비 상태
const handleMessage = (event: MessageEvent) => {
  if (isValidBootstrapMessage(event, bootstrapNonceRef.current)) {
    isReadyRef.current = true;
    const iframe = MessageService.getIframe();
    if (iframe) canvasDeltaMessenger.setIframe(iframe);
    return;
  }
  if (!isValidPreviewMessage(event)) return;
  // ...
};

// 3) overlay/index.tsx (라인 270) — 오버레이 UI, 일반 메시지만
//    현재 origin 검증만 있고 source 검증 없음 → isValidPreviewMessage로 보강
const handleMessage = (event: MessageEvent) => {
  if (!isValidPreviewMessage(event)) return;
  if (event.data.type === "ELEMENT_SELECTED") { ... }
  else if (event.data.type === "CLEAR_OVERLAY") { ... }
  // ...
};

// 4~6) BuilderCore.tsx (2곳), useWebVitals.ts — 일반 메시지만
const handleNavigateMessage = async (event: MessageEvent) => {
  if (!isValidPreviewMessage(event)) return;
  if (event.data?.type !== "NAVIGATE_TO_PAGE") return;
  // ...
};
```

**IframeMessenger(utils/dom/iframeMessenger.ts) 참고**:
- 싱글톤(`export const iframeMessenger`)이 모듈 로드 시 생성되나, **어디서도 import되지 않는 미사용 레거시 코드**.
- `initMessageListener()`가 자동 실행되어 `window.addEventListener('message', ...)`를 등록하지만, 활성 소비자가 없으므로 nonce 적용 대상이 아님.
- 정리 권장: `MessagingService`(services/messaging.ts)와 함께 삭제 또는 활성 경로로 리팩토링.

**설계 근거**:
- **nonce 기반 출처 보증**: `isValidBootstrapMessage`에 `expectedNonce` 파라미터로 실제 preview iframe 식별. source 체크의 race condition 문제(contentWindow 교체 타이밍)를 nonce로 우회. same-origin 다른 윈도우는 nonce를 모르므로 가짜 PREVIEW_READY 자체가 차단됨
- **전역 상태 없음**: 검증 함수는 순수 함수. nonce는 호출자가 ref로 관리하므로 다중 핸들러 간 간섭 없음
- **소비자 레벨 중복 가드 불필요**: nonce가 iframe 재생성 시 갱신되므로, 이전 iframe의 PREVIEW_READY는 자동 무효화. 동일 nonce의 중복 PREVIEW_READY는 정상 초기화 재실행이나, `sendReady()`가 Preview 마운트 시 1회만 호출(`App.tsx` useEffect)되므로 실제 발생하지 않음

**nonce 전파 경로**:
- `BuilderCanvas` → `bootstrapNonceRef` 생성 (srcdoc 생성 시 갱신)
- `useIframeMessenger` → `bootstrapNonceRef`를 prop 또는 context로 수신
- `useDeltaMessenger` → 동일 경로로 수신
- Preview 측 `sendReady()`의 targetOrigin: 현재 `'*'` → `getTargetOrigin()`으로 변경 (예시 코드에 반영 완료)

**시그니처 변경 필수**:
- `generatePreviewSrcdoc(projectId)` → `generatePreviewSrcdoc(projectId, bootstrapNonce)` (previewSrcdoc.ts:179)
- `generateDevSrcdoc(projectId)` → `generateDevSrcdoc(projectId, bootstrapNonce)` (previewSrcdoc.ts:65)
- `generateProdSrcdoc(projectId)` → `generateProdSrcdoc(projectId, bootstrapNonce)` (previewSrcdoc.ts:144)

**검증**:
- **nonce 일치**: 실제 preview iframe의 PREVIEW_READY만 2개 활성 핸들러(useIframeMessenger, useDeltaMessenger) 모두 정상 초기화 확인
- **nonce 불일치 거부**: 다른 윈도우/이전 iframe에서 보낸 PREVIEW_READY가 2개 핸들러 모두에서 무시 확인
- **다중 리스너 동시 처리**: 동일 nonce의 PREVIEW_READY에 대해 useIframeMessenger/useDeltaMessenger 모두 독립 통과 확인
- **iframe 재생성 시 nonce 갱신**: `srcdocContent` useMemo 재계산 → 새 nonce → 이전 iframe의 PREVIEW_READY 자동 무효화
- **일반 메시지**: 외부 origin/다른 source에서 보낸 메시지가 `isValidPreviewMessage`에서 차단 확인
- **HMR 시나리오**: 개발 환경에서 hot reload → 새 nonce → PREVIEW_READY 재수신 + 2개 핸들러 정상 재초기화
- `NAVIGATE_TO_PAGE`, `LOAD_DATA_TABLE`, `WEB_VITALS_UPDATE` 메시지가 정상 처리되는지 확인

---

### P2-3. inline-block alignItems 개선

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/taffyDisplayAdapter.ts` (라인 179-185)

**현상**: `INLINE_BLOCK_PARENT_CONFIG`에 `alignItems: 'center'` 하드코딩. `vertical-align: top/baseline` 요소에서 잘못된 정렬.

**수정 방안**:
```typescript
// 자식 요소들의 vertical-align을 분석하여 가장 적합한 alignItems 결정
function resolveInlineBlockAlignItems(
  childDisplays: string[],
  childElements: Element[],
): string {
  // 다수결 또는 첫 번째 비-auto 값 기준
  const verticalAligns = childElements
    .map(el => (el.props?.style as Record<string, unknown>)?.verticalAlign)
    .filter(Boolean);

  if (verticalAligns.includes('top')) return 'flex-start';
  if (verticalAligns.includes('bottom')) return 'flex-end';
  return 'center'; // 기본값 유지
}
```

**검증**:
- `vertical-align: top` inline-block이 상단 정렬 확인
- 기본 center 정렬 유지 확인

---

## P3: 장기 성능 최적화 (대규모 캔버스)

> 목표: 5,000 요소에서 60fps 달성
> 예상 소요: 2~4주 (ADR-005 Phase 3~5와 연계)

### P3-1. fullTreeLayoutMap useMemo 의존성 최적화

**파일**: `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` (라인 658-682)

**현상**: `elementById`(= store의 `elementsMap`)가 의존성에 포함. 어떤 요소 변경이든 새 Map 인스턴스 생성 → 전체 DFS 재실행.

**수정 방안** (설계 수준):
```
방안 A: Dirty Tracking
- store에 `dirtyElementIds: Set<string>` 추가
- fullTreeLayout이 dirty 요소의 서브트리만 재계산
- PersistentTaffyTree의 incrementalUpdate가 이미 dirty 스킵을 지원하므로
  JS 측 DFS만 서브트리로 제한하면 됨

방안 B: Version Counter
- `elementsVersion: number` 카운터 도입
- useMemo 의존성을 Map 참조 대신 version으로 변경
- 레이아웃 무관 변경(색상, 텍스트 내용)은 version 미증가
```

**ADR-005 연계**: Phase 1 (Persistent Tree + Incremental Layout)의 JS 측 최적화에 해당.

**검증**:
- 색상 변경 시 DFS 미실행 확인 (console.time 프로파일링)
- 크기/위치 변경 시에만 DFS 실행 확인

---

### P3-2. Viewport Culling R-tree 전환

**파일**: `apps/builder/src/builder/workspace/canvas/hooks/useViewportCulling.ts` (라인 242-264)

**현상**: 카메라 팬/줌마다 모든 요소에 O(N) `container.getBounds()` 호출. 5,000 요소 시 프레임 예산 초과.

**수정 방안** (설계 수준):
```
1. R-tree 라이브러리 도입 (rbush 또는 flatbush)
2. 레이아웃 변경 시 R-tree 갱신 (publishLayoutMap 후)
3. viewport query: O(log N + K) (K = 가시 요소 수)
4. getBounds() 호출 제거 → R-tree의 AABB 직접 사용
```

**ADR-005 연계**: Phase 4 (Element-Level Viewport Culling).

**검증**:
- 5,000 요소 시 viewport culling 시간 < 1ms 목표
- 카메라 팬 시 프레임 드롭 없음

---

### P3-3. JSON.stringify 해시 대체

**파일**: `apps/builder/src/builder/workspace/canvas/layout/engines/persistentTaffyTree.ts` (라인 188-189)

**현상**: 매 증분 갱신 시 모든 노드에 `JSON.stringify(styleRecord)` + 문자열 비교. 5,000 노드 × 20+ 필드 = 상당한 CPU 비용.

**수정 방안** (설계 수준):
```
방안 A: 구조적 해시 (MurmurHash3)
- styleRecord → 32bit 해시
- 비교: 숫자 비교 O(1)
- 충돌 확률 극히 낮음 (2^32 공간)

방안 B: Version Counter (P3-1과 연계)
- store에서 스타일 변경 시 해당 요소의 styleVersion++
- PersistentTaffyTree가 version 비교로 변경 감지
- JSON.stringify 완전 제거
```

**ADR-005 연계**: Phase 2 (Binary Protocol)의 전단계 최적화.

**검증**:
- 5,000 노드 증분 갱신 시간: 현재 ~8ms → 목표 < 2ms
- 레이아웃 정확도 동일 (해시 충돌로 인한 스타일 누락 없음)

---

## 변경하지 않는 것

| 항목 | 이유 |
|------|------|
| Paint/Path GPU 리소스 관리 | 감사 결과 모든 객체가 정상 `delete()` 호출됨 (nodeRenderers.ts) |
| EventBoundary 히트 테스팅 | PixiJS 8 프레임워크 내부 동작. `_interactivePrune()` 가지치기 작동 중 |
| engines/index.ts | Dropflow 제거 후 깔끔하게 정리 완료 |
| publishLayoutMap 메커니즘 | 모듈 레벨 싱글턴 + version counter 패턴 정상 작동 |

---

## 실행 순서 및 의존 관계

```
P0 (즉시, 1~2일)
├── P0-1. removeTabPair 데드코드 제거 (독립)
├── P0-2. NaN/Infinity 가드 + 계측 (독립)
├── P0-3. _sharedLayoutMap 초기화 (독립)
└── P0-4. DFS depth guard + cycle guard (독립, visiting Set per-call 로컬 필수)

P1 (단기, 3~5일) ← P0 완료 후
├── P1-1. CSS order: TS 레벨 sort 추가 (Taffy 0.9.2 Style.order 미지원, Rust 방안 불가)
├── P1-2. WASM 실패: 지수 백오프 + 재시도 + 알림 UI (독립)
└── P1-3. collectElementsToRemove childrenMap (독립)

P2 (중기, 3~5일) ← P1 완료 후
├── P2-1. Paragraph 캐시 동적 조정 (독립)
├── P2-2. postMessage 수신 검증 일원화 (6개 핸들러, 부트스트랩/일반 2단계 검증)
└── P2-3. inline-block alignItems (P1-1 이후 권장)

P3 (장기, 2~4주) ← P2 완료 후, ADR-005 Phase 3~5와 병렬
├── P3-1. useMemo 의존성 최적화 (dirty tracking 설계)
├── P3-2. Viewport Culling R-tree (P3-1과 독립)
└── P3-3. JSON.stringify 해시 대체 (P3-1과 연계 가능)
```

---

## 프레임 예산 분석 (16ms 기준)

### 현재 (5,000 요소, 콘텐츠 변경 시)

| 단계 | 비용 | 비고 |
|------|------|------|
| JS DFS (traversePostOrder) | 8~15ms | 전체 트리 순회 |
| JSON.stringify 해시 비교 | 3~5ms | 5,000 노드 × 20+ 필드 |
| WASM computeLayout | 3~5ms | Taffy 내부 dirty 스킵 |
| Skia Command Stream 생성 | 5~8ms | buildSkiaTree DFS |
| Skia Render | 5~10ms | CanvasKit 드로콜 |
| **합계** | **~30ms** | **1.9x 예산 초과** |

### P0~P2 완료 후 (예상)

| 단계 | 비용 | 개선 |
|------|------|------|
| JS DFS | 8~15ms | 변경 없음 (P3에서 개선) |
| JSON.stringify | 3~5ms | 변경 없음 (P3에서 개선) |
| WASM computeLayout | 3~5ms | NaN 가드 추가 (overhead < 0.1ms) |
| Skia Command Stream | 5~8ms | 변경 없음 |
| Skia Render | 5~10ms | 변경 없음 |
| **합계** | **~30ms** | **안정성 향상, 성능 동일** |

### P3 완료 후 (목표)

| 단계 | 비용 | 개선 |
|------|------|------|
| JS DFS (dirty subtree) | 1~3ms | P3-1: dirty tracking |
| 해시 비교 (version) | < 0.5ms | P3-3: version counter |
| WASM computeLayout | 1~3ms | dirty subtree만 |
| Skia Command Stream | 2~4ms | viewport culling |
| Skia Render | 3~5ms | viewport culling |
| **합계** | **~8ms** | **50% 예산 이내** |

---

## 검증 계획

### 각 Phase 완료 시

1. **타입체크**: `cd apps/builder && pnpm exec tsc --noEmit` — 0 에러
2. **빌드**: `pnpm build` — 성공
3. **런타임**: `pnpm dev` → 캔버스 요소 정상 렌더링
4. **회귀 테스트**: 기존 기능(요소 추가/삭제/이동/리사이즈, 페이지 전환, Undo/Redo) 동작 확인

### P0 특별 검증

- `removeTabPair` → 인터페이스 + 구현 삭제 후 타입체크 통과 + grep 0건 확인
- NaN 가드 → 의도적 NaN 입력 시 0 폴백 + DEV 경고 카운트 확인
- 순환 참조 + 깊이 제한 → A→B→A cycle, 100+ depth 트리에서 경고 + 크래시 없음
- `visiting` Set이 per-call 로컬인지 확인 (모듈 레벨 선언 시 다음 호출에서 전체 트리 스킵 버그)

### 자동화 테스트 추가 (필수)

1. `elements` 스토어 테스트: removeTabPair 제거 후 기존 Tab/Panel 삭제 경로(`removeElement`/`removeElements`) 정상 동작 확인
2. `fullTreeLayout` 테스트: non-finite 값 sanitize, cycle guard, depth guard 회귀 테스트
3. `message` 보안 테스트: 2단계 검증 동작 확인
   - 부트스트랩(PREVIEW_READY): nonce 일치 시 2개 활성 핸들러(useIframeMessenger, useDeltaMessenger) 모두 통과, nonce 불일치 시 모두 거부 (source 검증 대신 nonce 사용)
   - 일반 메시지: 6개 핸들러에서 `event.source`/`event.origin` 이중 검증 (특히 `BuilderCore.tsx` 2곳 + `useWebVitals.ts`)
4. `fullTreeLayout` order 테스트: `order` 속성이 있는 flex 자식의 `sortedChildIds` 순서 + batch children 인덱스 순서 검증 (TS 레벨 sort, WASM bridge 무관)

### P3 성능 검증

- Chrome DevTools Performance 탭에서 5,000 요소 시나리오 프로파일링
- 프레임 드롭 카운트: 연속 60fps 유지 확인 (30초 카메라 팬)
- `console.time` 기반 DFS 시간 측정: dirty tracking 전후 비교

---

## Consequences

### Positive
- 데드코드 제거로 코드베이스 정리 (removeTabPair 불완전 구현 삭제)
- 런타임 안정성 향상 (NaN 가드, cycle/depth 제한, stale map 방지)
- CSS 스펙 준수 개선 (order 속성 TS sort, Taffy 업스트림 지원 시 Rust 전환 가능)
- iframe 메시지 수신 경계 일원화 (부트스트랩/일반 2단계 검증, 6개 핸들러 통일)
- 대규모 캔버스 성능 기반 마련 (P3 최적화)

### Negative
- P0~P2: 추가 코드량 적음 (~100줄), 유지보수 비용 미미
- P3: 아키텍처 변경 필요 (dirty tracking, R-tree), 복잡도 증가
- P3-3 해시 대체: 충돌 가능성 (극히 낮지만 존재)

### Risks
- P1-1 (CSS order): Taffy 0.9.2 미지원으로 TS sort 유지 필요, 업스트림 변경 시 마이그레이션 비용
- P1-2 (WASM 백오프): 15초 타임아웃이 극단적 느린 환경에서도 적절한지 실환경 검증 필요
- P2-2 (메시지 검증): nonce 기반 부트스트랩/일반 분리로 복잡도 증가. srcdoc nonce 주입 + 3개 함수 시그니처 변경(generatePreviewSrcdoc/generateDevSrcdoc/generateProdSrcdoc) 필요. 미사용 레거시(IframeMessenger, MessagingService) 정리 시점 결정 필요
- P3-1 (dirty tracking): store 슬라이스 구조 변경 필요, 영향 범위 넓음
- P3-2 (R-tree): 외부 라이브러리 의존성 추가

---

## References

- [ADR-005: Full-Tree WASM Layout](./005-full-tree-wasm-layout.md)
- [ADR-003: Canvas Rendering](./003-canvas-rendering.md)
- [ADR-001: State Management](./001-state-management.md)
- [Taffy 0.9 Documentation](https://github.com/DioxusLabs/taffy)
- [RBush R-tree](https://github.com/mourner/rbush)
