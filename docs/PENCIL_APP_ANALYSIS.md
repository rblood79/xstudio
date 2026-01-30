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

### 11.1 그래픽 아키텍처 (수정된 분석)

기존 분석에서 "WebAssembly 그래픽 렌더링"으로 기술했으나, 심층 분석 결과 Pencil의 실제 렌더링 구조는 **하이브리드 방식**이다.

```
┌─────────────────────────────────────────────────────────┐
│  Renderer Process (editor/index.html)                  │
│  ├─ React Components (Sidebar, Inspector)             │
│  ├─ @pixi/react v8 (WebGL 기반 메인 렌더러)            │
│  │   ├─ PixiJS Graphics Engine (GPU 가속 2D)          │
│  │   ├─ @pixi/layout (Yoga WASM 레이아웃)             │
│  │   └─ ElementSprite 렌더링                          │
│  ├─ pencil.wasm (보조 연산 모듈)                       │
│  │   ├─ 벡터 도형 래스터라이즈                          │
│  │   ├─ 텍스트 메트릭 계산                             │
│  │   ├─ 기하 연산 (히트 테스트, 바운딩박스)              │
│  │   └─ 컴포지팅/블렌딩 연산                           │
│  └─ Web Workers (webworkerAll.js)                     │
│      └─ 오프메인스레드 연산                             │
└─────────────────────────────────────────────────────────┘
```

**핵심 포인트:**
- **주 렌더러**: PixiJS v8 (WebGL) — GPU 가속 2D 렌더링 담당
- **보조 모듈**: pencil.wasm — 연산 집약적 작업 가속 (렌더링 자체가 아닌 계산 보조)
- **레이아웃**: @pixi/layout (Yoga WASM) — Flexbox 레이아웃 계산

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

| 타입 | 설명 |
|------|------|
| `frame` | 레이아웃 컨테이너 (Figma Frame과 동일) |
| `rectangle` | 사각형 도형 |
| `ellipse` | 타원 도형 |
| `text` | 텍스트 노드 |
| `ref` | 컴포넌트 인스턴스 (참조) |
| `sticky_note` | 스티키 노트 |
| `icon_font` | 아이콘 (Lucide Icons) |
| `image` | 이미지 노드 |
| `group` | 그룹 컨테이너 |

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

**Fill 타입:**
| 타입 | 설명 |
|------|------|
| `Color` | 단색 (hex, 변수 참조) |
| `Image` | 이미지 (url, mode: Fill/Fit/Tile) |
| `LinearGradient` | 선형 그라디언트 (stops, angle) |
| `RadialGradient` | 방사형 그라디언트 (stops, center) |
| `AngularGradient` | 각도 그라디언트 |

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

## 21. 렌더링 파이프라인 상세

### 21.1 전체 파이프라인

```
React UI Layer (DOM)
    │
    ↓ 사용자 이벤트 / 상태 변경
    │
SceneManager (CNe) — React Context
    │ SceneGraph 노드 트리 관리
    │ FileManager — .pen 파일 I/O
    │ VariableManager — $-- 변수 resolve
    │ UndoManager — 트랜잭션 기반 undo/redo
    │
    ↓ 노드 데이터 (resolved properties)
    │
SkiaRenderer — CanvasKit WASM (pencil.wasm, 7.8MB)
    │ 벡터 도형, 텍스트, 이미지, 효과 렌더링
    │ 안티앨리어싱, 패스 연산, 블렌드 모드
    │
    ↓ 래스터라이즈된 텍스처
    │
PixiJS v8 Manager — WebGL 컨텍스트
    │ 배치 렌더링, 텍스처 관리
    │ 뷰포트 변환 (줌/패닝)
    │
    ↓ GPU 출력
    │
Canvas Element (화면)
```

### 21.2 렌더링 계층 분리

| 계층 | 기술 | 역할 |
|------|------|------|
| **DOM Layer** | React + Radix UI + Tailwind | 패널, 도구바, 다이얼로그 등 UI |
| **Scene Layer** | SceneManager (Context) | 노드 트리, 변수, 트랜잭션 관리 |
| **Vector Layer** | CanvasKit/Skia (WASM) | 벡터 래스터라이즈, 텍스트, 효과 |
| **Render Layer** | PixiJS v8 (WebGL) | GPU 배치 렌더링, 텍스처 관리 |
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

## 23. 종합 분석 업데이트 (2026-01-30)

### 23.1 Pencil 앱 전체 아키텍처 다이어그램

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

### 23.2 핵심 발견 사항

| 영역 | 발견 | 의미 |
|------|------|------|
| **파일 포맷** | `.pen` = JSON 텍스트, 노드 트리 + 인라인 스타일 + 변수 + 테마 | 인간 가독성 높음, 바이너리 아닌 텍스트 기반 |
| **변수 시스템** | `$--` 접두사 참조, 3타입(color/string/number), 테마별 분기 | shadcn/ui CSS Custom Properties와 호환 설계 |
| **렌더링** | Skia WASM + PixiJS WebGL 이중 파이프라인 | 벡터 정밀 렌더링 + GPU 가속 동시 달성 |
| **AI 통합** | Claude Opus/Sonnet/Haiku 내장, 환경별 분기 | 디자인→코드 변환이 핵심 워크플로우 |
| **디자인 킷** | 4개 킷 JSON 임베딩 (HALO/Lunaris/Nitro/Shadcn) | 바로 사용 가능한 컴포넌트 라이브러리 |
| **컴포넌트 시스템** | `reusable: true` + `ref` + `descendants` 오버라이드 | Figma 컴포넌트/인스턴스와 동일한 패턴 |
| **트랜잭션 패턴** | `beginUpdate → block.update → commitBlock` | 원자적 변경 + undo 포인트 = 안정적 편집 |
| **플랫폼 분기** | Electron/Cursor/Web 3가지 환경 대응 | IDE 통합(Cursor) + 데스크톱 + 웹 멀티타겟 |

### 23.3 기존 분석 대비 추가된 내용

| 기존 섹션 | 추가된 심층 분석 |
|----------|----------------|
| §8 파일 포맷 (간략) | §15 `.pen` JSON 상세 구조, 노드 타입, 다중 Fill, Effect, cornerRadius |
| §4.3 Claude AI (간략) | §20 환경별 모델 분기, IPC 프롬프트, MCP 연동 상세 |
| §3 아키텍처 (개요) | §17 에디터 UI 전체 컴포넌트 트리, Radix UI, Portal 패턴 |
| §11 WASM 분석 | §21 SceneManager→Skia→PixiJS 전체 렌더링 파이프라인 |
| 없음 | §16 스타일 관리 (변수, 테마, 트랜잭션, 우선순위) |
| 없음 | §18 도구 시스템 + 키보드 단축키 전체 매핑 |
| 없음 | §19 에디터 설정 시스템 (localStorage) |
| 없음 | §22 내장 디자인 킷 4개 (HALO/Lunaris/Nitro/Shadcn) |
