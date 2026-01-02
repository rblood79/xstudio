# Project Export/Import 설계 문서

> Builder에서 작업한 프로젝트를 JSON 파일로 내보내고, Publish 앱에서 미리보기하는 기능

## 개요

- **생성일**: 2026-01-02
- **현재 버전**: 1.0.0
- **완성도**: 60%

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

## 개선 계획

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

### Phase 2: 우선순위 매트릭스

| 순위 | 기능 | 난이도 | 효과 | 구현 시간 |
|------|------|--------|------|-----------|
| 1 | 멀티 페이지 네비게이션 | ⭐⭐ | 높음 | 2시간 |
| 2 | 이벤트 런타임 | ⭐⭐⭐ | 높음 | 4시간 |
| 3 | Zod 스키마 검증 | ⭐⭐ | 중간 | 1시간 |
| 4 | 버전 마이그레이션 | ⭐⭐ | 중간 | 2시간 |
| 5 | 에셋 번들링 | ⭐⭐⭐⭐ | 낮음 | 8시간 |
| 6 | 압축 | ⭐ | 낮음 | 30분 |

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

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-02 | 1.0.0 | 초기 구현 - 기본 Export/Import |

---

## 참고 자료

- [CHANGELOG.md](../../../CHANGELOG.md) - 상세 구현 로그
- [element.types.ts](../../../packages/shared/src/types/element.types.ts) - Element/Page 타입 정의
