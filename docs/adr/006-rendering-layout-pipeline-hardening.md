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

### 문서 검토 반영 정정 (2026-03-01)

- `removeTabPair` 예시 코드의 `historyManager.recordState`는 현재 코드베이스 API와 불일치한다. (`historyManager.addEntry` 기반으로 정정)
- `collectElementsToRemove` 최적화 제안의 `childrenMap` 타입은 `Map<string, string[]>`가 아니라 현재 store 정의(`Map<string, Element[]>`)를 기준으로 정정한다.
- `postMessage` 보안 강화는 `origin === 'null'` 허용이 아니라 `event.source` + 메시지 타입 화이트리스트 검증으로 정정한다.
- `CSS order`는 JS 경로에 상당 부분 구현되어 있으므로, 핵심 작업은 Rust bridge 누락 보완으로 정정한다.

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
4. **CSS 정합성**: Rust bridge에서 `order` 속성 누락, inline-block alignItems 하드코딩
5. **보안**: srcdoc 통신 경로의 수신 검증(source/type) 강화 필요

---

## Decision

4단계 우선순위 기반 점진적 하드닝을 수행한다. 각 Phase는 독립 배포 가능하며, P0은 즉시 수정이 필요한 데이터 무결성/안정성 이슈이다.

---

## P0: 즉시 수정 (데이터 무결성 + 안정성 가드)

> 목표: 데이터 손실 방지 + 런타임 크래시 방어
> 예상 소요: 1~2일

### P0-1. removeTabPair 인덱스/히스토리 누락 수정

**파일**: `apps/builder/src/builder/stores/elements.ts` (라인 495-512)

**현상**: `removeTabPair`가 `_rebuildIndexes()`, history 기록, DB persist를 모두 누락. Tab 삭제 후:
- `elementsMap`/`childrenMap`이 stale → O(1) 조회에서 삭제된 요소 반환
- Ctrl+Z 복구 불가
- 새로고침 시 삭제 원복 가능
- 추가 확인: 현재 코드베이스에서 `removeTabPair` 직접 호출처가 확인되지 않음(잠재 데드코드)

**수정 방안**:
```typescript
removeTabPair: (elementId) => {
  // 0) 호출처가 없으면 API 제거(권장)
  // 1) 호출처가 있으면 표준 삭제 경로로 위임하여
  //    history(addEntry) + DB 삭제 + 인덱스 재구축 + postMessage를 일원화
  void get().removeElement(elementId);
},
```

**대안 (유지 필요 시)**:
- `removeTabPair`를 유지해야 한다면 내부에서 `historyManager.addEntry`를 사용하고 `_rebuildIndexes()`를 보장한다.
- 신규 로직 추가보다 `removeElement` 위임을 우선한다(회귀 위험 최소화).

**검증**:
- 호출처 검색: 없으면 API 제거 후 타입체크 통과
- Tab 삭제 후 `elementsMap.get(deletedId)` === undefined
- Ctrl+Z로 Tab 복구 가능
- 새로고침 후 Tab 삭제 상태 유지

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
```typescript
const MAX_TREE_DEPTH = 100;
const visiting = new Set<string>();
const visited = new Set<string>();

function traversePostOrder(
  elementId: string,
  // ... 기존 파라미터 ...
  depth: number = 0,  // 추가
): void {
  // 순환 참조 감지 (A -> ... -> A)
  if (visiting.has(elementId)) {
    if (import.meta.env.DEV) {
      console.warn(`[fullTreeLayout] Cycle detected at ${elementId}`);
    }
    return;
  }
  if (visited.has(elementId)) return;

  if (depth > MAX_TREE_DEPTH) {
    if (import.meta.env.DEV) {
      console.warn(`[fullTreeLayout] Max depth ${MAX_TREE_DEPTH} exceeded for ${elementId}`);
    }
    return;
  }

  visiting.add(elementId);
  // ... 기존 로직 ...
  for (const childId of childIds) {
    traversePostOrder(childId, ..., depth + 1);
  }
  visiting.delete(elementId);
  visited.add(elementId);
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

### P1-1. CSS `order` 속성 Rust 전달

**파일**: `apps/builder/src/builder/workspace/canvas/wasm/src/taffy_bridge.rs` (라인 22-91)

**현상**: `StyleInput` struct에 `order` 필드 없음. JS 측(`TaffyFlexEngine`, `buildNodeStyle`)은 `order`를 생성하지만 Rust bridge에서 누락되어 최종 반영되지 않음.

**수정 방안**:
```rust
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StyleInput {
    // ... 기존 필드 ...
    order: Option<i32>,  // 추가
}

// to_taffy_style() 내부:
if let Some(order) = input.order {
    style.order = order as i16;
}
```

**JS 측 조치**:
- 신규 구현보다 회귀 방지 테스트 추가를 우선한다.
- `buildNodeStyle` 결과 JSON에 `order`가 포함되는지 스냅샷/단위 테스트로 고정한다.

**검증**:
- `order: 2` 설정된 flex 아이템이 올바른 위치에 렌더링
- `wasm:build` → 타입체크 통과

---

### P1-2. WASM 실패 시 사용자 알림 UI

**파일**: `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` (라인 1139-1148)

**현상**: WASM 실패 시 200ms 폴링이 영구적으로 계속되며, 캔버스에 요소가 배치되지 않아 빈 화면 표시. 사용자에게 아무런 피드백 없음.

**수정 방안**:
```typescript
// 1. 폴링 횟수 제한 + 사용자 알림 상태
const [wasmLayoutFailed, setWasmLayoutFailed] = useState(false);

useEffect(() => {
  if (wasmLayoutReady) return;
  let attempts = 0;
  const MAX_ATTEMPTS = 25; // 5초 (200ms × 25)
  const id = setInterval(() => {
    attempts++;
    if (isRustWasmReady()) {
      setWasmLayoutReady(true);
      clearInterval(id);
    } else if (attempts >= MAX_ATTEMPTS) {
      clearInterval(id);
      setWasmLayoutFailed(true);
      // 토스트/배너/오버레이 중 1개는 실제로 렌더링해야 함
    }
  }, 200);
  return () => clearInterval(id);
}, [wasmLayoutReady]);

// 2. 캔버스 상단 배너(예시)
{wasmLayoutFailed && (
  <CanvasErrorBanner message="레이아웃 엔진 로드에 실패했습니다. 새로고침 후 다시 시도해주세요." />
)}
```

**검증**:
- WASM 의도적 실패 시 5초 후 폴링 중단 + 사용자 가시 알림 표시
- 정상 로드 시 기존 동작 유지

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

### P2-2. messageHandler srcdoc 메시지 수신 검증 강화

**파일**: `apps/builder/src/preview/messaging/messageHandler.ts` (라인 25-32)

**현상**: srcdoc iframe에서 `targetOrigin: '*'` 사용. 의도적 설계이나, 메시지에 민감 데이터 포함 시 보안 위험.

**수정 방안**:
- `targetOrigin`은 기존 정책을 유지하되, 수신 측 검증을 강화한다.
- 특히 `origin === 'null'` 허용 방식은 사용하지 않는다.

**수신 측 강화** (builder 측 메시지 핸들러):
```typescript
const ALLOWED_PREVIEW_MESSAGE_TYPES = new Set([
  'PREVIEW_READY',
  'ELEMENT_SELECTED',
  'ELEMENTS_DRAG_SELECTED',
  'DELTA_ACK',
  // 필요한 타입만 명시
]);

window.addEventListener('message', (event) => {
  const iframe = MessageService.getIframe();
  if (!iframe?.contentWindow) return;

  // 1) source 고정: 현재 preview iframe에서 온 메시지만 허용
  if (event.source !== iframe.contentWindow) return;
  // 2) origin 검증: same-origin만 허용
  if (event.origin !== window.location.origin) return;
  // 3) 타입 화이트리스트
  if (!ALLOWED_PREVIEW_MESSAGE_TYPES.has(event.data?.type)) return;

  // ... 안전한 메시지 처리
});
```

**추가 정리**:
- Preview 측 `sendReady()`의 `'*'` 전송도 `getTargetOrigin()` 사용으로 통일한다.

**검증**:
- 외부 origin에서 보낸 메시지가 무시되는지 확인
- 다른 window/source에서 보낸 동일 타입 메시지가 무시되는지 확인
- 정상 preview ↔ builder 통신 유지

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
├── P0-1. removeTabPair 수정 (독립)
├── P0-2. NaN/Infinity 가드 + 계측 (독립)
├── P0-3. _sharedLayoutMap 초기화 (독립)
└── P0-4. DFS depth guard + cycle guard (독립)

P1 (단기, 3~5일) ← P0 완료 후
├── P1-1. CSS order Rust 전달 (독립, wasm:build 필요)
├── P1-2. WASM 실패 알림 UI (독립)
└── P1-3. collectElementsToRemove childrenMap (독립)

P2 (중기, 3~5일) ← P1 완료 후
├── P2-1. Paragraph 캐시 동적 조정 (독립)
├── P2-2. 메시지 수신 검증 강화(source/origin/type) (독립)
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

- `removeTabPair` → 호출처 감사(미사용 시 제거) 또는 `removeElement` 위임 후 Tab 삭제/복구/새로고침 시나리오
- NaN 가드 → 의도적 NaN 입력 시 0 폴백 확인
- 순환 참조 + 깊이 제한 → A→B→A, 100+ depth 트리에서 경고 + 크래시 없음

### 자동화 테스트 추가 (필수)

1. `elements` 스토어 테스트: Tab/Panel 삭제 시 인덱스/히스토리/선택 상태 정합성 검증
2. `fullTreeLayout` 테스트: non-finite 값 sanitize, cycle guard, depth guard 회귀 테스트
3. `message` 보안 테스트: `event.source`/`event.origin`/타입 화이트리스트 검증
4. `wasm bridge` 테스트: `order` 필드 직렬화/역직렬화 및 렌더 순서 검증

### P3 성능 검증

- Chrome DevTools Performance 탭에서 5,000 요소 시나리오 프로파일링
- 프레임 드롭 카운트: 연속 60fps 유지 확인 (30초 카메라 팬)
- `console.time` 기반 DFS 시간 측정: dirty tracking 전후 비교

---

## Consequences

### Positive
- 데이터 무결성 보장 (removeTabPair 인덱스/히스토리)
- 런타임 안정성 향상 (NaN 가드, depth 제한, stale map 방지)
- CSS 스펙 준수 개선 (order 속성, vertical-align)
- iframe 메시지 수신 경계 강화 (source/origin/type 검증)
- 대규모 캔버스 성능 기반 마련 (P3 최적화)

### Negative
- P0~P2: 추가 코드량 적음 (~100줄), 유지보수 비용 미미
- P3: 아키텍처 변경 필요 (dirty tracking, R-tree), 복잡도 증가
- P3-3 해시 대체: 충돌 가능성 (극히 낮지만 존재)

### Risks
- P1-1 (CSS order): wasm 빌드 필요, Rust 코드 변경
- P3-1 (dirty tracking): store 슬라이스 구조 변경 필요, 영향 범위 넓음
- P3-2 (R-tree): 외부 라이브러리 의존성 추가

---

## References

- [ADR-005: Full-Tree WASM Layout](./005-full-tree-wasm-layout.md)
- [ADR-003: Canvas Rendering](./003-canvas-rendering.md)
- [ADR-001: State Management](./001-state-management.md)
- [Taffy 0.9 Documentation](https://github.com/DioxusLabs/taffy)
- [RBush R-tree](https://github.com/mourner/rbush)
