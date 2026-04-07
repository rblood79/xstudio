# Frame0 프로젝트 정밀 분석 리포트

> 분석 일자: 2026-03-05
> 분석 대상: `/Users/admin/workspace/Frame0` (macOS 앱 번들)
> 분석 방법: asar 추출 → 소스코드 역분석

---

## 1. 프로젝트 개요

| 항목           | 내용                                                            |
| -------------- | --------------------------------------------------------------- |
| **이름**       | Frame0                                                          |
| **버전**       | 1.5.0                                                           |
| **제작사**     | MKLabs Co., Ltd.                                                |
| **홈페이지**   | frame0.app                                                      |
| **번들 ID**    | com.electron.frame0                                             |
| **카테고리**   | Developer Tools                                                 |
| **설명**       | "A sleek Balsamiq-alternative wireframing tool for modern apps" |
| **라이선스**   | MIT                                                             |
| **최소 macOS** | 10.15 (Catalina)                                                |

Frame0는 Balsamiq의 대안을 표방하는 UI 와이어프레임 디자인 도구로, Electron 기반 macOS 데스크탑 앱입니다.

---

## 2. 기술 스택

### 런타임 / 빌드 환경

| 기술           | 버전    | 용도                   |
| -------------- | ------- | ---------------------- |
| Electron       | ^31.3.0 | 데스크탑 앱 셸         |
| Vite           | ^5.3.2  | 번들러                 |
| electron-forge | ~7.4.0  | 빌드/패키징 파이프라인 |
| TypeScript     | ^5.8.3  | 타입 안전성            |
| React          | ^18.3.1 | UI 렌더링              |

### UI / 컴포넌트

- **Radix UI** — 전 컴포넌트 풀 세트 (Accordion, Dialog, Select, Slider 등 17+ 패키지)
- **Tailwind CSS** `^3.4.4` + `tailwindcss-animate` + `@tailwindcss/typography`
- **Lucide React** `^0.525.0` — 아이콘
- **shadcn/ui 패턴** — class-variance-authority, tailwind-merge, clsx
- **Sonner** — 토스트 알림
- **cmdk** — 커맨드 팔레트
- **vaul** — 드로어 컴포넌트
- **next-themes** — 다크/라이트 모드

### 캔버스 / 드로잉 엔진

- **@dgmjs/core** `^1.5.5` — 핵심 다이어그램 엔진
- **@dgmjs/react** `^1.5.2` — React 바인딩
- **@dgmjs/export** `^1.1.0` — 내보내기
- **@dgmjs/pdf** `^1.0.0` — PDF 내보내기
- **roughjs** — 손그림 스타일 렌더링
- **perfect-freehand** — 자유곡선 드로잉

### 텍스트 편집

- **@tiptap/core** + 관련 확장 — RichText 에디터
- **@codemirror** 전체 패키지 — 코드 블록 편집기
- **KaTeX** — 수식 렌더링 (rehype-katex, remark-math)
- **react-markdown** + **remark-gfm** — 마크다운 렌더링

### AI / LLM 통합

- **openai** `^5.19.1` — OpenAI SDK (커스텀 endpoint 지원으로 다양한 LLM 연결 가능)

### 상태 관리

- **Zustand** `^4.5.4` — 전역 상태
- **Immer** `^10.1.1` — 불변 상태 업데이트

### 기타 주요 의존성

| 패키지                             | 용도               |
| ---------------------------------- | ------------------ |
| @hello-pangea/dnd                  | 드래그 앤 드롭     |
| zod `^3.24.2` + zod-to-json-schema | 스키마 검증        |
| dayjs                              | 날짜 처리          |
| express `^5.1.0`                   | 내장 로컬 API 서버 |
| react-image-crop                   | 이미지 크롭        |
| react-colorful                     | 색상 피커          |
| update-electron-app                | 자동 업데이트      |
| node-machine-id                    | 기기 고유 ID       |
| node-system-fonts                  | 시스템 폰트 목록   |

---

## 3. 아키텍처 구조

```
Frame0.app (Electron Bundle)
├── MacOS/Frame0                     # 네이티브 실행파일 (36KB)
├── Resources/
│   ├── app.asar                     # 앱 번들 (170MB)
│   │   ├── .vite/build/
│   │   │   ├── main.js              # Electron Main Process (20KB, 빌드됨)
│   │   │   ├── preload.js           # Context Bridge
│   │   │   └── templates/           # .f0 템플릿 파일 (JSON)
│   │   │       ├── desktop.f0
│   │   │       ├── phone.f0
│   │   │       ├── tablet.f0
│   │   │       ├── tv.f0
│   │   │       ├── watch.f0
│   │   │       └── web.f0
│   │   ├── .vite/renderer/main_window/
│   │   │   └── assets/
│   │   │       ├── index-DYSDT6Za.js    # Renderer 번들 (6MB)
│   │   │       ├── index.es-eQd_oL-e.js (149KB)
│   │   │       ├── index-5nZ4xRYj.css  (104KB)
│   │   │       └── [폰트 파일들 - Inter, IBMPlexMono, KaTeX 등]
│   │   └── node_modules/            # 272개 패키지
│   └── app.asar.unpacked/           # 네이티브 모듈 (node-system-fonts 등)
└── Frameworks/
    ├── Electron Framework.framework
    ├── Frame0 Helper.app            # Electron 헬퍼 프로세스
    ├── Frame0 Helper (GPU).app
    ├── Frame0 Helper (Plugin).app
    ├── Frame0 Helper (Renderer).app
    ├── Squirrel.framework           # 자동 업데이트
    ├── Mantle.framework
    └── ReactiveObjC.framework
```

### 프로세스 분리 모델

```
Main Process (main.js)
    ↕ IPC (ipcMain / ipcRenderer)
Preload Script (preload.js)
    → contextBridge.exposeInMainWorld("api", ...)
    ↕
Renderer Process (React SPA)
```

---

## 4. IPC API 전체 목록 (Main ↔ Renderer)

총 **37개** IPC 핸들러, 7개 네임스페이스로 구성됩니다.

### window.\*

| 핸들러                  | 기능                   |
| ----------------------- | ---------------------- |
| window.create           | 새 창 생성             |
| window.open-file        | 파일로 창 열기         |
| window.set-file-path    | 현재 창 파일 경로 설정 |
| window.set-modified     | 수정 상태 설정         |
| window.set-dark-mode    | 다크모드 전환          |
| window.toggle-dev-tools | DevTools 토글          |
| window.open-external    | 외부 URL 열기          |
| window.open-path        | 파인더에서 경로 열기   |
| window.quit             | 앱 종료                |

### dialog.\*

| 핸들러         | 기능                 |
| -------------- | -------------------- |
| dialog.open    | 파일 열기 다이얼로그 |
| dialog.save    | 파일 저장 다이얼로그 |
| dialog.message | 메시지 박스          |

### fs.\*

| 핸들러                | 기능                         |
| --------------------- | ---------------------------- |
| fs.exists             | 파일 존재 확인               |
| fs.mkdir              | 디렉토리 생성                |
| fs.read               | 파일 읽기 (텍스트)           |
| fs.read-array-buffer  | 파일 읽기 (바이너리)         |
| fs.readdir            | 디렉토리 목록                |
| fs.write              | 파일 쓰기 (텍스트)           |
| fs.write-array-buffer | 파일 쓰기 (바이너리)         |
| fs.unlink             | 파일 삭제                    |
| fs.get-path           | 특수 경로 조회 (userData 등) |
| fs.get-app-path       | 앱 경로 조회                 |

### path._ / font._ / config.\*

| 핸들러                  | 기능             |
| ----------------------- | ---------------- |
| path.join               | 경로 결합        |
| path.parse              | 경로 파싱        |
| font.read-builtin-fonts | 내장 폰트 읽기   |
| font.get-system-fonts   | 시스템 폰트 목록 |
| config.get-config       | 앱 설정 조회     |
| config.set-config       | 앱 설정 저장     |

### license.\*

| 핸들러                     | 기능                    |
| -------------------------- | ----------------------- |
| license.get-device-id      | 기기 고유 ID 반환       |
| license.activate           | 라이선스 활성화         |
| license.deactivate         | 라이선스 비활성화       |
| license.validate           | 라이선스 검증           |
| license.get-license-status | 현재 라이선스 상태 조회 |

### llm.\*

| 핸들러           | 기능                    |
| ---------------- | ----------------------- |
| llm.chat         | LLM API 호출            |
| llm.abort        | 진행 중인 LLM 요청 취소 |
| llm.save-session | 대화 세션 저장          |
| llm.load-session | 대화 세션 불러오기      |
| llm.get-history  | 전체 세션 히스토리 조회 |

---

## 5. 라이선스 시스템 상세 분석

### 구성 요소

```
암호화 알고리즘 : AES-GCM (Web Crypto API)
암호화 키       : "2uHCpKy4pjWMokfqh27AJnwD6YEgxzlEI5XvvVW70BA=" (Base64, 하드코딩)
라이선스 서버   : https://frame0.app/api/license-manager
로컬 저장 경로  : userData/activation.key (암호화된 JSON)
기기 식별       : node-machine-id (machineId)
제품 ID         : "FRAME0.V1"
```

### 에디션

- `STD` — Standard
- `PRO` — Professional

### 라이선스 상태 객체

```javascript
{
  activated: false,
  name: null,
  product: null,
  edition: null,
  productDisplayName: null,
  deviceId: null,
  licenseKey: null,
  activationCode: null,
  trial: false,
  trialDaysLeft: 0
}
```

### 검증 흐름

```
1. 로컬 검증 (Le 함수)
   └─ userData/activation.key 읽기
   └─ AES-GCM 복호화
   └─ 제품ID 매칭 (product === "FRAME0.V1")
   └─ 기기ID 매칭 (deviceId === "*" OR deviceId === machineId)
   └─ 성공 → activated: true
   └─ 실패 → 트라이얼 모드로 전환

2. 온라인 검증 (xe 함수)
   └─ POST https://frame0.app/api/license-manager/validate
   └─ POST https://frame0.app/api/license-manager/ping (오프라인 감지용)

3. 오프라인 우회 감지
   └─ deviceId === "*" (멀티 기기 라이선스) 이면서
   └─ 서버 ping이 성공하면 → 라이선스 강제 비활성화

4. 트라이얼 모드
   └─ trialDaysLeft: -1 (무기한 트라이얼로 설정됨)
```

---

## 6. AI 기능 (LLM 통합)

### 핵심 구현

```javascript
async function llmChatHandler(event, params, options = {}) {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.endpoint, // 커스텀 엔드포인트 지원
  });

  const request = {
    model: options.model,
    messages: [],
    tools: [],
    tool_choice: "none",
    ...params,
  };

  // AbortController로 취소 지원
  if (options.abortId) {
    const controller = new AbortController();
    abortControllers[options.abortId] = controller;
    signal = controller.signal;
  }

  const result = await client.chat.completions.create(request, { signal });
  return { success: true, data: result };
}
```

### 특징

- OpenAI SDK 사용이나 `baseURL` 파라미터로 **다른 LLM 서비스 연결 가능** (Ollama, Azure OpenAI 등)
- `tool_choice: "none"` 기본값 — Function Calling 비활성화 (단순 채팅 모드)
- AbortController 기반 **스트리밍 취소** 지원
- 세션 히스토리를 `userData/` 에 JSON으로 영구 저장 (최대 L개, 타임스탬프 기준 정렬)

---

## 7. 내장 API 서버 (Express)

앱 설정에서 `api-server: true` 로 활성화 가능한 **로컬 REST API 서버**입니다.

### 엔드포인트

```
GET  /                  → "Hello from Frame0 API Server!"
POST /execute_command   → Frame0 내부 커맨드 실행
```

### /execute_command 요청 형식

```json
{
  "command": "string",
  "args": {}
}
```

### /execute_command 응답 형식

```json
{ "success": true, "data": "..." }
{ "success": false, "error": "..." }
```

### 활용 가능성

- **MCP 서버 연동**: Claude 등 AI 에이전트가 Frame0를 직접 제어 가능
- **테스트 자동화**: 외부 스크립트로 와이어프레임 생성/편집 자동화
- **포트**: 설정 파일에서 `api-server-port` 로 지정

---

## 8. 파일 포맷 (.f0)

Frame0 문서 파일 포맷으로, **평문 JSON** 구조입니다.

### 구조

```json
{
  "id": "dGECtjVQwdZCt0php8zNk",
  "type": "Doc",
  "parent": null,
  "children": [
    {
      "id": "...",
      "type": "...",
      ...
    }
  ]
}
```

### 특징

- 암호화 없음 — 버전 관리(git) 친화적
- `@dgmjs/core` 의 노드 트리 직렬화 구조
- 6종 디바이스 프리셋 템플릿 내장:

| 템플릿     | 대상 화면   |
| ---------- | ----------- |
| desktop.f0 | 데스크탑    |
| phone.f0   | 스마트폰    |
| tablet.f0  | 태블릿      |
| tv.f0      | TV          |
| watch.f0   | 스마트워치  |
| web.f0     | 웹 브라우저 |

---

## 9. 빌트인 폰트 목록

| 패밀리           | 스타일                                                                           | 특징                                        |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| Inter            | Thin/ExtraLight/Light/Regular/Medium/SemiBold/Bold/ExtraBold/Black (Italic 포함) | 기본 UI 폰트                                |
| IBM Plex Mono    | Regular/Bold (Italic 포함)                                                       | 코드 편집용                                 |
| Source Serif Pro | Regular/Bold (Italic 포함)                                                       | 세리프 서체                                 |
| Loranthus        | Regular/Bold (Italic 포함)                                                       | 장식용                                      |
| Jojoba           | Regular                                                                          | 특수 서체                                   |
| Redacted Script  | Regular/Bold                                                                     | 목업 플레이스홀더 (읽기 불가 텍스트 표현용) |

---

## 10. 자동 업데이트

- **라이브러리**: update-electron-app
- **프레임워크**: Squirrel.framework
- **업데이트 서버**: `https://files.frame0.app/releases/`

---

## 11. 보안 분석

| 항목                   | 상태     | 비고                                 |
| ---------------------- | -------- | ------------------------------------ |
| Context Isolation      | 정상     | contextBridge 사용, 안전             |
| nodeIntegration        | 안전     | preload.js 샌드박스 분리             |
| NSAllowsArbitraryLoads | **주의** | Info.plist에서 HTTP 전체 허용        |
| AES 암호화 키 하드코딩 | **취약** | main.js에 Base64 키 노출             |
| API 서버 인증          | **없음** | 로컬 실행이나 인증 미비              |
| 라이선스 파일 암호화   | 부분적   | AES-GCM 사용이나 키 노출로 의미 약화 |

---

## 12. 의존성 통계

| 항목                        | 수치            |
| --------------------------- | --------------- |
| 전체 node_modules 패키지 수 | 272개           |
| Production dependencies     | 35개            |
| Dev dependencies            | 20개            |
| 렌더러 번들 크기            | ~6MB (index.js) |
| CSS 번들 크기               | ~104KB          |
| app.asar 전체 크기          | ~170MB          |

---

## 13. 종합 평가

### 강점

- **완성도 높은 캔버스 엔진**: @dgmjs 기반으로 벡터 편집, 손그림 스타일, 자유곡선 등 지원
- **현대적 UI 스택**: Radix UI + Tailwind CSS + shadcn/ui 패턴의 일관된 컴포넌트 시스템
- **AI 통합**: OpenAI SDK 기반 LLM 채팅 기능, 커스텀 엔드포인트로 다양한 모델 지원
- **자동화 API**: Express 내장 서버로 외부 제어 및 MCP 연동 가능
- **풍부한 텍스트 편집**: Tiptap + CodeMirror + KaTeX 조합으로 다양한 콘텐츠 지원
- **6종 기기 템플릿**: 다양한 화면 크기 대응 와이어프레임 제작

### 약점 / 개선 포인트

- AES-GCM 암호화 키를 소스코드에 하드코딩 → 라이선스 보호 효과 약화
- `NSAllowsArbitraryLoads: true` 로 HTTP 혼합 콘텐츠 허용
- 내장 API 서버에 인증 메커니즘 부재
- 트라이얼 모드가 `trialDaysLeft: -1` 로 무기한 설정되어 있어 실질적 제한 불명확

### composition 연계 관점

Frame0의 `.f0` 파일 포맷(평문 JSON, @dgmjs 노드 트리)과 내장 Express API 서버(`/execute_command`)를 통해 composition와 프로그래매틱 연동이 가능합니다. 특히 MCP 서버(Pencil)와의 워크플로우에서 Frame0의 API 서버를 활용하면 AI 에이전트가 와이어프레임을 직접 생성/편집하는 자동화 파이프라인 구축이 가능합니다.
