# Project Export/Import 설계 문서

> Builder에서 작업한 프로젝트를 JSON 파일로 내보내고, Publish 앱에서 미리보기하는 기능

## 개요

- **생성일**: 2026-01-02
- **현재 버전**: 1.0.0
- **완성도**: 60%
- **최소 브라우저**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 현재 구현 상태

### 구현된 기능

| 항목 | 상태 | 완성도 | 파일 |
|------|------|--------|------|
| 기본 내보내기 | ✅ | 100% | `packages/shared/src/utils/export.utils.ts` |
| 기본 가져오기 | ✅ | 100% | `packages/shared/src/utils/export.utils.ts` |
| 기본 검증 | ✅ | 40% | `parseProjectData()` |
| 파일 드롭 UI | ✅ | 100% | `apps/publish/src/App.tsx` |
| 에러 처리 | ✅ | 60% | 기본 에러 메시지만 |

### 주요 파일

```
packages/shared/src/utils/
├── export.utils.ts          # Export/Import 유틸리티
└── index.ts                  # re-export

apps/builder/src/builder/main/
└── BuilderCore.tsx           # handlePublish 구현

apps/publish/
├── src/App.tsx               # JSON 로딩 및 렌더링
├── src/styles/index.css      # Dropzone 스타일
└── public/project.json       # 테스트용 샘플
```

## 데이터 구조

### ExportedProjectData

```typescript
interface ExportedProjectData {
  version: string;           // "1.0.0"
  exportedAt: string;        // ISO 8601 timestamp
  project: {
    id: string;              // UUID
    name: string;            // 프로젝트 이름
  };
  pages: Page[];             // 페이지 목록
  elements: Element[];       // 요소 목록
  currentPageId?: string;    // 현재 선택된 페이지
}
```

### 샘플 JSON

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-01-02T07:35:52.219Z",
  "project": {
    "id": "db1e4339-e9d1-40e5-a268-8df9d4bfc49d",
    "name": "MyProject"
  },
  "pages": [
    {
      "id": "336554c4-c9ba-48e1-a278-d389c7519b72",
      "title": "Home",
      "slug": "/",
      "project_id": "db1e4339-e9d1-40e5-a268-8df9d4bfc49d",
      "parent_id": null,
      "order_num": 0,
      "layout_id": null
    }
  ],
  "elements": [
    {
      "id": "element-button-1",
      "tag": "Button",
      "props": {
        "children": "Click Me",
        "variant": "primary"
      },
      "parent_id": "body-id",
      "page_id": "336554c4-c9ba-48e1-a278-d389c7519b72",
      "order_num": 0
    }
  ],
  "currentPageId": "336554c4-c9ba-48e1-a278-d389c7519b72"
}
```

## API Reference

### Export Functions

#### `serializeProjectData()`
프로젝트 데이터를 JSON 문자열로 변환

```typescript
function serializeProjectData(
  projectId: string,
  projectName: string,
  pages: Page[],
  elements: Element[],
  currentPageId?: string | null
): string
```

#### `downloadProjectAsJson()`
프로젝트를 JSON 파일로 다운로드

```typescript
function downloadProjectAsJson(
  projectId: string,
  projectName: string,
  pages: Page[],
  elements: Element[],
  currentPageId?: string | null
): void
```

### Import Functions

#### `parseProjectData()`
JSON 문자열 파싱 및 검증

```typescript
function parseProjectData(jsonString: string): ImportResult
```

#### `loadProjectFromUrl()`
URL에서 프로젝트 로드

```typescript
async function loadProjectFromUrl(url: string): Promise<ImportResult>
```

#### `loadProjectFromFile()`
File 객체에서 프로젝트 로드

```typescript
async function loadProjectFromFile(file: File): Promise<ImportResult>
```

---

## 에러 코드 레퍼런스

모든 Phase에서 사용되는 에러 코드 정의입니다.

### 에러 코드 Enum

```typescript
// packages/shared/src/types/export.types.ts
export enum ExportErrorCode {
  // 검증 오류 (Phase 1)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',
  PARENT_CYCLE = 'PARENT_CYCLE',
  UNSUPPORTED_TAG = 'UNSUPPORTED_TAG',
  EXPORT_LIMIT_EXCEEDED = 'EXPORT_LIMIT_EXCEEDED',

  // 페이지 오류 (Phase 2)
  PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
  NO_PAGES = 'NO_PAGES',
  NO_ELEMENTS = 'NO_ELEMENTS',

  // 이벤트 런타임 오류 (Phase 3)
  UNSUPPORTED_ACTION = 'UNSUPPORTED_ACTION',
  API_CALL_FAILED = 'API_CALL_FAILED',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  HANDLER_DUPLICATE = 'HANDLER_DUPLICATE',
  HANDLER_POOL_HIGH = 'HANDLER_POOL_HIGH',

  // 버전/마이그레이션 오류 (Phase 4)
  UNKNOWN_VERSION = 'UNKNOWN_VERSION',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  ASSET_TOO_LARGE = 'ASSET_TOO_LARGE',

  // 보안 오류
  SECURITY_BLOCKED = 'SECURITY_BLOCKED',
  INVALID_URL_SCHEME = 'INVALID_URL_SCHEME',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
}
```

### 에러 코드 전체 목록

| 코드 | Phase | 심각도 | 설명 | 사용자 메시지 예시 |
|------|-------|--------|------|-------------------|
| `VALIDATION_ERROR` | 1 | Error | 필드 값이 스키마와 불일치 | `"version must follow semver (e.g., 1.0.0)"` |
| `MISSING_FIELD` | 1 | Error | 필수 필드 누락 | `"project.id is required"` |
| `INVALID_TYPE` | 1 | Error | 타입 불일치 | `"pages must be an array"` |
| `PARENT_CYCLE` | 1 | Error | 페이지 순환 참조 | `"pages[1].parent_id forms a cycle"` |
| `UNSUPPORTED_TAG` | 1 | Warning | 미지원 컴포넌트 태그 | `"elements[3].tag 'CustomWidget' is not supported"` |
| `EXPORT_LIMIT_EXCEEDED` | 1 | Error | 데이터 한계 초과 | `"Project exceeds limit: 10,500 elements (max: 10,000)"` |
| `PAGE_NOT_FOUND` | 2 | Warning | 페이지 ID 없음 | `"currentPageId does not match any page"` |
| `NO_PAGES` | 2 | Error | 페이지 배열 비어있음 | `"No pages to render"` |
| `NO_ELEMENTS` | 2 | Info | 페이지에 요소 없음 | `"No elements for page 'Home'"` |
| `UNSUPPORTED_ACTION` | 3 | Warning | 미지원 액션 타입 | `"UPDATE_ELEMENT is not available in Publish"` |
| `API_CALL_FAILED` | 3 | Warning | API 호출 실패 | `"API call blocked by CORS"` |
| `POPUP_BLOCKED` | 3 | Info | 팝업 차단됨 | `"Popup blocked; opened in current tab"` |
| `HANDLER_DUPLICATE` | 3 | Debug | 핸들러 중복 등록 | `"Handler already registered"` |
| `HANDLER_POOL_HIGH` | 3 | Warning | 핸들러 풀 과다 | `"Handler pool exceeds 5,000"` |
| `UNKNOWN_VERSION` | 4 | Error | 미지원 버전 | `"version 0.9.0 is not supported"` |
| `MIGRATION_FAILED` | 4 | Error | 마이그레이션 실패 | `"migration v1.0.0→v1.1.0 failed"` |
| `ASSET_TOO_LARGE` | 4 | Warning | 에셋 크기 초과 | `"thumbnail exceeds 512KB and was dropped"` |
| `SECURITY_BLOCKED` | - | Error | 보안 정책 위반 | `"Blocked: potential security risk detected"` |
| `INVALID_URL_SCHEME` | - | Error | 허용되지 않은 URL 스키마 | `"Only https:// URLs are allowed"` |
| `FILE_TOO_LARGE` | - | Error | 파일 크기 초과 | `"File exceeds 10MB limit"` |

### 에러 응답 형식

```typescript
interface ExportError {
  code: ExportErrorCode;
  message: string;
  field?: string;           // 오류 발생 필드 경로
  detail?: string;          // 추가 상세 정보
  severity: 'error' | 'warning' | 'info' | 'debug';
}

// 예시
{
  "code": "VALIDATION_ERROR",
  "message": "pages[2].slug is invalid",
  "field": "pages[2].slug",
  "detail": "pattern: /^(\\/|[a-z0-9-_/]+)$/",
  "severity": "error"
}
```

---

## 개선 계획

### 데이터/성능 범위 및 측정 정책

- **지원 한계**: `pages ≤ 200`, `elements ≤ 10,000`, 압축 전 `project.json ≤ 10MB`를 정상 범위로 간주하고, 이를 초과하면 업로드를 차단하며 `EXPORT_LIMIT_EXCEEDED` 코드를 동반한 경고를 노출한다.
- **처리 시간 목표**: JSON 파싱 ≤ 120ms, Zod 검증 ≤ 180ms, 렌더링 준비(페이지 인덱스/트리 구성) ≤ 250ms를 목표로 하며, 초과 시 경고 레벨 로그를 남긴다.
- **병목 측정 포인트**: (1) JSON 파싱(`performance.mark/measure`), (2) Zod 검증(`logger.timing('validation')`), (3) 렌더링 준비(`performance.measure('render:init')`). Vercel/Preview에서는 콘솔 + 파일 로그를 모두 남기고, 로컬에서는 콘솔만 기록한다.
- **샘플 로그 포맷**: `{"type":"perf","phase":"parse","durationMs":115,"pages":120,"elements":5400}`

### Phase 1: 미구현 기능 분석

#### 1. 데이터 검증 강화 (현재: 40%)

**현재 상태:**
```typescript
// 필드 존재만 확인
if (!data.version || !data.project || !data.pages || !data.elements) {
  return { success: false, error: 'Invalid format' };
}
```

**개선안: Zod 스키마 검증**
```typescript
import { z } from 'zod';

const ElementSchema = z.object({
  id: z.string(),
  tag: z.string(),
  props: z.record(z.unknown()),
  parent_id: z.string().nullable(),
  page_id: z.string(),
  order_num: z.number(),
});

const PageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  project_id: z.string(),
  parent_id: z.string().nullable(),
  order_num: z.number(),
  layout_id: z.string().nullable(),
});

const ExportedProjectSchema = z.object({
  version: z.string(),
  exportedAt: z.string().datetime(),
  project: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }),
  pages: z.array(PageSchema).min(1),
  elements: z.array(ElementSchema),
  currentPageId: z.string().optional(),
});

// 사용
function parseProjectData(jsonString: string): ImportResult {
  const parsed = JSON.parse(jsonString);
  const result = ExportedProjectSchema.safeParse(parsed);

  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}
```

**난이도**: ⭐⭐
**효과**: 중간 - 잘못된 데이터 조기 감지

---

#### 2. 버전 호환성 (현재: 없음)

**개선안: 버전 마이그레이션 시스템**
```typescript
type MigrationFn = (data: unknown) => ExportedProjectData;

const migrations: Record<string, MigrationFn> = {
  '1.0.0': (data) => data as ExportedProjectData,
  '1.1.0': (data) => {
    // v1.0.0 → v1.1.0 마이그레이션
    const v1 = data as ExportedProjectDataV1;
    return {
      ...v1,
      version: '1.1.0',
      // 새 필드 추가
      settings: v1.settings || { theme: 'light' },
    };
  },
};

function migrateProject(data: unknown): ExportedProjectData {
  const version = (data as { version?: string }).version || '1.0.0';
  const migrationFn = migrations[version];

  if (!migrationFn) {
    throw new Error(`Unknown version: ${version}`);
  }

  return migrationFn(data);
}
```

**난이도**: ⭐⭐
**효과**: 중간 - 향후 버전 업그레이드 대비

---

#### 3. 멀티 페이지 네비게이션 (현재: 첫 페이지만 표시)

**현재 상태:**
```typescript
// Publish App - 첫 페이지만 렌더링
const pageId = data.currentPageId || data.pages[0]?.id;
```

**개선안: 페이지 네비게이션 UI**
```typescript
// apps/publish/src/App.tsx
function App() {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);

  return (
    <div className="publish-app">
      {/* 페이지 네비게이션 */}
      <nav className="page-nav">
        {projectData.pages.map((page) => (
          <button
            key={page.id}
            className={currentPageId === page.id ? 'active' : ''}
            onClick={() => setCurrentPageId(page.id)}
          >
            {page.title}
          </button>
        ))}
      </nav>

      {/* 현재 페이지 렌더링 */}
      <PageRenderer
        page={currentPage}
        elements={projectData.elements}
      />
    </div>
  );
}
```

**난이도**: ⭐⭐
**효과**: 높음 - 멀티 페이지 프로젝트 미리보기 가능

---

#### 4. 이벤트 런타임 (현재: 이벤트 무시됨)

**현재 상태:**
- Builder에서 설정한 onClick, onChange 등 이벤트가 Publish에서 동작 안 함
- EventEngine이 Builder에만 있음

**개선안: Publish용 이벤트 런타임**
```typescript
// packages/shared/src/runtime/EventRuntime.ts
export class PublishEventRuntime {
  private handlers: Map<string, EventHandler[]> = new Map();

  register(elementId: string, events: ElementEvent[]) {
    events.forEach((event) => {
      const handler = this.createHandler(event);
      this.handlers.set(`${elementId}:${event.type}`, handler);
    });
  }

  private createHandler(event: ElementEvent): EventHandler {
    return () => {
      event.actions.forEach((action) => {
        this.executeAction(action);
      });
    };
  }

  private executeAction(action: Action) {
    switch (action.type) {
      case 'NAVIGATE_TO_PAGE':
        window.location.href = action.config.path;
        break;
      case 'SHOW_ALERT':
        alert(action.config.message);
        break;
      // ... 다른 액션들
    }
  }
}
```

**난이도**: ⭐⭐⭐
**효과**: 높음 - 인터랙티브 프로젝트 미리보기

---

#### 5. 에셋 처리 (현재: 외부 URL만 지원)

**현재 상태:**
- Image 컴포넌트의 src가 외부 URL이면 동작
- 로컬/업로드 이미지는 처리 불가

**개선안 A: Base64 인라인**
```typescript
interface ExportedProjectData {
  // ...
  assets?: {
    [assetId: string]: {
      type: 'image' | 'font' | 'video';
      data: string;  // Base64
      mimeType: string;
    };
  };
}
```

**개선안 B: Zip 번들**
```typescript
import JSZip from 'jszip';

async function exportProjectAsZip(project: ExportedProjectData, assets: Asset[]) {
  const zip = new JSZip();

  // project.json
  zip.file('project.json', JSON.stringify(project, null, 2));

  // assets 폴더
  const assetsFolder = zip.folder('assets');
  for (const asset of assets) {
    assetsFolder?.file(asset.filename, asset.blob);
  }

  return await zip.generateAsync({ type: 'blob' });
}
```

**난이도**: ⭐⭐⭐⭐
**효과**: 낮음 - 현재 대부분 외부 URL 사용

---

#### 6. 압축 (선택사항)

**개선안: 대규모 프로젝트용 Gzip**
```typescript
import pako from 'pako';

function compressProject(jsonString: string): Uint8Array {
  return pako.gzip(jsonString);
}

function decompressProject(compressed: Uint8Array): string {
  return pako.ungzip(compressed, { to: 'string' });
}

// 파일 확장자: .xstudio.gz
```

**난이도**: ⭐
**효과**: 낮음 - 대부분 프로젝트는 작음

---

---

## 구현 로드맵: 60% → 100%

### 완성도 계산 기준

| 카테고리 | 가중치 | 현재 | 목표 |
|----------|--------|------|------|
| 기본 Export/Import | 20% | 20% | 20% |
| 데이터 검증 | 15% | 6% | 15% |
| 멀티 페이지 지원 | 20% | 0% | 20% |
| 이벤트 런타임 | 25% | 0% | 25% |
| 에러 처리 & UX | 10% | 6% | 10% |
| 버전 관리 | 10% | 0% | 10% |
| **합계** | **100%** | **32%** | **100%** |

> 참고: 이전 분석의 60%는 주관적 평가였으며, 가중치 기반 재계산 결과 실제로는 약 32%입니다.

---

### Phase 1: 데이터 검증 강화 (32% → 47%)

**목표**: 잘못된 JSON 데이터 조기 감지 및 명확한 에러 메시지

**작업 목록**:

| # | 작업 | 파일 | 완성도 기여 |
|---|------|------|-------------|
| 1.1 | Zod 스키마 정의 | `packages/shared/src/schemas/project.schema.ts` | +5% |
| 1.2 | parseProjectData에 스키마 검증 적용 | `packages/shared/src/utils/export.utils.ts` | +2% |
| 1.3 | 상세 에러 메시지 포맷팅 | `packages/shared/src/utils/export.utils.ts` | +2% |
| 1.4 | Publish 앱 에러 UI 개선 | `apps/publish/src/App.tsx` | +4% |
| 1.5 | 유닛 테스트 작성 | `packages/shared/src/utils/__tests__/export.utils.test.ts` | +2% |

**데이터 필드 제약 및 폴백 정책**:
- **필수 필드**: `version`, `exportedAt`, `project.id`, `project.name`, `pages[].id/title/slug/project_id/order_num`, `elements[].id/tag/page_id/order_num`, `currentPageId`(멀티 페이지일 때).
- **옵션 필드**: `pages[].parent_id/layout_id`, `elements[].parent_id/props`, `metadata.*`, `assets`.

| 필드 | 타입/패턴/enum | 필수 여부 | 제약 |
|------|----------------|-----------|------|
| `version` | Semver 문자열 (`^\d+\.\d+\.\d+$`) | 필수 | 인식 불가 버전 시 마이그레이션 단계에서 차단 |
| `exportedAt` | ISO 8601 | 필수 | 미래 시각일 경우 경고 로그 기록 |
| `project.id` | UUID | 필수 | `project.name`은 1~120자 |
| `pages[].slug` | `/` 또는 `/[a-z0-9-_/]+` | 필수 | 중복/공백/대문자 금지 |
| `pages[].parent_id` | UUID \| null | 옵션 | 순환 참조 금지, 존재하지 않는 parent 금지 |
| `elements[].tag` | enum(Component catalog) | 필수 | 미지원 태그는 `UNSUPPORTED_TAG` 코드와 함께 제거 |
| `elements[].props` | JSON object | 옵션 | 함수/심볼 금지, 직렬화 가능한 값만 허용 |
| `currentPageId` | UUID | 조건부 필수 | 값이 없으면 `pages[0].id`로 대체 |

- **마이그레이션 실패 폴백**: Zod 검증 전 마이그레이션 단계에서 실패 시 `MIGRATION_FAILED`로 리턴하고 import를 중단하며, `unknown_version`일 경우 `phase1` 플래그를 `unsupported`로 기록해 UI에서 재시도(구버전 업로드)만 노출한다.
- **에러 로깅 포맷**: `{"code":"VALIDATION_ERROR","message":"pages[2].slug is invalid","field":"pages[2].slug","detail":"pattern:/[a-z0-9-_/]+/"}` 형태로 콘솔/파일에 동일하게 기록하고, 사용자에게는 요약 메시지 + 필드명을 표시한다.

**산출물**:
```
packages/shared/src/
├── schemas/
│   └── project.schema.ts    # Zod 스키마 (신규)
├── utils/
│   ├── export.utils.ts      # 검증 로직 추가
│   └── __tests__/
│       └── export.utils.test.ts  # 테스트 (신규)
```

**완료 기준**:
- [ ] 잘못된 JSON 구조 시 구체적인 에러 메시지 표시
- [ ] 필수 필드 누락 시 어떤 필드가 없는지 표시
- [ ] 타입 불일치 시 기대 타입과 실제 타입 표시
- [ ] 테스트 커버리지 80% 이상

**테스트 범위/지표 (Phase 1)**:
- 단위: `ExportedProjectSchema` 검증, `parseProjectData` 에러 포맷터 (커버리지 목표: **utils 80%+**).
- 통합: 파일 드롭 → 파싱 → 검증 파이프라인, 잘못된 JSON 업로드 시 UI 에러 노출 여부.
- E2E: Publish에서 손상된 `project.json` 로드 시 차단 및 에러 토스트 확인.
- 대표 실패 케이스:

| 입력 | 기대 오류 코드 | 메시지 예시 |
|------|---------------|-------------|
| `version: "abc"` | `VALIDATION_ERROR` | `"version must follow semver (e.g., 1.0.0)"` |
| `pages[].slug: "Home Page"` | `VALIDATION_ERROR` | `"pages[0].slug must match /[a-z0-9-_/]+/"` |
| 누락 필드 `project.id` | `MISSING_FIELD` | `"project.id is required"` |
| 순환 `pages[].parent_id` | `PARENT_CYCLE` | `"pages[1].parent_id forms a cycle"` |
| `elements[].tag: "Unknown"` | `UNSUPPORTED_TAG` | `"elements[3].tag is not supported in Publish"` |

---

### Phase 2: 멀티 페이지 네비게이션 (47% → 67%)

**목표**: 여러 페이지가 있는 프로젝트에서 페이지 간 이동 가능

**작업 목록**:

| # | 작업 | 파일 | 완성도 기여 |
|---|------|------|-------------|
| 2.1 | 페이지 네비게이션 컴포넌트 | `apps/publish/src/components/PageNav.tsx` | +6% |
| 2.2 | URL 해시 기반 라우팅 | `apps/publish/src/hooks/usePageRouting.ts` | +4% |
| 2.3 | 페이지 전환 애니메이션 | `apps/publish/src/styles/transitions.css` | +2% |
| 2.4 | 네비게이션 스타일링 | `apps/publish/src/styles/nav.css` | +2% |
| 2.5 | App.tsx 통합 | `apps/publish/src/App.tsx` | +4% |
| 2.6 | 중첩 페이지 지원 (parent_id) | `apps/publish/src/components/PageNav.tsx` | +2% |

**산출물**:
```
apps/publish/src/
├── components/
│   └── PageNav.tsx          # 페이지 네비게이션 (신규)
├── hooks/
│   └── usePageRouting.ts    # URL 해시 라우팅 (신규)
├── styles/
│   ├── nav.css              # 네비게이션 스타일 (신규)
│   └── transitions.css      # 페이지 전환 (신규)
└── App.tsx                  # 통합
```

**완료 기준**:
- [ ] 페이지 목록이 사이드바 또는 상단에 표시
- [ ] 페이지 클릭 시 해당 페이지 렌더링
- [ ] URL 해시로 페이지 상태 유지 (`#page-id`)
- [ ] 브라우저 뒤로/앞으로 버튼 동작
- [ ] 중첩 페이지 계층 구조 표시

**UX 플로우/상태 정의 (Phase 2·4 연계)**:
- **Import 실패 시퀀스**: (1) 파일 파싱 실패 → 토스트 `파일을 불러올 수 없어요` + 세부 메시지(코드) 툴팁 → (2) 재시도 버튼으로 파일 선택 다이얼로그 재오픈 → (3) `logs/import.log`에 `{code,message,field}` 기록 → (4) 동일 오류 3회 이상 시 링크로 가이드 문서 안내.
- **정상 플로우**: 해시 변경 → `currentPageId` 스토어 업데이트 → 페이지 요소 페치 → 스켈레톤 표시(최소 180ms) → 렌더 완료 후 포커스 복원.
- **빈 상태**: 페이지 0개 또는 요소 0개일 때 빈 상태 뷰(`"페이지가 없습니다"`/`"이 페이지에 요소가 없습니다"`) 노출, 새 페이지/요소 추가 CTA 버튼 제공.
- **로딩 스켈레톤 노출 조건**: pages > 0 & elements > 0 이면서 첫 로드 또는 페이지 전환 후 120ms 이상 데이터 fetch가 지연될 때.
- **페이지 전환 애니메이션 조건**: `pages > 1` AND (`elements ≥ 5` OR 자식 페이지 존재)일 때 페이드/슬라이드 애니메이션 적용, 그 외에는 즉시 전환으로 딜레이 최소화.

**테스트 범위/지표 (Phase 2)**:
- 단위: `usePageRouting` 해시 파싱/업데이트, `PageNav` 활성 상태 계산 (커버리지 목표: **runtime/nav 75%+**).
- 통합: 해시 내비게이션 ↔ 렌더 동기화, 빈 페이지/요소에서 Empty State 노출.
- E2E: 다중 페이지 JSON 로드 → 해시 이동 → 뒤로/앞으로 이동 확인, 로딩 스켈레톤 120ms 이상 지연 시 표시 여부.
- 대표 실패 케이스:

| 입력 | 기대 오류 코드 | 메시지 예시 |
|------|---------------|-------------|
| 존재하지 않는 `currentPageId` | `PAGE_NOT_FOUND` | `"currentPageId does not match any page"` |
| 해시와 데이터 불일치(`#missing`) | `PAGE_NOT_FOUND` | `"page '#missing' is not available"` |
| 빈 페이지 배열 | `NO_PAGES` | `"No pages to render"` |
| 요소만 없는 페이지 | `NO_ELEMENTS` | `"No elements for page <id>"` |

---

### Phase 3: 이벤트 런타임 (67% → 92%)

**목표**: Builder에서 설정한 이벤트(onClick 등)가 Publish에서 동작

**작업 목록**:

| # | 작업 | 파일 | 완성도 기여 |
|---|------|------|-------------|
| 3.1 | PublishEventRuntime 클래스 | `packages/shared/src/runtime/PublishEventRuntime.ts` | +8% |
| 3.2 | 액션 실행기 구현 | `packages/shared/src/runtime/ActionExecutor.ts` | +6% |
| 3.3 | PageRenderer에 이벤트 바인딩 | `apps/publish/src/renderer/PageRenderer.tsx` | +4% |
| 3.4 | 지원 액션 타입 구현 | - | - |
| 3.4.1 | └─ NAVIGATE_TO_PAGE | `ActionExecutor.ts` | +2% |
| 3.4.2 | └─ SHOW_ALERT | `ActionExecutor.ts` | +1% |
| 3.4.3 | └─ OPEN_URL | `ActionExecutor.ts` | +1% |
| 3.4.4 | └─ SET_STATE (로컬 상태) | `ActionExecutor.ts` | +2% |
| 3.5 | 이벤트 타입 export에 포함 | `packages/shared/src/utils/export.utils.ts` | +1% |

**이벤트 런타임 지원 범위 및 정책**:
- **상태 공유 범위**: Publish에서는 **로컬 상태만** 허용하며 글로벌 스토어 공유는 금지한다. SET_STATE는 렌더러 스코프 내 메모리에서만 유지하며 페이지 전환 시 초기화한다.
- **환경 제약**: CORS 실패 시 API_CALL은 자동 취소하고 토스트 + 폴백 데이터(최근 성공 캐시 또는 빈 응답)로 대체한다. OPEN_URL은 브라우저 팝업 차단 정책을 준수하며 새 탭 열기에 실패하면 동일 창 내 네비게이션으로 폴백한다.
- **핸들러 라이프사이클**: 페이지 로드 시 등록 → 언마운트/페이지 이동 시 해제 → 동일 요소/이벤트 재등록 시 중복 방지 키(`elementId:eventType`)로 덮어쓴다.
- **메모리 관리**: 등록된 핸들러 수가 5,000건을 넘으면 경고 로그(`HANDLER_POOL_HIGH`)를 남기고 LRU 정책으로 오래된 핸들러를 제거한다.

| 액션 | 지원 상태 | 제약/대체 전략 |
|------|-----------|---------------|
| NAVIGATE_TO_PAGE | ✅ 지원 | 해시 라우팅 사용, 대상 페이지 없으면 `PAGE_NOT_FOUND` 경고 토스트 |
| SHOW_ALERT | ✅ 지원 | Alert 텍스트는 200자 제한, 초과 시 말줄임 표시 |
| OPEN_URL | ⚠️ 제약 | 팝업 차단 시 동일 창 이동, CORS 프리플라이트 실패 시 중단 |
| SET_STATE | ✅ 지원 | 로컬 상태만 허용, 페이지 전환 시 리셋 |
| CONSOLE_LOG | ✅ 지원 | `console.info`로 강제 다운스케일, PII 필드는 마스킹 |
| API_CALL | ⚠️ 제약 | CORS 실패 시 토스트 + 캐시/빈 데이터 폴백, 3초 타임아웃 |
| UPDATE_ELEMENT | ❌ 미지원 | Publish DOM 변경 금지, 에러 코드 `UNSUPPORTED_ACTION` |
| ADD_ELEMENT | ❌ 미지원 | 렌더 트리 변경 불가, 에러 코드 `UNSUPPORTED_ACTION` |

**산출물**:
```
packages/shared/src/
├── runtime/
│   ├── PublishEventRuntime.ts   # 이벤트 런타임 (신규)
│   ├── ActionExecutor.ts        # 액션 실행기 (신규)
│   └── index.ts                 # re-export (신규)
└── utils/
    └── export.utils.ts          # events 필드 추가

apps/publish/src/
└── renderer/
    └── PageRenderer.tsx         # 이벤트 바인딩 추가
```

**완료 기준**:
- [ ] onClick 이벤트가 있는 버튼 클릭 시 액션 실행
- [ ] 페이지 간 네비게이션 액션 동작
- [ ] Alert/URL 열기 액션 동작
- [ ] 이벤트 없는 요소는 정상 렌더링

**테스트 범위/지표 (Phase 3)**:
- 단위: `ActionExecutor`별 액션 실행 분기, `PublishEventRuntime` 핸들러 등록/해제 (커버리지 목표: **runtime/events 75%+**).
- 통합: 페이지 전환 시 핸들러 해제 확인, CORS 실패 → 토스트 + 폴백 데이터 적용.
- E2E: 클릭 → NAVIGATE_TO_PAGE/OPEN_URL 동작, 팝업 차단 환경에서의 폴백 확인.
- 대표 실패 케이스:

| 입력 | 기대 오류 코드 | 메시지 예시 |
|------|---------------|-------------|
| 지원되지 않는 액션 `UPDATE_ELEMENT` | `UNSUPPORTED_ACTION` | `"UPDATE_ELEMENT is not available in Publish runtime"` |
| CORS 실패(API_CALL) | `API_CALL_FAILED` | `"API call blocked by CORS"` |
| 팝업 차단으로 OPEN_URL 실패 | `POPUP_BLOCKED` | `"Popup blocked; opened in current tab"` |
| 이벤트 핸들러 중복 등록 | `HANDLER_DUPLICATE` | `"Handler already registered for elementId:eventType"` |

---

### Phase 4: 버전 관리 & 마무리 (92% → 100%)

**목표**: 버전 호환성 및 프로덕션 품질 달성

**작업 목록**:

| # | 작업 | 파일 | 완성도 기여 |
|---|------|------|-------------|
| 4.1 | 버전 마이그레이션 시스템 | `packages/shared/src/utils/migration.utils.ts` | +3% |
| 4.2 | 버전 호환성 체크 | `packages/shared/src/utils/export.utils.ts` | +1% |
| 4.3 | Export 메타데이터 확장 | `packages/shared/src/utils/export.utils.ts` | +1% |
| 4.4 | Publish 앱 로딩 UX 개선 | `apps/publish/src/components/LoadingScreen.tsx` | +1% |
| 4.5 | 프로젝트 정보 표시 UI | `apps/publish/src/components/ProjectInfo.tsx` | +1% |
| 4.6 | E2E 테스트 | `apps/publish/e2e/export-import.spec.ts` | +1% |

**버전/메타데이터 제약 및 폴백**:
- **필수 필드**: `version`, `exportedAt`, `project.id/name`, `pages`, `elements` (Phase 1 규칙 준수). 메타데이터는 `builderVersion`만 필수이며 나머지는 옵션.
- **버전/메타데이터 제약 표**:

| 필드 | 타입/패턴/enum | 필수 여부 | 제약 |
|------|----------------|-----------|------|
| `version` | Semver (`^\d+\.\d+\.\d+$`) | 필수 | 미지원 버전 시 `UNKNOWN_VERSION` 반환 및 import 중단 |
| `builderVersion` | Semver | 필수(메타데이터) | 빌더/퍼블리시 주버전 불일치 시 경고 후 진행 |
| `exportedBy` | 이메일/ID 문자열 | 옵션 | 최대 120자, PII 마스킹 로그 |
| `description` | 문자열 | 옵션 | 1,000자 제한, 마크다운 금지 |
| `thumbnail` | Base64 data URI | 옵션 | 512KB 초과 시 제거 후 경고 로그 |

- **마이그레이션 실패 폴백**: `migration.utils`에서 단계별 적용 후 실패 시 `MIGRATION_FAILED`와 함께 원본 파일을 보존하고, `fallbackMode: 'read-only'`로 로드하여 미리보기는 허용하되 저장은 차단한다.
- **에러 로깅 포맷**: `{"code":"UNKNOWN_VERSION","message":"version 0.9.0 is not supported","field":"version","detail":"supported: >=1.0.0"}`를 표준으로 사용한다.

**산출물**:
```
packages/shared/src/utils/
├── migration.utils.ts       # 버전 마이그레이션 (신규)
└── export.utils.ts          # 메타데이터 확장

apps/publish/src/
├── components/
│   ├── LoadingScreen.tsx    # 로딩 화면 (신규)
│   └── ProjectInfo.tsx      # 프로젝트 정보 (신규)
└── e2e/
    └── export-import.spec.ts  # E2E 테스트 (신규)
```

**확장된 메타데이터**:
```typescript
interface ExportedProjectData {
  version: string;
  exportedAt: string;
  project: { id: string; name: string; };
  pages: Page[];
  elements: Element[];
  currentPageId?: string;
  // Phase 4 추가
  metadata?: {
    builderVersion: string;    // Builder 앱 버전
    exportedBy?: string;       // 내보낸 사용자
    description?: string;      // 프로젝트 설명
    thumbnail?: string;        // Base64 썸네일
  };
}
```

**완료 기준**:
- [ ] 구버전 JSON 파일 자동 마이그레이션
- [ ] 지원하지 않는 버전 시 명확한 안내
- [ ] 프로젝트 정보 (이름, 내보낸 날짜 등) 표시
- [ ] 로딩 중 스켈레톤 UI 표시
- [ ] E2E 테스트 통과

**테스트 범위/지표 (Phase 4)**:
- 단위: `migration.utils` 버전 체인 검증, 메타데이터 파서 (커버리지 목표: **utils/migration 75%+**).
- 통합: 구버전 JSON → 최신 스키마 자동 변환, `fallbackMode: 'read-only'` 경로 UI 표시.
- E2E: 로딩 스켈레톤 표시, 프로젝트 정보 패널에 메타데이터 표시, 미지원 버전 업로드 시 차단 흐름.
- 대표 실패 케이스:

| 입력 | 기대 오류 코드 | 메시지 예시 |
|------|---------------|-------------|
| `version: "0.9.0"` | `UNKNOWN_VERSION` | `"version 0.9.0 is not supported"` |
| 메타데이터 누락(`builderVersion`) | `MISSING_FIELD` | `"metadata.builderVersion is required"` |
| `thumbnail` 512KB 초과 | `ASSET_TOO_LARGE` | `"thumbnail exceeds 512KB and was dropped"` |
| 마이그레이션 단계 중단 | `MIGRATION_FAILED` | `"migration v1.0.0→v1.1.0 failed: <reason>"` |

---

## 전체 일정 요약

```
Phase 1: 데이터 검증 강화     [████░░░░░░] 32% → 47%
Phase 2: 멀티 페이지 네비게이션 [███████░░░] 47% → 67%
Phase 3: 이벤트 런타임        [█████████░] 67% → 92%
Phase 4: 버전 관리 & 마무리    [██████████] 92% → 100%
```

| Phase | 완성도 | 난이도 | 예상 작업량 |
|-------|--------|--------|-------------|
| Phase 1 | +15% | ⭐⭐ | 3-4시간 |
| Phase 2 | +20% | ⭐⭐ | 4-5시간 |
| Phase 3 | +25% | ⭐⭐⭐ | 6-8시간 |
| Phase 4 | +8% | ⭐⭐ | 2-3시간 |
| **합계** | **100%** | - | **15-20시간** |

---

## 보안 정책

Export/Import 기능에서 고려해야 할 보안 위험과 대응 방안입니다.

### 보안 위험 및 대응

| 위험 | 심각도 | 설명 | 대응 방안 |
|------|--------|------|----------|
| **Prototype Pollution** | 높음 | `__proto__`, `constructor` 키로 객체 프로토타입 조작 | JSON 파싱 후 위험 키 필터링 |
| **XSS (Cross-Site Scripting)** | 높음 | `props.children`에 악성 스크립트 삽입 | DOMPurify로 HTML 새니타이징 |
| **파일 크기 DoS** | 중간 | 초대형 JSON 파일로 브라우저 메모리 고갈 | 10MB 초과 파일 업로드 차단 |
| **악성 URL 리다이렉트** | 중간 | `OPEN_URL` 액션으로 피싱 사이트 이동 | URL 스키마 및 도메인 필터링 |
| **무한 루프 이벤트** | 낮음 | 이벤트 체인이 무한 반복 | 이벤트 실행 횟수 제한 (100회/초) |

### JSON 파싱 보안

```typescript
// packages/shared/src/utils/security.utils.ts

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * 위험한 키를 필터링하는 JSON 파서
 */
export function safeJsonParse<T>(jsonString: string): T {
  return JSON.parse(jsonString, (key, value) => {
    if (DANGEROUS_KEYS.includes(key)) {
      console.warn(`[Security] Blocked dangerous key: ${key}`);
      return undefined;
    }
    return value;
  });
}

/**
 * HTML props 새니타이징
 */
export function sanitizeHtmlProps(props: Record<string, unknown>): Record<string, unknown> {
  const htmlKeys = ['children', 'dangerouslySetInnerHTML', 'innerHTML'];
  const sanitized = { ...props };

  for (const key of htmlKeys) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = DOMPurify.sanitize(sanitized[key] as string);
    }
  }

  return sanitized;
}
```

### URL 정책

```typescript
// OPEN_URL 액션 URL 검증
const ALLOWED_URL_SCHEMES = ['https:', 'mailto:', 'tel:'];
const BLOCKED_DOMAINS = ['localhost', '127.0.0.1', '0.0.0.0'];

function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);

    // 스키마 검증
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      return false;
    }

    // 로컬호스트 차단
    if (BLOCKED_DOMAINS.some(d => parsed.hostname.includes(d))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

### 파일 크기 검증

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function validateFileSize(file: File): Promise<boolean> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ExportError({
      code: ExportErrorCode.FILE_TOO_LARGE,
      message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      severity: 'error',
    });
  }
  return true;
}
```

### 이벤트 실행 제한

```typescript
// 이벤트 실행 횟수 제한 (Rate Limiting)
const EVENT_RATE_LIMIT = 100; // 초당 최대 실행 횟수
const eventCounter = new Map<string, number>();

function checkEventRateLimit(eventKey: string): boolean {
  const count = eventCounter.get(eventKey) || 0;
  if (count >= EVENT_RATE_LIMIT) {
    console.warn(`[Security] Event rate limit exceeded: ${eventKey}`);
    return false;
  }
  eventCounter.set(eventKey, count + 1);
  return true;
}
```

---

## 접근성(A11y) 요구사항

WCAG 2.1 AA 수준 준수를 목표로 합니다.

### 접근성 체크리스트

| 요소 | WCAG 기준 | 요구사항 | 구현 방법 |
|------|----------|----------|----------|
| 페이지 네비게이션 | 2.1.1 키보드 | 키보드로 모든 기능 접근 가능 | `Tab`, `Arrow` 키 지원 |
| 현재 페이지 표시 | 4.1.2 이름, 역할, 값 | 현재 위치 명확히 표시 | `aria-current="page"` |
| 에러 메시지 | 4.1.3 상태 메시지 | 에러 발생 시 스크린 리더 알림 | `role="alert"` |
| 포커스 표시 | 2.4.7 포커스 가시성 | 포커스된 요소 시각적 표시 | `:focus-visible` 스타일 |
| 드롭존 안내 | 1.1.1 비텍스트 콘텐츠 | 드래그 앤 드롭 영역 설명 | `aria-label`, `aria-describedby` |
| 로딩 상태 | 4.1.3 상태 메시지 | 로딩 중임을 알림 | `aria-busy`, `aria-live` |

### 키보드 네비게이션

```typescript
// apps/publish/src/components/PageNav.tsx
function PageNav({ pages, currentPageId, onPageChange }: PageNavProps) {
  const handleKeyDown = (e: KeyboardEvent, pageId: string, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        // 다음 페이지로 포커스 이동
        const nextIndex = Math.min(index + 1, pages.length - 1);
        focusPage(nextIndex);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        // 이전 페이지로 포커스 이동
        const prevIndex = Math.max(index - 1, 0);
        focusPage(prevIndex);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onPageChange(pageId);
        break;
      case 'Home':
        e.preventDefault();
        focusPage(0);
        break;
      case 'End':
        e.preventDefault();
        focusPage(pages.length - 1);
        break;
    }
  };

  return (
    <nav aria-label="페이지 목록">
      <ul role="tablist" aria-orientation="vertical">
        {pages.map((page, index) => (
          <li key={page.id} role="presentation">
            <button
              role="tab"
              aria-selected={currentPageId === page.id}
              aria-current={currentPageId === page.id ? 'page' : undefined}
              tabIndex={currentPageId === page.id ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, page.id, index)}
              onClick={() => onPageChange(page.id)}
            >
              {page.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### 스크린 리더 지원

```typescript
// 에러 알림
<div role="alert" aria-live="assertive">
  {error && <p>{error}</p>}
</div>

// 로딩 상태
<div aria-busy={isLoading} aria-live="polite">
  {isLoading && <p>프로젝트를 불러오는 중...</p>}
</div>

// 드롭존
<div
  role="button"
  tabIndex={0}
  aria-label="프로젝트 파일 업로드"
  aria-describedby="dropzone-instructions"
  onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
>
  <p id="dropzone-instructions">
    JSON 파일을 드래그하거나 Enter 키를 눌러 파일을 선택하세요
  </p>
</div>
```

### 포커스 관리

```css
/* apps/publish/src/styles/a11y.css */

/* 포커스 가시성 */
:focus-visible {
  outline: 2px solid var(--focus-ring-color, #2563eb);
  outline-offset: 2px;
}

/* 고대비 모드 지원 */
@media (prefers-contrast: high) {
  :focus-visible {
    outline-width: 3px;
  }
}

/* 모션 감소 선호 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 우선순위 권장

**MVP (최소 기능 제품)**: Phase 1 + Phase 2 = 67%
- 데이터 검증과 멀티 페이지만으로도 실용적인 미리보기 가능

**Full Feature**: Phase 1 ~ Phase 4 = 100%
- 인터랙티브 프로젝트 완전 지원

**권장 순서**: Phase 1 → Phase 2 → Phase 3 → Phase 4
- 각 Phase는 독립적으로 배포 가능
- Phase 3은 가장 복잡하므로 별도 브랜치 작업 권장

---

## 사용 가이드

### 내보내기 (Builder)

1. Builder에서 프로젝트 편집
2. 우측 상단 **Publish** 버튼 클릭
3. `{프로젝트명}-{ID}.json` 파일 다운로드

### 가져오기 (Publish)

**방법 1: public 폴더**
```bash
cp exported-project.json apps/publish/public/project.json
pnpm --filter publish dev
```

**방법 2: URL 파라미터**
```
http://localhost:5174/?project=https://example.com/my-project.json
```

**방법 3: 드래그 앤 드롭**
1. `pnpm --filter publish dev` 실행
2. 브라우저에서 JSON 파일을 드롭존에 드래그

---

## 디버그 모드

개발 및 문제 해결을 위한 디버그 옵션입니다.

### URL 파라미터

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `debug` | `true` | 상세 콘솔 로그 활성화 |
| `perf` | `true` | 성능 측정 로그 출력 |
| `validate` | `strict` | 엄격 검증 모드 (모든 경고를 에러로 처리) |
| `skeleton` | `true` | 강제 스켈레톤 UI 표시 (개발용) |

**사용 예시:**
```
http://localhost:5174/?project=./project.json&debug=true&perf=true
```

### 디버그 로그 형식

```typescript
// packages/shared/src/utils/debug.utils.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'perf';

interface DebugLog {
  level: LogLevel;
  phase: string;      // 'parse' | 'validate' | 'render' | 'event'
  message: string;
  data?: unknown;
  timestamp: number;
  durationMs?: number;
}

// 로그 출력 예시
// [PERF] parse: JSON parsed in 115ms {"pages":120,"elements":5400}
// [DEBUG] validate: Checking page structure...
// [WARN] validate: Page 'about' has no elements
```

### 개발자 도구 통합

```typescript
// 브라우저 콘솔에서 접근 가능한 전역 객체
declare global {
  interface Window {
    __XSTUDIO_DEBUG__: {
      projectData: ExportedProjectData | null;
      eventRuntime: PublishEventRuntime | null;
      logs: DebugLog[];
      clearLogs: () => void;
      exportLogs: () => string;
    };
  }
}

// 사용 예시 (브라우저 콘솔)
// > __XSTUDIO_DEBUG__.projectData
// > __XSTUDIO_DEBUG__.logs.filter(l => l.level === 'error')
// > __XSTUDIO_DEBUG__.exportLogs()  // JSON 문자열로 내보내기
```

---

## 브라우저 호환성

### 지원 브라우저

| 브라우저 | 최소 버전 | 권장 버전 | 비고 |
|----------|----------|----------|------|
| Chrome | 90+ | 최신 | ✅ 권장 |
| Firefox | 88+ | 최신 | ✅ 완전 지원 |
| Safari | 14+ | 15+ | ⚠️ 일부 CSS 제한 |
| Edge | 90+ | 최신 | ✅ 완전 지원 |
| Samsung Internet | 15+ | 최신 | ✅ 모바일 지원 |
| iOS Safari | 14+ | 15+ | ⚠️ 파일 드롭 제한 |

### 필수 JavaScript 기능

```typescript
// ES2020+ 기능 사용
const requiredFeatures = [
  'Promise.allSettled',      // ES2020
  'Optional Chaining (?.)',  // ES2020
  'Nullish Coalescing (??)', // ES2020
  'BigInt',                  // ES2020
  'Dynamic import()',        // ES2020
  'Array.prototype.at',      // ES2022
];
```

### Polyfill 필요 여부

| 기능 | 필요 여부 | 대안 |
|------|----------|------|
| `structuredClone` | 선택 | `JSON.parse(JSON.stringify())` |
| `Intl.Segmenter` | 선택 | 텍스트 처리 미사용 시 불필요 |
| `ResizeObserver` | 필수 | polyfill.io 제공 |

### 알려진 제한사항

| 브라우저 | 제한사항 | 우회 방법 |
|----------|---------|----------|
| Safari < 15 | `gap` in Flexbox 미지원 | margin fallback |
| iOS Safari | 드래그 앤 드롭 미지원 | 파일 선택 버튼 사용 |
| Firefox | `backdrop-filter` 부분 지원 | 불투명 배경 fallback |

---

## 테스트 Fixtures

테스트 및 개발용 샘플 JSON 파일입니다.

### Fixture 파일 목록

```
packages/shared/src/__fixtures__/export/
├── valid/
│   ├── single-page.json          # 정상 단일 페이지
│   ├── multi-page.json           # 정상 멀티 페이지 (5페이지)
│   ├── nested-pages.json         # 중첩 페이지 구조
│   ├── with-events.json          # 이벤트 포함
│   ├── with-data-binding.json    # 데이터 바인딩 포함
│   └── minimal.json              # 최소 구조 (1페이지, 1요소)
├── invalid/
│   ├── missing-version.json      # version 필드 누락
│   ├── missing-pages.json        # pages 필드 누락
│   ├── invalid-version.json      # 잘못된 버전 형식
│   ├── circular-parent.json      # 순환 참조 parent_id
│   ├── invalid-slug.json         # 잘못된 slug 형식
│   ├── unsupported-tag.json      # 미지원 컴포넌트 태그
│   └── malformed-json.json       # JSON 구문 오류
├── edge-cases/
│   ├── empty-pages.json          # 빈 pages 배열
│   ├── empty-elements.json       # 빈 elements 배열
│   ├── max-pages.json            # 최대 페이지 수 (200)
│   ├── max-elements.json         # 최대 요소 수 (10,000)
│   └── unicode-content.json      # 유니코드/이모지 포함
└── performance/
    ├── large-project.json        # 대규모 (100페이지, 5,000요소)
    └── stress-test.json          # 스트레스 테스트용 (200페이지, 10,000요소)
```

### 샘플 Fixture: minimal.json

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-01-02T00:00:00.000Z",
  "project": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Minimal Project"
  },
  "pages": [
    {
      "id": "page-1",
      "title": "Home",
      "slug": "/",
      "project_id": "00000000-0000-0000-0000-000000000001",
      "parent_id": null,
      "order_num": 0,
      "layout_id": null
    }
  ],
  "elements": [
    {
      "id": "element-1",
      "tag": "Text",
      "props": { "children": "Hello, World!" },
      "parent_id": "body",
      "page_id": "page-1",
      "order_num": 0
    }
  ],
  "currentPageId": "page-1"
}
```

### 샘플 Fixture: circular-parent.json (Invalid)

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-01-02T00:00:00.000Z",
  "project": {
    "id": "00000000-0000-0000-0000-000000000002",
    "name": "Circular Parent Test"
  },
  "pages": [
    {
      "id": "page-1",
      "title": "Page A",
      "slug": "/a",
      "project_id": "00000000-0000-0000-0000-000000000002",
      "parent_id": "page-2",
      "order_num": 0,
      "layout_id": null
    },
    {
      "id": "page-2",
      "title": "Page B",
      "slug": "/b",
      "project_id": "00000000-0000-0000-0000-000000000002",
      "parent_id": "page-1",
      "order_num": 1,
      "layout_id": null
    }
  ],
  "elements": [],
  "currentPageId": "page-1"
}
```

### Fixture 사용 방법

```typescript
// 테스트에서 사용
import minimalProject from '../__fixtures__/export/valid/minimal.json';
import circularParent from '../__fixtures__/export/invalid/circular-parent.json';

describe('parseProjectData', () => {
  it('should parse valid minimal project', () => {
    const result = parseProjectData(JSON.stringify(minimalProject));
    expect(result.success).toBe(true);
  });

  it('should reject circular parent reference', () => {
    const result = parseProjectData(JSON.stringify(circularParent));
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PARENT_CYCLE');
  });
});
```

---

## 오프라인 및 PWA 로드맵

향후 오프라인 지원을 위한 확장 계획입니다.

### Phase 5: 오프라인 지원 (미래 로드맵)

| # | 작업 | 설명 | 우선순위 |
|---|------|------|----------|
| 5.1 | Service Worker 등록 | 정적 자산 캐싱 | 중간 |
| 5.2 | IndexedDB 저장소 | 프로젝트 로컬 저장 | 중간 |
| 5.3 | 오프라인 상태 UI | 연결 상태 표시 | 낮음 |
| 5.4 | PWA Manifest | 설치 가능 앱 | 낮음 |
| 5.5 | 백그라운드 동기화 | 온라인 복귀 시 동기화 | 낮음 |

### Service Worker 전략

```typescript
// apps/publish/src/sw.ts (예정)

const CACHE_NAME = 'xstudio-publish-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/main.css',
];

// 캐시 우선 전략 (정적 자산)
self.addEventListener('fetch', (event) => {
  if (STATIC_ASSETS.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
```

### IndexedDB 스키마

```typescript
// apps/publish/src/storage/projectDB.ts (예정)

interface ProjectDBSchema {
  projects: {
    key: string;           // project.id
    value: {
      data: ExportedProjectData;
      savedAt: number;     // timestamp
      name: string;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

// 사용 예시
const db = await openProjectDB();
await db.put('projects', { key: project.id, value: { data: projectData, savedAt: Date.now() } });
const saved = await db.get('projects', projectId);
```

### 오프라인 상태 UI

```typescript
// apps/publish/src/hooks/useOnlineStatus.ts (예정)

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// UI 컴포넌트
function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      ⚠️ 오프라인 모드 - 저장된 프로젝트만 사용 가능
    </div>
  );
}
```

### PWA Manifest

```json
// apps/publish/public/manifest.json (예정)
{
  "name": "XStudio Publish",
  "short_name": "Publish",
  "description": "XStudio 프로젝트 미리보기",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 코드-문서 불일치 사항

현재 코드와 문서 간 알려진 차이점입니다.

### 문서화된 불일치

| 항목 | 문서 | 코드 | 상태 |
|------|------|------|------|
| 파일명 fallback | 미언급 | `projectName \|\| 'project'` | 문서 업데이트 필요 |
| 파일 크기 제한 | 10MB 명시 | 미구현 | 코드 구현 필요 (Phase 1) |
| Zod 검증 | Phase 1 계획 | 미구현 | 코드 구현 필요 (Phase 1) |
| 멀티 페이지 UI | Phase 2 계획 | 미구현 | 코드 구현 필요 (Phase 2) |

### 파일명 생성 로직

**현재 코드** (`export.utils.ts:100`):
```typescript
link.download = `${projectName || 'project'}-${projectId}.json`;
```

`projectName`이 빈 문자열일 경우 `'project'`로 대체됩니다. 이 동작은 문서에 명시되어 있지 않았으며, 위 표에서 확인할 수 있습니다.

### 향후 동기화 계획

- Phase 1 완료 시: 파일 크기 제한, Zod 검증 코드 구현 후 문서 동기화
- Phase 2 완료 시: 멀티 페이지 UI 구현 후 문서 동기화
- 코드 변경 시: 해당 섹션의 문서도 함께 업데이트

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-02 | 1.0.0 | 초기 구현 - 기본 Export/Import |
| 2026-01-02 | 1.1.0 | 문서 확장 - 보안 정책, 접근성, 에러 코드, 브라우저 호환성, 테스트 Fixtures, 디버그 모드, PWA 로드맵, 코드-문서 불일치 섹션 추가 |

---

## 참고 자료

- [CHANGELOG.md](../../../CHANGELOG.md) - 상세 구현 로그
- [element.types.ts](../../../packages/shared/src/types/element.types.ts) - Element/Page 타입 정의
