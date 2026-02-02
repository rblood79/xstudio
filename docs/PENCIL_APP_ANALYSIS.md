# Pencil Desktop App 구조 분석

> 분석 대상: `/Users/admin/work/Contents` (macOS App Bundle)
> 앱 버전: **1.1.12**
> Bundle ID: `dev.pencil.desktop`
> 개발사: High Agency, Inc.
> 카테고리: Graphics & Design (`public.app-category.graphics-design`)

---

## 1. 개요

Pencil은 `.pen` 파일 형식을 사용하는 **디자인 에디터 데스크톱 앱**이다. Electron 기반으로 구축되었으며, AI 에이전트(Claude) 통합, MCP(Model Context Protocol) 서버, WebSocket 기반 IPC, Figma 임포트 등의 기능을 갖추고 있다.

- **플랫폼**: macOS (arm64), Windows, Linux 지원 (MCP 서버 바이너리 기준)
- **최소 OS**: macOS 12.0
- **런타임**: Electron + Bun (JavaScript runtime)
- **전체 크기**: ~430MB

---

## 2. 번들 구조 (Top-Level)

```
Contents/
├── _CodeSignature/         # 코드 서명 (CodeResources)
├── CodeResources            # 앱 리소스 코드 서명 해시
├── Frameworks/              # ~256MB - Electron 프레임워크 + 네이티브 의존성
├── Info.plist               # 앱 메타데이터
├── MacOS/
│   └── Pencil               # 메인 실행 파일 (Mach-O arm64, 52KB)
├── PkgInfo                  # APPL???? (macOS 앱 패키지 타입)
└── Resources/               # 앱 리소스 (에디터, 코드, 에셋 등)
```

---

## 3. Info.plist 핵심 정보

| 키 | 값 | 설명 |
|---|---|---|
| `CFBundleDisplayName` | Pencil | 앱 표시 이름 |
| `CFBundleIdentifier` | dev.pencil.desktop | Bundle ID |
| `CFBundleVersion` | 1.1.12 | 빌드 버전 |
| `CFBundleDocumentTypes` | `.pen` | 연결 문서 타입 |
| `CFBundleURLSchemes` | `pencil://` | 커스텀 URL 스킴 |
| `NSPrincipalClass` | AtomApplication | Electron 기반 (Atom 계열) |
| `NSHumanReadableCopyright` | Copyright (c) 2026 High Agency, Inc. | 저작권 |
| `LSMinimumSystemVersion` | 12.0 | 최소 macOS 버전 |
| `NSAppTransportSecurity` | localhost + 127.0.0.1 허용 | 로컬 개발 서버용 |
| `ElectronAsarIntegrity` | SHA256 해시 | app.asar 무결성 검증 |
| `DTSDKName` | macosx15.5 | 빌드에 사용된 SDK |
| `DTXcode` | 1640 (16F6) | Xcode 버전 |

커스텀 프로토콜 `pencil://`을 사용하여 프로덕션 환경에서 에디터 파일을 서빙한다.

---

## 4. Frameworks/ 디렉토리 (~256MB)

### 4.1 Electron Framework (~174MB)
```
Electron Framework.framework/Versions/A/
├── Electron Framework       # 메인 프레임워크 바이너리 (174MB)
├── Helpers/
│   └── chrome_crashpad_handler  # Crashpad 크래시 리포터
├── Libraries/
│   ├── libEGL.dylib         # OpenGL ES -> GPU 인터페이스
│   ├── libffmpeg.dylib      # 미디어 코덱 (영상/오디오)
│   ├── libGLESv2.dylib      # OpenGL ES 2.0
│   ├── libvk_swiftshader.dylib  # Vulkan 소프트웨어 렌더러
│   └── vk_swiftshader_icd.json # Vulkan ICD 설정
└── Resources/               # Chromium 리소스 (ICU, locale 등)
```

### 4.2 Helper Apps (멀티프로세스 아키텍처)
| Helper | 역할 |
|---|---|
| `Pencil Helper.app` | 메인 렌더러 프로세스 |
| `Pencil Helper (GPU).app` | GPU 가속 프로세스 |
| `Pencil Helper (Renderer).app` | 추가 렌더러 프로세스 |
| `Pencil Helper (Plugin).app` | 플러그인 실행 프로세스 |

### 4.3 네이티브 프레임워크 (자동 업데이트 관련)
| 프레임워크 | 역할 |
|---|---|
| **Squirrel.framework** | macOS 자동 업데이트 프레임워크 (`ShipIt` 바이너리 포함) |
| **Mantle.framework** | Objective-C 모델 레이어 (Squirrel 의존성) |
| **ReactiveObjC.framework** | Reactive 프로그래밍 (Squirrel 의존성) |

---

## 5. Resources/ 디렉토리

### 5.1 핵심 파일
```
Resources/
├── app.asar                 # 57MB - 메인 앱 소스코드 (7,483 파일)
├── app.asar.unpacked/       # 117MB - 네이티브 바이너리 (asar 외부)
├── app-update.yml           # GitHub 자동 업데이트 설정
├── icon.icns                # 앱 아이콘 (70KB)
└── *.lproj/                 # 109개 로케일 디렉토리 (빈 디렉토리)
```

### 5.2 자동 업데이트 설정 (`app-update.yml`)
```yaml
owner: highagency
repo: pencil-desktop-releases
provider: github
updaterCacheDirName: pencil-updater
```
- GitHub Releases를 통한 자동 업데이트 (electron-updater 사용)
- 30분마다 업데이트 확인

---

## 6. app.asar 내부 구조 (메인 앱 코드)

### 6.1 `/out/` - 빌드된 앱 소스코드

TypeScript에서 컴파일된 CommonJS 모듈들:

| 파일 | 라인 | 역할 |
|---|---|---|
| **main.js** | 200 | 엔트리 포인트. Sentry 초기화, 싱글 인스턴스 관리, 프로토콜 핸들러, .pen 파일 연결 |
| **app.js** | 331 | `PencilApp` 클래스. 윈도우 관리, 파일 열기/저장, WebSocket 서버, IPC 디바이스 관리 |
| **claude.js** | 129 | Claude AI 에이전트 통합. API 키 관리, Claude Code 상태 폴링, 터미널 열기 |
| **config.js** | 39 | `electron-store` 기반 설정. 윈도우 크기, 최근 파일, Claude 계정/API 키 |
| **constants.js** | 19 | 상수 정의. `IS_DEV`, `APP_PROTOCOL`, `EDITOR_PORT`, `WS_PORT`, `APP_FOLDER_PATH` |
| **desktop-mcp-adapter.js** | 39 | MCP 어댑터. Claude Code CLI, Codex CLI, Gemini CLI, OpenCode CLI 통합 |
| **desktop-resource-device.js** | 329 | 파일 I/O 디바이스. .pen 파일 읽기/쓰기, 이미지 임포트, 라이선스 관리, 프롬프트 전송 |
| **ipc-electron.js** | 22 | Electron IPC 브릿지 (`IPCHost` 확장) |
| **menu.js** | 237 | 앱 메뉴. File(New/Open/Save/Import Figma/Export), Edit, View, Window, Help |
| **ide.js** | 35 | IDE 확장 관리 (Cursor용 `highagency.pencildev` 확장 설치 감지) |
| **logger.js** | 29 | `electron-log` 기반 로거 |
| **updater.js** | 48 | 자동 업데이트 로직 |
| **preload.js** | 17 | Context Bridge: `electronAPI` (IPC 메시지 송수신, 파일 경로 resolve) |

### 6.2 `/out/editor/` - 웹 기반 에디터 (프론트엔드)

```
editor/
├── index.html               # 에디터 HTML 진입점
├── assets/
│   ├── index.js             # 메인 에디터 JS 번들
│   ├── index.css            # 메인 스타일시트
│   ├── browserAll.js        # 브라우저 번들 1
│   ├── browserAll2.js       # 브라우저 번들 2
│   ├── webworkerAll.js      # Web Worker 번들 1
│   ├── webworkerAll2.js     # Web Worker 번들 2
│   └── pencil.wasm          # 핵심 에디터 엔진 (WebAssembly)
└── images/
    ├── design-kit-*.png     # 디자인 키트 썸네일 (halo, lunaris, nitro, shadcn, welcome, new)
    ├── logo-pencil.svg      # Pencil 로고
    ├── 512x512.png          # 앱 아이콘
    └── 64x64.png            # 앱 아이콘 (소형)
```

핵심 에디터 엔진은 **WebAssembly (pencil.wasm)**로 구현되어 있으며, Web Worker를 활용하여 멀티스레드 처리를 한다.

### 6.3 크로스 플랫폼 MCP 서버 바이너리

```
out/
├── mcp-server-darwin-arm64   # macOS ARM64 (7.3MB)
├── mcp-server-darwin-x64     # macOS x64 (7.9MB)
├── mcp-server-linux-x64      # Linux x64 (7.6MB)
└── mcp-server-windows-x64.exe # Windows x64 (7.8MB)
```

### 6.4 `/out/assets/` - 폰트 및 아이콘

```
assets/
├── 512x512.png              # 앱 아이콘
├── font/pencil.woff         # Pencil 커스텀 폰트
├── icon.icns                # macOS 아이콘
├── icon.icon/               # 아이콘 에셋
└── bun-darwin-arm64         # Bun 런타임 (57MB)
```

---

## 7. app.asar.unpacked/ (네이티브 바이너리, ~117MB)

asar 아카이브에 포함할 수 없는 네이티브 바이너리가 여기에 배치된다.

### 7.1 `@anthropic-ai/claude-agent-sdk` (~15MB)
```
claude-agent-sdk/
├── cli.js                   # Claude Code CLI 엔트리 (11MB)
├── sdk.mjs                  # Claude Agent SDK (720KB)
├── resvg.wasm               # SVG 렌더러 (2.5MB)
├── tree-sitter.wasm         # Tree-sitter 파서 (205KB)
├── tree-sitter-bash.wasm    # Bash 파서 (1.4MB)
├── bun.lock                 # Bun 패키지 잠금
└── package.json
```

### 7.2 `@img/sharp-*` (~15MB)
```
sharp-darwin-arm64/
└── lib/sharp-darwin-arm64.node  # Sharp 네이티브 바인딩 (280KB)

sharp-libvips-darwin-arm64/
└── lib/libvips-cpp.42.dylib    # libvips 이미지 처리 (15.6MB)
```

### 7.3 MCP 서버 및 런타임 (~86MB)
크로스 플랫폼 MCP 서버 바이너리 4종과 Bun 런타임(57MB)이 포함된다.

---

## 8. node_modules 주요 의존성 분류

### 8.1 핵심 내부 패키지 (`@ha/*`)
| 패키지 | 역할 |
|---|---|
| `@ha/agent` | AI 에이전트 생성/실행 프레임워크 (Claude 통합) |
| `@ha/ipc` | IPC 디바이스 매니저 (WebSocket 기반 통신) |
| `@ha/mcp` | MCP 서버 설치/관리 (Claude Code, Codex, Gemini, OpenCode CLI) |
| `@ha/schema` | .pen 파일 스키마 정의/타입 생성 |
| `@ha/shared` | 공유 유틸리티 (IPCHost 등) |
| `@ha/ws` | WebSocket 클라이언트 |
| `@ha/ws-server` | WebSocket 서버 |

### 8.2 AI/에이전트 관련
| 패키지 | 역할 |
|---|---|
| `@anthropic-ai/claude-agent-sdk` | Claude Code Agent SDK (CLI + WASM 포함) |

### 8.3 모니터링/관찰성
| 패키지 | 역할 |
|---|---|
| `@sentry/electron` | 크래시 리포팅 (Electron main + renderer) |
| `@sentry/node` + `@sentry/core` | Node.js 에러 추적 |
| `@opentelemetry/*` | 분산 추적 (HTTP, DB, Redis 등 25+ instrumentation 모듈) |
| `@apm-js-collab/*` | APM 코드 변환/추적 훅 |

### 8.4 Electron 도구
| 패키지 | 역할 |
|---|---|
| `electron-updater` | 자동 업데이트 |
| `electron-store` | 영구 설정 저장소 (JSON) |
| `electron-log` | 파일/콘솔 로깅 |

### 8.5 데이터/유효성 검사
| 패키지 | 역할 |
|---|---|
| `zod` | 런타임 스키마 검증 |
| `ajv` + `ajv-formats` | JSON Schema 검증 |
| `jsonrepair` | 깨진 JSON 자동 복구 |

### 8.6 이미지 처리
| 패키지 | 역할 |
|---|---|
| `@img/sharp-darwin-arm64` | Sharp 이미지 처리 (네이티브) |
| `@img/sharp-libvips-darwin-arm64` | libvips 라이브러리 |

### 8.7 기타 유틸리티
`ws`, `semver`, `fs-extra`, `dotenv`, `conf`, `js-yaml`, `smol-toml`, `eventemitter3`, `debug`, `lodash.isequal`, `lodash.escaperegexp`, `minimatch`, `sax`

---

## 9. 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│                                                         │
│  main.js ──► PencilApp (app.js)                         │
│                │                                        │
│                ├── BrowserWindow                         │
│                │     └── preload.js (contextBridge)      │
│                │                                        │
│                ├── WebSocketServerManager (@ha/ws-server)│
│                │     └── IPCDeviceManager (@ha/ipc)      │
│                │           └── DesktopResourceDevice     │
│                │                                        │
│                ├── DesktopMCPAdapter                     │
│                │     └── MCP Integrations                │
│                │         ├── Claude Code CLI             │
│                │         ├── Codex CLI                   │
│                │         ├── Gemini CLI                  │
│                │         └── OpenCode CLI                │
│                │                                        │
│                ├── ClaudeAgent (@ha/agent)               │
│                │     └── claude-agent-sdk                │
│                │                                        │
│                ├── Menu (menu.js)                        │
│                └── AutoUpdater (updater.js)              │
│                                                         │
└────────────────────────┬────────────────────────────────┘
                         │ IPC (ipcMain/ipcRenderer)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Electron Renderer Process                 │
│                                                         │
│  pencil://editor/ (또는 localhost:3000 in dev)           │
│                                                         │
│  ├── index.html                                         │
│  ├── index.js + index.css (메인 UI 번들)                 │
│  ├── pencil.wasm (핵심 에디터 엔진)                       │
│  ├── browserAll.js / browserAll2.js                     │
│  └── webworkerAll.js / webworkerAll2.js (멀티스레드)      │
│                                                         │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│              외부 AI/코드 에디터 통합                      │
│                                                         │
│  MCP Server ◄──► Claude Code / Codex / Gemini / OpenCode│
│  Cursor IDE Extension (highagency.pencildev)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 10. 주요 동작 흐름

### 10.1 앱 시작 순서
1. `main.js` - Sentry 초기화, 싱글 인스턴스 락 획득
2. 커스텀 프로토콜 `pencil://` 등록 (프로덕션만)
3. `PencilApp` 인스턴스 생성 및 `initialize()` 호출
4. WebSocket 서버 시작 → MCP 통합 활성화
5. BrowserWindow 생성 (hiddenInset 타이틀바, `#1e1e1e` 배경)
6. 최근 파일 또는 `pencil-welcome-desktop.pen` 열기
7. Claude 상태 확인 및 자동 업데이트 시작

### 10.2 파일 열기 흐름
1. `openFile()` → `loadFile()` 호출
2. `DesktopResourceDevice` 생성 (파일 내용 읽기)
3. IPCDeviceManager에 리소스 등록
4. 에디터(Renderer)에 `file-update` 알림 전송
5. 필요시 Claude 에이전트 연결

### 10.3 AI 에이전트 통합
- **Claude Code**: `@anthropic-ai/claude-agent-sdk`를 통해 CLI 기반 에이전트 실행
- **실행 환경**: 번들된 Bun 런타임 사용 (`bun-darwin-arm64`)
- **인증**: Claude Code 로그인 또는 Anthropic API 키 (electron-store에 저장)
- **모델 선택**: haiku / sonnet / opus (기본값: opus)
- **CLI 인수 지원**: `--prompt`, `--agent`, `--file`, `--headless`, `--multi-mode`
- **Anthropic Beta**: `fine-grained-tool-streaming-2025-05-14`

### 10.4 MCP 통합
- 4개 외부 AI CLI 도구 지원: `claudeCodeCLI`, `codexCLI`, `geminiCLI`, `openCodeCLI`
- WebSocket 서버 포트를 통해 MCP 서버와 통신
- 앱 종료 시 모든 MCP 통합 정리 (`removeIntegrations`)
- 네이티브 MCP 서버 바이너리가 4개 플랫폼용으로 번들됨

### 10.5 IPC 통신 채널
에디터와 메인 프로세스 간의 IPC 이벤트:

| 이벤트 | 방향 | 설명 |
|---|---|---|
| `file-update` | Main → Renderer | 파일 내용 업데이트 |
| `file-error` | Main → Renderer | 파일 열기 오류 |
| `dirty-changed` | Main → Renderer | 파일 변경 상태 |
| `claude-status` | Main → Renderer | Claude 연결 상태 |
| `desktop-update-ready` | Main → Renderer | 업데이트 준비 완료 |
| `toggle-theme` | Main → Renderer | 라이트/다크 전환 |
| `fullscreen-change` | Main → Renderer | 풀스크린 상태 변경 |
| `active-integrations` | Main → Renderer | MCP 통합 목록 |
| `show-code-mcp-dialog` | Main → Renderer | 코드/MCP 설정 다이얼로그 |
| `import-images` | Main → Renderer | 이미지 임포트 |
| `ide-name-changed` | Main → Renderer | IDE 확장 설치 알림 |
| `prompt-agent` | Main → Renderer | AI 에이전트 프롬프트 |
| `add-to-chat` | Renderer → Main → Renderer | 채팅 메시지 프록시 |
| `open-file` | Renderer → Main | 파일 열기 요청 |
| `load-file` | Renderer → Main | 파일 로드 요청 |
| `get-recent-files` | Renderer → Main | 최근 파일 목록 |
| `clear-recent-files` | Renderer → Main | 최근 파일 초기화 |
| `get-fullscreen` | Renderer → Main | 풀스크린 상태 조회 |
| `desktop-open-terminal` | Renderer → Main | 터미널 열기 |
| `claude-status-help-triggered` | Renderer → Main | Claude 상태 재확인 |
| `enter-claude-api-key` | Renderer → Main | API 키 저장 |
| `clear-claude-api-key` | Renderer → Main | API 키 삭제 |
| `desktop-update-install` | Renderer → Main | 업데이트 설치 |
| `add-extension-to-ide` | Renderer → Main | IDE 확장 설치 |

---

## 11. 보안 및 설정

### 11.1 설정 저장소 (`electron-store`)
```json
{
  "windowBounds": { "width": 1200, "height": 800 },
  "recentFiles": [],
  "claudeCodeAccount": null,
  "claudeApiKey": null
}
```

### 11.2 라이선스
- 파일 경로: `~/.pencil/license-token.json` (dev: `license-token-dev.json`)
- 형식: `{ email, licenseToken }`
- 로그인 상태에 따라 저장(save) 다이얼로그 동작이 달라짐

### 11.3 보안 설정
- `contextIsolation: true` - 컨텍스트 격리 활성화
- `nodeIntegration: false` - 렌더러에서 Node.js 비활성화
- `preload.js`를 통한 안전한 IPC 브릿지만 노출 (`electronAPI`)
- asar 무결성 검증 (SHA256)
- 코드 서명 (`_CodeSignature`)
- 최대 14개 최근 파일 관리

### 11.4 Sentry 에러 트래킹
- DSN: `o4510271844122624.ingest.us.sentry.io`
- 프로덕션만 활성화 (`IS_DEV`가 false일 때)
- PII 전송 활성화 (IP, 사용자 ID 등)
- 디바이스 온라인 상태 컨텍스트 포함

---

## 12. 디자인 키트

내장 디자인 키트 (에디터 이미지 기준):
- **Halo** - design-kit-halo.png
- **Lunaris** - design-kit-lunaris.png
- **Nitro** - design-kit-nitro.png
- **shadcn** - design-kit-shadcn.png
- **Welcome** - design-kit-welcome.png
- **New** - design-kit-new.png

---

## 13. 파일 크기 분석

| 컴포넌트 | 크기 | 비율 |
|---|---|---|
| Frameworks/ (Electron + 네이티브) | 256MB | 59.5% |
| app.asar.unpacked/ (네이티브 바이너리) | 117MB | 27.2% |
| app.asar (앱 소스 + node_modules) | 57MB | 13.3% |
| **전체** | **~430MB** | 100% |

### app.asar.unpacked 세부 분석
| 컴포넌트 | 크기 |
|---|---|
| out/ (MCP 서버 + Bun 런타임) | 86MB |
| @anthropic-ai/claude-agent-sdk | 15MB |
| @img/sharp + libvips | 15MB |

---

## 14. 앱 메뉴 구조

```
Pencil (macOS)
├── About Pencil
├── Check for Updates...
├── Services
├── Hide/Unhide
└── Quit

File
├── New File              (Cmd+N)
├── Open...               (Cmd+O)
├── ───
├── Import Figma...       (Copy/Paste 안내)
├── Import PNG/JPG/SVG...
├── ───
├── Export Code & MCP Setup
├── ───
├── Save                  (Cmd+S)
└── Save As...            (Cmd+Shift+S)

Edit (표준 편집 메뉴)

View
├── Show/Hide UI          (Cmd+\)
├── Reset Zoom / Zoom In / Zoom Out
├── Toggle Fullscreen
└── [Dev: Reload/DevTools]

Window
├── Minimize / Zoom
├── Toggle Light/Dark Mode
└── [macOS 표준]

Help
└── Learn More → https://pencil.dev
```

---

## 15. 기술 스택 요약

| 분류 | 기술 |
|---|---|
| 프레임워크 | Electron |
| 언어 | TypeScript → CommonJS |
| 에디터 엔진 | WebAssembly (pencil.wasm) |
| 런타임 | Node.js (Electron) + Bun (에이전트용) |
| AI 통합 | Claude Agent SDK, MCP Protocol |
| 이미지 처리 | Sharp + libvips |
| 상태 관리 | electron-store |
| 로깅 | electron-log |
| 에러 추적 | Sentry |
| 관찰성 | OpenTelemetry |
| 자동 업데이트 | Squirrel + electron-updater (GitHub Releases) |
| IDE 확장 | Cursor (highagency.pencildev) |
| 스키마 검증 | Zod, AJV |
| IPC | Electron IPC + WebSocket |
| 빌드 | Xcode 16.4 (macOS 15.5 SDK) |

---

## 16. WebGL 화면 이동 (Canvas Panning/Zoom) 소스코드 분석

렌더러는 **Skia CanvasKit (WebGL 기반)** + **PixiJS (이벤트 시스템)**를 조합한 하이브리드 구조이다.
핵심 코드는 `app.asar > /out/editor/assets/index.js` (6MB, minified)에 위치한다.

### 16.1 Camera 클래스 (`_wt`) - 뷰포트 핵심

```javascript
// 파일: index.js (minified class name: _wt)
// EventEmitter를 상속하며, 2D 뷰포트(left/top/zoom)를 관리
class _wt extends wl {
  constructor() {
    super(...arguments);
    re(this, "left", 0);          // 뷰포트 좌상단 X (world 좌표)
    re(this, "top", 0);           // 뷰포트 좌상단 Y (world 좌표)
    re(this, "screenWidth", 0);   // 화면 픽셀 너비
    re(this, "screenHeight", 0);  // 화면 픽셀 높이
    re(this, "zoom", 1);          // 줌 레벨 (0.02 ~ 256)
    re(this, "pixelPadding", [0,0,0,0]);  // UI 패널 패딩 [top, right, bottom, left]
    re(this, "dirty", true);
    re(this, "_bounds", new ls);
    re(this, "_worldTransform", new Qt);  // 3x3 affine 변환 행렬
  }

  get width()   { return this.screenWidth / this.zoom; }
  get height()  { return this.screenHeight / this.zoom; }
  get centerX() { return this.left + this.screenWidth / 2 / this.zoom; }
  get centerY() { return this.top + this.screenHeight / 2 / this.zoom; }

  get worldTransform() { return this.refresh(), this._worldTransform; }
  get bounds()         { return this.refresh(), this._bounds; }

  // ★ dirty flag로 world transform 행렬 갱신 (lazy evaluation)
  refresh() {
    if (this.dirty) {
      const t = this.left, i = this.top;
      const r = this.left + this.width, o = this.top + this.height;
      this._bounds.set(t, i, r, o);
      // 2D affine: [scaleX, 0, 0, scaleY, translateX, translateY]
      this._worldTransform.set(
        this.zoom, 0, 0, this.zoom,
        -t * this.zoom, -i * this.zoom
      );
      this.dirty = false;
    }
  }

  // world ↔ screen 좌표 변환
  toScreen(t, i) {
    return { x: (t - this.left) * this.zoom, y: (i - this.top) * this.zoom };
  }
  toWorld(t, i) {
    return { x: this.left + t / this.zoom, y: this.top + i / this.zoom };
  }

  // ★ 뷰포트 중심 이동
  setCenter(t, i) {
    if (this.centerX === t && this.centerY === i) return;
    const r = this.bounds;
    this.left = t - r.width / 2;
    this.top = i - r.height / 2;
    this.dirty = true;
    this.emit("change");
  }

  // ★ 줌 레벨 설정 (0.02 ~ 256 범위 clamp)
  setZoom(t, i) {
    t = Math.min(256, Math.max(0.02, t));
    if (this.zoom === t) return;
    const r = this.centerX, o = this.centerY;
    this.zoom = t;
    this.dirty = true;
    i && this.setCenter(r, o);  // 줌 후 중심 유지
    this.emit("change");
    this.emit("zoom");
  }

  setSize(t, i) {
    this.screenWidth = t; this.screenHeight = i; this.dirty = true;
  }

  // ★ 특정 world 좌표를 향해 줌 (마우스 위치 기준 줌 인/아웃)
  zoomTowardsPoint(t, i, r) {
    r = clamp(0.02, r, 256);
    const a = (t - this.centerX) * this.zoom;
    const l = (i - this.centerY) * this.zoom;
    const c = t - a / r;
    const u = i - l / r;
    this.setZoom(r, false);
    this.setCenter(c, u);
  }

  // ★ 화면 이동 (translate)
  translate(t, i) {
    this.setCenter(this.centerX + t, this.centerY + i);
  }

  // 바운딩 박스에 맞춰 줌
  zoomToBounds(t, i) {
    const r = t.centerX, o = t.centerY;
    const s = this.pixelPadding[3] + this.pixelPadding[1];
    const a = this.pixelPadding[0] + this.pixelPadding[2];
    const l = (this.screenWidth - i*2 - s) / t.width;
    const c = (this.screenHeight - i*2 - a) / t.height;
    const u = Math.min(l, c);
    this.setZoom(u, false);
    const d = (this.pixelPadding[1] - this.pixelPadding[3]) / 2 / u;
    const h = (this.pixelPadding[2] - this.pixelPadding[0]) / 2 / u;
    this.setCenter(r + d, o + h);
  }

  // 특정 영역이 보이도록 자동 스크롤
  ensureVisible(t, i = 40) {
    const r = this.pixelPadding[0]/this.zoom, o = this.pixelPadding[1]/this.zoom;
    const s = this.pixelPadding[2]/this.zoom, a = this.pixelPadding[3]/this.zoom;
    const l = i/this.zoom;
    const c = this.width - a - o - l*2;
    const u = this.height - r - s - l*2;
    if (t.width <= c && t.height <= u) {
      // 영역이 뷰포트에 들어갈 수 있으면 최소한 스크롤
      let v = 0, x = 0;
      if (t.x < this.left + a) v = t.x - l - (this.left + a);
      else if (t.x + t.width > this.left + this.width - o)
        v = t.x + t.width + l - (this.left + this.width - o);
      if (t.y < this.top + r) x = t.y - l - (this.top + r);
      else if (t.y + t.height > this.top + this.height - s)
        x = t.y + t.height + l - (this.top + this.height - s);
      if (v !== 0 || x !== 0) this.translate(v, x);
    } else {
      this.zoomToBounds(t, i);
    }
  }

  overlapsBounds(t) { return t.intersects(this.bounds); }
}
```

### 16.2 Wheel 이벤트 핸들러 (스크롤 & 줌)

```javascript
// InputManager의 handleContainerWheel 이벤트
re(this, "handleContainerWheel", e => {
  this.updateMousePosition(e);
  e.preventDefault();
  if (!this.isEnabled()) return;

  const t = this.worldMouse;       // 마우스의 world 좌표
  const i = e.ctrlKey, r = e.metaKey;

  if (i || r || this.manager.config.data.scrollWheelZoom) {
    // ★ Ctrl/Cmd + 휠 = 줌 (또는 scrollWheelZoom 설정 시)
    const o = r ? 15 : 30;  // metaKey는 더 정밀한 줌 (delta 범위 제한)
    const s = (r || this.manager.config.data.scrollWheelZoom)
              && this.manager.config.data.invertZoomDirection ? -1 : 1;
    const a = clamp(-o, e.deltaY, o) * -0.012 * s;
    this.manager.camera.zoomTowardsPoint(
      t.x, t.y,
      this.manager.camera.zoom + a * this.manager.camera.zoom
    );
  } else {
    // ★ 일반 휠 = 캔버스 패닝 (화면 이동)
    const o = e.deltaX / this.manager.camera.zoom;
    const s = e.deltaY / this.manager.camera.zoom;
    this.manager.camera.translate(o, s);
  }
});

// Ctrl+휠은 브라우저 기본 줌을 방지
re(this, "handleWindowWheel", e => {
  this.updateMousePosition(e);
  e.ctrlKey && e.preventDefault();
});
```

### 16.3 Hand Tool 클래스 (`r_t`) - Space+드래그 / Hand 도구 패닝

```javascript
// Space 키를 누른 상태에서 드래그, 또는 Hand 도구 선택 시 활성화
class r_t {
  constructor() {
    re(this, "canvasDragging", false);
    re(this, "canvasDragStartX", 0);
    re(this, "canvasDragStartY", 0);
  }

  handlePointerDown(e, t) {
    if (!this.canvasDragging && t.input) {
      e.stopPropagation(); e.preventDefault();
      this.canvasDragging = true;
      this.canvasDragStartX = t.input.mouse.canvas.x;
      this.canvasDragStartY = t.input.mouse.canvas.y;
      t.setCursor("grabbing");
    }
  }

  handlePointerMove(e, t) {
    t.setCursor(this.canvasDragging ? "grabbing" : "grab");
    if (this.canvasDragging && t.input) {
      // ★ 마우스 이동량을 줌 레벨로 나눠서 world 좌표 delta 계산
      const i = t.input.mouse.canvas.x - this.canvasDragStartX;
      const r = t.input.mouse.canvas.y - this.canvasDragStartY;
      t.camera.translate(-i / t.camera.zoom, -r / t.camera.zoom);
      this.canvasDragStartX = t.input.mouse.canvas.x;
      this.canvasDragStartY = t.input.mouse.canvas.y;
    }
  }

  handlePointerUp(e, t) {
    if (this.canvasDragging) {
      e.stopPropagation(); e.preventDefault();
      this.canvasDragging = false;
      t.setCursor("grab");
      // Space 키를 놓았거나 hand 도구가 아니면 exit
      if (t.input && !t.input.pressedKeys.has("Space") && t.activeTool !== "hand")
        this.exit(t);
    }
  }

  activate(e) {
    if (!this.canvasDragging) {
      e.setCursor("grab");
      e.pixiManager.disableInteractions();
    }
  }

  exit(e) {
    this.canvasDragging = false;
    e.pixiManager.enableInteractions();
    e.setCursor("default");
  }
}
```

### 16.4 StateManager (`y_t`) - 이벤트 디스패치

```javascript
// 모든 포인터/키보드 이벤트를 Hand tool 또는 현재 상태로 라우팅
class y_t {
  constructor(e) {
    this.manager = e;
    this.handState = new r_t();   // Hand tool 인스턴스
    this.state = new tl(e);       // 현재 편집 상태
  }

  handlePointerDown(e) {
    // ★ 패닝 모드 진입 조건:
    //   1) hand 도구 선택, 2) 이미 드래그 중
    //   3) Space + 좌클릭, 4) 중간 버튼(button === 1)
    if (this.manager.activeTool === "hand"
        || this.handState.canvasDragging
        || (this.manager.input.pressedKeys.has("Space") && e.button === 0)
        || e.button === 1) {
      this.handState.handlePointerDown(e, this.manager);
      return;
    }
    this.state.onPointerDown(e);
  }

  handlePointerMove(e) {
    if (this.manager.activeTool === "hand"
        || this.handState.canvasDragging
        || (this.manager.input.pressedKeys.has("Space")
            && !this.manager.input.mouse.pointerDown)) {
      this.handState.handlePointerMove(e, this.manager);
      return;
    }
    this.manager.setCursor("default");
    this.state.onPointerMove(e);
  }

  handlePointerUp(e) {
    if (this.manager.activeTool === "hand" || this.handState.canvasDragging) {
      this.handState.handlePointerUp(e, this.manager);
      return;
    }
    this.state.onPointerUp(e);
  }

  // Space 키로 hand tool 임시 활성화
  handleKeydown(e) {
    if (e.code === "Space" && !this.manager.input.mouse.pointerDown)
      this.handState.activate(this.manager);
  }

  handleKeyup(e) {
    if (e.code === "Space" && !this.handState.canvasDragging
        && this.manager.activeTool !== "hand")
      this.handState.exit(this.manager);
  }

  onToolChange(e, t) {
    t === "hand" ? this.handState.activate(this.manager)
      : e === "hand" && !this.handState.canvasDragging
        && this.handState.exit(this.manager);
  }
}
```

### 16.5 마우스 좌표 변환 (InputManager)

```javascript
// screen → world 좌표 변환
updateMousePosition(e) {
  const t = this.containerElement.getBoundingClientRect();
  this._mouse.window.x = e.clientX;
  this._mouse.window.y = e.clientY;
  this._mouse.canvas.x = e.clientX - t.left;
  this._mouse.canvas.y = e.clientY - t.top;
}

get worldMouse() {
  return this.manager.camera.toWorld(
    this._mouse.canvas.x,
    this._mouse.canvas.y
  );
}

pagePositionToWorld(e, t) {
  const i = this.containerElement.getBoundingClientRect();
  return this.manager.camera.toWorld(e - i.left, t - i.top);
}
```

### 16.6 렌더링 파이프라인 (Camera → Skia CanvasKit → WebGL)

```javascript
// ★ 메인 렌더 루프 (Skia CanvasKit WebGL 기반)
render() {
  if (this.canvas.isContextLost) return;
  const e = this.surfaceCanvas;
  e.clear(this.sceneManager.getBackgroundColor());
  e.save();
  e.scale(this.sceneManager.dpi, this.sceneManager.dpi);
  e.save();

  // ★ camera.worldTransform 행렬을 Skia 캔버스에 적용
  //    이 한 줄이 모든 화면 이동/줌을 렌더링에 반영
  e.concat(this.sceneManager.camera.worldTransform.toArray());

  this.displayContentCanvas();         // 캐시된 컨텐츠 표시
  this.renderPixelGrid();              // 픽셀 그리드
  this.sceneManager.render(this, e);   // 씬 그래프 렌더링
  this.renderGeneratingEffects();      // AI 생성 이펙트
  this.renderFlashes();                // 플래시 이펙트
  e.restore();                         // camera transform 복원

  this.renderScrollbars();             // 스크롤바 (transform 밖에서)
  e.restore();
  this.surface.flush();                // GPU에 flush
}

// Skia GL 서피스 생성 (앱 초기화 시)
// CanvasKit.MakeWebGLCanvasSurface() 사용
```

```
WebGL/WGSL 정점 셰이더 (PixiJS 레이어):

  var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
  var modelViewProjectionMatrix = globalUniforms.uProjectionMatrix
                                * worldTransformMatrix
                                * modelMatrix;
  vPosition = vec4<f32>(
    (modelViewProjectionMatrix * vec3<f32>(position, 1.0)).xy, 0.0, 1.0
  );

GLSL 버전:

  mat3 worldTransformMatrix = uWorldTransformMatrix;
  mat3 modelViewProjectionMatrix = uProjectionMatrix
                                 * worldTransformMatrix
                                 * modelMatrix;
  gl_Position = vec4(
    (modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0
  );
```

### 16.7 컨텐츠 캐싱 (오프스크린 렌더링)

```javascript
// 카메라 이동이 일어나면 캐시된 컨텐츠 이미지를 빠르게 표시하고,
// 실제 컨텐츠는 별도 오프스크린 서피스에서 다시 그림

displayContentCanvas() {
  // contentRenderedAtZoom !== camera.zoom 이면 큐빅 보간으로 스케일링
  if (this.contentRenderedAtZoom !== this.sceneManager.camera.zoom) {
    e.drawImageCubic(snapshot, -padding, -padding, 0.3, 0.3);
  } else {
    e.drawImage(snapshot, -padding, -padding);
  }
}

// 컨텐츠 다시 그리기 (줌/패닝으로 캐시 무효화 시)
invalidateContent() {
  this.contentNeedsRedraw = true;
  this.sceneManager.requestFrame();
}
```

### 16.8 설정 옵션

```javascript
const Jfe = {
  snapToObjects: true,
  roundToPixels: true,
  showPixelGrid: true,
  scrollWheelZoom: false,          // true: 휠로 줌 (기본: 휠로 패닝)
  invertZoomDirection: false,      // 줌 방향 반전
  leftPanelWidth: 200,
  leftPanelOpen: true,
  hideSidebarWhenLayersAreOpen: false,
  generatingEffectEnabled: true
};
// localStorage "pencil-config" 키에 JSON으로 저장
```

### 16.9 화면 이동 흐름 요약

```
사용자 입력                      Camera                        렌더링
───────────────                ──────────────               ──────────────
휠 스크롤 (deltaX/Y)    ──►  camera.translate()     ──►  dirty = true
Ctrl/Cmd + 휠           ──►  camera.zoomTowardsPoint() ─►  dirty = true
Space + 드래그          ──►  camera.translate()     ──►  dirty = true
중간 버튼 드래그         ──►  camera.translate()     ──►  dirty = true
Hand 도구 + 드래그      ──►  camera.translate()     ──►  dirty = true
                                  │
                                  ▼
                           camera.refresh()
                                  │
                     _worldTransform.set(
                       zoom, 0, 0, zoom,
                       -left*zoom, -top*zoom
                     )
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                              ▼
           Skia CanvasKit                  PixiJS WebGL
    canvas.concat(worldTransform)    uniform uWorldTransformMatrix
                   │                              │
                   ▼                              ▼
           화면에 변환 적용된 렌더링 (GPU accelerated)
```

### 16.10 XStudio 대응 구현 비교 (2026-02-02)

Pencil의 Pan/Zoom 아키텍처를 분석하여 XStudio에 적용한 최적화:

#### Pencil vs XStudio 렌더링 파이프라인

| 항목 | Pencil | XStudio (수정 후) |
|------|--------|-------------------|
| **Camera 구조** | `_wt` 클래스, dirty flag + lazy refresh | `ViewportController` — PixiJS Container.x/y/scale 직접 조작 |
| **카메라 → GPU** | `canvas.concat(worldTransform.toArray())` | `canvas.translate(cameraX, cameraY); canvas.scale(cameraZoom, cameraZoom)` |
| **컨텐츠 캐싱** | `contentNeedsRedraw` flag, 오프스크린 surface snapshot | `SkiaRenderer.contentSurface` + `contentSnapshot` (이중 Surface 캐싱) |
| **camera-only 프레임** | `contentNeedsRedraw === false` → 캐시 blit만 수행 (< 1ms) | `classifyFrame()` → `blitWithCameraDelta()` — 아핀 변환 블리팅 (< 1ms) |
| **줌 시 보간** | `drawImageCubic(snapshot, 0.3, 0.3)` — 큐빅 보간 | `canvas.scale(scaleRatio)` + `drawImage(snapshot)` |
| **cleanup render** | 줌 변경 시 `invalidateContent()` → 다음 프레임 전체 재렌더링 | `needsCleanupRender` flag → 카메라 정지 후 1회 전체 렌더링 |

#### Pencil 대비 XStudio에서 발견·수정된 병목 5가지

| # | 병목 | Pencil 방식 | XStudio 수정 |
|---|------|------------|-------------|
| 1 | **정수 스냅** | 서브픽셀 렌더링 허용 (CanvasKit 안티앨리어싱) | `SelectionBox.tsx`: `Math.round` 제거 |
| 2 | **드래그 스로틀** | `requestFrame()` 기반 (디스플레이 주사율 동기화) | `useDragInteraction.ts`: 16ms 고정 스로틀 제거, RAF 동기화 |
| 3 | **해상도 변동** | 고정 DPI (인터랙션 무관) | `pixiSetup.ts`: 인터랙션 중 해상도 하향 비활성화 |
| 4 | **camera-only GPU** | `contentNeedsRedraw === false` → blit만 | `SkiaRenderer.ts`: `blitWithCameraDelta()` 추가 |
| 5 | **트리 캐시** | 캐시 blit이므로 트리 순회 불필요 | `SkiaOverlay.tsx`: `buildSkiaTreeHierarchical` 캐시에서 카메라 비교 제거 (registryVersion만 비교) |

#### camera-only 프레임 비용 비교

```
Pencil:
  contentNeedsRedraw = false
  → drawImage(cachedSnapshot)                        ~0.5ms
  → flush                                             ~0.5ms
  합계: < 1ms

XStudio (수정 전):
  buildSkiaTreeHierarchical (cache MISS)              ~5-10ms  ← 카메라 비교로 매번 무효화
  setRootNode (closure 생성)                           ~0.1ms
  renderContent (전체 GPU 렌더링)                      ~16ms   ← camera-only도 전체 렌더
  blitToMain                                           ~1ms
  합계: ~22-27ms

XStudio (수정 후):
  buildSkiaTreeHierarchical (cache HIT)                ~0ms    ← registryVersion만 비교
  setRootNode (closure 생성)                            ~0.1ms
  blitWithCameraDelta (아핀 변환 블리팅)                 ~1ms    ← GPU 렌더 스킵
  합계: ~1ms
```

---

## 17. 에디터 프론트엔드 (index.js) 구조 분석

> 파일: `out/editor/assets/index.js`
> 크기: **8.1MB** (prettified), **252,734줄**
> 번들러: **Vite** (코드 스플리팅: browserAll.js, webworkerAll.js, browserAll2.js, webworkerAll2.js)
> 클래스 수: **383개**, 최상위 함수 수: **3,230개**

Pencil 에디터의 전체 프론트엔드가 Vite로 단일 파일에 번들링되어 있다. React UI, 렌더링 엔진(PixiJS + Skia CanvasKit), 디자인 시스템 데이터, 서드파티 라이브러리가 모두 포함된다.

### 17.1 전체 구조 맵

| 라인 범위 | 섹션 | 설명 |
|---|---|---|
| 1-80 | **Vite 부트스트랩 + Sentry 초기화** | `__vite__mapDeps` (코드 스플리팅), private field 헬퍼 (`re`, `Tt`, `Oo`, `Bi`), Sentry 디버그 ID |
| 81-3,842 | **Sentry SDK** | 에러 모니터링 라이브러리 (`iLe` → `dOe` BrowserClient) |
| 3,843-5,227 | **React 19.2.0** | React 코어 (`Component`, `PureComponent`, `createElement`, hooks) |
| 5,228-17,314 | **React DOM** | React DOM 렌더러 (reconciler, fiber, synthetic events) |
| 17,315-18,100 | **React DOM 클라이언트** | `createRoot`, hydration, version: `"19.2.0"` |
| 18,100-26,385 | **PostHog** | 분석/텔레메트리 SDK (`posthog-js`), 이벤트 캡처, 세션 리플레이 |
| 26,386-28,165 | **React Router v7.8.2** | SPA 라우팅 (`createBrowserRouter`, 경로 매칭, `useNavigate`) |
| 28,166-29,054 | **IPC 시스템** | `S$e` (IPC Server), `G6` (IPCError), Electron↔렌더러 메시지 핸들링 |
| 29,055 | **EventEmitter (`wl`)** | 전체 앱에서 사용하는 기본 이벤트 시스템 (`const wl = lc(z$e)`) |
| 29,056-37,980 | **유틸리티 + Emscripten 부트스트랩** | 각종 헬퍼 함수, CanvasKit WASM 로더 준비 |
| 37,981-38,730 | **CanvasKit (Skia WASM)** | `canvaskit.wasm` 로딩, `_malloc`/`_free`, RuntimeEffect 바인딩 |
| 38,731-70,860 | **PixiJS v8.x** | 전체 PixiJS 렌더링 엔진 (Math, Bounds, Container, Texture, Shader, WebGL Context, Batch Renderer, Application) |
| 70,861-78,104 | **노드 시스템 / .pen 스키마** | `serialize()`, `serializeNode()`, 문서 버전 관리 (`HP`), `aXe` 기본 문서 구조 |
| 78,105-81,483 | **FileManager (`lXe`)** | .pen 파일 I/O, 문서 로드/저장, 에셋 관리 |
| 81,484-112,445 | **노드 타입 + 임베디드 데이터** | 노드 구현체들 (Frame, Text, Path, Rectangle, Ellipse 등), `JSON.parse(...)` 인라인 데이터 (폰트 메트릭, 디자인 킷) |
| 112,446 | **대형 인라인 JSON 블록** | MCP 관련 데이터, 디자인 시스템 컴포넌트 정의 |
| 115,048-115,600 | **Scenegraph (`Io`)** | 씬 그래프 (노드 트리 관리, `viewportNode`, `nodeByLocalID`, 레이아웃 업데이트) |
| 117,890-118,200 | **UndoManager (`xyt`)** | Undo/Redo 시스템 |
| 127,583-128,058 | **Camera (`_wt`)** | 뷰포트 관리 (left/top/zoom, worldTransform 매트릭스, dirty flag) |
| 128,059-131,384 | **NodeManager (`Rwt`) 외** | 노드 조작, 선택, 가이드 관리 |
| 131,385-132,125 | **HandTool (`r_t`)** | Space+드래그 / 중간버튼 드래그 캔버스 패닝 |
| 132,126-132,347 | **StateManager (`y_t`)** | 이벤트 라우팅 (도구 전환, 마우스 이벤트 디스패치) |
| 132,348-132,769 | **SelectionManager (`w_t`)** | 다중선택, 선택 가이드, 바운딩 박스 |
| **132,770-133,292** | **SceneManager (`x_t`)** ⭐ | **핵심 클래스** - 모든 매니저 조합 (아래 상세) |
| 133,293-139,809 | **SkiaRenderer (`M_t`)** | Skia CanvasKit 렌더링 (Surface, Canvas, 폰트 매니저, 셰이더 효과, 컨텐츠 캐싱) |
| 139,810-140,363 | **MCP 오퍼레이션 프로세서 (`x2t`)** | `batch-design` 연산 처리 (I/C/U/R/D/M), 트랜잭션 (beginUpdate/commitBlock/rollbackBlock) |
| 140,364-142,648 | **EditorCore (`A2t`)** | 에디터 초기화 (SceneManager + SkiaRenderer 생성, IPC 핸들러 등록) |
| 142,649-180,886 | **UI 라이브러리 + 인라인 디자인 킷 데이터** | Toast 시스템 (`W5t`), 인라인 디자인 킷 JSON (~40K줄: halo, lunaris, nitro, shadcn) |
| 180,887-196,836 | **HTML/CSS 파서 + Markdown** | `hast-util-to-jsx-runtime`, `react-markdown`, HTML 속성 시스템 (`e7`, `ph`) |
| 196,837-206,338 | **Floating UI** | 팝오버/드롭다운 포지셔닝 (`@floating-ui/dom`) |
| 206,339-216,563 | **Quill 리치텍스트 에디터** | Delta, Scroll, Blot, History, Clipboard, 포맷팅 |
| 216,564-224,270 | **Quill 확장 + 노드 타입 계층** | Quill 포맷/블롯 확장, 에디터 노드 타입 (`Hm`, `Pc`, `Jf`, `hu`, `J_`, `Q_` 등) |
| 224,271-236,625 | **Lodash** | 유틸리티 라이브러리 (전체 인라인 번들) |
| 236,626-252,656 | **React UI 컴포넌트** | 에디터 UI 패널, 모달, 속성 편집기, 변수 관리, 디자인 킷 선택기, 라우팅 |
| 252,657-252,678 | **앱 엔트리포인트** | PostHogProvider → RouterProvider → `createRoot().render()` |
| 252,679-252,734 | **ES Module 익스포트** | 코드 스플리팅용 바인딩 익스포트 맵 |

### 17.2 핵심 아키텍처 클래스 관계도

```
A2t (EditorCore) ─── 에디터 초기화 및 IPC 핸들러 등록
 │
 └─ x_t (SceneManager) ⭐ ────── 중앙 허브, 모든 매니저를 소유
     │
     ├── _wt (Camera)
     │    ├── left, top, zoom, dirty flag
     │    ├── _worldTransform: [zoom, 0, 0, zoom, -left*zoom, -top*zoom]
     │    └── zoomTowardsPoint(), translate()
     │
     ├── Io (Scenegraph)
     │    ├── viewportNode (루트 노드)
     │    ├── nodeByLocalID: Map
     │    ├── nodes: Set
     │    └── beginUpdate() / commitBlock() / rollbackBlock()
     │
     ├── M_t (SkiaRenderer)
     │    ├── surface, canvas, contentSurface, contentCanvas
     │    ├── fontManager (d_t)
     │    ├── colorContrastOverlay (RuntimeEffect 셰이더)
     │    ├── checkerBoardEffect, hatchEffect
     │    ├── contentNeedsRedraw, contentRenderedAtZoom
     │    └── invalidateContent(), resize()
     │
     ├── PixiManager (PixiJS Application)
     │    └── update() → PixiJS 렌더 루프
     │
     ├── y_t (StateManager)
     │    └── 이벤트 라우팅 (hand tool vs 편집 도구 전환)
     │
     ├── w_t (SelectionManager)
     │    └── updateMultiSelectGuides()
     │
     ├── Rwt (NodeManager) ─── 노드 CRUD
     ├── xyt (UndoManager) ─── undo/redo 스택
     ├── lXe (FileManager) ─── .pen 파일 I/O
     ├── r_t (HandTool) ─── 캔버스 패닝
     ├── x2t (MCP Processor) ─── AI 도구 연산 처리
     │
     └── 기타 매니저:
          ├── snapManager ─── 스냅 가이드
          ├── connectionManager ─── 연결선
          ├── textEditorManager (b_t) ─── Quill 기반 텍스트 편집
          ├── guidesManager ─── 룰러/가이드
          ├── assetManager ─── 이미지/에셋
          └── variableManager (LYe) ─── 변수/테마
```

### 17.3 SceneManager (`x_t`) 상세 (132,770줄)

에디터의 **중앙 허브** 클래스. 모든 서브시스템을 생성/관리하고 렌더 루프를 조율한다.

```javascript
class x_t {
  constructor(containerBounds, colorScheme, pixiManager, ipc, config) {
    // 서브시스템 초기화
    this.scenegraph = new Io(this);          // 씬 그래프
    this.camera = new _wt();                 // 카메라
    this.selectionManager = new w_t(this);   // 선택
    this.nodeManager = new Rwt(this);        // 노드
    this.textEditorManager = new b_t(this);  // 텍스트 편집
    this.guidesManager = new Iwt(this);      // 가이드
    this.connectionManager = new Pwt(this);  // 연결선
    this.fileManager = new lXe(this);        // 파일 I/O
    this.snapManager = new Awt(this);        // 스냅
    this.undoManager = new xyt(this);        // Undo/Redo
    this.variableManager = new LYe(this);    // 변수/테마
    this.stateManager = new y_t(this);       // 상태/이벤트
    this.assetManager = new Mwt(this);       // 에셋
  }

  // 렌더 루프
  tick = () => {
    this.deltaTime = (performance.now() - this.currentTime) / 1000;
    this.beforeUpdate();
    this.pixiManager.update(currentTime);    // PixiJS 업데이트
    this.afterUpdate();
    this.flushDebouncedEvents();
    if (this.framesRequested > 0) requestAnimationFrame(this.tick);
  };
}
```

### 17.4 EditorCore (`A2t`) 초기화 흐름 (140,364줄)

```javascript
class A2t extends wl {
  async setup({canvas, containerBounds, colorScheme, ipc, pixiManager, canvasKitConfig, config}) {
    // 1. SceneManager 생성
    this._sceneManager = new x_t(containerBounds, colorScheme, pixiManager, ipc, config);

    // 2. CanvasKit 초기화 (WASM 로딩)
    await sGe(canvasKitConfig);

    // 3. SkiaRenderer 생성 및 연결
    this._sceneManager.skiaRenderer = new M_t(this._sceneManager, canvas);

    // 4. 기본 폰트(Inter) 로딩
    this._sceneManager.skiaRenderer.fontManager.loadFont("Inter");

    // 5. IPC 핸들러 등록 (MCP batch-design 등)
    await this.initializeIPC(ipc, sendAPIRequest);
  }

  async initializeIPC(ipc, sendAPIRequest) {
    const processor = new x2t(this._sceneManager, sendAPIRequest);

    ipc.handle("batch-design", async (params) => {
      return processor.process(ipc, params.partial, params.operations, id);
    });
    // ... 기타 핸들러: batch-get, snapshot-layout, get-screenshot 등
  }
}
```

### 17.5 SkiaRenderer (`M_t`) 렌더링 파이프라인 (133,293줄)

```javascript
class M_t {
  constructor(sceneManager, canvas) {
    this.surface = /* CanvasKit Surface */;
    this.canvas = canvas;
    this.contentSurface = /* 오프스크린 캐시 서피스 */;
    this.contentNeedsRedraw = true;
    this.fontManager = new d_t(...);

    // Skia RuntimeEffect 셰이더 (GLSL)
    this.colorContrastOverlay = RuntimeEffect.MakeForBlender(`
      half4 main(half4 src, half4 dst) {
        half luminance = getLuminance(toLinearSrgb(dst.rgb));
        half3 outputColor = luminance > 0.1791287847 ?
          mix(half3(0), dst.rgb, 0.93) :
          mix(half3(1), dst.rgb, 0.85);
        return half4(outputColor, 1.0) * src.a;
      }
    `);
  }

  render() {
    camera.refresh();  // worldTransform 갱신

    if (this.contentNeedsRedraw) {
      // contentSurface에 전체 씬 렌더링 (비용 높음)
      this.renderContent();
      this.contentRenderedAtZoom = camera.zoom;
    }

    // 메인 캔버스에 캐시된 콘텐츠 블리팅 (비용 낮음)
    canvas.concat(camera.worldTransform);
    canvas.drawImage(contentSnapshot, ...);
  }
}
```

**콘텐츠 캐싱 전략**:
- `contentNeedsRedraw = true`: 노드 변경 시 → `contentSurface`에 전체 재렌더
- `contentNeedsRedraw = false`: 카메라만 이동 시 → 캐시된 이미지를 `drawImage()`로 블리팅
- `debouncedMoveEnd` (200ms): 패닝 종료 후 줌 레벨 변경 감지 → `invalidateContent()`

### 17.6 MCP 오퍼레이션 프로세서 (`x2t`) (139,810줄)

AI 도구(Claude 등)에서 보내는 `batch-design` 명령을 트랜잭션으로 처리한다.

```javascript
class x2t {
  constructor(sceneManager, sendAPIRequest) {
    this.toolCalls = new Map();  // 진행 중인 도구 호출 추적
  }

  async process(ipc, partial, operations, requestId) {
    // 트랜잭션 시작
    const block = scenegraph.beginUpdate();
    const bindings = new Map([["document", "document"], ["root", "document"]]);

    // 연산 순차 실행 (I/C/U/R/D/M/G)
    await this.processOperations(toolCall, ipc, operations);

    if (failed) {
      scenegraph.rollbackBlock(block);   // 실패 시 전체 롤백
      return { success: false };
    } else {
      scenegraph.commitBlock(block, { undo: true });  // 성공 시 커밋 (undo 가능)
      return { success: true };
    }
  }
}
```

### 17.7 포함 라이브러리 목록

| 라이브러리 | 버전 | 라인 범위 (약) | 용도 |
|---|---|---|---|
| **Sentry** | - | 81-3,842 | 에러 모니터링 / 크래시 리포팅 |
| **React** | 19.2.0 | 3,843-17,314 | UI 프레임워크 |
| **PostHog** | - | 18,100-26,385 | 사용자 행동 분석, 세션 리플레이 |
| **React Router** | 7.8.2 | 26,386-28,165 | SPA 라우팅 |
| **CanvasKit (Skia)** | WASM | 37,981-38,730 | 고성능 벡터/텍스트 렌더링 |
| **PixiJS** | 8.x | 38,731-70,860 | WebGL 2D 렌더링 엔진 |
| **Floating UI** | - | 196,837-206,338 | 팝오버/드롭다운 포지셔닝 |
| **Quill** | - | 206,339-224,270 | 리치텍스트 편집기 (텍스트 노드용) |
| **Lodash** | - | 224,271-236,625 | 유틸리티 (전체 인라인 번들) |
| **react-markdown** | - | 187,975~ | 마크다운 렌더링 |
| **hast-util-to-jsx-runtime** | - | 182,300~ | HTML AST → JSX 변환 |

### 17.8 렌더링 파이프라인 흐름도

```
requestAnimationFrame
  │
  ▼
SceneManager.tick()
  │
  ├── beforeUpdate()
  │    └── camera.refresh()
  │         └── dirty → worldTransform 재계산
  │              [zoom, 0, 0, zoom, -left*zoom, -top*zoom]
  │
  ├── pixiManager.update()
  │    └── PixiJS Application 렌더 루프
  │         ├── 선택 UI 오버레이 (선택 박스, 핸들, 가이드)
  │         └── WebGL context
  │
  ├── afterUpdate()
  │    └── skiaRenderer.render()
  │         ├── [캐시 HIT] canvas.drawImage(contentSnapshot)  ← ~0.5ms
  │         └── [캐시 MISS] renderContent()
  │              ├── contentSurface.getCanvas()
  │              ├── 각 노드 순회 렌더링
  │              │    ├── drawRect() / drawPath() / drawText()
  │              │    ├── RuntimeEffect 셰이더 적용
  │              │    └── 클리핑, 블렌드 모드
  │              └── contentSurface.makeImageSnapshot()
  │
  └── flushDebouncedEvents()
       └── debouncedMoveEnd (200ms)
            └── 줌 변경 감지 → invalidateContent()
```

### 17.9 노드 타입 계층 구조

PixiJS의 Container 시스템과 Quill 에디터의 Blot 시스템을 결합한 하이브리드 노드 체계:

```
wl (EventEmitter) ← 기본 이벤트 시스템
 │
 ├── df (기본 PixiJS 노드)
 │    └── Pbe (확장 노드)
 │
 ├── Ga (속성 노드 기본 클래스)
 │    ├── Aye, Tye, Mye, Pye... (20+ 속성 타입)
 │    └── 각 노드 속성 정의 (fill, stroke, shadow, blur 등)
 │
 ├── mX → MX (렌더링 가능 노드)
 │
 ├── O_ (추상 노드)
 │    └── bbe (구체 노드 구현)
 │
 ├── Ma (PixiJS Container 기반)
 │    ├── oF, s0, uv, hF (내장 도형)
 │    └── BA (확장 컨테이너)
 │
 └── Quill 계열 (텍스트 편집용)
      ├── Hm (기본 블롯)
      ├── Pc extends cA (인라인)
      ├── Jf extends ff (블록)
      ├── hu extends Pc (인라인 확장)
      ├── J_ extends Q_ (블록 확장)
      └── ZJ extends ff, TI extends ZJ, MI extends Jf...
```

### 17.10 인라인 디자인 킷 데이터 (142,649-180,886줄)

약 **38,000줄**에 걸쳐 디자인 시스템 컴포넌트가 JSON으로 인라인 포함되어 있다:

| 디자인 킷 | 라인 범위 (약) | 설명 |
|---|---|---|
| **Halo** | 143,611~ | 디자인 시스템 컴포넌트 |
| **Lunaris** | 148,415~ / 165,164~ / 172,293~ | 디자인 시스템 컴포넌트 (여러 변형) |
| **Nitro** | 154,488~ | 디자인 시스템 컴포넌트 |
| **Shadcn UI** | 159,487~ | Shadcn 기반 디자인 시스템 |

이 데이터는 `JSON.parse(...)` 형태로 파싱되며 MCP 프로세서의 `batch-design` 연산에서 컴포넌트 참조(ref)로 사용된다.

디자인 킷 선택 UI:
```javascript
const designKits = [
  { id: "new", name: "New .pen file" },
  { id: "shadcn", name: "Shadcn UI" },
  { id: "lunaris", name: "Lunaris" },
  { id: "halo", name: "Halo" },
  { id: "nitro", name: "Nitro" },
  { id: "welcome", name: "Welcome File" },
];
```

### 17.11 React UI 레이어 (236,626-252,678줄)

에디터의 React UI 컴포넌트들이 파일 후반부에 위치:

```
React UI 컴포넌트 구조:
 │
 ├── 라우팅
 │    ├── /editor/:fileName? → hY (에디터 뷰)
 │    ├── /generator → yKt (생성기 뷰)
 │    └── / → hY (기본 에디터)
 │
 ├── Provider 래핑
 │    └── PostHogProvider → A$e → RouterProvider
 │
 ├── 속성 편집 UI
 │    ├── 변수 관리 (추가/이름변경/삭제)
 │    ├── 테마 축 관리
 │    └── 노드 속성 패널
 │
 ├── 모달/다이얼로그
 │    ├── 디자인 킷 선택기
 │    ├── Export Code & MCP 설정
 │    └── 스타일 가이드 선택
 │
 └── 앱 엔트리포인트 (252,669줄)
      Sentry.init({ dsn, release, sendDefaultPii: true });
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(<PostHogProvider><App /></PostHogProvider>);
```

### 17.12 IPC 핸들러 목록

EditorCore가 등록하는 IPC 핸들러 (MCP 도구와 매핑):

| IPC 핸들러 | 대응 MCP 도구 | 설명 |
|---|---|---|
| `batch-design` | `batch_design` | 디자인 연산 실행 (I/C/U/R/D/M/G) |
| `batch-get` | `batch_get` | 노드 검색/조회 |
| `snapshot-layout` | `snapshot_layout` | 레이아웃 스냅샷 |
| `get-screenshot` | `get_screenshot` | 노드 스크린샷 |
| `get-variables` | `get_variables` | 변수/테마 조회 |
| `set-variables` | `set_variables` | 변수/테마 설정 |
| `find-empty-space` | `find_empty_space_on_canvas` | 캔버스 빈 공간 탐색 |
| `search-properties` | `search_all_unique_properties` | 속성 검색 |
| `replace-properties` | `replace_all_matching_properties` | 속성 일괄 치환 |

### 17.13 특이사항 및 아키텍처 특징

1. **하이브리드 렌더링**: PixiJS(WebGL)가 선택 UI/오버레이를 담당하고, Skia CanvasKit(WASM)이 실제 디자인 콘텐츠를 렌더링하는 이중 구조
2. **콘텐츠 캐싱**: `contentSurface`에 오프스크린 렌더링 후 `drawImage()`로 블리팅 → 카메라만 이동 시 GPU 재렌더 없이 ~0.5ms
3. **인라인 디자인 킷**: 4개 디자인 시스템(~38K줄)이 번들에 직접 포함 → 초기 로딩 시 파싱 비용 있지만 네트워크 요청 없음
4. **트랜잭션 기반 편집**: `beginUpdate()` → 연산 실행 → `commitBlock(undo: true)` 또는 `rollbackBlock()` 패턴으로 원자적 편집 보장
5. **MCP 통합 아키텍처**: IPC 핸들러 → `x2t` 프로세서 → Scenegraph 트랜잭션 → Undo 스택, AI 도구 연산이 사용자 작업과 동일한 undo 체계를 공유
6. **Quill 통합**: 텍스트 노드 편집 시 Quill 리치텍스트 에디터가 인라인으로 활성화, 자체 History(undo/redo)와 에디터의 UndoManager가 별도로 동작

---

## 18. 소스코드 추출 (라이브러리 제외)

> 추출 경로: `/private/tmp/pencil-extracted/src/`
> 원본: `out/editor/assets/index.js` (252,734줄, 8.1MB)
> 추출 결과: **127,104줄 (4.5MB)** — 앱 자체 코드 50%
> 제외 분량: **125,630줄 (3.6MB)** — 서드파티 라이브러리 49%

### 18.1 제외된 서드파티 라이브러리

| 라인 범위 | 라이브러리 | 제외 줄 수 |
|---|---|---|
| 81-3,842 | Sentry SDK | 3,762줄 |
| 3,843-28,165 | React 19.2.0 + React DOM + PostHog + React Router v7.8.2 | 24,323줄 |
| 29,055-70,860 | EventEmitter + 유틸리티 + CanvasKit WASM 로더 + PixiJS v8.x | 41,806줄 |
| 180,887-236,625 | HTML/CSS 파서 + react-markdown + Floating UI + Quill + Lodash | 55,739줄 |
| | **합계** | **125,630줄** |

### 18.2 추출된 디렉토리 구조

```
src/
├── boot/                           부트스트랩 & 엔트리
│   ├── 01_vite-bootstrap.js          80줄    Vite 헬퍼, private field 유틸
│   └── 20_app-entry.js              56줄    ES Module 익스포트 맵
│
├── ipc/                            IPC 통신
│   └── 02_ipc-system.js            889줄    IPC Server, IPCError, 메시지 핸들링
│
├── core/                           핵심 데이터 모델
│   ├── 03_node-system-schema.js   7,244줄   .pen 스키마, serialize/deserialize
│   ├── 04_file-manager.js         3,379줄   .pen 파일 I/O, 에셋 관리
│   ├── 05_node-types.js          30,962줄   노드 타입 구현체 + 인라인 폰트/메트릭 데이터
│   └── 06_node-extensions.js      2,602줄   노드 확장, MCP 관련 데이터
│
├── engine/                         렌더링 엔진 & 매니저
│   ├── 07_scenegraph.js           2,842줄   씬 그래프 (Io) - 노드 트리 관리
│   ├── 08_undo-manager.js         9,693줄   Undo/Redo 시스템 (xyt)
│   ├── 09_camera.js                 476줄   카메라 (_wt) - 뷰포트/줌/패닝
│   ├── 10_node-manager.js         3,326줄   노드 CRUD (Rwt)
│   ├── 11_hand-tool.js              741줄   캔버스 패닝 도구 (r_t)
│   ├── 12_state-manager.js          222줄   이벤트 라우팅/도구 전환 (y_t)
│   ├── 13_selection-manager.js      422줄   선택 관리 (w_t)
│   ├── 14_scene-manager.js          523줄   ⭐ 중앙 허브 클래스 (x_t)
│   ├── 15_skia-renderer.js        6,517줄   Skia CanvasKit 렌더러 (M_t)
│   ├── 16_mcp-processor.js          554줄   AI 도구 연산 처리 (x2t)
│   └── 17_editor-core.js         2,285줄   에디터 초기화/IPC 등록 (A2t)
│
└── ui/                             UI 레이어
    ├── 18_ui-and-design-kits.js  38,238줄   UI 컴포넌트 + 디자인 킷 JSON (halo/lunaris/nitro/shadcn)
    └── 19_react-components.js    16,053줄   React UI 패널/모달/속성편집기/라우팅
```

### 18.3 파일별 원본 라인 매핑

| 추출 파일 | 원본 라인 범위 | 주요 클래스/함수 |
|---|---|---|
| `01_vite-bootstrap.js` | 1-80 | `__vite__mapDeps`, `re`, `Tt`, `Oo`, `Bi` (private field 헬퍼) |
| `02_ipc-system.js` | 28,166-29,054 | `S$e` (IPC Server), `G6` (IPCError), `C$e` |
| `03_node-system-schema.js` | 70,861-78,104 | `serialize()`, `serializeNode()`, 문서 버전 `HP` |
| `04_file-manager.js` | 78,105-81,483 | `lXe` (FileManager) |
| `05_node-types.js` | 81,484-112,445 | 각 노드 타입 구현, `JSON.parse(...)` 인라인 데이터 |
| `06_node-extensions.js` | 112,446-115,047 | MCP 데이터, 디자인 시스템 정의 |
| `07_scenegraph.js` | 115,048-117,889 | `Io` (Scenegraph) - viewportNode, nodeByLocalID |
| `08_undo-manager.js` | 117,890-127,582 | `xyt` (UndoManager) |
| `09_camera.js` | 127,583-128,058 | `_wt` (Camera) - left/top/zoom/worldTransform |
| `10_node-manager.js` | 128,059-131,384 | `Rwt` (NodeManager) |
| `11_hand-tool.js` | 131,385-132,125 | `r_t` (HandTool) - Space+드래그 패닝 |
| `12_state-manager.js` | 132,126-132,347 | `y_t` (StateManager) - 이벤트 디스패치 |
| `13_selection-manager.js` | 132,348-132,769 | `w_t` (SelectionManager) |
| `14_scene-manager.js` | 132,770-133,292 | `x_t` (SceneManager) ⭐ 중앙 허브 |
| `15_skia-renderer.js` | 133,293-139,809 | `M_t` (SkiaRenderer) - Surface/Canvas/셰이더 |
| `16_mcp-processor.js` | 139,810-140,363 | `x2t` - batch-design 트랜잭션 처리 |
| `17_editor-core.js` | 140,364-142,648 | `A2t` (EditorCore) - 초기화/IPC 핸들러 |
| `18_ui-and-design-kits.js` | 142,649-180,886 | Toast, UI 유틸, 디자인 킷 JSON (~38K줄) |
| `19_react-components.js` | 236,626-252,678 | React 컴포넌트, 라우팅, 앱 render() |
| `20_app-entry.js` | 252,679-252,734 | ES Module 익스포트 맵 |

### 18.4 코드 분포 비율

```
앱 소스코드 구성 (127,104줄):

  core/        44,187줄  ██████████████████░░░░░░░░░░  34.8%  (노드 시스템, 스키마, 파일 I/O)
  engine/      27,601줄  ██████████░░░░░░░░░░░░░░░░░░  21.7%  (렌더링 엔진, 매니저)
  ui/          54,291줄  █████████████████████░░░░░░░░  42.7%  (React UI, 디자인 킷 데이터)
  boot+ipc/     1,025줄  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0.8%  (부트스트랩, IPC)

  * ui/ 중 약 38,000줄은 인라인 디자인 킷 JSON 데이터
  * 순수 로직 코드는 약 89,000줄로 추정
```

---

## 19. engine 디렉토리 상세 분석

> 경로: `/private/tmp/pencil-extracted/src/engine/`
> 총 11개 파일, **27,601줄**
> Pencil 에디터의 핵심 엔진 — 씬 그래프, 카메라, 렌더러, 매니저, 도구, MCP 프로세서

### 19.1 Camera (`_wt`) — 09_camera.js (476줄)

2D 뷰포트 관리 클래스. EventEmitter(`wl`)를 상속하여 `"change"`, `"zoom"` 이벤트를 발행한다.

**프로퍼티**:
```
left: number = 0          // 월드 좌표 좌측 경계
top: number = 0           // 월드 좌표 상단 경계
screenWidth: number = 0   // 스크린 픽셀 너비
screenHeight: number = 0  // 스크린 픽셀 높이
zoom: number = 1          // 줌 레벨 (0.02 ~ 256)
pixelPadding: [top, right, bottom, left] = [0,0,0,0]  // UI 패널 패딩
dirty: boolean = true     // worldTransform 무효화 플래그
_bounds: ls              // 월드 좌표 바운딩 박스
_worldTransform: Qt      // 2D 아핀 변환 매트릭스
```

**핵심 메서드**:

| 메서드 | 설명 |
|---|---|
| `refresh()` | dirty시 bounds와 worldTransform 재계산: `[zoom, 0, 0, zoom, -left*zoom, -top*zoom]` |
| `toScreen(x, y)` | 월드→스크린 좌표 변환: `(x - left) * zoom` |
| `toWorld(x, y)` | 스크린→월드 좌표 변환: `left + x / zoom` |
| `setCenter(x, y)` | 뷰포트 중심 이동 → `dirty=true` → `emit("change")` |
| `setZoom(val, keepCenter)` | 줌 설정 (0.02~256 클램프) → `emit("change")` + `emit("zoom")` |
| `zoomTowardsPoint(x, y, zoom)` | 특정 월드 좌표를 기준으로 줌 (마우스 휠 줌용) |
| `translate(dx, dy)` | 패닝 (setCenter 래퍼) |
| `zoomToBounds(bounds, padding)` | 지정 영역에 맞춰 줌/센터 조정 (Fit to View) |
| `ensureVisible(rect, margin)` | 노드가 뷰포트 안에 보이도록 패닝/줌 |
| `overlapsBounds(bounds)` | 뷰포트와 바운딩 박스 겹침 여부 (렌더링 컬링용) |

**SnapManager (`Awt`)** — 09_camera.js 동일 파일 (137~284줄):
스냅 가이드 시스템. 드래그 시 주변 노드 경계에 자석처럼 정렬.

```
핵심 로직:
1. snapBounds(bounds, selectedNodes, ...) → [deltaX, deltaY]
2. 부모/형제 노드의 snapPoints와 비교
3. 5px/zoom 이내 → 최적 delta 기록
4. Skia Paint로 스냅 라인 + 크로스 마커 렌더링
```

**AssetManager (`Mwt`)** — 09_camera.js (292~377줄):
이미지 에셋 로딩/캐싱. HTTP URL은 fetch(), 로컬 파일은 IPC `read-file` 요청. `Ue.MakeImageFromEncoded()`로 Skia 이미지 디코딩.

**ConnectionManager (`Pwt`)** — 09_camera.js (378~415줄):
노드 간 연결선 관리 (프로토타이핑용 인터랙션 링크).

**GuidesManager (`Iwt`)** — 09_camera.js (416~476줄):
가이드/룰러 관리. `guidesGraph`에 위임하는 파사드 패턴.

### 19.2 HandTool (`r_t`) — 11_hand-tool.js (49줄 핵심)

캔버스 패닝 전용 도구. 간결한 상태 머신.

```javascript
class r_t {
  canvasDragging = false
  canvasDragStartX = 0
  canvasDragStartY = 0

  handlePointerDown(e, manager):
    canvasDragging = true
    canvasDragStart = mouse.canvas 좌표
    cursor = "grabbing"

  handlePointerMove(e, manager):
    if dragging:
      delta = currentMouse - dragStart
      camera.translate(-dx/zoom, -dy/zoom)  // ← 핵심: 스크린 delta → 월드 delta 변환
      dragStart = currentMouse               // 누적 이동

  handlePointerUp(e, manager):
    canvasDragging = false
    Space 미누르고 + hand 도구 아니면 → exit()

  activate(manager): cursor="grab", pixiManager.disableInteractions()
  exit(manager): canvasDragging=false, pixiManager.enableInteractions(), cursor="default"
}
```

**패닝 좌표 변환 공식**: `camera.translate(-deltaScreen / zoom)` — 스크린 상의 드래그 거리를 줌 레벨로 나누어 월드 좌표 이동량으로 변환.

### 19.3 StateManager (`y_t`) — 12_state-manager.js (82줄)

이벤트 라우팅의 중앙 디스패처. 상태 패턴(State Pattern) 구현.

```
구조:
  y_t (StateManager)
   ├── state: 현재 활성 상태 객체 (tl=Idle, tq=TextEdit, xV=TextTool, eQ=기타)
   ├── handState: r_t (HandTool) — 항상 존재, 우선순위 가장 높음
   └── manager: x_t (SceneManager)

이벤트 라우팅 우선순위:
  1. activeTool === "hand" → handState 처리
  2. handState.canvasDragging → handState 처리 (진행 중인 패닝)
  3. Space + button===0 → handState (임시 핸드 도구)
  4. button === 1 (중간 버튼) → handState
  5. 그 외 → state.onPointerDown/Move/Up() (현재 도구 상태)
```

**상태 전환**:
```
transitionTo(newState):
  currentState.onExit()
  state = newState
  newState.onEnter()
  requestFrame()

onToolChange(oldTool, newTool):
  "hand" 활성화 → handState.activate()
  "hand" 비활성화 → handState.exit()
  state.onToolChange() 호출
```

**TextEditorManager (`b_t`)** — 같은 파일 (83~222줄):
Quill 기반 텍스트 편집 시작/종료 관리. `startTextEditing()` → `tq` 상태로 전환. 텍스트 노드 생성 시 배경색 대비를 `skiaRenderer.readPixel()`로 감지하여 텍스트 색상 자동 결정.

### 19.4 SelectionManager (`w_t`) — 13_selection-manager.js (422줄)

노드 선택/조작 시스템. 클립보드, 정렬, 회전, 복제 등 포함.

**프로퍼티**:
```
selectedNodes: Set<Node>           // 현재 선택된 노드 집합
hoveredNode: Node | null           // 마우스 오버된 노드
clipboardSourceId: string          // 클립보드 소스 추적 (UUID)
lastClickTime / lastClickTargetId  // 더블클릭 감지
doubleClickThreshold: 300ms
dragStartNodeParents: Map          // 드래그 시작 시 부모 노드 기록
```

**핵심 메서드**:

| 메서드 | 설명 |
|---|---|
| `selectNode(node, toggle, exclusive)` | 단일 선택, 토글(Shift), 배타적 선택 |
| `clearSelection()` | 전체 해제 → `guidesManager.clear()` |
| `setSelection(set)` | diff 기반 선택 업데이트 |
| `removeSelectedNodes()` | 선택 노드 삭제 (트랜잭션 기반, undo 가능) |
| `handleCopy(e)` | `application/x-ha` 포맷으로 직렬화 + Cursor IDE 연동 (`application/x-lexical-editor`) |
| `handlePaste(e)` | x-ha / HTML / SVG / 텍스트 / 이미지 파일 다중 포맷 지원 |
| `alignSelectedNodes(type)` | left/center/right/top/middle/bottom 정렬 |
| `rotateSelectedNodes(...)` | 피벗 기준 회전 (삼각함수 변환) |
| `findNodeAtPosition(x, y)` | 히트 테스트 — 역순 순회로 최상위 노드 찾기 |
| `findFrameForPosition(x, y)` | 드래그 드롭 대상 프레임 탐색 |
| `duplicateSelectedNodes()` | 복제 → 빈 공간 탐색 → 배치 |

**클립보드 포맷 (Cursor IDE 연동)**:
Cursor IDE에서 복사 시 `application/x-lexical-editor` 포맷으로 노드 ID + 파일 경로를 전달하여 Cursor의 AI 에이전트가 Pencil MCP 도구를 사용할 수 있도록 함.

### 19.5 SceneManager (`x_t`) — 14_scene-manager.js (523줄)

**전체 에디터의 중앙 허브**. 모든 서브시스템을 조합하고 렌더 루프를 관리.

**생성자 의존성 주입**:
```javascript
constructor(containerBounds, colorScheme, pixiManager, ipc, config) {
  this.scenegraph = new Io(this);          // 씬 그래프
  this.camera = new _wt();                 // 카메라
  this.selectionManager = new w_t(this);   // 선택
  this.nodeManager = new Rwt(this);        // 노드 그리기/리사이즈
  this.textEditorManager = new b_t(this);  // 텍스트 편집
  this.guidesManager = new Iwt(this);      // 가이드
  this.connectionManager = new Pwt(this);  // 연결선
  this.fileManager = new lXe(this);        // 파일 I/O
  this.snapManager = new Awt(this);        // 스냅
  this.undoManager = new xyt(this);        // Undo/Redo
  this.variableManager = new LYe(this);    // 변수/테마
  this.stateManager = new y_t(this);       // 상태 머신
  this.assetManager = new Mwt(this);       // 에셋
}
```

**렌더 루프 (`tick`)**:
```
tick():
  deltaTime = clamp(0, (now - lastTime) / 1000, 0.1)  // 최대 100ms
  beforeUpdate()                  // 레이아웃 애니메이션 (visual offset lerp)
  pixiManager.update(time)        // PixiJS 렌더 (선택 UI, 가이드 오버레이)
  afterUpdate()                   // skiaRenderer.render() (Skia 콘텐츠 렌더)
  flushDebouncedEvents()          // 대기 이벤트 발행
  framesRequested > 0 ? rAF(tick) : stop
```

**프레임 요청 전략**:
```javascript
requestFrame():
  if (framesRequested === 0) rAF(tick)  // 첫 프레임만 rAF 등록
  framesRequested = 3                    // 항상 3프레임 요청 (잔여 업데이트 보장)
```

**이벤트 리스너**:
```
camera.on("change") → guidesGraph.clear() + debouncedMoveEnd() + requestFrame()
eventEmitter.on("selectionChange") → requestFrame()
scenegraph.on("nodePropertyChange") → 선택 노드면 requestFrame()
config.on("change") → requestFrame()
```

**debouncedMoveEnd (200ms)**:
패닝/줌 종료 후 200ms 디바운스 → 줌 레벨 변경 시 `invalidateContent()`, 가이드 재그리기.

**AI 모델 목록**:
```javascript
// Electron 환경
{ label: "Sonnet 4.5", id: "claude-4.5-sonnet" }
{ label: "Haiku 4.5", id: "claude-4.5-haiku" }
{ label: "Opus 4.5", id: "claude-4.5-opus" }   // 기본 모델

// Cursor IDE 환경
{ label: "Composer", id: "cursor-composer" }     // 기본 모델
```

### 19.6 SkiaRenderer (`M_t`) — 15_skia-renderer.js (6,517줄)

Skia CanvasKit 기반 콘텐츠 렌더러. 파일 중 가장 큰 엔진 컴포넌트.

**프로퍼티**:
```
surface: CanvasKit.Surface        // 메인 GPU 서피스
surfaceCanvas: CanvasKit.Canvas   // 메인 캔버스
contentSurface: CanvasKit.Surface // 오프스크린 콘텐츠 캐시 서피스
contentCanvas: CanvasKit.Canvas   // 콘텐츠 캔버스
contentNeedsRedraw: boolean       // 콘텐츠 무효화 플래그
contentRenderedAtZoom: number     // 캐시 렌더 시점의 줌 레벨
contentRenderedBounds: Bounds     // 캐시 렌더 영역
contentRenderPadding: 512px       // 뷰포트 외 추가 렌더 여유 (스크롤 예측)
fontManager: d_t                  // 폰트 매니저
flashes: []                       // 노드 하이라이트 애니메이션
generatingEffects: []             // AI 이미지 생성 중 효과
```

**Skia GLSL 셰이더 3종**:

1. **colorContrastOverlay** (RuntimeEffect.MakeForBlender):
   ```glsl
   // 배경 밝기에 따라 검정/흰색 오버레이 자동 선택
   half luminance = getLuminance(toLinearSrgb(dst.rgb));
   half3 outputColor = luminance > 0.1791287847 ?
     mix(half3(0), dst.rgb, 0.93) :   // 어두운 오버레이
     mix(half3(1), dst.rgb, 0.85);    // 밝은 오버레이
   ```

2. **checkerBoardEffect** (RuntimeEffect.Make):
   ```glsl
   // 투명도 체커보드 패턴
   uniform float2 scale;
   uniform half4 color1, color2;
   float2 cell = floor(coord / scale);
   float checker = mod(cell.x + cell.y, 2.0);
   return checker < 0.5 ? color1 : color2;
   ```

3. **hatchEffect** (RuntimeEffect.Make):
   ```glsl
   // 해치 패턴 (비활성/잠금 노드 표시)
   uniform float ratio;
   uniform half4 color1, color2;
   float bump = fract(coord.x) * 2.0 - 1.0;
   float pixel = fwidth(coord.x * 2.0);
   return mix(color1, color2, smoothbump(ratio - 0.5*pixel, ratio + 0.5*pixel, bump));
   ```

**그래디언트 렌더링** (14_scene-manager.js 하단 312~517줄):
- `LinearGradient`, `RadialGradient`, `AngularGradient` 3종 지원
- 메쉬 그래디언트: 쌍삼차(Bicubic) 보간으로 정점 메쉬 생성 → `MakeVertices(TrianglesStrip, ...)`

### 19.7 Scenegraph (`Io`) — 07_scenegraph.js (2,842줄)

노드 트리 데이터 구조. EventEmitter 상속.

**프로퍼티**:
```
viewportNode: z_ (루트 그룹 노드)
nodeByLocalID: Map<string, Node>   // ID → 노드 빠른 검색
nodes: Set<Node>                   // 전체 노드 집합
documentPath: string | null        // 현재 파일 경로
needsLayoutUpdate: boolean         // 레이아웃 재계산 필요 플래그
```

**노드 생성 팩토리**:
```javascript
static createNode(id, type, properties):
  "text"      → Ux
  "icon_font" → _Xe
  "group"     → vXe
  "frame"     → jx
  "note" | "prompt" | "context" → oI
  "path" | "rectangle" | "ellipse" | "line" | "polygon" → Kke
```

**트랜잭션 시스템 (beginUpdate/commitBlock/rollbackBlock)**:
```
beginUpdate() → UpdateBlock 생성
  block.update(node, props) → 프로퍼티 변경 기록
  block.addNode(node, parent) → 노드 삽입 기록
  block.deleteNode(node) → 노드 삭제 기록
commitBlock(block, { undo: true }) → 변경 적용 + undo 스택 push
rollbackBlock(block) → 모든 변경 역순 실행
```

**Component Instance 시스템**:
- `unsafeInsertNode()`: 노드 삽입 시 프로토타입 인스턴스 자동 동기화
- `unsafeRemoveNode()`: 삭제 시 인스턴스 정리
- `unsafeChangeParent()`: 부모 변경 + 인스턴스 트리 동기화

### 19.8 UndoManager (`xyt`) — 08_undo-manager.js (9,693줄)

**핵심 Undo/Redo** (1~40줄): 매우 간결한 구현.
```javascript
class xyt extends wl {
  undoStack: Operation[][] = []    // Undo 스택 (연산 배열의 배열)
  redoStack: Operation[][] = []    // Redo 스택

  pushUndo(operations):
    undoStack.push(operations)
    redoStack = []                  // Redo 초기화
    emit("changed")

  applyFromStack(source, target):
    operations = source.pop()
    inverseOps = []
    for (op of operations.reverse()):  // 역순 실행
      op.perform(manager, inverseOps)
    target.push(inverseOps)            // 역연산을 반대 스택에 push
}
```

나머지 9,600줄은 **deep-equal 비교 라이브러리** + **레이아웃 엔진** (Yoga/Flexbox 기반 자동 레이아웃) 코드.

### 19.9 NodeManager (`Rwt`) — 10_node-manager.js (3,326줄)

노드 드로잉/리사이즈/드래그 컨트롤러.

**드로잉 플로우**:
```
startDrawing(point, toolType):
  drawStart = point
  clearSelection()
  guidesGraph.startDrawingGuide(tool, x, y)

updateDrawing(point):
  didDrag = true
  guidesGraph.updateDrawingGuide(x, y)

finishDrawing(block, point):
  rect = calculateRect(start, end)
  node = createAndInsertNode(block, type, rect)
  selectNode(node)
```

**도형 생성**:
```
"rectangle" → fills: [{ type: Color, color: "#CCCCCC" }]
"ellipse"   → fills: [{ type: Color, color: "#CCCCCC" }]
"frame"     → fills: [{ type: Color, color: "#FFFFFF" }], clip: true, name: "Frame N"
```

**리사이즈**: 시작점 기록 → 델타 계산 → 비율 유지 옵션 → 노드 프로퍼티 업데이트
**드래그**: `dragStartNodePositions` 맵으로 원본 위치 저장 → 스냅 가이드 → 부모 프레임 탐색

### 19.10 MCP Processor (`x2t`) — 16_mcp-processor.js (554줄)

AI 도구(Claude, Codex 등)의 `batch-design` 명령을 실행하는 프로세서.

**7가지 연산 (callee)**:

| 연산 | 핸들러 | 설명 |
|---|---|---|
| `I` (Insert) | `handleInsert()` | 노드 삽입 → 자동 ID 생성 → 바인딩 등록 |
| `C` (Copy) | `handleCopy()` | 노드 복제 → 빈 공간 배치 (`positionDirection`, `positionPadding`) |
| `R` (Replace) | `handleReplace()` | 노드 교체 (인스턴스 슬롯 오버라이드용) |
| `U` (Update) | `handleUpdate()` | 프로퍼티 업데이트 |
| `D` (Delete) | `handleDelete()` | 노드 삭제 (인스턴스 하위 삭제 방지 검증) |
| `M` (Move) | `handleMove()` | 노드 이동 (부모 변경/순서 변경) |
| `G` (Generate) | `handleGenerateImage()` | AI 이미지 생성 또는 Unsplash 스톡 이미지 |

**연산 파싱 (`_2t`)**:
JavaScript AST 파서(`m2t` = acorn)로 연산 스크립트를 파싱:
```javascript
// 입력 (MCP 도구에서 전달):
card=I("parent", { type: "frame", width: 200 })
U(card+"/label", { content: "Title" })

// 파싱 결과:
[
  { callee: "I", variable: "card", arguments: ["parent", { type: "frame", width: 200 }] },
  { callee: "U", variable: null, arguments: ["#card/label", { content: "Title" }] }
]
```

**바인딩 시스템**: `#변수명` 형식으로 이전 연산의 결과 노드 ID 참조. 바인딩 맵은 `"document"`, `"root"` 기본 포함.

**트랜잭션**: `beginUpdate()` → 전체 연산 실행 → 실패 시 `rollbackBlock()`, 성공 시 `commitBlock({ undo: true })`.

**이미지 생성 (`handleGenerateImage`)**:
```
type="ai"    → POST "generate-image" API → save-generated-image IPC → 노드 fill 적용
type="stock" → POST "get-stock-image" API → Unsplash attribution 메타데이터 포함
```

**에디터 상태 리포트 (`S2t`)**:
MCP `get_editor_state` 호출 시 현재 에디터 상태를 마크다운으로 반환:
- 선택된 노드 ID/타입
- 문서 최상위 노드 목록 (뷰포트 내/외 구분)
- 재사용 가능 컴포넌트 목록
- 현재 파일 경로

### 19.11 EditorCore (`A2t`) — 17_editor-core.js (2,285줄)

에디터 초기화 및 IPC 핸들러 등록의 엔트리포인트.

**초기화 시퀀스 (`setup`)**:
```
1. SceneManager(x_t) 생성 → 전체 서브시스템 초기화
2. CanvasKit WASM 로딩 (await sGe(config))
3. SkiaRenderer(M_t) 생성 → SceneManager에 연결
4. 뷰포트 리사이즈 + 기본 도구 "move" 설정
5. Inter 폰트 로딩 + 대기
6. 첫 프레임 요청
7. IPC 핸들러 등록 → MCP 프로세서 연결
8. _initialized = true
```

**등록 IPC 핸들러 목록**:

| IPC 채널 | 대응 MCP 도구 | 처리 로직 |
|---|---|---|
| `batch-design` | `batch_design` | `x2t.process()` → 트랜잭션 실행 |
| `get-style-guide-tags` | `get_style_guide_tags` | API 호출 → 태그 목록 |
| `get-style-guide` | `get_style_guide` | API 호출 → 스타일 가이드 |
| `search-design-nodes` | `batch_get` | 패턴 매칭/ID 조회 → 노드 직렬화 |
| `snapshot-layout` | `snapshot_layout` | 레이아웃 사각형 재귀 수집 |
| `get-screenshot` | `get_screenshot` | Skia 오프스크린 렌더 → PNG 데이터 |
| `get-variables` | `get_variables` | 변수/테마 직렬화 |
| `set-variables` | `set_variables` | 변수/테마 업데이트 (트랜잭션) |
| `find-empty-space` | `find_empty_space_on_canvas` | 노드 간 빈 공간 탐색 |
| `search-properties` | `search_all_unique_properties` | 프로퍼티 고유값 검색 |
| `replace-properties` | `replace_all_matching_properties` | 프로퍼티 일괄 치환 |

**노드 검색 (`search-design-nodes`) 구현**:
```javascript
// 패턴 매칭 (재귀)
N(node, depth):
  if (type && node.type !== type) skip
  if (name && !RegExp(name, "i").test(node.name)) skip
  if (reusable !== undefined && node.reusable !== reusable) skip
  → 직렬화하여 결과에 추가
  → depth > 0이면 자식 재귀

// ID 조회
for (id of nodeIds):
  node = scenegraph.getNodeByPath(id)
  → 직렬화 (maxDepth 적용)
```

### 19.12 engine 파일 간 의존성 그래프

```
EditorCore (A2t) ─── 최상위 진입점
 │
 ├─→ SceneManager (x_t) ─── 중앙 허브
 │    │
 │    ├─→ Camera (_wt)
 │    │    └── worldTransform → SkiaRenderer, PixiManager
 │    │
 │    ├─→ Scenegraph (Io)
 │    │    ├── viewportNode → 전체 노드 트리
 │    │    ├── beginUpdate()/commitBlock() → UndoManager
 │    │    └── createNode() → 노드 팩토리
 │    │
 │    ├─→ StateManager (y_t)
 │    │    ├── handState (r_t) → Camera.translate()
 │    │    └── state → 현재 도구 상태 객체
 │    │
 │    ├─→ SelectionManager (w_t)
 │    │    ├── selectedNodes → GuidesManager
 │    │    ├── findNodeAtPosition() → 히트 테스트
 │    │    └── handleCopy/Paste() → FileManager
 │    │
 │    ├─→ NodeManager (Rwt)
 │    │    └── startDrawing/finishDrawing() → Scenegraph.createAndInsertNode()
 │    │
 │    ├─→ UndoManager (xyt)
 │    │    └── pushUndo() ←── commitBlock()
 │    │
 │    ├─→ SnapManager (Awt) → Camera.zoom (스케일 보정)
 │    ├─→ AssetManager (Mwt) → Skia MakeImageFromEncoded
 │    ├─→ ConnectionManager (Pwt) → GuidesManager.drawConnections()
 │    └─→ GuidesManager (Iwt) → GuidesGraph (PixiJS 오버레이)
 │
 ├─→ SkiaRenderer (M_t)
 │    ├── render() → Camera.worldTransform
 │    ├── contentSurface → 오프스크린 캐시
 │    ├── fontManager → 폰트 로딩/매칭
 │    └── GLSL 셰이더 3종
 │
 └─→ MCP Processor (x2t)
      ├── process() → Scenegraph 트랜잭션
      ├── _2t() → acorn AST 파서 (연산 스크립트)
      └── handleGenerateImage() → 외부 API 호출

---

## 20. core 디렉토리 상세 분석

core 디렉토리는 4개 파일, 총 44,187줄로 구성되며 Pencil의 노드 시스템, 파일 관리, 도형 타입, 확장 기능의 핵심을 담당한다.

| 파일 | 줄 수 | 원본 라인 범위 | 핵심 역할 |
|------|-------|---------------|----------|
| 03_node-system-schema.js | 7,244 | 95,690-102,933 | PixiJS 렌더링 시스템 + 노드 스키마/열거형 |
| 04_file-manager.js | 3,379 | 102,934-106,312 | .pen 파일 열기/저장/직렬화 + 노드 삽입/교체 |
| 05_node-types.js | 30,962 | 106,313-137,274 | 아이콘 폰트, CSS 파서, SVG 파서, CSSO 최적화기 |
| 06_node-extensions.js | 2,602 | 137,275-139,876 | 도형 노드, Sticky 노드, 텍스트 노드, 프로퍼티 시스템 |

### 20.1 03_node-system-schema.js (7,244줄)

이 파일은 크게 두 영역으로 나뉜다:

**A. PixiJS 렌더링 인프라 (라인 1~2200)**
- WebGL/WebGPU 시스템 클래스들이 PixiJS 확장 패턴으로 등록됨
- GC, Texture, View, Encoder, Buffer, BindGroup 등 저수준 렌더링 시스템

주요 클래스:
| 클래스 | extension.name | 역할 |
|--------|---------------|------|
| `NK` (Lxe) | renderableGC | Renderable 가비지 컬렉터 (60초 미사용 제거) |
| `FK` (Bxe) | textureGC | 텍스처 GC (3600프레임 미사용 시 언로드) |
| `DK` (zxe) | view | 캔버스/뷰포트 관리 (기본 800x600) |
| `UK` | encoder | WebGPU 커맨드 인코더/렌더패스 관리 |
| `jK` | buffer | GPU 버퍼 생성/업데이트 |
| `BK` | bindGroup | WebGPU 바인드 그룹 캐싱 |
| `LF` | device | WebGPU 어댑터/디바이스 초기화 |
| `GK` | stencil | 스텐실 버퍼 상태 관리 |

**B. 앱 고유 노드 스키마 (라인 2200~7244)**

핵심 열거형 (Enums):
```javascript
// 채우기 타입 (Rt)
Rt = { Color: 1, Image: 2, LinearGradient: 3, RadialGradient: 4,
       AngularGradient: 5, MeshGradient: 6 }

// 이미지 사이즈 모드 (Ea)
Ea = { Stretch: 1, Fill: 2, Fit: 3 }

// 레이아웃 방향 (fo)
fo = { Horizontal: 0, Vertical: 1 }

// 레이아웃 모드 (ii)
ii = { None: 0, Horizontal: 1, Vertical: 2 }

// 사이징 동작 (Zt)
Zt = { Fixed: 0, FitContent: 2, FillContainer: 3 }

// 콘텐츠 정렬 (hi)
hi = { Start: 0, Center: 1, SpaceBetween: 2, SpaceAround: 3, End: 4 }

// 아이템 정렬 (fr)
fr = { Start: 0, Center: 1, End: 2 }
```

핵심 클래스:
| 클래스 | 역할 |
|--------|------|
| `C2e` | **LayoutInfo** — sizingBehavior, direction, childSpacing, padding, justifyContent, alignItems |
| `CH()` | Fit-content 레이아웃 패스 (자식→부모 크기 전파) |
| `EH()` | Fill-container 레이아웃 패스 (부모→자식 크기 분배) |
| `E2e()` | 포지셔닝 패스 (justifyContent/alignItems로 자식 배치) |
| `s_e` | Graphics 렌더 파이프 (batched/non-batched 분기) |
| `k_e` | Mesh 렌더 파이프 (UV 매핑, 텍스처 바인딩) |
| `i2e` | BitmapText 렌더 파이프 (SDF/MSDF 알파 계산) |
| `s2e` | HTMLText 렌더 파이프 |
| `m2e` | CanvasTextMetrics (텍스트 측정) |
| `t2e` | SDF 셰이더 (MSDF + Gamma 보정 coverage 알파) |

**MSDF 텍스트 렌더링 셰이더:**
```glsl
// SDF 알파 계산 핵심
float median = r + g + b - min(r, min(g, b)) - max(r, max(g, b));
median = min(median, msdfColor.a);  // SDF 폴백
float screenPxDistance = distance * (median - 0.5);
float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
// Gamma 보정
float luma = dot(shapeColor.rgb, vec3(0.299, 0.587, 0.114));
float gamma = mix(1.0, 1.0 / 2.2, luma);
float coverage = pow(shapeColor.a * alpha, gamma);
```

### 20.2 04_file-manager.js (3,379줄)

`.pen` 파일의 열기/저장/직렬화를 담당하는 `lXe` (FileManager) 클래스.

**주요 클래스:**
| 클래스 | 역할 |
|--------|------|
| `lXe` | **FileManager** — 파일 열기/저장/노드 삽입/교체/이동 |
| `W2e` | **StrokePath** — 스트로크 경로 계산 (dirty tracking) |
| `z_` | **BaseNode** — 모든 노드의 기본 클래스 (id, type, properties, layout, transform) |
| `jx` | **FrameNode** — frame 타입 노드 (z_ 상속) |
| `vXe` | **GroupNode** — group 타입 노드 (z_ 상속) |

**FileManager.open() 시퀀스:**
```
1. undoManager.clear() + variableManager.clear() + assetManager.clear()
2. scenegraph.beginUpdate() → 트랜잭션 시작
3. JSON.parse(decompressed_content) → 파일 파싱
4. 버전 체크 (HP 상수) → 마이그레이션 필요 시 HYe() 호출
5. scenegraph.destroy() → 기존 노드 트리 제거
6. themes 설정 → variableManager.unsafeSetThemes()
7. variables 설정 → variableManager.unsafeAddVariable()
8. children 삽입 → insertNodes() (재귀적 노드 생성)
   - ID 자동 생성 (Io.createUniqueID)
   - ref 노드 → 프로토타입 연결 (attachToPrototype)
   - 순환 참조 감지 (Set 기반 cycle detection)
9. invalidateLayout() → updateLayout()
10. connectionManager.redrawAllConnections()
11. 초기 뷰 설정 → camera.zoomToBounds() 또는 setZoom(1)
12. scenegraph.commitBlock(undo: false)
```

**FileManager.serialize() 출력 형식:**
```javascript
{
  version: HP,           // .pen 파일 포맷 버전
  children: [...],       // 직렬화된 노드 트리
  themes: { ... },       // 테마 맵
  variables: { ... }     // 변수 정의
}
```

**노드 삽입 (insertNodes) 핵심 로직:**
- `Bx()` → 노드 데이터에서 ID 맵 구축
- 순환 참조 감지: `Set<string>` 기반 DFS
- ref 노드 처리: 프로토타입 검색 → `attachToPrototype()` → 오버라이드 적용
- connection 노드: `connectionManager.addConnection()` 별도 처리
- 에러 시 전체 롤백: `for (g of h.values()) e.deleteNode(g, false)`

**노드 교체 (replaceNode):**
- 기존 노드 서브트리 수집 → 새 노드 데이터 맵 구축
- 프로토타입 재연결 → `ensurePrototypeReusability()`
- 교체 후 `skiaRenderer.addFlashForNode()` → 시각적 피드백

**노드 프로퍼티 업데이트 (updateNodeProperties):**
- descendants 처리: 슬래시 경로로 중첩 노드 접근 (e.g., `instanceId/childId`)
- `$B()` → 프로퍼티 적용 + 변수 바인딩 해석
- children 대체: `clearChildren()` → `insertNodes()` 재호출

### 20.3 05_node-types.js (30,962줄)

가장 큰 파일로, 대부분이 임베디드 라이브러리/데이터이다.

**파일 구성:**

| 라인 범위 (파일 내) | 내용 | 비율 |
|---------------------|------|------|
| 1~15 | **아이콘 폰트 데이터** (JSON 인라인, Lucide 아이콘셋) | 극소 (줄 수 적으나 바이트 큼) |
| 16~6,000 | **앱 코드**: 아이콘 폰트 노드 (`_Xe`), SVG 프로퍼티 파싱 함수들 | ~20% |
| 7,500~17,000 | **CSSTree 라이브러리**: CSS 구문 파서/토크나이저/렉서 | ~30% |
| 17,000~22,000 | **CSSO 라이브러리**: CSS 최적화기 (specificity 계산, shorthand 병합) | ~16% |
| 22,000~31,000 | **SVGO 라이브러리**: SVG 최적화기 + SAX XML 파서 | ~29% |

**앱 고유 코드 — 핵심 클래스:**

| 클래스 | 역할 |
|--------|------|
| `_Xe` (extends `z_`) | **IconFontNode** — 아이콘 폰트 노드 타입 |
| `Qx()` | 폰트 패밀리로 아이콘셋 검색 |
| `bR()` | 아이콘 이름으로 코드포인트 조회 |

**IconFontNode (`_Xe`) 상세:**
```javascript
class _Xe extends z_ {
  // 프로퍼티: dirtyParagraph, paragraph, _fillPath, fillPathDirty, _maskPath

  onPropertyChanged(t) {
    // fontFamily, iconFontFamily, iconFontName, iconFontWeight 변경 시
    // → dirtyParagraph + fillPathDirty 플래그 설정
  }

  getParagraph(renderer) {
    // Skia ParagraphBuilder → 단일 코드포인트 텍스트
    // fontVariations: [{ axis: "wght", value: weight }]
    // layout(9999999) → 무제한 너비
  }

  renderSkia(canvas, paint, renderer) {
    // fill path 생성 → transforms → renderFills
  }
}
```

**SVG 처리 파이프라인:**
```
SVG 문자열 → SVGO 최적화 (U1t) → SAX 파싱 (o1t) → 노드 트리 변환 (rI)
```
- `U1t()`: SVGO 멀티패스 최적화 (convertColors, convertTransform 등)
- CSS 프로퍼티 상속 테이블: `Wke` 객체 (fill, stroke, font-family 등 40+ 프로퍼티)
- `K1t()`: 텍스트 메트릭 계산 (Skia ParagraphBuilder)

**임베디드 라이브러리:**

1. **CSSTree** (줄 ~7,500~13,700)
   - CSS 구문 분석 (Definition Syntax)
   - 토크나이저 (`xot`): 오프셋+타입 인코딩 (24비트 쉬프트)
   - 렉서 (`Jse`): 프로퍼티/타입/at-rule 매칭
   - CSS Value 구문 정의 파서 (`qQe`, `Est`)

2. **CSSO** (줄 ~17,000~22,000)
   - CSS 최적화기 (Specificity 계산, shorthand 병합)
   - `Eht`: Specificity 리졸버 (a, b, c 가중치)
   - `Vht`: Shorthand 축약 (margin/padding/border)
   - :where(), :is(), :has() 등 의사 클래스 specificity 처리

3. **SVGO** (줄 ~22,000~31,000)
   - SAX 기반 XML 파서 (`r1t`)
   - `ZZ` (SvgoParserError): 에러 메시지 + 소스 위치 표시
   - SVG → 내부 노드 타입 변환 (rect, ellipse, line, path 등)

### 20.4 06_node-extensions.js (2,602줄)

도형 노드, Sticky 노드, 텍스트 노드, 트랜잭션 시스템의 확장.

**주요 클래스:**

| 클래스 | 줄 | 역할 |
|--------|-----|------|
| `Kke` (extends `z_`) | 489 | **ShapeNode** — rectangle/ellipse/polygon/path 도형 |
| `oI` (extends `z_`) | 1180 | **StickyNode** — Note/Context/Prompt 스티커 |
| `Ux` (extends `z_`) | 1543 | **TextNode** — 텍스트 노드 (Skia Paragraph) |
| `JZ` | 817 | **ViewNode** — Skia 기반 렌더 뷰 노드 (레이아웃 시스템) |
| `kz` (extends `JZ`) | 1004 | **TextViewNode** — 텍스트 뷰 (Paragraph 관리) |
| `eyt` | 1902 | **Transaction** — 노드 트리 변경 트랜잭션 |
| `tyt` | 2037 | **NodeProperties** — 반응형 프로퍼티 시스템 |

**ShapeNode (`Kke`) 상세:**
```javascript
class Kke extends z_ {
  // 프로퍼티: _fillPath, fillPathDirty, strokePath (W2e), _maskPath

  onPropertyChanged(t) {
    // cornerRadius, pathData, polygonCount, ellipseInnerRadius,
    // ellipseStartAngle, ellipseSweep, width, height 변경 시
    // → fillPathDirty 설정 + strokePath 통지
  }

  getFillPath() {
    // type별 분기:
    // - rectangle → CG(PathBuilder, 0, 0, w, h, cornerRadius)
    // - ellipse → 타원 경로
    // - polygon → 다각형 + 라운드 코너
    // - path → pathData에서 직접 생성
  }

  getVisualLocalBounds() {
    // fillPath.bounds + strokePath 확장 (alignment에 따라)
    // + effects 확장 (그림자 등)
  }
}
```

**StickyNode (`oI`) 상세:**
```javascript
// 3가지 타입: note, context, prompt
const J1t = {
  note:    { headerBackground: "#FFF1D6", background: "#FFF7E5", outlineColor: "#8B6311" },
  context: { headerBackground: "#FFFFFF", background: "#F0F0F0", outlineColor: "#767676" },
  prompt:  { headerBackground: "#C3E8FF", background: "#E8F6FF", outlineColor: "#009DFF" }
};

// prompt 타입은 AI 모델 선택 가능
// manager.getAvailableModels() → { models, defaultModel }
// 최소 너비: 250px
```

**TextNode (`Ux`) 상세:**
```javascript
class Ux extends z_ {
  // textGrowth 모드: "auto" | "fixed-width" | "fixed-width-height"

  getParagraph(renderer) {
    // Skia ParagraphBuilder
    // fontVariations: [{ axis: "wght", value: weight }]
    // auto: layout(999999999) → layout(maxIntrinsicWidth)
    // fixed-width: layout(Math.ceil(width))
    // unresolvedCodepoints → loadFallbackFonts
  }

  onPropertyChanged(t) {
    // fontFamily, textAlign, fontWeight, textContent, textGrowth,
    // lineHeight, letterSpacing, fontSize → dirtyParagraph
    // width (fixed-width 모드) → dirtyParagraphLayout
  }

  getTextAreaInfo(renderer) {
    // 텍스트 편집 UI를 위한 스타일 정보 반환
    // fontSize, lineHeight, fontWeight, fontFamily, textAlign 등
  }
}
```

**ViewNode (`JZ`) — Skia 뷰 시스템:**
```javascript
class JZ {
  // Flexbox 유사 레이아웃 시스템 (CSS Flexbox와 동일한 개념)
  // props: width, height, layout, childSpacing, padding, justifyContent, alignItems

  // 사이징: "fit" → FitContent, "fill" → FillContainer, number → Fixed
  // 방향: Horizontal, Vertical, None

  // 메서드:
  // - render(renderer, canvas)
  // - layoutCommitSize(direction, size)
  // - layoutCommitPosition(x, y)
  // - getRelativeBounds() / getNodeBounds()
}
```

**Transaction (`eyt`) — 트랜잭션 API:**
```javascript
class eyt {
  constructor(manager) {
    this.rollback = [];  // 롤백 연산 스택
  }

  update(node, data)                    // 프로퍼티 업데이트
  deleteNode(node, withChildren=true)   // 노드 삭제
  addNode(node, parent, index)          // 노드 추가
  changeParent(node, parent, index)     // 부모 변경
  clearChildren(node)                   // 자식 전체 제거
  restoreInstanceChildren(node)         // 인스턴스 자식 복원
  addVariable(name, type)               // 변수 추가
  setVariable(variable, values)         // 변수 값 설정
  deleteVariable(variable)              // 변수 삭제
  renameVariable(variable, name)        // 변수 이름 변경
  setThemes(themes)                     // 테마 설정
  snapshotProperties(node, props)       // 프로퍼티 스냅샷 (롤백용)
  snapshotParent(node)                  // 부모 스냅샷 (롤백용)
}
```

**NodeProperties (`tyt`) — 반응형 프로퍼티 시스템:**
```javascript
class tyt {
  // resolved: 변수/테마가 해석된 최종 값
  // resolvedValues: Map<string, any>

  // 프로퍼티 목록 (sI 배열, 52개):
  // name, context, theme, enabled, width, height, x, y, rotation,
  // flipX, flipY, clip, placeholder, fills, strokeFills, strokeWidth,
  // strokeAlignment, lineJoin, lineCap, opacity, textContent, textAlign,
  // textAlignVertical, textGrowth, fontSize, letterSpacing, lineHeight,
  // fontFamily, fontWeight, fontStyle, cornerRadius, iconFontName,
  // iconFontFamily, iconFontWeight, effects, pathData, fillRule,
  // polygonCount, ellipseInnerRadius, ellipseStartAngle, ellipseSweep,
  // layoutIncludeStroke, layoutMode, layoutChildSpacing, layoutPadding,
  // layoutJustifyContent, layoutAlignItems, verticalSizing,
  // horizontalSizing, modelName, metadata

  // 각 프로퍼티는 getter/setter + 변경 콜백
  // → 프로토타입 오버라이드 추적
  // → 인스턴스 동기화
  // → 테마 해석
}
```

**스트로크 정렬 열거형:**
```javascript
Rr = { Inside: 0, Center: 1, Outside: 2 }
Lh = { SendToBack: 0, BringToFront: 1, SendBackward: 2, BringForward: 3 }
```

### 20.5 BaseNode (`z_`) 상세 분석 (04_file-manager.js:2235)

모든 노드 타입의 기본 클래스:

```javascript
class z_ {
  // 식별
  localID: number       // 자동 증가 (yXe++)
  id: string            // 고유 ID (문서 내)
  type: string          // "frame", "rectangle", "text", "icon_font", "ref" 등

  // 상태
  _reusable: boolean    // 컴포넌트 여부
  properties: tyt       // 반응형 프로퍼티 시스템
  layout: C2e           // 레이아웃 정보

  // 프로토타입/인스턴스
  _prototype: { node, overriddenProperties, childrenOverridden }
  _instances: Set<z_>   // 이 노드를 참조하는 인스턴스들

  // 트리 구조
  parent: z_ | null
  children: z_[]
  root: boolean
  destroyed: boolean

  // 트랜스폼
  localMatrix: Qt (3x3)
  worldMatrix: Qt (3x3)

  // 바운딩 박스
  _localBounds: ls
  _worldBounds: ls
  _transformedLocalBounds: ls
  _visualLocalBounds: ls      // 이펙트 포함
  _visualWorldBounds: ls

  // 렌더링
  renderOnTop: boolean
  _visualOffset: [number, number]
  manager: SceneManager 참조
}
```

### 20.6 core 파일 간 의존성 그래프

```
03_node-system-schema.js
 ├── PixiJS 렌더링 시스템 (WebGL/WebGPU)
 ├── 레이아웃 엔진 (C2e, CH, EH, E2e)
 ├── 노드 열거형 (Rt, Ea, fo, ii, Zt, hi, fr, Rr, Lh)
 └── SDF/MSDF 셰이더
       │
04_file-manager.js ─────────────────────────────────────────
 ├── z_ (BaseNode) ← 03에서 정의된 C2e, tyt 사용
 ├── lXe (FileManager) ← Scenegraph(Io), Camera(_wt) 참조
 ├── W2e (StrokePath) ← Skia PathBuilder, Rr 열거형
 ├── 노드 삽입/교체/이동 로직
 └── 직렬화/역직렬화
       │
05_node-types.js ───────────────────────────────────────────
 ├── _Xe (IconFontNode) ← z_ 상속, Skia Paragraph
 ├── CSS/SVG 처리 파이프라인
 │    ├── CSSTree (파서/토크나이저)
 │    ├── CSSO (최적화)
 │    └── SVGO (SVG 최적화)
 └── 아이콘 폰트 데이터 (Lucide)
       │
06_node-extensions.js ──────────────────────────────────────
 ├── Kke (ShapeNode) ← z_ 상속, Skia PathBuilder
 ├── oI (StickyNode) ← z_ 상속, ViewNode 시스템
 ├── Ux (TextNode) ← z_ 상속, Skia Paragraph
 ├── JZ/kz (ViewNode) ← 독립 레이아웃 시스템
 ├── eyt (Transaction) ← Scenegraph 직접 접근
 └── tyt (NodeProperties) ← 52개 반응형 프로퍼티
```

### 20.7 핵심 발견사항

1. **노드 타입 계층**: `z_` (BaseNode) → `_Xe` (IconFont), `Kke` (Shape), `oI` (Sticky), `Ux` (Text), `jx` (Frame), `vXe` (Group)

2. **이중 레이아웃 시스템**:
   - **Scenegraph 레이아웃** (03의 C2e/CH/EH/E2e): 노드 트리 전체에 적용되는 Flexbox 유사 레이아웃
   - **ViewNode 레이아웃** (06의 JZ): Skia 렌더링 전용 독립 레이아웃 (Sticky 노드의 내부 UI)

3. **52개 노드 프로퍼티**: 위치, 크기, 스타일, 텍스트, 레이아웃, 이펙트 등 모든 디자인 속성이 반응형 시스템으로 관리됨. 각 프로퍼티 변경은 자동으로 프로토타입 오버라이드 추적 + 인스턴스 동기화를 트리거

4. **SVG Import 파이프라인**: SVGO 최적화 → SAX 파싱 → CSSTree로 스타일 해석 → 내부 노드 타입 변환. CSS 프로퍼티 상속 테이블(40+ 프로퍼티)로 정확한 스타일 계산

5. **트랜잭션 시스템**: `eyt`가 모든 변경사항의 롤백 연산을 스택으로 관리. UndoManager와 연동하여 원자적 변경 보장

6. **파일 포맷 마이그레이션**: `open()` 시 버전 체크 후 `HYe()` 함수로 자동 마이그레이션. 순환 참조 감지 내장

---

## 21. ui 디렉토리 상세 분석

ui 디렉토리는 2개 파일, 총 54,291줄로 구성되며 디자인 킷 데이터, UI 라이브러리, React 컴포넌트 전체를 포함한다.

| 파일 | 줄 수 | 원본 라인 범위 | 핵심 역할 |
|------|-------|---------------|----------|
| 18_ui-and-design-kits.js | 38,238 | 142,649-180,886 | 디자인 킷 JSON + Sonner + Radix Primitives + Tailwind Merge + UI 유틸리티 |
| 19_react-components.js | 16,053 | 180,887-196,939 | Fuse.js + react-virtuoso + 앱 React 컴포넌트 + 라우터 + 앱 초기화 |

### 21.1 18_ui-and-design-kits.js (38,238줄)

**파일 구성:**

| 라인 범위 (파일 내) | 내용 | 줄 수 |
|---------------------|------|-------|
| 1~194 | **Sonner 라이브러리** — Toast 상태 관리 (`W5t`) | ~194 |
| 195~960 | **Sonner Toaster 컴포넌트** — Toast UI 렌더링 | ~765 |
| 960~36,600 | **디자인 킷 JSON 데이터** — 6개 킷 인라인 | ~35,640 |
| 36,600~36,870 | **디자인 변수 JSON** — 테마/컬러/폰트/반경 정의 | ~270 |
| 36,870~37,150 | **Radix Primitives** — Slot/SlotClone/Slottable 패턴 | ~280 |
| 37,150~38,100 | **Tailwind Merge** — CSS 클래스 충돌 해결 라이브러리 | ~950 |
| 38,100~38,238 | **앱 UI 유틸리티 + Button 컴포넌트** | ~138 |

**A. Sonner (Toast 시스템)**

```javascript
class W5t {
  // Toast 상태 관리자
  subscribers: Function[]
  toasts: Toast[]
  dismissedToasts: Set

  create(options)    // Toast 생성 (id 자동/수동)
  dismiss(id?)       // Toast 닫기
  promise(promise, callbacks)  // Promise 기반 Toast (loading → success/error)
}

// 전역 싱글톤
const Dd = new W5t();
const Rl = Object.assign(K5t, {
  success, info, warning, error, custom, message,
  promise, dismiss, loading, getHistory, getToasts
});
```
- `Rl` (= `pm` in engine)이 앱 전체에서 토스트 알림에 사용됨

**B. 디자인 킷 (6개, 579개 reusable 컴포넌트)**

| 킷 이름 | 시작 라인 | 테마 |
|---------|----------|------|
| **halo** | 963 | Light/Dark 모드 |
| **lunaris** (1) | 5,767 | Light/Dark 모드 |
| **nitro** | 11,840 | Light/Dark 모드 |
| **shadcn** | 16,839 | Light/Dark 모드 |
| **lunaris** (2) | 22,516 | 변형 |
| **lunaris** (3) | 29,645 | 변형 |

킷에 포함된 주요 컴포넌트:
```
Button (Default/Destructive/Ghost/Outline/Secondary, Large 변형)
Input, Textarea, Input OTP, Combobox, Select
Checkbox, Radio, Switch, Toggle
Accordion, Tabs, Dropdown, Dialog, Tooltip
Card, Alert, Badge, Label, Progress, Pagination
Table, Data Table (Header/Footer/Row/Cell)
Sidebar, Breadcrumb, List, Search Box
Avatar, Icon Label
```

각 킷은 `.pen` 파일 포맷(version 2.6)의 인라인 JSON으로 저장되며, 변수 시스템(`$--background`, `$--primary`, `$--font-secondary` 등)과 Light/Dark 테마를 포함한다.

**디자인 변수 시스템 예시:**
```javascript
{
  "--background": { type: "color", value: [
    { value: "#FFFFFF" },                           // Light
    { value: "#09090B", theme: { Mode: "Dark" } }   // Dark
  ]},
  "--primary": { type: "color", value: [
    { value: "#18181B" },
    { value: "#FAFAFA", theme: { Mode: "Dark" } }
  ]},
  "--font-primary": { type: "string", value: "JetBrains Mono" },
  "--font-secondary": { type: "string", value: "Geist" },
  "--radius-m": { type: "number", value: 16 },
  "--radius-pill": { type: "number", value: 999 }
}
```

**C. Radix Primitives (Slot 패턴)**

```javascript
function gv(name) {
  // Slot 패턴: asChild prop으로 자식 엘리먼트에 props 전달
  // SlotClone: 자식의 props와 부모 props 병합
  // - on[A-Z] 핸들러: 자식 → 부모 순 실행
  // - style: 병합
  // - className: 공백 조인
}
```

**D. Tailwind Merge**

```javascript
const i4t = O3t(n4t);  // tw-merge 인스턴스 생성

function zt(...n) {     // 앱 전역 클래스 병합 함수
  return i4t(FCe(n));   // 충돌하는 Tailwind 클래스 해결
}
```
- `zt()` 함수가 앱 전체에서 `className` 병합에 사용됨
- Tailwind v4 지원 (color, font, text, spacing 등 모든 유틸리티)

**E. 앱 UI 유틸리티**

```javascript
function CQ() {
  // 기본 경로 결정
  // Electron → window.webappapi.getBasePath()
  // VS Code → localhost:3000 또는 VSCODE_WEBVIEW_BASE_URI
  // 브라우저 → "/" 또는 "./"
}

function Fx(type) {
  // 노드 타입 → 표시 이름 매핑
  // "frame" → "Frame", "text" → "Text", "prompt" → "Prompt" 등
}

function VCe({ multiple }) {
  // 파일 선택 다이얼로그 (이미지)
  // <input type="file" accept="image/*"> 프로그래매틱 실행
}

// Button 컴포넌트 (shadcn/ui 패턴)
function Pi({ className, variant, size, asChild, ...r }) {
  // variant: default | destructive | outline | secondary | ghost | link
  // size: default(h-9) | sm(h-6) | lg(h-10) | icon(size-9)
  // Tailwind 클래스 기반 스타일링
}
```

### 21.2 19_react-components.js (16,053줄)

**파일 구성:**

| 라인 범위 (파일 내) | 내용 | 줄 수 |
|---------------------|------|-------|
| 1~992 | **Fuse.js v7.1.0** — 퍼지 검색 라이브러리 | ~992 |
| 993~4,800 | **react-virtuoso** — 가상 스크롤 라이브러리 | ~3,800 |
| 4,800~14,800 | **앱 React 컴포넌트** — 에디터 UI 전체 | ~10,000 |
| 14,800~15,500 | **로그인/활성화 폼** — 이메일 + OTP 인증 | ~700 |
| 15,500~16,053 | **앱 초기화** — 라우터, PostHog, Sentry, ReactDOM.createRoot | ~553 |

**A. Fuse.js v7.1.0 (퍼지 검색)**

```javascript
class j4 {  // Fuse
  constructor(docs, options, index)
  search(query, { limit })
  add(doc) / remove(predicate) / removeAt(index)
}

// 검색 연산자 클래스들 (Wv 기반):
// OWt: exact (=)
// BWt: inverse-exact (!)
// jWt: prefix-exact (^)
// zWt: inverse-prefix-exact (!^)
// UWt: suffix-exact ($)
// GRe: fuzzy (기본)
// HRe: include (')
```
- 컴포넌트/레이어 검색 UI에 사용

**B. react-virtuoso (가상 스크롤)**

- Virtuoso (리스트), TableVirtuoso (테이블), GridVirtuoso (그리드) 컴포넌트
- 반응형 스트림 기반 상태 관리 (`Yt`, `Vr`, `No`, `sr`, `Qn` 유틸리티)
- ResizeObserver 기반 아이템 크기 측정
- React 18/19 호환 (`He.version.startsWith("18")` 분기)

**C. 앱 React 컴포넌트 (핵심)**

**프로퍼티 패널 컴포넌트들:**
```javascript
// 아이콘 폰트 선택기
// - Popover + Combobox 패턴
// - 폰트 패밀리 Select (MXt 배열)
// - Variable Weight 슬라이더 (100-700)

// 정렬 그리드 (IXt)
// 3x3 매트릭스: top-left ~ bottom-right
// justifyContent/alignItems 시각화
// spaceBetweenOrAround 변형

// 이미지 삽입
// 파일 드롭 → Rt.Image fill 생성
// URL 기반 또는 FileReader

// 컬러 피커, 스트로크 설정, 이펙트 설정 등
```

**에디터 메인 레이아웃:**
```javascript
// SceneManager Context
const CNe = R.createContext(undefined);
function Ms() {  // useSceneManager hook
  return R.useContext(CNe);
}

// 레이어 리스트 토글
function ENe({ onToggleLayerList, isFullscreen }) {
  // Tooltip + Button 조합
  // Electron Mac: 좌측 상단 위치 (트래픽 라이트 회피)
}

// 에디터 이벤트 핸들링 (IPC 연동)
// - color-theme-changed → 테마 전환
// - claude-status → AI 상태 업데이트
// - dirty-changed → 저장 필요 표시
// - ide-name-changed → IDE 이름 업데이트
// - toggle-theme → 다크/라이트 전환
// - did-sign-out → 로그아웃 처리
// - desktop-update-available/ready → 자동 업데이트
// - import-images → 이미지 가져오기
// - show-code-mcp-dialog → MCP 코드 다이얼로그
// - toggle-ui-visibility → UI 표시/숨김
// - .pen 파일 드래그 앤 드롭 → load-file
```

**D. 로그인/활성화 시스템**

```javascript
// 2단계 인증 플로우:
// 1. 이메일 입력 → "Send Code"
// 2. 6자리 OTP 입력 → "Activate"
//
// 재전송 타이머, 쿨다운 관리
// pencil.dev 링크: Privacy Policy, Terms of Use, EULA
```

**E. 앱 초기화 + 라우터**

```javascript
// 디자인 킷 매핑
const _8 = {
  "pencil-new.pen":             h3t,    // 빈 문서
  "pencil-welcome.pen":         m3t,    // 웰컴 (웹)
  "pencil-welcome-desktop.pen": g3t,    // 웰컴 (데스크톱)
  "pencil-shadcn.pen":          p3t,    // shadcn 킷
  "pencil-halo.pen":            u3t,    // halo 킷
  "pencil-lunaris.pen":         d3t,    // lunaris 킷
  "pencil-nitro.pen":           f3t,    // nitro 킷
};

// React Router 라우트
function bKt() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/editor/:fileName?" element={<EditorPage />} />
        <Route path="/generator"         element={<GeneratorPage />} />
        <Route path="/"                  element={<EditorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// 앱 래퍼
function vKt() {
  return (
    <PostHogProvider apiKey={...} options={{
      api_host: P$e,
      capture_exceptions: true,
      debug: e1e
    }}>
      <SentryErrorBoundary>
        <Router />
      </SentryErrorBoundary>
    </PostHogProvider>
  );
}

// Sentry 초기화
TBe({ dsn: I$e, release: T$e, sendDefaultPii: true, enabled: !e1e });

// React DOM 마운트
const root = OBe.createRoot(document.getElementById("root"), {
  onUncaughtError, onCaughtError, onRecoverableError
});
root.render(<App />);
```

**Generator 페이지 (`yKt`):**
- JSON/.pen 파일 열기 → 에디터 로드 → 수정 → Export
- Electron: `show-open-dialog` IPC로 파일 선택
- 웹: `<input type="file">` 또는 클립보드 붙여넣기
- 디자인 프롬프트 입력 → `export-design-files` IPC로 내보내기

### 21.3 파일 간 코드/라이브러리 비율

| 파일 | 전체 줄 | 라이브러리 줄 | 앱 코드 줄 | 앱 코드 비율 |
|------|---------|-------------|-----------|------------|
| 18_ui-and-design-kits.js | 38,238 | ~37,100 | ~1,138 | **3%** |
| 19_react-components.js | 16,053 | ~4,800 | ~11,253 | **70%** |
| **합계** | **54,291** | **~41,900** | **~12,391** | **23%** |

※ 18번 파일의 디자인 킷 JSON 데이터(~35,640줄)가 대부분을 차지

### 21.4 UI 아키텍처 정리

```
┌─────────────────────────────────────────────────┐
│                   vKt (App Root)                 │
│  PostHogProvider → SentryBoundary → Router       │
├─────────────────────────────────────────────────┤
│                  bKt (Router)                    │
│  /editor/:fileName? ─→ hY (EditorPage)          │
│  /generator          ─→ yKt (GeneratorPage)     │
│  /                   ─→ hY (EditorPage)          │
├─────────────────────────────────────────────────┤
│              EditorPage (hY)                     │
│  ┌─ CNe (SceneManagerContext.Provider) ──────┐   │
│  │                                           │   │
│  │  ┌── 툴바 (ENe) ─────────────────────┐   │   │
│  │  │  레이어 토글 + 도구 선택           │   │   │
│  │  └────────────────────────────────────┘   │   │
│  │                                           │   │
│  │  ┌── 캔버스 (PixiJS + Skia) ─────────┐   │   │
│  │  │  WebGL 렌더링 영역                 │   │   │
│  │  └────────────────────────────────────┘   │   │
│  │                                           │   │
│  │  ┌── 프로퍼티 패널 ──────────────────┐   │   │
│  │  │  컬러, 스트로크, 레이아웃, 텍스트  │   │   │
│  │  │  이펙트, 아이콘, 정렬 그리드       │   │   │
│  │  └────────────────────────────────────┘   │   │
│  │                                           │   │
│  │  ┌── 레이어 패널 ────────────────────┐   │   │
│  │  │  Virtuoso (가상 스크롤)            │   │   │
│  │  │  Fuse.js (퍼지 검색)               │   │   │
│  │  └────────────────────────────────────┘   │   │
│  │                                           │   │
│  │  ┌── Toast (Sonner) ─────────────────┐   │   │
│  │  │  전역 알림 시스템                  │   │   │
│  │  └────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│           IPC 이벤트 연동                        │
│  color-theme-changed, claude-status,             │
│  dirty-changed, desktop-update-*,                │
│  import-images, show-code-mcp-dialog,            │
│  toggle-ui-visibility, load-file                 │
└─────────────────────────────────────────────────┘
```

### 21.5 핵심 발견사항

1. **디자인 킷이 코드에 인라인 임베디드**: 6개 디자인 킷(halo, lunaris×3, nitro, shadcn)이 JSON 템플릿 리터럴로 직접 번들에 포함. 579개 reusable 컴포넌트와 Light/Dark 테마 변수 시스템이 함께 저장됨

2. **shadcn/ui 패턴 채택**: Button, Input 등 기본 컴포넌트가 shadcn/ui 스타일의 Tailwind + Radix 조합. `zt()` (tw-merge)로 클래스 충돌 해결

3. **3개 페이지 라우트**: Editor (메인), Generator (디자인 파일 편집/내보내기), 루트(에디터로 리다이렉트)

4. **이중 텔레메트리**: PostHog (제품 분석) + Sentry (에러 트래킹) 동시 사용. `e1e` 플래그로 개발 모드에서 비활성화

5. **멀티 플랫폼 경로 처리**: `CQ()` 함수가 Electron / VS Code Extension / 웹 브라우저 환경별로 base path를 다르게 결정

6. **React 18/19 호환**: react-virtuoso에서 `He.version.startsWith("18")` 분기로 React 버전별 다른 코드 경로 사용

7. **2단계 인증**: 이메일 → 6자리 OTP 코드 방식의 인증 시스템이 내장. pencil.dev 서비스 연동

8. **자동 업데이트 (Electron)**: `desktop-update-available` → 다운로드 알림 → `desktop-update-ready` → "Restart & Install" 버튼으로 업데이트 적용

---

## 22. boot 디렉토리 상세 분석

boot 디렉토리: 2개 파일, 136줄

### 22.1 01_vite-bootstrap.js (80줄, 원본 라인 1-80)

앱 번들의 **최초 실행 코드**. Vite 빌드 시스템 런타임과 Sentry 초기화를 담당.

#### Vite 청크 의존성 매퍼 (1-11줄)

```javascript
const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f || (m.f = [
    "./browserAll.js",     // 브라우저 메인 청크
    "./webworkerAll.js",   // 웹워커 청크
    "./browserAll2.js",    // 브라우저 보조 청크
    "./webworkerAll2.js",  // 웹워커 보조 청크
  ]),
) => i.map((i) => d[i]);
```

- Vite의 코드 스플리팅 런타임
- 4개 청크로 분리: 브라우저 메인/보조, 웹워커 메인/보조
- 인덱스 배열을 받아 파일명 배열로 매핑

#### ES2022 Private Field 폴리필 (12-45줄)

| 함수 | 역할 |
|------|------|
| `re(n, e, t)` | 클래스 인스턴스에 프로퍼티 정의 (enumerable) |
| `Tt(n, e, t)` | private field 읽기 |
| `Js(n, e, t)` | private member 등록 (WeakSet/WeakMap) |
| `Oo(n, e, t, i)` | private field 쓰기 |
| `Bi(n, e, t)` | private method 접근 |
| `Qw(n, e, t, i)` | private accessor (getter/setter) 프록시 |
| `yO(n, e, t)` | 접근 권한 검증 (실패 시 TypeError) |

- 모든 `#privateField` 구문이 이 헬퍼들로 트랜스파일됨
- 앱 전체에서 `re()`, `Tt()`, `Oo()` 등이 광범위하게 사용됨

#### Sentry 릴리스/디버그 ID (46-80줄)

```
SENTRY_RELEASE.id = "e691a6638e71facc47de61939e53b1b67a8db3e3"  // Git commit hash
_sentryDebugIds[stack] = "eff24da1-e218-46e1-9bbb-59a6acf5b60b"  // Debug UUID
```

- 전역 객체(window/global/globalThis/self)에 릴리스 정보 주입
- 소스맵 매핑용 debug ID 설정 — Sentry에서 스택 트레이스를 원본 코드에 매핑

### 22.2 20_app-entry.js (56줄, 원본 라인 196,940-196,995)

앱 번들의 **공개 API 엔트리 포인트**. 52개 named export를 단일 문자 별칭으로 노출.

```javascript
export {
  yNt as $, HGe as A, i2e as B, Ts as C, Wve as D, Kve as E,
  $qe as F, s_e as G, m2e as H, J9e as I, lc as J, t0 as K,
  xv as L, k_e as M, U_e as N, jNt as O, e0 as P, SN as Q,
  ibe as R, WNt as S, KM as T, sW as U, UQt as V, The as W,
  F9e as X, J6 as Y, KNt as Z, eFt as _, VGe as a, nd as b,
  Bv as c, Y_ as d, zo as e, zJ as f, rbe as g, kX as h,
  I_e as i, R_e as j, _2e as k, x2e as l, s2e as m, K_e as n,
  gwe as o, pwe as p, UJ as q, INt as r, J1 as s, pNt as t,
  Gb as u, $3 as v, ov as w, ANt as x, Fl as y, Gs as z,
};
```

- **52개 export**: `$`, `A`-`Z`, `_`, `a`-`z` (알파벳 전체 + 특수문자 2개)
- 내부 minified 이름 → 외부 단일 문자 별칭으로 매핑
- Vite의 tree-shaking 최적화 결과물
- 외부에서 이 모듈을 import할 때 사용하는 인터페이스 (예: `import { a as VGe } from './20_app-entry.js'`)

---

## 23. ipc 디렉토리 상세 분석

ipc 디렉토리: 1개 파일, 889줄

### 23.1 02_ipc-system.js (889줄, 원본 라인 80-968)

**IPC(Inter-Process Communication) 시스템** + **수학 유틸리티** + **Bounds 클래스** + **EventEmitter3 라이브러리**를 포함.

#### 23.1.1 IPCError 클래스 — `G6` (1-5줄)

```javascript
class G6 extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;      // 에러 코드: "METHOD_NOT_FOUND", "HANDLER_ERROR", "TIMEOUT", "DISPOSED"
    this.details = details; // 추가 에러 정보
    this.name = "IPCError";
  }
}
```

#### 23.1.2 IPCServer 클래스 — `S$e` (6-178줄)

핵심 IPC 통신 엔진. 3가지 메시지 타입을 처리하는 양방향 메시징 시스템.

**메시지 프로토콜:**

```
{
  id: string,           // "ext-{counter}-{timestamp}" 형식
  type: "notification" | "request" | "response",
  method: string,       // RPC 메서드 이름
  payload?: any,        // 데이터 페이로드
  error?: { code, message, details }  // response에서만
}
```

**내부 상태:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `requestHandlers` | Map\<string, Function\> | method → 핸들러 (1:1) |
| `notificationHandlers` | Map\<string, Function[]\> | method → 핸들러 배열 (1:N) |
| `pendingRequests` | Map\<string, {resolve, reject, timeout}\> | 대기 중인 요청 |
| `messageIdCounter` | number | 메시지 ID 시퀀스 |

**메시지 처리 흐름:**

```
수신 메시지 → handleMessage()
  ├─ "notification" → notificationHandlers[method].forEach(handler)
  ├─ "request"      → requestHandlers[method](payload) → sendResponse()
  └─ "response"     → pendingRequests[id].resolve/reject
```

**주요 메서드:**

| 메서드 | 설명 |
|--------|------|
| `request(method, payload, timeout=30000)` | 요청 전송, Promise 반환, 타임아웃 처리 |
| `notify(method, payload)` | 단방향 알림 전송 |
| `on(method, handler)` / `off(method, handler)` | 알림 구독/해제 |
| `handle(method, handler)` / `unhandle(method)` | 요청 핸들러 등록/해제 |
| `dispose()` | 모든 대기 요청 reject 후 정리 |

#### 23.1.3 Logger — `C$e` / `dt` (179-208줄)

```javascript
const dt = new C$e();  // 전역 싱글톤 로거
```

- 4단계 로그 레벨: `debug(0)` < `info(1)` < `warn(2)` < `error(3)`
- `console.log/info/warn/error`로 출력
- `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]` 접두사
- 기본값: level=debug, enabled=true

#### 23.1.4 플랫폼별 IPC 팩토리 — `E$e()` (209-253줄)

3가지 실행 환경을 자동 감지하여 적절한 메시지 전송/수신 핸들러 생성:

```
┌──────────────────┬─────────────────────────┬──────────────────────────┐
│ 환경             │ 수신 (onMessage)        │ 발신 (sendMessage)       │
├──────────────────┼─────────────────────────┼──────────────────────────┤
│ VS Code Extension│ window.addEventListener  │ window.vscodeapi         │
│                  │ ("message", handler)     │ .postMessage(msg)        │
├──────────────────┼─────────────────────────┼──────────────────────────┤
│ Electron         │ window.electronAPI       │ window.electronAPI       │
│                  │ .onMessageReceived(cb)   │ .sendMessage(msg)        │
├──────────────────┼─────────────────────────┼──────────────────────────┤
│ Webapp (iframe)  │ window.addEventListener  │ window.parent            │
│                  │ ("message", handler)     │ .postMessage(msg, "*")   │
└──────────────────┴─────────────────────────┴──────────────────────────┘
```

- 감지 순서: `window.vscodeapi` → `window.electronAPI` → `window.webappapi`
- 모두 없으면 `Error("Could not create IPCHost")` throw

#### 23.1.5 IPC Singleton — `wG`/`Lx` + `xG` (255-298줄)

```javascript
const xG = wG.getInstance();  // 전역 싱글톤

function Q0e() {              // 편의 함수
  return xG.getIPC();
}
```

- 전형적인 Singleton 패턴
- React와 non-React 모듈 모두에서 동일한 IPC 인스턴스 접근
- `isReady()`, `getIPCOrNull()` — 안전한 접근 메서드 제공

#### 23.1.6 React IPC Context — `J0e`, `A$e`, `Ev` (299-332줄)

```javascript
const J0e = R.createContext({ ipc: null, isReady: false });  // Context

function A$e({ children }) {    // IPCProvider 컴포넌트
  useEffect(() => {
    const ipc = E$e();          // IPC 팩토리 호출
    xG.initialize(ipc);         // 싱글톤에도 등록
    return () => { ipc.dispose(); xG.dispose(); };
  }, []);
  return <J0e.Provider value={{ ipc, isReady }}>{children}</J0e.Provider>;
}

function Ev() {                 // useIPC 훅
  return R.useContext(J0e);
}
```

- React 트리에서는 Context/Provider 패턴
- Non-React 코드에서는 Singleton 패턴
- 동일한 IPC 인스턴스를 **이중 접근 경로**로 공유

#### 23.1.7 앱 설정 상수 (333-339줄)

| 상수 | 값 | 설명 |
|------|-----|------|
| `e1e` | `false` | 디버그 모드 플래그 |
| `T$e` | `"0.1.52"` | IPC 프로토콜 버전 |
| `S5` | `"https://api.pencil.dev"` | 백엔드 API 엔드포인트 |
| `M$e` | `"phc_2wPD6..."` | PostHog API 키 |
| `P$e` | `"https://us.i.posthog.com"` | PostHog 인제스트 URL |
| `I$e` | `"https://908a8b...@...sentry.io/..."` | Sentry DSN |

#### 23.1.8 수학 유틸리티 함수 (340-654줄)

**기본 연산:**

| 함수 | 원본 이름 추정 | 설명 |
|------|---------------|------|
| `l3(a, b)` | `distance` | 두 점 사이 유클리드 거리 |
| `t1e(a, b)` | `distanceSquared` | 거리의 제곱 (비교용, sqrt 생략) |
| `R$e(x, y, angle)` | `rotatePoint` | 점을 원점 기준으로 회전 |
| `n1e(angle)` | `normalizeRadians` | 라디안을 0~2π 범위로 정규화 |
| `N$e(deg)` | `normalizeDegrees` | 각도를 0~360 범위로 정규화 |
| `Kb(rad)` | `radToDeg` | 라디안 → 도 변환 |
| `Zb(deg)` | `degToRad` | 도 → 라디안 변환 |
| `to(val, min, max)` | `clamp` | 값을 범위 내로 제한 |
| `ss(a, b, eps)` | `approxEqual` | 부동소수점 근사 비교 |
| `Pb(val, inMin, inMax, outMin, outMax)` | `mapRange` | 범위 매핑 (선형 보간) |

**보간/이징:**

| 함수 | 설명 |
|------|------|
| `qg(a, b, t)` | 선형 보간 (lerp) |
| `i1e(val, start, end)` | 역 lerp (inverseLerp) |
| `Jne(t)` | easeOutCubic: `1 - (1-t)³` |
| `D$e(t, s)` | easeOutBack: 오버슈트 포함 |
| `tie(t)` | smoothstep: `t²(3-2t)` |
| `eie(current, target, dt)` | 지수 감쇠 (`exp(-20*dt)`) |
| `IS(p0,p1,p2,p3,t)` | 3차 베지어 보간 |
| `nie(16params, u, v)` | 4×4 바이큐빅 베지어 보간 |

**벡터/행렬:**

| 함수 | 설명 |
|------|------|
| `Fh(ax, ay, bx, by)` | 2D 내적 (dot product) |
| `L$e(ax, ay, bx, by)` | 2D 외적 (cross product) |
| `O$e(matrix)` | 행렬 판별식 (determinant): `a*d - b*c` |
| `B$e(val, step)` | 스냅 (step 단위로 반올림) |
| `_G(x1, y1, x2, y2)` | 두 점으로 Bounds 생성 |
| `Xu(a, b)` | 안전한 나눗셈 (0이면 0 반환) |
| `Qne(a, b)` | 안전한 나눗셈 (0이면 1 반환) |

#### 23.1.9 Bounds 클래스 — `ls` (442-654줄)

AABB(Axis-Aligned Bounding Box) 구현. 모든 노드의 영역 계산에 사용.

```javascript
class ls {
  constructor(minX=∞, minY=∞, maxX=-∞, maxY=-∞)

  // Getters
  width, height, centerX, centerY, left, top, right, bottom, x, y

  // Factory
  static MakeXYWH(x, y, w, h)

  // 변형
  reset(), clone(), copyFrom(b), set(x1,y1,x2,y2), setXYWH(x,y,w,h)
  translate(dx, dy), move(x, y), inflate(padding)

  // 합집합
  unionRectangle(x1, y1, x2, y2), unionBounds(bounds)

  // 충돌 검사
  containsPoint(x, y)       // 점 포함 여부
  intersects(bounds)         // AABB 교차 검사
  includes(bounds)           // 완전 포함 검사
  intersectsWithTransform(bounds, matrix)  // OBB 교차 (SAT 알고리즘)

  // 아핀 변환
  transform(matrix)          // AABB를 변환 후 새 AABB 계산
}
```

- **OBB 충돌 검사** (`intersectsWithTransform`): SAT(Separating Axis Theorem) 기반, 4개 코너를 변환 후 3축에서 분리 검사
- 기본 생성자가 `∞/-∞`로 초기화 — `unionBounds`로 점진적 확장 가능

#### 23.1.10 유틸리티 클래스 — `tp` (655-728줄)

```javascript
class tp {
  static calculateRectFromPoints(start, end, isSquare, fromCenter)
  // Shift 키 = 정사각형 제약, Alt 키 = 중심 기준 생성

  static calculateCombinedBoundsNew(nodeSet)      // Set<Node>의 합산 Bounds
  static calculateCombinedBoundsFromArray(nodeArray)  // Array<Node>의 합산 Bounds
  static svgToBase64(svgString)                    // SVG → data URI 변환
  static getTopLevelNodes(selectedNodes, root)     // 최상위 노드만 필터링
}
```

#### 23.1.11 EventEmitter3 라이브러리 (730-889줄)

`eventemitter3` npm 패키지 인라인 포함.

```javascript
var z$e = j$e();  // EventEmitter3 팩토리 실행
```

**API:**

| 메서드 | 설명 |
|--------|------|
| `on(event, fn, context)` | 이벤트 리스너 등록 |
| `once(event, fn, context)` | 일회성 리스너 등록 |
| `off(event, fn)` / `removeListener` | 리스너 제거 |
| `removeAllListeners(event?)` | 전체/특정 이벤트 리스너 제거 |
| `emit(event, ...args)` | 이벤트 발생 (최대 5개 인자 최적화) |
| `listeners(event)` | 리스너 배열 반환 |
| `listenerCount(event)` | 리스너 수 반환 |
| `eventNames()` | 등록된 이벤트 이름 배열 |

- 접두사 `~` 사용하여 프로토타입 체인과 충돌 방지
- `emit`에서 인자 수별 최적화 (1~6개: `call`, 그 이상: `apply`)

---

## 24. boot + ipc 아키텍처 다이어그램

### 24.1 앱 부트스트랩 시퀀스

```
01_vite-bootstrap.js (최초 실행)
│
├─ __vite__mapDeps(): 4개 청크 의존성 매퍼 등록
├─ re/Tt/Oo/Bi/Js: ES2022 private field 폴리필 등록
├─ SENTRY_RELEASE: Git commit hash 전역 등록
└─ _sentryDebugIds: 소스맵 디버그 UUID 등록
    │
    ▼
02_ipc-system.js ~ 19_react-components.js (순차 실행)
│
├─ IPC 시스템 클래스 정의 (G6, S$e, C$e, wG)
├─ 수학 유틸리티 / Bounds / EventEmitter3
├─ PixiJS / Skia 렌더링 엔진
├─ 노드 시스템 (BaseNode → Shape/Text/Sticky/Icon)
├─ FileManager / Transaction / NodeProperties
├─ React UI 컴포넌트 / 디자인 킷
└─ 앱 초기화 (PostHog + Sentry + Router + ReactDOM.createRoot)
    │
    ▼
20_app-entry.js (최종)
│
└─ 52개 named export로 공개 API 노출
```

### 24.2 IPC 통신 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    Host Process                      │
│           (Electron Main / VS Code Extension)        │
└────────────────────┬────────────────────────────────┘
                     │ IPC Messages
                     │ {id, type, method, payload, error?}
                     │
    ┌────────────────┴────────────────┐
    │         IPCServer (S$e)          │
    │                                  │
    │  ┌─ requestHandlers ────────┐   │
    │  │  method → async handler  │   │
    │  └──────────────────────────┘   │
    │  ┌─ notificationHandlers ───┐   │
    │  │  method → handler[]      │   │
    │  └──────────────────────────┘   │
    │  ┌─ pendingRequests ────────┐   │
    │  │  id → {resolve, reject}  │   │
    │  └──────────────────────────┘   │
    └────────────────┬────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────┴─────┐          ┌──────┴──────┐
    │ Singleton │          │ React       │
    │ (xG)     │          │ Context     │
    │          │          │ (J0e)       │
    │ Q0e()    │          │ Ev()=useIPC │
    └──────────┘          └─────────────┘
         │                       │
    Non-React 모듈         React 컴포넌트
    (Engine, FileManager)  (UI, Editor)
```

### 24.3 boot + ipc 핵심 관찰

1. **01_vite-bootstrap.js가 진정한 엔트리**: 번들에서 가장 먼저 실행되며, 나머지 모든 코드가 의존하는 private field 폴리필과 Sentry 초기화를 담당

2. **20_app-entry.js는 외부 인터페이스**: 52개 단일 문자 export로 구성. 외부 청크(browserAll.js 등)에서 이 모듈을 통해 앱 기능에 접근

3. **IPC 이중 접근 패턴**: React Context + Singleton을 병행하여 React 트리 안팎에서 동일한 IPC 인스턴스에 접근 가능

4. **메시지 ID 형식**: `ext-{counter}-{timestamp}` — "ext"는 Extension을 의미하며, VS Code 확장 환경이 기본 타겟임을 시사

5. **3가지 플랫폼 지원**: VS Code → Electron → Webapp 순서로 감지. VS Code가 최우선이라는 점에서 원래 VS Code 확장으로 시작한 프로젝트로 추정

6. **수학 유틸리티가 IPC 파일에 포함**: 파일 분리가 기능 단위가 아닌 Vite 번들러의 트리쉐이킹/코드 스플리팅 결과. 실제로는 에디터 캔버스에서 사용되는 수학 함수들

7. **EventEmitter3 인라인**: Node.js의 EventEmitter와 유사하지만 브라우저용. `~` 접두사로 프로토타입 오염 방지

8. **Bounds(ls) 클래스의 중요성**: 모든 노드의 영역 계산, 선택 박스, 충돌 검사, 뷰포트 가시성 판단 등 에디터 핵심 연산에 사용. OBB 충돌 검사까지 지원하여 회전된 노드 간 교차 판정 가능
