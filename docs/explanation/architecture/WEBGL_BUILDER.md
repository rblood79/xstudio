# Phase 10: WebGL Builder Architecture

> **작성일**: 2025-12-11
> **최종 수정**: 2025-12-11 (리뷰 체크리스트 반영: 동기화 시퀀스, Scene 스키마, Context Lost, 텍스처 캐시)
> **상태**: 계획 (Plan)
> **관련 문서**: [02-architecture.md](./02-architecture.md) | [task.md](./task.md)

---

## 1. Executive Summary

### 1.1 현재 상태
```
┌─────────────────────────────────────────────────────────────┐
│                     현재 XStudio 아키텍처                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌───────────────────┐    postMessage    ┌───────────────┐  │
│   │   Builder (React) │◄──────────────────►│ Canvas iframe │  │
│   │   - Sidebar       │                    │ (React DOM)   │  │
│   │   - Inspector     │                    │ - Preview     │  │
│   │   - Panels        │                    │ - Publish 겸용│  │
│   └───────────────────┘                    └───────────────┘  │
│                                                               │
│   문제점:                                                      │
│   - DOM 기반 렌더링 (5,000개 요소에서 병목)                      │
│   - Preview와 Publish가 동일한 렌더러 사용                       │
│   - 복잡한 postMessage 동기화                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 목표 상태 (Phase 10 완료 후)
```
┌─────────────────────────────────────────────────────────────┐
│                   목표 XStudio 아키텍처                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              WebGL Builder (PixiJS/React)            │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│   │  │ Sidebar  │  │ WebGL Canvas │  │  Inspector   │   │   │
│   │  │ (React)  │  │  (Pixi/GPU)  │  │   (React)    │   │   │
│   │  └──────────┘  └──────────────┘  └──────────────┘   │   │
│   │                        ▲                              │   │
│   │                        │ Direct State                 │   │
│   │                        │ (no postMessage)             │   │
│   │                        ▼                              │   │
│   │  ┌──────────────────────────────────────────────┐    │   │
│   │  │              Zustand Store                    │    │   │
│   │  └──────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                              │ Export/Publish                │
│                              ▼                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Publish App (React DOM)                 │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │  - 순수 React Aria Components                        │   │
│   │  - SEO 최적화 가능                                    │   │
│   │  - 접근성 완벽 지원                                   │   │
│   │  - 기존 Canvas/iframe 코드 재활용                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 모노레포 구조 (제안 - 미확정)

> **⚠️ 현재 상태**: npm 단일 패키지 구조
>
> **전제 조건** (마이그레이션 전 필수):
> - [ ] pnpm 도입 및 workspace 설정
> - [ ] 패키지 분리 (builder/publish/shared)
> - [ ] CI/CD 파이프라인 수정 (빌드/테스트/배포 분리)
> - [ ] 의존성 호이스팅 정책 결정
> - [ ] 기존 import 경로 마이그레이션 스크립트 작성

```
xstudio/
├── packages/
│   ├── builder/                 ← 현재 src/ 내용 이전
│   │   ├── workspace/           ← 메인 편집 영역
│   │   │   ├── canvas/          ← WebGL Canvas (PixiJS)
│   │   │   │   ├── BuilderCanvas.tsx
│   │   │   │   ├── sprites/
│   │   │   │   ├── selection/
│   │   │   │   └── grid/
│   │   │   ├── overlay/         ← DOM 오버레이 (Text Input 등)
│   │   │   │   ├── TextEditOverlay.tsx
│   │   │   │   └── ContextMenu.tsx
│   │   │   └── Workspace.tsx
│   │   │
│   │   ├── workflow/            ← 삭제됨 (CanvasKit 오버레이로 대체)
│   │   ├── sidebar/
│   │   ├── inspector/
│   │   ├── panels/
│   │   ├── stores/
│   │   └── ...
│   │
│   ├── publish/                 ← 🆕 Publish App (별도 프로젝트)
│   │   ├── App.tsx
│   │   ├── PageRenderer.tsx
│   │   ├── components/          ← src/canvas/renderers/* 이전
│   │   │   └── ComponentRegistry.ts
│   │   └── ...
│   │
│   └── shared/                  ← 공통 코드
│       ├── components/          ← React Aria Components
│       └── types/
│           └── scene.ts         ← 공통 Scene 스키마 (Element, Transform, Styling)
│
├── package.json
└── pnpm-workspace.yaml
```

### 1.4 전제 조건 (Prerequisites)

> **⚠️ Phase 10 착수 전 반드시 확인 필요**

#### 기술 전제 조건

| 전제 조건 | 현재 상태 | 필요 작업 | 리스크 |
|----------|----------|----------|-------|
| **React 19 호환성** | ✅ 사용 중 | @pixi/react가 React 19 지원 확인 | 낮음 |
| **@pixi/react v8 안정성** | ❓ 미확인 | v8 RC/Stable 릴리즈 대기 또는 v7 사용 검토 | 중간 |
| **빌드 도구 변경** | Vite | WebGL 번들링, Worker 설정 확인 | 낮음 |
| **pnpm workspace 전환** | npm 단일 | pnpm 도입 + workspace 설정 | 중간 |

#### 데이터/테스트 전제 조건

| 전제 조건 | 설명 | 확인 방법 |
|----------|-----|----------|
| **Scene 스키마 호환성** | Builder/Publish 간 데이터 교차 테스트 | E2E 테스트 작성 |
| **기존 프로젝트 마이그레이션** | DB 스키마 변경 없이 로드 가능 확인 | 마이그레이션 스크립트 |
| **성능 베이스라인** | Phase 10 전/후 비교를 위한 실측값 | `scripts/perf-benchmark.ts` |

### 1.5 롤백 시나리오

> **Critical**: WebGL 전환 실패 시 즉시 복구 가능해야 함

#### Feature Flag 기반 점진적 전환

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_WEBGL_CANVAS: import.meta.env.VITE_USE_WEBGL_CANVAS === 'true',
  // 환경변수로 제어, 배포 없이 전환 가능
};

// BuilderCanvas.tsx
function BuilderCanvas() {
  if (FEATURE_FLAGS.USE_WEBGL_CANVAS) {
    return <PixiCanvas />;  // WebGL
  }
  return <IframeCanvas />;  // 기존 DOM (Fallback)
}
```

#### 롤백 체크리스트

| 단계 | 롤백 조건 | 롤백 액션 |
|------|----------|----------|
| 10.1 | @pixi/react 설정 실패 | Feature Flag OFF, 기존 iframe 유지 |
| 10.2 | ElementSprite 렌더링 불안정 | Flag OFF, 성능 로그 수집 후 재시도 |
| 10.3-10.5 | Selection/Transform 버그 | 해당 기능만 DOM Overlay로 대체 |
| 10.7 | Publish App 분리 실패 | 기존 Canvas iframe 유지 (빌드 분리만) |

#### 최악의 시나리오 대응

```
문제: @pixi/react v8이 React 19와 호환되지 않음
대응:
  1. @pixi/react v7 (Pixi.js v7) 사용으로 다운그레이드
  2. 또는 React 18로 일시 다운그레이드
  3. 또는 vanilla Pixi.js + 수동 React 통합

문제: WebGL 성능이 DOM보다 나쁨 (드문 케이스)
대응:
  1. GPU 프로파일링 (WebGL Inspector, Spector.js)
  2. Sprite 배칭, 텍스처 아틀라스 최적화
  3. Feature Flag OFF로 즉시 롤백
```

### 1.6 DOM 구조 매핑

디렉토리 구조는 DOM 계층과 일치하도록 설계:

```html
<!-- 목표 DOM 구조 -->
<div class="builder">
  <aside class="sidebar" />           <!-- packages/builder/sidebar/ -->

  <main class="workspace">            <!-- packages/builder/workspace/ -->
    <div class="canvas" />            <!-- apps/builder/src/builder/workspace/canvas/ (WebGL) -->
    <div class="overlay" />           <!-- packages/builder/workspace/overlay/ (DOM) -->
  </main>

  <aside class="inspector" />         <!-- packages/builder/inspector/ -->

  <!-- workflow/ 삭제됨 — CanvasKit 오버레이로 통합 (showWorkflowOverlay 토글) -->
</div>
```

**디렉토리 네이밍 결정:**
- `webgl/` ❌ → `workspace/canvas/` ✅ (기능적 명칭, 기술 중립적)
- `publish-app/` ❌ → `publish/` ✅ (Builder의 "Publish" 버튼과 연관)

---

## 2. 외부 사례 분석

### 2.1 Figma 아키텍처 (참고)

> Sources: [Figma Blog - Building a professional design tool](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/), [Figma WebGPU](https://www.figma.com/blog/figma-rendering-powered-by-webgpu/)

**핵심 기술 스택:**
- **렌더러**: C++ → WebAssembly (Emscripten)
- **그래픽 API**: WebGL → WebGPU (2023년 마이그레이션)
- **특징**: 타일 기반 렌더링, GPU 가속 안티앨리어싱

**Figma가 DOM을 버린 이유:**
1. HTML/SVG는 스크롤에 최적화됨, 줌에는 부적합
2. 매 확대/축소 시 geometry 재테셀레이션
3. 마스킹, 블러링, 블렌드 모드의 브라우저별 지원 불일치
4. GPU 가속 보장 없음

**성능 개선:**
- WebAssembly 도입 → 로드 시간 **3배 향상**
- WebGPU 도입 → Compute Shader로 CPU 작업을 GPU로 이전

### 2.2 PixiJS + React 생태계

> Sources: [PixiJS React v8](https://pixijs.com/blog/pixi-react-v8-live), [GitHub pixi-react](https://github.com/pixijs/pixi-react)

**PixiJS React v8 특징:**
- React 19 전용 (최신 react-reconciler)
- WebGPU 지원 (v8부터)
- TypeScript 완벽 지원
- @react-three/fiber에서 영감받은 설계

**Comet Editor** (PixiJS 공식 에디터, 개발 중):
- 시각적 씬/스프라이트/애니메이션 편집
- 디자이너-개발자 협업 도구

### 2.3 Konva vs PixiJS 성능 비교

> Sources: [Canvas Engines Comparison](https://benchmarks.slaylines.io/), [react-canvas-perf](https://github.com/ryohey/react-canvas-perf)

**8,000개 박스 벤치마크 (MacBook Pro 2019):**

| Library | Chrome FPS | Firefox FPS | Safari FPS |
|---------|------------|-------------|------------|
| **PixiJS** | **60** | **48** | 24 |
| Konva | 23 | 7 | 19 |
| P5 | 15 | 4 | 44 |

**1,000개 요소 React 렌더링:**

| Renderer | FPS (with text) | FPS (no text) |
|----------|-----------------|---------------|
| pixi.js (raw) | 31 | 32 |
| @inlet/react-pixi | 6 | 38 |
| react-konva | 9 | 26 |

**결론**: PixiJS가 WebGL 기반으로 압도적 성능 우위

### 2.4 Polotno/Konva 아키텍처 (참고)

> Sources: [Polotno SDK](https://polotno.com/docs/overview), [react-konva](https://github.com/konvajs/react-konva)

- Polotno: Konva.js 기반 opinionated 프레임워크
- 장점: 빠른 개발, 완성된 UI 컴포넌트
- 단점: Canvas 2D 기반 → WebGL 대비 낮은 성능

---

## 3. 아키텍처 설계

### 3.1 기술 스택 선정

| Layer | 현재 | 목표 | 이유 |
|-------|------|------|------|
| **Builder Canvas** | React DOM + iframe | **@pixi/react v8** | WebGL 성능, React 19 호환 |
| **Builder UI** | React Aria | React Aria (유지) | 접근성, 기존 코드 재사용 |
| **State Management** | Zustand | Zustand (유지) | 안정성, postMessage 제거 |
| **Publish Runtime** | iframe 공유 | **별도 React App** | SEO, 접근성, 최적화 |

### 3.2 레이어 분리 설계

```
┌─────────────────────────────────────────────────────────────────┐
│                    XStudio Builder (WebGL)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │  UI Layer    │  │   Canvas Layer      │  │  Data Layer  │   │
│  │  (React DOM) │  │ (CanvasKit + PixiJS)│  │  (Zustand)   │   │
│  ├──────────────┤  ├─────────────────────┤  ├──────────────┤   │
│  │ • Sidebar    │  │ [Skia z:2 렌더링]   │  │ • elements   │   │
│  │ • Inspector  │  │ • Element Sprites   │  │ • selection  │   │
│  │ • Panels     │  │ • Selection Box ★   │  │ • history    │   │
│  │ • Toolbar    │  │ • Transform Handle ★│  │ • theme      │   │
│  │ • Layer Tree │  │ • AI Effects        │  │ • pages      │   │
│  │              │  │ [PixiJS z:3 이벤트]  │  │              │   │
│  │              │  │ • Hit Testing       │  │              │   │
│  │              │  │ • Drag Interaction  │  │              │   │
│  │              │  │ • Zoom/Pan Camera   │  │              │   │
│  └──────────────┘  └─────────────────────┘  └──────────────┘   │
│         │                    │                     ▲            │
│         │                    │                     │            │
│         └────────────────────┼─────────────────────┘            │
│                              │                                   │
│                     Direct Zustand Access                        │
│                     (No postMessage!)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Pixi↔React DOM 동기화 시퀀스

Pixi 레이어와 React DOM 패널 사이의 상태 동기화에서 프레임 지연이 발생할 수 있으므로, 렌더-스토어 불일치 탐지용 시퀀스를 사용합니다.

```typescript
// packages/builder/stores/canvasSync.ts
interface CanvasSyncState {
  renderVersion: number;
  lastPixiRenderVersion: number;
  incrementRenderVersion: () => void;
  syncPixiVersion: (version: number) => void;
}

export const useCanvasSyncStore = create<CanvasSyncState>((set) => ({
  renderVersion: 0,
  lastPixiRenderVersion: 0,

  incrementRenderVersion: () =>
    set((state) => ({ renderVersion: state.renderVersion + 1 })),

  syncPixiVersion: (version) =>
    set({ lastPixiRenderVersion: version }),
}));

// 불일치 탐지 로그
function detectSyncMismatch() {
  const { renderVersion, lastPixiRenderVersion } = useCanvasSyncStore.getState();
  if (renderVersion - lastPixiRenderVersion > 2) {
    console.warn(`[CanvasSync] Mismatch detected: store=${renderVersion}, pixi=${lastPixiRenderVersion}`);
  }
}
```

### 3.4 공통 Scene 스키마

`packages/shared/types/scene.ts`에 Builder와 Publish App 간 공유되는 Scene 스키마를 정의합니다.

```typescript
// packages/shared/types/scene.ts
export interface SceneElement {
  id: string;
  tag: string;
  transform: Transform;
  styling: Styling;
  props?: Record<string, unknown>;
  children?: SceneElement[];
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale?: { x: number; y: number };
}

export interface Styling {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  boxShadow?: string;
}

// 직렬화/역직렬화 유틸
export function serializeScene(elements: Element[]): SceneElement[] {
  // Element → SceneElement 변환
}

export function deserializeScene(scene: SceneElement[]): Element[] {
  // SceneElement → Element 변환
}
```

### 3.5 WebGL Canvas 컴포넌트 구조

```typescript
// apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx
import { useCanvasSyncStore } from '../../stores/canvasSync';
import { Application, Container } from '@pixi/react';
import { useStore } from '../../stores';

export function BuilderCanvas() {
  const elements = useStore((state) => state.elements);
  const selectedIds = useStore((state) => state.selectedElementIds);
  const zoom = useStore((state) => state.zoom);

  return (
    <Application
      width={1920}
      height={1080}
      options={{
        antialias: true,
        backgroundColor: 0xffffff,
        resolution: window.devicePixelRatio,
        autoDensity: true,
      }}
    >
      {/* Camera/Viewport */}
      <Container scale={zoom}>
        {/* Grid Layer */}
        <GridLayer />

        {/* Elements Layer */}
        {elements.map((el) => (
          <ElementSprite key={el.id} element={el} />
        ))}

        {/* Selection Layer (PixiJS: 이벤트 히트 영역, Skia: 시각적 렌더링) */}
        <SelectionOverlay selectedIds={selectedIds} />

        {/* Transform Handles (PixiJS: 투명 히트 영역, Skia: 시각적 핸들) */}
        <TransformHandles selectedIds={selectedIds} />
      </Container>

      {/* SkiaOverlay: CanvasKit/Skia로 디자인 노드 + AI + Selection 렌더링 */}
      {/* PixiJS Camera 하위: alpha=0 (renderable=false 금지) */}
    </Application>
  );
}
```

### 3.6 Element Sprite 렌더링 전략

```typescript
// apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx
import { Container, Text } from '@pixi/react';
import { useMemo } from 'react';

interface ElementSpriteProps {
  element: Element;
}

export function ElementSprite({ element }: ElementSpriteProps) {
  const { id, tag, props, style } = element;

  // 요소 타입별 렌더링 전략
  const renderElement = useMemo(() => {
    switch (tag) {
      case 'Box':
      case 'Flex':
      case 'Grid':
        return <BoxSprite element={element} />;

      case 'Text':
      case 'Heading':
        return <TextSprite element={element} />;

      case 'Image':
        return <ImageSprite element={element} />;

      case 'Button':
      case 'Input':
        return <InteractiveSprite element={element} />;

      default:
        return <PlaceholderSprite element={element} />;
    }
  }, [element]);

  return (
    <Container
      x={style?.left || 0}
      y={style?.top || 0}
      interactive={true}
      eventMode="static"
      data-element-id={id}
    >
      {renderElement}
    </Container>
  );
}
```

---

## 4. Text Input 해결 전략

### 4.1 빌더 접근성에 대한 결정

> **결론: 빌더 자체의 스크린 리더 접근성은 불필요**

| 도구 | 빌더 접근성 | 이유 |
|------|------------|------|
| Figma | ❌ 미지원 | 시각적 디자인 도구 |
| Canva | ❌ 미지원 | 시각적 디자인 도구 |
| Photoshop | ❌ 미지원 | 시각적 편집 도구 |
| **XStudio** | ❌ 미지원 | 시각적 UI 빌더 |

**이유:**
- 빌더는 **시각적 디자인 도구** → 화면을 봐야 사용 가능
- 타겟 사용자: 디자이너, 프론트엔드 개발자
- 시각 장애인 디자이너는 극히 드문 케이스

**Publish App은 다름:**
- 최종 사용자 앱 → 모든 사용자가 접근 가능해야 함
- React Aria Components 기반 → **접근성 자동 지원**
- 기존 Canvas iframe 코드가 이미 React DOM 기반

### 4.2 Text Input이 필요한 이유 (기능적)

WebGL/Canvas는 네이티브 텍스트 입력을 지원하지 않습니다:

```
❌ WebGL에서 직접 텍스트 편집 시 구현해야 할 것들:
- 커서 깜빡임 직접 구현
- 텍스트 선택 직접 구현
- 복사/붙여넣기 직접 구현
- IME (한글/중국어/일본어) 직접 구현 ← 매우 복잡!
- 자동완성, 맞춤법 검사 등 브라우저 기능 사용 불가

✅ DOM <input> 오버레이 사용 시:
- 브라우저가 모든 걸 처리
- IME 완벽 지원
- 복사/붙여넣기 자동
- 브라우저 기능 그대로 사용
```

### 4.3 Text Input 하이브리드 전략

> Sources: [pixi-text-input](https://github.com/Mwni/pixi-text-input), [PixiJS DOMContainer](http://pixijs.download/dev/docs/scene.DOMContainer.html)

**방법 1: DOMContainer (PixiJS v8)**
```typescript
import { DOMContainer } from '@pixi/dom';

// 텍스트 입력이 필요한 경우 DOM 요소 오버레이
<DOMContainer>
  <input
    type="text"
    value={element.props.value}
    onChange={handleChange}
    style={{
      position: 'absolute',
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    }}
  />
</DOMContainer>
```

**방법 2: 편집 모드 분리**
```typescript
// 평소: WebGL로 텍스트 렌더링 (빠름)
// 더블클릭 편집 시: DOM Input 오버레이 표시
function TextElement({ element }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <DOMOverlay x={x} y={y} zoom={zoom}>
        <input autoFocus value={text} onBlur={() => setIsEditing(false)} />
      </DOMOverlay>
    );
  }

  return (
    <Text
      text={text}
      interactive={true}
      ondblclick={() => setIsEditing(true)}
    />
  );
}
```

### 4.4 Text Edit 워크플로우

```
1. 사용자가 Text 요소 더블클릭
          │
          ▼
2. WebGL 텍스트 렌더링 숨김
          │
          ▼
3. DOM <input>/<textarea> 오버레이 표시
   - 같은 위치 (x, y)
   - 같은 크기 (width, height)
   - 같은 스타일 (font, color)
   - 줌 레벨에 맞게 transform: scale()
          │
          ▼
4. 사용자가 텍스트 편집 (IME, 복사/붙여넣기 등 네이티브 지원)
          │
          ▼
5. 편집 완료 (blur 또는 Enter 또는 Escape)
          │
          ▼
6. DOM 오버레이 숨김, Zustand Store 업데이트
          │
          ▼
7. WebGL 텍스트 다시 렌더링 (업데이트된 내용)
```

---

## 5. Publish App 분리 전략

### 5.1 현재 vs 목표 구조

**현재:**
```
Canvas iframe = Preview + Publish 겸용
- 빌더와 동일한 코드 실행
- postMessage로 동기화
- SEO 불가능
```

**목표:**
```
WebGL Builder = Design Time Only
Publish App = Production Runtime (별도 번들)
- 순수 React Aria Components
- SSR/SSG 지원 가능
- SEO 최적화
- 접근성 완벽 지원
```

### 5.2 Publish App 아키텍처

```typescript
// packages/publish/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PageRenderer } from './PageRenderer';

// 빌더에서 Export한 JSON 데이터
import siteData from './exported-site.json';

export function App() {
  const routes = siteData.pages.map((page) => ({
    path: page.slug,
    element: <PageRenderer page={page} elements={siteData.elements} />,
  }));

  return <RouterProvider router={createBrowserRouter(routes)} />;
}
```

```typescript
// packages/publish/PageRenderer.tsx
import { ComponentRegistry } from './components';

export function PageRenderer({ page, elements }) {
  const pageElements = elements.filter((el) => el.page_id === page.id);

  function renderElement(element: Element) {
    const Component = ComponentRegistry[element.tag];
    const children = pageElements
      .filter((el) => el.parent_id === element.id)
      .sort((a, b) => a.order_num - b.order_num);

    return (
      <Component key={element.id} {...element.props} style={element.style}>
        {children.map(renderElement)}
      </Component>
    );
  }

  const rootElements = pageElements.filter((el) => !el.parent_id);
  return <>{rootElements.map(renderElement)}</>;
}
```

### 5.3 기존 Canvas 코드 재활용

| 기존 코드 | 재활용 위치 | 설명 |
|-----------|-------------|------|
| `src/canvas/renderers/*` | `packages/publish/components/` | ComponentRegistry로 이전 |
| `src/canvas/store/runtimeStore.ts` | `packages/publish/store/` | Publish App 상태 관리 |
| `src/builder/components/*` | `packages/shared/components/` | React Aria Components 공유 |
| `src/canvas/App.tsx` | `packages/publish/PageRenderer.tsx` | 베이스로 리팩토링 |
| `src/types/*` | `packages/shared/types/` | 공통 타입 정의 |

---

## 6. 구현 로드맵

### 6.1 Sub-Phase 분류

| Sub-Phase | 작업 | 예상 시간 | 의존성 | 우선순위 |
|-----------|------|----------|--------|----------|
| **10.1** | @pixi/react v8 설정 + 기본 캔버스 | 8hr | React 19 업그레이드 | P0 |
| **10.2** | ElementSprite 렌더링 시스템 | 16hr | 10.1 | P0 |
| **10.3** | Selection + Transform 핸들 | 12hr | 10.2 | P1 |
| **10.4** | Zoom/Pan + Grid/Guide | 8hr | 10.2 | P1 |
| **10.5** | Text Input 하이브리드 레이어 | 12hr | 10.2 | P1 (기능적 필수) |
| **10.7** | Publish App 분리 + Export | 16hr | 기존 Canvas 코드 | P0 |
| **10.8** | postMessage 제거 + 마이그레이션 | 8hr | 10.2 | P2 |

**총 예상 시간**: 80hr (~10일)

> **Note**: Phase 10.6 (접근성 레이어)는 제거되었습니다.
> - 빌더는 **시각적 디자인 도구**이므로 스크린 리더 지원 불필요
> - Figma, Canva, Photoshop도 빌더 자체는 접근성 미지원
> - **Publish App은 React DOM 기반이므로 접근성 자동 지원**

### 6.2 상세 체크리스트

#### Phase 10.1: 기본 설정 (8hr)
- [ ] React 19로 업그레이드 (현재 버전 확인 필요)
- [ ] @pixi/react v8 설치 및 설정
- [ ] `packages/builder/workspace/` 디렉토리 구조 생성
- [ ] `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` 생성
- [ ] `packages/builder/workspace/Workspace.tsx` 컨테이너 생성
- [ ] 기존 BuilderCore에 Workspace 마운트
- [ ] DevTools 연동 (PixiJS DevTools 확장)
- [ ] GPU 프로파일링 설정 (`@pixi/stats` 또는 자체 VRAM 모니터)
- [ ] `canvasSync.ts` 스토어 생성 (renderVersion 동기화)

#### Phase 10.2: ElementSprite 시스템 (16hr)
- [ ] `apps/builder/src/builder/workspace/canvas/sprites/` 디렉토리 생성
- [ ] BaseSprite 추상 클래스 설계
- [ ] BoxSprite (Box, Flex, Grid) 구현
- [ ] TextSprite (Text, Heading, Label) 구현
- [ ] ImageSprite 구현
- [ ] InteractiveSprite (Button, Input 껍데기) 구현
- [ ] PlaceholderSprite (미지원 컴포넌트) 구현
- [ ] Style → PixiJS 속성 변환 유틸리티

#### Phase 10.3: Selection + Transform (12hr)
- [ ] `apps/builder/src/builder/workspace/canvas/selection/` 디렉토리 생성
- [ ] SelectionOverlay 컴포넌트
- [ ] 다중 선택 박스 (Bounding Box)
- [ ] TransformHandles (8방향 + 회전)
- [ ] 드래그 이동 구현
- [ ] 리사이즈 구현
- [ ] Zustand selection store 연동

#### Phase 10.4: Zoom/Pan + Grid (8hr)
- [ ] `apps/builder/src/builder/workspace/canvas/grid/` 디렉토리 생성
- [ ] Camera/Viewport 시스템
- [ ] 마우스 휠 줌
- [ ] 스페이스바 + 드래그 팬
- [ ] 줌 레벨 UI (100%, Fit, Fill)
- [ ] Grid 렌더링
- [ ] Guide/Ruler 렌더링

#### Phase 10.5: Text Input 하이브리드 (12hr)
- [ ] `packages/builder/workspace/overlay/` 디렉토리 생성
- [ ] DOMContainer 설정
- [ ] TextEditOverlay 컴포넌트
- [ ] 더블클릭 → 편집 모드 전환
- [ ] 편집 완료 → WebGL 텍스트로 복귀
- [ ] 포커스 관리 (blur/focus)

#### ~~Phase 10.6: 접근성 레이어~~ (제거됨)
> 빌더는 시각적 도구이므로 불필요. Publish App에서 React DOM으로 자동 지원.

#### Phase 10.7: Publish App 분리 (16hr)
- [ ] 모노레포 구조 설정 (pnpm workspace)
- [ ] `packages/publish/` 프로젝트 scaffolding
- [ ] `packages/shared/` 공통 코드 분리
- [ ] `packages/shared/types/scene.ts` 공통 Scene 스키마 정의
- [ ] ComponentRegistry 생성 (`src/canvas/renderers/*` → `packages/publish/components/`)
- [ ] PageRenderer 구현
- [ ] JSON Export 기능 (Builder → Publish)
- [ ] Static Site Generation (Vite SSG)
- [ ] Hosting 설정 (Vercel, Netlify)
- [ ] Tree-shaking 점검 (`packages/shared` import 시 번들 비대화 방지)
- [ ] `exports` 필드 모듈 분리 (types, hooks, utils)

#### Phase 10.8: 마이그레이션 + 안정성 검증 (8hr)
- [ ] `src/` → `packages/builder/` 코드 이전
- [ ] postMessage 로직 제거
- [ ] useIframeMessenger → Direct Zustand 전환
- [ ] useDeltaMessenger 제거 (불필요)
- [ ] 기존 `src/canvas/` iframe 코드 정리/삭제
- [ ] `npm run soak:webgl` 스크립트 추가 (24시간 스트레스 테스트)
- [ ] GPU 메모리/텍스처 누수 로깅 (CI 아티팩트)
- [ ] 텍스처 캐시/LRU 정책 문서화
- [ ] 포커스 트랩 테스트 체크리스트 작성
- [ ] 통합 테스트

---

## 7. 기존 Phase와의 관계

### 7.1 영향받는 Phase

| Phase | 변경 사항 |
|-------|----------|
| **Phase 1** | Panel Gateway 유지 (UI Layer는 React DOM) |
| **Phase 2** | Store Index 유지 (Zustand 그대로 사용) |
| **Phase 3** | History Diff 유지 |
| **Phase 4** | **제거** - postMessage 없으므로 Delta Sync 불필요 |
| **Phase 5** | Lazy Loading 유지 (페이지별 Element 로딩) |
| **Phase 6** | React Query 유지 |
| **Phase 7** | Performance Monitor 수정 (WebGL 메트릭 추가) |
| **Phase 9** | Canvas Virtualization → **PixiJS Culling**으로 대체 |

### 7.2 새로운 우선순위

```
P0 (Critical):
├── Phase 1: Panel Gateway (기존)
├── Phase 10.1-10.2: WebGL 기본 렌더링 (NEW)
└── Phase 10.7: Publish App 분리 (NEW)

P1 (High):
├── Phase 2: Store Index Migration (기존)
├── Phase 10.3-10.4: Selection/Zoom (NEW)
└── Phase 7: Auto Recovery (기존)

P2 (Medium):
├── Phase 10.5: Text Input 하이브리드 (NEW)
├── Phase 6: Request Manager (기존)
└── Phase 10.8: Migration 완료 (NEW)

제거:
├── Phase 4: Canvas Delta Sync (postMessage 제거로 불필요)
├── Phase 9 일부: DOM 가상화 (WebGL Culling으로 대체)
└── Phase 10.6: 접근성 레이어 (빌더는 시각적 도구, Publish App에서 자동 지원)
```

---

## 8. 리스크 및 대응 방안

### 8.1 기술적 리스크

| 리스크 | 가능성 | 영향 | 대응 방안 |
|--------|--------|------|----------|
| React 19 호환성 문제 | 중 | 높음 | 현재 React 버전 확인, 점진적 업그레이드 |
| PixiJS 텍스트 품질 | 중 | 중 | MSDF 폰트 또는 DOM 오버레이 사용 |
| 복잡한 컴포넌트 렌더링 | 높음 | 중 | Placeholder 우선, 점진적 구현 |
| IME 입력 (한글/중국어) | 중 | 높음 | DOM 오버레이 필수 사용 |
| Publish App 번들 크기 | 낮음 | 낮음 | Tree shaking, Code splitting |

### 8.2 Fallback 전략

1. **WebGL 미지원 브라우저**: Canvas 2D 폴백 (PixiJS 자동 처리)
2. **텍스트 렌더링 품질**: Canvas 2D 텍스트 또는 DOM 오버레이
3. **복잡한 컴포넌트**: DOM Preview 모드 토글 (기존 iframe 유지)

**WebGL 미지원 브라우저 상세:**
- Safari 구버전 (15.x 이하): WebGL 2.0 미지원 가능
- 대응: PixiJS는 자동으로 Canvas 2D fallback 제공
- 사용자 알림: "최적 성능을 위해 최신 브라우저를 권장합니다" 배너 표시

### 8.3 WebGL Context Lost 처리

GPU 리소스 부족 시 브라우저가 WebGL 컨텍스트를 강제 해제할 수 있습니다.

```typescript
// apps/builder/src/builder/workspace/canvas/utils/contextRecovery.ts
export function setupContextRecovery(canvas: HTMLCanvasElement) {
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('[WebGL] Context lost - preparing recovery');

    // 사용자 알림
    showToast({ type: 'warning', message: 'GPU 리소스 복구 중...' });

    // 복구 준비 (텍스처/셰이더 재로드 예약)
    scheduleRecovery();
  });

  canvas.addEventListener('webglcontextrestored', () => {
    console.log('[WebGL] Context restored - reloading assets');

    // 텍스처/셰이더 재로드
    reloadAllTextures();
    reloadShaders();

    // 씬 재렌더링
    forceRerender();

    showToast({ type: 'success', message: '복구 완료' });
  });
}
```

### 8.4 텍스처 캐시/LRU 정책

VRAM 예산 관리를 위한 텍스처 캐시 정책:

| 항목 | 정책 |
|------|------|
| **캐시 크기** | 최대 256MB VRAM |
| **LRU Eviction** | 30초 미사용 텍스처 해제 |
| **destroy() 호출** | `texture.destroy(true)` - 소스 이미지까지 해제 |
| **비동기 해제** | `requestIdleCallback` 사용으로 프레임 드롭 방지 |

```typescript
// apps/builder/src/builder/workspace/canvas/utils/textureCache.ts
class TextureLRUCache {
  private maxVRAM = 256 * 1024 * 1024; // 256MB
  private ttl = 30000; // 30초

  evictStale() {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now - entry.lastAccess > this.ttl) {
        requestIdleCallback(() => {
          entry.texture.destroy(true);
          this.cache.delete(key);
        });
      }
    });
  }
}
```

---

## 9. 성능 목표 (Phase 10 완료 후)

| 지표 | 현재 (DOM) | 목표 (WebGL) | 개선율 |
|------|------------|--------------|--------|
| **5,000개 렌더링** | 불가능 | < 16ms (60fps) | ∞ |
| **10,000개 렌더링** | 불가능 | < 33ms (30fps) | ∞ |
| **줌/팬 반응** | 100-200ms | < 16ms | 6-12x |
| **요소 선택** | 50-100ms | < 5ms | 10-20x |
| **메모리 (WebGL)** | - | GPU VRAM 활용 | - |
| **초기 로드** | 1-2초 | < 500ms | 2-4x |

---

## 10. 참고 자료

### 공식 문서
- [PixiJS v8 문서](https://pixijs.com/8.x/guides)
- [PixiJS React v8](https://react.pixijs.io/)
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/) - Publish App 접근성

### 외부 사례
- [Figma Blog - Building a professional design tool](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/)
- [Figma WebGPU](https://www.figma.com/blog/figma-rendering-powered-by-webgpu/)
- [Polotno SDK](https://polotno.com/docs/overview)
- [Canvas Engines Comparison](https://benchmarks.slaylines.io/)

### Text Input / DOM 오버레이
- [pixi-text-input](https://github.com/Mwni/pixi-text-input) - PixiJS 텍스트 입력 플러그인
- [PixiJS DOMContainer](http://pixijs.download/dev/docs/scene.DOMContainer.html) - DOM 요소 오버레이
- [PixiJS UI Input](https://pixijs.io/ui/Input.html) - PixiJS UI 라이브러리
