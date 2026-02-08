# WebGL Workflow Integration - Analysis & Implementation Plan

> **Status**: 분석 완료, 전체 Phase 미구현 (계획 수립 단계)
>
> **목표**: `@xyflow/react` 기반 별도 화면 전환 → WebGL 캔버스 내 네이티브 CanvasKit 렌더링으로 통합

---

## 1. 현재 아키텍처 분석

### 1.1 기존 Workflow 시스템 (`apps/builder/src/workflow/`)

```
workflow/
├── types/index.ts          (262줄)  # ReactFlow 기반 타입 정의
├── store/workflowStore.ts  (694줄)  # Zustand 스토어 + 그래프 빌드 로직
├── components/
│   ├── WorkflowCanvas.tsx  (154줄)  # @xyflow/react 캔버스
│   └── WorkflowToolbar.tsx  (93줄)  # 시각화 토글 툴바
├── nodes/
│   ├── PageNode.tsx         (78줄)  # 페이지 노드 컴포넌트
│   ├── LayoutNode.tsx       (72줄)  # 레이아웃 노드 컴포넌트
│   └── DataSourceNode.tsx   (88줄)  # 데이터 소스 노드 컴포넌트
├── utils/autoLayout.ts      (96줄)  # Dagre 기반 자동 레이아웃
└── styles/workflow.css     (496줄)  # ReactFlow 스타일
                            ─────
                        합계: 1,544줄 + 496줄 CSS
```

#### 외부 의존성

| 패키지 | 버전 | 역할 | 번들 크기 (gzip) |
|--------|------|------|-----------------|
| `@xyflow/react` | ^12.10.0 | ReactFlow 캔버스 | ~45KB |
| `@dagrejs/dagre` | ^1.1.8 | DAG 자동 레이아웃 | ~15KB |

#### 기존 동작 방식

```
BuilderCore (viewMode === 'workflow')
    ↓ 화면 전환 (WebGL 캔버스 완전 숨김)
BuilderWorkflow (bridge 컴포넌트)
    ├── useWorkflowSync (3개 useEffect로 데이터 동기화)
    │   ├── pages → WorkflowPage[] 변환
    │   ├── layouts → WorkflowLayout[] 변환
    │   └── elements → WorkflowElement[] 변환 (events, dataBinding 추출)
    ├── WorkflowToolbar (6개 토글 버튼)
    └── WorkflowCanvas (@xyflow/react)
        ├── PageNode, LayoutNode, DataSourceNode
        ├── MiniMap, Controls, Background
        └── postMessage('WORKFLOW_SELECT_PAGE') on click
```

#### 문제점

1. **화면 전환 비용**: WebGL 캔버스 언마운트/리마운트 시 Surface 재생성 (~100ms)
2. **중복 렌더링**: 페이지 프레임이 이미 WebGL에서 렌더링되는데 ReactFlow에서 작은 노드로 다시 표현
3. **컨텍스트 단절**: 워크플로우 뷰에서는 실제 페이지 디자인을 볼 수 없음
4. **외부 의존성**: @xyflow/react + dagre 추가 번들 (~60KB gzip)
5. **DOM 기반 렌더링**: ReactFlow는 DOM 노드 기반 → WebGL 대비 성능 한계

---

### 1.2 WebGL 캔버스 시스템

#### 듀얼 캔버스 아키텍처

```
┌─────────────────────────────────────────────┐
│  CanvasKit/Skia Canvas (z-index: 2)         │  ← 시각적 렌더링
│  ┌───────────────────────────────────────┐   │
│  │ Content Layer (cached snapshot)       │   │
│  │  └─ 디자인 노드 (Box, Text, Image)    │   │
│  ├───────────────────────────────────────┤   │
│  │ Overlay Layer                         │   │
│  │  ├─ AI 이펙트 (generating, flash)     │   │
│  │  ├─ 페이지 타이틀                     │   │
│  │  ├─ 워크플로우 엣지 (NEW)             │   │
│  │  └─ 셀렉션 (box, handles, lasso)     │   │
│  └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  PixiJS Canvas (z-index: 3, alpha=0)        │  ← 이벤트 전용
│  └─ EventBoundary (hitArea, pointer events) │
└─────────────────────────────────────────────┘
```

#### 멀티 페이지 렌더링

```
Scene Graph (Camera 내부):

Camera Container (pan/zoom)
├── Page-1 (x=0, y=0)
│   ├── TitleHitArea
│   ├── BodyLayer (배경/테두리)
│   └── ElementsLayer (자식 요소)
├── Page-2 (x=pageWidth+80, y=0)
│   └── ...
├── Page-3 (x=2*(pageWidth+80), y=0)
│   └── ...
└── SelectionLayer
```

**핵심 사실**: 모든 페이지가 `pagePositions`로 동시 렌더링되며, 각 페이지의 정확한 좌표(x, y, width, height)를 이미 알고 있음.

#### SkiaRenderer 프레임 분류

| 프레임 타입 | 조건 | 비용 | 설명 |
|-----------|------|------|------|
| `idle` | 변경 없음 | ~0.1ms | 렌더링 스킵 |
| `present` | overlayVersion만 변경 | ~1-2ms | snapshot blit + overlay |
| `camera-only` | 카메라만 변경 | ~1-2ms | affine transform + overlay |
| `content` | registryVersion 변경 | ~10-30ms | 콘텐츠 재렌더 |
| `full` | resize/cleanup | ~10-30ms | 전체 재구축 |

**워크플로우 오버레이 성능**: 토글 시 `present` 프레임 → ~1-2ms 추가 비용만 발생.

#### Skia 오버레이 렌더러 패턴

```typescript
// 모든 Skia 렌더러의 공통 패턴
export function renderXxx(
  ck: CanvasKit,           // CanvasKit 인스턴스
  canvas: Canvas,          // 렌더링 대상 캔버스
  data: DataType,          // 렌더링 데이터
  zoom: number,            // 줌 레벨 (screen-space invariant 계산용)
  fontMgr?: FontMgr,       // 텍스트 렌더링용 폰트 매니저
): void {
  const scope = new SkiaDisposable();  // 리소스 자동 정리
  try {
    const sw = N / zoom;               // 화면상 N px 유지
    // ... CanvasKit 렌더링 ...
  } finally {
    scope.dispose();                   // GPU 리소스 해제
  }
}
```

---

## 2. 통합 설계

### 2.1 목표 아키텍처

```
BuilderCore
├── BuilderHeader
│   └── GitBranch 토글 버튼 → showWorkflowOverlay 토글
└── Workspace (WebGL Canvas - 항상 표시)
    ├── BuilderCanvas (PixiJS 씬 그래프)
    │   └── 모든 페이지 동시 렌더링 (pagePositions)
    └── SkiaOverlay
        └── Overlay Layer
            ├── AI 이펙트
            ├── 페이지 타이틀
            ├── [Phase 1] 워크플로우 엣지 (navigation, event)
            ├── [Phase 2] 데이터 바인딩 엣지, 레이아웃 그룹
            ├── [Phase 3] 인터랙티브 호버/클릭
            ├── [Phase 4] 미니맵, 레전드 패널
            └── 셀렉션 오버레이
```

### 2.2 레이어 렌더링 순서

```
renderer.setOverlayNode({
  renderSkia(canvas, bounds) {
    // 1. AI 이펙트 (가장 아래)
    renderGeneratingEffects(...)
    renderFlashes(...)

    // 2. 페이지 타이틀
    renderPageTitle(...)

    // 3. 워크플로우 엣지 (Phase 1~2)
    if (showWorkflowOverlay) {
      renderWorkflowEdges(...)          // Phase 1: navigation + event
      renderDataBindingEdges(...)       // Phase 2: data source 연결
      renderLayoutGroupOverlay(...)     // Phase 2: 레이아웃 그룹 표시
    }

    // 4. 셀렉션 오버레이 (가장 위)
    renderSelectionBox(...)
    renderTransformHandles(...)
  }
})
```

---

## 3. 구현 계획

### Phase 1: 기본 엣지 오버레이 (계획)

**범위**: Navigation + Event-navigation 엣지를 CanvasKit으로 렌더링

#### 변경 대상 파일

| 파일 | 변경 | 역할 |
|------|------|------|
| `skia/workflowEdges.ts` | 신규 | Element에서 페이지 간 연결 추출 |
| `skia/workflowRenderer.ts` | 신규 | Bezier 커브 + 화살표 CanvasKit 렌더링 |
| `skia/SkiaOverlay.tsx` | 수정 | 워크플로우 렌더링 파이프라인 통합 |
| `stores/canvasSettings.ts` | 수정 | `showWorkflowOverlay` 상태 추가 |
| `main/BuilderHeader.tsx` | 수정 | GitBranch 버튼 → 오버레이 토글 |
| `main/BuilderCore.tsx` | 수정 | 별도 워크플로우 뷰 제거, 캔버스 항상 표시 |

#### 데이터 흐름

```
Store (pages, elements)
    ↓ registryVersion 변경 감지
computeWorkflowEdges(pages, elements)
    ├── extractNavigationLinks(): Link/a/Button href → slug 매칭
    └── extractEventNavigations(): event.actions[].navigate → slug 매칭
    ↓
WorkflowEdge[] (캐시됨, workflowEdgesRef)
    ↓ showWorkflowOverlay === true
renderWorkflowEdges(ck, canvas, edges, pageFrameMap, zoom)
    ├── computeEndpoints(): 최단 경로 앵커 (상/하/좌/우)
    ├── cubicTo(): Bezier 커브
    ├── drawArrowHead(): 방향 화살표
    └── drawText(): 레이블 (선택적)
```

#### 엣지 스타일

| 타입 | 색상 | 스타일 | 레이블 |
|------|------|--------|--------|
| `navigation` | blue-500 (#3b82f6) | Solid, 2px | "Link" |
| `event-navigation` | purple-500 (#a855f7) | Dashed [6,4], 2px | 이벤트 타입 |

#### 앵커 포인트 계산

```
페이지 A가 페이지 B의 왼쪽에 있을 때:
  A의 오른쪽 중앙 → B의 왼쪽 중앙

페이지 A가 페이지 B의 위에 있을 때:
  A의 하단 중앙 → B의 상단 중앙

→ Math.abs(dx) > Math.abs(dy) 판별로 수평/수직 자동 결정
```

#### 성능 특성

- **엣지 계산**: O(pages × elements) — registryVersion 변경 시에만 실행
- **렌더링**: O(edges) — overlay layer의 일부, `present` 프레임 타입
- **메모리**: workflowEdgesRef에 캐시, 매 프레임 재계산하지 않음
- **프레임 비용**: 토글 변경 시 ~1-2ms (present 프레임)

---

### Phase 2: 데이터 바인딩 & 레이아웃 (계획)

**범위**: Data Source 연결, Layout 그룹 시각화

#### 2.1 데이터 바인딩 엣지

기존 `workflowStore.ts`의 `extractDataSources()` 로직을 재사용하여:

```typescript
// workflowEdges.ts 확장
export interface DataSourceEdge {
  dataSourceId: string;
  dataSourceName: string;
  sourceType: 'dataTable' | 'api' | 'supabase' | 'mock';
  targetPageIds: string[];
}

export function computeDataSourceEdges(
  elements: Element[],
  pages: Page[],
): DataSourceEdge[];
```

**렌더링 스타일**:
| 타입 | 색상 | 스타일 |
|------|------|--------|
| `dataTable` | green-500 (#22c55e) | Dotted [3,3] |
| `api` | amber-500 (#f59e0b) | Dotted [3,3] |
| `supabase` | emerald-500 (#10b981) | Dotted [3,3] |
| `mock` | gray-400 (#9ca3af) | Dotted [3,3] |

**Data Source 노드 렌더링**:
- 페이지 프레임 상단에 작은 아이콘+레이블로 데이터 소스 표시
- 해당 페이지까지 dotted 커브로 연결

#### 2.2 레이아웃 그룹 시각화

같은 Layout을 사용하는 페이지들을 시각적으로 그룹화:

```typescript
// workflowRenderer.ts 확장
export function renderLayoutGroups(
  ck: CanvasKit,
  canvas: Canvas,
  layoutGroups: Map<string, string[]>,  // layoutId → pageIds
  pageFrameMap: Map<string, PageFrame>,
  zoom: number,
): void;
```

**렌더링**:
- 같은 Layout을 사용하는 페이지들 주위에 둥근 점선 사각형
- 상단에 Layout 이름 레이블
- 반투명 배경 (secondary color, opacity 0.05)

#### 2.3 토글 컨트롤

```typescript
// canvasSettings.ts 확장
interface SettingsState {
  showWorkflowOverlay: boolean;
  // Phase 2 추가
  showWorkflowNavigation: boolean;     // navigation 엣지
  showWorkflowEvents: boolean;         // event-navigation 엣지
  showWorkflowDataSources: boolean;    // data source 연결
  showWorkflowLayoutGroups: boolean;   // layout 그룹
}
```

**UI**: BuilderHeader의 워크플로우 버튼 옆에 세부 토글 드롭다운 추가

---

### Phase 3: 인터랙티브 기능 (계획)

**범위**: 호버, 클릭, 하이라이트 상호작용

#### 3.1 엣지 호버 하이라이트

```
PixiJS 이벤트 레이어에서 마우스 위치 감지
    ↓
Scene-local 좌표로 변환
    ↓
각 엣지의 Bezier 커브와 거리 계산 (point-to-curve distance)
    ↓
가장 가까운 엣지 하이라이트 (strokeWidth 증가 + opacity 증가)
    ↓
연결된 source/target 페이지 프레임 하이라이트
```

**구현 방향**:
- PixiJS의 `pointermove` 이벤트에서 좌표 추출
- 엣지 히트 테스트: Bezier 커브의 sample points와 마우스 거리 비교
- 히트 거리 임계값: `10 / zoom` (screen-space 10px)

#### 3.2 페이지 클릭 네비게이션

현재 `WORKFLOW_SELECT_PAGE` postMessage를 대체:

```typescript
// 워크플로우 오버레이 활성 상태에서 페이지 프레임 클릭 시
// → 해당 페이지로 포커스 이동 (camera pan + zoom)
// → currentPageId 설정
// → 연결된 엣지 하이라이트
```

#### 3.3 연결 경로 하이라이트

특정 페이지 선택 시 연결 경로를 시각적으로 강조:

```
Page A 선택
    ↓
A → B (navigation)     → 밝은 파란색, 굵은 선
A → C (event)          → 밝은 보라색, 굵은 선
B → D (navigation)     → 연한 파란색 (2차 연결)
나머지 엣지             → 매우 연하게 (opacity 0.15)
```

---

### Phase 4: 고급 UI 기능 (계획)

**범위**: 미니맵, 레전드, 요약 패널

#### 4.1 워크플로우 미니맵

```
┌─────────────┐
│ ■ ■ ■ ■     │  ← 페이지 프레임 축소 표시
│  ╲╱ ╲╱      │  ← 엣지 연결
│ ■ ■ ■       │
│   [카메라]    │  ← 현재 뷰포트 영역
└─────────────┘
```

- SkiaOverlay의 별도 렌더 패스로 구현
- 화면 우하단에 고정 위치 (screen-space)
- 미니맵 클릭으로 카메라 이동

#### 4.2 워크플로우 레전드

```
┌───────────────────────┐
│ ● ━━━  Navigation     │
│ ● ┅┅┅  Event          │
│ ● ···  Data Binding   │
│ ┌┄┐ Layout Group      │
└───────────────────────┘
```

- 화면 좌하단 고정 위치 (screen-space)
- 활성 토글만 표시

#### 4.3 페이지 요약 패널

워크플로우 오버레이 활성 시 페이지 선택하면 요약 정보 표시:

```
┌─────────────────────────┐
│ Home Page               │
│ /home                   │
│ ───────────────────     │
│ Elements: 24            │
│ Links to: About, Contact│
│ Layout: DefaultLayout   │
│ Data: UserTable (API)   │
└─────────────────────────┘
```

---

## 4. 마이그레이션 전략

### 4.1 단계적 접근

```
Phase 1                           Phase 2                        Phase 3~4
┌─────────────────┐    ┌─────────────────────────┐    ┌──────────────────────┐
│ 기본 엣지        │    │ 데이터+레이아웃 연결     │    │ 인터랙션+고급 UI     │
│ navigation edge  │ → │ data source edges       │ → │ hover highlight      │
│ event edge       │    │ layout group overlay    │    │ click navigation     │
│ 토글 버튼        │    │ 세부 토글 드롭다운       │    │ minimap, legend      │
└─────────────────┘    └─────────────────────────┘    └──────────────────────┘
```

### 4.2 기존 Workflow 코드 처리

| 단계 | 조건 | 조치 |
|------|------|------|
| Phase 1 | 기본 엣지 동작 확인 | 기존 코드 유지 (fallback) |
| Phase 2 | 데이터/레이아웃 기능 동등 | `BuilderWorkflow.tsx` 제거 |
| Phase 3 | 인터랙션 기능 동등 | `workflow/components/` 제거 |
| Phase 4 | 고급 UI 완료 | `@xyflow/react`, `dagre` 의존성 제거 |

### 4.3 제거 대상 파일 (최종)

```
apps/builder/src/workflow/           # 전체 디렉토리
├── types/index.ts
├── store/workflowStore.ts
├── store/index.ts
├── components/WorkflowCanvas.tsx
├── components/WorkflowToolbar.tsx
├── components/index.ts
├── nodes/PageNode.tsx
├── nodes/LayoutNode.tsx
├── nodes/DataSourceNode.tsx
├── nodes/index.ts
├── utils/autoLayout.ts
├── utils/index.ts
└── styles/workflow.css

apps/builder/src/builder/main/BuilderWorkflow.tsx  # bridge 컴포넌트

package.json 의존성:
- @xyflow/react
- @dagrejs/dagre
```

**예상 절감**:
- 코드: ~2,000줄 삭제
- CSS: ~500줄 삭제
- 번들: ~60KB gzip 감소

---

## 5. 기술 상세

### 5.1 워크플로우 엣지 계산 (`workflowEdges.ts`)

#### Navigation Link 감지

```typescript
// Element의 props에서 내부 링크 추출
// 대상 태그: Link, a, Button (case-insensitive)
// 대상 속성: href, to, path, url, link.href
// 필터: http로 시작하면 외부 링크 → 스킵
//       #으로 시작하면 앵커 → 스킵

const href = props.href || props.to || props.path || props.url || props.link?.href;
if (isNavigableTag && href && !href.startsWith('http') && !href.startsWith('#')) {
  const cleanHref = normalizeSlug(href);
  const targetPageId = slugMap.get(cleanHref);
  if (targetPageId && targetPageId !== pageId) links.push(targetPageId);
}
```

#### Event Navigate 감지

```typescript
// Element의 events[].actions[].type === 'navigate' 탐지
// 경로 추출: config.path/href/to/url 또는 value.path/href/to/url
// 두 가지 형식 지원:
//   1. Block Editor: action.config.path
//   2. Legacy: action.value.path

for (const action of event.actions) {
  if (action.type !== 'navigate' || action.enabled === false) continue;
  const path = action.config?.path || action.value?.path || ...;
  // slug 정규화 후 pageId 매칭
}
```

#### Slug 정규화

```typescript
// "/home?q=1#section" → "home"
// "/about/"          → "about"
// "contact"          → "contact"
function normalizeSlug(slug?: string | null): string {
  if (!slug) return '';
  return slug.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '');
}
```

### 5.2 CanvasKit 렌더링 (`workflowRenderer.ts`)

#### Bezier 커브 계산

```
Source Page             Target Page
┌──────┐               ┌──────┐
│      │→ sx,sy ~~~→ ~~~→ ex,ey │
│      │    ╲         ╱   │      │
│      │     CP1    CP2   │      │
└──────┘               └──────┘

Control Point 계산 (수평 연결 시):
  cpx1 = sx + dist * 0.4    (source에서 40% 거리)
  cpy1 = sy                  (수평 유지)
  cpx2 = ex - dist * 0.4    (target에서 40% 거리)
  cpy2 = ey                  (수평 유지)

Canvas API:
  path.moveTo(sx, sy)
  path.cubicTo(cpx1, cpy1, cpx2, cpy2, ex, ey)
```

#### 화살표 머리

```
    ex, ey (끝점)
      ╱╲
     ╱  ╲
    ╱    ╲      angle = atan2(ey - cpy2, ex - cpx2)
   ╱──────╲     size = ARROW_SIZE / zoom (screen-space 8px)
  P1      P2

  P1 = (ex + size*cos(angle + 0.8π), ey + size*sin(angle + 0.8π))
  P2 = (ex + size*cos(angle - 0.8π), ey + size*sin(angle - 0.8π))
```

#### Screen-Space Invariant

```typescript
// 모든 크기를 zoom으로 나누어 화면상 일정 크기 유지
const sw = EDGE_STROKE_WIDTH / zoom;   // 2px → 항상 화면상 2px
const arrowSize = ARROW_SIZE / zoom;    // 8px → 항상 화면상 8px
const fontSize = LABEL_FONT_SIZE / zoom; // 10px → 항상 화면상 10px
const dashLen = 6 / zoom;               // dash 패턴도 일정
```

### 5.3 SkiaOverlay 통합

#### 변경 감지 흐름

```
매 프레임 (renderFrame ticker, priority -50):
    ↓
showWorkflowOverlay 토글 감지
    → overlayVersionRef++ (present 프레임 트리거)
    ↓
registryVersion 변경 감지 (요소 추가/삭제/수정)
    → computeWorkflowEdges() 재실행
    → workflowEdgesRef.current 갱신
    → overlayVersionRef++ (present 프레임 트리거)
    ↓
SkiaRenderer.classifyFrame():
    overlayVersion만 변경 → 'present' (1-2ms)
    registryVersion 변경 → 'content' (10-30ms, 콘텐츠 + 오버레이)
```

#### 캐시 전략

```typescript
// 매 프레임 재계산하지 않음
const workflowEdgesRef = useRef<WorkflowEdge[]>([]);
const workflowEdgesVersionRef = useRef(-1);  // registryVersion 기반 캐시 키

// registryVersion이 변경될 때만 재계산
if (showWorkflow && registryVersion !== workflowEdgesVersionRef.current) {
  workflowEdgesRef.current = computeWorkflowEdges(allPages, allElements);
  workflowEdgesVersionRef.current = registryVersion;
}
```

---

## 6. 비교 분석

### 6.1 기존 vs 새 아키텍처

| 항목 | 기존 (@xyflow/react) | 새 (CanvasKit 오버레이) |
|------|---------------------|----------------------|
| **렌더링 엔진** | DOM (React 노드) | WebGL (CanvasKit) |
| **전환 방식** | 화면 전환 (언마운트/마운트) | 오버레이 토글 (즉시) |
| **페이지 표시** | 작은 노드 아이콘 | 실제 디자인 + 연결선 |
| **카메라** | 별도 ReactFlow 카메라 | 기존 WebGL 카메라 공유 |
| **번들 크기** | +~60KB (xyflow + dagre) | +~500줄 (~3KB) |
| **프레임 비용** | N/A (DOM) | ~1-2ms (present 프레임) |
| **데이터 동기화** | 3개 useEffect 브리지 | 직접 store 접근 |

### 6.2 성능 비교

| 시나리오 | 기존 | 새 |
|---------|------|------|
| 토글 ON | ~200ms (DOM 마운트 + ReactFlow 초기화) | ~1ms (overlayVersion++) |
| 토글 OFF | ~100ms (DOM 언마운트) | ~0.1ms (idle 프레임) |
| Pan/Zoom | ReactFlow 자체 처리 | 기존 카메라 그대로 |
| 요소 변경 | useEffect 동기화 대기 | 즉시 registryVersion 감지 |

---

## 7. 참조

### 관련 ADR
- [ADR-003: Canvas Rendering](docs/adr/003-canvas-rendering.md) - CanvasKit/Skia 선택 이유
- [ADR-001: State Management](docs/adr/001-state-management.md) - Zustand 슬라이스 패턴

### 기존 시스템 파일
- `apps/builder/src/workflow/` — 기존 ReactFlow 워크플로우 전체 디렉토리
- `apps/builder/src/builder/main/BuilderWorkflow.tsx` — 기존 bridge 컴포넌트
- `apps/builder/src/builder/stores/canvasSettings.ts` — viewMode 상태 관리

### 통합 대상 파일 (수정/생성 예정)
- `apps/builder/src/builder/workspace/canvas/skia/SkiaOverlay.tsx` — 오버레이 파이프라인
- `apps/builder/src/builder/workspace/canvas/skia/SkiaRenderer.ts` — 프레임 분류/캐싱
- `apps/builder/src/builder/workspace/canvas/skia/selectionRenderer.ts` — 렌더러 패턴 참조
- `apps/builder/src/builder/workspace/canvas/skia/aiEffects.ts` — 렌더러 패턴 참조
