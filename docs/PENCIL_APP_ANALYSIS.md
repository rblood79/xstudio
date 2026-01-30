# Pencil Desktop 앱 분석

> 분석 대상: `/Applications/Pencil.app`
> 분석 일자: 2026-01-29
> 버전: 1.1.10
> 개발사: High Agency, Inc.
> 앱 ID: `dev.pencil.desktop`

## 1. 기술 스택 요약

| 항목 | 기술 |
|------|------|
| 프레임워크 | Electron |
| 언어 | TypeScript → JavaScript 컴파일 |
| 번들러 | esbuild |
| 런타임 | Bun (darwin-x64 포함) |
| UI | React 기반 에디터 |
| 그래픽 렌더링 | WebAssembly (`pencil.wasm`) |
| DB ORM | Prisma |
| AI 통합 | `@anthropic-ai/claude-agent-sdk` (v0.2.9) |
| 스키마 검증 | Zod (v4.3.5) |
| 에러 추적 | Sentry (`@sentry/electron` v7.6.0) |
| 분석 | PostHog |
| 자동 업데이트 | Squirrel + electron-updater |
| 이미지 처리 | Sharp |

## 2. 디렉토리 구조

```
Pencil.app/Contents/
├── MacOS/
│   └── Pencil                          # Electron 실행 바이너리
├── Frameworks/
│   ├── Electron Framework.framework
│   ├── Pencil Helper (GPU).app
│   ├── Pencil Helper (Renderer).app
│   ├── Pencil Helper (Plugin).app
│   ├── Pencil Helper.app
│   ├── ReactiveObjC.framework
│   ├── Mantle.framework
│   └── Squirrel.framework              # 자동 업데이트
├── Resources/
│   ├── app.asar                        # 메인 애플리케이션 번들 (압축)
│   ├── app.asar.unpacked/
│   │   ├── out/                        # 컴파일된 JavaScript
│   │   │   ├── main.js                 # Electron 메인 프로세스 진입점
│   │   │   ├── app.js                  # PencilApp 클래스
│   │   │   ├── claude.js               # Claude AI 통합
│   │   │   ├── config.js               # 설정 관리
│   │   │   ├── constants.js            # 상수 정의
│   │   │   ├── desktop-mcp-adapter.js  # MCP 어댑터
│   │   │   ├── desktop-resource-device.js  # 리소스 관리
│   │   │   ├── ide.js                  # IDE 통합 (Cursor 등)
│   │   │   ├── ipc-electron.js         # IPC 래퍼
│   │   │   ├── logger.js              # 로깅
│   │   │   ├── menu.js                # 메뉴 시스템
│   │   │   ├── preload.js             # Electron 프리로드 스크립트
│   │   │   ├── updater.js             # 자동 업데이트
│   │   │   ├── editor/                # 에디터 UI
│   │   │   │   ├── index.html
│   │   │   │   ├── assets/
│   │   │   │   │   ├── index.js       # 메인 UI 번들
│   │   │   │   │   ├── index.css
│   │   │   │   │   ├── browserAll.js
│   │   │   │   │   ├── webworkerAll.js
│   │   │   │   │   └── pencil.wasm    # WebAssembly 그래픽 모듈
│   │   │   │   └── images/
│   │   │   ├── assets/
│   │   │   │   ├── bun-darwin-x64     # Bun 런타임 바이너리
│   │   │   │   ├── icon.icns
│   │   │   │   └── font/
│   │   │   └── mcp-server-*           # 멀티플랫폼 MCP 서버 바이너리
│   │   └── node_modules/              # npm 의존성
│   │       ├── @anthropic-ai/claude-agent-sdk/
│   │       ├── @ha/                   # High Agency 내부 라이브러리
│   │       ├── zod/
│   │       ├── @sentry/
│   │       └── @opentelemetry/
│   ├── *.lproj/                       # 다국어 리소스 (60개 언어)
│   ├── icon.icns
│   └── app-update.yml                 # 업데이트 설정
├── Info.plist                         # macOS 앱 메타데이터
└── PkgInfo
```

## 3. 아키텍처

### 3.1 Electron 멀티 프로세스 구조

```
┌─────────────────────────────────────────────┐
│              Main Process                    │
│  (main.js → PencilApp)                      │
│  - 앱 생명주기 관리                           │
│  - BrowserWindow 생성                        │
│  - 파일 I/O                                  │
│  - Claude AI 에이전트 관리                    │
│  - MCP 어댑터                                │
├──────────┬──────────────────────────────────┤
│   IPC    │     WebSocket                     │
├──────────┴──────────────────────────────────┤
│            Renderer Process                  │
│  (editor/index.html + React)                │
│  - UI 렌더링                                 │
│  - WebAssembly 그래픽 엔진                   │
│  - 사용자 인터랙션 처리                       │
└─────────────────────────────────────────────┘
```

### 3.2 IPC 통신 이벤트

| 이벤트 | 설명 |
|--------|------|
| `file-update` | 파일 변경 알림 |
| `dirty-changed` | 파일 수정 상태 변경 |
| `add-to-chat` | AI 채팅에 메시지 추가 |
| `claude-status` | Claude AI 연결 상태 |
| `prompt-agent` | AI 에이전트에 프롬프트 전달 |
| `fullscreen-change` | 전체화면 상태 변경 |

### 3.3 설계 패턴

- **Event-Driven Architecture**: EventEmitter3 기반 느슨한 결합
- **MVC/MVVM 패턴**: Renderer(View) ↔ IPC(Controller) ↔ Main(Model)
- **Plugin Architecture**: MCP 기반 외부 도구 통합

## 4. 핵심 모듈 분석

### 4.1 Main Process 진입점 (`main.js`)

- Sentry 에러 추적 초기화
- 싱글 인스턴스 락 (다중 실행 방지)
- 커스텀 프로토콜 등록 (`pencil://`)
- `.pen` 파일 열기 이벤트 핸들링
- 명령줄 인수:
  - `--headless` — 헤드리스 모드
  - `--multi-mode` — 다중 모드
  - `--file` — 파일 경로 지정
  - `--prompt` — AI 프롬프트
  - `--agent` — 에이전트 타입

### 4.2 PencilApp 클래스 (`app.js`)

핵심 애플리케이션 로직을 담당하는 메인 클래스:

- BrowserWindow 생성 및 관리
- IPC + WebSocket 통신 설정
- 파일 로드/저장 처리
- 최근 파일 관리 (최대 14개)
- 자동 업데이트 처리

### 4.3 Claude AI 통합 (`claude.js`)

- `@anthropic-ai/claude-agent-sdk`를 통한 Claude 에이전트 초기화
- API 키 저장 및 관리
- 로그인 상태 폴링
- 터미널 열기 (macOS: iTerm/Terminal, Windows: cmd.exe)
- Beta 기능: `fine-grained-tool-streaming-2025-05-14`

### 4.4 MCP 어댑터 (`desktop-mcp-adapter.js`)

Model Context Protocol을 통해 외부 CLI 도구와 연동:

- `claudeCodeCLI` — Claude Code CLI
- `codexCLI` — OpenAI Codex CLI
- `geminiCLI` — Google Gemini CLI
- `openCodeCLI` — OpenCode CLI

### 4.5 리소스 관리 (`desktop-resource-device.js`)

- `.pen` 파일 포맷 읽기/쓰기
- 라이센스 토큰 관리 (`~/.pencil/license-token.json`)
- 파일 더티 상태 추적
- 디바이스 ID 생성 (호스트명 + 플랫폼 + 아키텍처 기반)

### 4.6 설정 관리 (`config.js`)

`electron-store` 기반, 저장 항목:

- `windowBounds` — 창 크기/위치
- `recentFiles` — 최근 파일 목록
- `claudeCodeAccount` — Claude 계정 정보
- `claudeApiKey` — API 키

### 4.7 메뉴 시스템 (`menu.js`)

- **File**: New, Open, Import (Figma/PNG/JPG/SVG), Export, Save, Save As
- **Code & MCP Setup**: 외부 도구 연동 설정
- **Edit/View/Help**: 표준 메뉴

## 5. 주요 의존성 (`@ha/*` 내부 라이브러리)

| 패키지 | 설명 |
|--------|------|
| `@ha/agent` | AI 에이전트 관리 |
| `@ha/ipc` | IPC 통신 레이어 |
| `@ha/mcp` | MCP 프로토콜 구현 |
| `@ha/shared` | 공유 유틸리티 |
| `@ha/ws-server` | WebSocket 서버 |

## 6. 보안

- Node Integration 비활성화
- Context Isolation 활성화
- Preload 스크립트를 통한 안전한 API 노출
- CSP (Content Security Policy) 설정
- Sentry를 통한 에러 추적

## 7. 멀티플랫폼 지원

| 플랫폼 | 아키텍처 |
|--------|----------|
| macOS | arm64, x64 |
| Windows | x64 |
| Linux | x64 |

- 최소 macOS 버전: 12.0

## 8. 파일 포맷

- **자체 포맷**: `.pen` (Pencil Design File)
- **Import 지원**: Figma, PNG, JPG, SVG
- **Export 지원**: 메뉴를 통한 내보내기

## 9. 외부 서비스 연동

| 서비스 | URL |
|--------|-----|
| Pencil API | `https://api.pencil.dev` |
| Reve API | `https://api.reve.com` |
| 개발 서버 | `http://localhost:3001` |
| 이미지 | Unsplash, Vercel Blob Storage |
| 폰트 | Google Fonts |

## 10. 요약

Pencil은 **Electron + React + WebAssembly** 기반의 디자인 도구로, High Agency에서 개발했다. 핵심 차별점은 Claude AI와의 긴밀한 통합이며, MCP(Model Context Protocol)를 통해 Claude Code, Codex, Gemini 등 다양한 AI CLI 도구와 연동할 수 있는 플러그인 아키텍처를 제공한다. TypeScript로 작성되고 esbuild로 번들링되며, WebAssembly를 활용한 고성능 그래픽 렌더링을 지원한다.

---

## 11. Pencil WASM 그래픽 엔진 심층 분석

### 11.1 그래픽 아키텍처 (2차 수정 — 2026-01-30 심층 분석 반영)

초기 분석에서 "PixiJS가 메인 렌더러, pencil.wasm이 보조"로 기술했으나, `renderSkia()` 메서드 역공학 결과 실제 구조는 **CanvasKit/Skia WASM이 메인 렌더러, PixiJS는 씬 그래프/이벤트 레이어**이다.

```
┌─────────────────────────────────────────────────────────┐
│  Renderer Process (editor/index.html)                  │
│  ├─ React Components (Sidebar, Inspector)             │
│  │                                                     │
│  ├─ [메인 렌더러] CanvasKit/Skia WASM (pencil.wasm)    │
│  │   ├─ Surface → Canvas API로 모든 디자인 노드 렌더링  │
│  │   ├─ 벡터 패스 (PathBuilder, drawPath, drawRRect)   │
│  │   ├─ 텍스트 (ParagraphBuilder, drawTextBlob)        │
│  │   ├─ 효과 (ImageFilter, saveLayer, blendMode)       │
│  │   ├─ 그라디언트 (Shader.MakeLinear/Radial/Sweep)    │
│  │   └─ GPU 출력 (GrDirectContext → flush)             │
│  │                                                     │
│  ├─ [씬 그래프/이벤트] PixiJS v8                       │
│  │   ├─ Container/RenderGroup (씬 그래프 관리)          │
│  │   ├─ EventBoundary (Hit Testing)                    │
│  │   ├─ TexturePool, CacheAsTexture                    │
│  │   └─ WebGPU/WebGL 렌더러 선택                       │
│  │                                                     │
│  ├─ @pixi/layout (Yoga WASM 레이아웃)                  │
│  └─ Web Workers (webworkerAll.js)                     │
│      └─ 오프메인스레드 연산                             │
└─────────────────────────────────────────────────────────┘
```

**핵심 포인트:**
- **메인 렌더러**: CanvasKit/Skia WASM — 모든 디자인 노드의 실제 렌더링 (벡터, 텍스트, 이미지, 효과)
- **씬 그래프/이벤트**: PixiJS v8 — Container 계층, Hit Testing, 텍스처 관리 (디자인 노드 렌더링에는 불참여)
- **레이아웃**: @pixi/layout (Yoga WASM) — Flexbox 레이아웃 계산
- **증거**: 모든 씬 노드가 `renderSkia(renderer, canvas, cullingBounds)` 메서드를 구현, CanvasKit Canvas API 직접 호출

### 11.2 pencil.wasm의 역할

| 영역 | 처리 내용 |
|------|----------|
| 벡터 도형 | SVG 경로 파싱, 베지어 곡선 계산, 폴리곤 테셀레이션 |
| 텍스트 | 글리프 래스터라이즈, 텍스트 메트릭(폭/높이/베이스라인), 줄바꿈 계산 |
| 기하 연산 | 바운딩박스 계산, 교차 판정(선택용), 매트릭스 변환 |
| 컴포지팅 | 레이어 합성(블렌드 모드), 그림자/블러 계산, 알파 블렌딩 |
| 성능 최적화 | 텍스처 아틀라스 생성, 밉맵 계산, 컬링 판정(화면 밖 감지) |

### 11.3 WASM 모듈 접근성

- **위치**: `app.asar` 아카이브 내부 (`out/editor/assets/pencil.wasm`)
- **형태**: 컴파일된 바이너리 (소스코드 없음, 소스맵 없음)
- **빌드 원본**: C++ → Emscripten 컴파일로 추정 (Figma와 유사한 패턴)
- **API**: export 함수 시그니처 비공개, 역공학 필요

### 11.4 추가 WASM 모듈

Pencil 앱 내에 pencil.wasm 외에도 추가 WASM 모듈 존재:

| 모듈 | 위치 | 용도 |
|------|------|------|
| `resvg.wasm` | `@anthropic-ai/claude-agent-sdk/` | SVG → 래스터 변환 |
| `tree-sitter.wasm` | `@anthropic-ai/claude-agent-sdk/` | 코드 파싱 (Claude 통합용) |
| Yoga WASM | `@pixi/layout` 내부 | Flexbox 레이아웃 계산 |

---

## 12. xstudio 캔버스와의 비교 분석

### 12.1 기술 스택 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| 렌더링 엔진 | PixiJS v8 (WebGL) | PixiJS v8.14.3 (WebGL) |
| React 바인딩 | @pixi/react v8 | @pixi/react v8.0.5 |
| 레이아웃 엔진 | @pixi/layout (Yoga WASM) | @pixi/layout v3.2.0 (Yoga WASM) |
| 상태 관리 | Zustand | Zustand |
| WASM 모듈 | pencil.wasm + Yoga | Yoga만 사용 |
| 플랫폼 | Electron 데스크톱 | 웹 애플리케이션 (Vite) |

### 12.2 xstudio 캔버스 현재 구조

```
workspace/
├── Workspace.tsx                    # 메인 워크스페이스 컨테이너
├── ZoomControls.tsx                 # 줌 컨트롤
└── canvas/
    ├── BuilderCanvas.tsx            # PixiJS Application 진입점
    ├── canvasSync.ts                # Zustand 기반 캔버스 상태
    ├── pixiSetup.ts                 # PixiJS 전역 설정
    ├── elementRegistry.ts           # 요소 바운딩박스 레지스트리
    ├── viewport/
    │   ├── ViewportController.ts    # 팬/줌 직접 조작 (React 우회)
    │   ├── ViewportControlBridge.tsx # React-PixiJS 연결
    │   └── useViewportControl.ts
    ├── sprites/                     # 요소 렌더링 (125개 파일)
    │   ├── ElementSprite.tsx        # 타입별 스프라이트 디스패처
    │   ├── BoxSprite.tsx
    │   ├── TextSprite.tsx
    │   └── ImageSprite.tsx
    ├── selection/                   # 선택 시스템
    │   ├── SelectionLayer.tsx
    │   ├── SelectionBox.tsx
    │   ├── TransformHandle.tsx
    │   └── LassoSelection.tsx
    ├── grid/
    │   └── GridLayer.tsx            # 동적 그리드
    ├── layout/                      # 하이브리드 레이아웃 엔진
    │   ├── initYoga.ts              # Yoga WASM 초기화
    │   ├── styleToLayout.ts         # CSS → Yoga 변환
    │   └── engines/
    │       ├── LayoutEngine.ts
    │       ├── FlexEngine.ts        # Flexbox (@pixi/layout)
    │       ├── GridEngine.ts        # CSS Grid (커스텀)
    │       └── BlockEngine.ts       # Block (커스텀)
    ├── hooks/
    │   ├── useViewportCulling.ts    # 뷰포트 컬링
    │   ├── useCanvasFonts.ts        # 폰트 로딩 감지
    │   └── useThemeColors.ts
    ├── ui/                          # PixiJS UI 컴포넌트 (50+)
    └── utils/
        ├── gpuProfilerCore.ts       # GPU 프로파일링
        ├── SpritePool.ts            # 텍스처 재사용 풀
        └── useCacheOptimization.ts
```

### 12.3 xstudio 렌더링 파이프라인

```
React Store (Zustand)
    │
    ▼
BuilderCanvas (<Application>)
    ├─ ViewportControlBridge (팬/줌)
    ├─ ClickableBackground (빈 영역 클릭)
    ├─ GridLayer (배경 그리드)
    └─ Camera Container (뷰포트 변환)
        ├─ BodyLayer (페이지 배경)
        ├─ CanvasBounds (경계선)
        ├─ ElementsLayer (memo)
        │   └─ LayoutContainer × n
        │       └─ ElementSprite (타입별 분기)
        │           ├─ BoxSprite (도형)
        │           ├─ TextSprite (텍스트)
        │           └─ ImageSprite (이미지)
        └─ SelectionLayer (memo)
            ├─ SelectionBox + TransformHandle × 8
            └─ LassoSelection
```

### 12.4 xstudio 기존 최적화 기법

| 최적화 | 설명 |
|--------|------|
| ViewportController 직접 조작 | 드래그 중 React re-render 없이 PixiJS Container 직접 이동 |
| 선택 상태 개별 구독 | 각 ElementSprite가 자신의 선택 상태만 구독 (O(n) → O(2)) |
| Viewport Culling | 화면 밖 요소 렌더링 제외 (20-40% GPU 부하 감소) |
| 동적 해상도 | 인터랙션 중 저해상도(1x), 유휴 시 고해상도(2x) |
| SpritePool | 텍스처 재사용으로 메모리 최적화 |
| memo 래핑 | ElementsLayer, SelectionLayer 불필요한 리렌더 방지 |
| 폰트 버전 추적 | document.fonts.ready 후 Text 재래스터라이즈 |

---

## 13. pencil.wasm → xstudio 적용 가능성 평가

### 13.1 직접 적용: 불가능

| 제약 사항 | 설명 |
|----------|------|
| 바이너리 접근 불가 | `app.asar` 아카이브 내부에 패킹, 소스코드 없음 |
| API 문서 없음 | export 함수 시그니처, 메모리 레이아웃 비공개 |
| 라이센스 문제 | High Agency, Inc. 독점 지적재산권 |
| 역할 한정적 | 주 렌더러가 아닌 연산 가속용 보조 모듈 |

### 13.2 간접 적용: 이미 대부분 완료

두 시스템이 동일한 핵심 기술 스택(PixiJS v8 + Yoga WASM + Zustand + React)을 사용하고 있어, Pencil의 렌더링 아키텍처는 이미 xstudio에 적용되어 있다.

### 13.3 추가 WASM 최적화 가능 영역

xstudio에서 Pencil처럼 자체 WASM 모듈을 도입하면 성능을 향상시킬 수 있는 영역:

| 영역 | xstudio 현재 방식 | WASM 적용 시 이점 | 우선순위 |
|------|-------------------|-------------------|----------|
| 히트 테스트 (선택) | JS 바운딩박스 계산 | 5,000+ 요소에서 충돌 판정 가속 | 높음 |
| 텍스트 메트릭 | PixiJS Text 기본 측정 | 정밀한 글리프 레이아웃, 줄바꿈 계산 | 중간 |
| Grid/Block 레이아웃 | 커스텀 JS 엔진 | 복잡한 레이아웃 고속 계산 | 중간 |
| SVG 경로 래스터라이즈 | 미지원 | 벡터 도형 고속 변환 (resvg-wasm 활용 가능) | 낮음 |
| 이미지 리사이즈/필터 | 미지원 | 클라이언트 사이드 이미지 처리 | 낮음 |

### 13.4 권장 구현 방향

Pencil의 `pencil.wasm`을 복제하는 대신, 병목 구간만 선택적으로 WASM화하는 전략 권장:

**도구 선택:**

```
Rust + wasm-pack    → 커스텀 WASM 모듈 빌드 (권장)
resvg-wasm          → SVG 래스터라이즈 (Pencil도 사용 중)
fontkit-wasm        → 텍스트 메트릭 정밀 계산
```

**구현 예시 (히트 테스트 WASM 모듈):**

```rust
// src/hit_test.rs (Rust → WASM)
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BoundingBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[wasm_bindgen]
pub fn find_elements_at_point(
    boxes: &[f32],      // [x, y, w, h, x, y, w, h, ...] 평탄화된 배열
    point_x: f32,
    point_y: f32,
) -> Vec<u32> {
    // WASM에서 고속 충돌 판정
    let mut hits = Vec::new();
    for i in (0..boxes.len()).step_by(4) {
        if point_x >= boxes[i]
            && point_x <= boxes[i] + boxes[i + 2]
            && point_y >= boxes[i + 1]
            && point_y <= boxes[i + 1] + boxes[i + 3]
        {
            hits.push((i / 4) as u32);
        }
    }
    hits
}
```

**TypeScript 통합:**

```typescript
// canvas/utils/wasmHitTest.ts
import init, { find_elements_at_point } from './hit_test_bg.wasm';

let initialized = false;

export async function initHitTestWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

export function hitTestAtPoint(
  elementBounds: Float32Array,
  x: number,
  y: number
): number[] {
  return Array.from(find_elements_at_point(elementBounds, x, y));
}
```

### 13.5 적용 로드맵

```
Phase 1: 성능 프로파일링
  └─ gpuProfilerCore.ts 활용하여 실제 병목 구간 측정
  └─ 5,000개 요소 기준 프레임 드롭 지점 확인

Phase 2: 히트 테스트 WASM 모듈 (최우선)
  └─ Rust + wasm-pack으로 충돌 판정 모듈 구축
  └─ elementRegistry.ts와 통합

Phase 3: 텍스트 메트릭 WASM 모듈
  └─ fontkit-wasm 도입 또는 커스텀 구축
  └─ TextSprite.tsx 정밀도 향상

Phase 4: 레이아웃 엔진 WASM화 (선택)
  └─ GridEngine, BlockEngine을 Rust로 포팅
  └─ 대규모 중첩 레이아웃 성능 향상
```

---

## 14. 종합 결론

Pencil과 xstudio는 **동일한 핵심 기술 스택**(PixiJS v8 + Yoga WASM + Zustand + React)을 기반으로 구축되어 있다. Pencil의 `pencil.wasm`은 독점 바이너리로 직접 재사용이 불가능하지만, xstudio는 이미 동일한 렌더링 아키텍처를 갖추고 있으므로 추가적인 WASM 최적화는 **성능 병목이 실증된 영역에 한정하여 선택적으로 적용**하는 것이 효과적이다.

현재 xstudio의 최적화 수준(Viewport Culling, 동적 해상도, SpritePool, memo 전략)은 이미 상당히 높으며, 5,000개 이상의 요소를 다루는 시나리오에서 히트 테스트와 레이아웃 계산 병목이 발생할 경우 Rust 기반 WASM 모듈 도입을 검토하는 것이 합리적이다.

---

## 15. `.pen` 파일 포맷 상세 구조

> 분석일: 2026-01-30
> 분석 방법: `app.asar` 추출 → `index.js` 번들 내 임베딩된 디자인 킷 JSON 역공학

### 15.1 포맷 개요

`.pen` 파일은 **JSON 텍스트 파일**로, `DesktopResourceDevice` 클래스가 `writeFileSync`로 디스크에 직접 기록한다. 바이너리 인코딩 없이 순수 JSON 문자열 형태이다.

### 15.2 최상위 구조

```json
{
  "version": "1.x",
  "themes": {
    "Mode": ["Light", "Dark"]
  },
  "variables": {
    "--primary": { "type": "color", "value": [...] },
    "--radius-m": { "type": "number", "value": 24 }
  },
  "pages": [
    {
      "name": "Page 1",
      "children": [ /* 노드 트리 */ ]
    }
  ]
}
```

### 15.3 노드 트리 구조

각 노드는 **타입 + 인라인 스타일 + 자식** 구조를 가진다:

```json
{
  "id": "bBmNI",
  "type": "frame",
  "name": "Card",
  "reusable": true,
  "fill": "$--popover",
  "cornerRadius": "$--radius-m",
  "stroke": {
    "align": "inside",
    "thickness": 1,
    "fill": "$--border"
  },
  "effect": {
    "type": "shadow",
    "shadowType": "outer",
    "color": "#0000000f",
    "offset": { "x": 0, "y": 2 },
    "blur": 3.5,
    "spread": -1
  },
  "layout": "vertical",
  "gap": 8,
  "children": [ /* 하위 노드 */ ]
}
```

### 15.4 노드 타입

> **심층 분석:** 각 노드 타입의 클래스 계층, 프로퍼티, 렌더링, 히트테스트 상세는 **§23** 참조

6개 구체 클래스가 12개 타입 문자열을 처리한다:

| 타입 | 클래스 | 설명 |
|------|--------|------|
| `frame` | `jx (FrameNode)` | 레이아웃 컨테이너, 클리핑, 슬롯 (Figma Frame) |
| `group` | `vXe (GroupNode)` | 논리적 그룹, 이펙트만 적용 |
| `rectangle` | `Kke (ShapeNode)` | 사각형 + cornerRadius |
| `ellipse` | `Kke (ShapeNode)` | 타원/도넛/부채꼴 |
| `line` | `Kke (ShapeNode)` | 직선 |
| `path` | `Kke (ShapeNode)` | SVG path 벡터 도형 |
| `polygon` | `Kke (ShapeNode)` | 정다각형 + cornerRadius |
| `text` | `Ux (TextNode)` | ParagraphBuilder 기반 텍스트 |
| `icon_font` | `_Xe (IconFontNode)` | Material Symbols/Lucide 아이콘 |
| `note` | `oI (StickyNode)` | 스티키 노트 |
| `prompt` | `oI (StickyNode)` | AI 프롬프트 노트 |
| `context` | `oI (StickyNode)` | 컨텍스트 노트 |
| `ref` | (직렬화 전용) | 컴포넌트 인스턴스 참조 |

### 15.5 컴포넌트-인스턴스 시스템

`reusable: true`인 노드는 컴포넌트로 등록되며, `ref` 타입 노드가 이를 참조한다:

```json
{
  "type": "ref",
  "ref": "bBmNI",
  "descendants": {
    "rxL1P": { "fontSize": 20, "fill": "#FF0000" },
    "xyq4X": { "content": "변경된 텍스트" }
  }
}
```

- `ref`: 원본 컴포넌트 노드 ID
- `descendants`: 인스턴스에서 오버라이드할 하위 노드별 속성 맵
- 원본 컴포넌트 변경 → 모든 인스턴스에 자동 전파
- 인스턴스의 `descendants` 오버라이드는 원본보다 우선

### 15.6 다중 Fill 시스템

단일 노드에 여러 fill 레이어를 중첩할 수 있다:

```json
{
  "fills": [
    {
      "enabled": true,
      "type": "Image",
      "url": "photo.jpg",
      "mode": "Fill",
      "opacityPercent": 100
    },
    {
      "enabled": true,
      "type": "LinearGradient",
      "stops": [
        { "position": 0, "color": "#FF0000" },
        { "position": 1, "color": "#0000FF" }
      ],
      "opacityPercent": 50
    }
  ]
}
```

**Fill 타입 (6종, Enum `Rt`):**
| 타입 | Enum 값 | 설명 |
|------|---------|------|
| `Color` | 1 | 단색 (hex, 변수 참조) |
| `Image` | 2 | 이미지 (url, mode: Stretch/Fill/Fit) |
| `LinearGradient` | 3 | 선형 그라디언트 (stops, angle) |
| `RadialGradient` | 4 | 방사형 그라디언트 (stops, center) |
| `AngularGradient` | 5 | 각도 그라디언트 (Sweep) |
| `MeshGradient` | 6 | 메시 그라디언트 (Coons 패치 보간) |

### 15.7 Effect 시스템

```json
{
  "effect": {
    "type": "shadow",
    "shadowType": "outer",
    "color": "#0000000f",
    "offset": { "x": 0, "y": 2 },
    "blur": 3.5,
    "spread": -1
  }
}
```

| 속성 | 값 |
|------|-----|
| `type` | `shadow` |
| `shadowType` | `inner` / `outer` |
| `color` | hex (알파 포함) |
| `offset` | `{ x, y }` |
| `blur` | 블러 반경 (px) |
| `spread` | 확산 (px, 음수 가능) |

### 15.8 Corner Radius

단일 값 또는 4개 개별 모서리 값을 지원하며, 변수 참조도 가능:

```json
// 단일 값
{ "cornerRadius": 12 }

// 변수 참조
{ "cornerRadius": "$--radius-m" }

// 개별 4모서리 [TopLeft, TopRight, BottomRight, BottomLeft]
{ "cornerRadius": ["$--radius-pill", "$--radius-xs", "$--radius-xs", "$--radius-pill"] }
```

---

## 16. 스타일 관리 체계

> 분석일: 2026-01-30
> 분석 방법: `index.js` 번들 내 SceneGraph, FileManager, VariableManager 코드 역공학

### 16.1 핵심 관리자 아키텍처

```
SceneManager (CNe) — React Context
├── SceneGraph — 노드 트리 관리 (CRUD)
├── FileManager — .pen 파일 I/O (읽기/쓰기)
├── VariableManager — $-- 변수 resolve + 테마 전환
└── UndoManager — 트랜잭션 기반 undo/redo
```

### 16.2 디자인 변수 시스템

Pencil의 핵심 기능으로, `$--` 접두사를 통한 변수 참조 시스템을 제공한다.

**변수 타입:**

| 타입 | 용도 | 예시 |
|------|------|------|
| `color` | 색상값 | `#5749F4`, `#FFFFFF` |
| `string` | 텍스트값 | `"Inter"`, `"Roboto"` |
| `number` | 수치값 | `24`, `999`, `6` |

**변수 정의 (테마별 분기):**

```json
{
  "themes": { "Mode": ["Light", "Dark"] },
  "variables": {
    "--primary": {
      "type": "color",
      "value": [
        { "value": "#5749F4", "theme": { "Mode": "Light" } },
        { "value": "#5749F4", "theme": { "Mode": "Dark" } }
      ]
    },
    "--background": {
      "type": "color",
      "value": [
        { "value": "#FFFFFF", "theme": { "Mode": "Light" } },
        { "value": "#131124", "theme": { "Mode": "Dark" } }
      ]
    },
    "--font-primary": {
      "type": "string",
      "value": [
        { "value": "Inter", "theme": { "Mode": "Light" } },
        { "value": "Inter", "theme": { "Mode": "Dark" } }
      ]
    },
    "--radius-m": { "type": "number", "value": 24 },
    "--radius-pill": { "type": "number", "value": 999 }
  }
}
```

**시맨틱 토큰 목록 (shadcn/ui 호환):**

| 카테고리 | 토큰 |
|----------|------|
| 기본 색상 | `--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--muted` |
| 컴포넌트 색상 | `--card`, `--popover`, `--border`, `--ring`, `--destructive` |
| 상태 색상 | `--color-success`, `--color-warning`, `--color-error`, `--color-info` |
| 사이드바 | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border` |
| 폰트 | `--font-primary`, `--font-secondary` |
| 라운딩 | `--radius-none(0)`, `--radius-xs(6)`, `--radius-m(24)`, `--radius-l(40)`, `--radius-pill(999)` |
| 유틸리티 | `--white`, `--black`, `--tile` |

### 16.3 변수 해석 흐름

```
노드 프로퍼티: fill = "$--primary"
        ↓
VariableManager.resolve("$--primary")
        ↓
현재 테마(Light/Dark) 확인 → activeTheme = { "Mode": "Light" }
        ↓
매칭되는 테마값 조회 → "#5749F4"
        ↓
properties.resolved.fill = "#5749F4"
        ↓
SkiaRenderer가 resolved 값으로 렌더링
```

### 16.4 트랜잭션 기반 상태 변경

모든 스타일 변경은 **원자적 트랜잭션**으로 래핑된다:

```
beginUpdate()
  → block.update(node, { fill: "#FF0000" })     // 변경 1
  → block.update(node, { cornerRadius: 12 })     // 변경 2
  → block.update(node, { stroke: { ... } })      // 변경 3
  → commitBlock({ undo: true })                  // 원자적 커밋 + undo 포인트 생성
```

- `beginUpdate()`: 트랜잭션 시작, 변경 버퍼 초기화
- `block.update()`: 버퍼에 변경 사항 축적 (아직 적용 안 됨)
- `commitBlock({ undo: true })`: 모든 변경을 한 번에 적용 + UndoManager에 undo 포인트 등록
- Undo 시 해당 블록의 모든 변경이 한 번에 롤백

**AI batch-design 처리:**

IPC를 통해 AI가 대규모 디자인 변경을 수행할 때도 동일한 트랜잭션 패턴 사용:

```
handleInsert(nodes)   — 노드 생성
handleUpdate(changes) — 노드 속성 변경
handleCopy(refs)      — 노드 복사
handleDelete(ids)     — 노드 삭제
```

### 16.5 스타일 우선순위 계층

```
1. 인스턴스 descendants 오버라이드 (최고 우선순위)
   ↓
2. 노드 직접 인라인 프로퍼티
   ↓
3. 변수 참조 ($--변수) → VariableManager가 테마별 resolve
   ↓
4. 변수 기본값 (테마 분기 없는 단일값)
```

### 16.6 스타일 프로퍼티 전체 목록

| 카테고리 | 프로퍼티 |
|----------|---------|
| **위치/크기** | `x`, `y`, `width`, `height`, `rotation` |
| **채우기** | `fill` (단일), `fills[]` (다중 — Color/Image/Gradient) |
| **선** | `stroke.align` (inside/center/outside), `stroke.thickness`, `stroke.fill` |
| **효과** | `effect.type`, `effect.shadowType`, `effect.color`, `effect.offset`, `effect.blur`, `effect.spread` |
| **모서리** | `cornerRadius` (단일 값, 4개 배열, 변수 참조 모두 가능) |
| **레이아웃** | `layout` (none/vertical/horizontal), `gap`, `padding`, `paddingHorizontal`, `paddingVertical` |
| **사이징** | `hugWidth/hugHeight` (FitContent/Fixed), `fillContainerWidth/Height` (FillContainer/Fixed), `clip` |
| **텍스트** | `fontSize`, `fontFamily`, `fontWeight`, `lineHeight`, `letterSpacing`, `textGrowth` (fixed-width/auto) |
| **이미지** | `fills[].url`, `fills[].mode` (Fill/Fit/Tile), `fills[].opacityPercent` |
| **그라디언트** | `fills[].stops[]`, `fills[].angle` (Linear), `fills[].center` (Radial) |

---

## 17. 에디터 UI 컴포넌트 구조

> 분석일: 2026-01-30
> 대상: `out/editor/assets/index.js` (5.7MB, 40,042줄 minified)
> 방법: esbuild minified 번들 역공학 — grep 패턴 매칭 + 코드 세그먼트 추출

### 17.1 앱 진입점 및 라우팅

```
App Root (vKt)
├── PostHog Analytics Provider — 사용자 행동 추적
├── Sentry Error Tracking — 에러 모니터링
├── IPC Provider — Electron 메인↔렌더러 통신
└── HashRouter (bKt)
    ├── /editor/:fileName?  → EditorPage (hY)
    ├── /generator           → Generator (yKt)
    └── /                    → Home/Landing
```

- **HashRouter** 사용 — Electron 파일 프로토콜(`file://`) 호환을 위해 BrowserRouter 대신 Hash 기반 라우팅
- 메인 에디터는 `/editor/:fileName?` 경로로 진입, 선택적 파일명 파라미터

### 17.2 메인 에디터 레이아웃

```
EditorPage (hY) — 파일 로드 + IPC 파일 이벤트 처리
└── MainEditor (gKt) — ref forwarded, CanvasKit/Skia + PixiJS 초기화
    │
    ├── TitleBar (YIt) ← Electron 전용
    │   └── 윈도우 컨트롤 (최소화/최대화/닫기)
    │
    ├── Left Panel (mKt) — 기본 200px 너비, 리사이즈 가능
    │   ├── Layers Toggle Button (ENe)
    │   ├── Design Kits & Style Guides Button (ANe)
    │   └── Layer List — TreeView 기반, 키보드 탐색 지원
    │       ├── ArrowDown/Up: 포커스 이동
    │       ├── ArrowRight: 확장 또는 하위 이동
    │       ├── ArrowLeft: 축소 또는 상위 이동
    │       └── Home/End: 처음/끝 이동
    │
    ├── Canvas Area — 중앙 전체 영역
    │   ├── PixiJS v8 Manager — WebGL 렌더링 컨텍스트
    │   ├── SkiaRenderer — CanvasKit WASM (pencil.wasm, 7.8MB)
    │   ├── Zoom Controls (fKt) — 줌 버튼 + 레벨 % 표시
    │   └── Tool Overlay (p$t) — 현재 도구별 인터랙션 레이어
    │
    ├── Right Panel / Properties Panel (eKt) — 우측 인스펙터
    │   ├── Transform: x, y, width, height, rotation
    │   ├── Layout: hugWidth/Height, fillContainer, childSpacing, padding
    │   ├── Corner Radius: 단일 또는 개별 4모서리 편집
    │   │   └── "Edit corners individually" 토글 버튼 (dh 함수)
    │   ├── Fill: 다중 fills 배열 (Color/Image/Gradient)
    │   ├── Stroke: align, thickness, fill
    │   ├── Effect: shadow (inner/outer), blur, spread
    │   └── Constraints: 부모 기준 제약 조건
    │
    ├── Variables Panel (cKt) — React Portal, 드래그 가능 Dialog
    │   ├── Toolbar: 핸들 바 (cursor-grab)
    │   ├── 변수 테이블: Name | Theme Values | Actions
    │   └── Add Dropdown: Color, Number, String 타입 선택
    │
    ├── AI Chat Panel (ARt) — Claude 통합
    │   ├── 모델 선택 (환경별 분기)
    │   ├── 프롬프트 입력 + 제출
    │   └── 프레임 → 코드 생성 기능
    │
    └── Activation Dialog (pKt) — 라이선스 관리
```

### 17.3 Properties Panel (eKt) 상세

우측 인스펙터 패널의 속성 편집 기능:

**레이아웃 속성 편집 (`pA` 함수):**

| 속성 | 편집 동작 |
|------|----------|
| `hugWidth` / `hugHeight` | `horizontalSizing: FitContent ↔ Fixed` 토글 |
| `fillContainerWidth` / `fillContainerHeight` | `FillContainer ↔ Fixed` 토글 |
| `clip` | 오버플로우 클리핑 토글 |
| `childSpacing` | frame/group 자식 간격 (gap) |
| `padding` / `paddingHorizontal` / `paddingVertical` | frame/group 내부 여백 |
| `cornerRadius` / `cornerRadius0~3` | 단일 또는 개별 4모서리 |

**코너 편집 UI:**
- 단일 입력 필드 (4모서리 동시)
- "Edit corners individually" 토글 → 4개 개별 입력 필드로 전환
- `focus-visible:border-[#3D99FF]` 포커스 스타일

### 17.4 Variables Panel (cKt) 상세

React Portal로 렌더링되는 드래그 가능한 플로팅 다이얼로그:

```javascript
L_.createPortal(
  b.jsxs("div", {
    role: "dialog",
    "aria-label": "Variables Panel",
    className: "fixed z-50 bg-card rounded-lg shadow-md overflow-hidden ...",
    children: [
      // 1. 드래그 핸들 바
      //    className: "handle flex flex-row pl-2 pr-1 mt-2 border-b cursor-grab active:cursor-grabbing"
      // 2. 변수 테이블: Name | Theme Values | Actions
      // 3. 변수 추가 Dropdown: Color, Number, String
    ]
  })
)
```

- **드래그**: `cursor-grab` + `active:cursor-grabbing` 핸들
- **테마 축 관리**: 테마 차원(Mode) 및 값(Light/Dark) CRUD
- **변수 CRUD**: 추가/수정/삭제, 타입별(Color/Number/String) 입력 UI
- **테마별 값 편집**: 각 변수의 테마 조합별 값 개별 편집

### 17.5 다이얼로그/모달 시스템

| 다이얼로그 | 방식 | 특징 |
|-----------|------|------|
| **Alert Dialog** | Radix AlertDialog | `role="alertdialog"`, `backdrop-blur-sm bg-black/50` |
| **Variables Panel** | React Portal | `role="dialog"`, 드래그 가능 |
| **Activation Dialog** | 커스텀 | 라이선스 활성화/관리 |
| **MCP Setup** | 커스텀 | Claude Code 연동 설정 |

**플랫폼별 모서리 분기:**
```javascript
style: {
  cornerShape: Or.isElectron ? "squircle" : "round",
  borderRadius: Or.isElectron ? "80px" : "32px"
}
```
- **Electron**: macOS 네이티브 느낌의 squircle 모서리 (80px)
- **웹**: 일반 round 모서리 (32px)

### 17.6 UI 라이브러리 스택

| 라이브러리 | 역할 | 버전/비고 |
|-----------|------|----------|
| **React** | UI 레이어 | HashRouter, Context, Hooks |
| **Radix UI** | 헤드리스 컴포넌트 | DropdownMenu, Popover, Dialog, AlertDialog |
| **Tailwind CSS** | 유틸리티 퍼스트 스타일링 | `focus-visible:border-[#3D99FF]` 등 |
| **Lucide Icons** | 아이콘 시스템 | 도구바, 패널, 버튼 |
| **Sonner** | Toast 알림 | 작업 완료/에러 피드백 |
| **PostHog** | 사용자 분석 | 도구 전환, 기능 사용 추적 |
| **Sentry** | 에러 추적 | v7.6.0, 런타임 에러 모니터링 |

**Radix UI 컴포넌트 상세:**
- `DropdownMenu`: Trigger, Portal, Content, Group, Label, Item, CheckboxItem, RadioGroup, RadioItem
  - CSS 변수: `--radix-dropdown-menu-content-available-width/height`, `--radix-dropdown-menu-trigger-width/height`
- `Popover`: Root, Anchor, Trigger, Portal, Content (Modal/Non-modal)
  - `RemoveScroll` 통합으로 스크롤 잠금 지원
- `AlertDialog`: `role="alertdialog"`, backdrop-blur-sm, bg-black/50

---

## 18. 도구 시스템 및 키보드 단축키

### 18.1 도구 관리 클래스 (`x_t`)

```javascript
class x_t {
  activeTool = "move";  // 기본 도구

  setActiveTool(tool) {
    iC.capture("set-active-tool", { tool }); // PostHog 분석 이벤트
    this.activeTool = tool;
    this.eventEmitter.emit("toolChange", this.activeTool);
  }
}
```

### 18.2 도구 목록

| 도구 | 단축키 | 생성 노드 | 기본 스타일 | 커서 |
|------|--------|----------|-----------|------|
| **Move** | `V` | — | 선택/이동 (기본) | default |
| **Hand** | `H` | — | 캔버스 패닝 | grab / grabbing |
| **Rectangle** | `R` | `rectangle` | `fills: [{type: Color, color: "#CCCCCC"}]` | crosshair |
| **Ellipse** | `O` | `ellipse` | `fills: [{type: Color, color: "#CCCCCC"}]` | crosshair |
| **Frame** | `F` | `frame` | 레이아웃 컨테이너 | crosshair |
| **Text** | `T` | text | 텍스트 편집 모드 | text |
| **Sticky Note** | `N` | sticky_note | 250×219px, `#E8F6FFcc` 배경, `#009DFFcc` 테두리 | crosshair |
| **Icon Font** | `L` | icon_font | 24×24px, Lucide Icons | 24×24 커스텀 |

### 18.3 전체 키보드 단축키 (`mUt` 배열)

| 카테고리 | 단축키 | 기능 |
|---------|--------|------|
| **General** | `Cmd+C` | Copy |
| | `Cmd+V` | Paste |
| | `Cmd+X` | Cut |
| | `Cmd+D` | 선택 노드 복제 (`duplicateSelectedNodes()`) |
| | `Cmd+'` | 픽셀 그리드 토글 (`showPixelGrid`) |
| | `Cmd+Shift+'` | 픽셀 스냅 토글 (`roundToPixels`) |
| **Selection** | `Cmd+A` | 전체 선택 |
| | `Cmd+Click` | Deep Select (하위 요소 직접 선택) |
| | `Esc` | 선택 해제 |
| | `Shift+Enter` | 부모 선택 |
| **Navigation** | `Cmd+Scroll` | 줌 |
| | `Space+Drag` | 패닝 |
| | `=` | 줌 인 |
| **Tools** | `V` | Move |
| | `H` | Hand |
| | `R` | Rectangle |
| | `O` | Ellipse |
| | `T` | Text |
| | `F` | Frame |
| | `N` | Sticky Note |
| | `L` | Icon Font |
| **Layer Tree** | `↓` / `↑` | 포커스 이동 |
| | `→` | 노드 확장 또는 하위 이동 |
| | `←` | 노드 축소 또는 상위 이동 |
| | `Home` / `End` | 첫/마지막 항목 포커스 |

---

## 19. 에디터 설정 시스템

### 19.1 설정 저장

설정은 `localStorage("pencil-config")`에 JSON으로 저장된다.

### 19.2 기본값 객체 (`Jfe`)

```javascript
const Jfe = {
  snapToObjects: true,           // 객체 스냅
  roundToPixels: true,           // 픽셀 그리드 스냅
  showPixelGrid: true,           // 픽셀 그리드 표시
  scrollWheelZoom: false,        // 스크롤 휠 줌
  invertZoomDirection: false,    // 줌 방향 반전
  leftPanelWidth: 200,           // 좌측 패널 너비 (px)
  leftPanelOpen: true,           // 좌측 패널 열림 상태
  hideSidebarWhenLayersAreOpen: false, // 레이어 열림 시 사이드바 숨김
  generatingEffectEnabled: true  // AI 생성 이펙트 활성화
};
```

### 19.3 설정 연결 단축키

| 설정 | 단축키 | 동작 |
|------|--------|------|
| `showPixelGrid` | `Cmd+'` | 픽셀 그리드 표시 토글 |
| `roundToPixels` | `Cmd+Shift+'` | 픽셀 스냅 토글 |

---

## 20. AI 통합 상세 분석

> Pencil은 Claude AI를 에디터에 직접 통합하여 디자인-코드 변환을 지원한다.

### 20.1 환경별 모델 지원

| 환경 | 사용 가능 모델 | 기본 모델 |
|------|--------------|----------|
| **Electron** (데스크톱) | Sonnet 4.5, Haiku 4.5, Opus 4.5 | Opus 4.5 |
| **Cursor** (IDE 통합) | Sonnet 4.5, Haiku 4.5, Composer | Composer |
| **기타** (웹) | — | — |

### 20.2 모델 선택 로직

```javascript
getAvailableModels() {
  if (mR === "Cursor") {
    return {
      models: [
        { label: "Sonnet 4.5", id: "claude-4.5-sonnet" },
        { label: "Haiku 4.5", id: "claude-4.5-haiku" },
        { label: "Composer", id: "cursor-composer" }
      ],
      defaultModel: { label: "Composer", id: "cursor-composer" }
    };
  }
  if (mR === "Electron") {
    return {
      models: [
        { label: "Sonnet 4.5", id: "claude-4.5-sonnet" },
        { label: "Haiku 4.5", id: "claude-4.5-haiku" },
        { label: "Opus 4.5", id: "claude-4.5-opus" }
      ],
      defaultModel: { label: "Opus 4.5", id: "claude-4.5-opus" }
    };
  }
  return { models: [] };
}
```

### 20.3 IPC 기반 프롬프트 제출

```javascript
submitPrompt(prompt, model) {
  this.ipc.notify("submit-prompt", { prompt, model });
}
```

### 20.4 AI 기능 목록

| 기능 | 설명 |
|------|------|
| **Claude Code CLI 연동** | `curl -fsSL https://claude.ai/install.sh \| bash` 설치, `/login` 인증 |
| **API Key 직접 입력** | `console.anthropic.com/settings/keys` 링크 제공 |
| **MCP 도구 연동** | `/mcp` 명령어로 외부 도구 연결 |
| **프레임 → 코드 생성** | 디자인 프레임 선택 후 코드 자동 생성 ("Generate code from 'Frame'") |
| **디자인 프롬프트** | 자연어로 디자인 생성 ("Design a modern web app for...") |
| **batch-design** | IPC를 통한 대규모 디자인 변경 (handleInsert/Update/Copy/Delete) |

### 20.5 MCP 어댑터 연동 CLI

| CLI | 설명 |
|-----|------|
| `claudeCodeCLI` | Claude Code CLI |
| `codexCLI` | OpenAI Codex CLI |
| `geminiCLI` | Google Gemini CLI |
| `openCodeCLI` | OpenCode CLI |

---

## 21. 렌더링 파이프라인 심층 분석

> 분석일: 2026-01-30
> 분석 방법: `renderSkia()`, `beginRenderEffects()`, `renderFills()` 등 핵심 메서드 역공학
> **중요 정정**: Skia가 메인 렌더러이며, PixiJS는 씬 그래프/이벤트 레이어로만 사용됨

### 21.1 이중 렌더링 아키텍처

| 역할 | 기술 | 상세 |
|------|------|------|
| **메인 렌더러** | CanvasKit/Skia WASM | 모든 디자인 노드의 실제 렌더링 — 벡터 패스, 텍스트, 이미지, 효과, 그라디언트 |
| **씬 그래프/이벤트** | PixiJS v8 | Container 계층, EventBoundary (hit testing), TexturePool, CacheAsTexture |
| **레이아웃** | @pixi/layout (Yoga WASM) | Flexbox 레이아웃 계산 |
| **오프스크린** | Web Workers | webworkerAll.js — PixiJS 확장 등록 |

**증거**: 모든 씬 노드(`FrameNode`, `ShapeNode`, `TextNode`, `GroupNode`, `IconFontNode`, `StickyNode`)가 `renderSkia(renderer, canvas, cullingBounds)` 메서드를 구현하며, CanvasKit Canvas API(`drawPath`, `clipPath`, `saveLayer` 등)를 직접 호출한다. PixiJS의 `Sprite.render()`나 `Graphics.render()`는 디자인 노드 렌더링에 사용되지 않는다.

### 21.2 렌더 루프 전체 흐름

```
requestFrame()
│
↓
render()
├── surfaceCanvas.clear(backgroundColor)
│
├── displayContentCanvas()                    ← 캐시된 콘텐츠 블리팅
│   └── redrawContentIfNeeded()               ← contentNeedsRedraw 시 실행
│       ├── contentCanvas.clear([0,0,0,0])
│       ├── contentCanvas.save()
│       ├── canvas.translate(contentRenderPadding)
│       ├── canvas.scale(dpi, dpi)            ← DPI 스케일링
│       ├── canvas.concat(camera.worldTransform)  ← 카메라 변환
│       ├── viewport.children.forEach(child →
│       │   child.renderSkia(this, canvas, contentRenderedBounds))
│       │   ├── 뷰포트 컬링 검사 (intersects)
│       │   ├── canvas.save() + localMatrix 적용
│       │   ├── beginRenderEffects()          ← opacity/blur/shadow
│       │   ├── renderFills()                 ← Color/Gradient/Image/Mesh
│       │   ├── strokePath.render()           ← 스트로크
│       │   ├── 자식 재귀 renderSkia()
│       │   └── canvas.restoreToCount()
│       └── contentCanvas.restore()
│
├── renderGeneratingEffects()                 ← AI 생성 이펙트 (블러+파티클)
├── renderFlashes()                           ← 시각적 피드백 애니메이션
├── renderScrollbars()
└── surface.flush()                           ← GPU 커밋
```

### 21.3 이중 Surface 캐싱 패턴

Pencil은 **contentSurface**와 **mainSurface** 두 개의 Skia Surface를 운용한다:

```
mainSurface (화면 출력용)
├── contentSurface 이미지 블리팅 (캐시됨)
│   └── 디자인 노드 전체 렌더링 결과
├── 생성 이펙트 오버레이
├── 플래시 애니메이션 오버레이
└── 스크롤바 오버레이
```

**블리팅 방식:**
```javascript
displayContentCanvas() {
    const image = this.contentSurface.makeImageSnapshot();
    // 줌 변경 시: drawImageCubic (cubic 보간으로 부드럽게)
    // 줌 동일 시: drawImage (nearest로 빠르게)
    canvas.drawImageCubic(image, dx, dy, 1/3, 1/3, paint);
    image.delete();
}
```

**이점**: 줌/패닝만 변경된 경우 콘텐츠를 다시 그리지 않고 캐시된 이미지만 블리팅 → 프레임 비용 대폭 절감.

### 21.4 GPU Surface 생성 체인

```
1. k.MakeWebGLCanvasSurface(canvasElement)
   ↓
2. k.GetWebGLContext(canvas, contextAttrs)     ← WebGL 컨텍스트 획득
   ↓
3. k.MakeWebGLContext(glContext)               ← GrDirectContext 생성
   ↓
4. k.MakeOnScreenGLSurface(grContext, w, h, colorSpace)
   ↓ (실패 시)
5. k.MakeSWCanvasSurface(canvas)              ← 소프트웨어 폴백
   → Canvas 2D putImageData로 출력
```

**GPU 리소스 관리:**
```javascript
k.GrDirectContext.prototype.setResourceCacheLimitBytes(bytes)  // GPU 캐시 한도
k.GrDirectContext.prototype.releaseResourcesAndAbandonContext() // 리소스 해제
```

**소프트웨어 폴백:**
```javascript
k.Surface.prototype.flush = function(clipRect) {
    this._flush();
    if (this.Hd) {  // canvas 2D element = SW 모드
        const pixels = new Uint8ClampedArray(k.HEAPU8.buffer, this.Te, this.rf);
        const imageData = new ImageData(pixels, this.tf, this.pf);
        if (clipRect)
            ctx.putImageData(imageData, 0, 0, clipRect[0], clipRect[1], ...);
        else
            ctx.putImageData(imageData, 0, 0);
    }
};
```

### 21.5 노드별 renderSkia 상세

**공통 패턴 (모든 노드):**
```javascript
renderSkia(renderer, canvas, cullingBounds) {
    if (!this.properties.resolved.enabled ||
        !cullingBounds.intersects(this.getVisualWorldBounds())) return;  // 컬링
    const saveCount = canvas.getSaveCount();
    canvas.save();
    canvas.concat(this.localMatrix.toArray());  // 로컬 변환
    this.beginRenderEffects(canvas);            // 이펙트
    // ... 노드 타입별 렌더링 ...
    canvas.restoreToCount(saveCount);
}
```

| 노드 타입 | 클래스 | 렌더링 내용 |
|----------|--------|-----------|
| **Frame** | `jx` | renderFills → clipPath (clip=true) → 자식 재귀 → strokePath → 슬롯 렌더링 |
| **Shape** | Path계열 | fillRule (EvenOdd/Winding) → renderFills → strokePath |
| **Text** | Text | getParagraphPosition → renderFills (텍스트 형상에 fill 적용) |
| **Group** | `z_` | localMatrix 적용 → 자식 재귀만 |
| **IconFont** | 아이콘 | getIconTransform → paragraph 렌더링 (Lucide) |
| **StickyNote** | `zf` 뷰 | getView().render() — 별도 뷰 시스템 |

### 21.6 이펙트 렌더링 시스템 (`beginRenderEffects`)

```
beginRenderEffects(canvas)
├── Opacity < 1.0
│   └── canvas.saveLayer(alphaPaint, bounds)    ← 별도 레이어
│
├── BackgroundBlur (Nr=3)
│   ├── canvas.clipPath(maskPath, Intersect)
│   └── canvas.saveLayer(paint, bounds, MakeBlur(sigma, sigma))
│
├── LayerBlur (Nr=2)
│   └── canvas.saveLayer(paint, bounds, MakeBlur(sigma, sigma))
│
└── DropShadow (Nr=1)
    ├── Inner Shadow:
    │   ├── canvas.clipPath(maskPath, Difference)
    │   └── canvas.drawPath(maskPath, shadowPaint)
    └── Outer Shadow:
        └── ImageFilter.MakeDropShadow(offsetX, offsetY, sigma, sigma, color)
```

**이펙트 타입 enum:**
```javascript
var Nr = { DropShadow: 1, LayerBlur: 2, BackgroundBlur: 3 };
```

**블러 시그마 변환:** `function gC(radius) { return radius / 2; }` (CSS radius → Skia sigma)

### 21.7 Fill 렌더링 상세 (`renderFills`)

| Fill 타입 | CanvasKit API | 처리 방식 |
|----------|--------------|----------|
| **Color** (`Rt.Color`) | `paint.setColor()` → `canvas.drawPath()` | 단색 직접 적용 |
| **LinearGradient** | `Shader.MakeLinearGradient(start, end, colors, positions)` | 선형 셰이더 |
| **RadialGradient** | `Shader.MakeRadialGradient(center, radius, colors, positions)` | 방사형 셰이더 |
| **AngularGradient** | `Shader.MakeSweepGradient(cx, cy, colors, positions)` | 각도 셰이더 |
| **MeshGradient** | `canvas.clipPath()` → `drawPatch()` (12 cubic points, 4 colors) | 메시 패치 |
| **Image** | `image.makeShaderOptions(TileMode, FilterMode, MipmapMode, matrix)` | 이미지 셰이더 |

**이미지 Fill 모드:**
- `Stretch`: 늘리기 — 원본 비율 무시
- `Fill`: 채우기 — 크롭하여 전체 영역 덮기
- `Fit`: 맞추기 — 영역 안에 전부 보이기
- `Tile`: 타일 — `TileMode.Repeat`

**이미지 로드 실패 시:** 체커보드 패턴 폴백 렌더링

### 21.8 스트로크 렌더링 (`StrokePath`)

스트로크를 Fill로 변환하여 렌더링 — **스트로크에도 그라디언트/이미지 fill 적용 가능**:

```javascript
// Stroke Alignment별 PathOp
switch (alignment) {
    case Center:  return strokePath;                                  // 중심선
    case Inside:  return Path.MakeFromOp(fillPath, strokePath, Intersect); // 내부
    case Outside: return Path.MakeFromOp(fillPath, strokePath, Difference); // 외부
}

// 스트로크 경로 생성
path.makeStroked({
    width: strokeWidth,
    miter_limit: 4,
    cap: StrokeCap.Butt,     // Butt / Round / Square
    join: StrokeJoin.Miter,  // Miter / Round / Bevel
    precision: 0.3
})
```

### 21.9 텍스트 렌더링 (이중 시스템)

**CanvasKit Paragraph API (메인 — 디자인 노드 렌더링):**
```
ParagraphBuilder.Make(paragraphStyle, fontCollection)
  → addText(text)
  → pushStyle(textStyle)
  → build()
  → paragraph.layout(maxWidth)
```

| 텍스트 속성 | 지원 |
|------------|------|
| `textAlign` | Start, End, Center, Justify, Left, Right |
| `textDirection` | LTR, RTL |
| `fontStyle` | Upright, Italic + weight (100-900) |
| `decoration` | Underline, Overline, LineThrough |
| `letterSpacing`, `wordSpacing` | 지원 |
| `heightMultiplier` | 줄 높이 배수 |
| `lineBreak/GraphemeBreak` | UTF-8/UTF-16 수동 지정 가능 |

**PixiJS TextMetrics (보조 — 측정/UI 텍스트):**
- `measureText()`, `_wordWrap()`, `_measureText()`
- `graphemeSegmenter()` — 유니코드 그래핌 분할
- `experimentalLetterSpacingSupported` 감지

### 21.10 뷰포트 컬링

모든 `renderSkia` 첫 줄에서 **AABB 교차 검사**:

```javascript
if (!cullingBounds.intersects(this.getVisualWorldBounds())) return;

// Bounds.intersects:
intersects(other) {
    return this.minX < other.maxX && this.maxX > other.minX &&
           this.minY < other.maxY && this.maxY > other.minY;
}
```

- `cullingBounds`: 현재 뷰포트 영역 (`contentRenderedBounds`)
- `getVisualWorldBounds()`: 노드의 월드 좌표 바운딩 박스 (이펙트 크기 포함)
- **재귀적 컬링**: 부모가 컬링되면 자식도 자동 스킵

### 21.11 Hit Testing (PixiJS EventBoundary)

```
hitTest(x, y)
└── hitTestRecursive(rootTarget, eventMode, point, hitTestFn, hitPruneFn)
    ├── _interactivePrune(element)     ← visible/renderable/measurable 체크
    ├── hitPruneFn(element, point)      ← hitArea + effects.containsPoint
    │   └── worldTransform.applyInverse(point)  ← 스크린→로컬 변환
    ├── children (역순, z-top 우선)
    │   └── hitTestRecursive(child, ...) ← 재귀
    └── hitTestFn(element, point)       ← containsPoint 최종 판정
```

**containsPoint 계층:**
- `Bounds.containsPoint()` — AABB 사전 검사
- `Rectangle.containsPoint()` — cornerRadius 포함 라운드 렉트
- `GraphicsContext.containsPoint()` — stroke path 포함 정밀 판정

### 21.12 블렌드 모드 매핑 (`l1e`)

| Pencil | CanvasKit | Pencil | CanvasKit |
|--------|-----------|--------|-----------|
| `normal` | `SrcOver` | `overlay` | `Overlay` |
| `darken` | `Darken` | `softLight` | `SoftLight` |
| `multiply` | `Multiply` | `hardLight` | `HardLight` |
| `linearBurn` | `Multiply` | `difference` | `Difference` |
| `colorBurn` | `ColorBurn` | `exclusion` | `Exclusion` |
| `light` | `Lighten` | `hue` | `Hue` |
| `screen` | `Screen` | `saturation` | `Saturation` |
| `linearDodge` | `Plus` | `color` | `Color` |
| `colorDodge` | `ColorDodge` | `luminosity` | `Luminosity` |

### 21.13 Export/래스터화

```javascript
exportToImage(nodes, { type, dpi, maxResolution }) {
    // 1. 바운딩 박스 합산
    // 2. 오프스크린 Surface 생성 (dpi 배율 적용, maxResolution 제한)
    // 3. 각 노드 renderSkia() 호출
    // 4. makeImageSnapshot() → encodeToBytes(format, quality)
}
```

| 포맷 | type | 용도 |
|------|------|------|
| PNG | `0` | 투명 배경 지원 |
| JPEG | `1` | 사진 |
| WEBP | `2` | 최적화 웹 |

**readPixel**: `surfaceCanvas.readPixels(x * dpi, y * dpi, ...)` — 특정 좌표 픽셀 색상 읽기 (컬러 피커)

### 21.14 시각적 피드백 시스템

**Flash 애니메이션** (노드 변경 시):
```javascript
addFlashForNode(node, {
    color: [96/255, 125/255, 255/255],  // 라이트 블루
    strokeWidth: 2,
    longHold: false,
    scanLine: true
})
```
- 스캔라인 그라디언트 + 스트로크 RRect 애니메이션
- AI batch-design 후 변경 노드에 자동 적용

**Generating Effect** (AI 생성 중):
- `placeholder: true` 노드에 자동 추가
- 블러 레이어 + 회전하는 파란색 원형 파티클
- `currentTime / 2000`으로 각도 회전
- AI 응답 완료 시 제거

### 21.15 WASM 메모리 관리

```javascript
// 사전 할당 버퍼 (핫 경로 malloc 회피)
_f  = k.Malloc(Float32Array, 4)     // 색상/좌표
Jv  = k.Malloc(Float32Array, 16)    // 4x4 매트릭스
Wm  = k.Malloc(Float32Array, 9)     // 3x3 매트릭스
at  = k.Malloc(Float32Array, 12)    // RRect

// JS → WASM 복사 헬퍼
Ye(array, "HEAPF32", destPtr)       // Float32Array → HEAP
St(colors)                           // Color 배열 → HEAP (RGBA_F32)
$t(matrix)                           // Matrix → HEAP

// WASM → JS 해제
Pe(ptr, originalArray)               // _ck 플래그 없으면 _free
```

### 21.16 안티앨리어싱

| 설정 | 값 | 위치 |
|------|-----|------|
| Paint 안티앨리어싱 | `setAntiAlias(true)` | CanvasKit Paint 기본 |
| 서브픽셀 텍스트 | `setSubpixel(true)` | Font 렌더링 |
| 이미지 스무딩 | `imageSmoothingEnabled: true` | Canvas 2D 폴백 |
| 이미지 품질 | `imageSmoothingQuality: "high"` | Canvas 2D 폴백 |
| PixiJS Filter | `antialias: "on" / "off"` | Filter 파이프라인 |

### 21.17 렌더링 계층 종합

| 계층 | 기술 | 역할 |
|------|------|------|
| **DOM Layer** | React + Radix UI + Tailwind | 패널, 도구바, 다이얼로그 등 UI |
| **Scene Layer** | SceneManager (Context) | 노드 트리, 변수, 트랜잭션 관리 |
| **Vector Layer** | CanvasKit/Skia (WASM) — **메인 렌더러** | 모든 디자인 노드 렌더링 |
| **Event Layer** | PixiJS v8 EventBoundary | Hit testing, 마우스/터치 이벤트 |
| **Cache Layer** | 이중 Surface (content + main) | 콘텐츠 캐싱, 줌/패닝 최적화 |
| **Worker Layer** | Web Workers (webworkerAll.js) | 오프메인스레드 연산 |

---

## 22. 내장 디자인 킷

에디터 번들에 4개의 디자인 킷이 JSON으로 임베딩되어 있다.

### 22.1 디자인 킷 목록

| 디자인 킷 | 컴포넌트 수 | 특징 |
|----------|-----------|------|
| **HALO** | 20+ | 라운드 스타일, 보라/파랑 계열 |
| **Lunaris** | 20+ | 다크 테마 중심 |
| **Nitro** | 20+ | 미니멀 스타일 |
| **Shadcn** | 20+ | shadcn/ui 호환, 50+ 시맨틱 변수 |

### 22.2 공통 컴포넌트 목록

| 카테고리 | 컴포넌트 |
|----------|---------|
| **Navigation** | Sidebar (Header/Content/Footer), Breadcrumb Item, Menu |
| **Forms** | Input (Group/Default), Select (Group/Default), Textarea (Group/Default), OTP Input |
| **Interactive** | Checkbox, Radio Button, Switch/Checked, Dropdown, Accordion |
| **Data Display** | Data Table (Header/Content/Footer), Progress Bar, Badge |
| **Feedback** | Alert (Info/Error/Success/Warning), Tooltip |
| **Layout** | Card (Header/Content/Actions), Avatar (Text/Image) |
| **Indicators** | Progress, Label (Success/Destructive) |

### 22.3 컴포넌트 구조

각 디자인 킷의 컴포넌트는 다음 구조를 따른다:

```json
{
  "name": "Sidebar",
  "reusable": true,
  "children": [
    {
      "name": "Sidebar Header",
      "children": [ /* 로고, 브랜딩 */ ]
    },
    {
      "name": "Sidebar Content",
      "children": [ /* slot 기반 동적 콘텐츠 */ ]
    },
    {
      "name": "Sidebar Footer",
      "children": [ /* 사용자 정보, 메뉴 */ ]
    }
  ]
}
```

- **Slot 기반 합성**: 컨텐츠 영역에 slot 노드를 배치하여 유연한 구성
- **변수 참조**: 모든 색상/폰트/라운딩이 `$--` 변수로 참조 → 테마 전환 시 자동 반영
- **Reusable 플래그**: `"reusable": true`로 컴포넌트 등록 → 인스턴스 생성 가능

### 22.4 디자인 킷 로드 방식

사용자가 Design Kits & Style Guides 버튼(`ANe`)을 통해 킷을 선택하면:

1. 해당 킷의 JSON 데이터가 현재 프로젝트에 로드
2. 킷의 `variables` 정의가 프로젝트 변수에 병합
3. 킷의 `themes` 정의가 프로젝트 테마에 병합
4. `reusable: true` 컴포넌트들이 컴포넌트 라이브러리에 등록
5. 사용자가 인스턴스(`ref`)를 생성하여 디자인에 배치

---

## 23. 씬 그래프 노드 타입별 구조 분석

> 분석일: 2026-01-30
> 분석 방법: `index.js` 번들 내 노드 팩토리, 클래스 계층, renderSkia, 직렬화 코드 역공학

### 23.1 노드 클래스 계층 구조

모든 씬 노드는 단일 베이스 클래스 `z_`를 상속하며, **6개 구체 클래스**가 **12개 타입 문자열**을 처리한다.

```
z_ (Base Node — id, type, properties, layout, children)
│
├── jx   — FrameNode      ("frame")
│         컨테이너, 오토 레이아웃, 클리핑, 슬롯
│
├── vXe  — GroupNode       ("group")
│         논리적 그룹 컨테이너, 이펙트만 적용
│
├── Kke  — ShapeNode       ("rectangle", "ellipse", "line", "path", "polygon")
│         다형성 — type 판별자로 5종 도형 처리
│
├── Ux   — TextNode        ("text")
│         ParagraphBuilder 기반 텍스트 렌더링
│
├── oI   — StickyNode      ("note", "prompt", "context")
│         AI 프롬프트/노트, 내부 뷰 시스템
│
└── _Xe  — IconFontNode    ("icon_font")
          Material Symbols/Lucide 아이콘 글리프
```

### 23.2 노드 팩토리 (`Io.createNode`)

```javascript
// Scenegraph 클래스(Io)의 정적 팩토리 메서드
if (type === "text")
    → new Ux(id, props)                               // TextNode
else if (type === "note" || "prompt" || "context")
    → new oI(id, type, props)                          // StickyNode (3 서브타입)
else if (type === "path" || "rectangle" || "ellipse" || "line" || "polygon")
    → new Kke(id, type, props)                         // ShapeNode (5 서브타입)
// else → frame: jx, group: vXe, icon_font: _Xe
```

**직렬화 전용 의사 타입:**
- `"ref"` — 컴포넌트 인스턴스 참조 (별도 클래스가 아닌 직렬화 형식)
- `"sticky_note"` — 레거시 타입 (내부적으로 `"note"`로 매핑)
- `"image"` — 툴바에서 파일 임포트 트리거 (별도 노드 클래스 없음, `"rectangle"` + image fill로 처리)

### 23.3 공통 베이스 프로퍼티 (`sf()` 함수)

모든 노드 타입이 공유하는 기본 속성 (프로퍼티 객체 `tyt`로 관리):

```javascript
sf(type, overrides = {}) → {
    // 변환
    enabled: true,
    x: 0, y: 0,
    width: 0, height: 0,
    rotation: 0,
    flipX: false, flipY: false,

    // 외관
    opacity: 1,
    clip: false,

    // 레이아웃
    layoutMode: ii.None,            // 0 = 오토 레이아웃 없음
    layoutAlignItems: fr.Start,     // 0
    layoutJustifyContent: hi.Start, // 0
    horizontalSizing: Zt.Fixed,     // 0
    verticalSizing: Zt.Fixed,       // 0
    placeholder: false,

    // 텍스트 (모든 타입에 포함)
    textAlign: "left",
    textAlignVertical: "top",
    fontSize: 14,
    letterSpacing: 0,
    fontFamily: "Inter",
    fontWeight: "normal",
    fontStyle: "normal",
    textGrowth: "auto",
    lineHeight: 0,

    ...overrides  // 타입별 오버라이드
}
```

### 23.4 노드 타입별 고유 프로퍼티

#### FrameNode (`"frame"`)

| 프로퍼티 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `cornerRadius` | `number[]` | - | 4개 꼭짓점 반경 배열 |
| `clip` | `boolean` | `false` | 자식 클리핑 |
| `fills` | `Fill[]` | - | Fill 배열 (6종) |
| `strokeFills` | `Fill[]` | - | 스트로크 Fill |
| `strokeWidth` | `number` | - | 스트로크 두께 |
| `strokeAlignment` | `Rr` | - | Inside/Center/Outside |
| `lineJoin` | `string` | - | Miter/Round/Bevel |
| `lineCap` | `string` | - | Butt/Round/Square |
| `effects` | `Effect[]` | - | 이펙트 배열 |
| `slot` | `object` | - | 슬롯 정의 |
| `layoutMode` | `ii` | `Horizontal(1)` | **프레임 기본값 오버라이드** |
| `horizontalSizing` | `Zt` | `FitContent(2)` | **프레임 기본값 오버라이드** |
| `verticalSizing` | `Zt` | `FitContent(2)` | **프레임 기본값 오버라이드** |
| `layoutChildSpacing` | `number` | - | 자식 간격 (gap) |
| `layoutPadding` | `number/array` | - | 패딩 (1/2/4 값) |
| `layoutIncludeStroke` | `boolean` | - | 레이아웃에 스트로크 포함 |
| `frameMaskDisabled` | `boolean` | - | 레거시: clip 매핑 |

#### ShapeNode (5종 도형 공통)

| 프로퍼티 | 타입 | 설명 |
|---------|------|------|
| `fills` | `Fill[]` | Fill 배열 (6종) |
| `strokeFills` | `Fill[]` | 스트로크 Fill |
| `strokeWidth` | `number` | 스트로크 두께 |
| `strokeAlignment` | `Rr` | Inside/Center/Outside |
| `lineJoin`, `lineCap` | `string` | 선 조인/캡 |
| `effects` | `Effect[]` | 이펙트 배열 |

**도형별 추가 프로퍼티:**

| 도형 | 고유 프로퍼티 | 설명 |
|------|-------------|------|
| `"rectangle"` | `cornerRadius: number[]` | 4개 꼭짓점 반경 |
| `"ellipse"` | `ellipseInnerRadius`, `ellipseStartAngle`, `ellipseSweep` | 도넛/부채꼴 지원 |
| `"line"` | (없음) | 시작점(0,0) → 끝점(w,h) |
| `"path"` | `pathData: string`, `fillRule: "nonzero"/"evenodd"` | SVG path 문자열 |
| `"polygon"` | `polygonCount: number`, `cornerRadius` | 정다각형 + 코너 반경 |

#### TextNode (`"text"`)

| 프로퍼티 | 기본값 | 설명 |
|---------|--------|------|
| `textContent` | - | 텍스트 내용 |
| `textGrowth` | `"auto"` | `"auto"` / `"fixed-width"` / `"fixed-width-height"` |
| `textAlignVertical` | `"top"` | 수직 정렬 |
| `letterSpacing` | `0` | 자간 |
| `lineHeight` | `0` | 행간 |
| `fills` | - | 텍스트 색상 (Fill 배열) |
| `strokeFills`, `strokeWidth` | - | 텍스트 스트로크 |
| `effects` | - | 이펙트 배열 |

#### IconFontNode (`"icon_font"`)

| 프로퍼티 | 기본값 | 설명 |
|---------|--------|------|
| `iconFontName` | - | 아이콘 이름 |
| `iconFontFamily` | `"Material Symbols Rounded"` | 폰트 패밀리 |
| `iconFontWeight` | - | 아이콘 무게 |
| `fills` | - | 아이콘 색상 |
| `effects` | - | 이펙트 배열 |

#### StickyNode (`"note"` / `"prompt"` / `"context"`)

| 프로퍼티 | 기본값 | 설명 |
|---------|--------|------|
| `textContent` | - | 노트/프롬프트 내용 |
| `color` | - | 배경 색상 (fills 배열이 아님) |
| `fontSize` | `16` | 기본값 오버라이드 (일반 노드는 14) |
| `fontWeight` | `"400"` | 기본값 오버라이드 |
| `modelName` | - | AI 모델명 (`"prompt"` 전용) |

### 23.5 기능 지원 매트릭스

| 기능 | frame | group | rect | ellipse | line | path | polygon | text | icon_font | sticky |
|------|:-----:|:-----:|:----:|:-------:|:----:|:----:|:-------:|:----:|:---------:|:------:|
| **자식 노드** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fills** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Strokes** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Effects** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Clip** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Auto Layout** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Corner Radius** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Slot** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **getMaskPath** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Custom Hit Test** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

### 23.6 열거형 (Enum) 정의

```javascript
// Fill 타입
var Rt = { Color: 1, Image: 2, LinearGradient: 3, RadialGradient: 4, AngularGradient: 5, MeshGradient: 6 };

// 이미지 Fill 모드
var Ea = { Stretch: 1, Fill: 2, Fit: 3 };

// Effect 타입
var Nr = { DropShadow: 1, LayerBlur: 2, BackgroundBlur: 3 };

// 레이아웃 모드
var ii = { None: 0, Horizontal: 1, Vertical: 2 };

// 사이징 동작
var Zt = { Fixed: 0, FitContent: 2, FillContainer: 3 };

// 주축 배분
var hi = { Start: 0, Center: 1, SpaceBetween: 2, SpaceAround: 3, End: 4 };

// 교차축 정렬
var fr = { Start: 0, Center: 1, End: 2 };
```

### 23.7 노드별 renderSkia 차이점

| 노드 | renderSkia 구현 | Fill Path 생성 방식 |
|------|----------------|-------------------|
| **FrameNode** | fillPath → renderFills → clipPath(clip 시) → 자식 순회 → strokePath → 슬롯 표시 | rect + cornerRadius → `CG()` 함수 |
| **GroupNode** | 이펙트만 적용 → 자식 순회 (fill/stroke 없음) | 자식 mask path union |
| **ShapeNode(rect)** | getFillPath → renderFills → strokePath | rect + cornerRadius |
| **ShapeNode(ellipse)** | getFillPath → renderFills → strokePath | arc(startAngle, sweep, innerRadius) |
| **ShapeNode(line)** | getFillPath → renderFills → strokePath | moveTo(0,0).lineTo(w,h) |
| **ShapeNode(path)** | getFillPath → renderFills → strokePath | `Ue.Path.MakeFromSVGString(pathData)` |
| **ShapeNode(polygon)** | getFillPath → renderFills → strokePath | `Q1t()` 정다각형 + cornerRadius |
| **TextNode** | fills → ParagraphBuilder.build().layout() → 텍스트 렌더 | paragraph bounds |
| **IconFontNode** | getIconTransform → renderFills → 글리프 렌더 | font glyph path |
| **StickyNode** | getView().render() (내부 뷰 시스템) | 뷰 시스템 자체 처리 |

### 23.8 컴포넌트/인스턴스 시스템 상세

```
┌─────────────────────────────────────────────────────┐
│              Component (reusable: true)               │
│                                                       │
│  setReusable(rollback, true) → 컴포넌트 등록          │
│  ensurePrototypeReusability(rollback) → 구조 검증     │
└───────────────────────┬───────────────────────────────┘
                        │ attachToPrototype()
                        ▼
┌─────────────────────────────────────────────────────┐
│              Instance (type: "ref" in .pen)           │
│                                                       │
│  _prototype: {                                        │
│      node: <원본 컴포넌트 참조>,                       │
│      overriddenProperties: Set<string>,               │
│      childrenOverridden: boolean                      │
│  }                                                    │
│                                                       │
│  isUnique: (this.id !== prototype.node.id)            │
│  isInstanceBoundary: (prototype 존재 + 고유 id)       │
└───────────────────────────────────────────────────────┘
```

**핵심 메서드:**

| 메서드 | 설명 |
|--------|------|
| `attachToPrototype(rollback, node, overrides, childrenOverridden)` | 인스턴스↔프로토타입 연결 |
| `detachFromPrototype(rollback)` | 연결 해제 |
| `prototypePropertyChanged(prop)` | 프로토타입 변경 → 인스턴스 전파 (오버라이드 속성 제외) |
| `collectOverrides(target, traverse)` | 프로토타입 대비 차이점만 직렬화 |
| `setChildrenOverridden(rollback, boolean)` | 자식 구조 변경 표시 |
| `canAcceptChildren(node)` | 프로토타입 보호: childrenOverridden이 아니면 자식 추가 불가 |

**슬롯 시스템 (FrameNode 전용):**

| 메서드/속성 | 설명 |
|------------|------|
| `setSlot(rollback, definition)` | 슬롯 정의 할당 |
| `isSlotInstance` | 프로토타입 체인에서 슬롯 존재 확인 |
| `getSlotPath()` | 슬롯 영역 Skia 패스 반환 |
| `renderSlot(canvas, path, isOwner)` | 보라색 플레이스홀더 렌더링 |

### 23.9 오토 레이아웃 시스템

| 프로퍼티 | 열거형 | 값 | 설명 |
|---------|--------|-----|------|
| `layoutMode` | `ii` | None(0), Horizontal(1), Vertical(2) | 레이아웃 방향 |
| `layoutChildSpacing` | `number` | - | 자식 간격 (gap) |
| `layoutPadding` | `number/array` | - | 패딩 (1값/2값/4값) |
| `layoutAlignItems` | `fr` | Start(0), Center(1), End(2) | 교차축 정렬 |
| `layoutJustifyContent` | `hi` | Start(0), Center(1), SpaceBetween(2), SpaceAround(3), End(4) | 주축 배분 |
| `layoutIncludeStroke` | `boolean` | - | 스트로크 포함 여부 |
| `horizontalSizing` | `Zt` | Fixed(0), FitContent(2), FillContainer(3) | 수평 크기 모드 |
| `verticalSizing` | `Zt` | Fixed(0), FitContent(2), FillContainer(3) | 수직 크기 모드 |

**사이징 직렬화 형식:**
- `100` → Fixed 100px
- `"fit_content"` → 콘텐츠에 맞춤
- `"fit_content(100)"` → 콘텐츠에 맞춤 (폴백 100px)
- `"fill_container"` → 부모 채움
- `"fill_container(100)"` → 부모 채움 (폴백 100px)

**레이아웃 엔진 흐름:**
```
updateLayoutConfiguration() → 속성 → 레이아웃 설정 변환
invalidateLayout() → 서브트리 재레이아웃 마킹
Yoga WASM 계산 → Flexbox 레이아웃 수행
layoutCommitSize() → 계산된 크기 적용
layoutCommitPosition() → 계산된 위치 적용
```

### 23.10 Hit Testing (노드별)

| 노드 | pointerHitTest 방식 |
|------|---------------------|
| **Base(z_)** | `containsPointInBoundingBox()` — worldMatrix 역변환 → localBounds 포함 검사 |
| **FrameNode** | getVisualWorldBounds → fillPath.contains(local) + strokePath.contains(local) + 자식 재귀 |
| **ShapeNode** | fillPath containment + strokePath containment |
| **StickyNode** | `handleViewClick(event, x, y)` — 내부 뷰 시스템 클릭 처리 |
| **GroupNode** | getMaskPath() — 자식 마스크 패스 합산 |
| **TextNode** | 바운딩 박스 기반 (Base 동작) |
| **IconFontNode** | 바운딩 박스 기반 (Base 동작) |

### 23.11 직렬화 공통 프로퍼티 (`y4()` 함수)

```javascript
// 모든 노드의 직렬화 시 조건부 포함 프로퍼티
y4(node) → {
    x, y,                    // 레이아웃 내부가 아닌 경우만
    name,                    // 노드 이름
    context,                 // 컨텍스트 태그 배열
    theme,                   // 변수 테마 맵
    reusable,                // true인 경우만
    enabled,                 // true가 아닌 경우만
    opacity,                 // 1이 아닌 경우만
    rotation,                // 0이 아닌 경우만
    flipX, flipY,            // true인 경우만
    metadata                 // 메타데이터 객체
}
```

### 23.12 SVG Import → 노드 매핑

| SVG 요소 | Pencil 노드 타입 | 비고 |
|----------|-----------------|------|
| `<svg>` | `"frame"` | 루트 컨테이너 |
| `<rect>` | `"rectangle"` | |
| `<circle>`, `<ellipse>` | `"ellipse"` | |
| `<path>` | `"path"` | pathData 변환 |
| `<line>`, `<polyline>`, `<polygon>` | `"path"` | path로 통합 |
| `<g>`, `<a>` | `"group"` | |
| `<text>` | `"text"` | |
| `<use>` | `"group"` | ref 해석 후 인라인화 |
| `<image>` | `"rectangle"` + image fill | 이미지를 Fill로 처리 |

---

## 24. 이벤트 시스템 분석

> 분석일: 2026-01-30
> 분석 방법: `index.js` 번들 내 EventEmitter3, InputManager, StateManager, IPC 코드 역공학

### 24.1 이벤트 아키텍처 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                   DOM Events (window / container)             │
│  keydown, keyup, pointerdown, pointermove, pointerup,        │
│  wheel, copy, cut, paste, drop, dragover, contextmenu        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              InputManager (b_t)                               │
│  ├── pressedKeys: Set<string> — 현재 눌린 키 추적            │
│  ├── mouse: { canvas: {x,y}, screen: {x,y}, pointerDown }   │
│  ├── keydown/keyup → stateManager.handleKeydown(e)           │
│  ├── pointer* → stateManager.handlePointer*(e)               │
│  ├── wheel → camera.zoomTowardsPoint / translate             │
│  ├── copy/cut/paste → selectionManager.handle*(e)            │
│  └── drop → 파일/컴포넌트 드롭 처리                           │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              StateManager (y_t) — 상태 머신                   │
│  ├── handState (r_t) — Space/중간 버튼 인터셉트              │
│  └── state → 현재 상태에 위임:                                │
│      ├── IdleState (tl) — 선택, 더블클릭, 마키 시작           │
│      ├── DraggingState (eQ) — 노드 이동/재배치               │
│      ├── MarqueeSelectState (syt) — 범위 선택                │
│      ├── DrawShapeState (oyt) — 도형 생성                    │
│      ├── ResizeState (lyt) — 리사이즈 핸들                   │
│      ├── RotateState (fyt) — 회전 핸들                       │
│      ├── TextEditorState (tq) — Quill 텍스트 편집            │
│      ├── EditTextState (xV) — 텍스트 진입                    │
│      ├── DrawStickyNoteState (ayt) — 스티키 노트 생성        │
│      └── FillEditorState (fx) — 그라디언트 편집              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SceneGraph 조작                                  │
│  beginUpdate() → UpdateBlock (eyt) → commitBlock()           │
│  emit: "nodePropertyChange", "nodeAdded", "nodeRemoved"      │
│  → undoManager.pushUndo() + documentModified()               │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              EventEmitter3 알림 (65종 이벤트)                 │
│  "selectionChange" → React UI                                │
│  "toolChange" → 툴바 갱신                                    │
│  "document-modified" → 더티 상태                              │
│  Debounced → "selectionChangeDebounced"                      │
│              "selectedNodePropertyChangeDebounced"            │
│  "afterUpdate" — 프레임 배칭 완료                             │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              React State 갱신                                 │
│  useEffect 구독 → setState → UI 리렌더                       │
│  (속성 패널, 툴바, 레이어 목록, AI 채팅)                      │
└─────────────────────────────────────────────────────────────┘
```

### 24.2 EventEmitter3 — 핵심 이벤트 버스

15개 클래스가 `EventEmitter3 (wl)`을 상속한다. 주요 상속 클래스:
- `xyt` (UndoManager) — `changed` 이벤트
- `Io` (Scenegraph) — `nodePropertyChange`, `nodeAdded`, `nodeRemoved`
- `mX` (PixiJS Container) — 씬 그래프 이벤트
- `_wt`, `A2t`, `df`, `ebe`, `H6`, `k1e`, `Mg`, `NF`, `O_`, `q1e`, `v2t`, `x1e`

**주요 이벤트 목록 (65종 중 핵심):**

| 이벤트 | 구독 수 | 용도 |
|--------|---------|------|
| `selectionChange` | 3 | 노드 선택 변경 |
| `selectionChangeDebounced` | 2 | 선택 변경 디바운스 |
| `selectedNodePropertyChangeDebounced` | 2 | 선택 노드 속성 변경 디바운스 |
| `nodePropertyChange` | 3 | 씬 그래프 노드 속성 변경 |
| `toolChange` | 1 | 도구 전환 |
| `zoom` | 1 | 줌 변경 |
| `startTextEdit` / `finishTextEdit` | 각 1 | 텍스트 편집 모드 |
| `document-modified` | 1 | 문서 변경 (더티) |
| `showSelectUI` | 1 | 모델 선택 UI |
| `dirty-changed` | 1 | 저장 필요 상태 |
| `chat-*` (9종) | 각 1 | AI 채팅 이벤트 |
| `file-update` / `file-error` | 각 1 | 파일 I/O |
| `toggle-ui-visibility` | 1 | UI 토글 |
| `toggle-theme` / `color-theme-changed` | 각 1 | 테마 변경 |
| `fullscreen-change` | 1 | 전체화면 |
| `desktop-update-ready` / `available` | 각 1 | 데스크톱 업데이트 |
| `did-sign-out` | 1 | 로그아웃 |
| `telemetry` | 33 | 분석 추적 |

### 24.3 상태 머신 (StateManager = `y_t`)

#### 24.3.1 상태 머신 구조

```javascript
class y_t {
    state = new tl(manager);      // 기본: IdleState
    handState = new r_t();         // Hand/Pan 항상 활성

    handlePointerDown(e) {
        // 1) Hand/Pan 인터셉트
        if (activeTool === "hand" ||
            pressedKeys.has("Space") && e.button === 0 ||
            e.button === 1) {
            this.handState.handlePointerDown(e, manager);
            return;
        }
        // 2) 현재 상태에 위임
        this.state.onPointerDown(e);
    }

    transitionTo(newState) {
        this.state.onExit();
        this.state = newState;
        this.state.onEnter();
        manager.requestFrame();
    }
}
```

#### 24.3.2 상태 전이 다이어그램

| 현재 상태 | 트리거 | 다음 상태 |
|----------|--------|----------|
| **IdleState** | 노드 드래그 (5px 임계값) | DraggingState |
| **IdleState** | 빈 공간 드래그 | MarqueeSelectState |
| **IdleState** | 도형 도구 + 드래그 | DrawShapeState |
| **IdleState** | 텍스트 더블클릭 | EditTextState → TextEditorState |
| **IdleState** | 스티키 노트 도구 | DrawStickyNoteState |
| **IdleState** | 리사이즈 핸들 드래그 | ResizeState |
| **IdleState** | 회전 핸들 드래그 | RotateState |
| **IdleState** | Fill 그라디언트 클릭 | FillEditorState |
| **DraggingState** | pointerUp | IdleState |
| **MarqueeSelectState** | pointerUp | IdleState |
| **DrawShapeState** | pointerUp | IdleState |
| **ResizeState** | pointerUp | IdleState |
| **RotateState** | pointerUp | IdleState |
| **TextEditorState** | Escape / 외부 클릭 | IdleState |

#### 24.3.3 상태 인터페이스

모든 상태 클래스가 구현하는 메서드:

```javascript
onPointerDown(e)   // 포인터 누름
onPointerMove(e)   // 포인터 이동
onPointerUp(e)     // 포인터 뗌
onKeyDown(e)       // 키 누름
onKeyUp(e)         // 키 뗌
onToolChange(e)    // 도구 전환
onEnter()          // 상태 진입
onExit()           // 상태 종료
render(canvas, renderer) // 오버레이 렌더링
```

#### 24.3.4 IdleState (tl) — 허브 상태

```javascript
class tl {
    dragStartPoint = null;
    didMovePastThreshold = false;   // 5px 드래그 임계값
    nodeUnderCursor = null;
    selectionBoundingBoxUnderCursor = false;
    pointerDownNode = null;
    didMouseDown = false;
    doubleClicked = false;
    selectNodeOnMouseUp = false;

    // onPointerDown: 히트 대상 판별 → 선택/드래그/그리기 분기
    // onPointerMove: 커서 갱신, 드래그 임계값 감지, 마키 시작
    // onPointerUp: 선택 완료, 더블클릭으로 텍스트 편집 진입
}
```

#### 24.3.5 DraggingState (eQ) — 노드 드래그

```javascript
class eQ {
    nodes = [];                    // 드래그 중인 노드들
    nodeSet = new Set;
    mouseBoundsOffset = [0, 0];
    deferredDropNode;              // 드롭 시 재배치 대상
    deferredDropChildIndex;

    onPointerMove(e) {
        translateNodes(e);         // 노드 위치 갱신
        findDropFrame();           // 드롭 프레임 탐색 (재배치용)
    }

    onPointerUp() {
        commitTransaction();       // undo 가능한 트랜잭션 커밋
        transitionTo(new IdleState());
    }
}
```

### 24.4 PixiJS 이벤트 시스템

#### 24.4.1 EventBoundary 제어

```javascript
// eventMode 토글
disableInteractions() → mainContainer.eventMode = "none"
enableInteractions()  → mainContainer.eventMode = "passive" / "static"

// 조건부 eventMode (도구에 따라)
eventMode = activeTool === "move" ? "static" : "none"
```

#### 24.4.2 eventMode 5단계

| 모드 | 동작 | 사용처 |
|------|------|--------|
| `"static"` | 이벤트 수신 + 히트 테스트 | Move 도구 시 노드 |
| `"dynamic"` | static + 매 프레임 업데이트 | 동적 컨텐츠 |
| `"passive"` | 전파만, 자체 수신 안함 | 기본 컨테이너 |
| `"none"` | 완전 비활성 | Hand/패닝 중 |
| `interactiveChildren` | 자식 이벤트 토글 | 서브트리 제어 |

#### 24.4.3 PixiJS 지원 이벤트 (31종)

```
포인터:  pointerdown, pointerup, pointermove, pointerover, pointerout,
         pointerenter, pointerleave, pointertap, pointerupoutside,
         globalpointermove
마우스:  mousedown, mouseup, mousemove, mouseover, mouseout,
         mouseenter, mouseleave, mouseupoutside
터치:    touchstart, touchend, touchmove, touchcancel
클릭:    click, dblclick, tap, rightclick, rightdown, rightup, rightupoutside
기타:    wheel
```

### 24.5 키보드 이벤트 시스템

#### 24.5.1 입력 등록

```javascript
window.addEventListener("keydown", handleKeydown)
window.addEventListener("keyup", handleKeyup)

handleKeydown = (e) => {
    pressedKeys.add(e.code);
    stateManager.handleKeydown(e);
}

// 포커스 게이팅 — 텍스트 입력 중 단축키 무시
if (document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement) return;
```

#### 24.5.2 Space 키 핸드 모드

```javascript
// StateManager 키보드 핸들링
handleKeydown(e) {
    if (e.code === "Space" && !mouse.pointerDown)
        handState.activate(manager);  // → cursor: "grab", 인터랙션 비활성
}

handleKeyup(e) {
    if (e.code === "Space" && !handState.canvasDragging && activeTool !== "hand")
        handState.exit(manager);      // → 인터랙션 복원, cursor: "default"
}
```

### 24.6 줌/패닝 이벤트

#### 24.6.1 휠 이벤트

```javascript
// 두 리스너 등록
window.addEventListener("wheel", handleWindowWheel, {passive: false})
containerElement.addEventListener("wheel", handleContainerWheel, {passive: false})

// handleContainerWheel:
if (e.ctrlKey || e.metaKey) {
    // Ctrl+휠 / 트랙패드 핀치 → 줌
    camera.zoomTowardsPoint(cursor.x, cursor.y, zoom + delta * zoom);
} else {
    // 일반 휠 → 패닝
    camera.translate(deltaX / zoom, deltaY / zoom);
}
```

#### 24.6.2 HandState (r_t) — Space+드래그 패닝

```javascript
class r_t {
    canvasDragging = false;

    activate(manager) {
        manager.setCursor("grab");
        manager.pixiManager.disableInteractions();
    }

    handlePointerMove(e, manager) {
        camera.translate(-deltaX / zoom, -deltaY / zoom);
    }

    exit(manager) {
        manager.pixiManager.enableInteractions();
        manager.setCursor("default");
    }
}
```

#### 24.6.3 카메라 이벤트

```javascript
camera.on("zoom", ...)    // FillEditorState 구독
camera.on("change", ...)  // 가이드/커넥션 리드로우
```

### 24.7 선택 이벤트

```javascript
// 단일 선택: 클릭
selectNode(node, shiftKey=false)

// 추가 선택: Shift+클릭 → addNode(node)
// 범위 선택: 빈 공간 드래그 → MarqueeSelectState
// 전체 선택: Cmd+A (프레임 내부면 자식만)
// 선택 해제: Escape → clearSelection()
```

**디바운스 패턴 (프레임 기반 배칭):**

```javascript
queuedFrameEvents = new Set();

on("selectionChange", () => {
    queuedFrameEvents.add("selectionChangeDebounced");
    requestFrame();
});

on("nodePropertyChange", node => {
    if (selectedNodes.has(node)) {
        queuedFrameEvents.add("selectedNodePropertyChangeDebounced");
        requestFrame();
    }
});

// 매 프레임 flush:
for (const e of queuedFrameEvents) eventEmitter.emit(e);
queuedFrameEvents.clear();
eventEmitter.emit("afterUpdate");
```

### 24.8 드래그 앤 드롭

#### 24.8.1 캔버스 드롭 (HTML5)

```javascript
containerElement.addEventListener("drop", handleDrop)
containerElement.addEventListener("dragover", handleDragOver)
containerElement.addEventListener("dragleave", handleDragLeave)
containerElement.addEventListener("dragend", handleDragEnd)

// handleDragOver: preventDefault + 마우스 위치 갱신
// handleDrop: 파일(이미지, 디자인 파일) 드롭 처리
```

#### 24.8.2 드래그 임계값

```javascript
const wle = 5;  // 5px 임계값
// IdleState에서 pointerMove 시 임계값 초과 여부 확인
// 초과 시 DraggingState로 전이
```

### 24.9 클립보드 이벤트

```javascript
window.addEventListener("copy", handleCopy)
window.addEventListener("cut", handleCut)
window.addEventListener("paste", handlePaste)

// Copy: 선택 노드 직렬화 + text/plain에 노드 ID 설정
//   e.clipboardData.setData("text/plain", "Node ID: " + paths.join(", "))
// Cut: Copy + removeSelectedNodes()
// Paste: 클립보드 데이터 → 노드 생성 (내부 직렬화 / 외부 이미지)

// 게이팅: HTMLInputElement/HTMLTextAreaElement 포커스 시 브라우저 기본 동작
isClipboardEventAllowed() {
    // 텍스트 입력 중이면 false → 브라우저에 위임
}
```

### 24.10 Undo/Redo 트랜잭션

#### 24.10.1 UndoManager (`xyt extends EventEmitter3`)

```javascript
class xyt extends wl {
    undoStack = [];
    redoStack = [];

    undo() { /* undoStack pop → rollback 적용 */ }
    redo() { /* redoStack pop → 재적용 */ }
    pushUndo(rollback) { /* undoStack push, redoStack clear */ }
    // emit "changed" 후 처리
}
```

#### 24.10.2 UpdateBlock (`eyt`) 지원 작업

| 메서드 | 설명 |
|--------|------|
| `update(node, properties)` | 스냅샷 + 속성 변경 |
| `deleteNode(node, remove)` | 씬에서 제거 |
| `addNode(node, parent, index)` | 씬에 삽입 |
| `changeParent(node, parent, index)` | 부모 변경 (재배치) |
| `snapshotProperties(node, keys)` | undo용 속성 캡처 |
| `snapshotParent(node)` | undo용 부모 캡처 |
| `addVariable(id, data)` | 변수 추가 |
| `setVariable(variable, values)` | 변수 변경 |
| `deleteVariable(variable)` | 변수 삭제 |

#### 24.10.3 커밋 흐름

```javascript
const block = scenegraph.beginUpdate();
block.update(node, { width: 200 });
commitBlock(block, { undo: true });
// → undoManager.pushUndo(block.rollback)
// → scenegraph.documentModified()
// → skiaRenderer.invalidateContent()
// → eventEmitter.emit("document-modified")
```

### 24.11 IPC 이벤트 (Electron)

#### 24.11.1 전송 모드 3종

| 모드 | 감지 | 전송 방식 |
|------|------|----------|
| VS Code | `window.vscodeapi` | `postMessage` |
| Electron | `window.electronAPI` | `onMessageReceived / sendMessage` |
| Web (iframe) | `window.webappapi` | `postMessage to parent` |

메시지 타입: `"notification"` (단방향), `"request"` (응답 대기, 30초 타임아웃), `"response"`

#### 24.11.2 IPC Notify (렌더러→호스트, 18종)

| 메서드 | 용도 | 메서드 | 용도 |
|--------|------|--------|------|
| `initialized` | 앱 준비 | `load-file` | 파일 열기 |
| `file-changed` | 파일 변경 | `submit-prompt` | AI 프롬프트 |
| `send-prompt` | 에이전트 프롬프트 | `toggle-design-mode` | 디자인 모드 |
| `set-license` | 라이선스 | `sign-out` | 로그아웃 |
| `enter-claude-api-key` | API 키 설정 | `clear-claude-api-key` | API 키 삭제 |
| `clear-recent-files` | 최근 파일 | `desktop-update-install` | 업데이트 |
| `desktop-open-terminal` | 터미널 | `set-left-sidebar-visible` | 사이드바 |
| `add-to-chat` | 채팅 컨텍스트 | `add-extension-to-ide` | IDE 확장 |
| `open-document` | 문서 열기 | `claude-status-help-triggered` | 도움말 |

#### 24.11.3 IPC Request (렌더러→호스트, 11종)

| 메서드 | 용도 |
|--------|------|
| `save` | 파일 저장 |
| `read-file` | 파일 읽기 |
| `import-file` | 디자인 파일 임포트 |
| `import-uri` | URI 임포트 |
| `get-license` | 라이선스 조회 |
| `agent-stop` | AI 에이전트 중지 |
| `show-open-dialog` | 파일 열기 대화상자 |
| `save-generated-image` | AI 생성 이미지 저장 |
| `get-recent-files` | 최근 파일 목록 |
| `get-fullscreen` | 전체화면 상태 |
| `export-design-files` | 디자인 내보내기 |

#### 24.11.4 IPC Handle (호스트→렌더러, 18종)

| 메서드 | 용도 |
|--------|------|
| `get-editor-state` | 에디터 상태 반환 |
| `get-selection` | 선택 노드 반환 |
| `get-screenshot` | 뷰포트 캡처 |
| `export-viewport` | 뷰포트 내보내기 |
| `get-variables` | 디자인 변수 반환 |
| `set-variables` | 디자인 변수 설정 |
| `get-guidelines` | 가이드 반환 |
| `get-style-guide` | 스타일 가이드 |
| `get-style-guide-tags` | 스타일 태그 |
| `search-design-nodes` | 노드 검색 |
| `search-all-unique-properties` | 속성 검색 |
| `replace-all-matching-properties` | 속성 일괄 교체 |
| `batch-design` | 배치 디자인 작업 |
| `copy-nodes-by-id` | ID로 노드 복사 |
| `paste-clipboard-data` | 클립보드 붙여넣기 |
| `snapshot-layout` | 레이아웃 캡처 |
| `find-empty-space-on-canvas` | 빈 공간 탐색 |
| `internal-export-top-level-nodes` | 최상위 노드 내보내기 |

#### 24.11.5 IPC 수신 이벤트 (호스트→렌더러)

| 카테고리 | 이벤트 |
|----------|--------|
| AI 채팅 | `chat-tool-use-start`, `chat-tool-use`, `chat-tool-result`, `chat-session`, `chat-assistant-delta`, `chat-assistant-final`, `chat-error`, `chat-agent-message`, `chat-question-answered` |
| 데스크톱 | `desktop-update-ready`, `desktop-update-available` |
| 파일 | `file-update`, `file-error` |
| UI | `toggle-ui-visibility`, `toggle-theme`, `fullscreen-change`, `color-theme-changed` |
| 인증 | `did-sign-out` |
| AI | `claude-status`, `add-to-chat` |
| IDE | `ide-name-changed`, `active-integrations` |

### 24.12 React 이벤트 통합

#### 24.12.1 useEffect 구독 패턴

```javascript
useEffect(() => {
    const handler = () => { /* setState 호출 */ };
    sceneManager.eventEmitter.on("selectionChange", handler);
    sceneManager.scenegraph.on("nodePropertyChange", handler);
    sceneManager.scenegraph.on("nodeAdded", handler);
    sceneManager.scenegraph.on("nodeRemoved", handler);
    return () => {
        sceneManager.eventEmitter.off("selectionChange", handler);
        sceneManager.scenegraph.off("nodePropertyChange", handler);
        // ... cleanup
    };
}, [sceneManager]);
```

#### 24.12.2 React 구독 이벤트 목록

| 이벤트 | React 반응 |
|--------|-----------|
| `selectionChange` | Properties Panel, Layer List 갱신 |
| `selectionChangeDebounced` | 디바운스된 UI 갱신 |
| `selectedNodePropertyChangeDebounced` | 속성 패널 갱신 |
| `toolChange` | 툴바 활성 상태 갱신 |
| `startTextEdit` / `finishTextEdit` | 텍스트 편집 오버레이 표시/숨김 |
| `showSelectUI` | 모델/타입 선택 팝업 |
| `zoom` | 줌 레벨 표시 갱신 |

### 24.13 Resize/Observer 패턴

| Observer | 인스턴스 수 | 용도 |
|----------|-----------|------|
| `ResizeObserver` | 9 | 캔버스 리사이즈, UI 패널, 가상 리스트 |
| `IntersectionObserver` | 3 | 라우터 프리페치, 요소 가시성 |
| `window.resize` | 2 | 전역 리사이즈 |

### 24.14 이벤트 수량 요약

| 카테고리 | 수량 |
|----------|------|
| EventEmitter3 emit 이벤트 | 65종 |
| EventEmitter3 on 구독 | 67종 |
| DOM addEventListener | 61건 |
| removeEventListener 정리 | 54건 |
| PixiJS 포인터 이벤트 | 31종 |
| 키보드 단축키 | 30+개 |
| IPC notify | 18종 |
| IPC request | 11종 |
| IPC handle | 18종 |
| 상태 머신 상태 | 9개 클래스 |
| ResizeObserver | 9개 |
| IntersectionObserver | 3개 |

---

## 25. 파일 저장/로드 시스템

> 분석일: 2026-01-30
> 분석 방법: `index.js` (FileManager lXe), `app.js` (PencilApp), `desktop-resource-device.js`, `ipc-electron.js` 역공학

### 25.1 파일 I/O 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  Electron Main Process                                       │
│  ├── PencilApp (app.js) — 파일 열기/닫기 조율                │
│  ├── DesktopResourceDevice — fs 읽기/쓰기, 더티 상태        │
│  ├── electron-store (config.js) — 최근 파일 목록             │
│  └── dialog — 네이티브 열기/저장 다이얼로그                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC (16종 파일 관련 메시지)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Editor / Renderer Process                                   │
│  ├── FileManager (lXe) — 직렬화/역직렬화                     │
│  ├── SceneManager (CNe) — 씬 그래프 CRUD                    │
│  ├── VariableManager (LYe) — 변수/테마 복원                 │
│  ├── AssetManager (Mwt) — 이미지 에셋 로드/캐시             │
│  └── UndoManager (xyt) — 트랜잭션 기록                      │
└─────────────────────────────────────────────────────────────┘
```

### 25.2 .pen 파일 포맷 (v2.6)

#### 25.2.1 최상위 구조

```json
{
  "version": "2.6",
  "fonts": [{ "name": "CustomFont", "url": "fonts/custom.woff2" }],
  "themes": {
    "device": ["phone", "tablet", "desktop"],
    "mode": ["light", "dark"]
  },
  "variables": {
    "$--primary": {
      "type": "color",
      "value": [
        { "value": "#3B82F6", "theme": { "mode": "light" } },
        { "value": "#60A5FA", "theme": { "mode": "dark" } }
      ]
    },
    "$--radius-m": { "type": "number", "value": 8 }
  },
  "children": [ /* 노드 트리 + 커넥션 */ ]
}
```

#### 25.2.2 변수 직렬화 (`D2e`)

```javascript
// 단일 값: { type: "color", value: "#3B82F6" }
// 테마별 값: { type: "color", value: [
//   { value: "#3B82F6", theme: { mode: "light" } },
//   { value: "#60A5FA", theme: { mode: "dark" } }
// ]}
```

#### 25.2.3 커넥션 노드

씬 그래프 최상위 children에 노드와 함께 직렬화:

```json
{
  "id": "conn1",
  "type": "connection",
  "x": 0, "y": 0,
  "source": { "path": "nodeId1", "anchor": "center" },
  "target": { "path": "nodeId2", "anchor": "center" }
}
```

#### 25.2.4 버전 마이그레이션 체인 (`HYe`)

| 버전 | 주요 변경 |
|------|----------|
| 1.0 → 2.0 (`VYe`) | 노드 구조 평탄화 (`{id, properties:{...}}` → `{id, x, y, ...}`), 커넥션을 children으로 이동 |
| 2.0 → 2.1 (`qYe`) | `frameMaskDisabled` → `clip` (반전), `disabled` → `enabled` (반전) |
| 2.1 → 2.2 (`WYe`) | 컴포넌트 오버라이드: `overrides` 배열 → `descendants` 맵 |
| 2.2 → 2.3 (`XYe`) | (마이너 조정) |
| 2.3 → 2.4 (`KYe`) | (마이너 조정) |
| 2.4 → 2.5 (`ZYe`) | (마이너 조정) |
| 2.5 → 2.6 | 그라디언트 `center`/`size` 정규화 |

### 25.3 파일 열기 흐름

```
1. 사용자 트리거 (Cmd+O, 더블클릭, 최근 파일, CLI --file)
       │
2. PencilApp.openFile({ filePath, prompt, agentType })
       │
3. PencilApp.loadFile(filePath, true)
   ├── fs.readFileSync(filePath, "utf8")
   ├── DesktopResourceDevice 생성 (in-memory 콘텐츠 보관)
   ├── IPC 핸들러 설정
   ├── 최근 파일 목록 추가
   └── ipc.notify("file-update", { content, filePath, zoomToFit })
       │
4. Editor: ipc.on("file-update") 수신
       │
5. FileManager.open(content, filePath, isNew)
   ├── UndoManager, VariableManager, AssetManager 초기화
   ├── 트랜잭션 시작: scenegraph.beginUpdate()
   ├── Y$e() — 관대한 JSON 파서 (trailing comma 허용)
   ├── 버전 검사 → HYe() 마이그레이션 체인
   ├── 기존 씬 그래프 파괴
   ├── 테마 복원: variableManager.unsafeSetThemes()
   ├── 변수 복원 (타입별 역직렬화)
   ├── 자식 노드 재귀 역직렬화
   ├── 컴포넌트 인스턴스 프로토타입 링킹 (ref → reusable)
   └── 트랜잭션 커밋
```

### 25.4 파일 저장 흐름

```
1. 사용자 트리거 (Cmd+S) 또는 창 닫기 더티 체크
       │
2. SceneManager.saveDocument()
   ├── placeholder 플래그 제거 (모든 노드)
   ├── FileManager.export()
   │   ├── serialize() — 씬 그래프 → JavaScript 객체
   │   │   ├── 뷰포트 자식 노드 순회 → serializeNode() 재귀
   │   │   ├── 커넥션 직렬화
   │   │   ├── 테마 직렬화 (L2e)
   │   │   └── 변수 직렬화 (D2e)
   │   └── JSON.stringify(data, null, 2) — 2-space 들여쓰기
   └── ipc.request("save", { content }, timeout=-1)
       │
3. Main Process: ipc.handle("save")
   ├── device.replaceFileContents(content)
   └── device.saveResource({ userAction: true })
       │
4. DesktopResourceDevice.saveResource()
   ├── 임시 파일이면 → dialog.showSaveDialog(defaultPath: "untitled.pen")
   ├── 일반 파일이면 → fs.writeFileSync(filePath, content, "utf8")
   ├── emit("dirty-changed", false)
   └── isDirty = false
```

**자동 저장:** 디스크 자동 저장은 없음. `"file-changed"` IPC(300ms 디바운스)는 in-memory 콘텐츠만 갱신하고 `isDirty = true`로 표시. 실제 디스크 쓰기는 명시적 저장(Cmd+S) 또는 창 닫기 시에만 수행.

### 25.5 더티 상태 추적

```javascript
// DesktopResourceDevice
replaceFileContents(content) {
    this.fileContent = content;
    if (!this.isDirty) {
        this.emit("dirty-changed", true);  // → 타이틀바 "●" 표시
        this.isDirty = true;
    }
}

saveResource() {
    // ... 저장 성공 후:
    this.emit("dirty-changed", false);
    this.isDirty = false;
}

// 창 닫기 시 더티 체크
mainWindow.on("close", async (event) => {
    if (device.getIsDirty()) {
        event.preventDefault();
        // Save/Don't Save/Cancel 다이얼로그 표시
        const cancelled = await device.saveResource({ userAction: false });
        if (!cancelled) mainWindow.close();
    }
});
```

### 25.6 에셋 관리 (AssetManager = `Mwt`)

#### 25.6.1 이미지 저장 방식

이미지는 .pen 파일 **외부**에 별도 파일로 저장된다 (base64 인라인 아님):

```
project/
├── design.pen          ← JSON 텍스트
└── images/
    ├── photo.png       ← 외부 이미지 파일
    ├── logo.svg
    └── generated-1706...png  ← AI 생성 이미지
```

.pen 내부 참조: `{ "type": "Image", "url": "images/photo.png", "mode": "Fill" }`

#### 25.6.2 에셋 상태 머신

```
init → loading → loaded (decodedImage: Ue.MakeImageFromEncoded())
                → error (로드 실패)
loaded → destroyed (정리)
```

#### 25.6.3 이미지 임포트 흐름

```javascript
// importFileByName: 충돌 회피 네이밍
// "photo.png" → 이미 존재하면 "photo-1.png", "photo-2.png" ...
// 동일 이름 + 동일 내용이면 기존 파일 재사용
// 반환: .pen 파일 기준 상대 경로
```

#### 25.6.4 AI 생성 이미지

```javascript
// save-generated-image IPC 핸들러
const buffer = Buffer.from(image, "base64");
const filename = `generated-${Date.now()}.png`;
// images/ 디렉토리에 저장, 상대 경로 반환
```

### 25.7 임포트/익스포트

#### 25.7.1 지원 임포트 형식

| 형식 | 방식 | 변환 |
|------|------|------|
| `.pen` | 네이티브 열기 | 직접 로드 |
| PNG/JPG/JPEG | 파일 대화상자 또는 드래그 | rectangle + image fill |
| SVG | 파일 대화상자 또는 붙여넣기 | `Xke()` → 네이티브 노드 매핑 |
| Figma | 클립보드 붙여넣기 (text/html) | `n_t()`, `i_t()` 파서 |

#### 25.7.2 지원 익스포트 형식

| 형식 | 스케일 | 용도 |
|------|--------|------|
| PNG | 1x/2x/3x | 무손실, 투명 배경 |
| JPEG | 1x/2x/3x (품질: High/Medium/Low) | 손실 압축 |
| WEBP | 1x/2x/3x (품질: High/Medium/Low) | 최신 압축 |

SVG, PDF 익스포트는 미지원.

#### 25.7.3 익스포트 흐름

```javascript
// 선택 노드별:
const imageData = await skiaRenderer.exportToImage([node], {
    type: sa.PNG,        // 0=PNG, 1=JPEG, 2=WEBP
    dpi: scale,          // 1, 2, 3
    maxResolution: 4096,
    quality: value
});
// 단일 파일 → 직접 다운로드
// 다수 파일 → ZIP으로 묶어 "export.zip" 다운로드
```

### 25.8 클립보드 데이터 포맷

#### 25.8.1 커스텀 MIME 타입: `application/x-ha`

```javascript
// Copy 시 설정:
clipboardData.setData("application/x-ha", JSON.stringify({
    source: clipboardSourceId,  // 문서 UUID
    localData: paths,           // 같은 문서 붙여넣기용 경로 배열
    remoteData: {               // 다른 문서 붙여넣기용 전체 데이터
        themes: serializedThemes,
        variables: serializedVars,
        nodes: serializedNodes   // resolveInstances: true로 직렬화
    }
}));
clipboardData.setData("text/plain", nodeIdList);  // 디버깅/MCP용
```

#### 25.8.2 붙여넣기 소스 5종

| 소스 | MIME 타입 | 처리 |
|------|----------|------|
| Pencil (같은 문서) | `application/x-ha` | localData → 경로로 노드 복제 |
| Pencil (다른 문서) | `application/x-ha` | remoteData → 테마/변수/노드 역직렬화 |
| Figma | `text/html` | HTML 파싱 → 노드 변환 |
| SVG | `text/plain` | DOMParser → SVG 노드 매핑 |
| 텍스트 | `text/plain` | 텍스트 노드 생성 |

### 25.9 최근 파일 관리

```javascript
const MAX_RECENT_FILES = 14;

addRecentFile(filePath) {
    // 절대 경로만 추적 (템플릿 제외)
    const updated = [filePath, ...filtered].slice(0, MAX_RECENT_FILES);
    desktopConfig.set("recentFiles", updated);
}

getRecentFiles() {
    return recentFiles.filter(f => fs.existsSync(f));  // 존재하는 파일만
}

// 시작 시: 가장 최근 파일 열기, 없으면 "pencil-welcome-desktop.pen"
```

저장소: `electron-store` → `config.json` (사용자 데이터 디렉토리)

### 25.10 내장 문서 템플릿

| 템플릿 | 용도 |
|--------|------|
| `pencil-new.pen` | 빈 새 문서 |
| `pencil-welcome-desktop.pen` | 시작 화면 |
| `pencil-shadcn.pen` | Shadcn 디자인 킷 |
| `pencil-halo.pen` | HALO 디자인 킷 |
| `pencil-lunaris.pen` | Lunaris 디자인 킷 |
| `pencil-nitro.pen` | Nitro 디자인 킷 |

비절대 경로이고 `"pencil-"`로 시작하면 `isTemporary() = true` → 임시 작업 디렉토리(`~/.pencil/resources/{uuid}/`) 사용.

### 25.11 오류 처리

| 상황 | 처리 |
|------|------|
| 파일 읽기 실패 | `file-error` IPC → 토스트 알림 (에러 메시지 포함) |
| 버전 불일치 | `HYe()` 마이그레이션 체인 실행 → 지원 안되면 에러 로그 |
| 저장 실패 | Sentry 캡처 + 토스트 에러 (`pm.error()`) |
| JSON 파싱 오류 | `Y$e()` 관대한 파서가 trailing comma 등 허용 |
| 에디터 미초기화 | 지연 전달: `waitForDocumentReady()` 후 재전송 |

### 25.12 파일 관련 IPC 메시지 전체 목록

| IPC 메시지 | 방향 | 용도 |
|-----------|------|------|
| `file-update` | Main→Renderer | 문서 콘텐츠 로드 |
| `file-error` | Main→Renderer | 파일 읽기 실패 알림 |
| `file-changed` | Renderer→Main | 콘텐츠 변경 동기화 (300ms 디바운스, 디스크 미기록) |
| `save` | Renderer→Main | 명시적 디스크 저장 |
| `load-file` | Renderer→Main | 다른 파일 로드 요청 |
| `read-file` | Renderer→Main | 에셋 파일 읽기 (이미지) |
| `import-file` | Renderer→Main | 파일명+내용으로 임포트 |
| `import-uri` | Renderer→Main | URI로 임포트 |
| `import-images` | Main→Renderer | 이미지 임포트 대화상자 결과 |
| `dirty-changed` | Main→Renderer | 더티 상태 변경 알림 |
| `get-recent-files` | Renderer→Main | 최근 파일 목록 조회 |
| `clear-recent-files` | Renderer→Main | 최근 파일 목록 초기화 |
| `initialized` | Renderer→Main | 에디터 준비 완료 |
| `save-generated-image` | Renderer→Main | AI 생성 이미지 디스크 저장 |
| `export-viewport` | External→Renderer | 뷰포트 PNG 익스포트 (MCP) |
| `show-open-dialog` | Renderer→Main | 네이티브 파일 열기 대화상자 |

---

## 26. 종합 분석 업데이트 (2026-01-30)

### 26.1 Pencil 앱 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐  │
│  │ PencilApp│ │  Claude  │ │   MCP    │ │ Config  │ │ Updater  │  │
│  │ (app.js) │ │(claude.js│ │(adapter) │ │(config) │ │(updater) │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ └──────────┘  │
│       │            │            │             │                     │
│       └────────────┴────────────┴─────────────┘                    │
│                         │ IPC + WebSocket                          │
├─────────────────────────┼──────────────────────────────────────────┤
│                         ↓                                          │
│                  Renderer Process                                  │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  React App (HashRouter)                                 │       │
│  │  ├── EditorPage (hY)                                    │       │
│  │  │   └── MainEditor (gKt)                               │       │
│  │  │       ├── TitleBar (YIt)        ← Electron only      │       │
│  │  │       ├── Left Panel (mKt)      ← Layers, Kits       │       │
│  │  │       ├── Canvas Area           ← PixiJS + Skia      │       │
│  │  │       ├── Properties Panel (eKt)← 우측 인스펙터       │       │
│  │  │       ├── Variables Panel (cKt) ← Portal, 드래그      │       │
│  │  │       ├── AI Chat Panel (ARt)   ← Claude 통합         │       │
│  │  │       └── Activation (pKt)      ← 라이선스            │       │
│  │  └── Generator (yKt)                                    │       │
│  └─────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  SceneManager (CNe) — React Context                     │       │
│  │  ├── SceneGraph    (노드 트리 CRUD)                      │       │
│  │  ├── FileManager   (.pen JSON I/O)                      │       │
│  │  ├── VariableManager ($-- 변수 resolve + 테마)           │       │
│  │  └── UndoManager   (트랜잭션 기반 undo/redo)             │       │
│  └─────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  Rendering Pipeline                                     │       │
│  │  ├── SkiaRenderer (CanvasKit WASM — pencil.wasm 7.8MB)  │       │
│  │  ├── PixiJS v8 Manager (WebGL)                          │       │
│  │  └── Web Workers (webworkerAll.js 183KB)                │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### 26.2 핵심 발견 사항

| 영역 | 발견 | 의미 |
|------|------|------|
| **렌더링 아키텍처** | **Skia WASM = 메인 렌더러**, PixiJS = 씬 그래프/이벤트만 | Figma와 동일한 접근 (C++ Skia → WebGL) |
| **이중 Surface** | content + main 두 Surface 캐싱 패턴 | 줌/패닝 시 콘텐츠 리드로우 없이 블리팅만 |
| **renderSkia()** | 모든 노드가 CanvasKit Canvas API 직접 호출 | PixiJS render() 미사용, Skia 전용 렌더 패스 |
| **이펙트 시스템** | saveLayer + ImageFilter 기반 (Opacity/Blur/Shadow) | GPU 레이어 합성으로 고품질 이펙트 |
| **Fill 렌더링** | 6종 (Color/Linear/Radial/Angular/Mesh/Image) Shader 기반 | 스트로크에도 그라디언트/이미지 fill 가능 |
| **파일 포맷** | `.pen` = JSON 텍스트, 노드 트리 + 인라인 스타일 + 변수 + 테마 | 인간 가독성 높음, 바이너리 아닌 텍스트 기반 |
| **변수 시스템** | `$--` 접두사 참조, 3타입(color/string/number), 테마별 분기 | shadcn/ui CSS Custom Properties와 호환 설계 |
| **AI 통합** | Claude Opus/Sonnet/Haiku 내장, 환경별 분기 | 디자인→코드 변환이 핵심 워크플로우 |
| **디자인 킷** | 4개 킷 JSON 임베딩 (HALO/Lunaris/Nitro/Shadcn) | 바로 사용 가능한 컴포넌트 라이브러리 |
| **컴포넌트 시스템** | `reusable: true` + `ref` + `descendants` 오버라이드 | Figma 컴포넌트/인스턴스와 동일한 패턴 |
| **트랜잭션 패턴** | `beginUpdate → block.update → commitBlock` | 원자적 변경 + undo 포인트 = 안정적 편집 |
| **플랫폼 분기** | Electron/Cursor/Web 3가지 환경 대응 | IDE 통합(Cursor) + 데스크톱 + 웹 멀티타겟 |
| **WASM 메모리** | 사전 할당 버퍼 (Float32x4/9/16) + Malloc/Free | 핫 경로 malloc 회피, 성능 최적화 |
| **GPU 폴백** | WebGL → 소프트웨어(putImageData) 자동 폴백 | GPU 미지원 환경 대응 |
| **씬 그래프** | 6개 클래스 / 12개 타입 문자열, 단일 베이스 클래스 상속 | Figma와 유사한 간결한 노드 계층 |
| **ShapeNode 다형성** | 단일 클래스가 rect/ellipse/line/path/polygon 5종 처리 | type 판별자 기반 분기 |
| **오토 레이아웃** | Yoga WASM + Fixed/FitContent/FillContainer 3모드 | Figma Auto Layout과 동일 패턴 |
| **슬롯 시스템** | FrameNode 전용, 컴포넌트 내 교체 가능 영역 | 디자인 시스템 유연성 확보 |
| **이벤트 아키텍처** | EventEmitter3 (65종 이벤트) + PixiJS EventBoundary + 상태 머신 | 3계층 이벤트 시스템 |
| **상태 머신** | 9개 상태 클래스, IdleState 허브, 전이 기반 도구 인터랙션 | 복잡한 에디터 인터랙션을 깔끔하게 분리 |
| **IPC 체계** | notify(18) + request(11) + handle(18) = 47종 IPC 메서드 | Electron/VSCode/Web 3환경 추상화 |
| **프레임 배칭** | queuedFrameEvents Set → RAF flush → 디바운스 | 고빈도 이벤트의 프레임 단위 합산 |
| **파일 포맷** | .pen v2.6, JSON 텍스트, 7단계 마이그레이션 체인 | 1.0→2.6 하위 호환, 관대한 JSON 파서 |
| **에셋 관리** | 이미지 외부 파일 저장 (base64 아님), AssetManager 상태 머신 | Skia MakeImageFromEncoded 디코딩 |
| **클립보드** | `application/x-ha` 커스텀 MIME, 5종 소스 (Pencil/Figma/SVG/텍스트/이미지) | 크로스 문서/앱 복사-붙여넣기 |
| **더티 추적** | DesktopResourceDevice + 창 닫기 Save/Don't Save/Cancel | 자동 저장 없음, 명시적 Cmd+S만 |

### 26.3 기존 분석 대비 추가된 내용

| 기존 섹션 | 추가된 심층 분석 |
|----------|----------------|
| §8 파일 포맷 (간략) | §15 `.pen` JSON 상세 구조, 노드 타입, 다중 Fill, Effect, cornerRadius |
| §4.3 Claude AI (간략) | §20 환경별 모델 분기, IPC 프롬프트, MCP 연동 상세 |
| §3 아키텍처 (개요) | §17 에디터 UI 전체 컴포넌트 트리, Radix UI, Portal 패턴 |
| §11.1 WASM 아키텍처 | **정정**: PixiJS 메인 → Skia 메인으로 수정 (renderSkia 역공학 증거) |
| §21 렌더링 (개요) | §21 전면 교체: 렌더 루프, 이중 Surface, GPU 체인, 노드별 렌더링, 이펙트, Fill/Stroke, 텍스트, 컬링, Hit Test, 블렌드 모드, Export, 피드백 이펙트, WASM 메모리, 안티앨리어싱 |
| 없음 | §16 스타일 관리 (변수, 테마, 트랜잭션, 우선순위) |
| 없음 | §18 도구 시스템 + 키보드 단축키 전체 매핑 |
| 없음 | §19 에디터 설정 시스템 (localStorage) |
| 없음 | §22 내장 디자인 킷 4개 (HALO/Lunaris/Nitro/Shadcn) |
| §15.4 노드 타입 (간략) | §23 씬 그래프 노드 타입별 구조: 클래스 계층, 프로퍼티, 렌더링, 히트테스트, 컴포넌트/인스턴스, 오토 레이아웃, 열거형, SVG 매핑 |
| 없음 | §24 이벤트 시스템: EventEmitter3, 상태 머신(9상태), PixiJS EventBoundary, 키보드, 줌/패닝, 선택, 드래그, 클립보드, Undo/Redo, IPC(47종), React 통합 |
| §8, §15 파일 포맷 (간략) | §25 파일 저장/로드: FileManager(lXe), 직렬화/역직렬화, .pen v2.6 포맷, 7단계 마이그레이션, 에셋 관리, 임포트/익스포트, 클립보드 `application/x-ha`, 더티 상태, IPC 16종, 최근 파일, 내장 템플릿 |
