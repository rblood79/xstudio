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

**지원 액션 목록**:

| 액션 | Publish 지원 | 비고 |
|------|--------------|------|
| NAVIGATE_TO_PAGE | ✅ | 페이지 전환 |
| SHOW_ALERT | ✅ | alert() |
| OPEN_URL | ✅ | window.open() |
| SET_STATE | ✅ | 로컬 상태 변경 |
| CONSOLE_LOG | ✅ | console.log() |
| API_CALL | ⚠️ | CORS 제한 있음 |
| UPDATE_ELEMENT | ❌ | Publish에서 미지원 |
| ADD_ELEMENT | ❌ | Publish에서 미지원 |

**완료 기준**:
- [ ] onClick 이벤트가 있는 버튼 클릭 시 액션 실행
- [ ] 페이지 간 네비게이션 액션 동작
- [ ] Alert/URL 열기 액션 동작
- [ ] 이벤트 없는 요소는 정상 렌더링

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

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-02 | 1.0.0 | 초기 구현 - 기본 Export/Import |

---

## 참고 자료

- [CHANGELOG.md](../../../CHANGELOG.md) - 상세 구현 로그
- [element.types.ts](../../../packages/shared/src/types/element.types.ts) - Element/Page 타입 정의
