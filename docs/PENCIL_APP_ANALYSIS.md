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
